/**
 * Real combat: plugs @ddt/fight (pure engine) into the lobby's FightEngine boundary. One 40 ms loop drives every game
 * (GameMgr.THREAD_INTERVAL); engine events are serialized to 91 GAME_CMD packets exactly as the C# writers cited in
 * packages/fight/src/game/events.ts. Bots (VirtualPlayer seats) are played server-side by @ddt/fight's BotRunner.
 */
import { type FightAssets, type FightCommand, type FightEvent, GameState, type PlayerSpec, PvpGame, BotRunner, type BotProfile, hertAddition } from "@ddt/fight";
import { loadPackedAssets } from "@ddt/fight/node";
import { type GSPacket, PacketOut } from "@ddt/protocol";
import * as Out from "../packets/out.js";
import type { RoomMember } from "../game/player.js";
import type { FightEngine, FightGame, StartGameOptions } from "./types.js";

export interface DdtFightOptions {
  assets?: FightAssets;
  /** GameMgr/MapMgr.GetMapIndex — explicit map or a random open one */
  pickMap?: (mapId: number) => number;
  log?: (m: string) => void;
  /** difficulty for VirtualPlayer seats (default 50) */
  botProfile?: (bot: RoomMember) => BotProfile;
  /** level from total GP (LevelInfo); when omitted the grade is not recomputed */
  gradeForGp?: (gp: number) => number | undefined;
  /** PVPGame.TakeCard drop (DropInventory.CardDrop + AddTemplate TempBag); returns the card face shown to everyone */
  takeCard?: (member: RoomMember, roomType: number) => { templateId: number; count: number };
  /** GamePlayer.OnGameOver (quest conditions) for every human seat */
  onPlayerGameOver?: (member: RoomMember, g: { roomType: number; gameType: number; isWin: boolean; kills: number; playerCount: number }) => void;
  /** test hook: manual clock instead of setInterval */
  manualClock?: boolean;
  seed?: () => number;
}

let gameIdSeq = 1;

/** Item-like shapes we read from the lobby player without importing GamePlayer (bots don't have bags). */
type ItemLike = { TemplateID: number; StrengthenLevel?: number; RefineryLevel?: number; template: { Property7?: number | null; Property8?: number | null; Name?: string | null } };
type LobbyLike = RoomMember & {
  mainWeapon?: ItemLike | null;
  equipBag?: { getItemAt(i: number): ItemLike | null };
  addGiftToken?(v: number): void;
  updateProperties?(): void;
};

export class DdtFightEngine implements FightEngine {
  readonly name = "ddt-fight";
  readonly games = new Map<number, DdtGame>();
  readonly assets: FightAssets;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(readonly o: DdtFightOptions = {}) {
    this.assets = o.assets ?? loadPackedAssets();
  }

  startPvp(s: StartGameOptions): FightGame | null {
    let mapId = this.o.pickMap ? this.o.pickMap(s.mapId) : s.mapId;
    if (!this.assets.maps.has(mapId)) mapId = this.assets.maps.has(1001) ? 1001 : [...this.assets.maps.keys()][0]!;
    try {
      const g = new DdtGame(gameIdSeq++, mapId, s, this);
      this.games.set(g.id, g);
      this.ensureLoop();
      g.tick(Date.now());
      return g;
    } catch (e) {
      this.o.log?.(`fight: cannot start game: ${(e as Error).message}`);
      return null;
    }
  }

  private ensureLoop(): void {
    if (this.timer || this.o.manualClock) return;
    this.timer = setInterval(() => this.tick(Date.now()), 40);
    this.timer.unref?.();
  }

