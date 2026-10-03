import type { BallInfo } from "../data/types.js";
import { GameMap, type MapInfo } from "./map.js";
import { simulateShot } from "./simulate.js";
import { Tile } from "./tile.js";

/**
 * Distance unit used by the "Âng. N: Distância | Força" reference tables (DD Clássico style side panels).
 * The client's battlefield canvas is exactly 1000px wide (`MapView.as`: `param1.x >= 0 && param1.x <= 1000`),
 * displayed under a 0..10 ruler (100px/tick) — the AS3 client has no dedicated "ruler"/"distance" class of its
 * own to read a finer unit from (verified: no `Ruler`/`Distance`-named view exists in `Source Flash/src`). The
 * reference tables go to double that resolution (1..20), so this port defines 1 table unit = half a ruler tick
 * = 50px, making distance 20 land exactly on the right edge of the 1000px canvas (and the ruler ticks the Play
 * page draws under the game line up with even table distances: tick N ⇔ distance 2N).
 */
export const DEFAULT_DISTANCE_UNIT_PX = 50;

/** Gravity/drag used when no explicit `map` is given: `weight: 10, dragIndex: 2` — the values 392 of the 393
 *  non-boss (`type & 1`) rows in `data/maps.json` share (the de-facto "standard" server map). */
const DEFAULT_MAP_INFO: MapInfo = { id: -1, name: "aim-table (synthetic flat map)", weight: 10, dragIndex: 2 };

export interface AimTableOptions {
  /** Elevation angles (degrees), e.g. [20, 30, 50, 65]. */
  angles: number[];
  /** Ruler distance units to solve for. Default: 1..20. */
  distances?: number[];
  ball: BallInfo;
  /** Gravity/drag override (merged onto `DEFAULT_MAP_INFO`). */
  map?: Partial<MapInfo>;
  /** px per distance unit. Default `DEFAULT_DISTANCE_UNIT_PX`. */
  distanceUnitPx?: number;
  /** Force search ceiling. Default 2000 (same as `solveAim`). */
  maxForce?: number;
}

export interface AimTableRow {
  angle: number;
  /** Force needed to reach each `distances[i]`, same order/length; `null` when unreachable within `maxForce`. */
  forces: (number | null)[];
}

export interface AimTableResult {
  distances: number[];
  distanceUnitPx: number;
  ball: { id: number; name?: string };
  map: { weight: number; dragIndex: number };
  rows: AimTableRow[];
}

/** Builds a wide, perfectly flat open field: solid ground from `groundY` down, empty above. No craters are dug
 *  (callers never pass `dig: true` to `simulateShot`), so one map/tile is safely reused for every shot. */
function flatMap(info: MapInfo, width: number, groundY: number): GameMap {
  const height = groundY + 200;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = groundY; y < height; y++) {
    const rowOff = y * width * 4;
    for (let x = 0; x < width; x++) rgba[rowOff + x * 4 + 3] = 255;
  }
  const ground = Tile.fromRgba(rgba, width, height, false);
  return new GameMap(info, ground, null);
}

/**
 * Computes, for each angle × distance, the force needed to land a shot at that horizontal ruler distance on
 * flat ground with no wind — using `simulateShot`, the exact same Euler integrator the game server and bots run
 * (`phy/simulate.ts`), so the published tables always match live play. Pure/deterministic: no DB, no RNG, no
 * file I/O (callers supply the `BallInfo` row).
 */
export function computeAimTable(o: AimTableOptions): AimTableResult {
  const distances = o.distances ?? Array.from({ length: 20 }, (_, i) => i + 1);
  const unit = o.distanceUnitPx ?? DEFAULT_DISTANCE_UNIT_PX;
  const maxForce = o.maxForce ?? 2000;
  const mapInfo: MapInfo = { ...DEFAULT_MAP_INFO, ...o.map };
  const maxDistPx = Math.max(...distances) * unit;
  // Generous margin so a high-force/low-angle probe during the binary search never flies off the right edge
  // (that would read as a short "flyout" distance and corrupt the search) before landing.
  const width = Math.ceil(maxDistPx + 3000);
  const groundY = 1000;
  const originX = 100;
  const originY = groundY - 20; // mirrors Living.GetShootPoint's muzzle offset (-20 from the body's y)
  const map = flatMap(mapInfo, width, groundY);
  map.wind = 0;

  const distanceFor = (angleDeg: number, force: number): number => {
    // Living.GetShootPoint/initialVelocity convention for a shot fired rightward (muzzlePoint dir === 1).
    const angle = -angleDeg;
    const res = simulateShot({ map, ball: o.ball, x: originX, y: originY, force, angle });
    return res.x - originX;
  };

  const rows: AimTableRow[] = o.angles.map((angleDeg) => {
    const forces = distances.map((d): number | null => {
      const targetPx = d * unit;
      let lo = 10;
      let hi = maxForce;
      if (distanceFor(angleDeg, hi) < targetPx) return null; // unreachable even at max force
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (distanceFor(angleDeg, mid) < targetPx) lo = mid;
        else hi = mid;
      }
      return Math.round(hi);
    });
    return { angle: angleDeg, forces };
  });

  return { distances, distanceUnitPx: unit, ball: { id: o.ball.id, name: o.ball.name }, map: { weight: mapInfo.weight, dragIndex: mapInfo.dragIndex }, rows };
}
