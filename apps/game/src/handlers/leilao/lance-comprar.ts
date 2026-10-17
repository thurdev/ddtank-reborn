/**
 * Aba no jogo: Leilão › dar lance ou comprar direto (mouthful).
 * Pacotes: 193 AUCTION_UPDATE.
 * C#: `AuctionUpdateHandler.cs`.
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`. Manual: Leilão → abrir item → Dar lance / Comprar.
 */
import { and, eq } from "drizzle-orm";
import { PacketOut } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { A, type AuctionRow, auctionRefresh, isWarrior, limitLevel, mailTo, settle } from "./comum.js";

/** AuctionUpdateHandler.cs — lance ou compra direta. */
export async function update(ctx: ServerContext, p: GamePlayer, pkt: { readInt(): number }): Promise<void> {
  const auctionId = pkt.readInt();
  const money = pkt.readInt();
  const now = ctx.now();
  const reply = (ok: boolean) => { const g = new PacketOut(193, p.id); g.writeBoolean(ok); g.writeInt(auctionId); p.send(g); };

  if (isWarrior(p)) { p.sendMessage(0, "Esta conta não tem permissão para usar esta função."); return reply(false); }
  const limit = limitLevel(ctx, 0);
  if (p.info.Grade < limit) { p.sendMessage(0, `É necessário nível ${limit} para realizar esta ação!`); return reply(false); }
  if (p.info.HasBagPassword && p.info.IsLocked) { p.sendMessage(0, ctx.lang.t("Bag.Locked")); return reply(false); }

  const [row] = await ctx.db.db.select().from(A).where(and(eq(A.AuctionID, auctionId), eq(A.IsExist, true))).limit(1);
  let msg = "AuctionUpdateHandler.Fail";
  let ok = false;
  let resultRow: AuctionRow | null = row ?? null;
  if (!row) msg = "AuctionUpdateHandler.Msg1";
  else if (money > p.info.Money + p.info.MoneyLock) msg = "AuctionUpdateHandler.Msg2";
  else if (row.BuyerID === 0 && row.Price > money) msg = "AuctionUpdateHandler.Msg4";
  else if (row.BuyerID !== 0 && row.Price + row.Rise > money && (row.Mouthful === 0 || row.Mouthful > money)) msg = "AuctionUpdateHandler.Msg5";
  else {
    const buyout = row.Mouthful !== 0 && money >= row.Mouthful;
    const newPrice = buyout ? row.Mouthful : money;
    const upd = await ctx.db.db.update(A).set({ BuyerID: p.id, BuyerName: p.info.NickName ?? "", Price: newPrice, IsExist: !buyout })
      .where(and(eq(A.AuctionID, auctionId), eq(A.IsExist, true))).returning();
    if (upd.length) {
      ok = true;
      resultRow = upd[0]!;
      p.removeMoney(newPrice);
      if (row.BuyerID !== 0) await mailTo(ctx, row.BuyerID, row.BuyerName, ctx.lang.t("AuctionUpdateHandler.Msg1b", row.Name), ctx.lang.t("AuctionUpdateHandler.Msg2b", row.Name, p.info.NickName ?? "", String(row.Price)), undefined, 0, row.Price, 5);
      msg = buyout ? "AuctionUpdateHandler.Msg7" : "AuctionUpdateHandler.Msg6";
      if (buyout) await settle(ctx, resultRow);
    }
  }
  p.send(auctionRefresh(resultRow, auctionId, resultRow?.IsExist ?? false, null, now));
  if (msg) p.sendMessage(0, ctx.lang.t(msg));
  reply(ok);
}
