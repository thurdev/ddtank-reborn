/**
 * Aba no jogo: Leilão › cancelar seu próprio leilão (só enquanto não vendeu).
 * Pacotes: 194 AUCTION_DELETE.
 * C#: `AuctionDeleteHandler.cs`. Na falha, o original reenvia a linha que ainda existir pra esse AuctionID
 * (sem filtro de IsExist na nova busca), então um leilão já vendido/expirado volta com `isExist = true` e
 * a info (possivelmente velha) dele — reproduzido como está, não é bug nosso pra corrigir.
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`. Manual: Leilão → Minhas vendas → Cancelar.
 */
import { and, eq } from "drizzle-orm";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { A, auctionRefresh, itemById, mailTo } from "./comum.js";

export async function remove(ctx: ServerContext, p: GamePlayer, pkt: { readInt(): number }): Promise<void> {
  const auctionId = pkt.readInt();
  const now = ctx.now();
  const [row] = await ctx.db.db.select().from(A).where(and(eq(A.AuctionID, auctionId), eq(A.AuctioneerID, p.id), eq(A.IsExist, true))).limit(1);
  let msg = "AuctionDeleteHandler.Fail";
  let deleted = false;
  if (row && row.BuyerID === 0) {
    const upd = await ctx.db.db.update(A).set({ IsExist: false }).where(and(eq(A.AuctionID, auctionId), eq(A.IsExist, true))).returning();
    if (upd.length) {
      deleted = true;
      msg = "AuctionDeleteHandler.Succeed";
      const it = await itemById(ctx, row.ItemID);
      await mailTo(ctx, p.id, p.info.NickName ?? "", ctx.lang.t("SP_Auction_Delete.Title"), ctx.lang.t("SP_Auction_Delete.Content"), it ?? undefined, 0, 0, 3);
    }
  }
  if (deleted) {
    p.send(auctionRefresh(null, auctionId, false, null, now));
  } else {
    const [cur] = await ctx.db.db.select().from(A).where(eq(A.AuctionID, auctionId)).limit(1);
    p.send(auctionRefresh(cur ?? null, auctionId, !!cur, null, now));
  }
  p.sendMessage(0, ctx.lang.t(msg));
}
