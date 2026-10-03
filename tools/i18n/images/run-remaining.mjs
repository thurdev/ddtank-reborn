// Processes all image-inventory.json rows not yet in targets.json through:
//   translate (reuse ptBrSuggestion already computed by gen-inventory.mjs, same lookup chain)
//   -> render (replace.mjs)
//   -> verify (re-OCR the output, must have no Vietnamese diacritics left)
//   -> retry once with smaller font + larger erase padding if verify fails
//   -> needs-ai fallback (revert + log) if still bad, or if no translation was ever found
//   -> skip (low OCR confidence / no VN-looking text = art false positive)
//
// Writes:
//   tools/i18n/images/targets.json        (merged: existing + newly-rendered rows)
//   research/i18n/run-report.json         (full per-row result log)
//   research/i18n/needs-ai-batch2.md      (deduped "translation missing" + "render failed" buckets)
//
// Usage: node run-remaining.mjs [--limit=N] [--priority=3,4] [--conf=35]
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createWorker } from "tesseract.js";
import { replaceImageText, closeWorker } from "./replace.mjs";
// Vietnamese-ONLY diacritic signature (excludes á/â/ã/é/ê/í/ó/ô/õ/ú/ç, which Portuguese also uses — the earlier
// version of this regex matched those too and wrongly flagged correct PT-BR renders as "still Vietnamese"; see
// lookup.mjs VN_ONLY_RE / docs/BACKLOG.md image-pipeline bugfix note).
import { VN_ONLY_RE as VN_RE } from "./lookup.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;
const STAGE_ROOT = `${SP}/i18n/staged`;

const argv = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const LIMIT = argv.limit ? Number(argv.limit) : Infinity;
const PRIO_FILTER = argv.priority ? new Set(argv.priority.split(",").map(Number)) : null;
const CONF_THRESHOLD = argv.conf ? Number(argv.conf) : 35;

const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

const inv = JSON.parse(readFileSync(join(ROOT, "research/i18n/image-inventory.json"), "utf8"));
const targetsPath = join(HERE, "targets.json");
const targets = JSON.parse(readFileSync(targetsPath, "utf8"));

const done = new Set();
for (const [swf, files] of Object.entries(targets)) for (const file of Object.keys(files)) done.add(swf + "::" + file);

let rows = inv.rows.filter((r) => !done.has(r.swf + "::" + r.file));
if (PRIO_FILTER) rows = rows.filter((r) => PRIO_FILTER.has(r.priority));
rows = rows.slice(0, LIMIT);

console.log(`[run] ${rows.length} candidate rows (of ${inv.rows.length} total, ${done.size} already done), conf-threshold=${CONF_THRESHOLD}`);

// --- quality-gate OCR worker (separate from replace.mjs's internal bbox worker) ---
let verifyWorker = null;
async function getVerifyWorker() {
  if (!verifyWorker) verifyWorker = await createWorker("vie");
  return verifyWorker;
}
async function stillHasVietnamese(pngPath) {
  const sharp = (await import("sharp")).default;
  const buf = await sharp(pngPath).ensureAlpha().flatten({ background: "#ffffff" }).grayscale().png().toBuffer();
  const w = await getVerifyWorker();
  const res = await w.recognize(buf);
  const text = (res.data.text || "").trim();
  return VN_RE.test(text);
}

