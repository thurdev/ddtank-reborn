/**
 * Aba no jogo: Casamento › Igreja/capela (lista de salas, criar/entrar/sair, trocar cenário, estado
 * atual, editar nome/senha/descrição da sala).
 * Pacotes: 240 MARRY_SCENE_LOGIN, 241 MARRY_ROOM_CREATE, 242 MARRY_ROOM_LOGIN,
 * 244 PLAYER_EXIT_MARRY_ROOM, 233 MARRY_SCENE_CHANGE, 251 SCENE_STATE, 253 MARRY_ROOM_INFO_UPDATE.
 * C#: `UserEnterMarrySceneHandler.cs` (240), `MarryRoomCreateHandler.cs` (241),
 * `MarryRoomLoginHandler.cs` (242), `UserLeaveMarryRoom.cs` (244), `MarrySceneChangeHandler.cs` (233),
 * `MarryStateHandler.cs` (251), `MarryRoomInfoUpdateHandler.cs` (253).
 * Atenção: 253 é a edição da SALA da capela (nome/senha/descrição); 237 (`mural.ts`) é a edição do seu
 * pedido no MURAL — são formatos diferentes que o C# original misturava (ver cabeçalho de `mural.ts`).
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`. Manual: Casamento → Igreja → criar sala →
 * convidar → trocar cenário → editar descrição → sair.
 */
import { GSPacket, PacketOut } from "@ddt/protocol";
import { eq } from "drizzle-orm";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { broadcast, type ChapelRoom, isCouple, MARRY_ROOM, PRICE_MARRY_ROOM, roomInfoPacket, roomOf, rooms, setMarried } from "./infra.js";

/** 240 MARRY_SCENE_LOGIN: entra na tela da capela, recebe a lista de salas ativas. */
export function marrySceneLogin(ctx: ServerContext, p: GamePlayer): void {
  p.send((() => { const o = new PacketOut(240); o.writeBoolean(true); return o; })());
  for (const room of rooms(ctx).values()) p.send(roomInfoPacket(room));
}

/** 241 MARRY_ROOM_CREATE: UTF nome, UTF senha, int mapIndex, int horas, int maxCount, bool guestInvite,
 * UTF introdução — só casal casado sem sala própria pode criar. */
export async function marryRoomCreate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const name = pkt.readString(); const pwd = pkt.readString(); const mapIndex = pkt.readInt();
  let hours = pkt.readInt(); const maxCount = pkt.readInt(); const guestInvite = pkt.readBoolean(); const intro = pkt.readString();
  if (!p.info.IsMarried || p.info.IsCreatedMarryRoom) return;
  if (p.info.HasBagPassword && p.info.IsLocked) return p.sendMessage(0, ctx.lang.t("Bag.Locked"));
  if (![2, 3, 4].includes(hours)) hours = 4;
  const price = PRICE_MARRY_ROOM(hours);
  if (p.info.Money + p.info.MoneyLock < price) return;
  p.removeMoney(price);
  const spouse = ctx.world.get(p.info.SpouseID);
  const groomID = p.info.Sex ? p.info.SpouseID : p.id;
  const groomName = p.info.Sex ? p.info.SpouseName ?? "" : p.info.NickName ?? "";
  const brideID = p.info.Sex ? p.id : p.info.SpouseID;
  const brideName = p.info.Sex ? p.info.NickName ?? "" : p.info.SpouseName ?? "";
  const now = ctx.now();
  const [row] = await ctx.db.db.insert(MARRY_ROOM).values({
    Name: name, PlayerID: p.id, PlayerName: p.info.NickName ?? "", GroomID: groomID, GroomName: groomName, BrideID: brideID, BrideName: brideName,
    Pwd: pwd, AvailTime: hours, MaxCount: Math.max(2, maxCount), GuestInvite: guestInvite, MapIndex: mapIndex, BeginTime: now,
    BreakTime: new Date(now.getTime() + hours * 3_600_000), RoomIntroduction: intro, ServerID: ctx.zoneId, IsHymeneal: false,
  }).returning();
  const room: ChapelRoom = {
    id: row!.ID, name, pwd, mapIndex, maxCount: Math.max(2, maxCount), guestInvite, introduction: intro,
    creatorId: p.id, creatorName: p.info.NickName ?? "", groomID, groomName, brideID, brideName, createTime: now,
    availHours: hours, breakTime: row!.BreakTime, isHymeneal: false, isGunsaluteUsed: false, started: false,
    members: new Set([p]), forbidden: new Set(), mapByPlayer: new Map(),
  };
  rooms(ctx).set(room.id, room);
  await setMarried(ctx, p.id, { IsMarried: true, SpouseID: p.info.SpouseID, SpouseName: p.info.SpouseName ?? "", IsCreatedMarryRoom: true, SelfMarryRoomID: room.id });
  if (spouse) await setMarried(ctx, spouse.id, { IsMarried: true, SpouseID: spouse.info.SpouseID, SpouseName: spouse.info.SpouseName ?? "", SelfMarryRoomID: room.id });
  p.send(roomInfoPacket(room));
  p.send((() => { const o = new PacketOut(242); o.writeBoolean(true); return o; })());
}

