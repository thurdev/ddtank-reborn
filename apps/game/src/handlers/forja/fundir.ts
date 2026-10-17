/**
 * Aba no jogo: Forja › Ferraria › Fundir. Jogador arrasta 4 pedras iguais pros slots 1-4 da bancada
 * e aperta fundir; o resultado cai no slot 0. Pedras empilhadas num slot só se auto-dividem
 * (ver `bancada.ts`) porque o cliente Flash não tem seletor de quantidade.
 * Pacotes: 76 (preview, operação 0) / 78 ITEM_FUSION (fundir de fato, operação 1).
 * C#: `FusionMgr.cs` (regras de receita/prêmio), `ItemFusionHandler.cs` (pacote).
 * Como testar: `fusion-autosplit.test.ts` (dividir pilha nos slots 1-4). Manual: Forja → Ferraria →
 * Fundir → arrastar 4 pedras do mesmo tipo (ou 1 pilha de 4+) → ver preview de % → confirmar.
 */
import { GSPacket } from "@ddt/protocol";
import { ItemInfo, BagType, templateBagType, type ItemTemplate } from "../../game/item.js";
import type { PlayerInventory } from "../../game/inventory.js";
import type { GamePlayer } from "../../game/player.js";
import type { Templates } from "../../db/templates.js";
import type { ServerContext } from "../../session/context.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { FORGE_SLOT, FUSION_MATERIAL_SLOTS, autoSplitFusionSlots, bagLocked, installFusionAutoSplitHook, markFusionPreviewRequested } from "./bancada.js";

const FUSION_COST_GOLD = 400;

/** What a fusion roll can produce: the reward template picked + whether it succeeded. */
export interface FusionPick { template: ItemTemplate; result: boolean }

/**
 * Finds which rewards the 4 placed stones can produce.
 *
 * Como funciona (FusionMgr.cs): junta o FusionType das 4 pedras numa chave
 * (ex. tipos [3,3,3,3] → chave "3333"), busca a receita em Item_Fusion e soma
 * FusionRate / FusionNeedRate das pedras. Candidatos: item de recompensa no nível
 * da pedra mais forte +1, no mesmo nível e +2 (só os que existirem no banco).
 * `max` = melhor prêmio (chance boa), `min` = prêmio de consolação.
 *
 * @param placedStones 4 pedras dos slots 1-4 da storeBag (mesmo TemplateID)
 * @param templates acesso às tabelas (Item_Fusion, itens)
 * @returns null se não há receita pra essa combinação
 */
export function fusionCandidates(placedStones: ItemInfo[], templates: Templates): { max?: ItemTemplate; min?: ItemTemplate; rate: number; need: number; isBind: boolean } | null {
  const sortedFusionTypes = placedStones.map((stone) => stone.template.FusionType).sort((a, b) => a - b);
  const recipeKey = sortedFusionTypes.join("");
  const recipe = templates.fusions.get(recipeKey);
  let highestStoneLevel = 0, totalFusionRate = 0, totalNeedRate = 0, anyStoneBound = false;
  for (const stone of placedStones) {
    highestStoneLevel = Math.max(highestStoneLevel, stone.template.Level);
    totalFusionRate += stone.template.FusionRate;
    totalNeedRate += stone.template.FusionNeedRate;
    if (stone.IsBinds) anyStoneBound = true;
  }
  if (!recipe) return null;
  const rewardOptions = [templates.goodsByFusionTypeAndLevel(recipe.Reward, highestStoneLevel + 1), templates.goodsByFusionTypeAndLevel(recipe.Reward, highestStoneLevel), templates.goodsByFusionTypeAndLevel(recipe.Reward, highestStoneLevel + 2)]
    .filter((reward): reward is ItemTemplate => !!reward);
  // rateRatio = força das pedras / exigência do prêmio. <= 1.1: prêmio bom alcançável.
  const rateRatio = (reward: ItemTemplate) => totalFusionRate / reward.FusionNeedRate;
  const bestReward = rewardOptions.filter((reward) => rateRatio(reward) <= 1.1).sort((a, b) => rateRatio(b) - rateRatio(a))[0];
  const consolationReward = rewardOptions.filter((reward) => rateRatio(reward) > 1.1).sort((a, b) => rateRatio(a) - rateRatio(b))[0];
  return { max: bestReward, min: consolationReward, rate: totalFusionRate, need: totalNeedRate, isBind: anyStoneBound };
}

