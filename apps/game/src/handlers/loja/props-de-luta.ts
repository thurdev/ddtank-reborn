/**
 * Aba no jogo: Loja de props de combate (granada, mina...) — comprar direto pra mochila de luta (FightBag)
 * e vender de volta. Sistema separado da loja principal (`comprar.ts`): não compartilha nada com a
 * `getItemPrice`/`setItemType` de `preco.ts` (que porta `ItemInfo.SetItemType`, `SqlDataProvider/Data/
 * ItemInfo.cs:1251`) porque `PropBuyHandler`/`PropSellHandler` chamam `Bussiness.Managers.ShopMgr.
 * SetItemType` — uma SEGUNDA tabela de código de preço, numerada diferente (ver `shopItemPrice` abaixo).
 * Os dois sistemas existem lado a lado no `vendor/DDTank41` original; este arquivo espelha o do ShopMgr.
 * Pacotes: 54 PROP_BUY, 55 PROP_SELL.
 * C#: `PropBuyHandler.cs:11`, `PropSellHandler.cs:11`.
 * Como testar: sem teste automatizado dedicado hoje. Manual: `docs/features/loja.md`.
 *
 * Como lê esse código (cada variável, visão geral do arquivo):
 * - ShopCurrencies: os 11 "baldes" de moeda que ShopMgr.GetItemPrice pode somar (gold/money/offer/giftToken/medal/
 *   damageScore/petScore/hardCurrency/leagueMoney/useableScore/honor) — a maioria fica em 0 pros itens daqui.
 * - PROP_FIGHT_BAG: lista fixa de templates 10001-10022 (PropItemMgr.PropFightBag) — só esses podem ir pro FightBag.
 */
import { ItemInfo } from "../../game/item.js";
import type { ShopItemInfo } from "../../db/templates.js";
import type { HandlerRegistry } from "../registry.js";
import { bagLocked } from "../bolsa/senha-da-bolsa.js";

/** PropItemMgr.PropFightBag (Game.Logic/PropItemMgr.cs:46-68): the only templates PROP_BUY/PROP_SELL accept. */
const PROP_FIGHT_BAG = new Set<number>(Array.from({ length: 22 }, (_, i) => 10001 + i));

export interface ShopCurrencies {
  gold: number; money: number; offer: number; giftToken: number; medal: number; damageScore: number;
  petScore: number; hardCurrency: number; leagueMoney: number; useableScore: number; honor: number;
}
function newShopCurrencies(): ShopCurrencies {
  return { gold: 0, money: 0, offer: 0, giftToken: 0, medal: 0, damageScore: 0, petScore: 0, hardCurrency: 0, leagueMoney: 0, useableScore: 0, honor: 0 };
}

/** ShopMgr.GetItemPrice (Bussiness/Managers/ShopMgr.cs:232) — a price-code table distinct from loja/preco.ts's
 * getItemPrice (ItemInfo.cs:1023): note -2/-3 are swapped (offer/gold) compared to that other table. */
function shopItemPrice(price: number, value: number, beat: number, t: ShopCurrencies): void {
  const v = Math.trunc(value * beat);
  switch (price) {
    case -1200: t.useableScore += v; return;
    case -1000: t.leagueMoney += v; return;
    case -900: t.hardCurrency += v; return;
    case -8: t.petScore += v; return;
    case -7: t.damageScore += v; return;
    case -6: t.medal += v; return;
    case -300: t.medal += v; return;
    case -4: t.giftToken += v; return;
    case -3: t.gold += v; return;
    case -2: t.offer += v; return;
    case -1: t.money += v; return;
    case -800: t.honor += v; return;
  }
}

/** ShopMgr.SetItemType (ShopMgr.cs:418), tier A only — the only tier PropBuy/PropSell/QuickBuyGoldBox ever pass (num=1). */
function shopTierA(shop: ShopItemInfo, t: ShopCurrencies): void {
  shopItemPrice(shop.APrice1, shop.AValue1, shop.Beat, t);
  shopItemPrice(shop.APrice2, shop.AValue2, shop.Beat, t);
  shopItemPrice(shop.APrice3, shop.AValue3, shop.Beat, t);
}

export function registerPropsDeLuta(r: HandlerRegistry): void {
  /**
   * PropBuyHandler.cs:11 (54 PROP_BUY): buy one fight-prop straight into the FightBag (3 slots). Original bug kept
   * as-is: `shopItemInfoById` can be undefined for a bad id — guarded here instead of crashing.
   *
   * Como lê esse código (cada variável):
   * - id: linha da Shop_Goods comprada. shop/t: a linha e o ItemTemplate dela.
   * - c: custo total nas 11 moedas do ShopMgr (normalmente só `gold` é != 0 pra prop de luta).
   */
  r.player(54, "PROP_BUY", (ctx, p, pkt) => {
    const id = pkt.readInt();
    const shop = ctx.templates.shop.get(id);
    if (!shop || !PROP_FIGHT_BAG.has(shop.TemplateID)) return;
    const t = ctx.templates.findItem(shop.TemplateID);
    if (!t || t.CategoryID !== 10) return; // PropBuyHandler.cs:39 (ItemTemplateInfo.CategoryID == 10)
    const c = newShopCurrencies();
    shopTierA(shop, c);
    if ((c.money > 0 || c.offer > 0 || c.giftToken > 0 || c.medal > 0) && bagLocked(ctx, p)) return;
    if (!(c.gold <= p.info.Gold && c.money <= Math.max(p.info.Money, 0) && c.offer <= p.info.Offer && c.giftToken <= p.info.GiftToken && c.medal <= p.medal)) {
      return p.sendMessage(1, ctx.lang.t("PropBuyHandler.NoMoney"));
    }
    const item = ItemInfo.createFromTemplate(t, 1, 102, ctx.now());
    if (shop.BuyType === 0) item.ValidDate = shop.AUnit;
    else item.Count = shop.AUnit;
    if (!p.fightBag.addItem(item, 0)) return; // bag full: nothing is charged, like the original
    p.removeGold(c.gold);
    p.removeMoney(c.money);
    p.removeOffer(c.offer);
    p.removeGiftToken(c.giftToken);
    p.removeMedal(c.medal);
    // RemovemyHonor(honor) has no port — PropFightBag items are never priced in honor, so c.honor stays 0.
  });

  /** PropSellHandler.cs:11 (55 PROP_SELL): devolve a prop por ouro. O ID de loja precisa corresponder ao item;
   * aceitar qualquer ID do cliente permitia vender uma prop barata pelo preço de outro produto. */
  r.player(55, "PROP_SELL", (ctx, p, pkt) => {
    const slot = pkt.readInt();
    const id = pkt.readInt();
    const item = p.fightBag.getItemAt(slot);
    const shop = ctx.templates.shop.get(id);
    if (!item || !shop || shop.TemplateID !== item.TemplateID || !PROP_FIGHT_BAG.has(item.TemplateID)) return;
    const c = newShopCurrencies();
    shopTierA(shop, c);
    if (c.gold < 0 || !Number.isSafeInteger(c.gold)) return;
    if (!p.fightBag.removeItem(item)) return;
    p.addGold(c.gold);
  });
}
