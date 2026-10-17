/**
 * Infra compartilhada por todo arquivo de `correio/` — sem tela própria. A lista de cartas em si é HTTP
 * (`LoadUserMail.ashx`/`MailSenderList.ashx` em `apps/api`); 117 MAIL_RESPONSE só avisa o cliente pra
 * recarregar essa lista. Anexos são linhas de `Sys_Users_Goods` com `UserID = 0`, referenciadas por
 * `Annex1..5` na carta.
 *
 * Anti-dupe: um anexo é limpo da carta com um UPDATE condicional (só se ainda tiver aquele ItemID) antes do
 * item ser entregue, então um pacote repetido/concorrente nunca entrega a mesma linha duas vezes; item que
 * não cabe fica na carta (o original removia primeiro e podia perder o item).
 */
import { and, eq } from "drizzle-orm";
import { player } from "@ddt/db";
import { saveItem } from "../../db/items.js";
import { ItemInfo, type GoodsRow } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export const M = player.User_Messages;
export const G = player.Sys_Users_Goods;
export type AnnexKey = "Annex1" | "Annex2" | "Annex3" | "Annex4" | "Annex5";
export const ANNEX: AnnexKey[] = ["Annex1", "Annex2", "Annex3", "Annex4", "Annex5"];

export async function getMail(ctx: ServerContext, userId: number, mailId: number) {
  return (await ctx.db.db.select().from(M).where(and(eq(M.ID, mailId), eq(M.ReceiverID, userId), eq(M.IsExist, true))).limit(1))[0] ?? null;
}

/** MailGetAttachHandler.GetAnnex: move a linha do anexo pra mochila do jogador. False = sem espaço (linha intacta). */
export async function takeAnnex(ctx: ServerContext, p: GamePlayer, mailId: number, key: AnnexKey, itemId: number): Promise<boolean | null> {
  const db = ctx.db.db;
  const row = (await db.select().from(G).where(eq(G.ItemID, itemId)).limit(1))[0] as GoodsRow | undefined;
  const t = row ? ctx.templates.findItem(row.TemplateID) : undefined;
  if (!row || !t || row.UserID !== 0) {
    await db.update(M).set({ [key]: null }).where(eq(M.ID, mailId));
    return null; // anexo pendurado sem dono: descarta
  }
  const inv = p.getItemInventory(t);
  if (!inv || inv.findFirstEmptySlot() < 0) return false;
  const claimed = await db.update(M).set({ [key]: null }).where(and(eq(M.ID, mailId), eq(M[key], String(itemId)))).returning({ ID: M.ID });
  if (!claimed.length) return null;
  const item = ItemInfo.fromRow(row, t);
  item.UserID = p.id;
  item.IsExist = true;
  if (!inv.addItem(item)) {
    await db.update(M).set({ [key]: String(itemId) }).where(eq(M.ID, mailId));
    return false;
  }
  await saveItem(db, item);
  return true;
}
