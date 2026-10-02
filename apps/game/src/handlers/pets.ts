/**
 * 68 PET (PetHandler.cs → PetLogicProcessor, byte sub = PetPackageType; Game.Server/Pet/Handle/*.cs) and 216 CARDS_DATA
 * (CardDataHandler.cs). Logic in game/pets.ts and game/cards.ts; 68/1 and 216 replies via GamePlayer.flushPets/flushCards.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../game/player.js";
import type { ServerContext } from "../session/context.js";
import { cfgNum, createPet, feedPet, reduceProp } from "../game/pets.js";
import { moveOrEquipCard, upgradeCard, type CardUpdateRowFull } from "../game/cards.js";
import { loadUserPets } from "../db/pets-cards.js";
import * as Out from "../packets/out.js";
import type { HandlerRegistry } from "./registry.js";

/** PetInventory.MaxLevelByGrade = min(player level, Pet_Config MaxLevel). */
export function petMaxLevelByGrade(ctx: ServerContext, p: GamePlayer): number {
  return Math.min(p.info.Grade, cfgNum(ctx.templates.pets, "MaxLevel", 50));
}

function petsChanged(p: GamePlayer, stats: boolean): void {
  p.pet = p.petBag.equipped();
  p.flushPets();
  if (stats) p.updatePlayerProperties();
}

export async function petCommand(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const t = ctx.lang.t.bind(ctx.lang);
  const T = ctx.templates.pets;
  const sub = pkt.readByte();
  ctx.log.debug(`pet ${p.id} sub ${sub}`);
  // PetHandler.HandlePacket: grade < 25 (Pet_Config LimitGrade) → "not open"
  if (p.info.Grade < cfgNum(T, "LimitGrade", 25)) return p.sendMessage(0, t("PetHandler.Msg23"));
  const bag = p.petBag;
  switch (sub) {
    case 1: {
      // UpdatePet: int userId — online bag or Sys_Users_Pet
      const uid = pkt.readInt();
      const other = uid === p.id ? p : ctx.world.get(uid);
      const pets = other ? other.petBag.getPets() : await loadUserPets(ctx.db.db, uid);
      const slots = pets.map((pet) => ({ place: pet.Place, pet: { ...pet, PetHappyStarReduce: (v: number) => reduceProp(pet, v) } }));
      p.send(Out.updateUserPet(uid, p.zoneId, slots, other?.petBag.eat ?? { weaponLevel: 0, clothesLevel: 0, hatLevel: 0 }));
      return;
    }
    case 2: {
      // AddPet: int place, int bagType — hatch an egg (template = item Property5)
      const place = pkt.readInt();
      const bagType = pkt.readInt();
      const slot = bag.findFirstEmptySlot();
      if (slot === -1) return p.sendMessage(0, t("PetHandler.Msg3"));
      const inv = p.getInventory(bagType);
      const it = inv?.getItemAt(place) ?? null;
      const info = it ? T.templates.get(it.template.Property5) : undefined;
      if (!inv || !it || !info) return p.sendMessage(0, t("PetHandler.Msg4"));
      const pet = createPet(T, info, p.id, slot, petMaxLevelByGrade(ctx, p), p.info.VIPLevel);
      pet.BaseProp = JSON.stringify({ ...pet, dirty: undefined });
      if (!inv.removeCountFromStack(it, 1)) return;
      bag.addPetTo(pet, slot);
      if (info.StarLevel > 4) {
        const msg = t("PetHandler.Msg5", p.info.NickName, info.Name, info.StarLevel);
        for (const o of ctx.world.all()) o.sendMessage(0, msg);
      } else p.sendMessage(0, t("PetHandler.Msg6", info.Name, info.StarLevel));
      p.flushPets();
      p.send(Out.petAdded(info.TemplateID));
      void p.saveIntoDatabase(ctx.db.db).catch((e) => ctx.log.warn(`pet save: ${e}`));
      return;
    }
    case 4: {
      // FeedPet: int itemPlace, int bagType, int petPlace. Fixed: the original always consumed from the StoreBag.
      const itemPlace = pkt.readInt();
      const inv = p.getInventory(pkt.readInt());
      const pet = bag.getPetAt(pkt.readInt());
      const it = inv?.getItemAt(itemPlace) ?? null;
      if (!inv || !it) return p.sendMessage(0, t("PetHandler.Msg9"));
      if (!pet) return;
      const r = feedPet(T, pet, {
        TemplateID: it.TemplateID, Count: it.Count, Property1: it.template.Property1, Property2: it.template.Property2,
        DefendCompose: it.DefendCompose, holes: [it.Hole1, it.Hole2, it.Hole3, it.Hole4, it.Hole5], Blood: (it as unknown as { Blood?: number }).Blood ?? 0,
      }, petMaxLevelByGrade(ctx, p), p.info.VIPLevel);
      if (r.consume > 0) {
        if (it.TemplateID === 334100) inv.removeItem(it);
        else inv.removeCountFromStack(it, Math.min(r.consume, it.Count));
      }
      if (r.ok) bag.changed.add(pet.Place);
      petsChanged(p, r.ok);
      if (r.msg) p.sendMessage(0, t(...r.msg));
      return;
    }
    case 7: {
      // EquipSkillPet: int place, int skillId, int slot (slot 4 needs VIP 7)
      const place = pkt.readInt(), skillId = pkt.readInt(), slot = pkt.readInt();
      if (slot === 4 && p.info.VIPLevel < 7) return p.sendMessage(0, t("PetHandler.Msg181"));
      const r = bag.equipSkill(place, skillId, slot);
      if (r.msg) p.sendMessage(0, t(r.msg));
      petsChanged(p, false);
      return;
    }
    case 8: {
      // ReleasePet: int place — WashGetCount × 12656 by mail (not ported: no item mail helper here → bag)
      const pet = bag.getPetAt(pkt.readInt());
      if (!pet || !bag.removePet(pet)) return;
      const info = T.templates.get(pet.TemplateID);
      const wash = info?.WashGetCount ?? 0;
      const tpl = wash > 0 ? ctx.templates.findItem(12656) : undefined;
      if (tpl) {
        const { ItemInfo } = await import("../game/item.js");
        const item = ItemInfo.createFromTemplate(tpl, wash, 105, ctx.now());
        item.IsBinds = true;
        if (!p.getItemInventory(tpl)?.addTemplate(item, wash)) p.tempBag.addTemplate(item, wash);
      }
      p.sendMessage(0, t("PetHandler.Msg19"));
      petsChanged(p, pet.IsEquip);
      p.updatePlayerProperties();
      return;
    }
    case 9: {
      // RenamePet: int place, str name — Pet_Config ChangeNameCost Money (MoneyDirect)
      const place = pkt.readInt();
      const name = pkt.readString().trim().slice(0, 32);
      const cost = cfgNum(T, "ChangeNameCost", 1900);
      if (!name || !bag.getPetAt(place)) return;
      if (p.info.Money + p.info.MoneyLock < cost) return p.sendMessage(0, t("UserBuyItemHandler.Money"));
      p.removeMoney(cost);
      bag.renamePet(place, name);
      p.sendMessage(0, t("PetHandler.Msg20"));
      petsChanged(p, false);
      return;
    }
    case 17: {
      // FightPet: int place, bool equip — battle pet (level must fit the player cap, hunger > 0)
      const place = pkt.readInt();
      const equip = pkt.readBoolean();
      const pet = bag.getPetAt(place);
      if (!pet) return;
      if (pet.Level > petMaxLevelByGrade(ctx, p) && !pet.IsEquip) return p.sendMessage(0, t("PetHandler.Msg21"));
      if (!bag.equipPet(place, equip)) return p.sendMessage(0, t("PetHandler.Msg22"));
      petsChanged(p, true);
      return;
    }
    default:
      ctx.log.debug(`pet sub ${sub} not ported`);
  }
}

