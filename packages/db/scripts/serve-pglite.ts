/**
 * Exposes the dev PGlite directory as a Postgres server on 127.0.0.1:5432 (env PGLITE_PORT) so several processes
 * (apps/game + apps/api + drizzle-kit studio) can share it: DATABASE_URL=postgres://postgres@127.0.0.1:5432/postgres
 * A PGlite dir can only be opened by ONE process at a time — stop this before using pglite: URLs directly.
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { DEFAULT_PGLITE_DIR } from "../src/client.js";

const dir = process.env.PGLITE_DIR ?? DEFAULT_PGLITE_DIR;
const port = Number(process.env.PGLITE_PORT ?? 5432);
const db = await PGlite.create(dir);
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 16 });
await server.start();
console.log(`PGlite ${dir} listening on postgres://postgres@127.0.0.1:${port}/postgres`);
const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
