/**
 * Aba no jogo: sem tela própria — infraestrutura compartilhada do Casamento/Igreja: sala da capela em
 * memória (`ChapelRoom`), pacotes de saída comuns, persistência de estado de casado
 * (`Sys_Users_Detail`), envio de mail e busca de preço na loja. Usado por todos os arquivos de
 * `casamento/`.
 * C#: `Packets/Client/Marry*.cs`, `DivorceApplyHandler.cs`, `UserEnterMarrySceneHandler.cs`,
 * `UserLeaveMarryRoom.cs`, `SceneMarryRooms/*` (salas da capela + sub-pacotes 249 MARRY_CMD), procs
 * `SP_Insert_Marry_Notice`/`SP_Users_Marry` (efeitos de casar/divorciar em `Sys_Users_Detail`),
 * `SP_MarryInfo_Add/_Update/_Delete` (mural de pedidos), `SP_Insert_Marry_Room_Info`/
 * `SP_Update_Marry_Room_Info` (salas da capela). As salas da capela são só em memória (igual às salas de
 * PvP/PvE) — uma linha `Marry_Room_Info` ainda é escrita (pro admin/auditoria), mas não é recarregada numa
 * sala viva ao reiniciar o servidor.
 */
import { eq } from "drizzle-orm";
import { PacketOut } from "@ddt/protocol";
import { player } from "@ddt/db";
import { sendMail } from "../../db/social.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

export const DETAIL = player.Sys_Users_Detail;
export const MARRY_INFO = player.Marry_Info;
export const MARRY_ROOM = player.Marry_Room_Info;

export const RING_TEMPLATE = 11103;
export const WEDDING_RING_TEMPLATE = 9022;
export const GOOD_MAN_CARD_TEMPLATE = 11105;

export function limitLevel(ctx: ServerContext, index: number): number {
  const parts = String(ctx.templates.serverConfig.get("CustomLimit") ?? "20|20|20|20|20").split("|");
  return Number(parts[index]) || 0;
}
export const PRICE_DIVORCED = (ctx: ServerContext) => ctx.templates.cfgInt("DivorcedMoney", 2000);
export const PRICE_DIVORCED_DISCOUNT = (ctx: ServerContext) => ctx.templates.cfgInt("DivorcedMoneyDiscount", 1000);
export const PRICE_PROPOSE = (ctx: ServerContext) => ctx.templates.cfgInt("HymenealMoney", 500);
export const PRICE_MARRY_ROOM = (hours: number) => (hours === 2 ? 700 : hours === 3 ? 900 : 1000);

export interface ChapelRoom {
  id: number; name: string; pwd: string; mapIndex: number; maxCount: number; guestInvite: boolean; introduction: string;
  creatorId: number; creatorName: string; groomID: number; groomName: string; brideID: number; brideName: string;
  createTime: Date; availHours: number; breakTime: Date; isHymeneal: boolean; isGunsaluteUsed: boolean; started: boolean;
  members: Set<GamePlayer>; forbidden: Set<number>; mapByPlayer: Map<number, number>;
}
const roomsByCtx = new WeakMap<ServerContext, Map<number, ChapelRoom>>();
let roomSeq = 1;
export function rooms(ctx: ServerContext): Map<number, ChapelRoom> {
  let m = roomsByCtx.get(ctx);
  if (!m) roomsByCtx.set(ctx, (m = new Map()));
  return m;
}
export function roomOf(ctx: ServerContext, p: GamePlayer): ChapelRoom | undefined {
  for (const r of rooms(ctx).values()) if (r.members.has(p)) return r;
  return undefined;
}

/**
 * WorldMgr.MarryScene (m3-partial-sweep, 2026-10-19): jogadores que estão olhando a LISTA de salas da
 * capela (entraram via 240 MARRY_SCENE_LOGIN, ainda não entraram numa sala específica) — plateia que
 * recebe os broadcasts 241 (sala criada)/255 (sala atualizada) de `AbstractPacketLib.SendMarryRoomInfo`/
 * `MarryRoom.SendMarryRoomInfoUpdateToScenePlayers`. Distinto de `ChapelRoom.members` (quem já ENTROU
 * numa sala específica, recebe 244/243 da cena 3D). Igual a `rooms()`: só em memória, mesmo padrão do
 * resto do arquivo (sem limpeza em desconexão — `broadcast`-like sends num socket morto são inofensivos).
 */
const chapelBrowsersByCtx = new WeakMap<ServerContext, Set<GamePlayer>>();
export function chapelBrowsers(ctx: ServerContext): Set<GamePlayer> {
  let s = chapelBrowsersByCtx.get(ctx);
  if (!s) chapelBrowsersByCtx.set(ctx, (s = new Set()));
  return s;
}
export function isCouple(r: ChapelRoom, id: number): boolean { return id === r.groomID || id === r.brideID; }
export function broadcast(r: ChapelRoom, pkt: PacketOut, except?: GamePlayer): void {
  for (const m of r.members) if (m !== except) m.send(pkt);
}
// roomSeq nunca é lido em lugar nenhum no original (dead code já no marriage.ts pré-split) — mantido
// intacto pra não mudar comportamento; o ID real da sala vem do INSERT em `capela.ts` (MARRY_ROOM_CREATE).

