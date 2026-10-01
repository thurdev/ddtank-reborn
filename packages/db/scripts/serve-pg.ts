/**
 * Dev database: a REAL Postgres (binaries shipped via npm `embedded-postgres`, nothing installed system-wide)
 * at packages/db/.data/pg on 127.0.0.1:5432 (env PG_PORT). Safe for many concurrent connections (api + game + studio).
 * DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/ddtank
 * First run initialises the cluster, creates DB "ddtank", migrates and seeds.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createDb, createDevAccounts, migrateDb, seedDatabase } from "../src/index.js";

const dir = process.env.PG_DIR ?? fileURLToPath(new URL("../.data/pg", import.meta.url));
const port = Number(process.env.PG_PORT ?? 5432);
const fresh = !existsSync(dir);
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password: "postgres", port, persistent: true, initdbFlags: ["--encoding=UTF8", "--locale=C"], postgresFlags: ["-c", "timezone=UTC", "-c", "log_timezone=UTC"] });
if (fresh) await pg.initialise();
await pg.start();
const url = `postgres://postgres:postgres@127.0.0.1:${port}/ddtank`;
if (fresh) {
  await pg.createDatabase("ddtank");
}
const h = await createDb(url);
await migrateDb(h);
if (fresh) {
  await seedDatabase(h);
  await createDevAccounts(h);
}
await h.close();
console.log(`Postgres ready: DATABASE_URL=${url}${fresh ? "  (new cluster: migrated, seeded, dev accounts admin/admin + test/test)" : ""}`);
const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
