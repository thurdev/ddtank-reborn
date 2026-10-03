// Night-mode grade for the hall/lobby background art (hall.swf + hall_old.swf), deterministic (no AI).
//
// hall.swf/hall_old.swf hold ~120 exported bitmaps each: a handful of large painted background/skyline
// pieces, dozens of mid-size building/decoration sprites, small cloud-puff fillers, and (already handled by
// an earlier PT-BR batch — left untouched here) tiny building-name caption plates + UI icons/buttons.
//
// Classification (by pixel stats only, no manual list — see _inspect-hall.mjs output this was tuned against):
//   - skip:        already-localized caption/icon files (present in STAGE_ROOT from the text batch), the
//                  battleLABS tutorial comic and the legacy noviceBG dialog (separate concerns, tracked in
//                  needs-ai.md), anything vividly saturated (S>0.5 — those are flags/badges/animation frames,
//                  not architecture) and anything too small unless it's a flat pale cloud-puff filler.
//   - sky/distant: near-zero-saturation flat pieces (skyline silhouette strips, cloud puffs) -> strong
//                  blue/purple hue mix + darken + stars (+ moon on the single biggest one) + vignette.
//   - building:    everything else that passes the filters -> moderate darken, hue barely shifted (stays
//                  "readable", same material identity), + lit-window glow heuristic.
//   - composite:   the one big painted backdrop JPEG (12.jpg / 104.jpg, sky+buildings baked into one bitmap)
//                  gets a vertical-gradient hybrid: strong sky treatment up top fading to the building
//                  treatment by ~45% down, so there's no hard seam.
import sharp from "sharp";
import { readdirSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  loadRaw, encode, extForFile, nightGradePixel, pixelStats,
  paintStars, paintVignette, addWindowGlow, mulberry32, seedFromString,
} from "./night-grade.mjs";

const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;
const STAGE_ROOT = `${SP}/i18n/staged`;
const SWFS = ["hall.swf", "hall_old.swf"];
const EXCLUDE_NAME_RE = /battlelabs|novicebg/i;
const MOON_HUE = 230; // blue-purple night sky target hue

function classify(name, w, h, st) {
  if (EXCLUDE_NAME_RE.test(name)) return "skip";
  if (st.n === 0) return "skip"; // fully transparent (already-erased caption plate etc.)
  if (st.sat > 0.5) return "skip"; // vivid badge/flag/animation-frame sprite, not architecture
  const flatPale = st.lightness > 0.72 && st.sat < 0.08 && st.stdL < 0.28;
  const maxDim = Math.max(w, h);
  if (maxDim < 120 && !flatPale) return "skip";
  if (st.sat <= 0.08 || flatPale) return "sky";
  return "building";
}

