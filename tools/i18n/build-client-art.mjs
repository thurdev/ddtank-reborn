#!/usr/bin/env node
/**
 * Single orchestrator for the apps/api/assets/flash client overlay.
 *
 * 2026-10-03 product decision (see docs/BACKLOG.md): the deterministic script-rendered PT-BR image
 * batch (tools/i18n/images/*: replace.mjs text renders, night-grade, dark-mode-skins, dark-frames) shipped
 * some clearly-worse/broken bitmaps (buttons, hall captions regressing to Vietnamese after a later repack,
 * inconsistent caption fonts, an ugly night-mode filter). Rather than keep chasing per-image fixes, ALL of
 * that generated/edited bitmap content is discarded. It will be redone later via AI image-to-image
 * remaster — the inputs it needs (curated-captions.json, targets.json, image-inventory.json) are left in
 * place for reuse, just not applied by default.
 *
 * DEFAULT BUILD (no flags) = vendor SWFs, unmodified, PLUS text-only patches on the 3 files that actually
 * need them:
 *   - apps/api/assets/flash/2.png             vendor 2.png  -> abc-strings -> static-arrays (dev: no RSA)
 *   - apps/api/assets/flash/3.png             vendor 3.png  -> abc-strings
 *   - apps/api/assets/flash/DDT_Loading.swf   vendor DDT_Loading.swf -> abc-strings
 * Confirmed by research/i18n/abc-strings.json (exhaustive 126-file ABC constant-pool scan): these are the
 * ONLY files in the whole FlashSV1 tree containing a Vietnamese string literal in ABC bytecode. Every file
 * under ui/vietnam/swf/*.swf and the standalone Loading.swf has ZERO ABC string-literal hits -- any byte
 * difference from vendor in those files is pure leftover bitmap editing from the discarded image batch, so
 * they are simply deleted from the overlay. apps/api/src/routes/static.ts resolves a request against the
 * overlay (flashFix) first and falls back to the vendor tree (flash) automatically, so deleting an overlay
 * file is a complete, correct revert to the original game art -- no copy step needed.
 *
 * Left untouched (not image/ABC concerns of this script):
 *   - apps/api/assets/flash/ui/vietnam/{language.txt,levelreward.xml,movingnotification.txt}  (plain text
 *     i18n overlays, maintained by the data/i18n pipeline, not tools/i18n/images)
 *   - apps/api/assets/flash/ui/vietnam/xml/xml.png   (unrelated GhostStarContainer crash fix, not i18n)
 *
 * OPT-IN image steps (OFF by default, per the decision above) -- kept here only so the AI-remaster pass
 * has one place to plug into later, with the ordering bug already fixed (text replacement always stages
 * BEFORE night-grade, into the same stage root, every run, so night-grade's "already localized, skip"
 * check actually sees the caption files and never clobbers them back to vendor Vietnamese pixels):
 *   --images   apply tools/i18n/images/targets.json text replacements (replace.mjs) into the stage root
 *   --night    tools/i18n/images/{night-hall,night-loading}.mjs on top of the (possibly just-staged) text
 *   --dark     tools/i18n/images/{dark-mode-skins,dark-frames}.mjs on top of the above
 *   (any of the above implies a pack step: FFDec -importImages from vendor + stage -> overlay)
 *
 * APPROVED AI ASSETS (ON by default, opt out with --no-approved): the actual current remaster pipeline.
 * remaster/approved.json lists every AI-generated output a human has reviewed and signed off on. Each
 * entry names one file under remaster/<category>/outputs/, the target SWF, and which original image
 * (by FFDec export filename `sourceFile`, e.g. "1.jpg", or just `charId` when the extension is already
 * known from remaster/manifest.csv) it replaces. This step, for every entry:
 *   1. looks up the ORIGINAL width/height from remaster/manifest.csv (keyed by swf + sourceFile) -- the
 *      approved output is never trusted for its own dimensions, since AI tools return arbitrary canvases;
 *   2. re-fits the output to that exact width x height: "cover" (default) resizes+crops centered (e.g. a
 *      16:9 AI output going into a 5:3 slot crops the sides, keeps full height), "contain" letterboxes,
 *      "chroma" keys out #00FF00-ish green (with despill) to recover alpha before fitting;
 *   3. re-encodes it matching the ORIGINAL image's tag type -- JPEG q>=92 for an opaque original (.jpg/.jpeg
 *      sourceFile), lossless PNG (alpha-capable) for everything else, always PNG for chroma output;
 *   4. stages it under the FFDec export name (chid.ext) and runs `ffdec -importImages` into the target SWF,
 *      sourced from the just-patched overlay copy for DDT_Loading.swf/2.png/3.png (so the text patches from
 *      buildCoreChain() above are preserved) or straight from vendor for anything under ui/vietnam/swf/*.swf
 *      (which has no overlay copy by this point -- revertImageOnlyOverlays() already deleted it).
 * Always rebuilds from the vendor/just-patched source, never from a previous overlay copy -- idempotent.
 *
 * Usage:
 *   node tools/i18n/build-client-art.mjs                      # default: revert images, text-only core chain,
 *                                                              #   + approved AI assets (remaster/approved.json)
 *   node tools/i18n/build-client-art.mjs --no-approved         # skip the approved AI asset import step
 *   node tools/i18n/build-client-art.mjs --images --night --dark   # also run the opt-in (currently unused) image batch
 *   node tools/i18n/build-client-art.mjs --prod --rsa-modulus <hex>  # also patch the RSA modulus into 2.png
 *
 * --prod is NOT a secret-rotation tool. Full production secret rotation (fresh RSA keypair + .env wiring
 * for apps/api and apps/game) is scripts/gen-secrets.mjs, which already runs this exact same core chain
 * (abc-strings -> static-arrays -> patch-client-key) independently from vendor. --prod here only lets you
 * re-stamp the CLIENT ART portion against a modulus you already issued, without touching any .env file.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, copyFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const VENDOR = join(ROOT, "vendor", "DDTank41", "Source Flash", "FlashSV1");
const OVERLAY = join(ROOT, "apps", "api", "assets", "flash");
const SCRATCH = join(ROOT, "node_modules", ".cache", "ddt-client-art"); // small scratch for temp chain files only
const FFDEC_JAR = join(ROOT, "vendor", "_tools", "ffdec", "ffdec-cli.jar");

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const OPT_IMAGES = has("--images");
const OPT_NIGHT = has("--night");
const OPT_DARK = has("--dark");
const PROD = has("--prod");
const RSA_MODULUS = valueOf("--rsa-modulus");
const OPT_APPROVED = !has("--no-approved"); // approved AI asset import: ON by default

function log(section, msg) {
  console.log(`[${section}] ${msg}`);
}

function runNode(scriptPath, args, label) {
  log(label ?? "run", `node ${scriptPath} ${args.join(" ")}`);
  execFileSync(process.execPath, [scriptPath, ...args], { stdio: "inherit", cwd: ROOT });
}

/** Step 1: delete every overlay SWF confirmed to be a pure leftover bitmap edit (no ABC string literal in
 *  it anywhere -- research/i18n/abc-strings.json). The static route falls back to vendor automatically. */
