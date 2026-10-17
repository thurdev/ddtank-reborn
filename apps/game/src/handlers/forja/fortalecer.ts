/**
 * Aba no jogo: Forja › Ferraria › Fortalecer. Jogador coloca o equipamento no slot 5 da bancada
 * + 1-3 pedras de força (slots 0-2) + opcional pedra da sorte (4) e símbolo divino (3), e tenta
 * subir o `StrengthenLevel` (o "+N" do item).
 * Pacotes: 59 ITEM_STRENGTHEN.
 * C#: `ItemStrengthenHandler.cs` (chance em `StrengthenMgr.cs:29` `RateItems`/`VIPStrengthenEx`).
 * Como testar: `formulas.test.ts` (`strengthenChance`, fórmula pura). Manual: Forja → Ferraria →
 * Fortalecer → arrastar arma + pedra(s) → clicar fortalecer → nível "+N" sobe ou a arma quebra/regride.
 */
import { GSPacket } from "@ddt/protocol";
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { getEquipControl } from "../../db/consortia.js";
import { personalRiches, smithBonusLevel } from "../../game/consortia.js";
import { pushRecords } from "../eventos/completar-conquista.js";
import { FORGE_SLOT, STRENGTHEN_STONE_SLOTS, forgeAutoArrange, installFusionAutoSplitHook, isWarrior } from "./bancada.js";

/** StrengthenMgr.RateItems (StrengthenMgr.cs:29): rate per strengthen stone level 1..6. */
export const STRENGTHEN_RATE_ITEMS = [0.75, 3.0, 12.0, 48.0, 240.0, 768.0];
/** StrengthenMgr.VIPStrengthenEx. */
export const VIP_STRENGTHEN_EX = 0.3;

export interface StrengthenRateInput {
  stoneLevels: number[];
  /** Luck stone Property2 (null = no luck stone). */
  luckP2: number | null;
  needRate: number;
  smithLevel: number;
  vip: boolean;
}

/**
 * Calcula chance de reforço no jogo: soma força das pedras + bônus sorte/guilda/VIP e compara com sorteio 0-9999.
 * Contrapartida C#: `ItemStrengthenHandler.cs:41-112` (`StrengthenMgr.RateItems`, `VIPStrengthenEx`).
 * Pacote: não lê/responde pacote direto; usado por `strengthen` (59 ITEM_STRENGTHEN), que responde `GSPacket(59)`
 * com `[byte resultado, boolean sucesso]` (`0`=sucesso, `1`=falha).
 * Exemplo concreto: pedras nível `[2,2]`, `needRate=100`, sem sorte/guilda/VIP → `(3+3)*100/100=600`, `total=60000`
 * (sempre sucesso pois `60000 > roll` em `0..9999`); sem pedra e `needRate>0` → `total=0` (sempre falha).
 */
export function strengthenChance(i: StrengthenRateInput): number {
  let probability = 0;
  for (const lv of i.stoneLevels) probability += STRENGTHEN_RATE_ITEMS[lv - 1] ?? 0;
  const luck = i.luckP2 == null ? 0 : probability + Math.trunc(i.luckP2 / 100);
  const need = i.needRate;
  const num5 = (probability * 100) / need;
  const num6 = (luck * 100) / need;
  const guild = i.smithLevel > 0 ? num5 * (0.1 * i.smithLevel) : 0;
  const vip = i.vip ? VIP_STRENGTHEN_EX * num5 : 0;
  const total = Math.floor((num5 + num6 + guild + vip) * 100);
  return Number.isFinite(total) ? total : 1_000_000;
}

/**
 * Bônus de ferreiro da guilda no jogo: +10% por nível na taxa de reforço/composição quando há permissão e riqueza.
 * Contrapartida C#: `ItemStrengthenHandler.cs:88-103` (`Equip_Control` tipo 2, `smithBonusLevel`, `personalRiches`).
 * Pacote: não lê/responde pacote; recebe `useGuild` (byte boolean lido pelo chamador) e retorna nível (0 = sem bônus).
 * Exemplo concreto: `useGuild=true`, guilda com permissão e `SmithLevel=2` → retorna `2` (+20%); sem guilda e negado → mensagem exata `"ItemStrengthenHandler.FailbyPermission"` e nível 0.
 */
