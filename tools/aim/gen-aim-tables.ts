/**
 * Generates the "Âng. N: Distância | Força" reference tables for the Play page side panels (DD Clássico style):
 * for a configurable list of angles, the force needed to hit horizontal ruler distances 1..20, using the real
 * fight physics (`@ddt/fight` `computeAimTable` — same Euler integrator as the game server/bots), standard ball,
 * standard map gravity/drag, no wind.
 *
 * `apps/api`'s `GET /api/public/aim-tables` computes the same thing live (angles come from the admin
 * server-config, not a fixed list) — this script exists so the table can be inspected/regenerated offline and so
 * there's a committed default (`data/aim-tables.default.json`) the API falls back to before any admin override.
 *
 * Run from the repo root: `npx tsx tools/aim/gen-aim-tables.ts [angle,angle,...]`
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { computeAimTable } from "../../packages/fight/src/phy/aimTable.js";
import { loadPackedAssets } from "../../packages/fight/src/node.js";

const ROOT = join(import.meta.dirname, "..", "..");
const OUT = join(ROOT, "data", "aim-tables.default.json");

/** Ball 20: the `common` ball of weapon 7001 (`ballconfig.json`) — the starter weapon, i.e. the "standard ball". */
const STANDARD_BALL_ID = 20;

const DEFAULT_ANGLES = [20, 30, 50, 65];

function parseAngles(argv: string[]): number[] {
  const arg = argv[2];
  if (!arg) return DEFAULT_ANGLES;
  const angles = arg
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 90);
  return angles.length ? angles : DEFAULT_ANGLES;
}

function main() {
  const angles = parseAngles(process.argv);
  const assets = loadPackedAssets();
  const ball = assets.ball(STANDARD_BALL_ID);
  if (!ball) throw new Error(`ball ${STANDARD_BALL_ID} not found in packages/fight/data/balls.json`);

  console.log(`computing aim tables: angles=${angles.join(",")} ball=${ball.id} (${ball.name ?? ""})`);
  const t0 = Date.now();
  const result = computeAimTable({ angles, ball });
  console.log(`done in ${Date.now() - t0}ms`);

  for (const row of result.rows) {
    const misses = row.forces.filter((f) => f === null).length;
    console.log(`  Âng. ${row.angle}: ${row.forces.map((f) => f ?? "—").join(" ")}${misses ? `  (${misses} unreachable)` : ""}`);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), ...result }, null, 2) + "\n");
  console.log(`\nwrote ${OUT.replace(ROOT + "\\", "").replace(ROOT + "/", "")}`);
}

main();