function revertImageOnlyOverlays() {
  let removed = 0;
  const swfDir = join(OVERLAY, "ui", "vietnam", "swf");
  if (existsSync(swfDir)) {
    const files = readdirSync(swfDir).filter((f) => statSync(join(swfDir, f)).isFile());
    removed += files.length;
    rmSync(swfDir, { recursive: true, force: true });
    log("revert", `ui/vietnam/swf/: removed ${files.length} file(s) (pure image edits, zero ABC strings) -- falls back to vendor`);
  } else {
    log("revert", "ui/vietnam/swf/: already clean (nothing to revert)");
  }
  const loadingSwf = join(OVERLAY, "Loading.swf");
  if (existsSync(loadingSwf)) {
    rmSync(loadingSwf);
    removed += 1;
    log("revert", "Loading.swf: removed (zero ABC strings, was a leftover image-batch artifact) -- falls back to vendor");
  } else {
    log("revert", "Loading.swf: already clean");
  }
  return removed;
}

/** Step 2: rebuild the 3 files that DO need a real patch, always from vendor, never from a previous
 *  overlay copy (so re-running this is idempotent and never compounds a stale patch). */
function buildCoreChain() {
  mkdirSync(SCRATCH, { recursive: true });
  mkdirSync(OVERLAY, { recursive: true });
  const abcStringsTool = join(ROOT, "tools", "i18n", "abc-strings", "patch.mjs");
  const staticArraysTool = join(ROOT, "tools", "i18n", "static-arrays", "patch.mjs");

  // --- 2.png: abc-strings -> static-arrays -> (dev: stop here, keeps vendor RSA modulus baked in) ---
  const vendor2 = join(VENDOR, "2.png");
  if (existsSync(vendor2)) {
    const tmpAbc = join(SCRATCH, "2.abc-strings.png");
    const tmpStatic = join(SCRATCH, "2.static-arrays.png");
    runNode(abcStringsTool, [vendor2, tmpAbc], "core:2.png");
    runNode(staticArraysTool, [tmpAbc, tmpStatic], "core:2.png");
    let finalSrc = tmpStatic;
    if (PROD && RSA_MODULUS) {
      const tmpRsa = join(SCRATCH, "2.rsa.png");
      log("core:2.png", `--prod: patching RSA modulus into 2.png`);
      execFileSync("pnpm", ["--filter", "@ddt/api", "run", "-s", "patch-client-key", tmpStatic, tmpRsa, RSA_MODULUS], {
        stdio: "inherit",
        cwd: ROOT,
        shell: true,
      });
      finalSrc = tmpRsa;
    } else if (PROD) {
      log("core:2.png", "--prod given without --rsa-modulus: skipping RSA patch, shipping vendor RSA. For full prod secret rotation use `node scripts/gen-secrets.mjs`.");
    }
    copyFileSync(finalSrc, join(OVERLAY, "2.png"));
    log("core:2.png", `-> apps/api/assets/flash/2.png (${PROD && RSA_MODULUS ? "text patches + RSA" : "text patches only, vendor RSA"})`);
  } else {
    log("core:2.png", `SKIP -- vendor file not found: ${vendor2}`);
  }

  // --- 3.png: abc-strings only (no static-array classes live here, no RSA modulus here) ---
  const vendor3 = join(VENDOR, "3.png");
  if (existsSync(vendor3)) {
    const tmp = join(SCRATCH, "3.abc-strings.png");
    runNode(abcStringsTool, [vendor3, tmp], "core:3.png");
    copyFileSync(tmp, join(OVERLAY, "3.png"));
    log("core:3.png", "-> apps/api/assets/flash/3.png (text patches only)");
  } else {
    log("core:3.png", `SKIP -- vendor file not found: ${vendor3}`);
  }

  // --- DDT_Loading.swf: abc-strings only (the self-contained loading minigame's 3 VN strings) ---
  const vendorLoading = join(VENDOR, "DDT_Loading.swf");
  if (existsSync(vendorLoading)) {
    const tmp = join(SCRATCH, "DDT_Loading.abc-strings.swf");
    runNode(abcStringsTool, [vendorLoading, tmp], "core:DDT_Loading.swf");
    copyFileSync(tmp, join(OVERLAY, "DDT_Loading.swf"));
    log("core:DDT_Loading.swf", "-> apps/api/assets/flash/DDT_Loading.swf (text patches only)");
  } else {
    log("core:DDT_Loading.swf", `SKIP -- vendor file not found: ${vendorLoading}`);
  }
}

