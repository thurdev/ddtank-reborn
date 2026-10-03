// Shared VI->PT-BR lookup helpers reused by inventory + render scripts.
// Sources (in priority order): (1) curated manual map for the top-priority batch (curated-captions.json),
// (2) exact phrase match against client-language.txt (VI) <-> client-language.txt (PT-BR) (same key order, see
// docs/BACKLOG.md "Localizacao PT-BR"), (3) glossary.json substring/phrase substitution, (4) MT cache
// (data/i18n/cache/vi-pt-BR.json) if the exact string was already machine-translated during the DB/text batch.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function norm(s) {
  return s.replace(/\s+/g, " ").trim();
}

// OCR of button/plate art regularly misreads a decorative icon glyph sitting next to the caption (a coin icon, an
// arrow, a little sparkle) as 1-3 stray punctuation/symbol characters glued to the start or end of the real text
// (", bảng đổi màu", "€ Hợp thành |", "'G3Trời gian:"). Left alone, the curated/glossary lookups below either fail
// to match (noisy key != clean dict key) or — worse — the glossary substring-substitute path matches just the real
// word and silently re-emits the untranslated noise glued to the translation (", tabela de cores"), which is
// exactly the "broken button" class of bug reported after the image batch. Strip that noise BEFORE using the text
// as a lookup key so (a) more rows hit the clean curated/language.txt maps instead of falling to glossary, and
// (b) nothing OCR-garbled survives into the rendered caption even on a glossary-substring hit.
const NOISE_RUN = /(^|\s)[^\p{L}\p{N}\s](?:[^\p{L}\p{N}\s]){0,2}(?=\s|$)/gu; // 1-3 symbol chars standing alone as a "word"
export function cleanOcrNoise(s) {
  if (!s) return s;
  let out = s
    .replace(/\n+/g, " ")
    .replace(NOISE_RUN, " ") // drop isolated symbol-only tokens (icon misreads)
    .replace(/^[^\p{L}\p{N}(["'‘“]+/u, "") // strip leading junk that isn't a letter/digit/opening bracket-quote
    .replace(/[^\p{L}\p{N})\]"'.!?’”]+$/u, "") // strip trailing junk that isn't a letter/digit/closing bracket-quote/punct
    .replace(/\s+/g, " ")
    .trim();
  return out || s.trim();
}

export function loadLanguagePairs() {
  const viPath = join(ROOT, "vendor/DDTank41/Source Flash/FlashSV1/ui/vietnam/language.txt");
  const ptPath = join(ROOT, "data/i18n/pt-BR/client-language.txt");
  const vi = readFileSync(viPath, "utf8").split(/\r?\n/);
  const pt = readFileSync(ptPath, "utf8").split(/\r?\n/);
  const map = new Map();
  for (let i = 0; i < vi.length; i++) {
    const lv = vi[i],
      lp = pt[i];
    if (!lv || !lv.includes(":") || !lp) continue;
    const vv = norm(lv.slice(lv.indexOf(":") + 1));
    const pv = norm(lp.slice(lp.indexOf(":") + 1));
    if (vv && pv && !map.has(vv)) map.set(vv, pv);
  }
  return map;
}

export function loadGlossary() {
  const p = join(ROOT, "data/i18n/glossary.json");
  const pairs = JSON.parse(readFileSync(p, "utf8"));
  return pairs; // [[vi, pt], ...] sorted longest-first below
}

export function loadCuratedCaptions() {
  const p = join(dirname(fileURLToPath(import.meta.url)), "curated-captions.json");
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, "utf8"));
}

export function loadMtCache() {
  const p = join(ROOT, "data/i18n/cache/vi-pt-BR.json");
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

// Vietnamese-only diacritic signature — deliberately EXCLUDES the plain accented Latin letters Portuguese also
// uses (á à â ã é ê í ó ô õ ú ç), which the earlier naive `[àáảã...]` "still has Vietnamese" check (used by both
// replace.mjs's retry gate and run-remaining.mjs's post-render verify) wrongly matched against, silently rejecting
// and reverting correctly-rendered Portuguese captions just because they contained an ordinary ã/â/ô/é — a second,
// independent pipeline bug on top of the OCR-noise one above, and likely the bigger contributor to "still not
// translated" reports: good renders were being discarded by their own QA gate. Only Vietnamese tone/vowel marks
// that never occur in Portuguese orthography (đ, ă, ơ, ư, dot-below, hook-above, the stacked double-diacritic
// vowels, ì/ù/ỳ) count as "still Vietnamese" here.
export const VN_ONLY_RE =
  /[đĐăĂơƠưƯìÌùÙýÝạẠảẢấẤầẦẩẨẫẪậẬắẮằẰẳẲẵẴặẶẹẸẻẺẽẼếẾềỀểỂễỄệỆỉỈịỊọỌốỐồỒổỔỗỖộỘớỚờỜởỞỡỠợỢụỤủỦứỨừỪửỬữỮựỰỵỴỷỶỹỸ]/;

export function buildTranslator() {
  const curated = loadCuratedCaptions();
  const langPairs = loadLanguagePairs();
  const glossary = loadGlossary().slice().sort((a, b) => b[0].length - a[0].length);
  const mtCache = loadMtCache();

  function glossarySub(text) {
    let out = text;
    let changed = false;
    for (const [vi, pt] of glossary) {
      if (out.toLowerCase().includes(vi.toLowerCase())) {
        const re = new RegExp(vi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        out = out.replace(re, pt);
        changed = true;
      }
    }
    return changed ? out : null;
  }

  return function translate(viText) {
    const rawKey = norm(viText);
    const key = cleanOcrNoise(rawKey);
    // try the cleaned key first (matches curated/language.txt dicts, which are themselves clean phrases), then
    // fall back to the raw OCR key in case a curated entry was deliberately keyed on the noisy OCR text.
    if (curated[key]) return { pt: curated[key], source: "curated" };
    if (curated[rawKey]) return { pt: cleanOcrNoise(curated[rawKey]), source: "curated" };
    if (langPairs.has(key)) return { pt: langPairs.get(key), source: "language.txt" };
    if (langPairs.has(rawKey)) return { pt: langPairs.get(rawKey), source: "language.txt" };
    const mt = mtCache[key] || mtCache[rawKey] || mtCache[viText];
    if (mt && (mt.text || typeof mt === "string")) return { pt: cleanOcrNoise(typeof mt === "string" ? mt : mt.text), source: "mt-cache" };
    const g = glossarySub(key);
    if (g) return { pt: cleanOcrNoise(g), source: "glossary" };
    return { pt: null, source: "none" };
  };
}
