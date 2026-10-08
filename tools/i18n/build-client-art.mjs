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

/** Native-text (non-ABC) string patch via `ffdec -replace`, for the handful of Vietnamese strings baked
 *  as DefineText/DefineText2/DefineEditText tags rather than ABC constant-pool literals (abc-strings.mjs
 *  only scans the latter -- see research/i18n/abc-strings.json). `ffdec -importText` (bulk) is a confirmed
 *  silent no-op in FFDec CLI v26.3.0 (research/i18n/ui-sweep.md, docs/BACKLOG.md); `-replace <in> <out>
 *  <charId> <dataFile> [<charId2> <dataFile2>...]` works for single-"run" text records (one font/color per
 *  record) and -- bonus confirmed by hand for this exact call -- auto-vectorizes any glyphs the replacement
 *  text needs that the embedded glyph-subset font doesn't already have (adds them to the font's own
 *  glyphShapeTable/codeTable from a system font), so translated text isn't limited to the original string's
 *  character subset. `replacements`: [{ charId, text }]; each text is written to its own scratch file and
 *  passed as one characterId/dataFile pair in a single -replace invocation (multiple pairs apply in one
 *  SWF rewrite, cheaper than one process per string). Always re-exports+diffs the result against the
 *  intended text afterward, since ~20% of single-run replacements fail silently in this FFDec version
 *  (SEVERE stderr, exit code 0, output byte-identical to input) per the same research notes. */
