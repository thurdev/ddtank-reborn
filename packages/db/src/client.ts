import { mkdirSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { PKG_ROOT } from "./paths.js";

/** Drizzle database, driver-agnostic (postgres.js or PGlite). */
export type Database = PgDatabase<PgQueryResultHKT>;

export interface DbHandle {
  db: Database;
  kind: "postgres" | "pglite";
  /** PGlite data dir ("memory://" for in-memory), or the redacted Postgres URL. */
  location: string;
  /** Raw driver client (postgres.js `Sql` or `PGlite`) for driver-specific needs. */
  client: unknown;
  close(): Promise<void>;
}

export interface CreateDbOptions {
  /** postgres.js pool size. Default: env DB_POOL_MAX or 5 (a single game server needs few connections). */
  max?: number;
  /** Seconds before an idle connection is closed, so Neon can autosuspend. Default 20. */
  idleTimeout?: number;
  /** Log SQL. */
  logger?: boolean;
}

/** Default PGlite directory: packages/db/.data/pglite (absolute, so every app in the monorepo resolves the same dir). */
export const DEFAULT_PGLITE_DIR = join(PKG_ROOT, ".data", "pglite");

/**
 * DATABASE_URL forms:
 *  - `postgres://…` / `postgresql://…`  -> postgres.js (Neon: use the *pooled* host + `?sslmode=require`)
 *  - `pglite:<dir>`                      -> embedded PGlite persisted in <dir> (relative to cwd)
 *  - `pglite:memory` / `pglite:`         -> in-memory PGlite (tests) / default dir
 *  - unset / empty                       -> PGlite at packages/db/.data/pglite (or $PGLITE_DIR)
 */
export async function createDb(url: string | undefined = process.env.DATABASE_URL, opts: CreateDbOptions = {}): Promise<DbHandle> {
  const u = (url ?? "").trim();
  if (/^postgres(ql)?:\/\//i.test(u)) return createPostgres(u, opts);
  if (u === "" || u.toLowerCase().startsWith("pglite:")) {
    const rest = u.slice("pglite:".length).trim();
    let dir: string;
    if (rest === "memory" || rest === "memory://" || rest === ":memory:") dir = "memory://";
    else if (rest === "" || u === "") dir = process.env.PGLITE_DIR ? resolve(process.env.PGLITE_DIR) : DEFAULT_PGLITE_DIR;
    else dir = isAbsolute(rest) ? rest : resolve(process.cwd(), rest);
    return createPglite(dir, opts);
  }
  throw new Error(`Unsupported DATABASE_URL "${u.replace(/:[^:@/]*@/, ":***@")}" (expected postgres://, postgresql:// or pglite:<dir>)`);
}

async function createPostgres(url: string, opts: CreateDbOptions): Promise<DbHandle> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const host = safeHost(url);
  const client = postgres(url, {
    max: opts.max ?? (Number(process.env.DB_POOL_MAX) || 5),
    idle_timeout: opts.idleTimeout ?? 20,
    max_lifetime: 60 * 30,
    connect_timeout: 15,
    // Neon's pooler (PgBouncer, transaction mode) — named prepared statements are not portable across backends.
    prepare: !host.includes("-pooler"),
    onnotice: () => {},
  });
  const db = drizzle(client, { logger: opts.logger }) as unknown as Database;
  return {
    db,
    kind: "postgres",
    location: url.replace(/:[^:@/]*@/, ":***@"),
    client,
    close: () => client.end({ timeout: 5 }),
  };
}

async function createPglite(dir: string, opts: CreateDbOptions): Promise<DbHandle> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  if (dir !== "memory://") mkdirSync(dir, { recursive: true });
  const client = dir === "memory://" ? new PGlite() : new PGlite(dir);
  await client.waitReady;
  const db = drizzle(client, { logger: opts.logger }) as unknown as Database;
  return { db, kind: "pglite", location: dir, client, close: () => client.close() };
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
