/**
 * Generates src/schema/{schemas,game,player,member}.ts (Drizzle, Postgres) from the SQL Server catalog.json exports.
 *
 * Rules (see README "Schema generation"):
 *  - original table/column names are kept verbatim (quoted identifiers) and used as the TS property names too,
 *    so `SELECT [TemplateID] FROM Shop_Goods` ports to `db.select({ TemplateID: Shop_Goods.TemplateID })...`.
 *  - one Postgres schema per source DB: game (Project_Game34), player (Project_Player34), member (Db_Membership).
 *  - types / defaults / identity mapped as documented in mapType() / mapDefault().
 *  - tables without a PK get a synthetic PK only when provably safe (see pickSyntheticKey()).
 *
 * Inputs: catalog.json (vendor/_dbexport, else research/db) and seed/*.json.gz (for key-uniqueness checks).
 * Usage: pnpm --filter @ddt/db db:gen-schema && pnpm --filter @ddt/db db:generate
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { DATABASES, PKG_ROOT, SCHEMA_DIR, SEED_DIR, VENDOR_EXPORT, catalogPath, catalogPath6600 } from "../src/paths.js";
import { GAMEPLAY_6600_TABLES, RENAME_6600 } from "./schema-6600-tables.js";

interface CatColumn {
  name: string;
  type: string;
  nullable: boolean;
  identity: boolean;
  default: string | null;
  computed: string | null;
}
interface CatTable {
  schema: string;
  name: string;
  rows: number;
  columns: CatColumn[];
  primaryKey: string[];
  indexes: { name: string; unique: boolean; type: string; cols: string[] }[];
  foreignKeys: { name: string; cols: string[]; ref: string; refCols: string[] }[];
}

/**
 * Indexes that do NOT exist in the original DBs (they only had PKs) but that the C# hot paths obviously need
 * (every per-user load is `WHERE UserID=@UserID`). Pure additions: no behaviour change.
 */
const EXTRA_INDEXES: Record<string, { cols: string[]; unique?: boolean }[]> = {
  "player.Sys_Users_Detail": [{ cols: ["UserName"] }, { cols: ["NickName"] }, { cols: ["ConsortiaID"] }],
  "player.Sys_Users_Goods": [{ cols: ["UserID", "BagType"] }],
  "player.Sys_Users_Friends": [{ cols: ["UserID"] }],
  "player.Sys_Users_Pet": [{ cols: ["UserID"] }],
  "player.Sys_Users_Card": [{ cols: ["UserID"] }],
  "player.User_Messages": [{ cols: ["ReceiverID"] }, { cols: ["SenderID"] }],
  "player.Consortia_Users": [{ cols: ["ConsortiaID"] }, { cols: ["UserID"] }],
  "player.Auction": [{ cols: ["AuctioneerID"] }],
  "player.Sys_User_Rank": [{ cols: ["UserID"] }],
  "player.Sys_Users_AvatarCollection": [{ cols: ["UserID"] }],
  // m1-schema: new DDT-6600 per-player tables, same "every per-user load is WHERE UserID=@UserID" reasoning.
  "player.Mount_Data": [{ cols: ["UserID"] }],
  "player.Sys_User_Drills": [{ cols: ["UserID"] }],
  "player.Sys_User_MagicHouse": [{ cols: ["UserID"] }],
  "player.Sys_User_Pet_Form": [{ cols: ["UserID"] }],
  "player.Sys_User_RingStation": [{ cols: ["UserID"] }],
  "player.Ringstation_Battle_Field": [{ cols: ["UserID"] }],
  "player.Sys_User_Treasure": [{ cols: ["UserID"] }],
  "player.Treasure_Data": [{ cols: ["UserID"] }],
  "player.Treasure_Puzzle_Data": [{ cols: ["UserID"] }],
  "player.Sys_Users_Christmas": [{ cols: ["UserID"] }],
  "player.User_Avatar_Colection": [{ cols: ["UserID"] }],
  "player.Gypsy_Item_Data": [{ cols: ["UserID"] }],
  "player.Dice_Data": [{ cols: ["UserID"] }],
  "player.BoguAdventure_Data": [{ cols: ["UserID"] }],
  "player.Pyramid_Data": [{ cols: ["UserID"] }],
  "player.Halloween_Rank": [{ cols: ["UserID"] }],
};