/**
 * Preview da fusão (o que o cliente mostra antes de confirmar).
 * FusionMgr.FusionPreview: template do prêmio -> chance % de sair.
 * Se só há `max`: chance direta. Se há os dois: divide 100% entre eles.
 */
export function fusionPreview(placedStones: ItemInfo[], templates: Templates): { rates: Map<number, number>; isBind: boolean } {
  const candidates = fusionCandidates(placedStones, templates);
  const previewRates = new Map<number, number>();
  if (!candidates) return { rates: previewRates, isBind: placedStones.some((stone) => stone.IsBinds) };
  if (candidates.max && !candidates.min) previewRates.set(candidates.max.TemplateID, (100 * candidates.rate) / candidates.need);
  if (candidates.max && candidates.min) {
    const topRewardChance = candidates.max.Level - candidates.min.Level === 2 ? (100 * candidates.rate * 0.6) / candidates.max.FusionNeedRate : (100 * candidates.rate) / candidates.max.FusionNeedRate;
    previewRates.set(candidates.max.TemplateID, topRewardChance);
    previewRates.set(candidates.min.TemplateID, 100 - topRewardChance);
  }
  if (!candidates.max && candidates.min) previewRates.set(candidates.min.TemplateID, (100 * candidates.rate) / candidates.need);
  return { rates: previewRates, isBind: candidates.isBind };
}

/**
 * Rola a fusão (FusionMgr.Fusion em FusionMgr.cs): sorteia o prêmio e se deu bom.
 * Trava anti-frustração do original: se o prêmio sorteado já está na bancada, falha.
 */
export function fusionRoll(placedStones: ItemInfo[], templates: Templates, rnd = Math.random): FusionPick | null {
  const candidates = fusionCandidates(placedStones, templates);
  if (!candidates) return null;
  let pickedReward: ItemTemplate | undefined;
  let succeeded = false;
  if (candidates.max && !candidates.min) {
    pickedReward = candidates.max;
    if (Math.floor(rnd() * candidates.need) < candidates.rate) succeeded = true;
  }
  if (candidates.max && candidates.min) {
    if ((100 * candidates.rate) / candidates.max.FusionNeedRate > Math.floor(rnd() * 100)) pickedReward = candidates.max;
    else pickedReward = candidates.min;
    succeeded = true;
  }
  if (!candidates.max && candidates.min) {
    pickedReward = candidates.min;
    if (Math.floor(rnd() * candidates.need) < candidates.rate) succeeded = true;
  }
  if (!pickedReward) return null;
  if (succeeded && placedStones.some((stone) => stone.TemplateID === pickedReward!.TemplateID)) succeeded = false;
  return { template: pickedReward, result: succeeded };
}

function readFusionMaterials(workbench: PlayerInventory): ItemInfo[] {
  return FUSION_MATERIAL_SLOTS
    .map((slot) => workbench.getItemAt(slot))
    .filter((item): item is ItemInfo => item !== null);
}

function fusionExpiryDays(materials: ItemInfo[]): number {
  const sortedExpiries = materials.map((stone) => stone.ValidDate).sort((a, b) => a - b);
  // Validade do prêmio: menor das 4 (0 = permanente; se alguma é permanente, usa a 2ª menor).
  return materials.every((stone) => stone.ValidDate !== 0) ? sortedExpiries[0]! : sortedExpiries[1]!;
}

/**
 * Fusão (ItemFusionHandler.cs, pacote 78; preview = pacote 76).
 *
 * Fluxo no jogo: jogador arrasta 4 pedras iguais pros slots 1-4 da bancada
 * (StoreIIFusionBG.as no cliente) e aperta fundir. Cada tentativa consome
 * 1 unidade de cada slot + 400 ouro, e o resultado cai no slot 0
 * (o que estava no 0 volta pra bolsa ou vai pro correio).
 *
 * Pacote que chega: 1 byte `operation` (0 = só mostra preview, 1 = funde).
 * Resposta preview (76): quantidade de prêmios, pra cada um
 * [templateID, dias de validade, chance%] + se amarra (bind).
 * Resposta fusão (78): 1 boolean (deu bom ou não) + mensagem de chat.
 */
