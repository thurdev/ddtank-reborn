/**
 * Aba no jogo: Correio › resgatar anexo (item, ouro, cupom ou gift token de uma carta; paga o reembolso
 * (COD) primeiro quando a carta exigir).
 * Pacotes: 113 GET_MAIL_ATTACHMENT.
 * C#: `MailGetAttachHandler.cs` (byte which — 0 todos, 1-5 anexo, 6 ouro, 7 cupom).
 * Como testar: `apps/game/test/mail.test.ts`, `apps/game/test/persist-all.test.ts`.
 * Manual: Correio → abrir carta com anexo → Resgatar.
 */
import { and, eq } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import { sendMail } from "../../db/social.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { ANNEX, getMail, takeAnnex, M } from "./comum.js";

export async function getAttachment(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  const which = pkt.readByte();
  if (p.info.HasBagPassword && p.info.IsLocked) return p.sendMessage(0, ctx.lang.t("Bag.Locked"));
  const db = ctx.db.db;
  const m = await getMail(ctx, p.id, id);
  if (!m) return p.sendMessage(1, ctx.lang.t("MailGetAttachHandler.Falied"));
  const types: number[] = [];
  let msg = "";
  if (m.Type > 100 && m.Money > 0) {
    // MoneyDirect: paga o remetente (COD); a reivindicação é atômica então um pacote repetido não paga 2x
    if (p.info.Money + p.info.MoneyLock < m.Money) return p.sendMessage(0, ctx.lang.t("UserBuyItemHandler.NoMoney"));
    const paid = await db.update(M).set({ Money: 0 }).where(and(eq(M.ID, id), eq(M.Money, m.Money))).returning({ ID: M.ID });
    if (!paid.length) return;
    p.removeMoney(m.Money);
    await sendMail(db, {
      SenderID: p.id, Sender: p.info.NickName, ReceiverID: m.SenderID, Receiver: m.Sender, Title: ctx.lang.t("MailGetAttachHandler.Deduct"),
      Content: m.Title ?? "", Money: m.Money, Gold: 0, Type: 1, IsExist: true,
    } as never);
    ctx.world.get(m.SenderID)?.send(Out.mailResponse(m.SenderID, 1));
    msg = ctx.lang.t("MailGetAttachHandler.Deduct");
  }
  if (!m.IsRead) await db.update(M).set({ IsRead: true, ValidDate: 72, SendTime: new Date() }).where(eq(M.ID, id));
  let full = false;
  for (const [i, k] of ANNEX.entries()) {
    if (which !== 0 && which !== i + 1) continue;
    const itemId = Number.parseInt(m[k] ?? "", 10);
    if (!(itemId > 0)) continue;
    const ok = await takeAnnex(ctx, p, id, k, itemId);
    if (ok) types.push(i + 1);
    else if (ok === false) full = true;
  }
  if ((which === 0 || which === 6) && m.Gold > 0) {
    const g = await db.update(M).set({ Gold: 0 }).where(and(eq(M.ID, id), eq(M.Gold, m.Gold))).returning({ ID: M.ID });
    if (g.length) {
      p.addGold(m.Gold);
      types.push(6);
    }
  }
  if ((which === 0 || which === 7) && m.Type < 100 && m.Money > 0) {
    const g = await db.update(M).set({ Money: 0 }).where(and(eq(M.ID, id), eq(M.Money, m.Money))).returning({ ID: M.ID });
    if (g.length) {
      p.info.Money += m.Money;
      p.updateProperties();
      types.push(7);
    }
  }
  if (m.Type > 100 && (m.GiftToken ?? 0) > 0) {
    const g = await db.update(M).set({ GiftToken: 0 }).where(and(eq(M.ID, id), eq(M.GiftToken, m.GiftToken!))).returning({ ID: M.ID });
    if (g.length) {
      p.addGiftToken(m.GiftToken!);
      types.push(8);
    }
  }
  const out = new GSPacket(113, p.id);
  out.writeInt(id);
  out.writeInt(types.length);
  for (const t of types) out.writeInt(t);
  p.send(out);
  if (full) msg = ctx.lang.t("Game.Server.Quests.BagFull");
  p.sendMessage(0, msg || ctx.lang.t("MailGetAttachHandler.Success"));
}
