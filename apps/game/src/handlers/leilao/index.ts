/**
 * Aba no jogo: índice do Leilão inteiro — colocar à venda, dar lance/comprar, cancelar e a varredura de
 * expiração. Cada ação tem o seu próprio arquivo:
 *
 *   comum.ts             (sem tela própria, pacote 195 AUCTION_REFRESH + liquidação compartilhada)
 *   colocar-a-venda.ts   (Leilão › vender)             — 192 AUCTION_ADD
 *   lance-comprar.ts     (Leilão › dar lance/comprar)  — 193 AUCTION_UPDATE
 *   cancelar.ts          (Leilão › cancelar venda)     — 194 AUCTION_DELETE
 *   expirar.ts           (sem tela própria, timer)     — `scanExpiredAuctions`
 *
 * Pacotes: ver tabela acima. C#: `Game.Server/Packets/Client/Auction{Add,Update,Delete}Handler.cs`.
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`. Manual: `docs/features/leilao.md`.
 */
import type { HandlerRegistry } from "../registry.js";
import { add } from "./colocar-a-venda.js";
import { update } from "./lance-comprar.js";
import { remove } from "./cancelar.js";

export { scanExpiredAuctions } from "./expirar.js";

export function registerLeilao(r: HandlerRegistry): void {
  r.player(192, "AUCTION_ADD", (ctx, p, pkt) => add(ctx, p, pkt), "implemented");
  r.player(193, "AUCTION_UPDATE", (ctx, p, pkt) => update(ctx, p, pkt), "implemented");
  r.player(194, "AUCTION_DELETE", (ctx, p, pkt) => remove(ctx, p, pkt), "implemented");
}
