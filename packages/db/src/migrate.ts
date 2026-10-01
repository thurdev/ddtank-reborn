import { join } from "node:path";
import type { DbHandle } from "./client.js";
import { PKG_ROOT } from "./paths.js";

export const MIGRATIONS_DIR = join(PKG_ROOT, "drizzle");

/** Applies pending drizzle-kit migrations from packages/db/drizzle (tracked in drizzle.__drizzle_migrations). */
export async function migrateDb(h: DbHandle, migrationsFolder = MIGRATIONS_DIR): Promise<void> {
  if (h.kind === "pglite") {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(h.db as never, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(h.db as never, { migrationsFolder });
  }
}