/** AbstractPacketLib.SendMarryRoomInfo (242) — also used for the 240 scene-list broadcast and the 241 create echo. */
export function roomInfoPacket(r: ChapelRoom | null): PacketOut {
  const p = new PacketOut(242);
  p.writeBoolean(!!r);
  if (!r) return p;
  p.writeInt(r.id); p.writeString(r.name); p.writeInt(r.mapIndex); p.writeInt(r.availHours); p.writeInt(r.members.size);
  p.writeInt(r.creatorId); p.writeString(r.creatorName); p.writeInt(r.groomID); p.writeString(r.groomName);
  p.writeInt(r.brideID); p.writeString(r.brideName); Out.wd(p, r.createTime); p.writeBoolean(r.started);
  p.writeByte(r.isHymeneal ? 2 : 1); p.writeString(r.introduction); p.writeBoolean(r.guestInvite);
  p.writeInt(1); p.writeBoolean(r.isGunsaluteUsed);
  return p;
}
export function marryPropPacket(c: { IsMarried: boolean; SpouseID: number; SpouseName: string | null; IsCreatedMarryRoom: boolean; SelfMarryRoomID: number; IsGotRing: boolean }): PacketOut {
  const p = new PacketOut(234);
  p.writeBoolean(c.IsMarried); p.writeInt(c.SpouseID); p.writeString(c.SpouseName ?? "");
  p.writeBoolean(c.IsCreatedMarryRoom); p.writeInt(c.SelfMarryRoomID); p.writeBoolean(c.IsGotRing);
  return p;
}
export function statusPacket(targetId: number, isMarried: boolean): PacketOut {
  const p = new PacketOut(246); p.writeInt(targetId); p.writeBoolean(isMarried); return p;
}
export function applyNoticePacket(proposerId: number, proposerNick: string, love: string, noticeId: number): PacketOut {
  const p = new PacketOut(247); p.writeInt(proposerId); p.writeString(proposerNick); p.writeString(love); p.writeInt(noticeId); return p;
}
export function applyReplyPacket(otherId: number, accepted: boolean, otherNick: string, isApplicant: boolean): PacketOut {
  const p = new PacketOut(250); p.writeInt(otherId); p.writeBoolean(accepted); p.writeString(otherNick); p.writeBoolean(isApplicant); return p;
}
export function divorceReplyPacket(ok: boolean, discount: boolean): PacketOut {
  const p = new PacketOut(248); p.writeBoolean(ok); p.writeBoolean(discount); return p;
}
export function marryInfoRefreshPacket(row: { ID: number; IsPublishEquip: boolean; Introduction: string | null } | null, infoId: number, exists: boolean): PacketOut {
  const p = new PacketOut(235); p.writeInt(infoId); p.writeBoolean(exists);
  if (row) { p.writeInt(row.ID); p.writeBoolean(row.IsPublishEquip); p.writeString(row.Introduction ?? ""); }
  return p;
}
export function hymenealPacket(r: ChapelRoom, started: boolean): PacketOut {
  const p = new PacketOut(249); p.writeByte(2); p.writeInt(r.id); p.writeBoolean(started); return p;
}

/**
 * AbstractPacketLib.SendMarryRoomInfo (241, "sala criada" — broadcast pra quem está vendo a LISTA) e
 * MarryRoom.SendMarryRoomInfoUpdateToScenePlayers (255, "sala atualizada" — mesmo layout, mesma
 * audiência): `[bool true, int id, bool isHymeneal, str name, bool hasPwd, int mapIndex, int availHours,
 * int count, int creatorId, str creatorName, int groomID, str groomName, int brideID, str brideName,
 * date createTime, byte roomState(1=FREE/2=Hymeneal), str introduction]` — confirmado campo a campo
 * contra `AbstractPacketLib.cs:2850-2876`/`:387-413`. DIFERENTE do layout de 242 (`roomInfoPacket`, "você
 * entrou na sua sala"): sem `guestInvite`/`sceneIndex`/`isGunsaluteUsed`, com `isHymeneal` bool extra no
 * início e `hasPwd` em vez do nome da senha. Usado por: `marrySceneLogin` (lista inicial, 241),
 * `marryRoomCreate` (sala nova, 241) e `marryRoomInfoUpdate` (sala editada, 255) — achado do
 * m3-partial-sweep: o porte anterior confundia os três com 242 (formato errado pra quem só está
 * navegando a lista; corrigia campo nenhum e corrompia `ChurchManager.currentRoom` de quem via a lista).
 */
