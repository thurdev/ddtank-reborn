import { describe, expect, it } from "vitest";
import { ItemInfo, type ItemTemplate } from "../src/game/item.js";
import { computeStats, emptyStatTables, fightPower, getExercise, getHertAddition, getTotemProp, roundHalfEven } from "../src/game/stats.js";
import { composeChance, strengthenChance } from "../src/handlers/forge.js";
import { createItemBox } from "../src/handlers/use.js";
import type { ItemBoxRow } from "../src/db/templates.js";

const tpl = (o: Partial<ItemTemplate>): ItemTemplate => ({
  TemplateID: 1, CategoryID: 7, Attack: 0, Defence: 0, Agility: 0, Luck: 0, Property1: 0, Property2: 0, Property3: 0, Property4: 0,
  Property5: 0, Property6: 0, Property7: 0, Property8: 0, Hole: "", MaxCount: 1, Level: 3, ...o,
}) as ItemTemplate;

describe("FightPower (GamePlayer.UpdateFightPower / GetBaseAttack)", () => {
  it("getHertAddition uses banker's rounding like Math.Round", () => {
    expect(roundHalfEven(2.5)).toBe(2);
    expect(roundHalfEven(3.5)).toBe(4);
    expect(getHertAddition(257, 0)).toBe(0);
    expect(getHertAddition(257, 5)).toBe(Math.round(257 * 1.1 ** 5 - 257)); // 157
  });

  it("strengthen raises base attack and FightPower", () => {
    const weapon = new ItemInfo(tpl({ TemplateID: 7179, CategoryID: 7, Property7: 257, Attack: 10 }));
    const hat = new ItemInfo(tpl({ TemplateID: 1214, CategoryID: 1, Property7: 60, Defence: 5 }));
    const cloth = new ItemInfo(tpl({ TemplateID: 5251, CategoryID: 5, Property7: 60, Defence: 5 }));
    const equip: (ItemInfo | null)[] = new Array(31).fill(null);
    equip[6] = weapon; equip[0] = hat; equip[4] = cloth;
    const base = { equip, grade: 10, levelBlood: 1000, necklaceExpAdd: 0, totemId: 0, texp: { attTexpExp: 0, defTexpExp: 0, spdTexpExp: 0, lukTexpExp: 0, hpTexpExp: 0 }, cards: [], pet: null, evolutionGrade: 0 };
    const r0 = computeStats(base, emptyStatTables());
    expect(r0.attack).toBe(10);
    expect(r0.defence).toBe(10);
    expect(r0.hp).toBe(1000 + 1);
    expect(r0.baseAttack).toBe(257);
    expect(r0.baseDefence).toBe(120);
    // (sum+1000)*(a^3+3.5 d^3)/1e8 + hp*0.95
    const expected = Math.trunc(((20 + 1000) * (257 ** 3 + 3.5 * 120 ** 3)) / 1e8 + 1001 * 0.95);
    expect(r0.fightPower).toBe(expected);
    weapon.StrengthenLevel = 5;
    const r5 = computeStats(base, emptyStatTables());
    expect(r5.baseAttack).toBe(257 + 157);
    expect(r5.fightPower).toBeGreaterThan(r0.fightPower);
  });

  it("attribute gems (cat 11, P1 31, P2 3) add stats; compose adds to attack", () => {
    const gem = tpl({ TemplateID: 313101, CategoryID: 11, Property1: 31, Property2: 3, Property3: 5, Property7: 7, Property8: 9 });
    const w = new ItemInfo(tpl({ TemplateID: 7000, Property7: 100 }));
    w.Hole1 = 313101; w.AttackCompose = 20;
    const equip: (ItemInfo | null)[] = new Array(31).fill(null);
    equip[6] = w;
    const t = emptyStatTables((id) => (id === 313101 ? gem : undefined));
    const r = computeStats({ equip, grade: 1, levelBlood: 0, necklaceExpAdd: 0, totemId: 0, texp: { attTexpExp: 0, defTexpExp: 0, spdTexpExp: 0, lukTexpExp: 0, hpTexpExp: 0 }, cards: [], pet: null, evolutionGrade: 0 }, t);
    expect(r.attack).toBe(25);
    expect(r.baseAttack).toBe(107);
    expect(r.baseDefence).toBe(9);
  });

  it("second weapon adds Property7 * 1.1^lvl; exercise and totem lookups", () => {
    const sw = new ItemInfo(tpl({ Property7: 100 }));
    sw.StrengthenLevel = 2;
    expect(fightPower({ attack: 0, defence: 0, agility: 0, luck: 0, hp: 0 }, 0, 0, sw)).toBe(121);
    const ex = [{ Grage: 1, GP: 10, ExerciseA: 1, ExerciseAG: 1, ExerciseD: 1, ExerciseH: 1, ExerciseL: 1 }, { Grage: 2, GP: 30, ExerciseA: 2, ExerciseAG: 2, ExerciseD: 2, ExerciseH: 2, ExerciseL: 2 }];
    expect(getExercise(ex, 5, "ExerciseA")).toBe(0);
    expect(getExercise(ex, 20, "ExerciseA")).toBe(1);
    expect(getExercise(ex, 99, "ExerciseA")).toBe(2);
    const totems = new Map([[10001, { ID: 10001, AddAttack: 3, AddDefence: 0, AddAgility: 0, AddLuck: 0, AddBlood: 0, AddDamage: 0, AddGuard: 0 }], [10002, { ID: 10002, AddAttack: 4, AddDefence: 0, AddAgility: 0, AddLuck: 0, AddBlood: 0, AddDamage: 0, AddGuard: 0 }]]);
    expect(getTotemProp(totems, 10002, "AddAttack")).toBe(7);
    expect(getTotemProp(totems, 0, "AddAttack")).toBe(0);
  });
});