/** The 3 files buildCoreChain() rebuilds from vendor every run (text patches, no RSA). An approved asset
 *  targeting one of these must be imported from the already-patched OVERLAY copy, not vendor, so the text
 *  patch survives. Everything else (ui/vietnam/swf/*.swf) has no text patch and no overlay copy at this
 *  point (revertImageOnlyOverlays() already deleted it), so it's imported straight from vendor. */
const CORE_PATCHED_FILES = new Set(["DDT_Loading.swf", "2.png", "3.png"]);
function resolveSwfLocation(swfName) {
  const core = CORE_PATCHED_FILES.has(swfName);
  const vendorPath = core ? join(VENDOR, swfName) : join(VENDOR, "ui", "vietnam", "swf", swfName);
  const overlayPath = core ? join(OVERLAY, swfName) : join(OVERLAY, "ui", "vietnam", "swf", swfName);
  return { core, vendorPath, overlayPath, importSource: core ? overlayPath : vendorPath };
}

/** Minimal RFC4180-ish CSV line parser (handles quoted fields with embedded commas/escaped ""), just
 *  enough for remaster/manifest.csv's free-text pt_br column. */
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** remaster/manifest.csv -> Map("<swf>::<sourceFile>" -> {category,file,width,height,swf,sourceFile}).
 *  approved.json entries deliberately don't carry width/height themselves -- they're always taken from
 *  here, since an AI tool's output canvas size is arbitrary and never the real target. */
