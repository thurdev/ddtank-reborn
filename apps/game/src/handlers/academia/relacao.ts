/**
 * Aba no jogo: sem tela própria — infraestrutura compartilhada da Academia (mestre/aprendiz): string de
 * relação persistida (`masterOrApprentices`), pedidos pendentes em memória (1h), pacotes de saída e envio
 * de mail. Usado por todos os arquivos de `academia/`.
 * C#: `Managers/AcademyMgr.cs` (AddApprentice/FireApprentice/FireMaster/UpdateAwardApp ficam nos arquivos
 * de ação correspondentes) + `PlayerInfo` helpers de mestre/aprendiz
 * (`SqlDataProvider/Data/PlayerInfo.cs:2511-2563`) + `PlayerBussiness.UpdateAcademyPlayer`
 * (`SP_UsersAcademy_Update`).
 */
import { sql } from "drizzle-orm";
import { PacketOut } from "@ddt/protocol";
import { loadPlayerInfo } from "../../db/characters.js";
import { saveItem } from "../../db/items.js";
import { sendMail } from "../../db/social.js";
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { PlayerInfo } from "../../game/player-info.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

// AcademyMgr static ctor
export const LEVEL_GAP = 5;
export const TARGET_PLAYER_MIN_LEVEL = 6;
export const ACADEMY_LEVEL_MIN = 20;
export const ACADEMY_LEVEL_MAX = 16;
export const MASTER_STATE = 2;
export const MASTER_FULL_STATE = 3;

export const checkCanApp = (lvl: number) => lvl >= TARGET_PLAYER_MIN_LEVEL && lvl <= ACADEMY_LEVEL_MAX;
export const checkCanMaster = (lvl: number) => lvl >= ACADEMY_LEVEL_MIN;

export type Rel = Pick<PlayerInfo, "ID" | "NickName" | "masterID" | "masterOrApprentices" | "apprenticeshipState" | "graduatesCount" | "honourOfMaster" | "freezesDate"> & { Grade: number; Sex: boolean };

/** PlayerInfo.updateMasterOrApprenticesArr: "id|nick,id|nick". */
export function parseRel(s: string | null | undefined): Map<number, string> {
  const m = new Map<number, string>();
  for (const part of String(s ?? "").split(",")) {
    if (!part) continue;
    const i = part.indexOf("|");
    const id = Number(i < 0 ? part : part.slice(0, i));
    if (id) m.set(id, i < 0 ? "" : part.slice(i + 1));
  }
  return m;
}

/** PlayerInfo.ConvertMasterOrApprentices: rewrites the string and apprenticeshipState. */
export function writeRel(p: Rel, m: Map<number, string>): void {
  p.apprenticeshipState = m.size === 0 ? 0 : m.size >= 3 ? 3 : p.masterID !== 0 ? 1 : 2;
  p.masterOrApprentices = [...m].map(([id, n]) => `${id}|${n}`).join(",");
}
export function addRel(p: Rel, id: number, nick: string): boolean {
  const m = parseRel(p.masterOrApprentices);
  if (m.has(id)) return false;
  m.set(id, nick);
  writeRel(p, m);
  return true;
}
export function removeRel(p: Rel, id: number): boolean {
  const m = parseRel(p.masterOrApprentices);
  if (!m.delete(id)) return false;
  writeRel(p, m);
  return true;
}

export interface AcademyRequest { sender: number; receiver: number; type: number; at: number }
const requestsByCtx = new WeakMap<ServerContext, AcademyRequest[]>();
export function requests(ctx: ServerContext): AcademyRequest[] {
  let l = requestsByCtx.get(ctx);
  if (!l) requestsByCtx.set(ctx, (l = []));
  const now = Date.now();
  for (let i = l.length - 1; i >= 0; i--) if (l[i]!.at + 3_600_000 < now) l.splice(i, 1);
  return l;
}
export const getRequest = (ctx: ServerContext, sender: number, receiver: number) => requests(ctx).find((r) => r.sender === sender && r.receiver === receiver);
export const removeRequest = (ctx: ServerContext, r: AcademyRequest) => {
  const l = requests(ctx);
  const i = l.indexOf(r);
  if (i >= 0) l.splice(i, 1);
};

