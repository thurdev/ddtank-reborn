// Traducao em massa turco -> PT-BR das chaves do DDT-6600 que tools/i18n/lang-6600.mjs ainda nao resolveu
// nem pela 4.1 (client-language.txt) nem por data/i18n/pt-BR/lang-6600-extra.json (ver esse script pro
// pipeline completo + motivo do formato). Mesmo padrao de tools/i18n/mt.ts (lote, mascara placeholders,
// cache em disco, retry/split em caso de desalinhamento), adaptado pra turco->pt e pro formato key:value
// (em vez de jsonl de linhas de banco).
//
// Entrada: research/i18n/lang-6600-untranslated-pairs.json (key -> valor turco), gerado por
//          `node tools/i18n/lang-6600.mjs --dry`.
// Saida:   merge em data/i18n/pt-BR/lang-6600-extra.json (NAO sobrescreve chave ja existente lá, a menos
//          que --force; permite revisao manual persistir entre rodadas de MT).
// Cache:   data/i18n/cache/tr-pt-BR.json (resumavel).
//
//   node tools/i18n/mt-6600.mjs [--limit N] [--force] [--dry]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const PAIRS_FILE = "research/i18n/lang-6600-untranslated-pairs.json";
const EXTRA_JSON = "data/i18n/pt-BR/lang-6600-extra.json";
const CACHE_FILE = "data/i18n/cache/tr-pt-BR.json";
const SL = "tr", TL = "pt";

function parseArgs(argv) {
  const a = { dry: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") a.limit = Number(argv[++i]);
    else if (argv[i] === "--dry") a.dry = true;
    else if (argv[i] === "--force") a.force = true;
  }
  return a;
}

// ---- glossario de termos do jogo (Turco -> PT-BR), pra manter consistencia com client-language.txt (4.1) ----
// Aplicado como passe de palavra-inteira DEPOIS do MT (MT raramente usa o termo de jogo certo sozinho).
// "Bombom" é a marca do pack turco original (servidor "Bombom") — nunca mantida, ver AGENTS.md/tarefa.
const GLOSSARY = [
  [/\bBombom\b/gi, "DDTank"],
  [/\bbirli(ğ|g)(i|e|in|e|ini|iniz|ine)?\b/gi, "sociedade"], // Birlik = guild (nosso termo: Sociedade)
  [/\bBirli(ğ|g)(i|e|in|ini|iniz|ine)?\b/g, "Sociedade"],
  [/\bkonsorsiyum\b/gi, "sociedade"],
  [/\buzak sunucu(ya|yu|nun|da|dan)?\b/gi, "calabouço"], // "uzak sunucu" (servidor remoto) = Dungeon/PvE instanciado
  [/\bfüzyon\b/gi, "fusão"],
  [/\bbağış(lama)?\b/gi, "doação"],
];
function applyGlossary(text) {
  let out = text;
  for (const [re, pt] of GLOSSARY) out = out.replace(re, pt);
  return out;
}

// ---- masking de placeholders: {0}, <tag ...>, literal "\n"/"\r" (2 chars) E quebra de linha real -------
// (os valores vêm de research/i18n/lang-6600-untranslated-pairs.json, já DECODIFICADOS por lang-6600.mjs
// — ou seja "\n" já é um caractere de controle real, não 2 chars — e um "\n" real nao mascarado dentro de
// um item quebraria o empacotamento em packChunk/unpackChunk, que usa "\n" como separador entre itens).
const PLACEHOLDER_RE = /\{\d+\}|<[^>]+>|\\n|\\r|\r\n|\r|\n/g;
function mask(text) {
  const tokens = [];
  const masked = text.replace(PLACEHOLDER_RE, (m) => {
    tokens.push(m);
    return ` §${tokens.length - 1}§ `;
  });
  return { masked, tokens };
}
function unmask(text, tokens) {
  return text
    .replace(/[ \t]*§[ \t]*(\d+)[ \t]*§[ \t]*/g, (_m, n) => ` ${tokens[Number(n)] ?? ""} `)
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function fetchText(url, init, timeoutMs = 10_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    return body;
  } finally {
    clearTimeout(t);
  }
}

async function mtGoogle(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${SL}&tl=${TL}&dt=t&q=${encodeURIComponent(text)}`;
  const body = await fetchText(url);
  const data = JSON.parse(body);
  const out = (data[0] ?? []).map((p) => p[0]).join("");
  if (!out) throw new Error("google: traducao vazia");
  return out;
}

class QuotaExceeded extends Error {}
async function mtMyMemory(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${SL}|${TL}-BR`;
  const body = await fetchText(url);
  const data = JSON.parse(body);
  const out = data.responseData?.translatedText ?? "";
  if (data.quotaFinished || /MYMEMORY WARNING/i.test(out)) throw new QuotaExceeded("mymemory: quota esgotada");
  if (!out || Number(data.responseStatus) >= 400) throw new Error(`mymemory: ${out || data.responseStatus}`);
  return out;
}

const MARKER_RE = /^@@(\d+)@@\s?([\s\S]*)$/;
const packChunk = (texts) => texts.map((t, i) => `@@${i}@@ ${t}`).join("\n");
function unpackChunk(translated, expected) {
  const out = new Map();
  for (const line of translated.split("\n")) {
    const m = MARKER_RE.exec(line.trim());
    if (!m) continue;
    out.set(Number(m[1]), m[2] ?? "");
  }
  if (out.size !== expected) throw new Error(`lote desalinhado: ${out.size}/${expected} marcadores`);
  return Array.from({ length: expected }, (_, i) => {
    const v = out.get(i);
    if (v === undefined) throw new Error(`lote desalinhado: marcador ${i} ausente`);
    return v;
  });
}

