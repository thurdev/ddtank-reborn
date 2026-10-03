/**
 * Bulk machine translation for the DB text pipeline (docs/BACKLOG.md "Localização PT-BR — lote 2026-10-03").
 *
 * Input:  data/i18n/_work/db/<Table>.<Column>.jsonl   (produced by packages/db/scripts/export-texts.ts)
 * Output: data/i18n/pt-BR/db/<Table>.<Column>.jsonl   (consumed by packages/db/scripts/import-translations.ts)
 * Cache:  data/i18n/cache/<sl>-<tl>.json               ({ [sourceText]: { text, provider, ts } }, resumable)
 *
 * All distinct source strings across every target file are collected once (duplicates across rows/tables are
 * translated a single time), ordered by visibility (see PRIORITY below — shop items and quest text first),
 * then machine-translated with on-disk caching so a rerun only translates what's new.
 *
 * Strings are translated in CHUNK_SIZE-sized batches (default 50, one HTTP request per chunk: all of its
 * strings joined as "@@0@@ text\n@@1@@ text\n..."), not one request per string — far fewer requests is what
 * actually keeps the public endpoints from throttling us. Every provider — Google's public gtx endpoint,
 * MyMemory, a list of public LibreTranslate mirrors — is raced in parallel per chunk (first well-formed
 * response wins), so one provider throttling/blocking never stalls the others. A chunk whose response doesn't
 * parse back to the same line count (reflowed/dropped/reordered lines) is split in half and retried
 * recursively down to single strings, which always round-trip cleanly. Placeholders ({0}, %s, <tags>, literal
 * "\n") and glossary terms (data/i18n/glossary.json) are masked out before the call and restored after, so MT
 * never mangles them and glossary terms come back as the same canonical PT-BR word everywhere.
 *
 * Usage: node_modules/.bin/tsx tools/i18n/mt.ts [--limit N] [--only Table.Column,...] [--chunk N] [--char-budget N] [--dry]
 *   --limit N        stop after translating N new distinct strings this run (quota control)
 *   --only LIST      comma list of "Table.Column" file stems to translate/export (default: all, minus SKIP)
 *   --chunk N        max strings per HTTP request (default 80)
 *   --char-budget N  max masked chars per HTTP request (default 420, safely under MyMemory's hard 500 cap)
 *   --dry            don't call any MT provider; just report how many distinct strings are missing from the cache
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const WORK_DIR = join(ROOT, "data", "i18n", "_work", "db");
const OUT_DIR = join(ROOT, "data", "i18n", "pt-BR", "db");
const CACHE_DIR = join(ROOT, "data", "i18n", "cache");
const GLOSSARY_FILE = join(ROOT, "data", "i18n", "glossary.json");

const SL = "vi";
const TL = "pt-BR";
const TL_QUERY = "pt-BR"; // MyMemory wants the region; the gtx endpoint wants a bare "pt"
const CACHE_FILE = join(CACHE_DIR, `${SL}-${TL}.json`);

/** Already hand/LLM-translated in a previous round (docs/BACKLOG.md) — never overwritten by raw MT here. */
const SKIP_STEMS = new Set(["Pve_Info.Name", "Pve_Info.Description", "Game_Map.Name"]);

/** Visibility order (BACKLOG step 1): shop items the player buys first, then quest text, then names seen in
 * NPC/mission lists, then pets/equips, then everything else. Anything not listed keeps file order, after these. */
const PRIORITY = [
  "Shop_Goods.Name",
  "Shop_Goods.Description",
  "Shop_Goods.Remark",
  "Quest.Title",
  "Quest.Detail",
  "Quest.Objective",
  "NPC_Info.Name",
  "Mission_Info.Name",
  "Mission_Info.Title",
  "Mission_Info.Description",
  "Mission_Info_Backup.Name",
  "Mission_Info_Backup.Title",
  "Mission_Info_Backup.Description",
  "Pet_Template_Info.Name",
  "Pet_Template_Info.Description",
  "Pet_Skill_Info.Name",
  "Pet_Skill_Info.Description",
  "Pet_Skill_Element_Info.Name",
  "Pet_Skill_Element_Info.Description",
  "Achievement.Title",
  "Achievement.Detail",
  "New_Title.Title",
  "Rune_Template.Name",
  "SuitTemplateInfo.SuitName",
  "SuitTemplateInfo.SkillDescribe1",
  "SuitTemplateInfo.SkillDescribe2",
  "SuitTemplateInfo.SkillDescribe3",
  "SuitTemplateInfo.SkillDescribe4",
  "SuitTemplateInfo.SkillDescribe5",
  "Card_Info.Name",
  "Card_Info.Description",
  "Consortia_BuffTemp.name",
  "Consortia_BuffTemp.descript",
  "Game_Map.Description",
];

