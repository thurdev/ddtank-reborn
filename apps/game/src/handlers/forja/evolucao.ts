/**
 * Aba no jogo: Forja › Forno › Evolução. Usa a "Pedra do Despertar" (slot 0) pra tentar subir o
 * `StrengthenLevel` do equipamento do slot 1, acumulando EXP na falha em vez de quebrar/regredir
 * (diferente do Fortalecer normal — ver `fortalecer.ts`).
 * Pacotes: 138 ITEM_ADVANCE.
 * C#: `ItemAdvanceHandler.cs`.
 * Como testar: sem teste automatizado dedicado ainda; replica de propósito um bug do C# original
 * (ver nota no corpo de `itemAdvance`) — ver `research/qa/port-A.md`.
 * Manual: Forja → Forno → Evolução → arrastar Pedra do Despertar + equipamento → confirmar.
 */
import { GSPacket } from "@ddt/protocol";
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";

/** EquipType.EXALT_ROCK (Packets/EquipType.cs:133 / SqlDataProvider/Data/EquipType.cs:67). */
const EXALT_ROCK = 11150;

/**
 * Evolução no jogo: usa a "Pedra do Despertar" (slot 0) pra tentar subir o `StrengthenLevel` do equipamento
 * do slot 1, acumulando `StrengthenExp` na falha em vez de quebrar/regredir (ao contrário do reforço normal 59).
 * Contrapartida C#: `ItemAdvanceHandler.cs` (pacote 138 ITEM_ADVANCE).
 * Pacote que lê: `[boolean consortia, boolean multiSelected]` — ambos lidos e **nunca usados** no original
 * (confirmado: nenhuma das duas variáveis reaparece no corpo do handler); só preciso consumi-los do stream.
 * Resposta `GSPacket(138)`: `[byte resultado(0=subiu,1=falhou), int stoneExp]`; só é enviada quando o item do
 * slot 1 qualifica (`CanStrengthen && CategoryID<18 && Count===1`) — senão só chat, nada de pacote nem consumo.
 * Exemplo concreto: arma `+7` (StrengthenExp=20) no slot 1 + Pedra do Despertar (Property2=15) no slot 0,
 * `RateAdvance=50000` → `probability = trunc(20/7) = 2`; sucesso só se `roll(0..49999) < 2` (bem raro); falha
 * acumula `StrengthenExp += 15`.
 * Como lê esse código (cada variável):
 * - `store`: bancada da forja (`p.storeBag`); `stone`: Pedra do Despertar no slot 0; `item`: equipamento no slot 1.
 * - `oldLevel`: `item.StrengthenLevel` ANTES da tentativa; denominador da chance (divisão INTEIRA, replicando o bug
 *   original `double probability = item.StrengthenExp / oldLv` em C#: dois `int` dividem como `int` primeiro).
 * - `stoneExp`: ganho de EXP da pedra, mínimo 10 (`Property2 < 10 ? 10 : Property2`).
 * - `roll`: sorteio `Math.floor(rnd()*rateAdvance)`; `rateAdvance`: config `RateAdvance` (padrão 50000).
 * - `current`/`original`: igual ao padrão de `strengthen()` em `fortalecer.ts` — `current` pode virar outro `ItemInfo`
 *   (arma re-templada) quando `StrengthenGoods.GainEquip > TemplateID`; `original` marcado `IsExist=false` nesse caso.
 * - `leveledUp`: `true` quando `probability > roll`; dispara o aviso global (`ItemStrengthenHandler.congratulation2`).
 */
export async function itemAdvance(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd = Math.random): Promise<void> {
  pkt.readBoolean(); // consortia — lido e nunca usado no original
  pkt.readBoolean(); // multiSelected — idem
  const store = p.storeBag;
  const stone = store.getItemAt(0);
  const item = store.getItemAt(1);
  if (!stone || !item || stone.Count <= 0) return p.sendMessage(0, ctx.lang.t("ItemAdvanceHandler.Msg1"));
  const oldLevel = item.StrengthenLevel;
  if (oldLevel >= 15) return p.sendMessage(0, ctx.lang.t("ItemAdvanceHandler.Msg2"));
  if (!(item.template.CanStrengthen && item.template.CategoryID < 18 && item.Count === 1)) {
    // C#: só chat, sem `return` — cai no `UpdatePlayerProperties()` do fim do método (ver abaixo).
    p.sendMessage(0, `${ctx.lang.t("ItemStrengthenHandler.Content1")}${stone.template.Name}${ctx.lang.t("ItemStrengthenHandler.Content2")}`);
    p.updatePlayerProperties();
    return;
  }
  if (stone.TemplateID !== EXALT_ROCK) return p.sendMessage(0, ctx.lang.t("ItemAdvanceHandler.Msg3"));

  const stoneExp = stone.template.Property2 < 10 ? 10 : stone.template.Property2;
  const isBinds = item.IsBinds || stone.IsBinds;
  const rateAdvance = ctx.templates.cfgInt("RateAdvance", 50000);
  const roll = Math.floor(rnd() * rateAdvance);
  // Bug original replicado: `item.StrengthenExp / oldLevel` com os dois como int trunca ANTES de virar double.
  const probability = oldLevel > 0 ? Math.trunc(item.StrengthenExp / oldLevel) : 0;

  const original = item;
  let current = item;
  let leveledUp = false;
  const out = new GSPacket(138, p.id);
  store.beginChanges();
  try {
    if (probability > roll) {
      current.IsBinds = isBinds;
      current.StrengthenLevel++;
      current.StrengthenExp = 0;
      out.writeByte(0);
      out.writeInt(stoneExp);
      leveledUp = true;
      const strengthenGoodsRow = ctx.templates.findStrengthenGoods(current.StrengthenLevel, current.TemplateID);
      if (strengthenGoodsRow && current.template.CategoryID === 7 && strengthenGoodsRow.GainEquip > current.TemplateID) {
        const newTemplate = ctx.templates.findItem(strengthenGoodsRow.GainEquip);
        if (newTemplate) current = ItemInfo.cloneFromTemplate(newTemplate, current);
      }
    } else {
      current.StrengthenExp += stoneExp;
      out.writeByte(1);
      out.writeInt(stoneExp);
    }
    store.removeCountFromStack(stone, 1);
    if (current !== original) {
      store.takeOutItem(original);
      store.addItemTo(current, 1);
      original.IsExist = false;
      original.isDirty = true;
    } else {
      store.updateItem(current);
    }
  } finally {
    store.commitChanges();
  }
  p.send(out);
  if (leveledUp && current.ItemID > 0) {
    const zone = ctx.templates.server?.ZoneName ?? "";
    const msg = ctx.lang.t("ItemStrengthenHandler.congratulation2", zone, p.info.NickName, current.TemplateID, current.StrengthenLevel - 12);
    const notice = Out.message(2, msg);
    for (const onlinePlayer of ctx.world.all()) onlinePlayer.send(notice);
  }
  p.updatePlayerProperties();
}
