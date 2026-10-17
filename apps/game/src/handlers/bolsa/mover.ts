/**
 * Aba no jogo: Bolsa — arrastar item entre slots/bolsas (mover, empilhar, trocar, dividir pilha).
 * Pacote: 49 CHANGE_PLACE_GOODS.
 * C#: `UserChangeItemPlaceHandler.cs:19` (Store/Bank/Consortia helper paths simplificados pra moves diretos).
 * Como testar: `apps/game/test/handlers.test.ts` (describe de bolsa/itens), `apps/game/test/forge-persist.test.ts`.
 * Manual: arrastar item na Bolsa entre slots, pra bolsa do banco/guilda, split de pilha.
 */
import { isAvatar, BagType } from "../../game/item.js";
import { bankCapacity } from "../../game/consortia.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";

/** UserChangeItemPlaceHandler.cs:19 (Store/Bank/Consortia helper paths simplified to direct moves).
 *
 * Como lê esse código (cada variável):
 * - bag / toBag: bolsa origem e destino (PlayerInventory: prop=0, equip, banco, guilda, store...).
 *   Vêm de `player.getInventory(bagType)`; `toBag !== bag` = troca entre bolsas.
 * - place / toPlace: slot origem e destino. toPlace -1 = "primeiro slot livre".
 * - count: quantas unidades mover (0 = pilha toda; arrasto parcial manda o nº).
 * - item: o ItemInfo na origem (TemplateID=o quê, Count=quantas, Place=slot).
 * - cap: teto do banco da guilda = StoreLevel × 10 slots (sem guilda = 0, bloqueia).
 */
export function changeItemPlace(ctx: ServerContext, p: GamePlayer, bagType: number, place: number, toBagType: number, toPlace: number, count: number): void {
  const bag = p.getInventory(bagType);
  const toBag = p.getInventory(toBagType);
  if (!bag || !toBag) return;
  const item = bag.getItemAt(place);
  if (!item) return;
  if (count < 0 || count > item.Count) {
    p.sink.disconnect("item move count out of range"); // anti-dupe (UserChangeItemPlaceHandler.cs:41)
    return;
  }
  if (toPlace !== -1 && (toPlace < 0 || toPlace >= toBag.capacity)) return; // port: validate slot range
  if (toBagType === BagType.Consortia) {
    // guild bank: only for members, StoreLevel × 10 slots (ConsortiaBag capacity follows the bank level)
    const cap = p.info.ConsortiaID ? bankCapacity(p.info.StoreLevel) : 0;
    if (toPlace === -1 && bagType !== toBagType) toPlace = toBag.findFirstEmptySlotIn(0, cap);
    if (toPlace < 0 || toPlace >= cap) return p.sendMessage(1, ctx.lang.t("UserChangeItemPlaceHandler.full"));
  }
  bag.beginChanges();
  if (toBag !== bag) toBag.beginChanges();
  try {
    if (toBagType === BagType.EquipBag) {
      if (toBag.findFirstEmptySlot() === -1 && toPlace >= 31) return;
    } else if (toBag.findFirstEmptySlot() === -1) return;
    if (toPlace === -1) {
      let full = false;
      if (bagType === toBagType && toBagType === BagType.EquipBag) {
        let slot = toBag.findFirstEmptySlot(toBag.beginSlot);
        if (isAvatar(item.template)) slot = toBag.findFirstEmptySlot(81);
        if (!bag.moveItem(place, slot, count)) full = true;
      } else if (toBag.stackItemToAnother(item) || toBag.addItem(item)) bag.takeOutItem(item);
      else full = true;
      if (full) p.sendMessage(1, ctx.lang.t("UserChangeItemPlaceHandler.full"));
    } else if (bagType === toBagType) {
      if (toBagType === BagType.EquipBag && toPlace < bag.beginSlot) item.IsBinds = true;
      const at = bag.getItemAt(toPlace);
      if (at && toPlace >= bag.beginSlot) {
        // The C# re-targets a busy bag slot to the first free one (and stacking never happens here).
        let slot = toBag.findFirstEmptySlot(toBag.beginSlot);
        if (isAvatar(item.template)) slot = toBag.findFirstEmptySlot(81);
        if (at.canStackedTo(item)) slot = toPlace;
        bag.moveItem(place, slot, count);
      } else bag.moveItem(place, toPlace, count);
    } else {
      // Cross-bag (prop <-> bank/consortia/store): move or swap like MoveToBank/MoveFromBank.
      const to = toBag.getItemAt(toPlace);
      if (!to && count > 0 && count < item.Count) {
        // split part of a stack into the other bag (pet food / texp potion → StoreBag[0]); before, the whole stack moved
        const part = item.clone();
        part.ItemID = 0;
        part.Count = count;
        if (toBag.addItemTo(part, toPlace)) bag.removeCountFromStack(item, count);
      } else if (!to) {
        if (toBag.addItemTo(item, toPlace)) bag.takeOutItem(item);
      } else if (item.canStackedTo(to) && item.Count + to.Count <= item.template.MaxCount) {
        if (toBag.addCountToStack(to, item.Count)) bag.removeCountFromStack(item, item.Count);
      } else {
        bag.takeOutItem(item);
        toBag.takeOutItem(to);
        bag.addItemTo(to, place);
        toBag.addItemTo(item, toPlace);
      }
    }
  } finally {
    bag.commitChanges();
    if (toBag !== bag) toBag.commitChanges();
  }
}

export function registerMoverItem(r: HandlerRegistry): void {
  r.player(49, "CHANGE_PLACE_GOODS", (ctx, p, pkt) => {
    const bagType = pkt.readByte();
    const place = pkt.readInt();
    const toBag = pkt.readByte();
    const toPlace = pkt.readInt();
    const count = pkt.readInt();
    pkt.readBoolean();
    changeItemPlace(ctx, p, bagType, place, toBag, toPlace, count);
  }, "partial");
}
