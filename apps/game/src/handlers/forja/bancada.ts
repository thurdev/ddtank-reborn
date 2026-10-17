/**
 * Aba no jogo: a bancada em si (comum a Ferraria e Forno) — não é uma aba clicável, é o tabuleiro
 * de slots (`StoreBag`, bag 12) que toda ação da Forja usa pra receber item + ingredientes.
 * Pacotes: 122 CLEAR_STORE_BAG (limpar bancada). As demais funções daqui (auto-split, detectar aba)
 * não respondem pacote nenhum — são chamadas pelos handlers de `fortalecer.ts`/`fundir.ts` antes de agir.
 * C#: `GamePlayer.ClearStoreBag` (`GamePlayer.cs:2205`) + `StoreClearItemHandler.cs` (122).
 * Como testar: `forge-autoarrange.test.ts` (detectar aba + auto-split) e `fusion-autosplit.test.ts`
 * (dividir pilha nos slots 1-4). Manual: Forja → arrastar pilha de pedra pra 1 slot só → ela se espalha sozinha.
 */
import { ItemInfo, BagType, templateBagType } from "../../game/item.js";
import type { PlayerInventory, InventoryHooks } from "../../game/inventory.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { mailItems } from "../bolsa/correio-excedente.js";

// -----------------------------------------------------------------------------
// Slots fixos da bancada (StoreBag, bag 12) por aba
// -----------------------------------------------------------------------------

/** Posição de cada ingrediente na bancada, por aba. Mesma StoreBag (20 slots), significado diferente por aba. */
export const FORGE_SLOT = {
  fusionResult: 0,
  fusionMaterialStart: 1,
  fusionMaterialEnd: 4,
  composeLuck: 0,
  composeItem: 1,
  composeStone: 2,
  strengthenStoneStart: 0,
  strengthenStoneEnd: 2,
  strengthenGodStone: 3,
  strengthenLuck: 4,
  strengthenItem: 5,
} as const;

export const FUSION_MATERIAL_SLOTS = [1, 2, 3, 4];
export const STRENGTHEN_STONE_SLOTS = [0, 1, 2];

// -----------------------------------------------------------------------------
// Helpers compartilhados pelos handlers da Forja
// -----------------------------------------------------------------------------

/**
 * Trava de senha da bolsa no jogo: bloqueia uso da forja enquanto `HasBagPassword && IsLocked`.
 * Contrapartida C#: checagem `HasBagPassword/IsLocked` usada pelos handlers de forja antes de mexer na `StoreBag`.
 * Pacote: não lê nem responde pacote; só envia mensagem `0` com string exata `"Bag.Locked"` e retorna `true`.
 * Exemplo concreto: jogador com senha ativa e bolsa trancada tenta `compose` → recebe `"Bag.Locked"` e nada é consumido.
 */
export function bagLocked(ctx: ServerContext, p: GamePlayer): boolean {
  if (p.info.HasBagPassword && p.info.IsLocked) {
    p.sendMessage(0, ctx.lang.t("Bag.Locked"));
    return true;
  }
  return false;
}

/** GamePlayer.isPlayerWarrior: Extra.coupleBossBoxNum == 9 (GM "warrior" accounts always succeed). */
export function isWarrior(p: GamePlayer): boolean {
  return (p.extra as { coupleBossBoxNum?: number } | null)?.coupleBossBoxNum === 9;
}

