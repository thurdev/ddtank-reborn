/**
 * Aba no jogo: Bolsa — organizar automaticamente (compactar slots e, se pedido, empilhar itens iguais).
 * Pacote: 124 CHANGE_PLACE_GOODS_ALL. Só age se `count` bater com a quantidade de itens da bolsa (anti-cheat
 * básico contra o cliente mandar um valor inventado).
 * C#: `ArrangeBagHandler.cs`.
 * Como testar: sem teste dedicado hoje. Manual: Bolsa → botão de organizar.
 */
import type { GamePlayer } from "../../game/player.js";
import type { HandlerRegistry } from "../registry.js";

/** ArrangeBagHandler.cs (124): compact the bag (and stack when `merge`). Only if `count` matches the item count. */
export function arrangeBag(p: GamePlayer, merge: boolean, count: number, bagType: number): void {
  const inv = p.getInventory(bagType);
  if (!inv) return;
  const items = () => inv.getItems(inv.beginSlot, inv.capacity - 1);
  if (count !== items().length) return;
  const compact = () => {
    const list = items();
    for (let i = 1; i <= list.length; i++) {
      const last = list[list.length - i]!;
      const empty = inv.findFirstEmptySlot(inv.beginSlot);
      if (empty === -1 || empty >= last.Place) break;
      inv.moveItem(last.Place, empty, last.Count);
    }
  };
  inv.beginChanges();
  try {
    compact();
    if (merge) {
      const list = items();
      const used = new Set<number>();
      for (let j = 0; j < list.length; j++) {
        if (used.has(j)) continue;
        for (let k = list.length - 1; k > j; k--) {
          const a = list[j]!, b = list[k]!;
          if (!used.has(k) && a.TemplateID === b.TemplateID && a.canStackedTo(b) && a.Count + b.Count <= a.template.MaxCount) {
            inv.moveItem(b.Place, a.Place, b.Count);
            used.add(k);
          }
        }
      }
      compact();
    }
  } finally {
    inv.commitChanges();
  }
}

export function registerOrganizarBolsa(r: HandlerRegistry): void {
  r.player(124, "CHANGE_PLACE_GOODS_ALL", (_ctx, p, pkt) => {
    const merge = pkt.readBoolean();
    const count = pkt.readInt();
    const bagType = pkt.readInt();
    arrangeBag(p, merge, count, bagType);
  });
}
