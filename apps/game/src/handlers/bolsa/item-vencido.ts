/**
 * Aba no jogo: Bolsa — vencimento de item alugado/temporário (o cliente avisa quando um item expira).
 * Pacote: 77 ITEM_OVERDUE.
 * C#: `ItemOverdueHandler.cs:328` — não funciona durante uma partida. Um slot < 30 do EquipBag move o item
 * morto pra fora da área equipável (slot 31+, ou 81+ pra avatar/skin); sem espaço vai pro correio (mesmo
 * caminho de `pegar-item-temporario.ts`). Em qualquer outra bolsa só regrava o item como está.
 * Como testar: sem teste dedicado hoje. Manual: item alugado vence equipado → sai sozinho do slot.
 *
 * Como lê esse código (cada variável):
 * - bagType/place: onde o cliente diz que está o item vencido.
 * - item: só segue se ele realmente não é mais válido (isValidItem==false) — paranoia contra o cliente mentir.
 * - slot: destino livre fora da área "equipável" (31..80, ou 81+ pra skins/avatar).
 */
import { isAvatar, BagType } from "../../game/item.js";
import type { HandlerRegistry } from "../registry.js";
import { mailItems } from "./correio-excedente.js";

export function registerItemVencido(r: HandlerRegistry): void {
  r.player(77, "ITEM_OVERDUE", async (ctx, p, pkt) => {
    if (p.currentRoom?.IsPlaying) return;
    const bagType = pkt.readByte();
    const place = pkt.readInt();
    const inv = p.getInventory(bagType);
    const item = inv?.getItemAt(place);
    if (!inv || !item || item.isValidItem(ctx.now())) return;
    if (bagType === BagType.EquipBag && place < 30) {
      let slot = inv.findFirstEmptySlotIn(inv.beginSlot, 80);
      if (isAvatar(item.template)) slot = inv.findFirstEmptySlot(81);
      if (slot === -1 || !inv.moveItem(item.Place, slot, item.Count)) {
        await mailItems(ctx, p, [item], ctx.lang.t("ItemOverdueHandler.Title"), 9 /* eMailType.ItemOverdue */);
      }
    } else {
      inv.updateItem(item);
    }
  });
}