/**
 * Esvazia bancada da forja no jogo: devolve cada item da `storeBag` para `propBag`/`equipBag`, resto vai por correio.
 * Contrapartida C#: `GamePlayer.ClearStoreBag` (`GamePlayer.cs:2205`) + `StoreClearItemHandler` (122 CLEAR_STORE_BAG).
 * Pacote: não lê pacote (122 não tem corpo); sem resposta de pacote, só move itens e envia correio com string exata
 * `"StoreClearItemHandler.Mail"` (ou `"Itens devolvidos pela Forja."` como fallback).
 * Exemplo concreto: bancada com espada + pedra e `propBag` cheia → espada volta para `equipBag`, pedra vai por correio.
 * Como lê esse código (cada variável):
 * - `store`: bancada da forja (`p.storeBag`, bag 12, slots 0-19); origem de todos os itens.
 * - `leftOver`: itens sem espaço nas bolsas; vão por correio via `mailItems`.
 * - `item`: item atual da bancada em `store.getItems()`; contém `template`, `Place`, `BagType`, `Count`.
 * - `goesToPropBag`: `true` quando `templateBagType(item.template) === BagType.PropBag`; decide bolsa destino.
 * - `destinationBag`: bolsa destino (`p.propBag` ou `p.equipBag`).
 * - `freeSlot`: slot livre no destino (`findFirstEmptySlot()`, equipamento a partir de 31); `-1` = sem espaço.
 */
export async function clearStoreBag(ctx: ServerContext, p: GamePlayer): Promise<void> {
  // ForgeMainView.as:150: toda troca de aba da Forja manda 122 ANTES de qualquer drag — ponto seguro
  // pra instalar o hook de auto-split da fusão (ver installFusionAutoSplitHook abaixo).
  installFusionAutoSplitHook(p);
  const store = p.storeBag;
  const leftOver: ItemInfo[] = [];
  store.beginChanges(); p.propBag.beginChanges(); p.equipBag.beginChanges();
  try {
    for (const item of store.getItems()) {
      const goesToPropBag = templateBagType(item.template) === BagType.PropBag;
      const destinationBag = goesToPropBag ? p.propBag : p.equipBag;
      const freeSlot = goesToPropBag ? destinationBag.findFirstEmptySlot() : destinationBag.findFirstEmptySlot(31);
      if (freeSlot >= 0 && store.takeOutItem(item) && destinationBag.addItemTo(item, freeSlot)) continue;
      if (item.BagType !== BagType.Store) store.addItemTo(item, item.Place >= 0 ? item.Place : store.findFirstEmptySlot());
      leftOver.push(item);
    }
  } finally {
    store.commitChanges(); p.propBag.commitChanges(); p.equipBag.commitChanges();
  }
  if (leftOver.length) {
    for (const item of leftOver) store.takeOutItem(item);
    await mailItems(ctx, p, leftOver, ctx.lang.t("StoreClearItemHandler.Mail") === "StoreClearItemHandler.Mail" ? "Itens devolvidos pela Forja." : ctx.lang.t("StoreClearItemHandler.Mail"), 9);
  }
}

// -----------------------------------------------------------------------------
// Organização automática da bancada (auto-split Reborn)
// -----------------------------------------------------------------------------

/**
 * Reborn auto-split da fusão — por que existe:
 * o cliente Flash não tem seletor de quantidade: arrastar a pedra joga a pilha
 * INTEIRA num slot só, e a fusão precisa de 1 unidade em cada slot 1-4.
 * Então antes de validar, o servidor espalha 1 unidade por slot vazio a partir
 * de pilhas do mesmo tipo da primeira preenchida. Resto fica no slot de origem.
 * Ex: slot1 com 6 pedras → vira 3/1/1/1 e funde direto. Tipos mistos continuam
 * barrados pela checagem normal em `fundir.ts`. Usa `moveItem` (mesmo split do arrastar
 * manual, persiste via dirty/commit como qualquer move).
 *
 * Como lê esse código (cada variável):
 * - workbench: a storeBag do jogador (bancada da forja, slots 0-19; fusão usa 1-4).
 *   Vem de `player.storeBag` (GamePlayer.cs: bancada = StoreBag).
 *
 * @param workbench a storeBag (bancada da forja, slots 0-19; fusão usa 1-4)
 */
export function autoSplitFusionSlots(workbench: PlayerInventory): void {
  autoSplitSlots(workbench, FUSION_MATERIAL_SLOTS);
}

