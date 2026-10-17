/**
 * Aba no jogo: índice da Progressão (totem/honra, coleção de visuais, ficha de cartas de outro jogador) +
 * os 4 pacotes de loteria de cartas sem handler C# algum. Cada ação tem o seu próprio arquivo, nomeado como
 * o jogador vê na tela:
 *
 *   totem.ts               (Totem › subir de totem)        — 136 TOTEM (também guarda `bagLocked`/
 *                             `tryRemoveMoney`, compartilhados com honra.ts)
 *   honra.ts                (Honra › comprar pontos)        — 96  HONOR_UP_COUNT
 *   colecao-de-visuais.ts   (Coleção de visuais)            — 402 AVATAR_COLLECTION
 *   cartas-do-jogador.ts    (ficha de outro jogador)        — 18  GET_PLAYER_CARD
 *   loterias.ts             (sala de sorteio/cartão platina, sem handler C# em nenhum servidor) — 239
 *                             GOTO_CARD_LOTTERY, 104 CARD_LOTTERY, 105 LUCK_LOTTERY, 11 ACTIVE_PULLDOWN
 *
 * Pacotes: ver tabela acima.
 * C#: ver cabeçalho de cada arquivo listado.
 * Como testar: `apps/game/test/progression.test.ts`, `apps/game/test/persist-all.test.ts`. Manual:
 * `docs/features/totem.md`, `docs/features/cartas.md`.
 */
import type { HandlerRegistry } from "../registry.js";
import { totemOpenOne } from "./totem.js";
import { honorUp } from "./honra.js";
import { avatarCollection } from "./colecao-de-visuais.js";
import { getPlayerCard } from "./cartas-do-jogador.js";
import { registerLoterias } from "./loterias.js";

export function registerProgressao(r: HandlerRegistry): void {
  r.player(136, "TOTEM", (ctx, p) => totemOpenOne(ctx, p));
  r.player(96, "HONOR_UP_COUNT", (ctx, p, pkt) => honorUp(ctx, p, pkt));
  r.player(402, "AVATAR_COLLECTION", (ctx, p, pkt) => avatarCollection(ctx, p, pkt));
  r.player(18, "GET_PLAYER_CARD", (ctx, p, pkt) => getPlayerCard(ctx, p, pkt));
  registerLoterias(r);
}
