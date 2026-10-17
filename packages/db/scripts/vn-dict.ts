/**
 * Dicionário VN -> pt-BR por texto exato, para colunas que o overlay `app."Translations"` não cobre
 * (tabela sem PK, consumidor que lê `game.*` direto: admin, Active, Mission_Info.Success...).
 *
 *   build  lê data/i18n/_work/vn-scan/*.jsonl (saída de vn-scan.ts), junta textos distintos e grava
 *          data/i18n/_work/vn-dict/todo-NN.json (`{ "<vn>": "" }`, 150 por arquivo). Pré-preenche com
 *          tradução já existente (Translations.sourceText -> text) e com data/i18n/pt-BR/vn-dict.json.
 *   merge  junta todo-NN.json preenchidos em data/i18n/pt-BR/vn-dict.json (valor vazio é ignorado).
 *   apply  UPDATE em toda coluna listada no vn-scan: `coluna = pt` onde `coluna = vn`, no banco vivo E
 *          nos seeds packages/db/seed/game/<Tabela>.json.gz (re-seed não volta o vietnamita).
 *
 * Como lê esse código (cada variável): `SCAN` pasta do vn-scan; `TODO` pasta dos lotes; `DICT` dicionário
 * final; `dict` mapa vn->pt; `texts` textos distintos pendentes; `pre` traduções já existentes;
 * `cols` lista schema.tabela.coluna; `seedFile` seed gz da tabela; `rows` linhas do seed; `n` trocas.
 *
 * Uso: DATABASE_URL=... pnpm --filter @ddt/db exec tsx scripts/vn-dict.ts build|merge|apply
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import postgres from "postgres";
import { REPO_ROOT, SEED_DIR } from "../src/paths.js";

const SCAN = join(REPO_ROOT, "data", "i18n", "_work", "vn-scan");
const TODO = join(REPO_ROOT, "data", "i18n", "_work", "vn-dict");
const DICT = join(REPO_ROOT, "data", "i18n", "pt-BR", "vn-dict.json");
const URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/ddtank";

const readDict = (): Record<string, string> => (existsSync(DICT) ? JSON.parse(readFileSync(DICT, "utf8")) : {});
const scanFiles = () => readdirSync(SCAN).filter((f) => f.endsWith(".jsonl"));
const lines = (f: string) => readFileSync(join(SCAN, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as { rowId: string; text: string });

async function build() {
  const dict = readDict();
  const sql = postgres(URL, { max: 1 });
  const pre = new Map((await sql<{ s: string; t: string }[]>`select "sourceText" s, text t from app."Translations" where lang='pt-BR' and "sourceText" is not null`).map((r) => [r.s.trim(), r.t]));
  await sql.end();
  const texts = new Set<string>();
  for (const f of scanFiles()) for (const { text } of lines(f)) texts.add(text);
  const todo: Record<string, string>[] = [];
  let cur: Record<string, string> = {};
  let filled = 0;
  for (const t of [...texts].sort()) {
    const v = dict[t] ?? pre.get(t.trim()) ?? "";
    if (v) filled++;
    if (v && dict[t]) continue;
    cur[t] = v;
    if (Object.keys(cur).length === 150) todo.push(cur), (cur = {});
  }
  if (Object.keys(cur).length) todo.push(cur);
  rmSync(TODO, { recursive: true, force: true });
  mkdirSync(TODO, { recursive: true });
  todo.forEach((c, i) => writeFileSync(join(TODO, `todo-${String(i + 1).padStart(2, "0")}.json`), JSON.stringify(c, null, 1)));
  console.log(`${texts.size} textos, ${filled} pré-preenchidos, ${todo.length} lotes em ${TODO}`);
}

function merge() {
  const dict = readDict();
  let n = 0;
  for (const f of readdirSync(TODO).filter((f) => /^todo-\d+\.json$/.test(f))) {
    for (const [vn, pt] of Object.entries(JSON.parse(readFileSync(join(TODO, f), "utf8")) as Record<string, string>)) {
      if (pt && pt.trim() && dict[vn] !== pt) (dict[vn] = pt), n++;
    }
  }
  writeFileSync(DICT, JSON.stringify(dict, null, 1));
  console.log(`${n} entradas novas/alteradas, ${Object.keys(dict).length} no total -> ${DICT}`);
}

async function apply() {
  const dict = readDict();
  const cols = scanFiles().map((f) => f.replace(/\.jsonl$/, "").split("."));
  const sql = postgres(URL, { max: 1, onnotice: () => {} });
  let total = 0;
  for (const [s, t, c] of cols) {
    let n = 0;
    for (const { text } of lines(`${s}.${t}.${c}.jsonl`)) {
      const pt = dict[text];
      if (!pt) continue;
      const r = await sql.unsafe(`update "${s}"."${t}" set "${c}" = $1 where "${c}" = $2`, [pt, text]);
      n += r.count;
    }
    const seedFile = join(SEED_DIR, s, `${t}.json.gz`);
    let ns = 0;
    if (existsSync(seedFile)) {
      const rows = JSON.parse(gunzipSync(readFileSync(seedFile)).toString("utf8")) as Record<string, unknown>[];
      for (const row of rows) {
        const v = row[c];
        if (typeof v === "string" && dict[v]) (row[c] = dict[v]), ns++;
      }
      if (ns) writeFileSync(seedFile, gzipSync(JSON.stringify(rows)));
    }
    if (n || ns) console.log(`${s}.${t}.${c}: banco ${n}, seed ${ns}`);
    total += n;
  }
  await sql.end();
  console.log(`total ${total} linhas atualizadas no banco`);
}

const cmd = process.argv[2];
if (cmd === "build") await build();
else if (cmd === "merge") merge();
else if (cmd === "apply") await apply();
else console.log("uso: vn-dict.ts build|merge|apply");
