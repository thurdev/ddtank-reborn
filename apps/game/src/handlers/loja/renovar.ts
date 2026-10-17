/**
 * Aba no jogo: Loja — renovar a validade de um item alugado/temporário, pagando o preço de loja dele
 * (mesma tripla de tier A/B/C que `comprar.ts`). O item precisa ser um slot temporizado do EquipBag
 * (>= 31), PropBag ou StoreBag.
 * Pacote: 62 ITEM_CONTINUE.
 * C#: `UserItemContineueHandler.cs`.
 * Como testar: sem teste automatizado dedicado hoje. Manual: `docs/features/loja.md` tabela de ações.
 *
 * Como lê esse código (cada variável):
 * - count: quantas renovações o pacote pede; bagType/place/shopId/type: onde está o item,
 *   qual linha da loja paga, qual tripla A/B/C.
 * - need/totals: custo (itens + moedas) calculado por setItemType.
 * - validDate/count0/wasValid: backup pra restaurar se faltar dinheiro; item expirado
 *   renascido ganha BeginDate nova (soma em cima se ainda válido).
 */
import { BagType } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import { GSPacket } from "@ddt/protocol";
import type { HandlerRegistry } from "../registry.js";
import type { ServerContext } from "../../session/context.js";
import { bagLocked } from "../bolsa/senha-da-bolsa.js";
import { type PriceTotals, setItemType } from "./preco.js";

export async function itemContinue(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (bagLocked(ctx, p)) return;
  const count = pkt.readInt();
  for (let i = 0; i < count; i++) {
    const bagType = pkt.readByte();
    const place = pkt.readInt();
    const shopId = pkt.readInt();
    const type = pkt.readByte();
    pkt.readBoolean();
    if (!((bagType === BagType.EquipBag && place >= 31) || bagType === BagType.PropBag || bagType === BagType.Store)) {
      p.sendMessage(0, "Não é possível renovar");
      continue;
    }
    const bag = p.getInventory(bagType);
    const item = bag?.getItemAt(place);
    if (!bag || !item || item.ValidDate === 0) { p.sendMessage(0, "Este item não pode ser renovado"); continue; }
    const shop = ctx.templates.shop.get(shopId);
    if (!shop || shop.TemplateID !== item.TemplateID) {
      p.sendMessage(0, "Trapaça detectada pelo sistema. Isto será enviado à administração para análise.");
      return; // the original's loop can only exit (via `break`) on this exact mismatch
    }
    const totals: PriceTotals = { gold: 0, money: 0, offer: 0, gifttoken: 0, petScore: 0, score: 0, dmgScore: 0 };
    const need = setItemType(shop, type, totals);
    const validDate = item.ValidDate, count0 = item.Count, wasValid = item.isValidItem(ctx.now());
    let ok = true;
    for (let j = 0; j < need.length; j += 2) if (p.getTemplateCount(need[j]!, ctx.templates.findItem) < need[j + 1]!) ok = false;
    if (!ok) return p.sendMessage(1, ctx.lang.t("UserBuyItemHandler.NoBuyItem"));
    const c = p.info;
    if (totals.gold <= c.Gold && totals.money <= c.Money + c.MoneyLock && totals.offer <= c.Offer && totals.gifttoken <= c.GiftToken && totals.petScore <= c.petScore && totals.score <= c.Score) {
      p.removeMoney(totals.money); p.removeGold(totals.gold); p.removeOffer(totals.offer); p.removeGiftToken(totals.gifttoken);
      p.removePetScore(totals.petScore); p.removeScore(totals.score);
      for (let j = 0; j < need.length; j += 2) p.removeTemplateInShop(need[j]!, need[j + 1]!, ctx.templates.findItem);
      const unit = type === 1 ? shop.AUnit : type === 2 ? shop.BUnit : type === 3 ? shop.CUnit : 0;
      item.ValidDate = unit;
      if (!wasValid) { item.BeginDate = ctx.now(); item.IsUsed = false; }
      else item.ValidDate += validDate;
      item.IsBinds = true;
      bag.updateItem(item);
      p.sendMessage(0, ctx.lang.t("UserItemContineueHandler.Success"));
    } else {
      item.ValidDate = validDate;
      item.Count = count0;
      p.sendMessage(0, ctx.lang.t("UserItemContineueHandler.NoMoney"));
    }
  }
}

export function registerRenovar(r: HandlerRegistry): void {
  r.player(62, "ITEM_CONTINUE", (ctx, p, pkt) => itemContinue(ctx, p, pkt));
}