export function chapelRoomScenePacket(code: 241 | 255, r: ChapelRoom): PacketOut {
  const p = new PacketOut(code);
  p.writeBoolean(true); p.writeInt(r.id); p.writeBoolean(r.isHymeneal); p.writeString(r.name);
  p.writeBoolean(!!r.pwd); p.writeInt(r.mapIndex); p.writeInt(r.availHours); p.writeInt(r.members.size);
  p.writeInt(r.creatorId); p.writeString(r.creatorName); p.writeInt(r.groomID); p.writeString(r.groomName);
  p.writeInt(r.brideID); p.writeString(r.brideName); Out.wd(p, r.createTime); p.writeByte(r.isHymeneal ? 2 : 1);
  p.writeString(r.introduction);
  return p;
}

/**
 * AbstractPacketLib.SendPlayerEnterMarryRoom (243) — troca de presença entre dois jogadores no MESMO
 * mapa (1/2) da cena 3D da capela: `[int Grade, int Hide, int Repute, int ID, str NickName, byte typeVIP,
 * int VIPLevel, bool Sex, str Style, str Colors, str Skin, int X, int Y, int FightPower, int Win,
 * int Total, int Offer, bool IsOldPlayer]` — confirmado campo a campo contra `church.controller.
 * ChurchRoomController.__addPlayer` (6600). Quem recebe desenha o sprite do outro na posição X/Y; cada
 * lado manda a própria ficha pro outro (ver `marrySceneChange`/`sceneState`).
 */
export function playerEnterMarryRoomPacket(p: GamePlayer, x: number, y: number): PacketOut {
  const c = p.info;
  const o = new PacketOut(243);
  o.writeInt(c.Grade); o.writeInt(c.Hide); o.writeInt(c.Repute); o.writeInt(c.ID); o.writeString(c.NickName ?? "");
  o.writeByte(c.typeVIP); o.writeInt(c.VIPLevel); o.writeBoolean(c.Sex); o.writeString(c.Style ?? "");
  o.writeString(c.Colors ?? ""); o.writeString(c.Skin ?? ""); o.writeInt(x); o.writeInt(y); o.writeInt(c.FightPower);
  o.writeInt(c.Win); o.writeInt(c.Total); o.writeInt(c.Offer); o.writeBoolean(c.IsOldPlayer);
  return o;
}

/**
 * Posição fixa de espera por mapa da capela (1/2) — igual nos dois lados pro mapa 2, diferente pro mapa
 * 1 (decompilado assim nos dois handlers, replicado sem "corrigir": `Class20.cs` 233 troca de cenário,
 * `Class21.cs` 251/0 entrada/resync). `fromSwitch=true` usa as coordenadas de `Class20` (233).
 */
export function marryMapSpawn(map: number, fromSwitch: boolean): { x: number; y: number } {
  if (map === 2) return { x: 800, y: 763 };
  return fromSwitch ? { x: 514, y: 637 } : { x: 646, y: 1241 };
}

export async function setMarried(ctx: ServerContext, userId: number, v: { IsMarried: boolean; SpouseID: number; SpouseName: string; IsCreatedMarryRoom?: boolean; SelfMarryRoomID?: number; IsGotRing?: boolean }): Promise<void> {
  const online = ctx.world.get(userId);
  const patch: Record<string, unknown> = { IsMarried: v.IsMarried, SpouseID: v.SpouseID, SpouseName: v.SpouseName };
  if (v.IsCreatedMarryRoom !== undefined) patch.IsCreatedMarryRoom = v.IsCreatedMarryRoom;
  if (v.SelfMarryRoomID !== undefined) patch.SelfMarryRoomID = v.SelfMarryRoomID;
  if (v.IsGotRing !== undefined) patch.IsGotRing = v.IsGotRing;
  if (online) Object.assign(online.info, patch);
  await ctx.db.db.update(DETAIL).set(patch).where(eq(DETAIL.UserID, userId));
}

export async function mailItem(ctx: ServerContext, toId: number, toNick: string, title: string, content: string, item?: import("../../game/item.js").ItemInfo, money = 0): Promise<void> {
  const row: Record<string, unknown> = { Content: content, Title: title, Gold: 0, Money: money, Type: 14, Receiver: toNick, ReceiverID: toId, Sender: "Igreja", SenderID: 0 };
  if (item) { row.Annex1 = String(item.ItemID); row.Annex1Name = item.template.Name ?? ""; }
  await sendMail(ctx.db.db, row as never);
  ctx.world.get(toId)?.send(Out.mailResponse(toId, 1));
}

export function findShop(ctx: ServerContext, templateId: number) {
  for (const s of ctx.templates.shop.values()) if (s.TemplateID === templateId) return s;
  return undefined;
}
