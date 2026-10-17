/**
 * Aba no jogo: Loja — baú rápido (comprar + abrir `num` caixas de ouro em 1 pacote só).
 * Pacote: 126 BUY_QUICK_GOLDBOX. Paga em Money (MoneyDirect — vinculado primeiro, igual ao helper
 * comentado em pets.ts). Só o resultado em Ouro é aplicado — o original restringe o resultado de
 * `ItemBoxMgr.CreateItemBox` ao `out`-param `gold` e descarta qualquer outra moeda/item que ele geraria.
 * C#: `QuickBuyGoldBoxHandler.cs:286`.
 * Como testar: sem teste automatizado dedicado hoje. Manual: Loja → baú rápido.
 */
import type { HandlerRegistry } from "../registry.js";
import { bagLocked } from "../bolsa/senha-da-bolsa.js";
import { createItemBox } from "../bolsa/abrir-caixa.js";

export function registerBauRapidoOuro(r: HandlerRegistry): void {
  r.player(126, "BUY_QUICK_GOLDBOX", (ctx, p, pkt) => {
    const num = pkt.readInt();
    pkt.readBoolean();
    if (bagLocked(ctx, p)) return;
    const shop = ctx.templates.shop.get(1123301);
    if (!shop) return;
    const value = num * shop.AValue1;
    if (value > p.info.Money + p.info.MoneyLock) return;
    p.removeMoney(value);
    const rows = ctx.templates.itemBoxes.get(shop.TemplateID);
    let gold = 0;
    for (let i = 0; i < num; i++) gold += createItemBox(rows)?.gold ?? 0;
    if (gold > 0) {
      p.addGold(gold);
      p.sendMessage(0, ctx.lang.t("QuickBuyGoldBoxHandler.Notice", gold));
    }
  });
}
