/**
 * Aba no jogo: sem tela própria — infraestrutura compartilhada das Termas (fonte termal): classe
 * `SpaRoom`, gerente `HotSpringMgr` (lista de salas, estado por jogador, timers de experiência e de
 * aluguel das salas privadas), pacotes de saída comuns. Usado por todos os arquivos de `termas/`.
 * C#: `Managers/HotSpringMgr.cs`, `HotSpringRooms/HotSpringRoom.cs`, `GameUtils/PlayerExtra.HotSpringCheck`.
 */
import { eq, sql } from "drizzle-orm";
import { game } from "@ddt/db";
import { PacketOut } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

export interface SpaRoomInfo {
  roomID: number; roomNumber: number; roomName: string; roomPassword: string | null; effectiveTime: number; playerID: number;
  playerName: string; startTime: Date; roomIntroduction: string; roomType: number; maxCount: number;
}

export const SCENE = { minX: 0, maxX: 2000, minY: 0, maxY: 1200 } as const;
export const DEFAULT_POS = { x: 480, y: 560, dir: 3 } as const;

export class SpaRoom {
  readonly players: GamePlayer[] = [];
  /** Minute tick for a private room's own rental timer (null for the 13 seeded public rooms). */
  timer: NodeJS.Timeout | null = null;
  constructor(readonly info: SpaRoomInfo) {}
  get count(): number { return this.players.length; }
  get isPrivate(): boolean { return this.info.roomType === 1; }
  send(pkt: PacketOut, except?: GamePlayer): void {
    for (const p of this.players) if (p !== except) p.send(pkt);
  }
}

export interface SpaState { x: number; y: number; dir: number; room: SpaRoom | null; timer: NodeJS.Timeout | null; min: number; lastTime: Date }

export class HotSpringMgr {
  readonly rooms = new Map<number, SpaRoom>();
  /** WorldMgr.HotSpringScene: players looking at the room list. */
  readonly scene = new Set<GamePlayer>();
  readonly state = new WeakMap<GamePlayer, SpaState>();
  expTable: number[] = [];
  tickMs = 60_000;
  /** Next roomID handed to a player-created private room (see createPrivateRoom). Starts past every seeded
   *  public room (13: 1-13) with headroom, so a freshly created room never collides with a reseeded fixture. */
  private nextRoomId = 1000;
  constructor(private readonly ctx: ServerContext) {}

  async load(): Promise<void> {
    const rows = (await this.ctx.db.db.execute(sql`SELECT * FROM game."HotSpringRoom" ORDER BY "roomID"`)) as unknown;
    const list = (Array.isArray(rows) ? rows : ((rows as { rows?: unknown[] }).rows ?? [])) as Record<string, unknown>[];
    for (const r of list) {
      const info: SpaRoomInfo = {
        roomID: Number(r.roomID), roomNumber: Number(r.roomNumber), roomName: String(r.roomName ?? ""), roomPassword: (r.roomPassword as string | null) ?? null,
        effectiveTime: Number(r.effectiveTime ?? 0), playerID: Number(r.playerID ?? 0), playerName: String(r.playerName ?? ""),
        startTime: r.startTime ? new Date(r.startTime as string) : new Date(), roomIntroduction: String(r.roomIntroduction ?? ""),
        roomType: Number(r.roomType ?? 0), maxCount: Number(r.maxCount ?? 10),
      };
      const room = new SpaRoom(info);
      this.rooms.set(info.roomID, room);
      this.nextRoomId = Math.max(this.nextRoomId, info.roomID + 1);
      // Resume a private room's rental countdown across a server restart; one already expired is closed right away.
      if (room.isPrivate) { if (info.effectiveTime > 0) this.startRoomTimer(room); else void this.closeRoom(room); }
    }
    this.expTable = String(this.ctx.templates.serverConfig.get("HotSpringExp") ?? "").split(",").map((x) => Number(x) || 0);
  }

