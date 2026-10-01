/**
 * vendor/_dbexport/<Db>/data/<Table>.json  ->  packages/db/seed/<schema>/<Table>.json.gz (+ seed/manifest.json)
 *
 * What is exported:
 *  - game   (Project_Game34): every table that has rows (all of it is template/config data).
 *  - player (Project_Player34): only the config tables in PLAYER_CONFIG_TABLES (the DB has no player rows anyway,
 *           but the whitelist guarantees we never ship user data if a populated backup is exported later).
 *  - member (Db_Membership): NOTHING. It holds real accounts, password hashes, activation codes and prepaid cards.
 *
 * Usage: pnpm --filter @ddt/db db:seed:export
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { SEED_DIR, VENDOR_EXPORT } from "../src/paths.js";
import type { SeedManifest } from "../src/seed.js";

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
] as const;

const manifest: SeedManifest = { generatedAt: new Date().toISOString(), tables: [] };
let rawTotal = 0;
let gzTotal = 0;

for (const s of sources) {
  const dataDir = join(VENDOR_EXPORT, s.db, "data");
  if (!existsSync(dataDir)) throw new Error(`missing ${dataDir} (restore + export the .bak first, see research/db/HOWTO-restore.md)`);
  const outDir = join(SEED_DIR, s.schema);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(dataDir).filter((f) => f.endsWith(".json")).sort()) {
    const table = f.slice(0, -5);
    if (!s.include(table)) continue;
    const raw = readFileSync(join(dataDir, f), "utf8");
    const rows = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw) as Record<string, unknown>[];
    const ov = OVERRIDES[`${s.schema}.${table}`];
    if (ov) rows.forEach(ov);
    // one row per line keeps it greppable after gunzip
    const text = "[\n" + rows.map((r) => JSON.stringify(r)).join(",\n") + "\n]\n";
    const gz = gzipSync(Buffer.from(text, "utf8"), { level: 9 });
    const file = `${s.schema}/${table}.json.gz`;
    writeFileSync(join(SEED_DIR, file), gz);
    manifest.tables.push({ schema: s.schema, table, rows: rows.length, file });
    rawTotal += Buffer.byteLength(text);
    gzTotal += gz.length;
  }
}

writeFileSync(join(SEED_DIR, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
const mb = (n: number) => (n / 1024 / 1024).toFixed(2) + " MB";
console.log(`exported ${manifest.tables.length} tables, ${manifest.tables.reduce((a, t) => a + t.rows, 0)} rows`);
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
