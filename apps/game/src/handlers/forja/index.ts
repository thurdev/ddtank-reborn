/**
 * Aba no jogo: índice da Forja inteira (Ferraria + Forno) — registra todos os pacotes que a bancada
 * da `Store` (bag 12) responde. Cada ação tem o seu próprio arquivo, nomeado como o jogador vê na tela:
 *
 *   bancada.ts            — slots/limpar bancada (122) + auto-split/detectar aba (sem pacote próprio)
 *   fortalecer.ts          (Ferraria › Fortalecer)   — 59  ITEM_STRENGTHEN
 *   compor.ts               (Ferraria › Compor)       — 58  ITEM_COMPOSE
 *   montar.ts               (Ferraria › Montar)       — 121 ITEM_INLAY, 125 ITEM_EMBED_BACKOUT, 217 OPEN_FIVE_SIX_HOLE
 *   transferir.ts           (Ferraria › Transferir)   — 61  ITEM_TRANSFER
 *   fundir.ts               (Ferraria › Fundir)       — 78  ITEM_FUSION (76 = preview, mesma função)
 *   dourar.ts               (Forno › Dourar)          — 106 WISHBEADEQUIP
 *   evolucao.ts             (Forno › Evolução)        — 138 ITEM_ADVANCE
 *   energia-latente.ts      (Forno › Energia latente) — 133 LATENT_ENERGY
 *   espirito-de-luta.ts     (Forno › Gemas)           — 209 FIGHT_SPIRIT
 *   gemas.ts                (modelo de dados puro dos slots de Gemas, usado por espirito-de-luta.ts)
 *   colar.ts                (Forno › Colar)           — 95  NECKLACE_STRENGTH
 *   trava-slot.ts           (cadeado no slot do item) — 313 ITEM_CELL_IS_LOCKED
 *   refinaria.ts             (Forja › Refinaria, design próprio) — 110 ITEM_REFINERY, 111 ITEM_REFINERY_PREVIEW
 *   espirito-do-equipamento.ts (Forno › Espírito do equipamento) — 391 EQUIP_GHOST
 *   aprimorar.ts             (Forno › Aprimorar)       — 308 EQUIP_BRING_UP
 *   refinar-conjunto.ts      (Forno › Refinar conjunto) — 295 STORE_FINE_SUIT
 *   stubs.ts                (sem tela própria)        — 120 ITEM_TREND (vivo, sempre no-op)
 *
 * Pacotes: ver tabela acima.
 * C#: ver cabeçalho de cada arquivo listado.
 * Como testar: `apps/game/test/forge-*.test.ts`, `formulas.test.ts`, `fusion-autosplit.test.ts`,
 * `latent-energy.test.ts`. Manual: `docs/features/forja.md` tem o passo a passo de cada aba.
 */
import type { HandlerRegistry } from "../registry.js";
import { clearStoreBag } from "./bancada.js";
import { strengthen } from "./fortalecer.js";
import { compose } from "./compor.js";
import { inlay, embedBackout, openFiveSixHole } from "./montar.js";
import { transfer } from "./transferir.js";
import { fusion } from "./fundir.js";
import { wishBeadEquip } from "./dourar.js";
import { itemAdvance } from "./evolucao.js";
import { latentEnergy } from "./energia-latente.js";
import { figSpiritUpGrade } from "./espirito-de-luta.js";
import { necklaceStrength } from "./colar.js";
import { itemCellIsLocked } from "./trava-slot.js";
import { refinery, refineryPreview } from "./refinaria.js";
import { equipGhost } from "./espirito-do-equipamento.js";
import { equipBringUp } from "./aprimorar.js";
import { forgeSuit } from "./refinar-conjunto.js";
import { itemTrend, STUB_PACKETS } from "./stubs.js";

/**
 * Tabela código → função → aba do jogo. Cada linha é um pacote que o cliente manda; a ordem aqui não
 * importa pro jogo (o registro é por código), só ajuda a achar rápido o que responde a quê.
 */
export function registerForja(r: HandlerRegistry): void {
  // Ferraria
  r.player(59, "ITEM_STRENGTHEN", (ctx, p, pkt) => strengthen(ctx, p, pkt), "partial"); // Fortalecer
  r.player(58, "ITEM_COMPOSE", (ctx, p, pkt) => compose(ctx, p, pkt), "partial"); // Compor
  r.player(121, "ITEM_INLAY", (ctx, p, pkt) => inlay(ctx, p, pkt)); // Montar (incrustar gema)
  r.player(125, "ITEM_EMBED_BACKOUT", (ctx, p, pkt) => embedBackout(ctx, p, pkt)); // Montar (remover gema)
  r.player(217, "OPEN_FIVE_SIX_HOLE", (ctx, p, pkt) => openFiveSixHole(ctx, p, pkt)); // Montar (broca, furos 5/6)
  r.player(61, "ITEM_TRANSFER", (ctx, p, pkt) => transfer(ctx, p, pkt)); // Transferir
  r.player(78, "ITEM_FUSION", (ctx, p, pkt) => fusion(ctx, p, pkt)); // Fundir (76 preview é a mesma função)

  // Forno
  r.player(106, "WISHBEADEQUIP", (ctx, p, pkt) => wishBeadEquip(ctx, p, pkt)); // Dourar
  r.player(138, "ITEM_ADVANCE", (ctx, p, pkt) => itemAdvance(ctx, p, pkt)); // Evolução
  r.player(133, "LATENT_ENERGY", (ctx, p, pkt) => latentEnergy(ctx, p, pkt)); // Energia latente
  r.player(209, "FIGHT_SPIRIT", (ctx, p, pkt) => figSpiritUpGrade(ctx, p, pkt)); // Gemas (espírito de luta)
  r.player(95, "NECKLACE_STRENGTH", (ctx, p, pkt) => necklaceStrength(ctx, p, pkt)); // Colar
  r.player(313, "ITEM_CELL_IS_LOCKED", (ctx, p, pkt) => itemCellIsLocked(ctx, p, pkt)); // Cadeado no slot
  r.player(110, "ITEM_REFINERY", (ctx, p, pkt) => refinery(ctx, p, pkt)); // Refinaria (design próprio, sem fonte C#)
  r.player(111, "ITEM_REFINERY_PREVIEW", (ctx, p, pkt) => refineryPreview(ctx, p, pkt)); // Refinaria (preview)
  r.player(391, "EQUIP_GHOST", (ctx, p) => equipGhost(ctx, p)); // Espírito do equipamento
  r.player(308, "EQUIP_BRING_UP", (ctx, p, pkt) => equipBringUp(ctx, p, pkt)); // Aprimorar
  r.player(295, "STORE_FINE_SUIT", (ctx, p, pkt) => forgeSuit(ctx, p, pkt)); // Refinar conjunto

  // Bancada (comum às duas abas, sem tela própria)
  r.player(122, "CLEAR_STORE_BAG", (ctx, p) => clearStoreBag(ctx, p)); // trocar de aba / limpar bancada

  // Vivo mas sempre no-op (tabela de dados vazia) + stubs sem C# de referência — ver stubs.ts
  r.player(120, "ITEM_TREND", (ctx, p, pkt) => itemTrend(ctx, p, pkt));
  for (const [code, name] of STUB_PACKETS) r.player(code, name, () => undefined, "stub");
}
