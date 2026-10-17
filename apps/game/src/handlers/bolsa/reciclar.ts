/**
 * Aba no jogo: Bolsa — reciclar item (vender a pilha inteira por ouro ou cupom-presente).
 * Pacote: 127 REClAIM_GOODS.
 * C#: `ItemReclaimHandler.cs:12` — remove a pilha toda (comportamento original) mas só credita `count`.
 * Como testar: sem teste automatizado dedicado ainda. Manual: Bolsa → clicar com botão direito → Reciclar.
 */
import type { HandlerRegistry } from "../registry.js";
import { bagLocked } from "./senha-da-bolsa.js";

export function registerReciclar(r: HandlerRegistry): void {
  /** ItemReclaimHandler.cs:12 — removes the whole stack (original behaviour) but credits only `count`. */
  r.player(127, "REClAIM_GOODS", (ctx, p, pkt) => {
    const bag = p.getInventory(pkt.readByte());
    const place = pkt.readInt();
    let count = pkt.readInt();
    const it = bag?.getItemAt(place);
    if (!bag || !it) return p.sendMessage(0, ctx.lang.t("ItemReclaimHandler.NoSuccess"));
    if (bagLocked(ctx, p)) return;
    if (count <= 0) return; // port: reject non-positive counts
    if (it.Count <= count) count = it.Count;
    const t = it.template;
    const price = count * t.ReclaimValue;
    if (t.ReclaimType === 3) return p.sendMessage(0, "Este item não pode ser vendido.");
    if (t.ReclaimType === 2) {
      p.addGiftToken(price);
      p.sendMessage(0, ctx.lang.t("ItemReclaimHandler.Success1", price));
    } else if (t.ReclaimType === 1) {
      p.addGold(price);
      p.sendMessage(0, ctx.lang.t("ItemReclaimHandler.Success2", price));
    }
    bag.removeItemAt(place);
  });
}
