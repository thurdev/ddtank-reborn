import { describe, expect, it } from "vitest";
import { computeAimTable } from "../src/index.js";
import { loadPackedAssets } from "../src/node.js";

const assets = loadPackedAssets();
const ball = assets.ball(20)!; // standard ball (weapon 7001's "common" ball)

/**
 * Reference "Âng. N: Distância | Força" values (distance 1..20) from a sibling DDTank build, with "Força" read
 * off the player-facing power bar (0..100 — see `aimTable.ts`'s `DEFAULT_DISTANCE_UNIT_PX` doc for how this
 * engine's `distanceUnitPx`/power conversion were calibrated against these numbers).
 */
const REFERENCE: Record<number, number[]> = {
  20: [10, 19, 25, 30, 36, 40, 44, 48, 51, 54, 57, 60, 63, 66, 69, 72, 74, 76, 78, 80],
  30: [14, 20, 24, 28, 32, 35, 38, 41, 44, 47, 50, 52, 55, 57, 60, 62, 65, 67, 69, 72],
  50: [14, 20, 24, 28, 32, 35, 39, 42, 44, 48, 50, 53, 55, 58, 60, 63, 65, 68, 70, 72],
  65: [13, 20, 26, 31, 37, 41, 44, 48, 53, 56, 58, 61, 64, 67, 70, 73, 76, 79, 82, 85],
};

// Best empirical fit (see aimTable.ts) still leaves a few cells ~4 power off (different build, unknown exact
// map/ball constants) — this asserts the port stays within that documented residual, not a perfect match.
const TOLERANCE = 5;

describe("computeAimTable", () => {
  const angles = Object.keys(REFERENCE).map(Number);
  const result = computeAimTable({ angles, ball });

  it("returns player-facing 0..100 power, not the raw 0..2000 engine force", () => {
    for (const row of result.rows) {
      for (const f of row.forces) {
        expect(f).not.toBeNull();
        expect(f as number).toBeGreaterThanOrEqual(0);
        expect(f as number).toBeLessThanOrEqual(100);
      }
    }
  });

  it.each(angles)("matches the reference table within ±5 power at angle %s", (angle) => {
    const row = result.rows.find((r) => r.angle === angle)!;
    const ref = REFERENCE[angle]!;
    for (let i = 0; i < ref.length; i++) {
      const got = row.forces[i];
      expect(got, `angle ${angle} dist ${i + 1}: got ${got}, ref ${ref[i]}`).not.toBeNull();
      expect(Math.abs((got as number) - ref[i]!)).toBeLessThanOrEqual(TOLERANCE);
    }
  });
});
