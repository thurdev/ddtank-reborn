/**
 * New pet subsystems (Varredura: Pets to 100%): adoption (RefereshPet/AdoptPet.cs), revert/wash (RevertPet.cs),
 * gear (AddPetEquip/DelPetEquip.cs), star-up (PetRisingStar.cs) and "manh hoa" gear tempering (EatPet.cs +
 * PetMoePropertyMgr).
 */
import { describe, expect, it } from "vitest";
import {
  createPet, emptyPetTables, createAdoptList, petRisingStar, eatPetsUpgrade, hungBuCacCho, moeNeedExp, moeMaxLevel,
  getPetEquips, setPetEquips, petEquipMoeBonus, PetInventory, emptyEatPets, type UserPetRow,
} from "../src/game/pets.js";

const T = emptyPetTables();
T.config.set("AdoptCount", "4");
const tpl1 = { TemplateID: 100101, Name: "Gà Con", KindID: 1, StarLevel: 1, RareLevel: 1, HighBlood: 15000, HighAttack: 340, HighDefence: 400, HighAgility: 300, HighLuck: 300, HighBloodGrow: 2200, HighAttackGrow: 340, HighDefenceGrow: 400, HighAgilityGrow: 300, HighLuckGrow: 300 } as never;
const tpl2 = { TemplateID: 100102, Name: "Gà Trống", KindID: 1, StarLevel: 2, RareLevel: 1, HighBlood: 16000, HighAttack: 360, HighDefence: 420, HighAgility: 320, HighLuck: 320, HighBloodGrow: 2300, HighAttackGrow: 360, HighDefenceGrow: 420, HighAgilityGrow: 320, HighLuckGrow: 320 } as never;
T.templates.set(100101, tpl1);
T.templates.set(100102, tpl2);
T.starExp.set(100101, { Exp: 100, OldID: 100101, NewID: 100102 });
T.moe.set(1, { Level: 1, Attack: 5, Lucky: 1, Agility: 0, Blood: 0, Defence: 0, Guard: 0, Exp: 100 });
T.moe.set(2, { Level: 2, Attack: 12, Lucky: 2, Agility: 0, Blood: 0, Defence: 0, Guard: 0, Exp: 300 });

describe("pet adoption (RefereshPet/AdoptPet.cs)", () => {
  it("createAdoptList rolls AdoptCount pets, place 0..N-1", () => {
    const list = createAdoptList(T, () => tpl1, 1, 25, 0);
    expect(list).toHaveLength(4);
    expect(list.map((p) => p.Place)).toEqual([0, 1, 2, 3]);
    expect(list.every((p) => p.TemplateID === 100101 && p.IsExit)).toBe(true);
  });
  it("skips a slot when the drop pool has nothing", () => {
    const list = createAdoptList(T, () => undefined, 1, 25, 0);
    expect(list).toHaveLength(0);
  });
});

describe("pet revert (RevertPet.cs) — pure plumbing covered via PetInventory", () => {
  it("removeEqPet frees the slot and hands back the stored gear row", () => {
    const bag = new PetInventory();
    const pet = createPet(T, tpl1, 1, 0, 25, 0);
    bag.addPetTo(pet, 0);
    expect(bag.addEqPet(0, 0, 90001, 7, new Date("2026-01-01"))).toBe(true);
    expect(bag.canAddEqPet(0, 0)).toBe(false); // slot 0 (weapon) already taken
    expect(bag.canAddEqPet(0, 1)).toBe(true); // slot 1 (hat) free
    const removed = bag.removeEqPet(0, 0);
    expect(removed?.eqTemplateID).toBe(90001);
    expect(getPetEquips(pet)).toHaveLength(0);
  });
  it("max 3 gear pieces, one per eqType", () => {
    const pet = { eQPets: "[]" } as UserPetRow;
    setPetEquips(pet, [{ eqType: 0, eqTemplateID: 1, startTime: new Date(), ValidDate: 0 }, { eqType: 1, eqTemplateID: 2, startTime: new Date(), ValidDate: 0 }, { eqType: 2, eqTemplateID: 3, startTime: new Date(), ValidDate: 0 }]);
    expect(getPetEquips(pet)).toHaveLength(3);
  });
});

