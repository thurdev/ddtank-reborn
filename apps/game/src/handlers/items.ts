/**
 * Bags, equipment, selling, shop buy and player info:
 * 49 CHANGE_PLACE_GOODS, 47 UNCHAIN_EQUIP, 127 REClAIM_GOODS, 44 BUY_GOODS, 74 ITEM_EQUIP (01 §3, §4, §2).
 */
import { ItemInfo, isAvatar, BagType, templateBagType } from "../game/item.js";
import type { GamePlayer } from "../game/player.js";
import type { PlayerInventory } from "../game/inventory.js";
import { loadEquippedItems } from "../db/items.js";
import { loadPlayerInfo, loadPlayerInfoByNick } from "../db/characters.js";
import { saveItem } from "../db/items.js";
import { sendMail } from "../db/social.js";
import type { ShopItemInfo } from "../db/templates.js";
import * as Out from "../packets/out.js";
import { GSPacket } from "@ddt/protocol";
import type { HandlerRegistry } from "./registry.js";
import type { ServerContext } from "../session/context.js";

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

/** ShopMgr.CanBuy (Bussiness/Managers/ShopMgr.cs:23) — guild shops 11..15 need Consortia_Equip_Control (not ported: refused). */
export function canBuyShop(shopId: number): { ok: boolean; isBinds: boolean } {
  if (shopId >= 1 && shopId <= 4) return { ok: true, isBinds: false };
  if (shopId === 20 || shopId === 72 || shopId === 91) return { ok: true, isBinds: true };
  if (shopId >= 11 && shopId <= 15) return { ok: false, isBinds: true };
  return { ok: false, isBinds: true };
}

function bagLocked(ctx: ServerContext, p: GamePlayer): boolean {
  if (p.info.HasBagPassword && p.info.IsLocked) {
    p.sendMessage(0, ctx.lang.t("Bag.Locked"));
    return true;
  }
  return false;
}