describe("Strengthen / compose rates (ItemStrengthenHandler, ItemComposeHandler)", () => {
  it("level 4/5 stones on a +0 item exceed the 10000 roll (always succeed)", () => {
    // Item_Strengthen level 1 Rock = 2: stone lvl 4 = 48 -> 48*100/2 = 2400% -> 240000 > any roll < 10000
    expect(strengthenChance({ stoneLevels: [4], luckP2: null, needRate: 2, smithLevel: 0, vip: false })).toBe(240000);
    expect(strengthenChance({ stoneLevels: [5, 5], luckP2: null, needRate: 227, smithLevel: 0, vip: false })).toBe(Math.floor(((480 * 100) / 227) * 100));
  });
  it("level 1 stone at +8 is a small chance; VIP adds 30%", () => {
    const c = strengthenChance({ stoneLevels: [1], luckP2: null, needRate: 7816, smithLevel: 0, vip: false });
    expect(c).toBe(Math.floor(((0.75 * 100) / 7816) * 100));
    const v = strengthenChance({ stoneLevels: [1], luckP2: null, needRate: 7816, smithLevel: 0, vip: true });
    expect(v).toBe(Math.floor(((0.75 * 100) / 7816) * 1.3 * 100));
  });
  it("compose rate by stone quality, +1% without luck stone", () => {
    expect(composeChance(1, null)).toBe(80.8);
    expect(composeChance(3, 25)).toBe(37.5);
    expect(composeChance(5, null)).toBe(5);
  });
});

describe("ItemBoxMgr.CreateItemBox", () => {
  const row = (o: Partial<ItemBoxRow>): ItemBoxRow => ({ ID: 1, TemplateId: 0, IsSelect: false, IsBind: true, ItemValid: 0, ItemCount: 1, StrengthenLevel: 0, AttackCompose: 0, DefendCompose: 0, AgilityCompose: 0, LuckCompose: 0, Random: 1, IsTips: 0, IsLogs: false, ...o }) as ItemBoxRow;
  it("gives every IsSelect row plus one random row; currencies are special ids", () => {
    const r = createItemBox([row({ TemplateId: -100, ItemCount: 500, IsSelect: true }), row({ TemplateId: 11107, ItemCount: 30, IsSelect: true }), row({ TemplateId: 11020, Random: 5 }), row({ TemplateId: 11021, Random: 5 })], () => 0)!;
    expect(r.gold).toBe(500);
    expect(r.exp).toBe(30);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.row.TemplateId).toBe(11020);
  });
});