async function guildSmith(ctx: ServerContext, p: GamePlayer, useGuild: boolean): Promise<number> {
  if (!useGuild) return 0;
  const equipControl = p.info.ConsortiaID ? await getEquipControl(ctx.db.db, p.info.ConsortiaID, 0, 2) : undefined;
  const smithBonus = smithBonusLevel(true, p.info.ConsortiaID !== 0, p.info.SmithLevel, personalRiches(p.info), equipControl);
  if (smithBonus.denied) p.sendMessage(p.info.ConsortiaID ? 1 : 0, ctx.lang.t(p.info.ConsortiaID ? "ItemStrengthenHandler.FailbyPermission" : "ItemStrengthenHandler.Fail"));
  return smithBonus.level;
}

/**
 * Reforço no jogo: sobe `StrengthenLevel` do equipamento do slot 5 da bancada consumindo pedras dos slots 0-2.
 * Contrapartida C#: `ItemStrengthenHandler.cs` (pacote 59 ITEM_STRENGTHEN).
 * Pacote que lê: `boolean useGuild` (usa bônus de ferreiro da guilda). Resposta `GSPacket(59)`: `[byte resultado, boolean sucesso]` (`0`+`true`=sucesso, `1`+`false`=falha).
 * Exemplo concreto: espada `+3` no slot 5 + 2 pedras nível 2 nos slots 0-1 → consome 1 unidade de cada pedra, sorteia `chance > roll(0-9999)`; sucesso vira `+4`, falha sem pedra divina quebra ou regride item nível 3.
 * Como lê esse código (cada variável):
 * - `useGuild`: `boolean` lido do pacote; `true` = aplica bônus de ferreiro da guilda via `guildSmith`.
 * - `store`: bancada da forja (`p.storeBag`, bag 12); slots 0-2 pedras, 3 divina, 4 sorte, 5 equipamento.
 * - `item`: equipamento em `store.getItemAt(5)`; contém `template.CanStrengthen`, `Count`, `StrengthenLevel`, `IsBinds`.
 * - `stones`: pedras de reforço (`CategoryID===11` e `Property1===2|35`) coletadas dos slots 0-2.
 * - `luckCandidate`: item cru do slot 4; `luckStone`: pedra da sorte validada (`CategoryID===11`, `Property1===3`) ou `null`.
 * - `godCandidate`: item cru do slot 3; `godStone`: pedra divina validada (`CategoryID===11`, `Property1===7`) ou `null` (sem ela, falha quebra/regride).
 * - `needRate`: exigência da tabela `strengthenNeedRate(StrengthenLevel, CategoryID)`; denominador da chance.
 * - `smith`: nível de ferreiro da guilda retornado por `guildSmith` (0 = sem bônus).
 * - `chance`: número de `strengthenChance(...)` comparado com `roll`; sucesso quando `chance > roll`.
 * - `original`: referência ao `item` antes de possível troca de `TemplateID` (arma re-templada vira outra linha).
 * - `isBinds`: `true` quando equipamento, pedras, sorte ou divina têm `IsBinds`; resultado herda amarração.
 * - `out`: `GSPacket(59, p.id)` de resposta com `[byte, boolean]`.
 * - `roll`: sorteio `Math.floor(rnd()*10000)` (conta guerreira `isWarrior` força `0` = sucesso garantido).
 * - `strengthenGoodsRow`: linha de `findStrengthenGoods/findRealStrengthenGoods` com `GainEquip` (evolução/devolução da arma).
 * - `newTemplate`: novo `ItemTemplate` de `strengthenGoodsRow.GainEquip` usado em `ItemInfo.cloneFromTemplate`.
 */