// cleaned-text quality check: does this OCR blob look like real UUI text worth chasing a translation for,
// or is it noise from decorative/painted art (the main source of false positives in the full unreviewed sweep)?
function looksLikeRealText(ocrText, conf) {
  const t = norm(ocrText);
  if (!t) return false;
  const letters = (t.match(/[a-zA-Zàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/g) || []).length;
  const total = t.replace(/\s/g, "").length || 1;
  const letterRatio = letters / total;
  return conf >= CONF_THRESHOLD && letterRatio >= 0.55 && letters >= 3;
}

const report = [];
const counts = {}; // counts[priority][category]++
function bump(prio, cat) {
  counts[prio] = counts[prio] || {};
  counts[prio][cat] = (counts[prio][cat] || 0) + 1;
}

const needsAiDedup = new Map(); // cleanedText -> { count, examples: [swf::file] }
function logNeedsAi(key, swf, file, reason) {
  const k = norm(key) || "(empty)";
  if (!needsAiDedup.has(k)) needsAiDedup.set(k, { reason, count: 0, examples: [] });
  const e = needsAiDedup.get(k);
  e.count++;
  if (e.examples.length < 5) e.examples.push(`${swf}::${file}`);
}

let i = 0;
for (const r of rows) {
  i++;
  if (i % 100 === 0) console.log(`[progress] ${i}/${rows.length}`);
  const src = join(EXPORT_ROOT, r.swf, r.file);
  if (!existsSync(src)) {
    bump(r.priority, "skipped-missing-source");
    report.push({ ...rowKey(r), ok: false, cat: "skipped-missing-source" });
    continue;
  }

  const pt = r.ptBrSuggestion;
  if (!pt) {
    // no translation available from the existing lookup chain (curated / language.txt / mt-cache / glossary)
    if (looksLikeRealText(r.ocrText, r.ocrConfidence)) {
      bump(r.priority, "needs-ai-no-translation");
      logNeedsAi(r.ocrText, r.swf, r.file, "no-translation");
      report.push({ ...rowKey(r), ok: false, cat: "needs-ai-no-translation" });
    } else {
      bump(r.priority, "skipped-low-confidence");
      report.push({ ...rowKey(r), ok: false, cat: "skipped-low-confidence", conf: r.ocrConfidence });
    }
    continue;
  }

  const dst = join(STAGE_ROOT, r.swf, r.file);
  try {
    let res = await replaceImageText(src, dst, pt);
    let bad = await stillHasVietnamese(dst);
    if (bad) {
      // retry once: smaller font + wider erase padding, reusing the already-detected text box
      res = await replaceImageText(src, dst, pt, { box: res.box, fontScale: 0.75, padScale: 1.5 });
      bad = await stillHasVietnamese(dst);
    }
    if (bad) {
      if (existsSync(dst)) unlinkSync(dst);
      bump(r.priority, "needs-ai-render-failed");
      logNeedsAi(r.ocrText, r.swf, r.file, "render-failed-vn-residue");
      report.push({ ...rowKey(r), ok: false, cat: "needs-ai-render-failed", pt, ptSource: r.ptBrSource });
    } else {
      bump(r.priority, "replaced");
      report.push({ ...rowKey(r), ok: true, cat: "replaced", pt, ptSource: r.ptBrSource, fontSize: res.fontSize, flat: res.flat });
      targets[r.swf] = targets[r.swf] || {};
      targets[r.swf][r.file] = r.ocrText; // keep same shape as apply-batch.mjs targets (vi text; translation re-derived via lookup chain)
    }
  } catch (e) {
    bump(r.priority, "needs-ai-render-error");
    logNeedsAi(r.ocrText, r.swf, r.file, "render-error: " + e.message);
    report.push({ ...rowKey(r), ok: false, cat: "needs-ai-render-error", error: e.message });
  }
}
await closeWorker();
if (verifyWorker) await verifyWorker.terminate();

function rowKey(r) {
  return { swf: r.swf, file: r.file, priority: r.priority, ocrConfidence: r.ocrConfidence };
}

writeFileSync(targetsPath, JSON.stringify(targets, null, 2) + "\n");
mkdirSync(join(ROOT, "research/i18n"), { recursive: true });
writeFileSync(join(ROOT, "research/i18n/run-report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), counts, total: rows.length }, null, 2));
writeFileSync(join(SP, "i18n/run-report-full.json"), JSON.stringify(report));

// --- needs-ai-batch2.md: deduped list, sorted by frequency (most-shared phrases first) ---
const entries = [...needsAiDedup.entries()].sort((a, b) => b[1].count - a[1].count);
let md = `# Needs-AI / untranslated — batch 2 (remaining inventory sweep)\n\n`;
md += `Generated by tools/i18n/images/run-remaining.mjs. Deduped by cleaned OCR text — many images across different\n`;
md += `SWFs share the same caption/tooltip wording, so this list is phrases, not images. Two reasons an entry lands here:\n`;
md += `- **no-translation**: OCR text looked like real UI text (confidence >= ${CONF_THRESHOLD}, mostly letters) but no match in\n`;
md += `  curated-captions.json / language.txt / mt-cache / glossary.json — needs a human or MT translation added to one of those\n`;
md += `  before it can be rendered.\n`;
md += `- **render-failed-vn-residue**: a translation existed and the pipeline rendered it, but re-OCR of the output still found\n`;
md += `  Vietnamese diacritics after one retry (smaller font + larger erase pad) — likely art-integrated text (see needs-ai.md)\n`;
md += `  or a bbox-detection miss; needs the AI inpainting path instead.\n\n`;
md += `| VN text (cleaned) | reason | count | example(s) |\n|---|---|---|---|\n`;
for (const [text, e] of entries) {
  const t = text.replace(/\n/g, " ⏎ ").replace(/\|/g, "\\|").slice(0, 160);
  md += `| ${t} | ${e.reason} | ${e.count} | ${e.examples.join(", ")} |\n`;
}
writeFileSync(join(ROOT, "research/i18n/needs-ai-batch2.md"), md);

console.log("\n=== counts by priority ===");
console.log(JSON.stringify(counts, null, 2));
console.log(`\nneeds-ai-batch2.md: ${entries.length} distinct untranslated/failed phrases`);