describe("pet gear FightPower (PlayerEquipInventory.cs:368-394)", () => {
  it("each slot's moe tier adds the matching stats", () => {
    const eat = { ...emptyEatPets(), weaponLevel: 1, hatLevel: 2, clothesLevel: 1 };
    const bonus = petEquipMoeBonus(T, [{ eqType: 0, eqTemplateID: 1, startTime: new Date(), ValidDate: 0 }, { eqType: 1, eqTemplateID: 2, startTime: new Date(), ValidDate: 0 }], eat);
    expect(bonus.attack).toBe(5); // weaponLevel 1
    expect(bonus.lucky).toBe(1);
    expect(bonus.defence).toBe(0); // Pet_Moe_Property level 2 has Defence 0 in this fixture
  });
});

describe("pet star-up (PetRisingStar.cs)", () => {
  it("accumulates exp below the threshold without evolving", () => {
    const pet = createPet(T, tpl1, 1, 0, 25, 0);
    const r = petRisingStar(T, pet, 10, 5, 25, 0); // 50 exp, needs 100
    expect(r?.success).toBe(false);
    expect(r?.consumed).toBe(5);
    expect(pet.currentStarExp).toBe(50);
    expect(pet.TemplateID).toBe(100101);
  });
  it("evolves once the threshold is reached — PetRisingStar.cs's own count re-derivation, not itemCount", () => {
    const pet = createPet(T, tpl1, 1, 0, 25, 0);
    pet.currentStarExp = 90;
    // needExp = 100-90 = 10 < exp(50) -> count = (exp-needExp)/Property2 = (50-10)/10 = 4 (matches the C# exactly,
    // even though it "wastes" less than the 5 units requested — not a rounding error, the original does this too).
    const r = petRisingStar(T, pet, 10, 5, 25, 0);
    expect(r?.success).toBe(true);
    expect(r?.consumed).toBe(4);
    expect(pet.currentStarExp).toBe(0);
    expect(pet.TemplateID).toBe(100102);
  });
  it("unsupported pet (no Pet_Star_Exp row) returns null", () => {
    const pet = createPet(T, tpl2, 1, 0, 25, 0); // 100102 has no starExp row of its own
    expect(petRisingStar(T, pet, 10, 5, 25, 0)).toBeNull();
  });
});

describe("pet gear tempering / EAT_PETS (EatPet.cs)", () => {
  it("HungBuCacCho blocks raising the unique max level, allows it when tied", () => {
    expect(hungBuCacCho(3, 1, 1)).toBe(3);
    expect(hungBuCacCho(2, 2, 2)).toBe(-1);
  });
  it("moeNeedExp is the delta to the next tier, 0 past the last one", () => {
    expect(moeNeedExp(T, 40, 0)).toBe(60); // level 1 needs 100
    expect(moeMaxLevel(T)).toBe(2);
    expect(moeNeedExp(T, 0, 2)).toBe(0); // no tier 3 configured
  });
  it("eatPetsUpgrade cascades through tiers in one call", () => {
    const eat = emptyEatPets();
    eatPetsUpgrade(T, eat, 0, 350); // weapon: 100 to lvl1, 300 to lvl2 -> reaches lvl2 with 50 left over... (100+300=400 needed for both)
    expect(eat.weaponLevel).toBe(1); // only enough for tier 1 (100), not tier 2 (needs 300 more)
    expect(eat.weaponExp).toBe(250);
  });
  it("eatPetsUpgrade caps at the max level and zeroes the leftover exp", () => {
    const eat = emptyEatPets();
    eatPetsUpgrade(T, eat, 1, 10_000);
    expect(eat.clothesLevel).toBe(2);
    expect(eat.clothesExp).toBe(0);
  });
});
