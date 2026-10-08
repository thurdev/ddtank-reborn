/**
 * Ferreiro (Store bag workbench, bag 12): 59 ITEM_STRENGTHEN, 58 ITEM_COMPOSE, 78 ITEM_FUSION (76 preview),
 * 121 ITEM_INLAY, 125 ITEM_EMBED_BACKOUT, 122 CLEAR_STORE_BAG (01 §5, 02 §4).
 * Packets of one client are processed in order, and every handler re-reads the workbench and validates before it
 * mutates, so a repeated packet can never consume or create twice.
 */
import { GSPacket } from "@ddt/protocol";
import { ItemInfo, BagType, templateBagType, type ItemTemplate } from "../game/item.js";
import type { PlayerInventory } from "../game/inventory.js";
import type { GamePlayer } from "../game/player.js";
import type { Templates } from "../db/templates.js";
import type { ServerContext } from "../session/context.js";
import type { HandlerRegistry } from "./registry.js";
import { mailItems } from "./items.js";
import { getEquipControl } from "../db/consortia.js";
import { personalRiches, smithBonusLevel } from "../game/consortia.js";
import { pushRecords } from "./events.js";

/** StrengthenMgr.RateItems (StrengthenMgr.cs:29): rate per strengthen stone level 1..6. */
export const STRENGTHEN_RATE_ITEMS = [0.75, 3.0, 12.0, 48.0, 240.0, 768.0];
/** StrengthenMgr.VIPStrengthenEx. */
export const VIP_STRENGTHEN_EX = 0.3;
/** ItemComposeHandler.composeRate (by stone quality 1..5). */
export const COMPOSE_RATE = [0.8, 0.5, 0.3, 0.1, 0.05];

export interface StrengthenRateInput {
  stoneLevels: number[];
  /** Luck stone Property2 (null = no luck stone). */
  luckP2: number | null;
  needRate: number;
  smithLevel: number;
  vip: boolean;
}

/**
 * ItemStrengthenHandler.cs:41-112: returns floor((stones + luck + guild + vip) * 100), compared against
 * RandomSafe.Next(10000) (success if greater). Luck mirrors the C# exactly: (probability + Property2 / 100 [int div]).
 */
export function strengthenChance(i: StrengthenRateInput): number {
  let probability = 0;
  for (const lv of i.stoneLevels) probability += STRENGTHEN_RATE_ITEMS[lv - 1] ?? 0;
  const luck = i.luckP2 == null ? 0 : probability + Math.trunc(i.luckP2 / 100);
  const need = i.needRate;
  const num5 = (probability * 100) / need;
  const num6 = (luck * 100) / need;
  const guild = i.smithLevel > 0 ? num5 * (0.1 * i.smithLevel) : 0;
  const vip = i.vip ? VIP_STRENGTHEN_EX * num5 : 0;
  const total = Math.floor((num5 + num6 + guild + vip) * 100);
  return Number.isFinite(total) ? total : 1_000_000;
}

/** ItemComposeHandler.cs:58-118: success if floor(rate*10)/10 > Random.Next(100). */
export function composeChance(stoneQuality: number, luckP2: number | null, smithLevel = 0): number {
  let p = (COMPOSE_RATE[stoneQuality - 1] ?? 0) * 100;
  if (luckP2 != null) p += (p * luckP2) / 100;
  else p += (p * 1) / 100; // C#: "+1%" when no luck stone
  if (smithLevel > 0) p *= 1 + 0.1 * smithLevel;
  return Math.floor(p * 10) / 10;
}

export interface FusionPick { template: ItemTemplate; result: boolean }

