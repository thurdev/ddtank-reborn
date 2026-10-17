/**
 * vendor/_dbexport/<Db>/data/<Table>.json  ->  packages/db/seed/<schema>/<Table>.json.gz (+ seed/manifest.json)
 *
 * What is exported:
 *  - game   (Project_Game34): every table that has rows (all of it is template/config data).
 *  - player (Project_Player34): only the config tables in PLAYER_CONFIG_TABLES (the DB has no player rows anyway,
 *           but the whitelist guarantees we never ship user data if a populated backup is exported later).
 *  - member (Db_Membership): NOTHING. It holds real accounts, password hashes, activation codes and prepaid cards.
 *  - game   (Project_Game6600, m1-schema): only the NEW DDT-6600 tables classified "game" (template/config) in
 *           GAMEPLAY_6600_TABLES (see research/6600/db-diff.md) — never the "player" ones, which are real
 *           per-player state from the 6600 source server, not seed data.
 *
 * ⚠️ DANGER re-running this wholesale: `vendor/_dbexport/Project_Game34/data` on disk is a raw re-export of the
 * LocalDB backup and does NOT carry any later edits (e.g. PT-BR text applied some other way than
 * `scripts/import-translations.ts`, which writes to `app."Translations"` and never touches these JSON files).
 * Running the full script again WILL overwrite already-committed `seed/game/*.json.gz` with that raw/untranslated
 * content for every Project_Game34 table, discarding whatever is different in the currently committed seed. If you
 * only need to add/refresh specific new tables (e.g. a future schema task), prefer `pnpm --filter @ddt/db exec tsx
 * scripts/export-seed.ts <Table1> <Table2> ...` (see CLI args below) or hand-edit `seed/manifest.json` + write just
 * the new `.json.gz` files, and diff-check (`git diff --stat packages/db/seed/`) that no pre-existing table's
 * content changed before committing. m1-schema hit exactly this: a blind full re-run reverted translated seed rows
 * (e.g. `game.Active`) back to raw Vietnamese text; it was caught via `git diff` and reverted before commit.
 *
 * Usage: pnpm --filter @ddt/db db:seed:export [Table ...]  (no args = full re-export, see warning above)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { SEED_DIR, VENDOR_EXPORT } from "../src/paths.js";
import type { SeedManifest } from "../src/seed.js";
import { GAMEPLAY_6600_TABLES } from "./schema-6600-tables.js";

const PLAYER_CONFIG_TABLES = [
  "Server_Config",
  "Server_List",
  "Server_Event",
  "Item_Fusion",
  "Items_Fusion_List",
  "Consortia_Buff_Temp",
  "Consortia_Level",
  "Fight_Rate",
  "Rate",
];

/** Row rewrites applied at export time (documented in README). */
const OVERRIDES: Record<string, (row: Record<string, unknown>) => void> = {
  // The backup points the server list at a third-party public IP; ship a local default instead.
  "player.Server_List": (r) => {
    r.IP = "127.0.0.1";
  },
};

const sources = [
  { db: "Project_Game34", schema: "game", include: (_t: string) => true },
  { db: "Project_Player34", schema: "player", include: (t: string) => PLAYER_CONFIG_TABLES.includes(t) },
  // m1-schema: new DDT-6600 template/config tables (never the "player" ones in GAMEPLAY_6600_TABLES).
  { db: "Project_Game6600", schema: "game", include: (t: string) => GAMEPLAY_6600_TABLES[t] === "game" },
] as const;

// Positional args = table names to (re)export in place, WITHOUT touching anything else already committed
// (no rmSync, manifest is merged not rebuilt). No args = full rebuild of every source (the dangerous path above).
const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith("--")));
const manifestPath = join(SEED_DIR, "manifest.json");
const manifest: SeedManifest =
  only.size && existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, "utf8")) as SeedManifest) : { generatedAt: new Date().toISOString(), tables: [] };
if (only.size) manifest.generatedAt = new Date().toISOString();
let rawTotal = 0;
let gzTotal = 0;
const clearedSchemas = new Set<string>();
let exportedCount = 0;
let exportedRows = 0;

for (const s of sources) {
  const dataDir = join(VENDOR_EXPORT, s.db, "data");
  if (!existsSync(dataDir)) throw new Error(`missing ${dataDir} (restore + export the .bak first, see research/db/HOWTO-restore.md)`);
  const outDir = join(SEED_DIR, s.schema);
  // Full rebuild only: clear each target schema's seed dir once. Several sources (e.g. Project_Game34 +
  // Project_Game6600) write into the same "game" outDir, and a second rmSync would wipe what the first just wrote.
  if (!only.size && !clearedSchemas.has(s.schema)) {
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
    clearedSchemas.add(s.schema);
  } else if (only.size) {
    mkdirSync(outDir, { recursive: true });
  }
  for (const f of readdirSync(dataDir).filter((f) => f.endsWith(".json")).sort()) {
    const table = f.slice(0, -5);
    if (!s.include(table)) continue;
    if (only.size && !only.has(table)) continue;
    const raw = readFileSync(join(dataDir, f), "utf8");
    const rows = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw) as Record<string, unknown>[];
    const ov = OVERRIDES[`${s.schema}.${table}`];
    if (ov) rows.forEach(ov);
    // one row per line keeps it greppable after gunzip
    const text = "[\n" + rows.map((r) => JSON.stringify(r)).join(",\n") + "\n]\n";
    const gz = gzipSync(Buffer.from(text, "utf8"), { level: 9 });
    const file = `${s.schema}/${table}.json.gz`;
    writeFileSync(join(SEED_DIR, file), gz);
    const entry = { schema: s.schema, table, rows: rows.length, file };
    if (only.size) {
      const i = manifest.tables.findIndex((e) => e.schema === s.schema && e.table === table);
      if (i >= 0) manifest.tables[i] = entry;
      else manifest.tables.push(entry);
    } else {
      manifest.tables.push(entry);
    }
    exportedCount++;
    exportedRows += rows.length;
    rawTotal += Buffer.byteLength(text);
    gzTotal += gz.length;
  }
}

if (only.size) manifest.tables.sort((a, b) => (a.schema === b.schema ? a.table.localeCompare(b.table) : a.schema.localeCompare(b.schema)));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
const mb = (n: number) => (n / 1024 / 1024).toFixed(2) + " MB";
console.log(`exported ${exportedCount} tables, ${exportedRows} rows (manifest now has ${manifest.tables.length} tables total)`);
console.log(`raw ${mb(rawTotal)} -> gzip ${mb(gzTotal)} (seed dir total ${mb(dirSize(SEED_DIR))})`);
if (gzTotal > 60 * 1024 * 1024) console.warn("WARNING: seed > 60 MB, do not commit it; point seed.ts at vendor/ instead");

function dirSize(d: string): number {
  let n = 0;
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    const st = statSync(p);
    n += st.isDirectory() ? dirSize(p) : st.size;
  }
  return n;
}
