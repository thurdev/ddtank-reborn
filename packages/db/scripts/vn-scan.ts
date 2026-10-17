/**
 * Varre TODAS as colunas texto de `game` + `app` no banco vivo e lista as que ainda têm vietnamita
 * sem tradução pt-BR em `app."Translations"`.
 *
 * Saída: data/i18n/_work/vn-scan/<schema>.<Table>.<Column>.jsonl (`{rowId, text}`) + resumo no stdout.
 * Tabela sem PK simples é listada no resumo (precisa de tratamento à mão).
 *
 * Como lê esse código (cada variável): `VN` regex das letras só-vietnamitas; `cols` colunas texto do
 * information_schema; `pks` PK de 1 coluna por tabela; `done` chaves já traduzidas (`tabela|coluna|rowId`);
 * `hits` linhas vietnamitas sem tradução por tabela.coluna.
 *
 * Uso: DATABASE_URL=... pnpm --filter @ddt/db exec tsx scripts/vn-scan.ts
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { REPO_ROOT } from "../src/paths.js";

const VN = /[ăđơưĂĐƠƯạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ]/;
const OUT = join(REPO_ROOT, "data", "i18n", "_work", "vn-scan");
const sql = postgres(process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/ddtank", { max: 2, onnotice: () => {} });

const cols = await sql<{ s: string; t: string; c: string }[]>`
  select table_schema s, table_name t, column_name c from information_schema.columns
  where table_schema in ('game','app') and (table_schema, table_name) in (select table_schema, table_name from information_schema.tables where table_type = 'BASE TABLE') and data_type in ('text','character varying','character')
    and table_name <> 'Translations' order by 1,2,3`;
const pkRows = await sql<{ s: string; t: string; c: string; n: number }[]>`
  select tc.table_schema s, tc.table_name t, min(kcu.column_name) c, count(*)::int n
  from information_schema.table_constraints tc join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema in ('game','app') group by 1,2`;
const pks = new Map(pkRows.filter((r) => r.n === 1).map((r) => [`${r.s}.${r.t}`, r.c]));
const done = new Set((await sql<{ k: string }[]>`select "table"||'|'||"column"||'|'||"rowId" k from app."Translations" where lang='pt-BR'`).map((r) => r.k));

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) rmSync(join(OUT, f), { force: true });
mkdirSync(OUT, { recursive: true });
const summary: string[] = [];
const noPk = new Set<string>();
let total = 0;
for (const { s, t, c } of cols) {
  const pk = pks.get(`${s}.${t}`);
  const rows = await sql.unsafe(`select ${pk ? `"${pk}"::text` : "ctid::text"} id, "${c}" v from "${s}"."${t}" where "${c}" ~ '[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹĐ]'`);
  const hits = rows.filter((r) => typeof r.v === "string" && VN.test(r.v) && !done.has(`${t}|${c}|${r.id}`));
  if (!hits.length) continue;
  if (!pk) noPk.add(`${s}.${t}`);
  writeFileSync(join(OUT, `${s}.${t}.${c}.jsonl`), hits.map((r) => JSON.stringify({ rowId: String(r.id), text: r.v })).join("\n") + "\n");
  summary.push(`${s}.${t}.${c}\t${hits.length}${pk ? "" : "\t(sem PK)"}`);
  total += hits.length;
}
await sql.end();
console.log(summary.join("\n"));
console.log(`\n${summary.length} colunas, ${total} linhas VN sem tradução. Sem PK: ${[...noPk].join(", ") || "nenhuma"}`);