/** FusionMgr.Fusion / FusionPreview (candidates at MaxLevel+1, MaxLevel, MaxLevel+2 ordered by rate/need). */
export function fusionCandidates(items: ItemInfo[], tpl: Templates): { max?: ItemTemplate; min?: ItemTemplate; rate: number; need: number; isBind: boolean } | null {
  const types = items.map((i) => i.template.FusionType).sort((a, b) => a - b);
  const key = types.join("");
  const f = tpl.fusions.get(key);
  let maxLevel = 0, rate = 0, need = 0, isBind = false;
  for (const it of items) {
    maxLevel = Math.max(maxLevel, it.template.Level);
    rate += it.template.FusionRate;
    need += it.template.FusionNeedRate;
    if (it.IsBinds) isBind = true;
  }
  if (!f) return null;
  const list = [tpl.goodsByFusionTypeAndLevel(f.Reward, maxLevel + 1), tpl.goodsByFusionTypeAndLevel(f.Reward, maxLevel), tpl.goodsByFusionTypeAndLevel(f.Reward, maxLevel + 2)]
    .filter((t): t is ItemTemplate => !!t);
  const r = (t: ItemTemplate) => rate / t.FusionNeedRate;
  const max = list.filter((t) => r(t) <= 1.1).sort((a, b) => r(b) - r(a))[0];
  const min = list.filter((t) => r(t) > 1.1).sort((a, b) => r(a) - r(b))[0];
  return { max, min, rate, need, isBind };
}

/** FusionMgr.FusionPreview: template -> success rate %. */
export function fusionPreview(items: ItemInfo[], tpl: Templates): { rates: Map<number, number>; isBind: boolean } {
  const c = fusionCandidates(items, tpl);
  const rates = new Map<number, number>();
  if (!c) return { rates, isBind: items.some((i) => i.IsBinds) };
  if (c.max && !c.min) rates.set(c.max.TemplateID, (100 * c.rate) / c.need);
  if (c.max && c.min) {
    const tr = c.max.Level - c.min.Level === 2 ? (100 * c.rate * 0.6) / c.max.FusionNeedRate : (100 * c.rate) / c.max.FusionNeedRate;
    rates.set(c.max.TemplateID, tr);
    rates.set(c.min.TemplateID, 100 - tr);
  }
  if (!c.max && c.min) rates.set(c.min.TemplateID, (100 * c.rate) / c.need);
  return { rates, isBind: c.isBind };
}

/** FusionMgr.Fusion (FusionMgr.cs): picked template and success flag. */
export function fusionRoll(items: ItemInfo[], tpl: Templates, rnd = Math.random): FusionPick | null {
  const c = fusionCandidates(items, tpl);
  if (!c) return null;
  let pick: ItemTemplate | undefined;
  let result = false;
  if (c.max && !c.min) {
    pick = c.max;
    if (Math.floor(rnd() * c.need) < c.rate) result = true;
  }
  if (c.max && c.min) {
    if ((100 * c.rate) / c.max.FusionNeedRate > Math.floor(rnd() * 100)) pick = c.max;
    else pick = c.min;
    result = true;
  }
  if (!c.max && c.min) {
    pick = c.min;
    if (Math.floor(rnd() * c.need) < c.rate) result = true;
  }
  if (!pick) return null;
  if (result && items.some((i) => i.TemplateID === pick!.TemplateID)) result = false;
  return { template: pick, result };
}

function bagLocked(ctx: ServerContext, p: GamePlayer): boolean {
  if (p.info.HasBagPassword && p.info.IsLocked) {
    p.sendMessage(0, ctx.lang.t("Bag.Locked"));
    return true;
  }
  return false;
}

/** GamePlayer.isPlayerWarrior: Extra.coupleBossBoxNum == 9 (GM "warrior" accounts always succeed). */
function isWarrior(p: GamePlayer): boolean {
  return (p.extra as { coupleBossBoxNum?: number } | null)?.coupleBossBoxNum === 9;
}

/** GamePlayer.ClearStoreBag (GamePlayer.cs:2205): workbench items back to Prop/Equip bag, rest by mail. */
export async function clearStoreBag(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const store = p.storeBag;
  const left: ItemInfo[] = [];
  store.beginChanges(); p.propBag.beginChanges(); p.equipBag.beginChanges();
  try {
    for (const it of store.getItems()) {
      const toProp = templateBagType(it.template) === BagType.PropBag;
      const dest = toProp ? p.propBag : p.equipBag;
      const place = toProp ? dest.findFirstEmptySlot() : dest.findFirstEmptySlot(31);
      if (place >= 0 && store.takeOutItem(it) && dest.addItemTo(it, place)) continue;
      if (it.BagType !== BagType.Store) store.addItemTo(it, it.Place >= 0 ? it.Place : store.findFirstEmptySlot());
      left.push(it);
    }
  } finally {
    store.commitChanges(); p.propBag.commitChanges(); p.equipBag.commitChanges();
  }
  if (left.length) {
    for (const it of left) store.takeOutItem(it);
    await mailItems(ctx, p, left, ctx.lang.t("StoreClearItemHandler.Mail") === "StoreClearItemHandler.Mail" ? "Itens devolvidos pela Forja." : ctx.lang.t("StoreClearItemHandler.Mail"), 9);
  }
}

