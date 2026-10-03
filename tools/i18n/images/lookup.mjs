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
    const key = norm(viText);
    if (curated[key]) return { pt: curated[key], source: "curated" };
    if (langPairs.has(key)) return { pt: langPairs.get(key), source: "language.txt" };
    const mt = mtCache[key] || mtCache[viText];
    if (mt && (mt.text || typeof mt === "string")) return { pt: typeof mt === "string" ? mt : mt.text, source: "mt-cache" };
    const g = glossarySub(key);
    if (g) return { pt: g, source: "glossary" };
    return { pt: null, source: "none" };
  };
}