  /** New feature (ver módulo `salas-privadas.ts`): aluga uma sala privada pro jogador. Retorna null em
   *  qualquer falha (já mandou sendMessage), o SpaRoom criado caso contrário. */
  async createPrivateRoom(p: GamePlayer, roomName: string, roomPassword: string, roomIntroduction: string, maxCount: number): Promise<SpaRoom | null> {
    const name = roomName.trim().slice(0, 100);
    if (!name) { p.sendMessage(0, "Dê um nome para a sala."); return null; }
    if ([...this.rooms.values()].some((r) => r.isPrivate && r.info.playerID === p.id)) {
      p.sendMessage(0, "Você já tem uma sala privada."); return null;
    }
    const price = this.ctx.templates.cfgInt("HotSpringRoomCreateGold", 20000);
    if (p.info.Gold < price) { p.sendMessage(0, "Ouro insuficiente para alugar a sala."); return null; }
    p.removeGold(price);
    const roomID = this.nextRoomId++;
    const info: SpaRoomInfo = {
      roomID, roomNumber: roomID, roomName: name, roomPassword: roomPassword ? roomPassword.slice(0, 100) : null,
      effectiveTime: this.ctx.templates.cfgInt("HotSpringRoomInitialMinutes", 60), playerID: p.id, playerName: p.info.NickName ?? "",
      startTime: this.ctx.now(), roomIntroduction: roomIntroduction.slice(0, 500), roomType: 1,
      maxCount: Math.min(10, Math.max(2, maxCount || 10)),
    };
    await this.ctx.db.db.insert(game.HotSpringRoom).values({ ...info, curCount: 0 });
    const room = new SpaRoom(info);
    this.rooms.set(roomID, room);
    this.startRoomTimer(room);
    this.broadcastRooms([room]);
    return room;
  }

  /** 191/3 RENEWAL_FEE: owner pays gold to add minutes to their own room's rental countdown. */
  async renewRoom(p: GamePlayer, room: SpaRoom): Promise<void> {
    if (!room.isPrivate || room.info.playerID !== p.id) return;
    const price = this.ctx.templates.cfgInt("HotSpringRoomRenewalGold", 3000);
    if (p.info.Gold < price) return p.sendMessage(0, "Ouro insuficiente para renovar a sala.");
    p.removeGold(price);
    room.info.effectiveTime += this.ctx.templates.cfgInt("HotSpringRoomRenewalMinutes", 30);
    await this.persistRoom(room);
    this.broadcastRooms([room]);
    p.sendMessage(0, `Sala renovada! Restam ${room.info.effectiveTime} minuto(s).`);
  }

  /** 191/6 EDIT: owner renames/re-passwords/re-describes their own room. */
  async editRoom(p: GamePlayer, room: SpaRoom, roomName: string, roomPassword: string, roomIntroduction: string): Promise<void> {
    if (!room.isPrivate || room.info.playerID !== p.id) return;
    const name = roomName.trim().slice(0, 100);
    if (!name) return p.sendMessage(0, "Dê um nome para a sala.");
    room.info.roomName = name;
    room.info.roomPassword = roomPassword ? roomPassword.slice(0, 100) : null;
    room.info.roomIntroduction = roomIntroduction.slice(0, 500);
    await this.persistRoom(room);
    this.broadcastRooms([room]);
    p.sendMessage(0, "Sala atualizada.");
  }

  /** 191/9 ADMIN_REMOVE_PLAYER: owner kicks one named player out of their own room. */
  adminRemovePlayer(p: GamePlayer, room: SpaRoom, targetId: number): void {
    if (!room.isPrivate || room.info.playerID !== p.id || targetId === p.id) return;
    const target = room.players.find((o) => o.id === targetId);
    if (!target) return;
    target.sendMessage(0, "Você foi removido da sala pelo administrador.");
    this.remove(target);
  }