const disabled = new Set();
async function retry(fn, attempts = 2, backoff = [500, 1500]) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (e instanceof QuotaExceeded) throw e;
      await new Promise((r) => setTimeout(r, backoff[i] ?? 1500));
    }
  }
  throw lastErr;
}

async function translateBatch(texts) {
  const providers = [
    { name: "google", fn: mtGoogle },
    { name: "mymemory", fn: mtMyMemory },
  ].filter((p) => !disabled.has(p.name));
  if (!providers.length) throw new Error("todos os provedores desabilitados");
  const packed = packChunk(texts);
  const attempts = providers.map(({ name, fn }) =>
    retry(() => fn(packed))
      .then((raw) => ({ texts: unpackChunk(raw, texts.length), provider: name }))
      .catch((e) => {
        if (e instanceof QuotaExceeded) disabled.add(name);
        throw e;
      }),
  );
  try {
    return await Promise.any(attempts);
  } catch {
    if (texts.length === 1) throw new Error("falhou em todos os provedores (item unico)");
    const mid = Math.ceil(texts.length / 2);
    const [a, b] = await Promise.all([translateBatch(texts.slice(0, mid)), translateBatch(texts.slice(mid))]);
    return { texts: [...a.texts, ...b.texts], provider: `${a.provider}+${b.provider}` };
  }
}

async function pool(items, limit, fn) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pairs = JSON.parse(readFileSync(PAIRS_FILE, "utf8"));
  const extra = existsSync(EXTRA_JSON) ? JSON.parse(readFileSync(EXTRA_JSON, "utf8")) : {};
  const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, "utf8")) : {};

  // uma traducao por VALOR turco distinto (varias chaves compartilham o mesmo texto) — nao gasta request
  // duplicado; "" / so-numero / so-url nao precisam de MT.
  const PURE_RE = /^[\s0-9.,:%+\-\/]*$|^https?:\/\//;
  const distinctValues = new Map(); // turco -> {keys:[]}
  for (const [key, val] of Object.entries(pairs)) {
    if (!args.force && Object.prototype.hasOwnProperty.call(extra, key)) continue; // ja tem traducao manual/extra
    const clean = val.replace(/^"/, ""); // remove aspas orfas de multi-linha turco quebrado (ver lang-6600.mjs)
    if (!clean.trim() || PURE_RE.test(clean)) continue; // nada a traduzir (vazio/numero/url)
    if (!distinctValues.has(val)) distinctValues.set(val, []);
    distinctValues.get(val).push(key);
  }

  const todo = [...distinctValues.keys()].filter((v) => !cache[v]);
  console.log(`valores turcos distintos a traduzir: ${distinctValues.size}, ${todo.length} fora do cache`);
  if (args.dry) process.exit(0);

  const batch = args.limit !== undefined ? todo.slice(0, args.limit) : todo;
  const premasked = batch.map((src) => ({ src, ...mask(src.replace(/^"/, "")) }));
  const CHAR_BUDGET = 420, MAX_ITEMS = 60;
  const chunks = [];
  let cur = [], curLen = 0;
  for (const m of premasked) {
    const lineLen = m.masked.length + 8;
    if (cur.length && (curLen + lineLen > CHAR_BUDGET || cur.length >= MAX_ITEMS)) {
      chunks.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(m);
    curLen += lineLen;
  }
  if (cur.length) chunks.push(cur);

  let done = 0, failed = 0, chunksDone = 0;
  const t0 = Date.now();
  await pool(chunks, 4, async (items) => {
    try {
      const { texts } = await translateBatch(items.map((m) => m.masked));
      for (let i = 0; i < items.length; i++) {
        const pt = applyGlossary(unmask(texts[i], items[i].tokens));
        cache[items[i].src] = pt;
      }
      done += items.length;
    } catch (e) {
      failed += items.length;
      console.warn(`  lote de ${items.length} falhou: ${e.message?.slice(0, 160)}`);
    }
    chunksDone++;
    if (chunksDone % 5 === 0 || chunksDone === chunks.length) {
      console.log(`  progresso: ${chunksDone}/${chunks.length} lotes, ${done} ok, ${failed} falhas, ${Math.round((Date.now() - t0) / 1000)}s`);
      writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1)); // salva incremental (resumavel se cair)
    }
  });
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
  console.log(`MT: ${done} ok, ${failed} falhas em ${Math.round((Date.now() - t0) / 1000)}s`);

  // aplica o cache (inclui traducoes de rodadas anteriores) em todas as chaves pendentes -> extra.json
  let added = 0;
  for (const [val, keys] of distinctValues) {
    const pt = cache[val];
    if (!pt) continue;
    for (const key of keys) {
      if (!args.force && Object.prototype.hasOwnProperty.call(extra, key)) continue;
      extra[key] = pt;
      added++;
    }
  }
  const sortedExtra = Object.fromEntries(Object.entries(extra).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  writeFileSync(EXTRA_JSON, JSON.stringify(sortedExtra, null, 1) + "\n");
  console.log(`${added} chaves novas escritas em ${EXTRA_JSON} (total ${Object.keys(sortedExtra).length})`);
}

await main();