/**
 * Divide IGUAL a pedra do 1º slot ocupado entre os slots do grupo (vazios ou com a mesma pedra): total / nº de slots,
 * sobra pros primeiros. Fusão usa 1-4, fortalecer 0-2.
 * Como lê esse código (cada variável): `bench` storeBag; `slots` grupo; `templateId` pedra do 1º slot; `group` slots
 * que entram na conta; `total` soma das pedras; `slotCount` nº de slots que recebem; `wantedCount` quanto cada slot
 * deve ter; `underfilledSlot`/`overfilledSlot` slot abaixo/acima da meta; `amountToMove` quanto mover de um pro outro.
 */
export function autoSplitSlots(bench: PlayerInventory, slots: number[]): void {
  const firstOccupiedSlot = slots.find((slot) => bench.getItemAt(slot));
  if (firstOccupiedSlot === undefined) return;
  const templateId = bench.getItemAt(firstOccupiedSlot)!.TemplateID;
  // só slots vazios ou com a MESMA pedra entram na divisão (tipo misto continua barrado pela fusão)
  const group = slots.filter((slot) => { const itemAtSlot = bench.getItemAt(slot); return !itemAtSlot || itemAtSlot.TemplateID === templateId; });
  const total = group.reduce((sum, slot) => sum + (bench.getItemAt(slot)?.Count ?? 0), 0);
  if (total < 2) return;
  // divisão igual: total / nº de slots, sobra vai pros primeiros (9000 em 4 = 2250 cada; 9861 em 3 = 3287 cada)
  const slotCount = Math.min(group.length, total);
  const wantedCount = new Map(group.map((slot, index) => [slot, index < slotCount ? Math.floor(total / slotCount) + (index < total % slotCount ? 1 : 0) : 0]));
  for (let guard = 0; guard < 16; guard++) {
    const countAt = (slot: number) => bench.getItemAt(slot)?.Count ?? 0;
    const underfilledSlot = group.find((slot) => countAt(slot) < wantedCount.get(slot)!);
    const overfilledSlot = group.find((slot) => countAt(slot) > wantedCount.get(slot)!);
    if (underfilledSlot === undefined || overfilledSlot === undefined) return;
    const amountToMove = Math.min(wantedCount.get(underfilledSlot)! - countAt(underfilledSlot), countAt(overfilledSlot) - wantedCount.get(overfilledSlot)!);
    if (!bench.moveItem(overfilledSlot, underfilledSlot, amountToMove)) return;
  }
}

/** StoneType.as: STRENGTH "2" / STRENGTH_1 "35" (pedras de fortalecer), LUCKY "3", SOULSYMBOL "7". */
function isStrengthStone(item: ItemInfo | null | undefined): boolean {
  return !!item && item.template.CategoryID === 11 && (Number(item.template.Property1) === 2 || Number(item.template.Property1) === 35);
}

/**
 * Qual aba da Forja está aberta. O cliente não manda a aba (StoreMainView.changeToTab só manda 122), então a gente
 * deduz pelo que está na bancada (StoreIIStrengthBG.as:134-152: 0-2 pedras, 3 símbolo divino, 4 sorte, 5 equipamento;
 * StoreIIFusionBG.as:283-300: 1-4 materiais, 0/5 resultado): equipamento no 5 OU sorte no 4 OU símbolo no 3 = fortalecer.
 * Como lê esse código (cada variável): `equipment` slot 5; `luckStone` slot 4; `godStone` slot 3.
 */
export function forgeTabFromBench(bench: PlayerInventory): "strength" | "fusion" {
  const equipment = bench.getItemAt(FORGE_SLOT.strengthenItem);
  const luckStone = bench.getItemAt(FORGE_SLOT.strengthenLuck);
  const godStone = bench.getItemAt(FORGE_SLOT.strengthenGodStone);
  if (equipment && equipment.template.CategoryID !== 11) return "strength";
  if (luckStone && luckStone.template.CategoryID === 11 && Number(luckStone.template.Property1) === 3) return "strength";
  if (godStone && godStone.template.CategoryID === 11 && Number(godStone.template.Property1) === 7) return "strength";
  // pedra no slot 0: fusão nunca recebe material ali (é o resultado, que é OUTRA pedra que a dos slots 1-4)
  const firstStone = bench.getItemAt(FORGE_SLOT.fusionResult);
  if (isStrengthStone(firstStone) && FUSION_MATERIAL_SLOTS.every((slot) => !bench.getItemAt(slot) || bench.getItemAt(slot)!.TemplateID === firstStone!.TemplateID)) return "strength";
  return "fusion";
}

