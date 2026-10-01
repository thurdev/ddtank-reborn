/**
 * Usage: pnpm --filter @ddt/db db:seed [--from-vendor] [--no-migrate] [Table ...]
 * Reads packages/db/seed/*.json.gz by default (no vendor/ needed). Runs migrations first unless --no-migrate.
 */
import { createDb, migrateDb, seedDatabase } from "../src/index.js";

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith("--"));
const h = await createDb();
console.log(`seeding ${h.kind} ${h.location}`);
if (!args.includes("--no-migrate")) await migrateDb(h);
const t0 = Date.now();
const res = await seedDatabase(h, {
  fromVendor: args.includes("--from-vendor"),
  only: only.length ? only : undefined,
  log: (m) => console.log("  " + m),
});
const rows = Object.values(res).reduce((a, b) => a + b, 0);
console.log(`seeded ${Object.keys(res).length} tables, ${rows} rows in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await h.close();