/** Guild smith level for strengthen (0 when not used / not allowed — the C# then only showed a message). */
async function guildSmith(ctx: ServerContext, p: GamePlayer, useGuild: boolean): Promise<number> {
  if (!useGuild) return 0;
  const th = p.info.ConsortiaID ? await getEquipControl(ctx.db.db, p.info.ConsortiaID, 0, 2) : undefined;
  const sb = smithBonusLevel(true, p.info.ConsortiaID !== 0, p.info.SmithLevel, personalRiches(p.info), th);
  if (sb.denied) p.sendMessage(p.info.ConsortiaID ? 1 : 0, ctx.lang.t(p.info.ConsortiaID ? "ItemStrengthenHandler.FailbyPermission" : "ItemStrengthenHandler.Fail"));
  return sb.level;
}

/** ItemStrengthenHandler.cs (59). */
export async function strengthen(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd = Math.random): Promise<void> {
  const useGuild = pkt.readBoolean();
  const store = p.storeBag;
  let item = store.getItemAt(5);
  if (!item || !item.template.CanStrengthen || item.Count !== 1) return p.sendMessage(0, ctx.lang.t("ItemStrengthenHandler.Success"));
  const stones: ItemInfo[] = [];
  for (const s of [0, 1, 2]) {
    const st = store.getItemAt(s);
    if (st && st.template.CategoryID === 11 && (st.template.Property1 === 2 || st.template.Property1 === 35)) stones.push(st);
  }
  const luckIt = store.getItemAt(4);
  const luck = luckIt && luckIt.template.CategoryID === 11 && luckIt.template.Property1 === 3 ? luckIt : null;
  const godIt = store.getItemAt(3);
  const god = godIt && godIt.template.CategoryID === 11 && godIt.template.Property1 === 7 ? godIt : null;
  if (stones.length < 1) return p.sendMessage(0, `${ctx.lang.t("ItemStrengthenHandler.Content1")}1${ctx.lang.t("ItemStrengthenHandler.Content2")}`);
  const needRate = ctx.templates.strengthenNeedRate(item.StrengthenLevel, item.template.CategoryID);
  if (!ctx.templates.strengthen.has(item.StrengthenLevel + 1)) return p.sendMessage(0, ctx.lang.t("ItemStrengthenHandler.Success"));
  // ItemStrengthenHandler.cs:88-103: guild smith +10 %/level of the stone rate when personal riches >= Equip_Control Type 2
  const smith = await guildSmith(ctx, p, useGuild);
  const chance = strengthenChance({ stoneLevels: stones.map((s) => s.template.Level), luckP2: luck ? luck.template.Property2 : null, needRate, smithLevel: smith, vip: p.info.typeVIP > 0 });
  const original = item;
  const isBinds = item.IsBinds || stones.some((s) => s.IsBinds) || !!luck?.IsBinds || !!god?.IsBinds;
  item.StrengthenTimes++;
  item.IsBinds = isBinds;
  // StoreBag.ClearBag(): the stones, luck and god stone in the workbench are consumed (whole slots, like the C#).
  store.beginChanges();
  const out = new GSPacket(59, p.id);
  try {
    // C# StoreBag.ClearBag() destroys the whole workbench (every stacked stone). Port: one unit per used slot
    // (stones 0..2, luck 4, god 3) — the success rate never depended on the stack size; the item leaves slot 5.
    for (const s of [...stones, luck, god]) if (s) store.removeCountFromStack(s, 1);
    store.takeOutItem(item);
    item.IsExist = true;
    const roll = isWarrior(p) ? 0 : Math.floor(rnd() * 10000);
    if (chance > roll) {
      out.writeByte(0); out.writeBoolean(true);
      item.StrengthenLevel++;
      const sg = ctx.templates.findStrengthenGoods(item.StrengthenLevel, item.TemplateID);
      if (sg && item.template.CategoryID === 7 && sg.GainEquip > item.TemplateID) {
        const t = ctx.templates.findItem(sg.GainEquip);
        if (t) item = ItemInfo.cloneFromTemplate(t, item);
      }
      item.openHole();
      store.addItemTo(item, 5);
      p.questInv?.onItemStrengthen(item.template.CategoryID, item.StrengthenLevel);
      pushRecords(p, new Map([[32, 1]])); // AchievementCondition type 32 ItemStrengthenCondition: successful-strengthen counter
    } else {
      out.writeByte(1); out.writeBoolean(false);
      if (!god) {
        if (item.template.Level === 3) {
          item.StrengthenLevel = item.StrengthenLevel < 5 ? item.StrengthenLevel : item.StrengthenLevel - 1;
          const sg = ctx.templates.findRealStrengthenGoods(item.StrengthenLevel, item.TemplateID);
          if (sg && item.template.CategoryID === 7 && item.TemplateID !== sg.GainEquip) {
            const t = ctx.templates.findItem(sg.GainEquip);
            if (t) item = ItemInfo.cloneFromTemplate(t, item);
          }
          store.addItemTo(item, 5);
        } else {
          // C#: Count-- and puts the 0-count item back; port: the item is destroyed (removed from the bag).
          item.Count--;
          if (item.Count > 0) store.addItemTo(item, 5);
          else { item.IsExist = false; item.RemoveType = 14; item.isDirty = true; }
        }
      } else store.addItemTo(item, 5);
      item.openHole();
    }
    if (item !== original) { original.IsExist = false; original.isDirty = true; } // re-templated weapon: old row deleted
  } finally {
    store.commitChanges();
  }
  p.send(out);
  p.updatePlayerProperties();
}

