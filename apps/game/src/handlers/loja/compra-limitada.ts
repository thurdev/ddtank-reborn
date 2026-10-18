/**
 * Aba no jogo (6600): Loja › limite diário de compra por item — 288 SHOP_BUYLIMITEDCOUNT
 * (`sendGetShopBuyLimitedCount()`, sem params; `ShopManager.as __shopBuyLimitedCountHandler`).
 * C#: `ShopBuyLimitedCountHandler.cs` (decompilado por completo) nunca lê `Shop.LimitCount` nem grava nada —
 * sempre responde `int(0)` (length=0, lista vazia). O campo `LimitCount` existe em `game."Shop"` desde
 * sempre (ver `ShopItemInfo.LimitCount`, `db/templates.ts`) mas nenhum handler do 6600 decompilado o
 * enforça — feature pela metade no build original. Esta tarefa completa o lado servidor: contador por
 * jogador+item+dia (`app."ShopBuyLimited"`), lido aqui e aplicado em `comprar.ts` (44 BUY_GOODS, 6600 only).
 * Sem mudança de comportamento pra quem já comprava sem limite configurado (`LimitCount` nulo/0 em todo
 * `Shop` hoje) — só passa a bloquear quando o admin configurar um `LimitCount > 0`.
 * Como testar: apps/game/test/client-6600-m3-shop-buylimited.test.ts.
 */
import { and, eq, sql } from "drizzle-orm";
import { app } from "@ddt/db";
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";
import { dayKey } from "../../game/events.js";

/** Contadores de hoje deste jogador, por `Shop.ID` (goodsId do pacote 44). */
export async function todaysBuyCounts(ctx: ServerContext, p: GamePlayer): Promise<Map<number, number>> {
  const day = dayKey(ctx.now());
  const rows = await ctx.db.db.select().from(app.ShopBuyLimited).where(and(eq(app.ShopBuyLimited.UserID, p.id), eq(app.ShopBuyLimited.Day, day)));
  return new Map(rows.map((r) => [r.GoodsID, r.Count]));
}

/**
 * Incrementa atomicamente o contador do dia pra esse `goodsId` (1 round-trip, `ON CONFLICT ... DO UPDATE`,
 * sem check-then-write — sem janela de corrida mesmo com 2 conexões do mesmo jogador em paralelo).
 */
export async function incrementBuyCount(ctx: ServerContext, p: GamePlayer, goodsId: number): Promise<void> {
  const day = dayKey(ctx.now());
  await ctx.db.db.execute(sql`
    INSERT INTO "app"."ShopBuyLimited" ("UserID","Day","GoodsID","Count") VALUES (${p.id}, ${day}, ${goodsId}, 1)
    ON CONFLICT ("UserID","Day","GoodsID") DO UPDATE SET "Count" = "app"."ShopBuyLimited"."Count" + 1`);
}

export function registerCompraLimitada(r: HandlerRegistry): void {
  r.player(288, "SHOP_BUYLIMITEDCOUNT", async (ctx, p) => {
    const counts = await todaysBuyCounts(ctx, p);
    const out = new GSPacket(288, p.id);
    out.writeInt(counts.size);
    for (const [goodsId, count] of counts) { out.writeInt(goodsId); out.writeInt(count); }
    p.send(out);
  });
}
