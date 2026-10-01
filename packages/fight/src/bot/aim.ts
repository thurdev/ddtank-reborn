import type { BallInfo } from "../data/types.js";
import { f32 } from "../math/num.js";
import { GameMap } from "../phy/map.js";
import { LivingBody, type Physics } from "../phy/physics.js";
import type { Point } from "../phy/rect.js";
import { SimpleBomb } from "../phy/bomb.js";
import { simulateShot } from "../phy/simulate.js";

class Proxy extends LivingBody {
  override collidedByObject(phy: Physics): void {
    if (phy instanceof SimpleBomb) phy.bomb();
  }
}

export interface AimRequest {
  map: GameMap;
  ball: BallInfo;
  /** shooter centre and team */
  from: { x: number; y: number; team: number; bound: { x: number; y: number; width: number; height: number } };
  /** point to hit (target centre) */
  target: Point;
  /** wind actually assumed by the solver (lets bots "misread" it); default = map.wind */
  wind?: number;
  /** other bodies (players) that can block/receive the shot */
  bodies?: { id: number; x: number; y: number; team: number; bound: { x: number; y: number; width: number; height: number } }[];
  /** elevation range (deg) */
  minElevation?: number;
  maxElevation?: number;
  maxForce?: number;
}

export interface AimSolution {
  angle: number;
  force: number;
  direction: number;
  muzzle: Point;
  impact: Point;
  flightTime: number;
  /** distance from impact to the target point */
  miss: number;
}

/** Player muzzle (Living.GetShootPoint, Living.cs:1062) for a given direction. */
export function muzzlePoint(from: AimRequest["from"], direction: number): Point {
  return direction <= 0 ? { x: from.x + from.bound.x - 30, y: from.y + from.bound.y - 20 } : { x: from.x - from.bound.x + 30, y: from.y + from.bound.y - 20 };
}

/**
 * Bot aim solver (02-bots.md §2.3): searches angle × force with the REAL integrator (`simulateShot`, same as the
 * server) on a private copy of the scene (terrain shared read-only, bodies proxied), so the chosen shot lands where
 * the server will compute it. Returns the lowest-miss solution (ties → shorter flight).
 */
export function solveAim(r: AimRequest): AimSolution | null {
  const sim = new GameMap(r.map.info, r.map.ground, r.map.deadTile);
  sim.wind = r.wind ?? r.map.wind;
  for (const b of r.bodies ?? []) {
    const p = new Proxy(b.id);
    p.team = b.team;
    p.bound = { ...b.bound };
    p.setXY(b.x, b.y);
    sim.addPhysical(p);
  }
  const owner = new Proxy(-2);
  owner.team = r.from.team;
  const dir = r.target.x >= r.from.x ? 1 : -1;
  const muzzle = muzzlePoint(r.from, dir);
  const maxF = r.maxForce ?? 2000;
  let best: AimSolution | null = null;
  const consider = (elev: number) => {
    const angle = dir === 1 ? -elev : -180 + elev;
    const shot = (force: number) => {
      const s = simulateShot({ map: sim, ball: r.ball, x: muzzle.x, y: muzzle.y, force, angle, owner });
      return { s, miss: Math.hypot(s.x - r.target.x, s.y - r.target.y), over: (s.x - r.target.x) * dir };
    };
    let lo = 50;
    let hi = maxF;
    let bestHere: { s: ReturnType<typeof simulateShot>; miss: number; force: number } | null = null;
    for (let it = 0; it < 14 && hi - lo > 2; it++) {
      const mid = Math.round((lo + hi) / 2);
      const res = shot(mid);
      if (!bestHere || res.miss < bestHere.miss) bestHere = { s: res.s, miss: res.miss, force: mid };
      // flew out above/behind or landed short → more force; past the target → less
      if (res.over < 0 && !(res.s.outcome === "flyout" && res.s.y <= 0)) lo = mid;
      else hi = mid;
    }
    if (bestHere && (!best || bestHere.miss < best.miss - 0.5 || (Math.abs(bestHere.miss - best.miss) <= 0.5 && bestHere.s.lifeTime < best.flightTime)))
      best = { angle, force: bestHere.force, direction: dir, muzzle, impact: { x: bestHere.s.x, y: bestHere.s.y }, flightTime: f32(bestHere.s.lifeTime), miss: bestHere.miss };
  };
  const lo = r.minElevation ?? 5;
  const hi = r.maxElevation ?? 85;
  for (let e = lo; e <= hi; e += 4) consider(e);
  const coarse = best as AimSolution | null;
  if (coarse) {
    const e0 = dir === 1 ? -coarse.angle : coarse.angle + 180;
    for (let e = Math.max(lo, e0 - 3); e <= Math.min(hi, e0 + 3); e++) if (e !== e0) consider(e);
  }
  return best;
}