// ---- CLI args -------------------------------------------------------------------------------------------------

interface Args { limit?: number; only?: Set<string>; dry: boolean; chunkSize?: number; charBudget?: number }
function parseArgs(argv: string[]): Args {
  const a: Args = { dry: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") a.limit = Number(argv[++i]);
    else if (argv[i] === "--only") a.only = new Set(argv[++i]!.split(","));
    else if (argv[i] === "--dry") a.dry = true;
    else if (argv[i] === "--chunk") a.chunkSize = Number(argv[++i]);
    else if (argv[i] === "--char-budget") a.charBudget = Number(argv[++i]);
  }
  return a;
}

// ---- glossary + placeholder masking ----------------------------------------------------------------------------

type GlossaryEntry = [vi: string, pt: string];

function loadGlossary(): GlossaryEntry[] {
  const raw = JSON.parse(readFileSync(GLOSSARY_FILE, "utf8")) as GlossaryEntry[];
  // Longest phrase first so e.g. "đá cường hóa" matches whole before "cường hóa" grabs part of it.
  return raw.slice().sort((a, b) => b[0].length - a[0].length);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Builds one big alternation (glossary phrases, longest first | placeholder syntax) used to mask a string
 * before sending it to MT. Returns the masked text plus the list of restore values (PT glossary term for a
 * glossary hit, the original substring verbatim for a placeholder) indexed by token number. */
function buildMasker(glossary: GlossaryEntry[]) {
  const glossaryRe = glossary.map(([vi]) => escapeRe(vi)).join("|");
  // {0}-style template args, %s/%d, HTML-ish tags, literal backslash-n (DB text sometimes stores "\n" as two
  // chars, not an actual newline), AND real \r\n/\r/\n control characters — a handful of Shop_Goods.Description
  // / Quest.Detail rows have an actual embedded newline (e.g. row 7135: "...nhất\r\nKhông thể..."). Those must
  // be masked now that translation happens in line-delimited batches (one "@@N@@ text" per line): an
  // unmasked embedded newline would split one item across two lines and desync every @@N@@ marker after it.
  const placeholderRe = String.raw`\{\d+\}|%[sd]|<[^>]+>|\\n|\r\n|\r|\n`;
  const re = new RegExp(`(${glossaryRe})|(${placeholderRe})`, "giu");
  const ptByVi = new Map(glossary.map(([vi, pt]) => [vi.toLowerCase(), pt]));

  return function mask(text: string): { masked: string; tokens: string[] } {
    const tokens: string[] = [];
    const masked = text.replace(re, (m, glossHit) => {
      const i = tokens.length;
      tokens.push(glossHit ? (ptByVi.get(glossHit.toLowerCase()) ?? m) : m);
      return ` X${i}X `;
    });
    return { masked, tokens };
  };
}

function unmask(translated: string, tokens: string[]): string {
  return translated
    .replace(/[ \t]*X[ \t]*(\d+)[ \t]*X[ \t]*/gi, (_m, n) => ` ${tokens[Number(n)] ?? ""} `)
    // Collapse extra spaces/tabs left over from the " token " padding above, but never touch \n/\r: a restored
    // token can legitimately BE a real newline (see buildMasker — embedded \r\n rows), and that must survive.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+(\r?\n)/g, "$1")
    .replace(/(\r?\n)[ \t]+/g, "$1")
    .trim();
}

// ---- MT providers ----------------------------------------------------------------------------------------------

class QuotaExceeded extends Error {}

async function fetchText(url: string, init?: RequestInit, timeoutMs = 10_000): Promise<string> {
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

/** translate.googleapis.com public "gtx" client — same endpoint Google Translate's own web widget uses. */
async function mtGoogle(text: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${SL}&tl=pt&dt=t&q=${encodeURIComponent(text)}`;
  const body = await fetchText(url);
  const data = JSON.parse(body) as [[string, string, ...unknown[]][]];
  const parts = data[0] ?? [];
  const out = parts.map((p) => p[0]).join("");
  if (!out) throw new Error("google: empty translation");
  return out;
}

/** MyMemory (api.mymemory.translated.net) — free, anonymous ~ a few thousand words/day per IP, AND a hard
 * 500-character cap on the `q` text per request (see MT_CHAR_BUDGET below) — exceeding it comes back as a
 * normal 200 with responseStatus "403" and "QUERY LENGTH LIMIT EXCEEDED" in translatedText. That's a
 * per-request limit, not a quota: it must NOT disable the provider (only real quota exhaustion should), it
 * should just fail this one attempt so translateBatch's halving (or our char-budget chunking) handles it. */
async function mtMyMemory(text: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${SL}|${TL_QUERY}`;
  const body = await fetchText(url);
  const data = JSON.parse(body) as {
    responseStatus: number | string;
    responseData: { translatedText: string };
    quotaFinished?: boolean;
  };
  const out = data.responseData?.translatedText ?? "";
  if (data.quotaFinished || /MYMEMORY WARNING|TRANSLATIONS FOR TODAY/i.test(out)) {
    throw new QuotaExceeded(`mymemory: ${out || "quota exhausted"}`);
  }
  if (!out || Number(data.responseStatus) >= 400) throw new Error(`mymemory: ${out || data.responseStatus}`);
  return out;
}

/** Public LibreTranslate mirrors that accept anonymous POSTs without an API key. Kept as a documented fallback;
 * as of this batch (2026-10-03) every public mirror we could reach required an API key or returned an error —
 * see docs/BACKLOG.md for the exact probe results. Left wired up so a future run (or a different network) can
 * use it for free the moment one of these (or a newly added mirror) accepts anonymous requests again. */
const LIBRE_MIRRORS = ["https://libretranslate.de/translate", "https://translate.terraprint.co/translate"];
async function mtLibre(text: string): Promise<string> {
  let lastErr: unknown;
  for (const base of LIBRE_MIRRORS) {
    try {
      const body = await fetchText(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: SL, target: "pt", format: "text" }),
      });
      const data = JSON.parse(body) as { translatedText?: string; error?: string };
      if (data.translatedText) return data.translatedText;
      lastErr = new Error(data.error ?? "libretranslate: no translatedText");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("libretranslate: all mirrors failed");
}

const PROVIDERS: { name: string; fn: (text: string) => Promise<string> }[] = [
  { name: "google", fn: mtGoogle },
  { name: "mymemory", fn: mtMyMemory },
  { name: "libretranslate", fn: mtLibre },
];

/** Providers that have signaled a hard quota/block for the rest of this process (skip immediately, don't retry). */
const disabled = new Set<string>();

async function retry<T>(fn: () => Promise<T>, attempts = 2, backoffMs = [600, 2000]): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (e instanceof QuotaExceeded) throw e; // no point retrying a quota error
      await new Promise((r) => setTimeout(r, backoffMs[i] ?? 2000));
    }
  }
  throw lastErr;
}

