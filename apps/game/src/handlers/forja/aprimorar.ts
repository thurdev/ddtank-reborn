/**
 * Aba no jogo: Forja › Forno › Aprimorar. Equipamento alvo no slot 0 da bancada "devora" outras cartas
 * (CategoryID 8/9, destravadas) da `EquipBag` pra ganhar EXP, OU compra EXP direto com Money (35/un);
 * ao cruzar o `Property2` do próximo item na cadeia `FusionType` do template, evolui pro próximo item,
 * preservando `curExp` excedente.
 * Pacotes: 308 EQUIP_BRING_UP → resposta `GSPacket(308)` `[boolean isSuccessful]`.
 * C#: nenhum handler existe em `vendor/DDTank41`/`vendor/DDT-6600` (tela do cliente — `FineBringUpController.as`
 * — nunca ligada no servidor base deste projeto, ver `research/qa/feature-sources.md`). Porte 1:1 de
 * `barrydevp/ddt3.4server` (`Game.Server/Game.Server.Packets/Added/EquipBringUpHandler.cs`), licença não
 * publicada no repo — ver `THIRD_PARTY_NOTICES.md`. Usa a MESMA cadeia `FusionType`/`Property1-4` dos
 * templates de equipamento que `fundir.ts`/`evolucao.ts` já usam — nenhuma tabela/coluna nova.
 * Pacote que lê: `int count`; se `count>0`: `count×[int bagType, int place]` (cartas a devorar, sempre lidas
 * da `EquipBag` independente do `bagType` transmitido — bug do original replicado, ver `EquipBringUpHandler.cs:41-45`);
 * se `count<=0`: `[int (não usado), int exp]` (compra direta com Money).
 * Como testar: `apps/game/test/forge-bringup.test.ts`.
 * Manual: Forja → Forno → Aprimorar → arrastar equipamento pro slot 0 → arrastar cartas destravadas pra
 * devorar OU comprar EXP com Money → equipamento evolui pro próximo item da cadeia ao acumular EXP suficiente.
 */
import { GSPacket } from "@ddt/protocol";
import { ItemInfo, type ItemTemplate } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";

/** Money gasto por ponto de EXP comprado direto (EquipBringUpHandler.cs:67: `needMoney = 35 * exp`). */
export const BRING_UP_MONEY_PER_EXP = 35;

/** ItemInfo.IsBring (SqlDataProvider/Data/ItemInfo.cs:1373): só cartas (CategoryID 8/9) podem ser devoradas. */
export function isBringUpFood(it: ItemInfo): boolean {
  return it.template.CategoryID === 8 || it.template.CategoryID === 9;
}

/**
 * EquipBringUpHandler.GetTempleteInfoByLevel: acha o template da MESMA cadeia de `tagItem` no nível
 * `eatenLevel` (desce por `Property4`/sobe por `FusionType` até bater o nível ou a cadeia acabar).
 */
export function templateAtLevel(ctx: ServerContext, eatenLevel: number, tagItem: ItemTemplate): ItemTemplate {
  let cur = tagItem;
  let curLevel = cur.Property1;
  if (curLevel > eatenLevel) {
    while (curLevel > eatenLevel) {
      if (!cur.Property4) break;
      const next = ctx.templates.findItem(cur.Property4);
      if (!next) break;
      cur = next;
      curLevel = cur.Property1;
    }
  } else if (curLevel < eatenLevel) {
    while (curLevel < eatenLevel) {
      if (!cur.FusionType) break;
      const next = ctx.templates.findItem(cur.FusionType);
      if (!next) break;
      cur = next;
      curLevel = cur.Property1;
    }
  }
  return cur;
}

/**
 * EquipBringUpHandler.CalculateExperience: EXP que a carta devorada entrega pro `tagItem`. Quando o item
 * devorado é de qualidade (`Property3`) MAIOR que o alvo, a EXP é recalculada no nível da carta devorada
 * mas pela cadeia do PRÓPRIO alvo (pra não dar EXP de item de qualidade mais alta de graça).
 */
export function bringUpExperience(ctx: ServerContext, tagTemplate: ItemTemplate, eaten: ItemInfo): number {
  const tagQuality = tagTemplate.Property3;
  let eatenOrigExp = eaten.template.Property2;
  const eatenQuality = eaten.template.Property3;
  let eatenCurExp = eaten.curExp;
  if (tagQuality < eatenQuality) {
    const sameLevel = templateAtLevel(ctx, eaten.template.Property1, tagTemplate);
    eatenOrigExp = sameLevel.Property2;
    eatenCurExp = eatenOrigExp;
  }
  if (eatenCurExp === 0) eatenCurExp = eatenOrigExp;
  return eatenCurExp;
}