/** ItemComposeHandler.cs (58). */
export async function compose(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd = Math.random): Promise<void> {
  const mustGold = ctx.templates.cfgInt("PRICE_COMPOSE_GOLD", 1600);
  if (bagLocked(ctx, p)) return;
  if (p.info.Gold < mustGold) return p.sendMessage(1, ctx.lang.t("ItemComposeHandler.NoMoney"));
  const useGuild = pkt.readBoolean();
  const store = p.storeBag;
  const item = store.getItemAt(1);
  const stone = store.getItemAt(2);
  if (!item || !stone || stone.Count <= 0) return p.sendMessage(1, ctx.lang.t("ItemComposeHandler.Msg"));
  // Port: the stone must be a compose stone (cat 11, Property1 1); the C# only checked it for items of category >= 10.
  if (!item.template.CanCompose || !(stone.template.CategoryID === 11 && stone.template.Property1 === 1)) {
    return p.sendMessage(0, ctx.lang.t("ItemComposeHandler.Fail"));
  }
  const luckIt = store.getItemAt(0);
  const luck = luckIt && luckIt.template.CategoryID === 11 && luckIt.template.Property1 === 3 ? luckIt : null;
  const isBinds = item.IsBinds || stone.IsBinds || !!luck?.IsBinds;
  // ItemComposeHandler.cs:105-130: guild smith multiplies the rate by (1 + 0.1 × SmithLevel); refused without riches
  let smith = 0;
  if (useGuild) {
    const th = p.info.ConsortiaID ? await getEquipControl(ctx.db.db, p.info.ConsortiaID, 0, 2) : undefined;
    const sb = smithBonusLevel(true, p.info.ConsortiaID !== 0, p.info.SmithLevel, personalRiches(p.info), th);
    if (sb.denied) return p.sendMessage(1, ctx.lang.t("ItemStrengthenHandler.FailbyPermission"));
    smith = sb.level;
  }
  const prob = composeChance(stone.template.Quality, luck ? luck.template.Property2 : null, smith);
  const rand = Math.floor(rnd() * 100);
  const key = ({ 1: "AttackCompose", 2: "DefendCompose", 3: "AgilityCompose", 4: "LuckCompose" } as const)[stone.template.Property3 as 1 | 2 | 3 | 4];
  if (!key || !(stone.template.Property4 > item[key])) return p.sendMessage(0, ctx.lang.t("ItemComposeHandler.NoLevel"));
  let ok = 1;
  if (prob > rand) {
    ok = 0;
    item[key] = stone.template.Property4;
  }
  item.IsBinds = isBinds;
  store.beginChanges();
  try {
    store.removeTemplate(stone.TemplateID, 1);
    if (luck) store.removeTemplate(luck.TemplateID, 1);
    store.updateItem(item);
  } finally {
    store.commitChanges();
  }
  p.removeGold(mustGold);
  if (ok === 0) p.questInv?.onItemCompose(stone.TemplateID);
  const out = new GSPacket(58, p.id);
  out.writeByte(ok);
  p.send(out);
  p.updatePlayerProperties();
}