async function processSwf(swf) {
  const dir = join(EXPORT_ROOT, swf);
  const stageDir = join(STAGE_ROOT, swf);
  mkdirSync(stageDir, { recursive: true });
  const files = readdirSync(dir).filter((f) => /\.(png|jpg|jpeg)$/i.test(f));

  // First pass: stats, to find the single largest candidate (the painted composite backdrop).
  const infos = [];
  for (const f of files) {
    if (existsSync(join(stageDir, f))) continue; // already localized by the text batch — never touch
    const srcPath = join(dir, f);
    const { data, info, meta } = await loadRaw(srcPath);
    const st = pixelStats(data, info);
    infos.push({ f, srcPath, data, info, meta, st, area: (meta.width || 0) * (meta.height || 0) });
  }
  infos.sort((a, b) => b.area - a.area);
  // The painted composite backdrop (sky+buildings baked into one landscape bitmap, e.g. 12.jpg/104.jpg) is
  // the largest-area candidate that ISN'T excluded by name and isn't a tall/narrow asset (the battleLABS
  // tutorial comic is taller-area but excluded by name + fails the landscape-aspect check below either way).
  const compositeCandidate = infos.find((it) => !EXCLUDE_NAME_RE.test(it.f) && it.area >= 400000 && it.meta.width / it.meta.height >= 1.2 && it.meta.width / it.meta.height <= 2.5);
  const compositeFile = compositeCandidate ? compositeCandidate.f : null;

  const counts = { sky: 0, building: 0, composite: 0, skip: 0 };
  for (const item of infos) {
    const { f, data, info, meta, st } = item;
    const cls = f === compositeFile ? "composite" : classify(f, meta.width, meta.height, st);
    counts[cls]++;
    if (cls === "skip") continue;

    const out = Buffer.from(data);
    const seed = seedFromString(`${swf}/${f}`);

    if (cls === "composite") {
      const H = info.height, W = info.width, ch = info.channels;
      for (let y = 0; y < H; y++) {
        // Sky treatment fades out by 45% down the canvas (buildings/ground occupy the lower portion).
        const frac = Math.min(1, y / (H * 0.45));
        const mix = 0.55 * (1 - frac) + 0.1 * frac;
        const lScale = 0.62 * (1 - frac) + 0.78 * frac; // darken sky a bit more than the ground/buildings
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * ch;
          if (out[i + 3] === 0) continue;
          const [r, g, b] = nightGradePixel(out[i], out[i + 1], out[i + 2], { lScale, lFloor: 0.02, lCeil: 0.85, sScale: 1.1, sCeil: 0.55, hueShiftDeg: MOON_HUE, hueShiftMix: mix });
          out[i] = r; out[i + 1] = g; out[i + 2] = b;
        }
      }
      // Vignette + window glow paint onto the graded scene first; stars/moon go last so the vignette's
      // edge-darkening never dims them (they're a top-layer sky effect, not part of the base scene).
      paintVignette(out, info, { strength: 0.3 });
      addWindowGlow(out, info, { block: 12, minLum: 150, minDeltaOverMean: 35 });
      paintStars(out, info, { seed, count: 110, skyTopFrac: 0.02, skyBottomFrac: 0.4, moon: { cx: W * 0.84, cy: H * 0.16, r: Math.min(W, H) * 0.045 } });
    } else if (cls === "sky") {
      for (let i = 0; i < out.length; i += 4) {
        if (out[i + 3] === 0) continue;
        const [r, g, b] = nightGradePixel(out[i], out[i + 1], out[i + 2], { lScale: 0.6, lFloor: 0.03, lCeil: 0.85, sScale: 1.15, sCeil: 0.5, hueShiftDeg: MOON_HUE, hueShiftMix: 0.55 });
        out[i] = r; out[i + 1] = g; out[i + 2] = b;
      }
      paintStars(out, info, { seed, count: Math.max(6, Math.round((info.width * info.height) / 9000)), skyTopFrac: 0, skyBottomFrac: 1 });
    } else {
      // building: keep readable — moderate darken, hue barely nudged toward cool, no stars.
      for (let i = 0; i < out.length; i += 4) {
        if (out[i + 3] === 0) continue;
        const [r, g, b] = nightGradePixel(out[i], out[i + 1], out[i + 2], { lScale: 0.72, lFloor: 0.04, lCeil: 0.88, sScale: 1.08, sCeil: 0.55, hueShiftDeg: MOON_HUE, hueShiftMix: 0.14 });
        out[i] = r; out[i + 1] = g; out[i + 2] = b;
      }
      addWindowGlow(out, info, { block: 8, minLum: 140, minDeltaOverMean: 30 });
    }

    const ext = extForFile(f);
    const buf = await encode(out, info, ext);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(stageDir, f), buf);
  }
  console.log(`[${swf}] composite=${counts.composite} sky=${counts.sky} building=${counts.building} skipped=${counts.skip} (of ${infos.length} not-already-staged)`);
}

async function main() {
  for (const swf of SWFS) await processSwf(swf);
}
main().catch((e) => { console.error(e); process.exit(1); });