function runFfdecNativeTextReplace(inSwf, outSwf, replacements, label) {
  mkdirSync(SCRATCH, { recursive: true });
  const args = [inSwf, outSwf];
  const dataFiles = [];
  for (const { charId, text } of replacements) {
    const f = join(SCRATCH, `native-text.${charId}.txt`);
    writeFileSync(f, text, "utf8");
    dataFiles.push(f);
    args.push(String(charId), f);
  }
  log(label ?? "native-text", `ffdec -replace ${replacements.map((r) => r.charId).join(",")} on ${inSwf}`);
  execFileSync("java", ["-jar", FFDEC_JAR, "-replace", ...args], { stdio: "inherit", cwd: ROOT });

  // Verify: re-export text from the result and confirm every replacement actually landed (guards against
  // the ~20% silent-failure case documented above -- never trust exit code 0 alone for this command).
  const verifyDir = join(SCRATCH, "native-text-verify");
  rmSync(verifyDir, { recursive: true, force: true });
  execFileSync("java", ["-jar", FFDEC_JAR, "-export", "text", verifyDir, outSwf], { stdio: "pipe", cwd: ROOT });
  let failed = 0;
  for (const { charId, text: sent, expect } of replacements) {
    const text = expect ?? sent;
    const exported = join(verifyDir, `${charId}.txt`);
    // multi-record texts (one record per line/run) are compared record by record; single ones on record 0
    const recs = (t) => t.replace(/\r/g, "").split(/\n--- RECORDSEPARATOR ---\n/).map((r) => r.replace(/\n+$/, ""));
    const raw = existsSync(exported) ? readFileSync(exported, "utf8") : null;
    const got = raw === null ? null : text.includes("--- RECORDSEPARATOR ---") ? recs(raw).join("|") : recs(raw)[0];
    const want = text.includes("--- RECORDSEPARATOR ---") ? recs(text).join("|") : text;
    if (got !== want) {
      failed++;
      log(label ?? "native-text", `VERIFY FAILED chid ${charId}: expected ${JSON.stringify(text)}, got ${JSON.stringify(got)}`);
    }
  }
  if (failed === 0) log(label ?? "native-text", `verified: all ${replacements.length} replacement(s) landed`);
  return failed === 0;
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

  // --- DDT_Loading.swf: abc-strings (3 VN strings) -> native-text (whack-a-mole HUD's "điểm" score label,
  //     chid 40 = a DefineText2 glyph-run, NOT an ABC string literal -- abc-strings.mjs can't see it; see
  //     research/i18n/ui-sweep.md "Loading screen" + docs/BACKLOG.md item 2 for why -importText is unusable
  //     and -replace is the only working CLI path for native/non-ABC text). chid 40's second text RECORD
  //     (a lone full-width "：" in a different embedded font, fontId 39) is left alone -- it's punctuation,
  //     not Vietnamese, and replacing a 2-run DefineText2 in one -replace call is the documented duplication
  //     bug (ui-sweep.md); translating only run 1 ("điểm" -> "Pontos") and keeping run 2 as-is renders
  //     "Pontos：" with no duplicate glyphs, confirmed by rendering chid 41 (the sprite wrapping chid 40)
  //     after the patch. ---
  const vendorLoading = join(VENDOR, "DDT_Loading.swf");
  if (existsSync(vendorLoading)) {
    const tmpAbc = join(SCRATCH, "DDT_Loading.abc-strings.swf");
    runNode(abcStringsTool, [vendorLoading, tmpAbc], "core:DDT_Loading.swf");
    const tmpText = join(SCRATCH, "DDT_Loading.native-text.swf");
    const ok = runFfdecNativeTextReplace(tmpAbc, tmpText, [{ charId: 40, text: "Pontos" }], "core:DDT_Loading.swf");
    copyFileSync(ok ? tmpText : tmpAbc, join(OVERLAY, "DDT_Loading.swf"));
    log(
      "core:DDT_Loading.swf",
      `-> apps/api/assets/flash/DDT_Loading.swf (text patches${ok ? " + native-text (score label)" : " only -- native-text patch FAILED verification, shipped without it"})`
    );
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

/** Default color classifier for anchor compositing: flags pixels that look like the warm-gold ornate
 *  frame metal or the pale/blue glass bar interior used by DDTank's progress-bar chrome. Tunable per
 *  entry via approved.json's `anchor.classify` (see runAnchorComposite below) since a different anchored
 *  asset (a different gold trim, a different glass tint) may need different thresholds. */
const DEFAULT_ANCHOR_CLASSIFY = {
  goldMinR: 165, goldMinRMinusB: 55, goldMinGMinusB: 15, goldMaxGMinusR: 15,
  glassMinB: 105, glassBrightMin: 320, glassBrightMax: 700, glassMaxRMinusG: 32, glassMinBMinusR: -25,
};

function classifyAnchorPixel(r, g, b, c) {
  const bright = r + g + b;
  const isGold = r > c.goldMinR && r - b > c.goldMinRMinusB && g - b > c.goldMinGMinusB && g - r < c.goldMaxGMinusR;
  const isGlass =
    b > c.glassMinB && bright > c.glassBrightMin && bright < c.glassBrightMax &&
    Math.abs(r - g) < c.glassMaxRMinusG && b - r > c.glassMinBMinusR;
  return isGold || isGlass;
}

/** Reusable fix for AI remaster outputs whose painted art doesn't land exactly where the client's OWN
 *  runtime-drawn chrome (a fixed-position MovieClip/text field, positioned by the SWF's display list,
 *  independent of whatever pixels the AI painted) expects it. Cuts the real artwork for that functional
 *  area out of the ORIGINAL vendor image (same sourceFile the AI was given as a reference, so it's
 *  already pixel-identical to what the live client was designed against) at `anchor.rect` -- expressed in
 *  the FINAL fitted width x height's own coordinate space, e.g. for DDT_Loading__1: the pixel rect of the
 *  gold progress-bar frame in the 1000x600 canvas, measured once from vendor/.../1.jpg and cross-checked
 *  against the SWF's PlaceObject matrices for MainLoadingAsset -- then composites that cutout back onto
 *  the fitted AI art at the exact same rect, so the new art's décor lines up pixel-for-pixel with where
 *  the real UI will actually draw, no matter how close (or far) the AI got on its own.
 *  Alpha for the cutout comes from a color classifier (gold metal OR glass fill, see
 *  DEFAULT_ANCHOR_CLASSIFY), not a hard rectangle, so only the ornament's own silhouette gets pasted back
 *  -- the rest of the rect lets the new art's own background (ground, grass, whatever) show through.
 *  `anchor.rect` is deliberately padded a bit beyond the frame's own bbox in practice (see approved.json)
 *  so it also fully covers wherever the AI's own (misaligned) attempt at the same ornament landed --
 *  otherwise a sliver of the old, wrongly-placed art would still peek out from under the new cutout. */
async function runAnchorComposite(sharp, fittedBuffer, width, height, anchor, vendorSourcePath) {
  const [x0, y0, x1, y1] = anchor.rect;
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0 || x0 < 0 || y0 < 0 || x1 > width || y1 > height) {
    log("approved", `anchor rect [${anchor.rect}] out of bounds for ${width}x${height} -- skipping anchor composite`);
    return fittedBuffer;
  }
  if (!existsSync(vendorSourcePath)) {
    log("approved", `anchor source not found: ${vendorSourcePath} -- skipping anchor composite`);
    return fittedBuffer;
  }
  const classify = { ...DEFAULT_ANCHOR_CLASSIFY, ...(anchor.classify ?? {}) };
  const feather = anchor.feather ?? 2.2;

  // Source crop: the vendor reference image is the original asset at its canonical size, which per
  // manifest.csv is exactly `width`x`height` -- so anchor.rect indexes into it directly, no rescaling.
  const { data } = await sharp(vendorSourcePath)
    .extract({ left: x0, top: y0, width: w, height: h })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mask = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) {
    if (classifyAnchorPixel(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], classify)) mask[i] = 255;
  }
  // Blur the binary mask for a feathered edge. sharp upsamples a 1-channel raw buffer to 3 channels on
  // its way back out via .raw() in some builds -- read however many channels it actually gives back
  // (maskInfo.channels) rather than assuming 1, and just take every Nth byte (R==G==B for a grey blur).
  const { data: maskBlurred, info: maskInfo } = await sharp(mask, { raw: { width: w, height: h, channels: 1 } })
    .blur(feather)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mc = maskInfo.channels;

  const cutout = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    cutout[i * 4] = data[i * 4];
    cutout[i * 4 + 1] = data[i * 4 + 1];
    cutout[i * 4 + 2] = data[i * 4 + 2];
    cutout[i * 4 + 3] = maskBlurred[i * mc];
  }
  const cutoutPng = await sharp(cutout, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  return sharp(fittedBuffer).composite([{ input: cutoutPng, left: x0, top: y0 }]).png().toBuffer();
}