/** Reborn auto-split: o cliente joga a pilha inteira num slot só (sem picker de
 * quantidade). Espalha 1 unidade por slot 1-4 a partir de pilhas do mesmo tipo,
 * então pilha de 4+ funde direto. Resto fica no slot de origem. */
export function autoSplitFusionSlots(store: PlayerInventory): void {
  for (let pass = 0; pass < 3; pass++) {
    const filled = [1, 2, 3, 4].filter((s) => store.getItemAt(s));
    if (filled.length >= 4) return;
    const first = store.getItemAt(filled[0] ?? 1);
    const donor = [1, 2, 3, 4]
      .map((s) => store.getItemAt(s))
      .find((it) => it && it.Count > 1 && (!first || it.TemplateID === first.TemplateID));
    const empty = [1, 2, 3, 4].find((s) => !store.getItemAt(s));
    if (!donor || empty === undefined) return;
    if (!store.moveItem(donor.Place, empty, 1)) return;
  }
}

/** ItemFusionHandler.cs (78): byte op 0 = preview (76), 1 = fuse (400 gold). */
export async function fusion(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd = Math.random): Promise<void> {
  const op = pkt.readByte();
  if (bagLocked(ctx, p)) return;
  const store = p.storeBag;
  autoSplitFusionSlots(store);
  const items: ItemInfo[] = [];
  for (let i = 1; i <= 4; i++) {
    const it = store.getItemAt(i);
    if (it) items.push(it);
  }
  if (items.length >= 4 && items.some((i) => i.TemplateID !== items[0]!.TemplateID)) return p.sendMessage(1, ctx.lang.t("Há itens de tipos diferentes!"));
  if (items.length !== 4) return p.sendMessage(0, ctx.lang.t("ItemFusionHandler.ItemNotEnough"));
  const valid = items.map((i) => i.ValidDate).sort((a, b) => a - b);
  const minValidItem = items.every((i) => i.ValidDate !== 0) ? valid[0]! : valid[1]!;
  let minValid = minValidItem;
  if (op === 0) {
    const pv = fusionPreview(items, ctx.templates);
    const roll = fusionCandidates(items, ctx.templates);
    let isBind = pv.isBind;
    const anyReward = roll?.max ?? roll?.min;
    if (anyReward && (anyReward.CategoryID === 7 || anyReward.CategoryID === 17)) { minValid = 7; isBind = true; }
    if (pv.rates.size === 0) return;
    const out = new GSPacket(76, p.id);
    out.writeInt(pv.rates.size);
    for (const [tplId, rate] of pv.rates) {
      out.writeInt(tplId); out.writeInt(minValid); out.writeInt(Math.trunc(rate > 100 ? 100 : rate >= 0 ? rate : 0));
    }
    out.writeBoolean(isBind);
    p.send(out);
    return;
  }
  if (p.info.Gold < 400) return p.sendMessage(1, ctx.lang.t("ItemFusionHandler.NoMoney"));
  const pick = fusionRoll(items, ctx.templates, rnd);
  if (!pick) return p.sendMessage(0, ctx.lang.t("ItemFusionHandler.NoCondition"));
  let isBind = items.some((i) => i.IsBinds);
  if (pick.template.CategoryID === 7 || pick.template.CategoryID === 17) { minValid = 7; isBind = true; }
  const mail: ItemInfo[] = [];
  store.beginChanges();
  try {
    const prev = store.getItemAt(0);
    if (prev) {
      store.takeOutItem(prev);
      const dest = p.getItemInventory(prev.template);
      if (!dest || !(dest.stackItemToAnother(prev) || dest.addItem(prev))) mail.push(prev);
    }
    p.removeGold(400);
    for (const it of items) store.removeCountFromStack(it, 1);
    if (pick.result) {
      if (templateBagType(pick.template) === BagType.EquipBag) minValid = minValidItem;
      const res = ItemInfo.createFromTemplate(pick.template, 1, 105, ctx.now());
      res.IsBinds = isBind;
      res.ValidDate = minValid;
      p.questInv?.onItemFusion(pick.template.FusionType);
      p.sendMessage(0, ctx.lang.t("ItemFusionHandler.Succeed1") + (pick.template.Name ?? ""));
      if (!store.addItemTo(res, 0)) mail.push(res);
    } else p.sendMessage(0, ctx.lang.t("ItemFusionHandler.Failed"));
  } finally {
    store.commitChanges();
  }
  if (mail.length) await mailItems(ctx, p, mail);
  const out = new GSPacket(78, p.id);
  out.writeBoolean(pick.result);
  p.send(out);
}

