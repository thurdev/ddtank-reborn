/**
 * Modelo de dados puro (sem pacote próprio) — tabela de preço da loja principal, usada por `comprar.ts`
 * (44 BUY_GOODS) e `renovar.ts` (62 ITEM_CONTINUE). Cada linha de `Shop_Goods` tem 3 "tiers" de preço
 * (A/B/C, cada um com até 3 moedas); essas funções traduzem o tier escolhido pro custo real em 7 moedas.
 * Distinta da tabela de preço de `props-de-luta.ts` (ShopMgr.SetItemType) — os dois sistemas de preço
 * existem lado a lado no original (ver cabeçalho de `props-de-luta.ts`).
 * C#: `ItemInfo.GetItemPrice`/`ItemInfo.SetItemType` (`SqlDataProvider/Data/ItemInfo.cs:1023`/`:1251`),
 * `ShopMgr.CanBuy` (`Bussiness/Managers/ShopMgr.cs:23`).
 * Como testar: `apps/game/test/handlers.test.ts` (`getItemPrice`/`setItemType`).
 */
import type { ShopItemInfo } from "../../db/templates.js";

export interface PriceTotals {
  gold: number; money: number; offer: number; gifttoken: number; petScore: number; score: number; dmgScore: number;
}

/**
 * ItemInfo.GetItemPrice (SqlDataProvider/Data/ItemInfo.cs:1023): price type -1 Money, -2 Gold, -3 Offer, -4 GiftToken,
 * -6 Score, -8 petScore, -9 damageScore; > 0 = required item template (value = count). Value * Beat, truncated.
 */
export function getItemPrice(price: number, value: number, beat: number, t: PriceTotals): { templateId: number; count: number } | null {
  const v = Math.trunc(value * beat);
  switch (price) {
    case -4: t.gifttoken += v; return null;
    case -3: t.offer += v; return null;
    case -2: t.gold += v; return null;
    case -1: t.money += v; return null;
    case -8: t.petScore += v; return null;
    case -6: t.score += v; return null;
    case -9: t.dmgScore += v; return null;
  }
  return price > 0 ? { templateId: price, count: value } : null;
}

/** ItemInfo.SetItemType (ItemInfo.cs:1251): tier 1/2/3 = A/B/C price triples. Returns [tpl, count, tpl, count...]. */
export function setItemType(s: ShopItemInfo, type: number, t: PriceTotals): number[] {
  const tier = type === 1 ? "A" : type === 2 ? "B" : type === 3 ? "C" : null;
  if (!tier) return [];
  const rec = s as unknown as Record<string, number>;
  const out: number[] = [];
  for (const i of [1, 2, 3]) {
    const r = getItemPrice(rec[`${tier}Price${i}`]!, rec[`${tier}Value${i}`]!, s.Beat, t);
    if (r && r.templateId > 0) out.push(r.templateId, r.count);
  }
  return out;
}

/** ShopMgr.CanBuy (Bussiness/Managers/ShopMgr.cs:23) — guild shops 11..15: `guild` = canBuyGuildShop() result (src/game/consortia.ts). */
export function canBuyShop(shopId: number, guild = false): { ok: boolean; isBinds: boolean } {
  if (shopId >= 1 && shopId <= 4) return { ok: true, isBinds: false };
  if (shopId === 20 || shopId === 72 || shopId === 91) return { ok: true, isBinds: true };
  if (shopId >= 11 && shopId <= 15) return { ok: guild, isBinds: true };
  return { ok: false, isBinds: true };
}