/** Opt-in QA gate for AI remaster outputs that include fixed, game-logic-critical positions -- e.g. the
 *  whack-a-mole panel's 8 holes (remaster/01-loading/prompts/DDT_Loading_mole-panel.txt), which must land
 *  within a couple pixels of game.view.MapView.as's BOGU_POS_ARRAY or the mole will visibly pop up next to
 *  its hole instead of out of it. An approved.json entry opts in with:
 *    "holes": { "positions": [[cx,cy,w,h], ...], "template": "01-loading/_mole-hole-template.png",
 *               "maxOffsetPx": 2, "searchRadius": 12 }
 *  `positions` are hole centers + size in the FITTED (manifest width x height) output's own coordinate
 *  space. `template` is a small grayscale reference crop of one hole (relative to remaster/), used as a
 *  real template-matching probe -- not a color heuristic -- via brute-force SSD search over every integer
 *  offset within `searchRadius` px of each expected center, same idea as OpenCV's matchTemplate but
 *  dependency-free. Any hole whose best-match offset exceeds `maxOffsetPx` fails the whole entry (the
 *  caller skips importing it) so a misaligned hole never reaches the live SWF silently. */
async function validateHoleAlignment(sharp, fittedBuffer, holesCfg) {
  const { positions, template, maxOffsetPx = 2, searchRadius = 12 } = holesCfg;
  const templatePath = join(ROOT, "remaster", template);
  if (!existsSync(templatePath)) {
    return { valid: false, results: [], error: `hole template not found: ${templatePath}` };
  }
  const fittedMeta = await sharp(fittedBuffer).greyscale().raw().toBuffer({ resolveWithObject: true });
  const FW = fittedMeta.info.width, FH = fittedMeta.info.height, fitted = fittedMeta.data;

  const results = [];
  let valid = true;
  for (let idx = 0; idx < positions.length; idx++) {
    const [cx, cy, w, h] = positions[idx];
    const { data: tmplRaw, info: tmplInfo } = await sharp(templatePath)
      .greyscale()
      .resize(Math.round(w), Math.round(h))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const tw = tmplInfo.width, th = tmplInfo.height;

    let best = { dx: 0, dy: 0, ssd: Infinity };
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const ox = Math.round(cx - tw / 2 + dx);
        const oy = Math.round(cy - th / 2 + dy);
        if (ox < 0 || oy < 0 || ox + tw > FW || oy + th > FH) continue;
        let ssd = 0;
        for (let ty = 0; ty < th; ty++) {
          const frow = (oy + ty) * FW + ox;
          const trow = ty * tw;
          for (let tx = 0; tx < tw; tx++) {
            const diff = fitted[frow + tx] - tmplRaw[trow + tx];
            ssd += diff * diff;
          }
        }
        if (ssd < best.ssd) best = { dx, dy, ssd };
      }
    }
    const offset = Math.hypot(best.dx, best.dy);
    const ok = offset <= maxOffsetPx;
    if (!ok) valid = false;
    results.push({ index: idx, expected: [cx, cy], offsetPx: offset, dx: best.dx, dy: best.dy, ok });
  }
  return { valid, results };
}