// ------------------------------------------------------------------ packets (AbstractPacketLib.cs:66-99)
export function appState(c: Rel, removeUserId: number): PacketOut {
  const p = new PacketOut(141);
  p.writeByte(10);
  p.writeInt(c.apprenticeshipState);
  p.writeInt(c.masterID);
  p.writeString(c.masterOrApprentices ?? "");
  p.writeInt(removeUserId);
  p.writeInt(c.graduatesCount);
  p.writeString(c.honourOfMaster ?? "");
  Out.wd(p, c.freezesDate);
  return p;
}
export function systemNotice(text: string, isAlert: boolean): PacketOut {
  const p = new PacketOut(141);
  p.writeByte(17);
  p.writeString(text);
  p.writeBoolean(isAlert);
  return p;
}
export function graduate(type: number, appId: number, nick: string): PacketOut {
  const p = new PacketOut(141);
  p.writeByte(11);
  p.writeInt(type);
  p.writeInt(appId);
  p.writeString(nick);
  return p;
}
export function askPacket(sub: number, id: number, nick: string, msg: string): PacketOut {
  const p = new PacketOut(141);
  p.writeByte(sub);
  p.writeInt(id);
  p.writeString(nick);
  p.writeString(msg);
  return p;
}

/** PlayerBussiness.UpdateAcademyPlayer (SP_UsersAcademy_Update). */
export async function saveAcademy(ctx: ServerContext, c: Rel): Promise<void> {
  await ctx.db.db.execute(sql`UPDATE player."Sys_Users_Detail" SET "apprenticeshipState" = ${c.apprenticeshipState}, "masterID" = ${c.masterID},
    "masterOrApprentices" = ${c.masterOrApprentices ?? ""}, "graduatesCount" = ${c.graduatesCount}, "honourOfMaster" = ${c.honourOfMaster ?? ""},
    "freezesDate" = ${c.freezesDate ?? new Date()} WHERE "UserID" = ${c.ID}`);
}

export async function infoOf(ctx: ServerContext, id: number): Promise<{ info: Rel; online?: GamePlayer } | null> {
  const online = ctx.world.get(id);
  if (online) return { info: online.info as Rel, online };
  const info = await loadPlayerInfo(ctx.db.db, id);
  return info ? { info: info as Rel } : null;
}

/** GamePlayer.SendMailToUser / WorldEventMgr.SendItem(s)ToMail: items (≤ 5 per mail) or a text mail. */
export async function mailTo(ctx: ServerContext, toId: number, toNick: string, title: string, content: string, items: ItemInfo[] = []): Promise<void> {
  const chunks = items.length ? Array.from({ length: Math.ceil(items.length / 5) }, (_, i) => items.slice(i * 5, i * 5 + 5)) : [[]];
  for (const chunk of chunks) {
    const mail: Record<string, unknown> = {};
    let remark = "";
    for (const [k, it] of chunk.entries()) {
      it.UserID = 0; it.BagType = -1; it.Place = -1;
      await saveItem(ctx.db.db, it);
      mail[`Annex${k + 1}`] = String(it.ItemID);
      mail[`Annex${k + 1}Name`] = it.template.Name ?? "";
      remark += `${k + 1}、${it.template.Name}x${it.Count};`;
    }
    await sendMail(ctx.db.db, { ...mail, AnnexRemark: remark, Content: content, Title: title, Gold: 0, Money: 0, Type: 9, Receiver: toNick, ReceiverID: toId, Sender: toNick, SenderID: toId } as never);
  }
  ctx.world.get(toId)?.send(Out.mailResponse(toId, 1));
}

export function makeItem(ctx: ServerContext, tpl: number, validDate: number): ItemInfo | null {
  const t = ctx.templates.findItem(tpl);
  if (!t) return null;
  const it = ItemInfo.createFromTemplate(t, 1, 103);
  it.IsBinds = true;
  it.ValidDate = validDate;
  return it;
}

export const hoursLeft = (d: Date | null | undefined) => (d && d.getTime() > Date.now() ? Math.ceil((d.getTime() - Date.now()) / 3_600_000) : 0);
export const frozen = (c: Rel) => !!c.freezesDate && c.freezesDate.getTime() > Date.now();
export const FROZEN_MSG = (c: Rel) => `Você está bloqueado por ter abandonado um aluno ou mestre. Tente novamente em ${hoursLeft(c.freezesDate)} hora(s).`;
