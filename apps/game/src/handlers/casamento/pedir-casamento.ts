/**
 * Aba no jogo: Casamento › pedir em casamento (propor e aceitar/recusar a proposta).
 * Pacotes: 247 MARRY_APPLY (propor), 250 MARRY_APPLY_REPLY (responder).
 * C#: `MarryApplyHandler.cs` casos de proposta/resposta.
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`. Manual: Casamento → escolher alvo →
 * escrever declaração → pedir em casamento → o outro aceita/recusa.
 */
import { GSPacket } from "@ddt/protocol";
import { and, eq } from "drizzle-orm";
import { player } from "@ddt/db";
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { applyNoticePacket, applyReplyPacket, DETAIL, findShop, GOOD_MAN_CARD_TEMPLATE, mailItem, marryPropPacket, RING_TEMPLATE, setMarried } from "./infra.js";

/** 247 MARRY_APPLY: int targetId, str proclamation, bool. */
export async function marryApply(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const targetId = pkt.readInt();
  const love = pkt.readString();
  pkt.readBoolean();
  if (p.info.IsMarried) return;
  if (p.info.HasBagPassword && p.info.IsLocked) return p.sendMessage(0, ctx.lang.t("Bag.Locked"));
  const target = ctx.world.get(targetId) ?? (await ctx.db.db.select().from(DETAIL).where(eq(DETAIL.UserID, targetId)).limit(1))[0];
  if (!target) return;
  const tSex = "info" in (target as { info?: unknown }) ? (target as GamePlayer).info.Sex : (target as { Sex: boolean }).Sex;
  const tMarried = "info" in (target as { info?: unknown }) ? (target as GamePlayer).info.IsMarried : (target as { IsMarried: boolean }).IsMarried;
  if (tSex === p.info.Sex) return;
  if (tMarried) return p.sendMessage(0, ctx.lang.t("MarryApplyHandler.Msg2"));
  let hadRing = p.propBag.getItemByTemplateID(0, RING_TEMPLATE);
  if (!hadRing) {
    const shop = findShop(ctx, RING_TEMPLATE);
    if (!shop) return p.sendMessage(0, ctx.lang.t("MarryApplyHandler.Msg6"));
    if (p.info.Money + p.info.MoneyLock < shop.AValue1) return;
    p.removeMoney(shop.AValue1);
  } else {
    p.propBag.removeItem(hadRing);
  }
  const [row] = await ctx.db.db.insert(player.Marry_Apply).values({ UserID: targetId, ApplyUserID: p.id, ApplyUserName: p.info.NickName ?? "", ApplyType: 1, LoveProclamation: love, ApplyResult: false }).returning({ ID: player.Marry_Apply.ID });
  const noticeId = row!.ID;
  p.send(applyNoticePacket(p.id, p.info.NickName ?? "", love, noticeId));
  ctx.world.get(targetId)?.send(applyNoticePacket(p.id, p.info.NickName ?? "", love, noticeId));
  p.sendMessage(0, ctx.lang.t("MarryApplyHandler.Msg3"));
}

/** 250 MARRY_APPLY_REPLY: bool accept, int proposerId, int answerId. */
export async function marryApplyReply(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const accept = pkt.readBoolean();
  const proposerId = pkt.readInt();
  const answerId = pkt.readInt();
  if (accept && p.info.IsMarried) return p.sendMessage(0, ctx.lang.t("MarryApplyReplyHandler.Msg2"));
  const proposer = ctx.world.get(proposerId) ?? (await ctx.db.db.select().from(DETAIL).where(eq(DETAIL.UserID, proposerId)).limit(1))[0];
  if (!proposer) return;
  const proposerNick = "info" in (proposer as { info?: unknown }) ? (proposer as GamePlayer).info.NickName ?? "" : (proposer as { NickName: string | null }).NickName ?? "";
  if (!accept) {
    const card = ctx.templates.findItem(GOOD_MAN_CARD_TEMPLATE);
    await mailItem(ctx, proposerId, proposerNick, ctx.lang.t("MarryApplyReplyHandler.Title"), ctx.lang.t("MarryApplyReplyHandler.Content"), card ? ItemInfo.createFromTemplate(card, 1, 112) : undefined);
  }
  const expired = await ctx.db.db.update(player.Marry_Apply).set({ isDeal: true, isExist: false }).where(and(eq(player.Marry_Apply.ID, answerId), eq(player.Marry_Apply.ApplyType, 1), eq(player.Marry_Apply.isDeal, false))).returning({ ID: player.Marry_Apply.ID });
  if (!expired.length) return;
  if (accept) {
    await setMarried(ctx, p.id, { IsMarried: true, SpouseID: proposerId, SpouseName: proposerNick });
    await setMarried(ctx, proposerId, { IsMarried: true, SpouseID: p.id, SpouseName: p.info.NickName ?? "" });
    p.questInv?.onMarried();
    (proposer as GamePlayer).questInv?.onMarried?.();
  }
  await ctx.db.db.insert(player.Marry_Apply).values({ UserID: p.id, ApplyUserID: proposerId, ApplyUserName: proposerNick, ApplyType: 2, LoveProclamation: "", ApplyResult: accept });
  p.send(applyReplyPacket(proposerId, accept, proposerNick, false));
  if (accept) p.send(marryPropPacket(p.info));
  ctx.world.get(proposerId)?.send(applyReplyPacket(p.id, accept, p.info.NickName ?? "", true));
}
