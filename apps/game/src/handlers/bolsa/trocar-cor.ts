/**
 * Aba no jogo: Bolsa/Equipamento — trocar a cor de um equipamento usando item da bolsa ou pagando Money.
 * Pacote: 182 USE_COLOR_CARD.
 * C#: `UserChangeItemColorHandler.cs`.
 * Como testar: sem teste dedicado hoje. Manual: equipamento → trocar cor usando cartão ou dinheiro.
 */
import type { HandlerRegistry } from "../registry.js";

export function registerTrocarCor(r: HandlerRegistry): void {
  /** UserChangeItemColorHandler.cs (182 USE_COLOR_CARD): recolor an equip slot using a PropBag color item, or Money. */
  r.player(182, "USE_COLOR_CARD", (ctx, p, pkt) => {
    pkt.readInt();
    const propSlot = pkt.readInt();
    pkt.readInt();
    const equipSlot = pkt.readInt();
    const color = pkt.readString();
    const skin = pkt.readString();
    const templateId = pkt.readInt();
    const item = p.equipBag.getItemAt(equipSlot);
    if (!item) return;
    const colorItem = p.propBag.getItemAt(propSlot);
    let ok = false;
    if (colorItem?.isValidItem(ctx.now())) { p.propBag.removeCountFromStack(colorItem, 1); ok = true; }
    else {
      const price = ctx.templates.shopByTemplate(templateId).find((s) => s.APrice1 === -1 && s.AValue1 !== 0)?.AValue1 ?? 0;
      if (price <= p.info.Money + p.info.MoneyLock) { p.removeMoney(price); ok = true; }
    }
    if (ok) {
      item.Color = color ?? "";
      item.Skin = skin ?? "";
      p.equipBag.updateItem(item);
    }
    p.sendMessage(0, ctx.lang.t("UserChangeItemColorHandler.Success"));
  });
}
