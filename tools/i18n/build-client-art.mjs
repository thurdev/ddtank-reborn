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
 * Usage:
 *   node tools/i18n/build-client-art.mjs                      # default: revert images, text-only core chain
 *   node tools/i18n/build-client-art.mjs --images --night --dark   # also run the opt-in (currently unused) image batch
 *   node tools/i18n/build-client-art.mjs --prod --rsa-modulus <hex>  # also patch the RSA modulus into 2.png
 *
 * --prod is NOT a secret-rotation tool. Full production secret rotation (fresh RSA keypair + .env wiring
 * for apps/api and apps/game) is scripts/gen-secrets.mjs, which already runs this exact same core chain
 * (abc-strings -> static-arrays -> patch-client-key) independently from vendor. --prod here only lets you
 * re-stamp the CLIENT ART portion against a modulus you already issued, without touching any .env file.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const VENDOR = join(ROOT, "vendor", "DDTank41", "Source Flash", "FlashSV1");
const OVERLAY = join(ROOT, "apps", "api", "assets", "flash");
const SCRATCH = join(ROOT, "node_modules", ".cache", "ddt-client-art"); // small scratch for temp chain files only

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

function main() {
  log("build", `flags: images=${OPT_IMAGES} night=${OPT_NIGHT} dark=${OPT_DARK} prod=${PROD}`);
  const removed = revertImageOnlyOverlays();
  buildCoreChain();
  runOptInImageSteps();
  writeDiscardedNote();
  log("build", `done. ${removed} leftover image-edit file(s) reverted to vendor; 2.png/3.png/DDT_Loading.swf rebuilt text-only.`);
  log("build", "restart apps/api (or pnpm dev:all) so the CiTree overlay index picks up the deleted/rebuilt files.");
}

main();