export async function fusion(ctx: ServerContext, player: GamePlayer, pkt: GSPacket, rnd = Math.random): Promise<void> {
  const operation = pkt.readByte();
  if (bagLocked(ctx, player)) return;
  installFusionAutoSplitHook(player); // safety net: normally already installed by clearStoreBag (122)
  const workbench = player.storeBag;
  autoSplitFusionSlots(workbench);
  const placedStones = readFusionMaterials(workbench);
  if (placedStones.length >= 4 && placedStones.some((stone) => stone.TemplateID !== placedStones[0]!.TemplateID)) return player.sendMessage(1, ctx.lang.t("Há itens de tipos diferentes!"));
  if (placedStones.length !== 4) return player.sendMessage(0, ctx.lang.t("ItemFusionHandler.ItemNotEnough"));
  const shortestExpiry = fusionExpiryDays(placedStones);
  let rewardExpiryDays = shortestExpiry;
  if (operation === 0) {
    markFusionPreviewRequested(player);
    const preview = fusionPreview(placedStones, ctx.templates);
    const candidates = fusionCandidates(placedStones, ctx.templates);
    let rewardBound = preview.isBind;
    const anyReward = candidates?.max ?? candidates?.min;
    if (anyReward && (anyReward.CategoryID === 7 || anyReward.CategoryID === 17)) { rewardExpiryDays = 7; rewardBound = true; }
    if (preview.rates.size === 0) return;
    const out = new GSPacket(76, player.id);
    out.writeInt(preview.rates.size);
    for (const [rewardTemplateId, chancePct] of preview.rates) {
      out.writeInt(rewardTemplateId); out.writeInt(rewardExpiryDays); out.writeInt(Math.trunc(chancePct > 100 ? 100 : chancePct >= 0 ? chancePct : 0));
    }
    out.writeBoolean(rewardBound);
    player.send(out);
    return;
  }
  if (player.info.Gold < FUSION_COST_GOLD) return player.sendMessage(1, ctx.lang.t("ItemFusionHandler.NoMoney"));
  const rolled = fusionRoll(placedStones, ctx.templates, rnd);
  if (!rolled) return player.sendMessage(0, ctx.lang.t("ItemFusionHandler.NoCondition"));
  let rewardBound = placedStones.some((stone) => stone.IsBinds);
  if (rolled.template.CategoryID === 7 || rolled.template.CategoryID === 17) { rewardExpiryDays = 7; rewardBound = true; }
  const overflowToMail: ItemInfo[] = [];
  workbench.beginChanges();
  try {
    const previousResult = workbench.getItemAt(FORGE_SLOT.fusionResult);
    if (previousResult) {
      workbench.takeOutItem(previousResult);
      const homeBag = player.getItemInventory(previousResult.template);
      if (!homeBag || !(homeBag.stackItemToAnother(previousResult) || homeBag.addItem(previousResult))) overflowToMail.push(previousResult);
    }
    player.removeGold(FUSION_COST_GOLD);
    for (const stone of placedStones) workbench.removeCountFromStack(stone, 1);
    if (rolled.result) {
      if (templateBagType(rolled.template) === BagType.EquipBag) rewardExpiryDays = shortestExpiry;
      const reward = ItemInfo.createFromTemplate(rolled.template, 1, 105, ctx.now());
      reward.IsBinds = rewardBound;
      reward.ValidDate = rewardExpiryDays;
      player.questInv?.onItemFusion(rolled.template.FusionType);
      player.sendMessage(0, ctx.lang.t("ItemFusionHandler.Succeed1") + (rolled.template.Name ?? ""));
      if (!workbench.addItemTo(reward, FORGE_SLOT.fusionResult)) overflowToMail.push(reward);
    } else player.sendMessage(0, ctx.lang.t("ItemFusionHandler.Failed"));
  } finally {
    workbench.commitChanges();
  }
  if (overflowToMail.length) await mailItems(ctx, player, overflowToMail);
  const done = new GSPacket(78, player.id);
  done.writeBoolean(rolled.result);
  player.send(done);
}