// ---- batched translation ------------------------------------------------------------------------------------
//
// One HTTP request carries CHUNK_SIZE strings at once ("[[0]] text\n[[1]] text\n...") instead of one string per
// request — cuts request count ~50x, which is what was actually throttling us (Google's gtx endpoint started
// returning its anti-automation block page under sustained one-string-per-request load; see docs/BACKLOG.md).
// Every provider in PROVIDERS is tried IN PARALLEL per chunk (Promise.any): whichever responds with a
// correctly-shaped batch first wins, so a throttled/blocked provider never blocks the others. If every provider
// either fails or comes back with a line count that doesn't match (a provider reflowing/dropping a line), the
// chunk is split in half and retried recursively down to single strings, which always round-trips cleanly.

// "@@N@@" (not "[[N]]") empirically survives MT intact more often — bracket pairs occasionally lose one
// bracket in translation, which breaks the match; "@@" doesn't get touched.
const MARKER_RE = /^@@(\d+)@@\s?([\s\S]*)$/;

function packChunk(texts: string[]): string {
  return texts.map((t, i) => `@@${i}@@ ${t}`).join("\n");
}

/** Parses a provider's batched response back into one string per input index, or throws if the shape doesn't match
 * (wrong line count, missing/duplicate markers, reordering) — the caller then halves the batch and retries. */