function loadManifestIndex() {
  const csvPath = join(ROOT, "remaster", "manifest.csv");
  const index = new Map();
  if (!existsSync(csvPath)) return index;
  const lines = readFileSync(csvPath, "utf8").split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return index;
  const header = parseCsvLine(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = Object.fromEntries(header.map((h, idx) => [h, cols[idx]]));
    if (!row.source_swf || !row.source_file) continue;
    index.set(`${row.source_swf}::${row.source_file}`, {
      category: row.category,
      file: row.file,
      width: Number(row.width),
      height: Number(row.height),
      swf: row.source_swf,
      sourceFile: row.source_file,
    });
  }
  return index;
}

/** Keys out #00FF00-ish green (the approved.json "chroma" fit) with spill suppression, in place, on a
 *  raw RGBA buffer. Anything NOT green-dominant is left untouched (alpha and color unchanged); the more a
 *  pixel's green exceeds max(r,b), the more it's keyed to transparent and desaturated toward max(r,b) so
 *  no green fringe survives on the new (opaque) background behind it. */
function chromaKeyDespill(data, info) {
  const channels = info.channels; // ensureAlpha() upstream guarantees 4
  const LOW = 8; // green-excess at/below this: treated as not-green, left alone
  const HIGH = 70; // green-excess at/above this: fully keyed out (alpha 0)
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const maxRB = Math.max(r, b);
    const excess = g - maxRB;
    if (excess <= LOW) continue;
    const t = Math.min(1, (excess - LOW) / (HIGH - LOW));
    data[i + 1] = Math.round(g - excess * t); // despill: pull green back toward maxRB
    if (channels === 4) data[i + 3] = Math.round(data[i + 3] * (1 - t));
  }
}

/** Post-process one approved AI output to the exact original width x height + correct tag encoding.
 *  `srcExt` is the ORIGINAL (vendor) image's extension (from manifest.csv), which decides JPEG vs PNG --
 *  never the AI output's own format, which is just whatever the generator happened to save. */