  startRoomTimer(room: SpaRoom): void {
    this.stopRoomTimer(room);
    room.timer = setInterval(() => void this.roomTick(room), this.tickMs);
    room.timer.unref?.();
  }
  stopRoomTimer(room: SpaRoom): void {
    if (room.timer) clearInterval(room.timer);
    room.timer = null;
  }

  /** The private room's own rental countdown — independent of each player's personal MinHotSpring. */
  async roomTick(room: SpaRoom): Promise<void> {
    if (!this.rooms.has(room.info.roomID)) { this.stopRoomTimer(room); return; }
    room.info.effectiveTime -= 1;
    if (room.info.effectiveTime <= 5 && room.info.effectiveTime > 0) {
      for (const member of room.players) member.sendMessage(0, `Sua sala privada expira em ${room.info.effectiveTime} minuto(s). O dono pode renovar.`);
    }
    if (room.info.effectiveTime <= 0) { await this.closeRoom(room); return; }
    await this.persistRoom(room);
    this.broadcastRooms([room]);
  }

  /** Rental ran out: kick everyone, delete the row, tell the room-list scene it's gone. */
  async closeRoom(room: SpaRoom): Promise<void> {
    this.stopRoomTimer(room);
    for (const member of [...room.players]) { member.sendMessage(0, "Sua sala privada expirou."); this.remove(member); }
    this.rooms.delete(room.info.roomID);
    await this.ctx.db.db.delete(game.HotSpringRoom).where(eq(game.HotSpringRoom.roomID, room.info.roomID));
    const pk = new PacketOut(174);
    pk.writeInt(room.info.roomID);
    for (const p of this.scene) p.send(pk);
  }

  private async persistRoom(room: SpaRoom): Promise<void> {
    const i = room.info;
    await this.ctx.db.db.update(game.HotSpringRoom).set({
      roomName: i.roomName, roomPassword: i.roomPassword, roomIntroduction: i.roomIntroduction, effectiveTime: i.effectiveTime, maxCount: i.maxCount,
    }).where(eq(game.HotSpringRoom.roomID, i.roomID));
  }

  st(p: GamePlayer): SpaState {
    let s = this.state.get(p);
    if (!s) {
      const e = (p.extra ?? {}) as { MinHotSpring?: number; LastTimeHotSpring?: Date; LastFreeTimeHotSpring?: Date };
      s = { ...DEFAULT_POS, room: null, timer: null, min: e.MinHotSpring ?? 60, lastTime: e.LastTimeHotSpring ?? new Date(0) };
      // GamePlayer.CheckNewDay → MinHotSpring = 60 (we do it lazily on the first spa use of a new UTC day)
      const free = e.LastFreeTimeHotSpring ? new Date(e.LastFreeTimeHotSpring) : new Date(0);
      if (free.toISOString().slice(0, 10) !== this.ctx.now().toISOString().slice(0, 10)) s.min = 60;
      this.state.set(p, s);
    }
    return s;
  }

  /** HotSpringMgr.GetExpWithLevel. */
  expWithLevel(grade: number): number {
    return grade >= 1 && grade <= this.expTable.length ? this.expTable[grade - 1]! : 0;
  }

  async saveExtra(p: GamePlayer): Promise<void> {
    const s = this.st(p);
    const now = this.ctx.now();
    await this.ctx.db.db.execute(sql`INSERT INTO player."Sys_Users_Extra" ("UserID", "MinHotSpring", "LastTimeHotSpring", "LastFreeTimeHotSpring") VALUES (${p.id}, ${s.min}, ${s.lastTime}, ${now})
      ON CONFLICT ("UserID") DO UPDATE SET "MinHotSpring" = EXCLUDED."MinHotSpring", "LastTimeHotSpring" = EXCLUDED."LastTimeHotSpring", "LastFreeTimeHotSpring" = EXCLUDED."LastFreeTimeHotSpring"`);
    const e = p.extra as Record<string, unknown> | null;
    if (e) { e.MinHotSpring = s.min; e.LastTimeHotSpring = s.lastTime; e.LastFreeTimeHotSpring = now; }
  }

