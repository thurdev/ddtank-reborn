// Dark-mode recolor for the SHARED window/panel/button skin assets (9-slice chrome tiles).
//
// These two SWFs hold the pickgliss "Scale9CornerImage"/"scale9Core"/"BorderScale9Image" tile
// families that every other window SWF references via a shared library import (corescalebitmap.swf,
// ddtcorescalebitmap.swf) — recolor these once and every window's frame/panel/button border goes dark.
//
// Method: deterministic HSL remap, NOT AI (per docs/ROADMAP.md "Reborn visual" item 3 — "Prefer
// deterministic image processing... over AI for 9-slice skins"). Hue is preserved (same wood/metal/stone
// material identity as the original art), saturation gets a small boost (flat dark colors read as muddy
// without it), lightness is multiplicatively scaled down (preserves the original bevel/highlight shading
// relationships instead of flattening or inverting them) with a small floor/ceiling so neither pure black
// nor blown-out highlights appear. Alpha channel and pixel dimensions are copied through byte-for-byte
// unchanged — this never touches shape/anchors/size, only color.
//
// Usage: node dark-mode-skins.mjs [--dry-run]
import sharp from "sharp";
import { readdirSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;
const STAGE_ROOT = `${SP}/i18n/staged`;

const TARGET_SWFS = ["corescalebitmap.swf", "ddtcorescalebitmap.swf"];
// Only the confirmed shared 9-slice chrome tile families — never the unrelated backgrounds/icons that
// also live in these two SWFs (pickItemBg, vip.BG*, dailyRecord*, bg012.jpg, activeEvents.png, ...).
const SKIN_NAME_RE = /scale9/i;

// HSL tuning. Applied per-opaque-pixel; alpha untouched.
const L_SCALE = 0.40; // multiplicative darken (preserves bevel contrast, doesn't flatten/invert)
const L_FLOOR = 0.02;
const L_CEIL = 0.82; // guards the rare near-white anti-aliased edge pixel from staying blown-out
const S_SCALE = 1.15;
const S_CEIL = 0.55;

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function darken(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  const l2 = Math.min(L_CEIL, Math.max(L_FLOOR, l * L_SCALE));
  const s2 = Math.min(S_CEIL, s * S_SCALE);
  return hslToRgb(h, s2, l2).map((v) => Math.round(Math.max(0, Math.min(255, v))));
}

async function processFile(swf, file, dryRun) {
  const src = join(EXPORT_ROOT, swf, file);
  const img = sharp(src);
  const meta = await img.metadata();
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue; // fully transparent, skip (alpha preserved as-is)
    const [r, g, b] = darken(out[i], out[i + 1], out[i + 2]);
    out[i] = r; out[i + 1] = g; out[i + 2] = b;
    // out[i+3] (alpha) untouched
  }
  if (dryRun) return { file, w: meta.width, h: meta.height };
  const destDir = join(STAGE_ROOT, swf);
  mkdirSync(destDir, { recursive: true });
  const ext = file.toLowerCase().endsWith(".jpg") ? "jpeg" : "png";
  let pipeline = sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
  pipeline = ext === "jpeg" ? pipeline.jpeg({ quality: 95 }) : pipeline.png();
  await pipeline.toFile(join(destDir, file));
  return { file, w: meta.width, h: meta.height };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  let total = 0;
  for (const swf of TARGET_SWFS) {
    const dir = join(EXPORT_ROOT, swf);
    const files = readdirSync(dir).filter((f) => SKIN_NAME_RE.test(f) && statSync(join(dir, f)).isFile());
    console.log(`[${swf}] ${files.length} skin tile(s) matched`);
    for (const f of files) {
      const r = await processFile(swf, f, dryRun);
      total++;
      if (total % 50 === 0) console.log(`  ...${total} processed`);
    }
  }
  console.log(`${dryRun ? "[dry-run] would process" : "Processed"} ${total} shared window/panel/button skin tiles.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