/** ItemInlayHandle.cs (121): gem (Property1 31) into a hole whose type equals gem Property2. */
export async function inlay(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const itemBag = pkt.readInt(), itemPlace = pkt.readInt(), hole = pkt.readInt(), gemBag = pkt.readInt(), gemPlace = pkt.readInt();
  const ib = p.getInventory(itemBag), gb = p.getInventory(gemBag);
  const item = ib?.getItemAt(itemPlace), gem = gb?.getItemAt(gemPlace);
  if (!ib || !gb || !item || !gem || gem.template.Property1 !== 31) return;
  const price = ctx.templates.cfgInt("InlayGoldPrice", 2000);
  if (!(p.info.Gold > price)) return p.sendMessage(0, ctx.lang.t("UserBuyItemHandler.NoMoney"));
  const out = new GSPacket(121, p.id);
  if (!(hole > 0 && hole < 7)) {
    out.writeByte(1);
    p.sendMessage(0, ctx.lang.t("ItemInlayHandle.NoPlace"));
    return p.send(out);
  }
  p.removeGold(price); // C#: charged even when the hole type does not match
  const key = `Hole${hole}` as "Hole1";
  // Port: the hole must be open (>= 0); the C# trusted the client.
  const ok = item.holeType(hole) === gem.template.Property2 && item[key] >= 0;
  if (ok) {
    const back: ItemInfo[] = [];
    if ((hole === 5 || hole === 6) && item[key] > 0) {
      const t = ctx.templates.findItem(item[key]);
      if (t) {
        const old = ItemInfo.createFromTemplate(t, 1, 102, ctx.now());
        old.IsBinds = true;
        old.ValidDate = 0;
        if (!p.propBag.addTemplate(old, 1)) back.push(old);
      }
    }
    item[key] = gem.TemplateID;
    if (gem.IsBinds) item.IsBinds = true;
    gb.removeCountFromStack(gem, 1);
    ib.updateItem(item);
    if (back.length) await mailItems(ctx, p, back);
    p.questInv?.onItemInsert(); // player.ItemInsert (ItemInsertCondition, type 25)
    out.writeInt(0);
  } else {
    p.sendMessage(0, ctx.lang.t("GameServer.InlayItem.Msg1"));
    out.writeByte(1);
  }
  p.send(out);
  if (ib === p.equipBag && item.Place < 31) p.updatePlayerProperties();
}

