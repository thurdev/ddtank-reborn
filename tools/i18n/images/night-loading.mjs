// Night-mode grade for the boot/loading splash screens (Loading.swf + DDT_Loading.swf), deterministic.
// Same method as night-hall.mjs (HSL darken + RGB tint-mix "blue/purple shift" + procedural stars/moon/
// vignette on the big composite backdrops), scoped to the handful of large splash bitmaps — small UI chrome
// (progress-bar fill, cursor icons, tiny logo chips) is left untouched.
//
// `DDT_Loading.swf::25.png` is the baked 3-color PT-BR title banner call-out from needs-ai.md: the text is
// painted into shaded art (not a flat plate), so per the task spec it gets graded-only, no text overlay.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  loadRaw, encode, extForFile, nightGradePixel, paintStars, paintVignette, addWindowGlow, seedFromString,
} from "./night-grade.mjs";

const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;
const NIGHT_STAGE = `${SP}/i18n/staged_loading`;
const TINT = 230; // same night-blue/purple target hue as night-hall.mjs

const TARGETS = {
  "Loading.swf": {
    "4.png": "sky", // flat low-saturation backdrop panel
  },
  "DDT_Loading.swf": {
    "1.jpg": "composite", // 1000x600 main boot backdrop
    "25.png": "graded-only", // baked title banner — grade to match, text left as-is (needs-ai)
  },
};

function gradientDarken(out, info, { lTop = 0.6, lBottom = 0.78, mixTop = 0.5, mixBottom = 0.1, splitFrac = 0.45 }) {
  const { width: W, height: H, channels: ch } = info;
  for (let y = 0; y < H; y++) {
    const frac = Math.min(1, y / (H * splitFrac));
    const lScale = lTop * (1 - frac) + lBottom * frac;
    const mix = mixTop * (1 - frac) + mixBottom * frac;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * ch;
      if (out[i + 3] === 0) continue;
      const [r, g, b] = nightGradePixel(out[i], out[i + 1], out[i + 2], { lScale, lFloor: 0.02, lCeil: 0.85, sScale: 1.1, sCeil: 0.55, hueShiftDeg: TINT, hueShiftMix: mix });
      out[i] = r; out[i + 1] = g; out[i + 2] = b;
    }
  }
}

async function main() {
  for (const [swf, files] of Object.entries(TARGETS)) {
    const dir = join(EXPORT_ROOT, swf);
    const outDir = join(NIGHT_STAGE, swf);
    mkdirSync(outDir, { recursive: true });
    for (const [file, mode] of Object.entries(files)) {
      const srcPath = join(dir, file);
      const { data, info } = await loadRaw(srcPath);
      const out = Buffer.from(data);
      const seed = seedFromString(`${swf}/${file}`);

      if (mode === "composite") {
        gradientDarken(out, info, { lTop: 0.58, lBottom: 0.76, mixTop: 0.55, mixBottom: 0.12, splitFrac: 0.45 });
        paintVignette(out, info, { strength: 0.32 });
        addWindowGlow(out, info, { block: 12, minLum: 150, minDeltaOverMean: 35 });
        const { width: W, height: H } = info;
        paintStars(out, info, { seed, count: 100, skyTopFrac: 0.02, skyBottomFrac: 0.42, moon: { cx: W * 0.14, cy: H * 0.15, r: Math.min(W, H) * 0.045 } });
      } else if (mode === "sky") {
        gradientDarken(out, info, { lTop: 0.62, lBottom: 0.68, mixTop: 0.55, mixBottom: 0.4, splitFrac: 1 });
        paintStars(out, info, { seed, count: 24, skyTopFrac: 0, skyBottomFrac: 1 });
      } else {
        // graded-only: moderate, legibility-preserving darken, no stars/moon/vignette (foreground title art).
        for (let i = 0; i < out.length; i += 4) {
          if (out[i + 3] === 0) continue;
          const [r, g, b] = nightGradePixel(out[i], out[i + 1], out[i + 2], { lScale: 0.78, lFloor: 0.06, lCeil: 0.9, sScale: 1.05, sCeil: 0.6, hueShiftDeg: TINT, hueShiftMix: 0.2 });
          out[i] = r; out[i + 1] = g; out[i + 2] = b;
        }
      }

      const ext = extForFile(file);
      const buf = await encode(out, info, ext);
      writeFileSync(join(outDir, file), buf);
      console.log(`[${swf}] ${file} -> ${mode}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
