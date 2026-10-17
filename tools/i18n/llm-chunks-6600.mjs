// Mesma ideia de tools/i18n/llm-chunks.mjs (split/build pra tradução manual/LLM em lote), mas pro
// language.txt do 6600: usa research/i18n/lang-6600-untranslated-pairs.json (gerado por
// `node tools/i18n/lang-6600.mjs --dry`) em vez de jsonl de linhas de banco. Motivo de existir: os
// provedores de MT gratuitos (tools/i18n/mt-6600.mjs) ficaram bloqueados/sem cota no meio desta tarefa
// (Google gtx 429 "automated queries", MyMemory "ALL AVAILABLE FREE TRANSLATIONS FOR TODAY") — tradução
// feita a mão/por LLM nos chunks in-NNN.json, resultado em out-NNN.json, "build" funde em
// data/i18n/pt-BR/lang-6600-extra.json (sem sobrescrever o que já tem lá, a menos que --force).
//   node tools/i18n/llm-chunks-6600.mjs split [tamanhoDoLote=200]
//   node tools/i18n/llm-chunks-6600.mjs build [--force]
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PAIRS_FILE = "research/i18n/lang-6600-untranslated-pairs.json";
const WORK_DIR = "data/i18n/_work/llm6600";
const EXTRA_JSON = "data/i18n/pt-BR/lang-6600-extra.json";
const PURE_RE = /^[\s0-9.,:%+\-\/]*$|^https?:\/\//;
const cleanQuotes = (s) => s.replace(/^"+/, "").replace(/"+$/, "").trim();

const mode = process.argv[2];

if (mode === "split") {
  const size = +(process.argv[3] ?? 200);
  const pairs = JSON.parse(readFileSync(PAIRS_FILE, "utf8"));
  const extra = existsSync(EXTRA_JSON) ? JSON.parse(readFileSync(EXTRA_JSON, "utf8")) : {};
  const seen = new Map(); // valor limpo -> indice
  const list = []; // valores distintos, em ordem de primeira ocorrencia
  const keysByValue = new Map();
  for (const [key, rawVal] of Object.entries(pairs)) {
    if (Object.prototype.hasOwnProperty.call(extra, key)) continue;
    const val = cleanQuotes(rawVal);
    if (!val || PURE_RE.test(val)) continue;
    if (!seen.has(val)) {
      seen.set(val, list.length);
      list.push(val);
      keysByValue.set(val, []);
    }
    keysByValue.get(val).push(key);
  }
  mkdirSync(WORK_DIR, { recursive: true });
  let n = 0;
  for (let i = 0; i < list.length; i += size) {
    const chunk = list.slice(i, i + size).map((tr, k) => ({ i: i + k, tr }));
    writeFileSync(join(WORK_DIR, `in-${String(n).padStart(3, "0")}.json`), JSON.stringify(chunk, null, 1));
    n++;
  }
  writeFileSync(join(WORK_DIR, "index.json"), JSON.stringify(list));
  writeFileSync(join(WORK_DIR, "keys-by-value.json"), JSON.stringify(Object.fromEntries(keysByValue)));
  console.log(`${list.length} valores turcos distintos (ja excluindo o que extra.json tem) -> ${n} lotes de ${size} em ${WORK_DIR}/in-NNN.json`);
} else if (mode === "build") {
  const force = process.argv.includes("--force");
  const list = JSON.parse(readFileSync(join(WORK_DIR, "index.json"), "utf8"));
  const keysByValue = JSON.parse(readFileSync(join(WORK_DIR, "keys-by-value.json"), "utf8"));
  const extra = existsSync(EXTRA_JSON) ? JSON.parse(readFileSync(EXTRA_JSON, "utf8")) : {};
  const tr = new Map(); // id -> pt
  for (const f of readdirSync(WORK_DIR).filter((f) => /^out-\d+\.json$/.test(f))) {
    for (const [i, pt] of Object.entries(JSON.parse(readFileSync(join(WORK_DIR, f), "utf8")))) {
      if (typeof pt === "string" && pt.trim()) tr.set(+i, pt);
    }
  }
  let added = 0, distinctDone = 0;
  for (const [i, turkish] of list.entries()) {
    const pt = tr.get(i);
    if (!pt) continue;
    distinctDone++;
    for (const key of keysByValue[turkish] ?? []) {
      if (!force && Object.prototype.hasOwnProperty.call(extra, key)) continue;
      extra[key] = pt;
      added++;
    }
  }
  const sorted = Object.fromEntries(Object.entries(extra).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  writeFileSync(EXTRA_JSON, JSON.stringify(sorted, null, 1) + "\n");
  console.log(`valores distintos traduzidos: ${distinctDone}/${list.length}; ${added} chaves novas escritas em ${EXTRA_JSON} (total ${Object.keys(sorted).length})`);
} else {
  console.error("uso: node tools/i18n/llm-chunks-6600.mjs split|build");
  process.exit(1);
}
