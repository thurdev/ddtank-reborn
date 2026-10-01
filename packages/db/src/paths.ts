import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** packages/db */
export const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** monorepo root */
export const REPO_ROOT = resolve(PKG_ROOT, "..", "..");
export const VENDOR_EXPORT = join(REPO_ROOT, "vendor", "_dbexport");
export const RESEARCH_DB = join(REPO_ROOT, "research", "db");
export const SEED_DIR = join(PKG_ROOT, "seed");
export const SCHEMA_DIR = join(PKG_ROOT, "src", "schema");

/** Source SQL Server database -> target Postgres schema. */
export const DATABASES = [
  { db: "Project_Game34", schema: "game" },
  { db: "Project_Player34", schema: "player" },
  { db: "Db_Membership", schema: "member" },
] as const;
export type PgSchemaName = (typeof DATABASES)[number]["schema"];

/** catalog.json: prefer vendor/_dbexport (fresh export), fall back to the committed copy under research/db. */
export function catalogPath(db: string): string {
  const v = join(VENDOR_EXPORT, db, "schema", "catalog.json");
  if (existsSync(v)) return v;
  return join(RESEARCH_DB, db, "schema", "catalog.json");
}

export function rowCountsPath(db: string): string {
  const v = join(VENDOR_EXPORT, db, "row-counts.json");
  if (existsSync(v)) return v;
  return join(RESEARCH_DB, db, "row-counts.json");
}