function unpackChunk(translated: string, expected: number): string[] {
  const out = new Map<number, string>();
  for (const line of translated.split("\n")) {
    const m = MARKER_RE.exec(line.trim());
    if (!m) continue;
    out.set(Number(m[1]), m[2] ?? "");
  }
  if (out.size !== expected) throw new Error(`batch parse mismatch: got ${out.size}/${expected} markers`);
  return Array.from({ length: expected }, (_, i) => {
    const v = out.get(i);
    if (v === undefined) throw new Error(`batch parse mismatch: missing marker ${i}`);
    return v;
  });
}

interface BatchResult { texts: string[]; provider: string }

const jitter = (maxMs: number) => new Promise((r) => setTimeout(r, Math.random() * maxMs));

/** Translates one chunk of already-masked strings, racing every enabled provider, halving on any shape mismatch. */
async function translateBatch(maskedTexts: string[]): Promise<BatchResult> {
  const enabled = PROVIDERS.filter((p) => !disabled.has(p.name));
  if (!enabled.length) throw new Error("all providers disabled");
  const packed = packChunk(maskedTexts);

  const attempts = enabled.map(({ name, fn }) =>
    retry(() => fn(packed))
      .then((raw) => ({ texts: unpackChunk(raw, maskedTexts.length), provider: name }))
      .catch((e) => {
        if (e instanceof QuotaExceeded) disabled.add(name); // side effect observed even though this attempt lost the race
        throw e;
      }),
  );
  try {
    return await Promise.any(attempts);
  } catch (agg) {
    // Every racer either errored or returned a malformed batch — fall through to halving (or give up at size 1,
    // where there's nothing left to halve).
    if (maskedTexts.length === 1) throw agg;
    const mid = Math.ceil(maskedTexts.length / 2);
    const [a, b] = await Promise.all([translateBatch(maskedTexts.slice(0, mid)), translateBatch(maskedTexts.slice(mid))]);
    return { texts: [...a.texts, ...b.texts], provider: a.provider === b.provider ? a.provider : `${a.provider}+${b.provider}` };
  }
}

// ---- concurrency pool -------------------------------------------------------------------------------------------

async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// ---- jsonl helpers ----------------------------------------------------------------------------------------------

interface Entry { rowId: string; text: string }

function readJsonl(file: string): Entry[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Entry);
}

function writeJsonl(file: string, entries: Entry[]): void {
  writeFileSync(file, entries.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
}

type Cache = Record<string, { text: string; provider: string; ts: string }>;

function loadCache(): Cache {
  if (!existsSync(CACHE_FILE)) return {};
  return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as Cache;
}

function saveCache(cache: Cache): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf8");
}