  /** advances every game (exposed for tests with `manualClock`) */
  tick(now: number): void {
    for (const g of [...this.games.values()]) {
      try {
        g.tick(now);
      } catch (e) {
        this.o.log?.(`fight game ${g.id} update error: ${(e as Error).stack}`);
      }
    }
    if (this.games.size === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

/** Player.Reset stat inputs from the lobby character (GamePlayer.GetBaseAttack / GetBaseDefence approximations). */
function specOf(m: LobbyLike, team: number, assets: FightAssets): PlayerSpec {
  const c = m.info;
  const w = m.mainWeapon ?? null;
  const wTpl = w ? assets.items.get(w.TemplateID) : undefined;
  const weaponTemplateId = w?.TemplateID ?? (m.view().weaponTemplateId > 0 ? m.view().weaponTemplateId : 7001);
  const p7 = (it: ItemLike | null | undefined) => (it ? hertAddition(it.template.Property7 ?? 0, it.StrengthenLevel ?? 0) : 0);
  const baseAttack = w ? p7(w) : (assets.items.get(weaponTemplateId)?.property7 ?? 100);
  const baseDefence = m.equipBag ? p7(m.equipBag.getItemAt(0)) + p7(m.equipBag.getItemAt(4)) : 0;
  const dep = m.equipBag?.getItemAt(15) ?? null;
  const depTpl = dep ? assets.items.get(dep.TemplateID) : undefined;
  return {
    userId: m.id, nickname: c.NickName ?? `p${m.id}`, team, grade: c.Grade, attack: c.Attack, defence: c.Defence, agility: c.Agility, lucky: c.Luck,
    baseAttack: Math.max(1, baseAttack), baseDefence, hp: Math.max(1, c.hp),
    weapon: { templateId: weaponTemplateId, property8: wTpl?.property8 ?? w?.template.Property8 ?? 0, refineryLevel: w?.RefineryLevel ?? 0 },
    deputyWeapon: dep && depTpl ? { template: depTpl, strengthenLevel: dep.StrengthenLevel ?? 0 } : null,
    isBot: m.isBot, isVip: (c.typeVIP ?? 0) > 0, inGuild: (c.ConsortiaID ?? 0) > 0,
  };
}

class DdtGame implements FightGame {
  readonly game: PvpGame;
  readonly bots: BotRunner;
  private readonly members = new Map<number, LobbyLike>();
  private readonly teamOf = new Map<number, number>();
  private stopped = false;
  /** PVPGame.Cards (9 for PvP) and Player.CanTakeOut per userId, filled at GAME_OVER */
  private readonly cards: number[] = new Array(9).fill(0);
  private readonly canTakeOut = new Map<number, number>();

  constructor(readonly id: number, readonly mapId: number, private readonly s: StartGameOptions, private readonly engine: DdtFightEngine) {
    const specs: PlayerSpec[] = [];
    for (const [team, list] of [[1, s.red], [2, s.blue]] as const)
      for (const m of list) {
        this.members.set(m.id, m as LobbyLike);
        this.teamOf.set(m.id, team);
        specs.push(specOf(m as LobbyLike, team, engine.assets));
      }
    this.game = new PvpGame({ id, roomType: s.roomType, gameType: s.gameType, timeType: s.timeType, mapId, assets: engine.assets, players: specs, seed: engine.o.seed?.() ?? (Date.now() ^ (id * 7919)) | 0, now: Date.now() });
    const profiles = new Map<number, BotProfile>();
    for (const m of this.members.values()) if (m.isBot) profiles.set(m.id, engine.o.botProfile?.(m) ?? { difficulty: 50 });
    this.bots = new BotRunner(this.game, profiles, id);
  }

  tick(now: number): void {
    if (this.stopped) return;
    this.dispatch(this.game.update(now));
    this.dispatch(this.bots.update(now));
    if (this.game.state === GameState.Stopped) this.stop();
  }

  processData(from: RoomMember, pkt: GSPacket): void {
    // TakeCardCommand (98) / BossTakeCardCommand (130): after GAME_OVER; index out of range (client sends 100 when
    // its countdown ends) = auto pick. Without an answer the client's card board never closes (stuck at "00").
    const at = pkt.offset;
    const sub = pkt.readByte();
    if (sub === 98 || sub === 130) {
      this.takeCard(from.id, pkt.readByte(), false);
      return;
    }
    pkt.offset = at;
    const cmd = parseCommand(pkt);
    if (!cmd) {
      this.engine.o.log?.(`fight ${this.id}: GAME_CMD from ${from.id} ignored`);
      return;
    }
    this.dispatch(this.game.handle(from.id, cmd, Date.now()));
  }

  removePlayer(p: RoomMember): void {
    this.game.removePlayer(p.id);
    this.dispatch(this.game.drain());
    this.members.delete(p.id);
    if ([...this.members.values()].every((m) => m.isBot)) {
      this.game.stop();
      this.stop();
    }
  }

  /** PVPGame.TakeCard(player, index, isAuto) (PVPGame.cs:143-200). */
  takeCard(userId: number, index: number, isAuto: boolean): boolean {
    const left = this.canTakeOut.get(userId) ?? 0;
    if (left <= 0) return false;
    if (index < 0 || index >= this.cards.length || this.cards[index]! > 0) {
      const free = this.cards.findIndex((c) => c === 0);
      if (free < 0) return false;
      index = free;
      isAuto = true;
    }
    const m = this.members.get(userId);
    const living = this.game.players.find((p) => p.spec.userId === userId);
    if (!m || !living) return false;
    this.canTakeOut.set(userId, left - 1);
    this.cards[index] = 1;
    const face = m.isBot ? { templateId: 0, count: 0 } : (this.engine.o.takeCard?.(m, this.s.roomType) ?? { templateId: 0, count: 0 });
    const p = new PacketOut(91, living.id, living.id);
    p.writeByte(98); p.writeBoolean(isAuto); p.writeByte(index); p.writeInt(face.templateId); p.writeInt(face.count); p.writeBoolean(false);
    for (const o of this.members.values()) o.send(p);
    return true;
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    // PVPGame.Stop: players that did not pick get an automatic card.
    for (const [uid, left] of this.canTakeOut) if (left > 0) this.takeCard(uid, -1, true);
    this.game.stop();
    this.engine.games.delete(this.id);
    this.s.onStopped();
  }

  private send(e: FightEvent, pkt: GSPacket): void {
    const target = e.to ? new Set(e.to) : null;
    for (const p of this.game.players) {
      if (e.except === p.id || (target && !target.has(p.id))) continue;
      this.members.get(p.spec.userId)?.send(pkt);
    }
  }

  private dispatch(events: FightEvent[] | void): void {
    for (const e of events ?? []) {
      if (e.cmd === "GAME_OVER") this.applyRewards(e);
      const pkt = this.serialize(e);
      if (pkt) this.send(e, pkt);
    }
  }

  /** PVPGame.GameOver → PlayerDetail.AddGP / AddOffer / AddMoney / AddGiftToken; Match: Win/Total (GamePlayer.OnGameOver). */
  private applyRewards(e: Extract<FightEvent, { cmd: "GAME_OVER" }>): void {
    for (const r of e.players) {
      const m = this.members.get(r.userId);
      if (!m || m.isBot) continue;
      if (r.canTakeOut > 0) this.canTakeOut.set(r.userId, r.canTakeOut);
      const c = m.info as unknown as Record<string, number>;
      c.GP = (c.GP ?? 0) + r.gpGained;
      const g = this.engine.o.gradeForGp?.(c.GP);
      if (g && g > (c.Grade ?? 0)) {
        c.Grade = g; // level up: HP and grade quests (GamePlayer.AddGP -> UpdateLevel)
        (m as LobbyLike & { updatePlayerProperties?(): void }).updatePlayerProperties?.();
        (m as LobbyLike & { questInv?: { refresh(): void } | null }).questInv?.refresh();
      }
      c.Offer = (c.Offer ?? 0) + r.offer;
      if (r.money > 0) c.Money = (c.Money ?? 0) + r.money;
      if (this.s.roomType === 0) {
        if (r.win) c.Win = (c.Win ?? 0) + 1;
        c.Total = (c.Total ?? 0) + 1;
      }
      if (r.giftToken > 0 && m.addGiftToken) m.addGiftToken(r.giftToken);
      else m.updateProperties?.();
      r.gp = c.GP;
      r.grade = c.Grade ?? r.grade;
      try {
        this.engine.o.onPlayerGameOver?.(m, { roomType: this.s.roomType, gameType: this.s.gameType, isWin: r.win, kills: r.totalKill, playerCount: e.players.length });
      } catch (err) {
        this.engine.o.log?.(`fight ${this.id}: onPlayerGameOver failed: ${(err as Error).message}`);
      }
    }
  }

  private serialize(e: FightEvent): PacketOut | null {
    if (e.cmd === "GAME_CREATE") {
      const views: Out.FightPlayerView[] = e.players.map((pl) => {
        const m = this.members.get(pl.userId)!;
        const v = m.view();
        const w = m.mainWeapon ?? null;
        return { ...v, team: pl.team, livingId: pl.livingId, maxBlood: pl.maxBlood, weaponRefineryLevel: w?.RefineryLevel ?? 0, weaponName: w?.template.Name ?? "" };
      }).filter(Boolean);
      return Out.gameCreate(e.roomType, e.gameType, e.timeType, views);
    }
    if (e.cmd === "GAME_LOAD") return Out.gameLoad(e.maxTime, e.mapId, []);
    return serializeEvent(e);
  }
}

/** 91 GAME_CMD body writers for every engine event (C# file:line in packages/fight/src/game/events.ts). */
export function serializeEvent(e: FightEvent): PacketOut | null {
  const p = new PacketOut(91, e.livingId, e.livingId);
  p.writeByte(e.code);
  switch (e.cmd) {
    case "LOAD":
      p.writeInt(e.progress); p.writeInt(0); p.writeInt(e.userId);
      break;
    case "SYNC_LIFETIME":
      p.writeInt(e.lifeTime);
      break;
    case "START_GAME":
      p.writeInt(e.players.length);
      for (const s of e.players) {
        p.writeInt(s.id); p.writeInt(s.x); p.writeInt(s.y); p.writeInt(s.direction); p.writeInt(s.blood); p.writeInt(s.maxBlood); p.writeInt(s.team);
        p.writeInt(s.weaponRefineryLevel); p.writeInt(s.powerRatio); p.writeInt(s.dander); p.writeInt(s.buffs.length);
        for (const b of s.buffs) { p.writeInt(b.type); p.writeInt(b.value); }
        p.writeInt(0); p.writeBoolean(s.isFrost); p.writeBoolean(s.isHide); p.writeBoolean(s.isNoHole); p.writeBoolean(false); p.writeInt(0);
      }
      p.writeDateTime(new Date());
      break;
    case "TURN":
      p.writeBoolean(e.windPositive); p.writeByte(e.vane1); p.writeByte(e.vane2); p.writeByte(e.vane3); p.writeBoolean(e.isHide); p.writeInt(e.turnTime);
      p.writeInt(e.boxes.length);
      for (const b of e.boxes) { p.writeInt(b.id); p.writeInt(b.x); p.writeInt(b.y); p.writeInt(b.type); }
      p.writeInt(e.players.length);
      for (const t of e.players) {
        p.writeInt(t.id); p.writeBoolean(t.isLiving); p.writeInt(t.x); p.writeInt(t.y); p.writeInt(t.blood); p.writeBoolean(t.isNoHole); p.writeInt(t.energy);
        p.writeInt(t.psychic); p.writeInt(t.dander); p.writeInt(t.petMaxMP); p.writeInt(t.petMP); p.writeInt(t.shootCount); p.writeInt(t.flyCount);
      }
      p.writeInt(e.turnIndex);
      break;
    case "FIRE":
      p.writeInt(e.wind10); p.writeBoolean(e.windPositive); p.writeByte(e.vane1); p.writeByte(e.vane2); p.writeByte(e.vane3);
      p.writeInt(e.bombs.length);
      for (const b of e.bombs) {
        p.writeInt(b.bombCount); p.writeInt(b.shootCount); p.writeBoolean(b.digMap); p.writeInt(b.bombId); p.writeInt(b.x); p.writeInt(b.y);
        p.writeInt(b.vx); p.writeInt(b.vy); p.writeInt(b.ballId); p.writeString(b.flyingPartical); p.writeInt(b.radii); p.writeInt(b.power);
        p.writeInt(b.actions.length);
        for (const a of b.actions) { p.writeInt(a.timeInt); p.writeInt(a.type); p.writeInt(a.param1); p.writeInt(a.param2); p.writeInt(a.param3); p.writeInt(a.param4); }
      }
      if (e.petActions.length) {
        p.writeInt(e.petActions.length);
        for (const a of e.petActions) for (const v of a) p.writeInt(v);
        p.writeInt(1);
      } else { p.writeInt(0); p.writeInt(0); }
      break;
    case "HEALTH":
      p.writeByte(e.type & 0xff); p.writeInt(e.blood); p.writeInt(e.value);
      break;
    case "DANDER":
      p.writeInt(e.dander);
      break;
    case "DIRECTION":
      p.writeInt(e.direction);
      break;
    case "MOVESTART":
      p.writeBoolean(false); p.writeByte(e.type); p.writeInt(e.x); p.writeInt(e.y); p.writeByte(e.dir & 0xff); p.writeBoolean(e.isLiving);
      if (e.type === 2) p.writeInt(0);
      break;
    case "SKIPNEXT":
    case "BOT_COMMAND":
      break;
    case "PROP":
      p.writeByte(e.type & 0xff); p.writeInt(e.place); p.writeInt(e.templateId); p.writeInt(e.userLivingId); p.writeBoolean(e.templateId === 10017);
      break;
    case "CHANGE_BALL":
      p.writeBoolean(e.special); p.writeInt(e.ballId);
      break;
    case "FROST":
    case "HIDE":
    case "NONOLE":
      p.writeBoolean(e.state);
      break;
    case "VANE":
      p.writeInt(e.wind10); p.writeBoolean(e.windPositive); p.writeByte(e.vane1); p.writeByte(e.vane2); p.writeByte(e.vane3);
      break;
    case "ADDATTACK":
      p.writeByte(e.shootCount & 0xff);
      break;
    case "FIRE_TAG":
      p.writeBoolean(e.hasTime); p.writeByte(e.speedTime & 0xff);
      break;
    case "USE_DEPUTY_WEAPON":
      p.writeInt(e.remaining);
      break;
    case "PLAYER_PROPERTY":
      p.writeString(e.type); p.writeString(e.state);
      break;
    case "GAME_OVER":
      p.writeInt(e.players.length);
      for (const r of e.players) {
        p.writeInt(r.id); p.writeBoolean(r.win); p.writeInt(r.grade); p.writeInt(r.gp); p.writeInt(r.totalKill); p.writeInt(r.gpGained); p.writeInt(r.hitCount);
        p.writeInt(r.psychic); p.writeInt(r.vipBonus); p.writeInt(0); p.writeInt(0); p.writeInt(0); p.writeInt(0); p.writeInt(0); p.writeInt(0); p.writeInt(r.reward);
        p.writeInt(0); p.writeInt(0); p.writeInt(r.gpGained); p.writeInt(r.offer); p.writeInt(0); p.writeInt(r.isVip ? 1 : 0); p.writeInt(0); p.writeInt(0); p.writeInt(0);
        p.writeInt(0); p.writeInt(r.offer); p.writeInt(r.canTakeOut);
      }
      p.writeInt(e.riches);
      break;
    default:
      return null;
  }
  return p;
}

/** C→S GAME_CMD readers (Game.Logic/Cmd/*.cs). `pkt` is positioned at the body start. */
export function parseCommand(pkt: GSPacket): FightCommand | null {
  const sub = pkt.readByte();
  switch (sub) {
    case 16: return { cmd: "LOAD", progress: pkt.readInt() };
    case 2: return { cmd: "FIRE", x: pkt.readInt(), y: pkt.readInt(), force: pkt.readInt(), angle: pkt.readInt() };
    case 96: {
      const hasTime = pkt.readBoolean();
      return { cmd: "FIRE_TAG", hasTime, speedTime: hasTime ? pkt.readByte() : 0 };
    }
    case 12: return { cmd: "SKIPNEXT", spendTime: pkt.readByte() };
    case 7: return { cmd: "DIRECTION", direction: pkt.readInt() };
    case 9: {
      pkt.readBoolean();
      const type = pkt.readByte(), x = pkt.readInt(), y = pkt.readInt(), dir = pkt.readByte(), isLiving = pkt.readBoolean();
      return { cmd: "MOVESTART", type, x, y, dir, isLiving, turnIndex: pkt.readShort() };
    }
    case 32: return { cmd: "PROP", bag: pkt.readByte(), place: pkt.readInt(), templateId: pkt.readInt() };
    case 15: return { cmd: "STUNT" };
    case 40: return { cmd: "AIRPLANE" };
    case 17: return { cmd: "SUICIDE" };
    case 84: return { cmd: "USE_DEPUTY_WEAPON" };
    case 54: return { cmd: "GHOST_TARGET", x: pkt.readInt(), y: pkt.readInt() };
    case 143: return { cmd: "BOT_COMMAND" };
    default: return null;
  }
}