/** 242 MARRY_ROOM_LOGIN: int roomId (0 = própria), str pwd, int marryMap. */
export async function marryRoomLogin(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const roomId = pkt.readInt(); const pwd = pkt.readString(); pkt.readInt();
  let room = roomId !== 0 ? rooms(ctx).get(roomId) : [...rooms(ctx).values()].find((r) => isCouple(r, p.id));
  if (!room && roomId === 0 && p.info.SelfMarryRoomID) return p.sendMessage(0, ctx.lang.t("MarryRoomLoginHandler.RoomExist", String(ctx.zoneId), String(p.info.SelfMarryRoomID)));
  if (!room) { p.send(roomInfoPacket(null)); return; }
  if (room.forbidden.has(p.id)) { p.send(roomInfoPacket(null)); return; }
  if (roomId !== 0 && room.pwd && room.pwd !== pwd && !isCouple(room, p.id)) { p.send(roomInfoPacket(null)); return; }
  room.members.add(p);
  p.send(roomInfoPacket(room));
}

/** 244 PLAYER_EXIT_MARRY_ROOM: sai da sala atual da capela. */
export function playerExitMarryRoom(ctx: ServerContext, p: GamePlayer): void {
  const r = roomOf(ctx, p);
  if (!r) return;
  r.members.delete(p);
  broadcast(r, (() => { const o = new PacketOut(244, p.id); return o; })());
}

/** 233 MARRY_SCENE_CHANGE: int map (1 ou 2) — troca de cenário dentro da capela. */
export function marrySceneChange(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const map = pkt.readInt();
  const r = roomOf(ctx, p);
  if (!r) return;
  r.mapByPlayer.set(p.id, map);
  const out = new PacketOut(244, p.id); // leaves the previous map's viewers, like the original
  broadcast(r, out, p);
}

/** 251 SCENE_STATE: int — devolve o estado atual da sala (reenvia o `roomInfoPacket`). */
export function sceneState(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  pkt.readInt();
  const r = roomOf(ctx, p);
  if (r) p.send(roomInfoPacket(r));
}

/** 253 MARRY_ROOM_INFO_UPDATE: str name, bool changePwd, str pwd, str intro — o DONO edita a própria
 * sala da capela (ver nota do cabeçalho sobre a troca com 237). */
export async function marryRoomInfoUpdate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const name = pkt.readString(); const changePwd = pkt.readBoolean(); const pwd = pkt.readString(); const intro = pkt.readString();
  const r = roomOf(ctx, p);
  if (!r || r.creatorId !== p.id) return;
  r.name = name; r.introduction = intro;
  if (changePwd) r.pwd = pwd;
  await ctx.db.db.update(MARRY_ROOM).set({ Name: name, Pwd: r.pwd, RoomIntroduction: intro }).where(eq(MARRY_ROOM.ID, r.id));
  broadcast(r, roomInfoPacket(r));
  p.sendMessage(0, ctx.lang.t("MarryRoomInfoUpdateHandler.Successed"));
}