/**
 * Aprimorar no jogo: devora cartas (ou compra EXP) pro equipamento do slot 0 da bancada, evoluindo pro
 * próximo item da cadeia `FusionType` ao acumular EXP suficiente.
 * Contrapartida C#: `EquipBringUpHandler.cs` (pacote 308 EQUIP_BRING_UP).
 * Como lê esse código (cada variável):
 * - `store`: bancada da forja (`p.storeBag`); `tagItem`: equipamento alvo, sempre no slot 0.
 * - `count>0`: devora `count` cartas da `EquipBag` (sempre dali, nunca do `bagType` lido — replica o bug
 *   original de ignorar o `bagType` na hora de remover, só usa pra LER o item); `count<=0`: compra EXP com
 *   Money (`BRING_UP_MONEY_PER_EXP` por ponto).
 * - `totalExp`: EXP acumulada (`exp + tagItem.curExp`); o `while` sobe a cadeia `FusionType` enquanto
 *   `curExp <= totalExp`, trocando `tagItem` pro próximo template quando `totalExp` cobre o `Property2`
 *   dele (clona preservando bônus via `ItemInfo.cloneFromTemplate`). PROTEÇÃO (não existe no C#): o
 *   original entra em loop infinito se a cadeia acabar (`FusionType===0`) com EXP ainda sobrando — aqui
 *   o loop para quando não há próximo template, guardando o excesso em `curExp` como o original faria
 *   se a cadeia continuasse.
 * - `scorssMsg`: aviso global (`ctx.world.all()`) só quando o NOVO template tem `Property1>=5` (nível alto).
 */
export async function equipBringUp(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const count = pkt.readInt();
  const store = p.storeBag;
  let tagItem = store.getItemAt(0);
  if (!tagItem) return p.sendMessage(0, ctx.lang.t("EquipBringUpHandler.ItemNotFound"));
  const tagTemplate = tagItem.template;
  if (!tagTemplate) return p.sendMessage(0, ctx.lang.t("EquipBringUpHandler.DoNotSuport"));

  let isSuccessful = false;
  let msg = ctx.lang.t("EquipBringUpHandler.Update.Fail");
  let scorssMsg = "";
  let exp = 0;

  if (count > 0) {
    for (let i = 0; i < count; i++) {
      pkt.readInt(); // bagType — lido e nunca usado pra remover (bug original: sempre devora da EquipBag)
      const place = pkt.readInt();
      const eaten = p.equipBag.getItemAt(place);
      if (eaten && isBringUpFood(eaten) && !eaten.cellLocked) {
        exp += bringUpExperience(ctx, tagTemplate, eaten);
        p.equipBag.removeItemAt(place);
      }
    }
    if (exp !== 0) isSuccessful = true;
  } else {
    pkt.readInt(); // não usado no original
    exp = pkt.readInt();
    const needMoney = BRING_UP_MONEY_PER_EXP * exp;
    if (needMoney <= p.info.Money + p.info.MoneyLock) {
      p.removeMoney(needMoney);
      isSuccessful = true;
    }
  }

  if (isSuccessful) {
    tagItem.IsBinds = true;
    const totalExp = exp + tagItem.curExp;
    let curExp = tagItem.curExp;
    let nextTemplate: ItemTemplate | undefined = tagTemplate;
    while (curExp <= totalExp) {
      nextTemplate = nextTemplate?.FusionType ? ctx.templates.findItem(nextTemplate.FusionType) : undefined;
      if (!nextTemplate) break; // cadeia acabou: sem isso o C# original entraria em loop infinito aqui
      if (totalExp >= nextTemplate.Property2) {
        msg = ctx.lang.t("EquipBringUpHandler.Update.Success2", tagItem.template.Name, nextTemplate.Name);
        const newItem = ItemInfo.cloneFromTemplate(nextTemplate, tagItem);
        store.removeItemAt(0);
        store.addItemTo(newItem, 0);
        tagItem = newItem;
        if (nextTemplate.Property1 >= 5) scorssMsg = ctx.lang.t("EquipBringUpHandler.congratulation", p.info.NickName, tagItem.TemplateID);
      } else {
        msg = ctx.lang.t("EquipBringUpHandler.Update.Success1", exp);
      }
      curExp += nextTemplate.Property2;
    }
    tagItem.curExp = totalExp;
  }
  p.sendMessage(0, msg);

  const out = new GSPacket(308, p.id);
  out.writeBoolean(isSuccessful);
  p.send(out);

  store.updateItem(tagItem);

  if (scorssMsg && tagItem.ItemID > 0) {
    const notice = Out.message(2, scorssMsg);
    for (const onlinePlayer of ctx.world.all()) onlinePlayer.send(notice);
  }
}