/** UserChangeItemPlaceHandler.cs:19 (Store/Bank/Consortia helper paths simplified to direct moves). */
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
      if (!to) {
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

/** Sends overflow items by mail (5 annexes per mail, type 8 BuyItem) — UserBuyItemHandler.cs:239-325. */
async function mailItems(ctx: ServerContext, p: GamePlayer, items: ItemInfo[]): Promise<void> {
  for (let i = 0; i < items.length; i += 5) {
    const chunk = items.slice(i, i + 5);
    const mail: Record<string, unknown> = {};
    let remark = ctx.lang.t("GoodsPresentHandler.AnnexRemark");
    for (const [k, it] of chunk.entries()) {
      it.UserID = 0;
      it.BagType = -1;
      it.Place = -1;
      await saveItem(ctx.db.db, it);
      mail[`Annex${k + 1}`] = String(it.ItemID);
      mail[`Annex${k + 1}Name`] = it.template.Name ?? "";
      remark += `${k + 1}、${it.template.Name}x${it.Count};`;
    }
    const content = `${ctx.lang.t("UserBuyItemHandler.Title")}${chunk[0]!.template.Name ?? ""}]`;
    await sendMail(ctx.db.db, {
      ...mail, AnnexRemark: remark, Content: content, Title: content, Gold: 0, Money: 0, Type: 8,
      Receiver: p.info.NickName, ReceiverID: p.id, Sender: p.info.NickName, SenderID: p.id,
    });
  }
}

/** UserBuyItemHandler.cs:22. */
export async function buyGoods(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const tpl = ctx.templates;
  const totals: PriceTotals = { gold: 0, money: 0, offer: 0, gifttoken: 0, petScore: 0, score: 0, dmgScore: 0 };
  const need = new Map<number, number>();
  const buy: { item: ItemInfo; dress: boolean; place: number }[] = [];
  const count = pkt.readInt();
  if (count <= 0 || count > 99) return p.sendMessage(0, "Lỗi hệ thống. Sự cố đã được gửi đến quản trị viên.");
  for (let i = 0; i < count; i++) {
    const goodsId = pkt.readInt();
    const type = pkt.readInt();
    const color = pkt.readString();
    const dress = pkt.readBoolean();
    const skin = pkt.readString();
    const place = pkt.readInt();
    const shop = tpl.shop.get(goodsId);
    if (!shop || !tpl.isOnShop(shop.ID)) continue;
    const can = canBuyShop(shop.ShopID);
    if (shop.ShopID === 2 || !can.ok) return p.sendMessage(1, ctx.lang.t("UserBuyItemHandler.FailByPermission"));
    const t = tpl.findItem(shop.TemplateID);
    if (!t) continue;
    if (shop.ShopID === 20) {
      // Limited free daily goods (WorldMgr.UpdateShopFreeCount): one per day.
      const last = p.info.ShopFinallyGottenTime;
      if (last && last.toISOString().slice(0, 10) === ctx.now().toISOString().slice(0, 10)) return p.sendMessage(1, ctx.lang.t("UserBuyItemHandler.FailByPermission2"));
      p.info.ShopFinallyGottenTime = ctx.now();
      need.set(-9999, 1);
    }
    const item = ItemInfo.createFromTemplate(t, 1, 102, ctx.now());
    const unit = type === 1 ? shop.AUnit : type === 2 ? shop.BUnit : type === 3 ? shop.CUnit : null;
    if (unit !== null) {
      if (shop.BuyType === 0) item.ValidDate = unit;
      else item.Count = unit;
    }
    item.Color = color ?? "";
    item.Skin = skin ?? "";
    item.IsBinds = true; // UserBuyItemHandler.cs:117 — every purchase is bound in this build
    buy.push({ item, dress, place });
    const req = setItemType(shop, type, totals);
    for (let j = 0; j < req.length; j += 2) need.set(req[j]!, (need.get(req[j]!) ?? 0) + req[j + 1]!);
  }
  if (buy.length === 0) return;
  if (bagLocked(ctx, p)) return;
  for (const [k, v] of need) if (k !== -9999 && p.getTemplateCount(k, tpl.findItem) < v) return p.sendMessage(1, ctx.lang.t("UserBuyItemHandler.NoBuyItem"));
  const { gold, money, offer, gifttoken, petScore, score, dmgScore } = totals;
  const anyCost = gold > 0 || money > 0 || offer > 0 || gifttoken > 0 || petScore > 0 || score > 0 || dmgScore > 0 || need.size > 0;
  if (!(gold >= 0 && money >= 0 && offer >= 0 && gifttoken >= 0 && petScore >= 0 && score >= 0 && dmgScore >= 0 && anyCost)) {
    return p.sendMessage(0, "Lỗi hệ thống. Sự cố đã được gửi đến quản trị viên.");
  }
  const c = p.info;
  let eMsg = 0;
  let msg = "UserBuyItemHandler.Success";
  if (gold <= c.Gold && money <= c.Money + c.MoneyLock && offer <= c.Offer && gifttoken <= c.GiftToken && petScore <= c.petScore && score <= c.Score && dmgScore <= c.damageScores) {
    p.beginChanges();
    p.removeMoney(money); p.removeGold(gold); p.removeOffer(offer); p.removeGiftToken(gifttoken);
    p.removePetScore(petScore); p.removeScore(score); p.removeDamageScores(dmgScore);
    for (const [k, v] of need) if (k !== -9999) p.removeTemplateInShop(k, v, tpl.findItem);
    p.commitChanges();
    p.questInv?.onPaid(money, gold, offer, gifttoken, buy.map((b) => b.item.TemplateID)); // GamePlayer.OnPaid -> ShopCondition
    const overflow: ItemInfo[] = [];
    for (const b of buy) {
      const bagType = templateBagType(b.item.template);
      const inv = p.getInventory(bagType);
      if (inv && inv.addTemplate(b.item, b.item.Count)) {
        if (!b.dress || !b.item.canEquip()) continue;
        let slot = p.equipBag.findItemEquipSlot(b.item.template);
        if ((slot === 9 || slot === 10) && (b.place === 9 || b.place === 10)) slot = b.place;
        else if ((slot === 7 || slot === 8) && (b.place === 7 || b.place === 8)) slot = b.place;
        const placed = (inv as PlayerInventory).lastAdded[0];
        if (placed && inv === p.equipBag) p.equipBag.moveItem(placed.Place, slot, 0);
        msg = "UserBuyItemHandler.Save";
      } else overflow.push(b.item);
    }
    if (overflow.length) {
      await mailItems(ctx, p, overflow);
      eMsg = 1;
      msg = "UserBuyItemHandler.Mail";
      p.send(Out.mailResponse(p.id, 1));
    }
  } else {
    if (money > c.Money && money > 0) msg = "UserBuyItemHandler.NoMoney";
    if (gold > c.Gold) msg = "UserBuyItemHandler.NoGold";
    if (offer > c.Offer) msg = "UserBuyItemHandler.NoOffer";
    if (gifttoken > c.GiftToken) msg = "UserBuyItemHandler.GiftToken";
    if (petScore > c.petScore) msg = "UserBuyItemHandler.petScore";
    if (score > c.Score || dmgScore > c.damageScores) msg = "UserBuyItemHandler.boguScore";
    eMsg = 1;
  }
  p.sendMessage(eMsg, ctx.lang.t(msg));
  const reply = new GSPacket(44, p.id);
  reply.writeInt(1);
  reply.writeInt(3);
  p.send(reply);
}

export function registerItems(r: HandlerRegistry): void {
  r.player(49, "CHANGE_PLACE_GOODS", (ctx, p, pkt) => {
    const bagType = pkt.readByte();
    const place = pkt.readInt();
    const toBag = pkt.readByte();
    const toPlace = pkt.readInt();
    const count = pkt.readInt();
    pkt.readBoolean();
    changeItemPlace(ctx, p, bagType, place, toBag, toPlace, count);
  }, "partial");

  /** UserUnchainItemHandler.cs:8 — not during a game. */
  r.player(47, "UNCHAIN_EQUIP", (_ctx, p, pkt) => {
    if (p.currentRoom?.IsPlaying) return;
    const from = pkt.readInt();
    if (!(from >= 0 && from < 31)) return;
    p.equipBag.moveItem(from, p.equipBag.findFirstEmptySlot(31), 0);
  });

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
    if (t.ReclaimType === 3) return p.sendMessage(0, "Không thể bán vật phẩm này.");
    if (t.ReclaimType === 2) {
      p.addGiftToken(price);
      p.sendMessage(0, ctx.lang.t("ItemReclaimHandler.Success1", price));
    } else if (t.ReclaimType === 1) {
      p.addGold(price);
      p.sendMessage(0, ctx.lang.t("ItemReclaimHandler.Success2", price));
    }
    bag.removeItemAt(place);
  });

  r.player(44, "BUY_GOODS", (ctx, p, pkt) => buyGoods(ctx, p, pkt));

  /** UserEquipListHandler.cs: view another player's equipment (online or from DB). */
  r.player(74, "ITEM_EQUIP", async (ctx, p, pkt) => {
    const byId = pkt.readBoolean();
    let id = 0;
    let nick = "";
    if (byId) id = pkt.readInt();
    else nick = pkt.readString();
    const online = byId ? ctx.world.get(id) : ctx.world.getByNick(nick);
    let info = online?.info ?? null;
    let items = online ? online.equipBag.getItems(0, 30) : null;
    if (!online) {
      info = byId ? await loadPlayerInfo(ctx.db.db, id) : await loadPlayerInfoByNick(ctx.db.db, nick);
      if (info) items = await loadEquippedItems(ctx.db.db, info.ID, ctx.templates.findItem);
    }
    if (!info || !items) return p.sendMessage(3, "Thông tin người chơi không có thực!");
    p.send(Out.userEquip(info, items, ctx.now()));
  });
}
