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
import { DATABASES, PKG_ROOT, SCHEMA_DIR, SEED_DIR, catalogPath } from "../src/paths.js";

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
};

/** Natural-key column names tried (in order) for PK-less, non-empty template tables in `game`. */
const NATURAL_KEY_CANDIDATES = ["ID", "Id", "id", "TemplateID"];

// ---------------------------------------------------------------------------------------------------------------

type Imports = Set<string>;
const notes: string[] = []; // synthetic key / special-case notes -> README

function loadSeedRows(schema: string, table: string): Record<string, unknown>[] | null {
  const p = join(SEED_DIR, schema, `${table}.json.gz`);
  if (!existsSync(p)) return null;
  return JSON.parse(gunzipSync(readFileSync(p)).toString("utf8"));
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

for (const { db, schema } of DATABASES) {
  const cat = JSON.parse(readFileSync(catalogPath(db), "utf8")) as { tables: CatTable[] };
  const imp: Imports = new Set();
  const extrasImp: Imports = new Set();
  const out: string[] = [];
  const tables = [...cat.tables].sort((a, b) => a.name.localeCompare(b.name));
  for (const t of tables) {
    if (t.schema !== "dbo") throw new Error(`non-dbo table ${t.schema}.${t.name}`);
    const lines: string[] = [];
    let pk = t.primaryKey;
    if (!pk.length) {
      const k = pickSyntheticKey(schema, t);
      if (k) {
        pk = k.cols;
        synthetic.push(`| ${schema} | ${t.name} | ${k.cols.join(", ")} | ${k.why} |`);
      } else heaps.push(`${schema}.${t.name}`);
    }
    for (const c of t.columns) {
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
    out.push(
      `/** ${db}.dbo.${t.name} — ${t.rows} rows in source${pk.length ? `; PK (${pk.join(", ")})` : "; heap (no PK)"} */`,
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
    `// AUTO-GENERATED by scripts/gen-schema.ts from ${db} catalog.json — DO NOT EDIT.`,
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