  roomList(rooms: SpaRoom[]): PacketOut {
    const pk = new PacketOut(197);
    pk.writeInt(rooms.length);
    for (const r of rooms) {
      const i = r.info;
      pk.writeInt(i.roomNumber); pk.writeInt(i.roomID); pk.writeString(i.roomName); pk.writeString(i.roomPassword != null ? "password" : "");
      pk.writeInt(i.effectiveTime); pk.writeInt(r.count); pk.writeInt(i.playerID); pk.writeString(i.playerName);
      Out.wd(pk, i.startTime); pk.writeString(i.roomIntroduction); pk.writeInt(i.roomType); pk.writeInt(i.maxCount);
    }
    return pk;
  }
  /** HotSpringMgr.SendUpdateAllRoom(null, rooms) → HotSpringScene.SendToALL. */
  broadcastRooms(rooms: SpaRoom[]): void {
    const pk = this.roomList(rooms);
    for (const p of this.scene) p.send(pk);
  }

  playerInfo(p: GamePlayer): PacketOut {
    const s = this.st(p);
    const c = p.info;
    const pk = new PacketOut(198, p.id);
    pk.writeInt(p.id); pk.writeInt(c.Grade); pk.writeInt(c.Hide); pk.writeInt(c.Repute); pk.writeString(c.NickName ?? "");
    pk.writeByte(c.typeVIP ?? 0); pk.writeInt(c.VIPLevel ?? 0); pk.writeBoolean(!!c.Sex); pk.writeString(c.Style ?? ""); pk.writeString(c.Colors ?? "");
    pk.writeString(c.Skin ?? ""); pk.writeInt(s.x); pk.writeInt(s.y); pk.writeInt(c.FightPower); pk.writeInt(c.Win); pk.writeInt(c.Total); pk.writeInt(s.dir);
    return pk;
  }

  /** AbstractPacketLib.SendEnterHotSpringRoom (202). */
  enterPacket(p: GamePlayer, r: SpaRoom): PacketOut {
    const s = this.st(p);
    const i = r.info;
    const pk = new PacketOut(202, p.id);
    pk.writeInt(i.roomID); pk.writeInt(i.roomNumber); pk.writeString(i.roomName); pk.writeString(i.roomPassword ?? "");
    pk.writeInt(i.effectiveTime); pk.writeInt(r.count); pk.writeInt(i.playerID); pk.writeString(i.playerName);
    Out.wd(pk, i.startTime); pk.writeString(i.roomIntroduction); pk.writeInt(i.roomType); pk.writeInt(i.maxCount);
    Out.wd(pk, s.lastTime); pk.writeInt(s.min);
    return pk;
  }

  /** HotSpringRoom.AddPlayer. */
  add(p: GamePlayer, r: SpaRoom): boolean {
    const s = this.st(p);
    if (p.currentRoom || s.room) return false;
    if (r.count >= r.info.maxCount) { p.sendMessage(0, "Sala cheia"); return false; }
    if (s.min <= 0) { p.sendMessage(0, "Seu tempo de participação de hoje acabou"); return false; }
    r.players.push(p);
    s.room = r;
    s.lastTime = this.ctx.now();
    Object.assign(s, { x: DEFAULT_POS.x, y: DEFAULT_POS.y, dir: DEFAULT_POS.dir });
    this.scene.delete(p);
    this.startTimer(p);
    void this.saveExtra(p).catch(() => {});
    this.broadcastRooms([r]);
    r.send(this.playerInfo(p), p);
    return true;
  }

