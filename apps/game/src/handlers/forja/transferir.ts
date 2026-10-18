/**
 * Aba no jogo: Forja › Ferraria › Transferir. Jogador coloca 2 equipamentos da mesma categoria
 * (slot 0 "antigo", slot 1 "novo") e troca os bônus acumulados (reforço, composição, furos,
 * energia latente...) entre eles por 10000 de ouro — útil pra "herdar" o progresso de uma arma
 * velha pra uma nova sem perder tudo.
 * Pacotes: 61 ITEM_TRANSFER.
 * C#: `ItemTransferHandler.cs`, `StrengthenMgr.InheritTransferProperty` (`StrengthenMgr.cs:253`).
 * Como testar: sem teste automatizado dedicado ainda. Manual: Forja → Ferraria → Transferir →
 * arma velha +10 no slot 0 + arma nova +0 no slot 1 → confirmar → nova fica +10, ouro -10000.
 */
import { GSPacket } from "@ddt/protocol";
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { bagLocked } from "./bancada.js";

/** StrengthenMgr.InheritTransferProperty (StrengthenMgr.cs:253): swaps strengthen / compose / holes / gold / latent
 *  energy between the two workbench items. isGold itself is NOT swapped (the C# leaves it; mirrored). */
export function inheritTransferProperty(itemA: ItemInfo, itemB: ItemInfo, swapHole: boolean, swapHoleFiveSix: boolean): void {
  const swap = <K extends keyof ItemInfo>(key: K) => { const temp = itemA[key]; itemA[key] = itemB[key]; itemB[key] = temp; };
  if (swapHole) for (const key of ["Hole1", "Hole2", "Hole3", "Hole4"] as const) swap(key);
  if (swapHoleFiveSix) for (const key of ["Hole5", "Hole6"] as const) swap(key);
  for (const key of ["Hole5Exp", "Hole5Level", "Hole6Exp", "Hole6Level", "StrengthenLevel", "StrengthenExp", "AttackCompose", "DefendCompose",
    "LuckCompose", "AgilityCompose", "goldBeginTime", "goldValidDate", "StrengthenTimes", "latentEnergyCurStr", "latentEnergyNewStr", "latentEnergyEndTime"] as const) swap(key);
  if (itemA.IsBinds || itemB.IsBinds) itemA.IsBinds = itemB.IsBinds = true;
}

/** ItemTransferHandler.cs (61): 10000 gold, StoreBag[0] <-> StoreBag[1] (same category, count 1); weapons (cat 7)
 *  are re-templated to the strengthen-level look (StrengthenGoods GainEquip / OrginEquip). Reply 61 byte 0.
 * Como lê esse código (cada variável):
 * - `sourceItem`/`targetItem`: equipamentos dos slots 0/1 da bancada (`store.getItemAt(0|1)`); mesma categoria exigida.
 * - `mustGold`: custo fixo (10000); `moveHole`/`moveFiveSixHole`: booleans do pacote (troca furos 1-4 e/ou 5-6 também).
 * - `originTemplateId(equip)`: acha o `OrginEquip` da cadeia de reforço de `equip` via `StrengthenGoods`/`GoldEquipTemplateLoad`.
 * - `retemplatedWeapon(level, transId)`: template visual (`GainEquip`/`OrginEquip`) pro nível de reforço `level` dessa cadeia.
 * - `sourceRetemplate`/`targetRetemplate`: novo `ItemTemplate` de cada lado quando ambos são arma (categoria 7) e a troca
 *   também muda o visual; `sourceRetemplated`/`targetRetemplated`: `ItemInfo` clonado nesse template, substituindo o slot.
 */
