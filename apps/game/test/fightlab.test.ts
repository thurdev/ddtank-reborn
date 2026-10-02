import { describe, expect, it } from "vitest";
import { fightLabDrop, initFightLabPermission, isFightLabPermission, setFightLabPermission } from "../src/game/fightlab.js";

describe("fight lab permissions (GamePlayer.SetFightLabPermission)", () => {
  it("measure-space simple win unlocks normal and pays once", () => {
    let p = initFightLabPermission();
    expect(isFightLabPermission(p, 1000, 0)).toBe(true);
    expect(isFightLabPermission(p, 1000, 1)).toBe(false);
    expect(isFightLabPermission(p, 1001, 0)).toBe(false);
    const r = setFightLabPermission(p, 1000, 0);
    expect(r.reward).toBe(true);
    p = r.perm;
    expect(p.slice(0, 2)).toBe("21");
    expect(isFightLabPermission(p, 1000, 1)).toBe(true);
    // winning simple again: no second reward
    expect(setFightLabPermission(p, 1000, 0).reward).toBe(false);
  });

  it("measure-space normal win opens 20°/65°/high-throw simple; hard is the top level", () => {
    let p = setFightLabPermission(initFightLabPermission(), 1000, 0).perm;
    const r = setFightLabPermission(p, 1000, 1);
    expect(r.reward).toBe(true);
    p = r.perm;
    expect(p.slice(0, 8)).toBe("32101010");
    expect(isFightLabPermission(p, 1001, 0)).toBe(true);
    expect(isFightLabPermission(p, 1004, 0)).toBe(false);
    const h = setFightLabPermission(p, 1000, 2);
    expect(h.reward).toBe(true);
    expect(h.perm.slice(0, 2)).toBe("33");
    expect(setFightLabPermission(h.perm, 1000, 2).reward).toBe(false);
  });

  it("winning a level that is not the current max changes nothing", () => {
    const p = setFightLabPermission(initFightLabPermission(), 1000, 0).perm;
    expect(setFightLabPermission(p, 1000, 0)).toEqual({ perm: p, reward: false });
  });

  it("FightLabUserDrop gives every row of the condition-14 drop", () => {
    const t = {
      findDropCondition: (type: number, a: string, b: string) => (type === 14 && a === "101" && b === "1" ? 10000 : 0),
      dropItems: new Map([[10000, [
        { ItemId: 11107, BeginData: 100, EndData: 100, IsBind: true, ValueDate: 0 },
        { ItemId: -100, BeginData: 500, EndData: 600, IsBind: true, ValueDate: 0 },
      ]]]),
    };
    const d = fightLabDrop(t, 101, () => 0);
    expect(d.map((x) => [x.templateId, x.count])).toEqual([[11107, 100], [-100, 500]]);
    expect(fightLabDrop(t, 102)).toEqual([]);
  });
});