async function processApprovedImage(sharp, outputsPath, width, height, fit, srcExt) {
  const mode = fit || "cover";
  const base = sharp(outputsPath).ensureAlpha();
  if (mode === "chroma") {
    const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });
    const buf = Buffer.from(data);
    chromaKeyDespill(buf, info);
    const keyed = sharp(buf, { raw: { width: info.width, height: info.height, channels: info.channels } }).resize(
      width,
      height,
      { fit: "cover", position: "center" }
    );
    return { buffer: await keyed.png().toBuffer(), outExt: "png" };
  }
  let img;
  if (mode === "contain") {
    img = base.resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  } else {
    // "cover" (default): resize+crop centered -- e.g. a 16:9 AI canvas going into a 5:3 slot crops the
    // sides only and keeps the full height, which is what sharp's centered "cover" fit does natively.
    img = base.resize(width, height, { fit: "cover", position: "center" });
  }
  if (srcExt === "jpg" || srcExt === "jpeg") {
    const buffer = await img.flatten({ background: "#000000" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    return { buffer, outExt: "jpg" };
  }
  const buffer = await img.png().toBuffer();
  return { buffer, outExt: "png" };
}

function runFfdecImportImages(src, out, stageDir) {
  // --add-opens: same JPMS workaround as tools/i18n/images/pack.sh -- ffdec's CMYK JPEG reader needs
  // reflective access modern JDKs block by default.
  execFileSync(
    "java",
    ["--add-opens", "java.desktop/com.sun.imageio.plugins.jpeg=ALL-UNNAMED", "-jar", FFDEC_JAR, "-importImages", src, out, stageDir],
    { stdio: "inherit", cwd: ROOT }
  );
}

/** Step 3 (ON by default, --no-approved to skip): import every human-approved AI asset from
 *  remaster/approved.json into its target SWF, re-fit to the exact original dimensions. Runs after
 *  buildCoreChain() so DDT_Loading.swf/2.png/3.png already have their text patches when read as the
 *  import source. Idempotent: always re-derives from vendor (or this run's freshly-patched overlay copy
 *  for the core 3), never from a stale overlay copy, and always re-stages+re-imports every entry. */
async function runApprovedAssetsStep() {
  const approvedPath = join(ROOT, "remaster", "approved.json");
  if (!existsSync(approvedPath)) {
    log("approved", "remaster/approved.json not found -- skipping (nothing approved yet)");
    return;
  }
  let entries;
  try {
    entries = JSON.parse(readFileSync(approvedPath, "utf8"));
  } catch (e) {
    log("approved", `FAILED to parse remaster/approved.json: ${e.message}`);
    return;
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    log("approved", "remaster/approved.json has no entries -- skipping");
    return;
  }

  const manifest = loadManifestIndex();
  const require_ = createRequire(join(HERE, "images", "package.json")); // resolve sharp from tools/i18n/images/node_modules
  const sharp = require_("sharp");

  const bySwf = new Map(); // swf -> [{ sourceFile, buffer, outExt, label }]
  for (const entry of entries) {
    const { category, file, swf, fit } = entry;
    if (!category || !file || !swf) {
      log("approved", `SKIP invalid entry (missing category/file/swf): ${JSON.stringify(entry)}`);
      continue;
    }

    let sourceFile = entry.sourceFile;
    if (!sourceFile && entry.charId != null) {
      for (const row of manifest.values()) {
        if (row.swf === swf && row.sourceFile.replace(/\.[^.]+$/, "") === String(entry.charId)) {
          sourceFile = row.sourceFile;
          break;
        }
      }
    }
    if (!sourceFile) {
      log("approved", `SKIP ${category}/${file} -- no sourceFile/charId resolvable against manifest.csv`);
      continue;
    }

    const row = manifest.get(`${swf}::${sourceFile}`);
    if (!row) {
      log("approved", `SKIP ${category}/${file} -- no remaster/manifest.csv row for ${swf}::${sourceFile} (need its width/height)`);
      continue;
    }

    const outputsPath = join(ROOT, "remaster", category, "outputs", file);
    if (!existsSync(outputsPath)) {
      log("approved", `SKIP ${category}/${file} -- output not found at ${outputsPath}`);
      continue;
    }

    const srcExt = sourceFile.slice(sourceFile.lastIndexOf(".") + 1).toLowerCase();
    const { buffer, outExt } = await processApprovedImage(sharp, outputsPath, row.width, row.height, fit, srcExt);

    if (!bySwf.has(swf)) bySwf.set(swf, []);
    bySwf.get(swf).push({ sourceFile, buffer, outExt, label: `${category}/${file}` });
    log(
      "approved",
      `${category}/${file} -> ${swf}::${sourceFile} (${row.width}x${row.height}, fit=${fit ?? "cover"}, encoded .${outExt})`
    );
  }

  if (bySwf.size === 0) {
    log("approved", "nothing to import");
    return;
  }

  for (const [swf, images] of bySwf) {
    const { core, importSource, overlayPath } = resolveSwfLocation(swf);
    if (!existsSync(importSource)) {
      log("approved", `SKIP ${swf} -- import source not found: ${importSource}`);
      continue;
    }
    const stageDir = join(SCRATCH, "approved-stage", swf.replace(/[^A-Za-z0-9._-]/g, "_"));
    rmSync(stageDir, { recursive: true, force: true });
    mkdirSync(stageDir, { recursive: true });
    for (const img of images) {
      const stem = img.sourceFile.slice(0, img.sourceFile.lastIndexOf("."));
      writeFileSync(join(stageDir, `${stem}.${img.outExt}`), img.buffer);
    }
    mkdirSync(dirname(overlayPath), { recursive: true });
    log("approved", `importing ${images.length} image(s) into ${swf} (source: ${core ? "overlay, text-patched" : "vendor"})`);
    runFfdecImportImages(importSource, overlayPath, stageDir);
    log("approved", `-> apps/api/assets/flash/${overlayPath.slice(OVERLAY.length + 1).replace(/\\/g, "/")}`);
  }
}

/** Opt-in, OFF by default: the discarded image-rendering/night/dark batch, kept only for a future AI
 *  remaster pass to build on. Fixes the ordering bug that caused the hall-caption regression: text
 *  replacement is always staged BEFORE night-grade, into the SAME stage root, every run. */
function runOptInImageSteps() {
  const images = join(HERE, "images");
  if (OPT_IMAGES) {
    log("images", "applying tools/i18n/images/targets.json text replacements (apply-batch.mjs)...");
    runNode(join(images, "apply-batch.mjs"), [], "images");
  }
  if (OPT_NIGHT) {
    log("night", "running night-hall.mjs + night-loading.mjs on top of the text-replacement stage...");
    runNode(join(images, "night-hall.mjs"), [], "night");
    runNode(join(images, "night-loading.mjs"), [], "night");
  }
  if (OPT_DARK) {
    log("dark", "running dark-mode-skins.mjs + dark-frames.mjs...");
    runNode(join(images, "dark-mode-skins.mjs"), [], "dark");
    runNode(join(images, "dark-frames.mjs"), [], "dark");
  }
  if (OPT_IMAGES || OPT_NIGHT || OPT_DARK) {
    log("pack", "packing staged images into the overlay (tools/i18n/images/pack.sh)...");
    execFileSync("bash", [join(images, "pack.sh")], { stdio: "inherit", cwd: ROOT });
  }
}

function writeDiscardedNote() {
  const dir = join(ROOT, "research", "i18n", "discarded");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "README.md"),
    `# Discarded image batch (2026-10-03)

Every script-rendered PT-BR caption image, the night-grade filter, the dark-mode chrome recolor and the
bespoke dark window frames (\`tools/i18n/images/{replace,night-hall,night-loading,dark-mode-skins,dark-frames}.mjs\`)
were discarded from the served overlay: some buttons broke, hall captions regressed to Vietnamese after a
later repack, and the night filter looked worse than the original art. The served client is back to 100%
vendor bitmaps; only text (ABC string literals + static-array lazy getters, via \`tools/i18n/build-client-art.mjs\`)
is patched now.

Nothing binary was copied here -- the generated PNGs lived in a scratch directory outside the repo and are
not reproduced. The historical before/after record (screenshots taken while the batch was live) is still at
\`research/i18n/before-after.html\` and \`research/i18n/darkmode-verify/\` -- kept as a record of what was tried,
not as what's currently served.

The reusable inputs for a future AI image-to-image remaster are kept in place and untouched:
- \`tools/i18n/images/curated-captions.json\` -- VI->PT-BR caption text per image, including the hall labels
- \`tools/i18n/images/targets.json\` -- the full {swf: {file: viText}} map of every caption that was found
- \`research/i18n/image-inventory.json\` -- the OCR sweep this was all built from

Plan: redo the actual pixel edits later with an AI image-to-image model (inpaint + style-matched caption),
not the deterministic canvas-drawn renders. Run \`node tools/i18n/build-client-art.mjs --images --night --dark\`
once that replacement exists to re-wire it into the pipeline (ordering is already fixed there: text always
stages before night-grade, into the same stage root).
`
  );
  log("discard", "wrote research/i18n/discarded/README.md");
}

async function main() {
  log("build", `flags: images=${OPT_IMAGES} night=${OPT_NIGHT} dark=${OPT_DARK} prod=${PROD} approved=${OPT_APPROVED}`);
  const removed = revertImageOnlyOverlays();
  buildCoreChain();
  if (OPT_APPROVED) {
    await runApprovedAssetsStep();
  } else {
    log("approved", "skipped (--no-approved)");
  }
  runOptInImageSteps();
  writeDiscardedNote();
  log("build", `done. ${removed} leftover image-edit file(s) reverted to vendor; 2.png/3.png/DDT_Loading.swf rebuilt text-only.`);
  log("build", "restart apps/api (or pnpm dev:all) so the CiTree overlay index picks up the deleted/rebuilt files.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