export async function transfer(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (bagLocked(ctx, p)) return;
  const moveHole = pkt.readBoolean();
  const moveFiveSixHole = pkt.readBoolean();
  // 6600 (ItemTransferHandler.cs): GameSocketOut.as sendItemTransfer ganhou +4 int (sBagType/sPlace/tBagType/
  // tPlace) — a view (StoreIITransferBG.as:349) só chama com os 2 primeiros args, então na prática sempre
  // manda os defaults do AS3 (12/0/12/1 = StoreBag[0]/[1], igual ao hardcoded da 4.1), mas o handler C# do
  // 6600 já é genérico (`GetInventory(bageType)`), não fixo em StoreBag — replicado aqui com `getInventory`.
  let sourceBagType = 12, sourcePlace = 0, targetBagType = 12, targetPlace = 1;
  if (p.clientKind === "6600") {
    sourceBagType = pkt.readInt(); sourcePlace = pkt.readInt();
    targetBagType = pkt.readInt(); targetPlace = pkt.readInt();
  }
  // GameProperties.MustTransferGold: 4.1 tem 10000 fixo no código; 6600 lê config (padrão real do
  // serverconfig_out.xml é 40000) — configurável aqui pros dois clientes sem mudar o padrão existente.
  const mustGold = ctx.templates.cfgInt("MustTransferGold", 10000);
  const sourceInv = p.getInventory(sourceBagType);
  const targetInv = p.getInventory(targetBagType);
  const sourceItem = sourceInv?.getItemAt(sourcePlace) ?? null;
  const targetItem = targetInv?.getItemAt(targetPlace) ?? null;
  if (!sourceInv || !targetInv || !sourceItem || !targetItem || sourceItem.template.CategoryID !== targetItem.template.CategoryID || targetItem.Count !== 1 || sourceItem.Count !== 1)
    return p.sendMessage(0, ctx.lang.t("itemtransferhandler.nocondition"));
  if (p.info.Gold < mustGold) return p.sendMessage(0, ctx.lang.t("ItemTransferHandler.NoGold"));
  p.removeGold(mustGold);
  inheritTransferProperty(sourceItem, targetItem, moveHole, moveFiveSixHole);
  // OrginWeaponID / GainWeaponID (ItemTransferHandler.cs): the base weapon of the transfer chain, then the look for
  // the item's strengthen level (10..15 -> GainEquip of that level, else OrginEquip)
  const originTemplateId = (equip: ItemInfo): number => {
    const chain = ctx.templates.strengthenGoods.find((g) => g.GainEquip === equip.TemplateID || g.CurrentEquip === equip.TemplateID);
    if (chain) return chain.OrginEquip;
    const goldEquip = ctx.templates.goldEquipByNew(equip.TemplateID);
    if (!goldEquip) return 0;
    return ctx.templates.strengthenGoods.find((g) => g.GainEquip === goldEquip.OldTemplateId || g.CurrentEquip === goldEquip.OldTemplateId)?.OrginEquip ?? 0;
  };
  const retemplatedWeaponId = (level: number, transId: number): number => {
    if (level >= 10 && level <= 15) return ctx.templates.findStrengthenGoods(level, transId)?.GainEquip ?? -1;
    return ctx.templates.strengthenGoods.find((g) => g.GainEquip === transId || g.CurrentEquip === transId)?.OrginEquip ?? -1;
  };
  try {
    const sourceOriginId = originTemplateId(sourceItem), targetOriginId = originTemplateId(targetItem);
    const sourceRetemplate = sourceOriginId > 0 ? ctx.templates.findItem(retemplatedWeaponId(sourceItem.StrengthenLevel, sourceOriginId)) : undefined;
    const targetRetemplate = targetOriginId > 0 ? ctx.templates.findItem(retemplatedWeaponId(targetItem.StrengthenLevel, targetOriginId)) : undefined;
    if (targetItem.template.CategoryID === 7 && sourceItem.template.CategoryID === 7 && sourceRetemplate && targetRetemplate) {
      const sourceRetemplated = ItemInfo.cloneFromTemplate(sourceRetemplate, sourceItem); sourceRetemplated.openHole();
      const targetRetemplated = ItemInfo.cloneFromTemplate(targetRetemplate, targetItem); targetRetemplated.openHole();
      sourceInv.removeItemAt(sourcePlace); sourceInv.addItemTo(sourceRetemplated, sourcePlace);
      targetInv.removeItemAt(targetPlace); targetInv.addItemTo(targetRetemplated, targetPlace);
    } else {
      sourceInv.updateItem(sourceItem);
      targetInv.updateItem(targetItem);
    }
  } finally {
    sourceInv.commitChanges();
    if (targetInv !== sourceInv) targetInv.commitChanges();
  }
  const out = new GSPacket(61, p.id);
  out.writeByte(0);
  p.send(out);
  p.updatePlayerProperties();
}
