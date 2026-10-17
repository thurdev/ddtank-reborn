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