export async function strengthen(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd = Math.random): Promise<void> {
  const useGuild = pkt.readBoolean();
  const store = p.storeBag;
  installFusionAutoSplitHook(p); // auto-split Reborn: pilha num slot só vira 1 pedra em cada slot 0-2 antes de calcular
  forgeAutoArrange(store);
  let item = store.getItemAt(FORGE_SLOT.strengthenItem);
  if (!item || !item.template.CanStrengthen || item.Count !== 1) return p.sendMessage(0, ctx.lang.t("ItemStrengthenHandler.Success"));
  const stones: ItemInfo[] = [];
  for (const slot of STRENGTHEN_STONE_SLOTS) {
    const stone = store.getItemAt(slot);
    if (stone && stone.template.CategoryID === 11 && (stone.template.Property1 === 2 || stone.template.Property1 === 35)) stones.push(stone);
  }
  const luckCandidate = store.getItemAt(FORGE_SLOT.strengthenLuck);
  const luckStone = luckCandidate && luckCandidate.template.CategoryID === 11 && luckCandidate.template.Property1 === 3 ? luckCandidate : null;
  const godCandidate = store.getItemAt(FORGE_SLOT.strengthenGodStone);
  const godStone = godCandidate && godCandidate.template.CategoryID === 11 && godCandidate.template.Property1 === 7 ? godCandidate : null;
  if (stones.length < 1) return p.sendMessage(0, `${ctx.lang.t("ItemStrengthenHandler.Content1")}1${ctx.lang.t("ItemStrengthenHandler.Content2")}`);
  const needRate = ctx.templates.strengthenNeedRate(item.StrengthenLevel, item.template.CategoryID);
  if (!ctx.templates.strengthen.has(item.StrengthenLevel + 1)) return p.sendMessage(0, ctx.lang.t("ItemStrengthenHandler.Success"));
  // ItemStrengthenHandler.cs:88-103: guild smith +10 %/level of the stone rate when personal riches >= Equip_Control Type 2
  const smith = await guildSmith(ctx, p, useGuild);
  const chance = strengthenChance({ stoneLevels: stones.map((stone) => stone.template.Level), luckP2: luckStone ? luckStone.template.Property2 : null, needRate, smithLevel: smith, vip: p.info.typeVIP > 0 });
  const original = item;
  const isBinds = item.IsBinds || stones.some((stone) => stone.IsBinds) || !!luckStone?.IsBinds || !!godStone?.IsBinds;
  item.StrengthenTimes++;
  item.IsBinds = isBinds;
  // StoreBag.ClearBag(): the stones, luck and god stone in the workbench are consumed (whole slots, like the C#).
  store.beginChanges();
  const out = new GSPacket(59, p.id);
  try {
    // C# StoreBag.ClearBag() destroys the whole workbench (every stacked stone). Port: one unit per used slot
    // (stones 0..2, luck 4, god 3) — the success rate never depended on the stack size; the item leaves slot 5.
    for (const ingredient of [...stones, luckStone, godStone]) if (ingredient) store.removeCountFromStack(ingredient, 1);
    store.takeOutItem(item);
    item.IsExist = true;
    const roll = isWarrior(p) ? 0 : Math.floor(rnd() * 10000);
    if (chance > roll) {
      out.writeByte(0); out.writeBoolean(true);
      item.StrengthenLevel++;
      const strengthenGoodsRow = ctx.templates.findStrengthenGoods(item.StrengthenLevel, item.TemplateID);
      if (strengthenGoodsRow && item.template.CategoryID === 7 && strengthenGoodsRow.GainEquip > item.TemplateID) {
        const newTemplate = ctx.templates.findItem(strengthenGoodsRow.GainEquip);
        if (newTemplate) item = ItemInfo.cloneFromTemplate(newTemplate, item);
      }
      item.openHole();
      store.addItemTo(item, FORGE_SLOT.strengthenItem);
      p.questInv?.onItemStrengthen(item.template.CategoryID, item.StrengthenLevel);
      pushRecords(p, new Map([[32, 1]])); // AchievementCondition type 32 ItemStrengthenCondition: successful-strengthen counter
    } else {
      out.writeByte(1); out.writeBoolean(false);
      if (!godStone) {
        if (item.template.Level === 3) {
          item.StrengthenLevel = item.StrengthenLevel < 5 ? item.StrengthenLevel : item.StrengthenLevel - 1;
          const strengthenGoodsRow = ctx.templates.findRealStrengthenGoods(item.StrengthenLevel, item.TemplateID);
          if (strengthenGoodsRow && item.template.CategoryID === 7 && item.TemplateID !== strengthenGoodsRow.GainEquip) {
            const newTemplate = ctx.templates.findItem(strengthenGoodsRow.GainEquip);
            if (newTemplate) item = ItemInfo.cloneFromTemplate(newTemplate, item);
          }
          store.addItemTo(item, FORGE_SLOT.strengthenItem);
        } else {
          // C#: Count-- and puts the 0-count item back; port: the item is destroyed (removed from the bag).
          item.Count--;
          if (item.Count > 0) store.addItemTo(item, 5);
          else { item.IsExist = false; item.RemoveType = 14; item.isDirty = true; }
        }
      } else store.addItemTo(item, FORGE_SLOT.strengthenItem);
      item.openHole();
    }
    if (item !== original) { original.IsExist = false; original.isDirty = true; } // re-templated weapon: old row deleted
  } finally {
    store.commitChanges();
  }
  p.send(out);
  p.updatePlayerProperties();
}
