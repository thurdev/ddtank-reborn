import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ActionType, BombAction, DotNetRandom, EulerVector, LivingBody, SimpleBomb, f32, getBallType, simulateShot } from "../src/index.js";
import { loadPackedAssets } from "../src/node.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const V: any = JSON.parse(readFileSync(new URL("./golden/vectors.json", import.meta.url), "utf8"));
const assets = loadPackedAssets();
const sha = (d: Uint8Array) => createHash("sha256").update(d).digest("hex");

class Body extends LivingBody {
  constructor(id: number, team: number) {
    super(id);
    this.team = team;
    this.setRect(-15, -20, 30, 30);
  }
  override collidedByObject(phy: unknown): void {
    if (phy instanceof SimpleBomb) phy.bomb();
  }
}

describe("System.Random port", () => {
  it.each(V.random)("seed $seed", (c: { seed: number; next: number[]; max100: number[]; range: number[]; dbl: number[] }) => {
    const r = new DotNetRandom(c.seed);
    expect(c.next.map(() => r.next())).toEqual(c.next);
    expect(c.max100.map(() => r.nextMax(100))).toEqual(c.max100);
    expect(c.range.map(() => r.nextRange(-40, 40))).toEqual(c.range);
    expect(c.dbl.map(() => r.nextDouble())).toEqual(c.dbl);
  });
});

describe("EulerVector (float32)", () => {
  it.each(V.euler)("init $init", (c: { init: [number, number]; f: number; steps: number[][] }) => {
    const v = new EulerVector(c.init[0], c.init[1], 0);
    for (const s of c.steps) {
      v.step(10, 2, f32(c.f), f32(0.04));
      expect([v.x0, v.x1, v.x2]).toEqual(s.map(f32));
    }
  });
});

describe("Tile.Dig (crater shapes)", () => {
  it.each(V.digs)("map $mapId", (c: { mapId: number; initial: string; ops: { ball: number; cx: number; cy: number; fore: string }[] }) => {
    const map = assets.createMap(c.mapId);
    expect(sha(map.ground!.data)).toBe(c.initial);
    for (const op of c.ops) {
      map.dig(op.cx, op.cy, assets.shape(op.ball), null);
      expect(sha(map.ground!.data), `dig ${op.ball} @${op.cx},${op.cy}`).toBe(op.fore);
    }
  });
});

describe("Map walking / ground search", () => {
  it("matches FindYLineNotEmptyPointDown/Up and FindNextWalkPoint", () => {
    for (const c of V.walk) {
      const map = assets.createMap(c.mapId);
      const down = map.findYLineNotEmptyPointDown(c.x, c.y);
      expect([down.x, down.y]).toEqual(c.down);
      const up = map.findYLineNotEmptyPointUp(c.x, c.y, 200);
      expect([up.x, up.y]).toEqual(c.up);
      let p = down;
      const walk: number[][] = [];
      for (let s = 0; s < 30 && !(p.x === 0 && p.y === 0); s++) {
        p = map.findNextWalkPoint(p.x, p.y, c.dir, 3, 7);
        walk.push([p.x, p.y]);
      }
      expect(walk).toEqual(c.walk);
    }
  });
});

describe("projectile trajectories (SimpleBomb.StartMoving)", () => {
  it(`has ≥ 20 cases`, () => expect(V.trajectories.length).toBeGreaterThanOrEqual(20));
  it.each(V.trajectories.map((t: object, i: number) => ({ i, ...t })))(
    "#$i map $mapId ball $ballId wind $wind10 angle $angle force $force x$bombCount",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => {
      const map = assets.createMap(c.mapId);
      map.wind = c.wind10 / 10;
      const shooter = new Body(1, 1);
      shooter.setXY(c.shooter[0], c.shooter[1]);
      shooter.direction = c.shooter[2];
      map.addPhysical(shooter);
      for (const [id, x, y, team] of c.targets) {
        const t = new Body(id, team);
        t.setXY(x, y);
        map.addPhysical(t);
      }
      // Living.GetShootPoint for a player
      const muzzle = shooter.direction <= 0 ? [shooter.x + shooter.bound.x - 30, shooter.y + shooter.bound.y - 20] : [shooter.x - shooter.bound.x + 30, shooter.y + shooter.bound.y - 20];
      expect(muzzle).toEqual(c.muzzle);
      const ball = assets.ball(c.ballId)!;
      c.bombs.forEach((b: { vx: number; vy: number; x: number; y: number; lifeTime: number; digMap: boolean; actions: number[][]; victims: number[]; temp: number[][]; fore: string }, i: number) => {
        let victims: number[] = [];
        const r = simulateShot({
          map, ball, shape: assets.shape(c.ballId), x: muzzle[0], y: muzzle[1], force: c.force, angle: c.angle, bombIndex: i,
          owner: shooter, controlled: c.controlled, id: 100 + i,
          bombImp: (bomb) => {
            victims = map.findHitByHitPoint(bomb.getCollidePoint(), bomb.radius).map((l) => l.id);
            if (bomb.digMap) map.dig(bomb.x, bomb.y, bomb.shape, null);
            bomb.actions.push(new BombAction(bomb.lifeTime, ActionType.BOMB, bomb.x, bomb.y, bomb.digMap ? 1 : 0, 0));
            bomb.die();
          },
        });
        expect([r.vx, r.vy]).toEqual([b.vx, b.vy]);
        expect(r.actions.map((a) => [a.timeInt, a.type, a.param1, a.param2, a.param3, a.param4])).toEqual(b.actions);
        expect([r.x, r.y, r.lifeTime, r.digMap]).toEqual([b.x, b.y, f32(b.lifeTime), b.digMap]);
        expect(victims).toEqual(b.victims);
        expect(r.tempPoints.map((p) => [p.x, p.y])).toEqual(b.temp);
        expect(map.ground ? sha(map.ground.data) : "").toBe(b.fore);
      });
      expect(getBallType(c.ballId)).toBeTypeOf("number");
    },
  );
});
