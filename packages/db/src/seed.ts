import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { sql } from "drizzle-orm";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import type { DbHandle } from "./client.js";
import { SEED_DIR, VENDOR_EXPORT } from "./paths.js";
import * as game from "./schema/game.js";
import * as player from "./schema/player.js";

export interface SeedManifest {
  generatedAt: string;
  tables: { schema: "game" | "player"; table: string; rows: number; file: string }[];
}

export interface SeedOptions {
  /** Directory with manifest.json + <schema>/<Table>.json.gz. Default packages/db/seed. */
  seedDir?: string;
  /** Read raw rows from vendor/_dbexport instead of the committed gzip seed. */
  fromVendor?: boolean;
  /** Limit to these tables ("game.Shop_Goods" or "Shop_Goods"). */
  only?: string[];
  log?: (msg: string) => void;
}

const SCHEMAS: Record<string, Record<string, unknown>> = { game, player };
const VENDOR_DB: Record<string, string> = { game: "Project_Game34", player: "Project_Player34" };
const MAX_PARAMS = 30000;

export function readManifest(seedDir = SEED_DIR): SeedManifest {
  return JSON.parse(readFileSync(join(seedDir, "manifest.json"), "utf8")) as SeedManifest;
}

function loadRows(entry: SeedManifest["tables"][number], o: SeedOptions): Record<string, unknown>[] {
  if (o.fromVendor) {
    const p = join(VENDOR_EXPORT, VENDOR_DB[entry.schema]!, "data", `${entry.table}.json`);
    if (!existsSync(p)) throw new Error(`missing ${p}`);
    const raw = readFileSync(p, "utf8");
    return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
  }
  return JSON.parse(gunzipSync(readFileSync(join(o.seedDir ?? SEED_DIR, entry.file))).toString("utf8"));
}

/**
 * Idempotent seed: per table, in one transaction: TRUNCATE ... RESTART IDENTITY, batched INSERT,
 * then move the identity sequence past MAX(col). Returns {"game.Shop_Goods": 7640, ...}.
 */
export async function seedDatabase(h: DbHandle, o: SeedOptions = {}): Promise<Record<string, number>> {
  const log = o.log ?? (() => {});
  const manifest = readManifest(o.seedDir);
  const result: Record<string, number> = {};
  for (const entry of manifest.tables) {
    const key = `${entry.schema}.${entry.table}`;
    if (o.only && !o.only.includes(key) && !o.only.includes(entry.table)) continue;
    const table = SCHEMAS[entry.schema]?.[entry.table] as PgTable | undefined;
    if (!table) throw new Error(`seed table ${key} not in schema (regenerate with db:gen-schema)`);
    const cfg = getTableConfig(table);
    const rows = loadRows(entry, o);
    const convert = cfg.columns.map((c) => {
      const t = c.getSQLType();
      if (t.startsWith("timestamp")) return (v: unknown) => (typeof v === "string" ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : v + "Z") : v);
      if (t.startsWith("numeric")) return (v: unknown) => (v == null ? v : String(v));
      if (t === "bytea") return (v: unknown) => (typeof v === "string" ? Buffer.from(v, "base64") : v);
      return null;
    });
    const names = cfg.columns.map((c) => c.name);
    const mapped = rows.map((r) => {
      const out: Record<string, unknown> = {};
      names.forEach((n, i) => {
        const v = r[n];
        if (v === undefined) return;
        const f = convert[i];
        out[n] = f ? f(v) : v;
      });
      return out;
    });
    const batch = Math.max(1, Math.floor(MAX_PARAMS / names.length));
    const fq = sql.raw(`"${cfg.schema}"."${cfg.name}"`);
    const idCols = cfg.columns.filter((c) => (c as unknown as { generatedIdentity?: unknown }).generatedIdentity);
    await h.db.transaction(async (tx) => {
      await tx.execute(sql`TRUNCATE TABLE ${fq} RESTART IDENTITY`);
      for (let i = 0; i < mapped.length; i += batch) await tx.insert(table).values(mapped.slice(i, i + batch) as never);
      for (const c of idCols) {
        const q = `"${cfg.schema}"."${cfg.name}"`;
        await tx.execute(
          sql.raw(
            `SELECT setval(pg_get_serial_sequence('${q.replace(/'/g, "''")}', '${c.name}'), COALESCE((SELECT MAX("${c.name}") FROM ${q}), 0) + 1, false)`,
          ),
        );
      }
    });
    result[key] = mapped.length;
    log(`${key}: ${mapped.length}`);
  }
  return result;
}
