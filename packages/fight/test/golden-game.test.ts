/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DotNetRandom, analyticAim, criticalDamage, f32, hertAddition, nextWind, shellDamage, turnDelay, turnTime, vane } from "../src/index.js";
import { loadPackedAssets } from "../src/node.js";

const V: any = JSON.parse(readFileSync(new URL("./golden/vectors.json", import.meta.url), "utf8"));
const assets = loadPackedAssets();

describe("turn/wind formulas", () => {
  it("GetVane", () => {
    for (const [w, a, b, c] of V.vane) expect([vane(w, 1), vane(w, 2), vane(w, 3)]).toEqual([a, b, c]);
  });
  it("getTurnTime", () => {
    for (const [t, s] of V.turnTime) expect(turnTime(t)).toBe(s);
  });
  it("GetTurnDelay", () => {
    for (const [ag, at, d] of V.turnDelay) expect(turnDelay(ag, at)).toBe(d);
  });
  it.each(V.wind as object[])("GetNextWind seed $seed", (c: any) => {
    const rng = new DotNetRandom(c.seed);
    const s = { wind: 0, nextWind: 0, frozen: false };
    for (const w of c.seq) {
      s.wind = nextWind(s, rng);
      expect(s.wind).toBe(f32(w));
    }
  });
});

describe("damage (SimpleBomb.MakeDamage)", () => {
  it.each(V.damage.map((d: object, i: number) => ({ i, ...d })) as object[])("#$i", (c: any) => {
    const [baseDamage, attack, grade, lucky, plus, minus, ignore, wb] = c.owner;
    const [baseGuard, defence, addArmor, p7, str, tx, ty] = c.target;
    const ball = assets.ball(c.ballId)!;
    const dist = Math.sqrt((tx - c.bomb[0]) ** 2 + (ty - c.bomb[1]) ** 2);
    const got = shellDamage(
      { baseDamage, attack, grade, lucky, currentDamagePlus: f32(plus), currentShootMinus: f32(minus), ignoreArmor: !!ignore, worldBossAddDamage: wb },
      { baseGuard, defence, armorBonus: addArmor ? hertAddition(p7, str) : 0 },
      dist,
      ball.radii,
    );
    expect(got).toBe(c.damage);
  });
  // m2-batalha (research/6600/packets-m1.md "M2 batalha"): 6600's SimpleBomb.MakeDamage adds the target's
  // MagicAttack to the attacker's effective attack and the target's own MagicDefence to its defence
  // (Living.cs:1169-1313, 6600); 4.1 never had the field (zero occurrences in vendor/DDTank41/Game.Logic
  // except a commented-out copy of this exact formula in PetEffects/Element/Actives/AE1436.cs:158-159).
  // Every real item today has MagicAttack=MagicDefence=0 (migration 0013's default, nothing populates a
  // non-zero value yet) — these two tests are the "prove it with a test" the task asked for.
  it("magicAttack/magicDefence omitted (today's real data, both clients): byte-identical to the golden vectors above", () => {
    for (const d of V.damage as object[]) {
      const c = d as { owner: number[]; target: number[]; ballId: number; bomb: number[]; damage: number };
      const [baseDamage, attack, grade, lucky, plus, minus, ignore, wb] = c.owner;
      const [baseGuard, defence, addArmor, p7, str, tx, ty] = c.target;
      const ball = assets.ball(c.ballId)!;
      const dist = Math.sqrt((tx - c.bomb[0]) ** 2 + (ty - c.bomb[1]) ** 2);
      const withMagicZero = shellDamage(
        { baseDamage, attack, grade, lucky, currentDamagePlus: f32(plus), currentShootMinus: f32(minus), ignoreArmor: !!ignore, worldBossAddDamage: wb },
        { baseGuard, defence, armorBonus: addArmor ? hertAddition(p7, str) : 0, magicAttack: 0, magicDefence: 0 },
        dist, ball.radii,
      );
      expect(withMagicZero).toBe(c.damage);
    }
  });
  it("magicAttack/magicDefence non-zero: changes bomb damage (6600 SimpleBomb.MakeDamage) but NOT melee (Living.MakeDamage, no magic read there)", () => {
    const a = { baseDamage: 1000, attack: 300, grade: 20, lucky: 50, currentDamagePlus: 1, currentShootMinus: 1, ignoreArmor: false };
    const bomb = shellDamage(a, { baseGuard: 100, defence: 100 }, 0, 50);
    const bombMagic = shellDamage(a, { baseGuard: 100, defence: 100, magicAttack: 200, magicDefence: 150 }, 0, 50);
    expect(bombMagic).not.toBe(bomb); // target's MagicAttack raises the attacker's effective attack, MagicDefence raises its own defence
    const melee = shellDamage(a, { baseGuard: 100, defence: 100 }, null, 0, true);
    const meleeMagic = shellDamage(a, { baseGuard: 100, defence: 100, magicAttack: 200, magicDefence: 150 }, null, 0, true);
    expect(meleeMagic).toBe(melee); // melee path never reads magicAttack/magicDefence
  });
  it.each(V.crit as object[])("critical seed $seed", (c: any) => {
    const rng = new DotNetRandom(c.seed);
    const res = c.res.map((_: number, i: number) => criticalDamage(rng, c.lucky, 100 + i * 37, { targetReduce: c.reduce, guildAddCritical: c.addCrit }));
    expect(res).toEqual(c.res);
  });
});

describe("analytic aim (Living.GetShootForceAndAngle)", () => {
  it.each(V.aim as object[])("map $mapId wind $wind10", (c: any) => {
    const info = assets.maps.get(c.mapId)!;
    const ball = assets.ball(0)!;
    const [x, y, dir] = c.pos;
    const sp = dir <= 0 ? { x: x - 15 - 30, y: y - 20 - 20 } : { x: x + 15 + 30, y: y - 20 - 20 };
    const wind = f32(c.wind10 / 10);
    const r = analyticAim(c.target[0] - sp.x, c.target[1] - sp.y, {
      mass: ball.mass, airResistance: f32(info.dragIndex * ball.dragIndex), gravity: f32(f32(info.weight * ball.weight) * ball.mass), windForce: f32(wind * ball.wind),
      direction: dir, time: f32(c.time),
    });
    expect([sp.x, sp.y, r?.force ?? 0, r?.angle ?? 0]).toEqual(c.out);
  });
});