/**
 * Auto-split Reborn da Forja (fortalecer E fundir): o jogador arrasta a PILHA de pedras pra 1 slot e o servidor
 * espalha 1 por slot. Fortalecer: slots 0-2 (3 pedras = chance maior). Fusão: slots 1-4 (precisa dos 4).
 * Se a bancada começou ambígua (só pedras de fortalecer em 1/2 → tratada como fusão) e depois virou fortalecer
 * (pôs a arma), as pedras que caíram nos slots 3/4 (símbolo/sorte) voltam pra 0-2 antes do split.
 * Como lê esse código (cada variável): `bench` storeBag; `tab` aba deduzida; `sourceSlot` slot 3/4 com pedra errada;
 * `stone` a pedra; `sameTypeSlot` slot 0-2 com a mesma pedra (empilha); `emptyStoneSlot` slot 0-2 vazio.
 */
export function forgeAutoArrange(bench: PlayerInventory, force?: "strength"): void {
  const tab = force ?? forgeTabFromBench(bench);
  if (tab === "fusion") return autoSplitFusionSlots(bench);
  for (const sourceSlot of [FORGE_SLOT.strengthenGodStone, FORGE_SLOT.strengthenLuck]) {
    const stone = bench.getItemAt(sourceSlot);
    if (!isStrengthStone(stone)) continue;
    const sameTypeSlot = STRENGTHEN_STONE_SLOTS.find((slot) => bench.getItemAt(slot)?.TemplateID === stone!.TemplateID);
    const emptyStoneSlot = STRENGTHEN_STONE_SLOTS.find((slot) => !bench.getItemAt(slot));
    const destinationSlot = sameTypeSlot ?? emptyStoneSlot;
    if (destinationSlot !== undefined) bench.moveItem(sourceSlot, destinationSlot, stone!.Count);
  }
  if (STRENGTHEN_STONE_SLOTS.every((slot) => !bench.getItemAt(slot) || isStrengthStone(bench.getItemAt(slot)))) autoSplitSlots(bench, STRENGTHEN_STONE_SLOTS);
}

/** Última vez (ms) que o jogador pediu preview de fusão (76) — prova de que a aba aberta é a Fusão. */
const lastFusionPreview = new WeakMap<GamePlayer, number>();

/** Chamado por `fundir.ts` quando o cliente pede o preview (operação 0 do pacote 78): marca "aba é fusão mesmo". */
export function markFusionPreviewRequested(player: GamePlayer): void {
  lastFusionPreview.set(player, Date.now());
}

/** Bancada só com pedras de fortalecer em 1-4 e nada no 0/5... sem nada que diga a aba (ver forgeTabFromBench). */
function isAmbiguousStoneBench(bench: PlayerInventory): boolean {
  if (bench.getItemAt(0) || bench.getItemAt(5)) return false;
  const stones = [1, 2, 3, 4].map((slot) => bench.getItemAt(slot)).filter(Boolean);
  return stones.length > 0 && stones.every((stone) => isStrengthStone(stone));
}

/** Marks a wrapped `InventoryHooks` object so {@link installFusionAutoSplitHook} doesn't layer twice. */
const FUSION_HOOK_TAG = Symbol("fusionAutoSplitHook");

