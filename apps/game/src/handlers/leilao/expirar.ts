/**
 * Sem tela própria — varredura periódica de leilões vencidos (chamada por um timer em `server.ts`, não
 * um pacote de cliente).
 * C#: `SP_Auction_Scan`. Seguro de chamar concorrente/com frequência (UPDATE idempotente).
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`.
 */
import { and, eq, sql } from "drizzle-orm";
import type { ServerContext } from "../../session/context.js";
import { A, type AuctionRow, settle } from "./comum.js";

export async function scanExpiredAuctions(ctx: ServerContext): Promise<number> {
  const now = ctx.now();
  const expired = await ctx.db.db.execute(sql`SELECT * FROM player."Auction" WHERE "IsExist" = true AND EXTRACT(EPOCH FROM (${now}::timestamp - "BeginDate")) / 3600.0 > "ValidDate"`);
  const rows = (Array.isArray(expired) ? expired : ((expired as { rows?: unknown[] }).rows ?? [])) as AuctionRow[];
  let n = 0;
  for (const r of rows) {
    const upd = await ctx.db.db.update(A).set({ IsExist: false }).where(and(eq(A.AuctionID, r.AuctionID), eq(A.IsExist, true))).returning();
    if (!upd.length) continue;
    await settle(ctx, { ...r, IsExist: false });
    n++;
  }
  return n;
}
