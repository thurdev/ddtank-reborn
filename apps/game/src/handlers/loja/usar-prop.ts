/**
 * Aba no jogo: Bolsa de props — consumir N unidades de um prop de um slot (fora de luta).
 * Pacote: 66 PROP_USE. Um switch por templateId dentro de um loop genérico "use N props deste slot":
 * 11963 dá GiftToken 1..999; 201316 ativa o mesmo estado de ACTIVITY_PACKAGE.
 * C#: `PropUseHandler.cs:152`. Valida o pacote inteiro e a posse antes de consumir: o original aceitava
 * template forjado e quantidades maiores que a pilha (`vendor/DDTank41/Game.Server/Packets/Client/
 * PropUseHandler.cs:25-54`).
 * Como testar: sem teste automatizado dedicado hoje. Manual: usar prop 11963 (bilhete) da bolsa.
 */
import type { HandlerRegistry } from "../registry.js";
import { bagLocked } from "../bolsa/senha-da-bolsa.js";
import { activateChickItem } from "../eventos/ativacao-pintinho.js";

export function registerUsarProp(r: HandlerRegistry): void {
  r.player(66, "PROP_USE", async (ctx, p, pkt) => {
    const bagType = pkt.readInt(); // eBageType as a 4-byte int here, unlike most other handlers (PropUseHandler.cs:157)
    const place = pkt.readInt();
    const inv = p.getInventory(bagType);
    const prop = inv?.getItemAt(place);
    const count = pkt.readInt();
    if (bagLocked(ctx, p) || !inv || !prop || !prop.IsExist || !prop.isValidItem(ctx.now()) ||
        count <= 0 || count > prop.Count || pkt.length - pkt.offset !== count * 4 + 5) return;
    for (let i = 0; i < count; i++) if (pkt.readInt() !== prop.TemplateID) return;
    pkt.readInt(); // payType (não usado pelo original)
    pkt.readBoolean();
    if (prop.TemplateID === 201316) {
      await activateChickItem(ctx, p, inv, prop);
    } else if (prop.TemplateID === 11963) {
      if (!inv.removeCountFromStack(prop, count)) return;
      for (let i = 0; i < count; i++) {
          const token = 1 + Math.floor(Math.random() * 999); // rand.Next(1, 1000)
          p.addGiftToken(token);
          p.sendMessage(0, ctx.lang.t("PropUseHandler.GiftToken", token));
      }
    }
  });
}