/** CardDataHandler (216): int cmd — 0 move/equip/unequip, 1 open vice slot, 2 open card box, 3 upgrade, 4 sort (no-op). */
export function cardCommand(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const bag = p.cardBag;
  const cmd = pkt.readInt();
  let stats = false;
  switch (cmd) {
    case 0: {
      const r = moveOrEquipCard(bag, pkt.readInt(), pkt.readInt());
      stats = r.changedStats;
      if (r.msg) p.sendMessage(0, r.msg);
      break;
    }
    case 1: {
      // open a vice slot: placeholder card 314101 with Count −1 (CardDataHandler case 1)
      const place = pkt.readInt();
      if (place < 0 || place >= 5 || bag.getItemAt(place)) break;
      bag.addCardTo({ CardID: 0, UserID: p.id, TemplateID: 314101, Place: place, Count: -1, Attack: 0, Defence: 0, Agility: 0, Luck: 0, Guard: 0, Damage: 0, AttackReset: 0, DefenceReset: 0, AgilityReset: 0, LuckReset: 0, Level: 0, CardGP: 0, isFirstGet: true }, place);
      break;
    }
    case 2: {
      // open a card box (EquipBag slot): Property5 = card template (category 26); count + rand(1,3) per box
      const slot = pkt.readInt();
      const count = pkt.readInt();
      const it = p.equipBag.getItemAt(slot);
      const card = it ? ctx.templates.findItem(it.template.Property5) : undefined;
      if (!it || count <= 0 || count > it.Count || !card || card.CategoryID !== 26) {
        p.sendMessage(0, "Thẻ bài không tồn tại.");
        return;
      }
      const n = it.Count;
      if (!p.equipBag.removeCountFromStack(it, n)) return;
      let total = n;
      for (let i = 0; i < n; i++) total += 1 + Math.floor(Math.random() * 2);
      bag.addCard(card.TemplateID, total);
      break;
    }
    case 3: {
      const k = ctx.templates;
      const r = upgradeCard(bag, pkt.readInt(), (lv) => k.cardConditions.get(lv), (tpl, lv) => k.cardUpdates.get(`${tpl}:${lv}`) as CardUpdateRowFull | undefined, k.cardMaxLevel || 30);
      if (r.msg) p.sendMessage(0, r.msg);
      stats = r.levelUp;
      break;
    }
    default:
      break; // 4 sort: reads two ints and does nothing in the original
  }
  p.cards = bag.equipped();
  p.flushCards();
  if (stats) p.updatePlayerProperties();
}

export function registerPets(r: HandlerRegistry): void {
  r.player(68, "PET", (ctx, p, pkt) => petCommand(ctx, p, pkt), "partial");
  r.player(216, "CARDS_DATA", (ctx, p, pkt) => cardCommand(ctx, p, pkt));
}
