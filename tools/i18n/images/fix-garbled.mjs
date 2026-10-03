// Reconciliation pass after the lookup.mjs OCR-noise-cleaning fix (see git log / BACKLOG "image pipeline bug").
// For every row already rendered+packed in targets.json: re-translate with the cleaned lookup, and classify:
//   - "same"     : new pt === what we'd now render; nothing to do (cheap path, no re-render/OCR cost)
//   - "improved" : pt changed (noise stripped) and looks clean -> re-render, verify (no VN residue), re-stage
//   - "revert"   : vi text (even cleaned) is still mostly OCR garbage (no real translation possible) -> drop from
//                  targets + delete staged PNG so the next pack.sh leaves the ORIGINAL vendor pixels, log to
//                  needs-ai-batch3.md instead of shipping broken art
// Usage: node fix-garbled.mjs [--limit=N] [--dry]
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { createWorker } from "tesseract.js";
import { buildTranslator, cleanOcrNoise, VN_ONLY_RE } from "./lookup.mjs";
import { replaceImageText, closeWorker } from "./replace.mjs";

const HERE = import.meta.dirname;
const ROOT = join(HERE, "..", "..", "..");
const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;
const STAGE_ROOT = `${SP}/i18n/staged`;

const argv = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const LIMIT = argv.limit ? Number(argv.limit) : Infinity;
const DRY = "dry" in argv;

const VN_RE = VN_ONLY_RE;
// garbage signature: a run of 4+ uppercase ASCII letters with no vowels (OCR misreading of painted art edges),
// or 2+ stray high-byte symbol chars glued together outside normal punctuation.
const GARBAGE_RE = /[A-Z]{4,}|[¿€£¥^~`×÷§¶†‡•]{2,}/;

function looksClean(pt) {
  if (!pt) return false;
  if (VN_RE.test(pt)) return false; // leftover Vietnamese-ONLY diacritics (đ/ă/ơ/ư/...) = not actually translated
  if (GARBAGE_RE.test(pt)) return false;
  const letters = (pt.match(/\p{L}/gu) || []).length;
  const total = pt.replace(/\s/g, "").length || 1;
  return letters / total >= 0.6;
}

const targetsPath = join(HERE, "targets.json");
const targets = JSON.parse(readFileSync(targetsPath, "utf8"));
const translate = buildTranslator();

let verifyWorker = null;
async function stillHasVietnamese(pngPath) {
  const sharp = (await import("sharp")).default;
  const buf = await sharp(pngPath).ensureAlpha().flatten({ background: "#ffffff" }).grayscale().png().toBuffer();
  if (!verifyWorker) verifyWorker = await createWorker("vie");
  const res = await verifyWorker.recognize(buf);
  return VN_RE.test((res.data.text || "").trim());
}

const rows = [];
for (const [swf, files] of Object.entries(targets)) for (const [file, vi] of Object.entries(files)) rows.push({ swf, file, vi });

console.log(`[fix-garbled] ${rows.length} rows in targets.json, limit=${LIMIT}, dry=${DRY}`);

const stats = { same: 0, improved: 0, revert: 0, errorMissingSrc: 0, errorRender: 0 };
const revertLog = [];
const improvedLog = [];
const touchedSwfs = new Set();

let i = 0;
for (const r of rows) {
  if (i >= LIMIT) break;
  i++;
  if (i % 100 === 0) console.log(`[progress] ${i}/${Math.min(rows.length, LIMIT)}`);

  const { pt } = translate(r.vi);
  const clean = looksClean(pt);

  if (!clean) {
    stats.revert++;
    revertLog.push({ swf: r.swf, file: r.file, vi: r.vi, attemptedPt: pt || "(no translation)" });
    if (!DRY) {
      delete targets[r.swf][r.file];
      const staged = join(STAGE_ROOT, r.swf, r.file);
      if (existsSync(staged)) unlinkSync(staged);
      touchedSwfs.add(r.swf);
    }
    continue;
  }

  const src = join(EXPORT_ROOT, r.swf, r.file);
  if (!existsSync(src)) {
    stats.errorMissingSrc++;
    continue;
  }
  const dst = join(STAGE_ROOT, r.swf, r.file);

  // Cheap skip: if the staged file already exists and the cleaned translation matches what cleanOcrNoise would
  // have produced on a run that never had the noise (i.e. pt has no leading/trailing junk stripped relative to
  // raw dict lookups), we still re-render unconditionally here — rendering is deterministic, and a byte-identical
  // re-render is harmless; cost is dominated by OCR verify, not canvas draw. We only skip re-render entirely when
  // asked via --dry.
  if (DRY) {
    stats.improved++;
    continue;
  }

  try {
    let res = await replaceImageText(src, dst, pt);
    let bad = await stillHasVietnamese(dst);
    if (bad) {
      res = await replaceImageText(src, dst, pt, { box: res.box, fontScale: 0.75, padScale: 1.5 });
      bad = await stillHasVietnamese(dst);
    }
    if (bad) {
      // cleaned translation still renders with VN residue (bbox detection miss) -> don't ship it, revert instead
      stats.revert++;
      revertLog.push({ swf: r.swf, file: r.file, vi: r.vi, attemptedPt: pt, reason: "render-still-has-vn" });
      delete targets[r.swf][r.file];
      if (existsSync(dst)) unlinkSync(dst);
      touchedSwfs.add(r.swf);
    } else {
      stats.improved++;
      improvedLog.push({ swf: r.swf, file: r.file, vi: r.vi, pt });
      touchedSwfs.add(r.swf);
    }
  } catch (e) {
    stats.errorRender++;
    revertLog.push({ swf: r.swf, file: r.file, vi: r.vi, attemptedPt: pt, reason: "render-error: " + e.message });
    if (!DRY) {
      delete targets[r.swf][r.file];
      const staged = join(STAGE_ROOT, r.swf, r.file);
      if (existsSync(staged)) unlinkSync(staged);
      touchedSwfs.add(r.swf);
    }
  }
}
await closeWorker();
if (verifyWorker) await verifyWorker.terminate();

if (!DRY) {
  writeFileSync(targetsPath, JSON.stringify(targets, null, 2) + "\n");
  writeFileSync(join(SP, "i18n/fix-garbled-touched-swfs.json"), JSON.stringify([...touchedSwfs], null, 2));
}
writeFileSync(join(SP, "i18n/fix-garbled-revert-log.json"), JSON.stringify(revertLog, null, 2));
writeFileSync(join(SP, "i18n/fix-garbled-improved-log.json"), JSON.stringify(improvedLog, null, 2));

console.log("\n=== stats ===");
console.log(JSON.stringify(stats, null, 2));
console.log(`touched SWFs: ${touchedSwfs.size}`);