/** ItemEmbedBackOutHandler.cs (125): remove a gem from Store[0] for 500 Money; gem returns bound. */
export async function embedBackout(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const hole = pkt.readInt();
  const templateId = pkt.readInt();
  const must = 500;
  if (bagLocked(ctx, p)) return;
  const warrior = isWarrior(p);
  if (p.info.Money + p.info.MoneyLock < must && !warrior) return p.sendMessage(3, ctx.lang.t("ItemComposeHandler.NoMoney"));
  if (p.propBag.getEmptyCount() <= 0) return p.sendMessage(0, ctx.lang.t("UserChangeItemPlaceHandler.full"));
  const item = p.storeBag.getItemAt(0);
  const goods = ctx.templates.findItem(templateId);
  if (!item || !goods || !(hole >= 1 && hole <= 6)) return;
  const key = `Hole${hole}` as "Hole1";
  const out = new GSPacket(125, p.id);
  if (item[key] > 0 && item[key] === goods.TemplateID) {
    item[key] = 0;
    out.writeInt(0);
    p.beginChanges();
    const gem = ItemInfo.createFromTemplate(goods, 1, 102, ctx.now());
    gem.IsBinds = true;
    gem.ValidDate = 0;
    const mail: ItemInfo[] = [];
    if (!p.propBag.addTemplate(gem, 1)) mail.push(gem);
    p.storeBag.updateItem(item);
    if (!warrior) p.removeMoney(must);
    p.commitChanges();
    if (mail.length) await mailItems(ctx, p, mail);
    await clearStoreBag(ctx, p);
    p.sendMessage(0, ctx.lang.t("OK"));
  } else out.writeInt(1);
  p.send(out);
}

/**
 * OpenFiveSixHoleHandler.cs (217): drill (PropBag item whose own TemplateID is the right tier for the hole's
 * current level) spent on the StoreBag[slot] equip's hole 5 or 6, Property7..8 random exp; a 100 ms cooldown per
 * player (LastOpenHole) matches the throttle, not an anti-cheat.
 */
const HOLE_LEVEL_UP_EXP = [400, 600, 700, 800, 800];
export async function openFiveSixHole(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd = Math.random): Promise<void> {
  const slot = pkt.readInt();
  const hole = pkt.readInt(); // 5 or 6
  const drillTemplateId = pkt.readInt();
  const now = ctx.now().getTime();
  if (p.lastOpenHole + 100 > now) return p.sendMessage(0, ctx.lang.t("GameServer.OpenHole.TooQuickly"));
  p.lastOpenHole = now;
  const item = p.storeBag.getItemAt(slot);
  if (!item || ![7, 1, 5].includes(item.template.CategoryID)) return p.sendMessage(0, "Não é possível abrir o furo.");
  const drill = p.propBag.getItemByTemplateID(0, drillTemplateId);
  if (!drill || drill.Count <= 0 || (hole !== 5 && hole !== 6)) return;
  if (drill.IsBinds && !item.IsBinds) p.storeBag.updateItem(item);
  const lvKey = (hole === 6 ? "Hole6Level" : "Hole5Level") as "Hole5Level" | "Hole6Level";
  const expKey = (hole === 6 ? "Hole6Exp" : "Hole5Exp") as "Hole5Exp" | "Hole6Exp";
  const holeKey = (hole === 6 ? "Hole6" : "Hole5") as "Hole5" | "Hole6";
  let leveledUp = false;
  if (drill.isDrill(item[lvKey])) {
    p.propBag.removeCountFromStack(drill, 1);
    item[expKey] += Math.trunc(drill.template.Property7 + rnd() * (drill.template.Property8 - drill.template.Property7));
    const needExp = HOLE_LEVEL_UP_EXP[item[lvKey]];
    if (needExp !== undefined && item[expKey] >= needExp) {
      item[lvKey]++;
      item[expKey] = 0;
      if (item[lvKey] > 0 && item[holeKey] < 0) item[holeKey] = 0;
      leveledUp = true;
    }
  } else {
    p.sendMessage(0, "O nível da broca não é adequado para abrir o furo.");
  }
  p.storeBag.updateItem(item);
  const out = new GSPacket(217, p.id);
  out.writeByte(0);
  out.writeBoolean(leveledUp);
  out.writeInt(hole);
  p.send(out);
}

/**
 * ItemTrendHandle.cs (120 ITEM_TREND): converts an owned equip between "trend" (tendency) variants listed in the
 * Item_Refinery reward chain, or buys the training device (item 34101) outright when `num === -1`. The game's
 * `Item_Refinery` table has 0 rows in the source .bak (never configured on this server, in the original too), so
 * this is live code that is currently always a no-op (RefineryMgr.RefineryTrend never finds a match) — same
 * observable behaviour as the original with an empty config.
 */