/** Natural-key column names tried (in order) for PK-less, non-empty template tables in `game`. */
const NATURAL_KEY_CANDIDATES = ["ID", "Id", "id", "TemplateID"];

/**
 * New columns on EXISTING tables. Two reasons a column ends up here instead of the vendor catalog.json:
 *  1. Found in DDT-6600 but missing from our 4.1-derived schema (task `m1-schema`, see
 *     `research/6600/db-diff.md` "Colunas novas em tabelas que já existem") — types/defaults copied
 *     verbatim from `research/6600/db/Project_Game6600/schema/catalog.json`.
 *  2. Pure new-stack additions with no vendor equivalent at all (e.g. `player.Server_List` below,
 *     task `ch-tabela`) — made-up SQL Server-shaped defs (same `CatColumn` shape) just so
 *     `mapType`/`mapDefault` translate them exactly like any other column; documented inline per entry.
 * Either way, every NOT NULL column here has a DEFAULT, so existing rows and code paths that never read
 * these columns keep working unchanged; nullable columns default to NULL.
 */
const EXTRA_COLUMNS: Record<string, CatColumn[]> = {
  "game.Pve_Info": [
    { name: "NightmareTemplateIds", type: "nvarchar(1024)", nullable: true, identity: false, default: null, computed: null },
    { name: "EpicTemplateIds", type: "nvarchar(1024)", nullable: true, identity: false, default: null, computed: null },
    { name: "EpicGameScript", type: "nvarchar(100)", nullable: true, identity: false, default: null, computed: null },
    { name: "NightmareGameScript", type: "nvarchar(100)", nullable: true, identity: false, default: null, computed: null },
  ],
  "game.Quest": [
    { name: "Level2NeedMoney", type: "int", nullable: false, identity: false, default: "((-1))", computed: null },
    { name: "Level3NeedMoney", type: "int", nullable: false, identity: false, default: "((-1))", computed: null },
    { name: "Level4NeedMoney", type: "int", nullable: false, identity: false, default: "((-1))", computed: null },
    { name: "Level5NeedMoney", type: "int", nullable: false, identity: false, default: "((-1))", computed: null },
    { name: "OneKeyFinishNeedMoney", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
  ],
  "game.Quest_Goods": [
    { name: "RewardItemCount1", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "RewardItemCount2", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "RewardItemCount3", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "RewardItemCount4", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "RewardItemCount5", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
  ],
  "player.Sys_Users_Detail": [
    { name: "GiftGp", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "GiftLevel", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "IsOpenGift", type: "bit", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "CardSoul", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "receiebox", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "receieGrade", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "needGetBoxTime", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "TimeBox", type: "datetime", nullable: false, identity: false, default: "(getdate())", computed: null },
    { name: "LeagueMoney", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "isFirstDivorce", type: "int", nullable: false, identity: false, default: "((1))", computed: null },
    {
      name: "PveEpicPermission",
      type: "nvarchar(50)",
      nullable: false,
      identity: false,
      default: "(N'0-0-0-0-0-0-0-0-0-0-0-0-0')",
      computed: null,
    },
    { name: "horseRaceCanRaceTime", type: "int", nullable: false, identity: false, default: "((1))", computed: null },
    // ch-processo (vários canais, processo por canal): qual SERVER_ID marcou este jogador online (setOnlineState).
    // Sem equivalente em nenhum vendor (lá cada canal tinha o próprio banco inteiro) — nullable, NULL = nunca
    // logou neste stack ou offline. Único jeito de `resetAllOnline` (boot do apps/game) não zerar o "State" de
    // jogadores online NUM OUTRO canal/processo que compartilha este mesmo Postgres (db/characters.ts).
    { name: "OnlineServerID", type: "int", nullable: true, identity: false, default: null, computed: null },
  ],
  "player.Sys_Users_Extra": [
    { name: "KingBlessInfo", type: "varchar(250)", nullable: true, identity: false, default: null, computed: null },
    { name: "MissionEnergy", type: "int", nullable: false, identity: false, default: "((300))", computed: null },
    { name: "buyEnergyCount", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "KingBlessEnddate", type: "datetime", nullable: false, identity: false, default: "(getdate())", computed: null },
    { name: "KingBlessIndex", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "DressModelArr", type: "nvarchar(max)", nullable: true, identity: false, default: null, computed: null },
    { name: "CurentDressModel", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "ScoreMagicstone", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "DeedInfo", type: "nvarchar(250)", nullable: true, identity: false, default: null, computed: null },
    { name: "DeedEnddate", type: "datetime", nullable: false, identity: false, default: "(getdate())", computed: null },
    { name: "DeedIndex", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "CatchInsectGetPrize", type: "nvarchar(50)", nullable: false, identity: false, default: "(N'0-0-0-0-0-0-0')", computed: null },
    { name: "MagpieBridgeItems", type: "nvarchar(max)", nullable: false, identity: false, default: "(N'')", computed: null },
    { name: "NowPositionMB", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "MagpieNum", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
  ],
  "player.Sys_Users_Fight": [
    { name: "MagicAttack", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "MagicDefence", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
  ],
  "player.Sys_Users_Goods": [
    { name: "beadExp", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "beadLevel", type: "int", nullable: false, identity: false, default: "((1))", computed: null },
    { name: "beadIsLock", type: "bit", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "AdvanceDate", type: "datetime", nullable: false, identity: false, default: "(getdate())", computed: null },
    { name: "MagicAttack", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "MagicDefence", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "MagicExp", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "MagicLevel", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
  ],
  // ch-tabela (vários canais): colunas novas em player."Server_List", sem equivalente em nenhum vendor — ver
  // o comentário da própria tabela em src/schema/player.ts (gerado) pro que cada uma faz.
  "player.Server_List": [
    { name: "Enabled", type: "bit", nullable: false, identity: false, default: "((1))", computed: null },
    { name: "SortOrder", type: "int", nullable: false, identity: false, default: "((0))", computed: null },
    { name: "InternalUrl", type: "nvarchar(255)", nullable: true, identity: false, default: null, computed: null },
    { name: "PvpOnly", type: "bit", nullable: false, identity: false, default: "((0))", computed: null },
    // ch-processo: URL WebSocket deste canal (apps/game GAME_WS_URL do processo que o serve), pro apps/api
    // (auth.ts playConfig) montar o socketProxy do Ruffle com uma entrada por canal. NULL = este canal é
    // servido por ESTE próprio par apps/api+apps/game (igual IP/Port/InternalUrl acima) -> cai no GAME_WS_URL
    // do .env de quem está respondendo.
    { name: "WsUrl", type: "nvarchar(255)", nullable: true, identity: false, default: null, computed: null },
  ],
};

/** EXTRA_COLUMNS keys that are reason (2) above (pure new-stack, no vendor source) — changes the auto README note. */
const NEW_STACK_EXTRA_COLUMNS = new Set(["player.Server_List"]);
/**
 * Individual EXTRA_COLUMNS columns (as "schema.table.Column") that are new-stack additions on a table that ALSO
 * has DDT-6600-derived extra columns (so the table key above isn't all-or-nothing) — ch-processo's
 * `Sys_Users_Detail.OnlineServerID` on top of m1-schema's Gift/receiebox/etc. columns.
 */
const NEW_STACK_EXTRA_COLUMN_NAMES = new Set(["player.Sys_Users_Detail.OnlineServerID"]);

// ---------------------------------------------------------------------------------------------------------------

type Imports = Set<string>;
const notes: string[] = []; // synthetic key / special-case notes -> README

function loadSeedRows(schema: string, table: string): Record<string, unknown>[] | null {
  const p = join(SEED_DIR, schema, `${table}.json.gz`);
  if (existsSync(p)) return JSON.parse(gunzipSync(readFileSync(p)).toString("utf8"));
  // New DDT-6600 tables (m1-schema) have no committed gz seed the first time this generator runs
  // for them (gen-schema runs before db:seed:export) — read the raw vendor export instead so the
  // synthetic-PK uniqueness check still works. Falls back to "cannot verify" (stays a heap) when
  // vendor/_dbexport isn't present, same conservative default as the no-seed case below.
  if (GAMEPLAY_6600_TABLES[table]) {
    const vp = join(VENDOR_EXPORT, "Project_Game6600", "data", `${table}.json`);
    if (existsSync(vp)) {
      const raw = readFileSync(vp, "utf8");
      return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
    }
  }
  return null;
}

function mapType(col: CatColumn, imp: Imports): { expr: string; kind: string } {
  const m = /^(\w+)(?:\((.+)\))?$/.exec(col.type.trim());
  if (!m) throw new Error(`unparsable type ${col.type}`);
  const base = m[1]!.toLowerCase();
  const arg = m[2];
  const n = JSON.stringify(col.name);
  const use = (f: string) => imp.add(f);
  switch (base) {
    case "int":
      use("integer");
      return { expr: `integer(${n})`, kind: "int" };
    case "bigint":
      use("bigint");
      return { expr: `bigint(${n}, { mode: "number" })`, kind: "int" };
    case "smallint":
    case "tinyint":
      use("smallint");
      return { expr: `smallint(${n})`, kind: "int" };
    case "bit":
      use("boolean");
      return { expr: `boolean(${n})`, kind: "bool" };
    case "nvarchar":
    case "varchar":
    case "nchar":
    case "char": {
      if (!arg || arg.toLowerCase() === "max" || arg === "-1") {
        use("text");
        return { expr: `text(${n})`, kind: "text" };
      }
      const f = base.endsWith("char") && !base.endsWith("varchar") ? "char" : "varchar";
      use(f);
      return { expr: `${f}(${n}, { length: ${Number(arg)} })`, kind: "text" };
    }
    case "text":
    case "ntext":
    case "xml":
      use("text");
      return { expr: `text(${n})`, kind: "text" };
    case "datetime":
    case "datetime2":
    case "smalldatetime":
      use("timestamp");
      return { expr: `timestamp(${n}, { precision: 3, mode: "date" })`, kind: "datetime" };
    case "date":
      use("date");
      return { expr: `date(${n}, { mode: "string" })`, kind: "date" };
    case "decimal":
    case "numeric": {
      use("numeric");
      const [p, s] = (arg ?? "18,0").split(",").map((x) => Number(x.trim()));
      return { expr: `numeric(${n}, { precision: ${p}, scale: ${s ?? 0} })`, kind: "numeric" };
    }
    case "money":
      use("numeric");
      return { expr: `numeric(${n}, { precision: 19, scale: 4 })`, kind: "numeric" };
    case "smallmoney":
      use("numeric");
      return { expr: `numeric(${n}, { precision: 10, scale: 4 })`, kind: "numeric" };
    case "uniqueidentifier":
      use("uuid");
      return { expr: `uuid(${n})`, kind: "uuid" };
    case "float":
      use("doublePrecision");
      return { expr: `doublePrecision(${n})`, kind: "float" };
    case "real":
      use("real");
      return { expr: `real(${n})`, kind: "float" };
    case "image":
    case "varbinary":
    case "binary":
    case "timestamp":
    case "rowversion":
      return { expr: `bytea(${n})`, kind: "bytes" };
    default:
      throw new Error(`unmapped SQL Server type ${col.type}`);
  }
}

function stripParens(s: string): string {
  let t = s.trim();
  while (t.startsWith("(") && t.endsWith(")") && balanced(t.slice(1, -1))) t = t.slice(1, -1).trim();
  return t;
}
function balanced(s: string): boolean {
  let d = 0;
  for (const c of s) {
    if (c === "(") d++;
    else if (c === ")" && --d < 0) return false;
  }
  return d === 0;
}
/** Evaluates SQL Server constant integer arithmetic like ((2009)-(1))-(1). */
function evalIntExpr(s: string): number | null {
  if (!/^[\d\s()+\-*]+$/.test(s)) return null;
  // eslint-disable-next-line no-new-func
  return Function(`"use strict";return (${s});`)() as number;
}
/** SQL Server converts an int to datetime as "days since 1900-01-01". */
function daysToDatetime(days: number): string {
  const d = new Date(Date.UTC(1900, 0, 1) + days * 86400000);
  return d.toISOString().slice(0, 19).replace("T", " ");
}
function sqlStr(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}

function mapDefault(col: CatColumn, kind: string, table: string, imp: Imports): string | null {
  if (col.default == null) return null;
  const raw = col.default;
  const v = stripParens(raw);
  const where = `${table}.${col.name}`;
  const lit = /^N?'((?:[^']|'')*)'$/.exec(v);
  const str = lit ? lit[1]!.replace(/''/g, "'") : null;
  const num = /^-?\d+(\.\d+)?$/.test(stripParens(v)) ? Number(stripParens(v)) : null;
  const fn = v.toLowerCase().replace(/\s+/g, "");

  if (fn === "getdate()" || fn === "sysdatetime()" || fn === "current_timestamp") return `.defaultNow()`;
  if (fn === "getutcdate()" || fn === "sysutcdatetime()") {
    imp.add("sql");
    return ".default(sql`(now() at time zone 'utc')`)";
  }
  if (fn === "newid()" || fn === "newsequentialid()") return `.defaultRandom()`;

  switch (kind) {
    case "bool":
      if (num !== null) return `.default(${num !== 0})`;
      break;
    case "int":
    case "float":
      if (num !== null) return `.default(${num})`;
      break;
    case "numeric":
      if (num !== null) return `.default(${JSON.stringify(String(num))})`;
      break;
    case "text":
      if (str !== null) return `.default(${JSON.stringify(str)})`;
      if (num !== null) return `.default(${JSON.stringify(String(num))})`;
      break;
    case "uuid":
      if (str !== null) return `.default(${JSON.stringify(str)})`;
      break;
    case "bytes":
      if (/^0x[0-9a-f]*$/i.test(v)) {
        imp.add("sql");
        return ".default(sql`decode('" + v.slice(2) + "', 'hex')`)";
      }
      break;
    case "datetime": {
      imp.add("sql");
      let ts: string | null = null;
      const conv = /^convert\(\[?datetime\]?,'(\d{4})(\d{2})(\d{2})',\(?\d+\)?\)$/i.exec(v.replace(/\s+/g, ""));
      if (conv) ts = `${conv[1]}-${conv[2]}-${conv[3]} 00:00:00`;
      else if (str !== null && /^\d{4}-\d{1,2}-\d{1,2}/.test(str)) ts = str.length <= 10 ? `${str} 00:00:00` : str;
      else {
        const days = evalIntExpr(v);
        if (days !== null) {
          ts = daysToDatetime(days);
          notes.push(
            `\`${where}\` default \`${raw}\` is integer arithmetic (= ${days} days after 1900-01-01 in SQL Server), translated literally to \`${ts}\`.`,
          );
        }
      }
      if (ts) return ".default(sql`'" + ts + "'::timestamp`)";
      break;
    }
  }
  throw new Error(`untranslated default ${raw} for ${where} (${col.type})`);
}

function pickSyntheticKey(pgSchema: string, t: CatTable): { cols: string[]; why: string } | null {
  const rows = loadSeedRows(pgSchema, t.name);
  const n = rows?.length ?? 0;
  const unique = (c: string) => {
    if (!rows) return true;
    const seen = new Set<unknown>();
    for (const r of rows) {
      const v = r[c];
      if (v === null || v === undefined || seen.has(v)) return false;
      seen.add(v);
    }
    return true;
  };
  const ident = t.columns.find((c) => c.identity);
  if (ident) {
    if (n === 0 && t.rows > 0) return null; // has rows in source but none seeded: cannot verify
    if (unique(ident.name)) return { cols: [ident.name], why: `identity column${n ? `, unique across ${n} seeded rows` : ""}` };
    return null;
  }
  // natural keys only for template data we can verify (game schema, non-empty)
  if (pgSchema !== "game" || n === 0) return null;
  for (const cand of NATURAL_KEY_CANDIDATES) {
    const col = t.columns.find((c) => c.name === cand);
    if (col && !col.nullable && unique(col.name)) return { cols: [col.name], why: `natural key, NOT NULL and unique across ${n} rows` };
  }
  return null;
}

const tsKey = (s: string) => (/^[A-Za-z_$][\w$]*$/.test(s) ? s : JSON.stringify(s));

const generated: { schema: string; file: string }[] = [];
const synthetic: string[] = [];
const heaps: string[] = [];

// Renamed tables (RENAME_6600) label by their TARGET name only — the SOURCE name is also a real,
// differently-shaped 4.1 table (e.g. "Item_Fusion") that must keep its own "Project_Game34" label.
const sixNames = new Set([...Object.keys(GAMEPLAY_6600_TABLES).filter((n) => !RENAME_6600[n]), ...Object.values(RENAME_6600)]);
let cat6600Cache: { tables: CatTable[] } | null = null;
function load6600Catalog(): { tables: CatTable[] } {
  if (!cat6600Cache) cat6600Cache = JSON.parse(readFileSync(catalogPath6600("Project_Game6600"), "utf8")) as { tables: CatTable[] };
  return cat6600Cache;
}

for (const { db, schema } of DATABASES) {
  const cat = JSON.parse(readFileSync(catalogPath(db), "utf8")) as { tables: CatTable[] };
  const imp: Imports = new Set();
  const extrasImp: Imports = new Set();
  const out: string[] = [];
  const tables: CatTable[] = [...cat.tables];
  if (schema === "game" || schema === "player") {
    // m1-schema: append the new DDT-6600 gameplay tables that belong to this Postgres schema. RENAME_6600: a
    // few source names collide with an existing 4.1 table of a DIFFERENT shape (`Item_Fusion`, m3-fusao) — push
    // those under the renamed name so they land as a brand-new table instead of merging/clashing with the 4.1
    // one already in `tables` (from Project_Game34/Player34 above).
    for (const t of load6600Catalog().tables) {
      if (GAMEPLAY_6600_TABLES[t.name] !== schema) continue;
      const renamed = RENAME_6600[t.name];
      tables.push(renamed ? { ...t, name: renamed } : t);
    }
  }
  tables.sort((a, b) => a.name.localeCompare(b.name));
  for (const t of tables) {
    if (t.schema !== "dbo") throw new Error(`non-dbo table ${t.schema}.${t.name}`);
    const lines: string[] = [];
    let pk = t.primaryKey;
    const extraCols = EXTRA_COLUMNS[`${schema}.${t.name}`];
    const cols = extraCols ? [...t.columns, ...extraCols] : t.columns;
    if (extraCols) {
      const key = `${schema}.${t.name}`;
      if (NEW_STACK_EXTRA_COLUMNS.has(key)) {
        notes.push(
          `\`${key}\` gains ${extraCols.length} column(s) with no vendor equivalent (new-stack addition, see the EXTRA_COLUMNS comment for the task): ${extraCols.map((c) => c.name).join(", ")} — nullable or with an explicit DEFAULT, no behaviour change for existing rows.`,
        );
      } else {
        const newStack = extraCols.filter((c) => NEW_STACK_EXTRA_COLUMN_NAMES.has(`${key}.${c.name}`));
        const vendor = extraCols.filter((c) => !NEW_STACK_EXTRA_COLUMN_NAMES.has(`${key}.${c.name}`));
        if (vendor.length) {
          notes.push(
            `\`${key}\` gains ${vendor.length} column(s) from DDT-6600 (m1-schema, see research/6600/db-diff.md): ${vendor.map((c) => c.name).join(", ")} — nullable or with an explicit DEFAULT, no behaviour change for existing rows/4.1 code paths.`,
          );
        }
        if (newStack.length) {
          notes.push(
            `\`${key}\` also gains ${newStack.length} column(s) with no vendor equivalent (new-stack addition, see the EXTRA_COLUMNS comment for the task): ${newStack.map((c) => c.name).join(", ")} — nullable or with an explicit DEFAULT, no behaviour change for existing rows.`,
          );
        }
      }
    }
    if (!pk.length) {
      const k = pickSyntheticKey(schema, t);
      if (k) {
        pk = k.cols;
        synthetic.push(`| ${schema} | ${t.name} | ${k.cols.join(", ")} | ${k.why} |`);
      } else heaps.push(`${schema}.${t.name}`);
    }
    for (const c of cols) {
      if (c.computed) throw new Error(`computed column ${t.name}.${c.name} not supported`);
      const { expr, kind } = mapType(c, imp);
      let e = expr;
      if (c.identity) e += ".generatedByDefaultAsIdentity()";
      if (!c.nullable || pk.includes(c.name)) e += ".notNull()";
      const d = mapDefault(c, kind, `${schema}.${t.name}`, imp);
      if (d && !c.identity) e += d;
      lines.push(`    ${tsKey(c.name)}: ${e},`);
    }
    const extra: string[] = [];
    if (pk.length) {
      extrasImp.add("primaryKey");
      extra.push(`primaryKey({ name: ${JSON.stringify(`${t.name}_pkey`)}, columns: [${pk.map((c) => `t.${tsKey(c)}`).join(", ")}] })`);
    }
    for (const ix of t.indexes) {
      const f = ix.unique ? "uniqueIndex" : "index";
      extrasImp.add(f);
      extra.push(`${f}(${JSON.stringify(ix.name)}).on(${ix.cols.map((c) => `t.${tsKey(c)}`).join(", ")})`);
    }
    for (const ix of EXTRA_INDEXES[`${schema}.${t.name}`] ?? []) {
      for (const c of ix.cols) if (!t.columns.some((x) => x.name === c)) throw new Error(`EXTRA_INDEXES: ${t.name}.${c} missing`);
      const f = ix.unique ? "uniqueIndex" : "index";
      extrasImp.add(f);
      const name = `IX_${t.name}_${ix.cols.join("_")}`;
      extra.push(`${f}(${JSON.stringify(name)}).on(${ix.cols.map((c) => `t.${tsKey(c)}`).join(", ")}) /* added, not in original */`);
    }
    for (const fk of t.foreignKeys) {
      // Only Db_Membership.Mem_Paths has one (empty table) — kept as a comment, not enforced, like the C# expects nothing.
      notes.push(`FK \`${fk.name}\` on \`${schema}.${t.name}(${fk.cols.join(",")})\` -> \`${fk.ref}(${fk.refCols.join(",")})\` is not emitted (ref is not a PK/unique in a way that matters; table is empty).`);
    }
    const srcLabel = sixNames.has(t.name) ? "DDT-6600 Db_Tank" : db;
    out.push(
      `/** ${srcLabel}.dbo.${t.name} — ${t.rows} rows in source${sixNames.has(t.name) ? " (new, m1-schema)" : ""}${pk.length ? `; PK (${pk.join(", ")})` : "; heap (no PK)"} */`,
      `export const ${t.name} = ${schema}.table(`,
      `  ${JSON.stringify(t.name)},`,
      `  {`,
      ...lines,
      `  },`,
      ...(extra.length ? [`  (t) => [`, ...extra.map((x) => `    ${x},`), `  ],`] : []),
      `);`,
      ``,
    );
  }
  const pgCore = [...imp].filter((x) => x !== "sql").concat([...extrasImp]).sort();
  const header = [
    `// AUTO-GENERATED by scripts/gen-schema.ts from ${db} catalog.json${
      schema === "game" || schema === "player" ? " + the DDT-6600 gameplay tables (m1-schema, see scripts/schema-6600-tables.ts)" : ""
    } — DO NOT EDIT.`,
    `/* eslint-disable */`,
    `import { ${pgCore.join(", ")} } from "drizzle-orm/pg-core";`,
    ...(imp.has("sql") ? [`import { sql } from "drizzle-orm";`] : []),
    `import { ${schema}${out.join("\n").includes("bytea(") ? ", bytea" : ""} } from "./schemas.js";`,
    ``,
  ];
  writeFileSync(join(SCHEMA_DIR, `${schema}.ts`), header.join("\n") + "\n" + out.join("\n"));
  generated.push({ schema, file: `${schema}.ts` });
  console.log(`${schema}.ts: ${tables.length} tables`);
}

writeFileSync(
  join(SCHEMA_DIR, "schemas.ts"),
  `// AUTO-GENERATED by scripts/gen-schema.ts — DO NOT EDIT.
import { customType, pgSchema } from "drizzle-orm/pg-core";

/** Project_Game34 (templates) */
export const game = pgSchema("game");
/** Project_Player34 (player data + a few config tables) */
export const player = pgSchema("player");
/** Db_Membership (web accounts; schema only) + the new "Accounts" table */
export const member = pgSchema("member");

/** SQL Server varbinary/image -> bytea */
export const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});
`,
);

// README: replace the generated block
const readmePath = join(PKG_ROOT, "README.md");
if (existsSync(readmePath)) {
  const begin = "<!-- gen-schema:begin -->";
  const end = "<!-- gen-schema:end -->";
  const block = [
    begin,
    "",
    "Synthetic primary keys (the original table is a heap):",
    "",
    "| schema | table | key | why it is safe |",
    "|---|---|---|---|",
    ...synthetic,
    "",
    `Still heaps (no safe key, left without PK): ${heaps.map((h) => `\`${h}\``).join(", ")}.`,
    "",
    ...(notes.length ? ["Other translation notes:", "", ...notes.map((n) => `- ${n}`), ""] : []),
    end,
  ].join("\n");
  const md = readFileSync(readmePath, "utf8");
  const i = md.indexOf(begin);
  const j = md.indexOf(end);
  if (i >= 0 && j > i) writeFileSync(readmePath, md.slice(0, i) + block + md.slice(j + end.length));
}
console.log(`synthetic PKs: ${synthetic.length}, heaps: ${heaps.length}, notes: ${notes.length}`);