/** Post-process one approved AI output to the exact original width x height + correct tag encoding.
 *  `srcExt` is the ORIGINAL (vendor) image's extension (from manifest.csv), which decides JPEG vs PNG --
 *  never the AI output's own format, which is just whatever the generator happened to save.
 *  `anchor` (optional, from approved.json) runs runAnchorComposite() on the fitted result -- see there. */
async function processApprovedImage(sharp, outputsPath, width, height, fit, srcExt, anchor, vendorSourcePath) {
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
    let buffer = await keyed.png().toBuffer();
    if (anchor) buffer = await runAnchorComposite(sharp, buffer, width, height, anchor, vendorSourcePath);
    return { buffer, outExt: "png" };
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
    let buffer = await img.flatten({ background: "#000000" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    if (anchor) {
      // Re-decode as a PNG intermediate for the anchor composite (needs alpha), then re-flatten/re-encode
      // to JPEG so the final tag encoding still matches the original's opaque JPEG tag type.
      const withAnchor = await runAnchorComposite(sharp, buffer, width, height, anchor, vendorSourcePath);
      buffer = await sharp(withAnchor).flatten({ background: "#000000" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    }
    return { buffer, outExt: "jpg" };
  }
  let buffer = await img.png().toBuffer();
  if (anchor) buffer = await runAnchorComposite(sharp, buffer, width, height, anchor, vendorSourcePath);
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
    const { category, file, swf, fit, anchor } = entry;
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
    // anchor's reference crop comes from the Higgsfield-reference copy under remaster/<category>/inputs/,
    // named `<swfStem>__<sourceFile>` by convention (see remaster/README.md) -- same pixels the AI was
    // given as a guide, so it's exactly what the live client's fixed-position chrome was designed against.
    const vendorSourcePath = anchor
      ? join(ROOT, "remaster", category, "inputs", `${swf.replace(/\.swf$/i, "")}__${sourceFile}`)
      : undefined;
    const { buffer, outExt } = await processApprovedImage(
      sharp,
      outputsPath,
      row.width,
      row.height,
      fit,
      srcExt,
      anchor,
      vendorSourcePath
    );

    if (entry.holes) {
      const { valid, results, error } = await validateHoleAlignment(sharp, buffer, entry.holes);
      if (error) {
        log("approved", `SKIP ${category}/${file} -- hole validation error: ${error}`);
        continue;
      }
      const worst = results.reduce((m, r) => Math.max(m, r.offsetPx), 0);
      if (!valid && !entry.holes.force) {
        const bad = results.filter((r) => !r.ok).map((r) => `#${r.index} off by ${r.offsetPx.toFixed(1)}px`).join(", ");
        log(
          "approved",
          `REJECT ${category}/${file} -- hole alignment check failed (max allowed ${entry.holes.maxOffsetPx ?? 2}px): ${bad}`
        );
        continue;
      }
      log("approved", `${category}/${file} -- hole alignment OK (worst offset ${worst.toFixed(1)}px of ${results.length} holes)`);
    }

    if (!bySwf.has(swf)) bySwf.set(swf, []);
    bySwf.get(swf).push({ sourceFile, buffer, outExt, label: `${category}/${file}` });
    log(
      "approved",
      `${category}/${file} -> ${swf}::${sourceFile} (${row.width}x${row.height}, fit=${fit ?? "cover"}${anchor ? ", anchor=" + JSON.stringify(anchor.rect) : ""}, encoded .${outExt})`
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

/** Static SWF texts (DefineText/DefineEditText) translated by hand in research/i18n/swf-text-pt.json
 *  ({ "<swf>": { "<charId>": { vi: [records], pt: [records] } } }, built by tools/qa/swf-text-audit.sh +
 *  tools/qa/swf-text-merge.mjs). Runs AFTER the image import so it patches the final overlay copy (or the vendor
 *  file when no overlay exists), one -replace call per SWF, verified by runFfdecNativeTextReplace. */
function runSwfTextStep() {
  const f = join(ROOT, "research", "i18n", "swf-text-pt.json");
  if (!existsSync(f)) { log("swf-text", "no research/i18n/swf-text-pt.json -- skipping"); return; }
  const db = JSON.parse(readFileSync(f, "utf8"));
  const vendorRoot = join(ROOT, "vendor", "DDTank41", "Source Flash", "FlashSV1");
  let swfs = 0, ok = 0;
  for (const [swf, entries] of Object.entries(db)) {
    const reps = Object.entries(entries)
      .filter(([, e]) => e.pt.every((l, i) => l || !e.vi[i].trim()))
      // fewer PT records than the original leave the trailing Vietnamese records in place: pad with blank records
      .map(([charId, e]) => ({ charId: Number(charId), text: [...e.pt, ...Array(Math.max(0, e.vi.length - e.pt.length)).fill(" ")].join("\n--- RECORDSEPARATOR ---\n") }));
    if (!reps.length) continue;
    const rel = existsSync(join(vendorRoot, swf)) ? swf : join("ui", "vietnam", "swf", swf);
    const overlayPath = join(OVERLAY, rel);
    const src = existsSync(overlayPath) ? overlayPath : join(vendorRoot, rel);
    if (!existsSync(src)) { log("swf-text", `SKIP ${swf}: not found`); continue; }
    mkdirSync(dirname(overlayPath), { recursive: true });
    const tmp = join(SCRATCH, `swf-text.${swf}`);
    mkdirSync(SCRATCH, { recursive: true });
    copyFileSync(src, tmp);
    swfs++;
    // FFDec -replace on multi-record DefineText needs its "formatted" text (per-record [x/y/font] blocks): plain
    // record lists get appended instead of replacing. Export formatted, swap only the text runs, keep every block.
    const cnt = join(SCRATCH, "swf-text-count");
    rmSync(cnt, { recursive: true, force: true });
    execFileSync("java", ["-jar", FFDEC_JAR, "-format", "text:formatted", "-export", "text", cnt, tmp], { stdio: "pipe", cwd: ROOT });
    for (const r of reps) {
      const fx = join(cnt, `${r.charId}.txt`);
      if (!existsSync(fx)) continue;
      const SEP = "\n--- RECORDSEPARATOR ---\n";
      const pt = r.text.split(SEP);
      const raw = readFileSync(fx, "utf8");
      // tokens: [...] parameter blocks (escaped \] may appear inside) and the text runs between them
      const parts = raw.split(/(\[(?:[^\]\\]|\\.)*\])/);
      const esc = (t) => t.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
      const runs = parts.filter((p) => p && !p.startsWith("[")).length;
      if (!runs) continue;
      // more PT lines than runs: the extra ones join the last run
      const recs = pt.length > runs ? [...pt.slice(0, runs - 1), pt.slice(runs - 1).join(" ")] : [...pt, ...Array(runs - pt.length).fill("")];
      let k = 0;
      // blocks keep position/font/colour; their per-glyph kerning lines (spacing/spacingpair) describe the
      // Vietnamese glyphs and some break FFDec's parser (`spacing """`, empty chars): dropped
      const block = (p) => p.replace(/^(?:spacing|spacingpair) .*\r?\n/gm, "");
      r.text = parts.map((p) => (!p ? p : p.startsWith("[") ? block(p) : esc(recs[k++]))).join("");
      r.expect = recs.join(SEP);
    }
    try {
      if (runFfdecNativeTextReplace(tmp, overlayPath, reps, `swf-text:${swf}`)) ok++;
      else {
        // ~20% of replacements fail silently in a batch: re-apply each text alone on top of the batch result
        let cur = join(SCRATCH, `swf-text.${swf}.retry.swf`), good = 0;
        copyFileSync(overlayPath, cur);
        for (const r of reps) {
          const out = `${cur}.${r.charId}.swf`;
          try { if (runFfdecNativeTextReplace(cur, out, [r], `swf-text-retry:${swf}`)) good++; cur = out; } catch { log("swf-text", `${swf}: retry SKIP chid ${r.charId}`); }
        }
        copyFileSync(cur, overlayPath);
        log("swf-text", `${swf}: retry pass ${good}/${reps.length} verified`);
        if (good === reps.length) ok++;
      }
    } catch (e) {
      // one bad record makes FFDec exit 1 for the whole batch: apply the texts one at a time, skipping the failures
      log("swf-text", `${swf}: batch -replace failed (${e.message.split("\n")[0].slice(0, 80)}...), retrying one text at a time`);
      let cur = tmp, good = 0;
      for (const r of reps) {
        const out = `${tmp}.${r.charId}.swf`;
        try { runFfdecNativeTextReplace(cur, out, [r], `swf-text:${swf}`); cur = out; good++; } catch { log("swf-text", `${swf}: SKIP chid ${r.charId} (ffdec -replace failed)`); }
      }
      copyFileSync(cur, overlayPath);
      log("swf-text", `${swf}: ${good}/${reps.length} text(s) applied one by one`);
    }
  }
  log("swf-text", `${ok}/${swfs} SWF(s) fully verified`);
}

async function main() {
  log("build", `flags: images=${OPT_IMAGES} night=${OPT_NIGHT} dark=${OPT_DARK} prod=${PROD} approved=${OPT_APPROVED}`);
  if (has("--only-swf-text")) { runSwfTextStep(); return; } // re-patch static texts on the current overlay, nothing else
  const removed = revertImageOnlyOverlays();
  buildCoreChain();
  if (OPT_APPROVED) {
    await runApprovedAssetsStep();
  } else {
    log("approved", "skipped (--no-approved)");
  }
  runOptInImageSteps();
  if (!has("--no-swf-text")) runSwfTextStep();
  writeDiscardedNote();
  log("build", `done. ${removed} leftover image-edit file(s) reverted to vendor; 2.png/3.png/DDT_Loading.swf rebuilt text-only.`);
  log("build", "restart apps/api (or pnpm dev:all) so the CiTree overlay index picks up the deleted/rebuilt files.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
