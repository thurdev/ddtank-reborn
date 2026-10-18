/**
 * Aba no jogo: índice da Loja inteira — registra todos os pacotes de compra/venda/presente, loja de props
 * de combate, pacotes promocionais e VIP. Cada ação tem o seu próprio arquivo, nomeado como o jogador vê
 * na tela:
 *
 *   preco.ts             (sem tela própria, usado por comprar/renovar)   — `getItemPrice`/`setItemType`/`canBuyShop`
 *   comprar.ts           (Loja › comprar)                — 44  BUY_GOODS
 *   renovar.ts           (Loja › renovar validade)        — 62  ITEM_CONTINUE
 *   presentear.ts        (Loja › presentear amigo)        — 221 USER_SEND_GIFTS
 *   presentear-vitrine.ts(Loja › presente via vitrine, desabilitado) — 57 GOODS_PRESENT
 *   estoque-diario.ts    (Loja › estoque do dia)          — 168 GOODS_COUNT
 *   pacote-presente.ts   (Loja › pacote-presente)         — 46  BUY_GIFTBAG
 *   bau-rapido-ouro.ts   (Loja › baú rápido de ouro)      — 126 BUY_QUICK_GOLDBOX
 *   props-de-luta.ts     (Loja de props de combate)       — 54  PROP_BUY, 55 PROP_SELL
 *   usar-prop.ts          (Bolsa de props › usar)         — 66  PROP_USE
 *   vip.ts                (VIP › comprar/renovar dias)    — 92  VIP_RENEWAL
 *   roleta-canhao.ts      (Roleta do canhão esquerdo)      — 130 LEFT_GUN_COMPLETE, 128 LEFT_GUN_ROULETTE_SOCKET
 *   loja-cigana.ts        (Loja Cigana, 6600)              — 278 MYSTERY_SHOP
 *   compra-limitada.ts    (Loja › limite diário por item, 6600) — 288 SHOP_BUYLIMITEDCOUNT (+ enforced em comprar.ts)
 *
 * Pacotes: ver tabela acima.
 * C#: ver cabeçalho de cada arquivo listado.
 * Como testar: `apps/game/test/handlers.test.ts` (preço/compra), `apps/game/test/formulas.test.ts` (caixa).
 * Manual: `docs/features/loja.md` tem o passo a passo de cada ação.
 */
import type { HandlerRegistry } from "../registry.js";
import { registerComprar } from "./comprar.js";
import { registerRenovar } from "./renovar.js";
import { registerPresentear } from "./presentear.js";
import { registerPresentearVitrine } from "./presentear-vitrine.js";
import { registerEstoqueDiario } from "./estoque-diario.js";
import { registerPacotePresente } from "./pacote-presente.js";
import { registerBauRapidoOuro } from "./bau-rapido-ouro.js";
import { registerPropsDeLuta } from "./props-de-luta.js";
import { registerUsarProp } from "./usar-prop.js";
import { registerVip } from "./vip.js";
import { registerRoletaCanhao } from "./roleta-canhao.js";
import { registerLojaCigana } from "./loja-cigana.js";
import { registerCompraLimitada } from "./compra-limitada.js";

export function registerLoja(r: HandlerRegistry): void {
  registerComprar(r);
  registerRenovar(r);
  registerPresentear(r);
  registerPresentearVitrine(r);
  registerEstoqueDiario(r);
  registerPacotePresente(r);
  registerBauRapidoOuro(r);
  registerPropsDeLuta(r);
  registerUsarProp(r);
  registerVip(r);
  registerRoletaCanhao(r);
  registerLojaCigana(r);
  registerCompraLimitada(r);
}