export async function itemTrend(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const bagType = pkt.readInt();
  const place = pkt.readInt();
  const bagType2 = pkt.readInt();
  const num = pkt.readInt();
  const operation = pkt.readInt();
  let catalyst: ItemInfo | null = null;
  if (num === -1) {
    pkt.readInt(); pkt.readInt(); // unused ints (gold/display, the original never prices this branch either)
    const tpl = ctx.templates.findItem(34101);
    if (!tpl) return;
    catalyst = ItemInfo.createFromTemplate(tpl, 1, 102, ctx.now());
    const shop = ctx.templates.shopByTemplate(34101).find((s) => s.APrice1 === -1 && s.AValue1 !== 0);
    const money = shop?.AValue1 ?? 0;
    if (!(money <= p.info.Money + p.info.MoneyLock)) return;
    p.removeMoney(money);
    catalyst.ValidDate = shop?.AUnit ?? 0;
  } else {
    catalyst = p.getInventory(bagType2)?.getItemAt(num) ?? null;
  }
  const item = p.getInventory(bagType)?.getItemAt(place);
  if (!catalyst || !item) return;
  const newTemplateId = ctx.templates.refineryTrend(operation, item.TemplateID);
  const newTpl = newTemplateId != null ? ctx.templates.findItem(newTemplateId) : undefined;
  if (newTpl) {
    const res = ItemInfo.createFromTemplate(newTpl, 1, 115, ctx.now());
    const inv = p.getItemInventory(newTpl);
    if (inv?.addItem(res, inv.beginSlot)) {
      inv.updateItem(res);
      p.getInventory(bagType)?.removeItem(item);
      catalyst.Count--;
      if (num !== -1) p.getInventory(bagType2)?.updateItem(catalyst); // num === -1: a virtual, never-stored catalyst
      p.sendMessage(0, ctx.lang.t("ItemTrendHandle.Success"));
    } else {
      p.sendMessage(0, ctx.lang.t("ItemFusionHandler.NoPlace"));
    }
    return;
  }
  p.sendMessage(0, ctx.lang.t("ItemTrendHandle.Fail"));
}

export function registerForge(r: HandlerRegistry): void {
  r.player(59, "ITEM_STRENGTHEN", (ctx, p, pkt) => strengthen(ctx, p, pkt), "partial");
  r.player(58, "ITEM_COMPOSE", (ctx, p, pkt) => compose(ctx, p, pkt), "partial");
  r.player(78, "ITEM_FUSION", (ctx, p, pkt) => fusion(ctx, p, pkt));
  r.player(121, "ITEM_INLAY", (ctx, p, pkt) => inlay(ctx, p, pkt));
  r.player(125, "ITEM_EMBED_BACKOUT", (ctx, p, pkt) => embedBackout(ctx, p, pkt));
  r.player(122, "CLEAR_STORE_BAG", (ctx, p) => clearStoreBag(ctx, p));
  r.player(217, "OPEN_FIVE_SIX_HOLE", (ctx, p, pkt) => openFiveSixHole(ctx, p, pkt));
  r.player(120, "ITEM_TREND", (ctx, p, pkt) => itemTrend(ctx, p, pkt));
  // Confirmed dead in the original vendor/DDTank41 (no [PacketHandler] class anywhere carries these codes — a
  // later-client (6600+) feature set never wired into the 4.1 server): 61 ITEM_TRANSFER, 95 NECKLACE_STRENGTH,
  // 106 WISHBEADEQUIP, 133 LATENT_ENERGY, 138 ITEM_ADVANCE, 209 FIGHT_SPIRIT, 295 STORE_FINE_SUIT, 391 EQUIP_GHOST.
  for (const [code, name] of [[61, "ITEM_TRANSFER"], [95, "NECKLACE_STRENGTH"], [106, "WISHBEADEQUIP"], [133, "LATENT_ENERGY"],
    [138, "ITEM_ADVANCE"], [209, "FIGHT_SPIRIT"], [295, "STORE_FINE_SUIT"], [391, "EQUIP_GHOST"]] as [number, string][]) {
    r.player(code, name, () => undefined, "stub");
  }
}