  /** HotSpringRoom.RemovePlayer. */
  remove(p: GamePlayer): boolean {
    const s = this.st(p);
    const r = s.room;
    if (!r) return false;
    const i = r.players.indexOf(p);
    if (i >= 0) r.players.splice(i, 1);
    this.stopTimer(p);
    const pk = new PacketOut(199, p.id);
    pk.writeInt(p.id);
    pk.writeString("");
    r.send(pk);
    p.send(pk);
    Object.assign(s, { x: DEFAULT_POS.x, y: DEFAULT_POS.y, dir: DEFAULT_POS.dir, room: null });
    this.broadcastRooms([r]);
    void this.saveExtra(p).catch(() => {});
    return true;
  }

  startTimer(p: GamePlayer): void {
    const s = this.st(p);
    this.stopTimer(p);
    s.timer = setInterval(() => this.tick(p), this.tickMs);
    s.timer.unref?.();
  }
  stopTimer(p: GamePlayer): void {
    const s = this.st(p);
    if (s.timer) clearInterval(s.timer);
    s.timer = null;
  }

  /** PlayerExtra.HotSpringCheck: every minute −1 free minute, GP = HotSpringExp[grade]/10 × VIP factor, +50 honor/10 bound Xu/50 gold. */
  tick(p: GamePlayer): number {
    const s = this.st(p);
    if (!s.room) { this.stopTimer(p); return 0; }
    if (s.min <= 0) {
      p.sendMessage(0, "Seu tempo nas Termas acabou.");
      this.remove(p);
      return 0;
    }
    let gp = Math.trunc(this.expWithLevel(p.info.Grade) / 10);
    if (gp <= 0) return 0;
    s.min--;
    if (s.min <= 5) p.sendMessage(0, `Restam apenas ${s.min} minuto(s).`);
    const vip = p.info.VIPLevel ?? 0;
    const mul = vip >= 8 ? 4 : vip > 5 ? 3 : vip >= 3 ? 2 : 1;
    gp *= mul;
    const honor = 50, giftToken = 10, gold = 50;
    p.addHonor(honor);
    p.addGiftToken(giftToken);
    p.addGold(gold);
    p.addGP(gp, false);
    p.sendMessage(0, vip >= 3
      ? `VIP [${vip}]: você recebe x${mul} de experiência. Você recebeu ${gp} de experiência, ${honor} de honra, ${giftToken} Cupons vinculados e ${gold} de ouro!`
      : `Você recebeu ${gp} de experiência, ${honor} de honra, ${giftToken} Cupons vinculados e ${gold} de ouro!`);
    const pk = new PacketOut(191, p.id);
    pk.writeByte(7);
    pk.writeInt(s.min);
    pk.writeInt(gp);
    p.send(pk);
    void this.saveExtra(p).catch(() => {});
    return gp;
  }
}

const mgrs = new WeakMap<ServerContext, Promise<HotSpringMgr>>();
export function hotSpringMgr(ctx: ServerContext): Promise<HotSpringMgr> {
  let m = mgrs.get(ctx);
  if (!m) {
    const x = new HotSpringMgr(ctx);
    m = x.load().then(() => x);
    mgrs.set(ctx, m);
  }
  return m;
}

/** Parses the client walk path "x1,y1,x2,y2…" into validated integers (max 100 points, clamped to the scene). */
export function sanitizePath(path: string): number[] {
  const nums = String(path).split(",").slice(0, 200).map((v) => Math.trunc(Number(v)));
  if (nums.length % 2 === 1) nums.pop();
  const out: number[] = [];
  for (let i = 0; i < nums.length; i += 2) {
    const x = nums[i]!, y = nums[i + 1]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
    out.push(Math.min(SCENE.maxX, Math.max(SCENE.minX, x)), Math.min(SCENE.maxY, Math.max(SCENE.minY, y)));
  }
  return out;
}

export async function hotSpringOnQuit(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const m = mgrs.get(ctx);
  if (!m) return;
  const x = await m;
  x.remove(p);
  x.scene.delete(p);
}
