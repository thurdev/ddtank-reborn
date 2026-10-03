import type { BallInfo } from "../data/types.js";
import { GameMap, type MapInfo } from "./map.js";
import { simulateShot } from "./simulate.js";
import { Tile } from "./tile.js";

/**
 * Distance unit used by the "Âng. N: Distância | Força" reference tables (DD Clássico style side panels).
 *
 * `50px` (half a 0..10/100px-per-tick ruler tick) was the original guess — wrong twice over: (1) the "Força"
 * column is the **player-facing power bar 0..100** (`EnergyView.as`/`Player.as` `_maxForce:int = 2000`, the same
 * default `bot/aim.ts`'s `solveAim` searches up to), not the raw engine force/velocity `ShootImp`/`simulateShot`
 * take (0..2000) — `computeAimTable` used to return the latter straight up (174..1145 for the default ball/map),
 * which is what the play-page panels were actually showing; and (2) 50px was never calibrated against anything,
 * it just made distance 20 land on the 1000px canvas edge.
 *
 * Recalibrated empirically against a reference "Âng. N" table from a sibling DDTank build (same angle set
 * 20/30/50/65, distances 1..20, "common" ball/standard map, no wind): for each candidate unit, every
 * `computeAimTable` force was converted to power (`rawForce / maxForce * 100`, `maxForce` = 2000) and compared to
 * the reference; `95px` minimizes the RMSE over all 80 (angle × distance) cells (≈1.2 power, worst cell ≈4 power —
 * see `tools/aim/gen-aim-tables.ts` output and `aimTable.test.ts`). The residual isn't fully closed: this engine's
 * drag/ball/map constants (`DEFAULT_MAP_INFO`, ball 20) are the real server's, and the reference table's source
 * build may differ slightly in those — a few cells (mostly long shots at angle 50) sit ~3-4 power off. Tightening
 * further would mean guessing at unknown constants from a different build rather than reading them from this one,
 * so 95px (not a "clean" ruler fraction) is kept as the best empirical fit and the residual is documented here.
 */
export const DEFAULT_DISTANCE_UNIT_PX = 95;

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
  /** Raw engine force/velocity ceiling (search bound) AND the player's power-bar 0..100 basis (`force / maxForce *
   *  100`, matching `Player.as`/`EnergyView.as` `_maxForce:int = 2000` and `bot/aim.ts` `solveAim`'s default).
   *  Default 2000. */
  maxForce?: number;
}

export interface AimTableRow {
  angle: number;
  /** Player-facing power (0..100 — the EnergyView power-bar reading, what `sendShootAction`/the FIRE command
   *  actually need scaled back up by `maxForce / 100`) needed to reach each `distances[i]`, same order/length;
   *  `null` when unreachable within `maxForce`. */
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
      // hi is the raw engine force/velocity (what `simulateShot`/`ShootImp` take); convert to the player-facing
      // 0..100 power-bar reading the Play page actually shows (see `maxForce` doc above).
      return Math.round((hi / maxForce) * 100);
    });
    return { angle: angleDeg, forces };
  });

  return { distances, distanceUnitPx: unit, ball: { id: o.ball.id, name: o.ball.name }, map: { weight: mapInfo.weight, dragIndex: mapInfo.dragIndex }, rows };
}