/**
 * Por que isto existe (a causa raiz do "fusão não funciona no jogo"):
 * StoreIIFusionBG.as (cliente 4.1) só manda os pacotes 76/78 (preview/fundir) quando os 4 slots
 * 1-4 da bancada JÁ ESTÃO preenchidos (`_items[1].info != null && ... [4].info != null`,
 * StoreIIFusionBG.as:670/698) — e só repõe esses `.info` a partir do pacote 64 (GRID_GOODS) que o
 * servidor manda depois de cada mudança na storeBag. `fusion()` (em `fundir.ts`) chama
 * `autoSplitFusionSlots`, mas isso só ajuda se o cliente MANDAR o pacote 78 primeiro — e ele nunca
 * manda com 1 slot só ocupado. Ou seja: o auto-split dentro de `fusion()` é código morto para o
 * caso comum (arrastar 1 pilha pro slot 1), porque o botão de fundir some antes de o servidor ter
 * a chance de rodar.
 *
 * A pilha inteira entra na bancada via CHANGE_PLACE_GOODS (pacote 49), que é de `items.ts` (fora do
 * escopo da forja). Mas toda troca de aba da Forja manda 122 CLEAR_STORE_BAG ANTES de qualquer drag
 * (ForgeMainView.as:150 `changeHandler`, disparado por `Event.CHANGE` do seletor de abas) — então
 * `clearStoreBag()` (handler de 122, acima) roda sempre antes do primeiro drag do jogador na aba de
 * Fusão. Aproveitamos esse ponto: embrulhamos (uma vez só, via `FUSION_HOOK_TAG`) o `onSlotsChanged`
 * da `storeBag` do jogador para, depois de cada mudança nos slots 1-4, rodar `autoSplitFusionSlots`
 * de novo — reagindo ao drop mesmo sem o cliente mandar pacote de fusão. O wrapper sempre chama o
 * hook original primeiro (mesmo `GamePlayer.cs`: `onSlotsChanged` manda o pacote 64 de qualquer
 * jeito), e o split recursivo manda MAIS pacotes 64 com os 4 slots já divididos — o cliente recebe
 * esse 2º update, preenche `_items[1..4].info` e ele mesmo dispara o preview (76) sozinho.
 *
 * Como lê esse código (cada variável):
 * - `splitting`: trava de reentrância — `autoSplitFusionSlots` chama `moveItem`, que comita e
 *   dispara `onSlotsChanged` de novo (o MESMO wrapper); sem a trava, cada passo do split reentraria
 *   nele mesmo. `true` enquanto o wrapper está no meio de um split.
 * - `originalHooks`: hooks atuais da `storeBag` (lidos via cast — `hooks` é `protected`, mas em JS
 *   compilado é só uma propriedade normal; não dá pra embrulhar sem ler o valor atual primeiro).
 * - `changedBag`/`changedSlots`: parâmetros de `onSlotsChanged` (igual `InventoryHooks`); `changedSlots`
 *   são os números dos slots que acabaram de mudar nesse commit.
 */
export function installFusionAutoSplitHook(player: GamePlayer): void {
  const bag = player.storeBag as unknown as { hooks: InventoryHooks & { [FUSION_HOOK_TAG]?: boolean } };
  if (bag.hooks[FUSION_HOOK_TAG]) return;
  const originalHooks = bag.hooks;
  let splitting = false;
  const wrapped: InventoryHooks & { [FUSION_HOOK_TAG]?: boolean } = {
    ...originalHooks,
    onSlotsChanged(changedBag, changedSlots) {
      originalHooks.onSlotsChanged(changedBag, changedSlots);
      if (!splitting && changedSlots.some((changedSlot) => changedSlot >= 0 && changedSlot <= 5)) {
        splitting = true;
        try {
          forgeAutoArrange(changedBag);
        } finally {
          splitting = false;
        }
        // Ambíguo (só pedras de fortalecer nos slots 1-4, nada no 0/5): foi tratado como fusão. Na aba Fusão o cliente
        // pede o preview (76) logo que os 4 slots enchem; se em 600 ms não pedir, é a aba Fortalecer -> reorganiza 0-2.
        if (isAmbiguousStoneBench(changedBag)) {
          const askedAt = lastFusionPreview.get(player) ?? 0;
          setTimeout(() => {
            if ((lastFusionPreview.get(player) ?? 0) !== askedAt || !isAmbiguousStoneBench(changedBag)) return;
            splitting = true;
            try { forgeAutoArrange(changedBag, "strength"); } finally { splitting = false; }
          }, 600);
        }
      }
    },
  };
  wrapped[FUSION_HOOK_TAG] = true;
  player.storeBag.setHooks(wrapped);
}