// ---- main ----------------------------------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(OUT_DIR, { recursive: true });

  const allStems = readdirSync(WORK_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => f.slice(0, -".jsonl".length));
  const stems = allStems.filter((s) => !SKIP_STEMS.has(s) && (!args.only || args.only.has(s)));

  const byStem = new Map<string, Entry[]>();
  for (const stem of stems) byStem.set(stem, readJsonl(join(WORK_DIR, `${stem}.jsonl`)));

  const orderedStems = stems.slice().sort((a, b) => {
    const ia = PRIORITY.indexOf(a);
    const ib = PRIORITY.indexOf(b);
    return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib);
  });

  // Global distinct source strings, in visibility order, first-seen wins.
  const distinct: string[] = [];
  const seen = new Set<string>();
  for (const stem of orderedStems) {
    for (const { text } of byStem.get(stem)!) {
      if (!seen.has(text)) {
        seen.add(text);
        distinct.push(text);
      }
    }
  }

  const cache = loadCache();
  const todo = distinct.filter((t) => !cache[t]);
  console.log(`distinct strings: ${distinct.length} total, ${todo.length} not yet cached (${stems.length} files, skipping ${SKIP_STEMS.size})`);

  if (args.dry) {
    process.exit(0);
  }

  const glossary = loadGlossary();
  const mask = buildMasker(glossary);
  const batch = args.limit !== undefined ? todo.slice(0, args.limit) : todo; // --limit 0 is "translate nothing, just flush outputs"

  // MyMemory hard-rejects any `q` over 500 chars ("QUERY LENGTH LIMIT EXCEEDED") — chunk by the MASKED length
  // (what's actually sent, after glossary/placeholder tokens shrink or grow each line) with a safety margin,
  // not by a fixed item count: a chunk of 50 chests-worth of short item names fits easily, 50 long quest
  // descriptions never would. --chunk still caps the item count per request (default 80, the top of the
  // 30-80 sweet spot) for providers without a tight char limit.
  const CHAR_BUDGET = args.charBudget ?? 420;
  const MAX_ITEMS = args.chunkSize ?? 80;
  interface Masked { src: string; masked: string; tokens: string[] }
  const premasked: Masked[] = batch.map((src) => ({ src, ...mask(src) }));
  const chunks: Masked[][] = [];
  {
    let cur: Masked[] = [];
    let curLen = 0;
    for (const m of premasked) {
      const lineLen = m.masked.length + 8; // "@@123@@ " marker overhead, generously rounded up
      if (cur.length && (curLen + lineLen > CHAR_BUDGET || cur.length >= MAX_ITEMS)) {
        chunks.push(cur);
        cur = [];
        curLen = 0;
      }
      cur.push(m);
      curLen += lineLen;
    }
    if (cur.length) chunks.push(cur);
  }

  let done = 0;
  let failed = 0;
  let stopped = false;
  const providerCounts: Record<string, number> = {};
  const t0 = Date.now();

  await pool(chunks, 4, async (items) => {
    if (stopped) return;
    await jitter(250);
    try {
      const { texts, provider } = await translateBatch(items.map((m) => m.masked));
      for (let i = 0; i < items.length; i++) {
        cache[items[i]!.src] = { text: unmask(texts[i]!, items[i]!.tokens), provider, ts: new Date().toISOString() };
      }
      providerCounts[provider] = (providerCounts[provider] ?? 0) + items.length;
      done += items.length;
    } catch (e) {
      failed += items.length;
      if (disabled.size >= PROVIDERS.length) stopped = true; // every provider quota-blocked: stop burning time/retries
      console.warn(`  MT failed for a ${items.length}-item chunk: ${(e as Error).message?.slice(0, 160)}`);
    }
    if ((done + failed) % 500 < MAX_ITEMS) {
      saveCache(cache);
      console.log(`  ${done + failed}/${batch.length} processed (${done} ok, ${failed} failed) in ${Math.round((Date.now() - t0) / 1000)}s, ${chunks.length} chunks total...`);
    }
  });

  saveCache(cache);
  console.log(
    `done: ${done} translated, ${failed} failed${stopped ? " (stopped early: all providers blocked/quota-exceeded)" : ""} in ${Math.round((Date.now() - t0) / 1000)}s`,
  );
  console.log(`providers used this run: ${JSON.stringify(providerCounts)}`);
  if (disabled.size) console.log(`disabled (quota/blocked) this run: ${[...disabled].join(", ")}`);

  // ---- write per-table/column outputs from whatever is in the cache now (partial coverage is fine: the importer
  // and applyTranslations() both fall back silently to the original source text for any row not present). ----
  let filesWritten = 0;
  let rowsWritten = 0;
  for (const stem of stems) {
    const entries = byStem.get(stem)!;
    const existing = new Map(readJsonl(join(OUT_DIR, `${stem}.jsonl`)).map((e) => [e.rowId, e.text]));
    let added = 0;
    for (const { rowId, text } of entries) {
      const hit = cache[text];
      if (hit && existing.get(rowId) !== hit.text) {
        existing.set(rowId, hit.text);
        added++;
      }
    }
    if (existing.size) {
      const outEntries = entries.filter((e) => existing.has(e.rowId)).map((e) => ({ rowId: e.rowId, text: existing.get(e.rowId)! }));
      writeJsonl(join(OUT_DIR, `${stem}.jsonl`), outEntries);
      filesWritten++;
      rowsWritten += outEntries.length;
      if (added) console.log(`${stem}: ${outEntries.length}/${entries.length} rows translated (+${added} new)`);
    }
  }
  console.log(`wrote ${filesWritten} files, ${rowsWritten} rows total under ${OUT_DIR}`);
}

await main();
