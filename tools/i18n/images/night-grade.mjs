// Shared deterministic (no-AI) image-processing helpers for the night/dark-mode visual batch.
// Reused by night-hall.mjs, night-loading.mjs and dark-frames.mjs. Every function operates on raw RGBA
// pixel buffers (via sharp) and never resizes/crops — dimensions and alpha are always preserved so SWF
// re-import keeps the original anchors.
import sharp from "sharp";

export function rgbToHsl(r, g, b) {
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
export function hslToRgb(h, s, l) {
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

// Deterministic PRNG (mulberry32) so stars/decisions are reproducible across re-runs of the same file.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedFromString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Load a file (or buffer) into a {raw, info} RGBA pixel grid for in-place pixel work. */
export async function loadRaw(srcPathOrBuffer) {
  const img = sharp(srcPathOrBuffer).ensureAlpha();
  const meta = await img.metadata();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data: Buffer.from(data), info, meta };
}

/** Encode a raw RGBA buffer back to PNG/JPEG bytes matching the original extension. */
export async function encode(raw, info, ext) {
  let pipeline = sharp(raw, { raw: { width: info.width, height: info.height, channels: 4 } });
  return ext === "jpeg" || ext === "jpg" ? pipeline.jpeg({ quality: 95 }).toBuffer() : pipeline.png().toBuffer();
}

// Cache of hue -> stable mid-tone RGB anchor color, used by nightGradePixel's hue-shift step below.
const _tintCache = new Map();
function nightTintRgb(hueDeg) {
  let c = _tintCache.get(hueDeg);
  if (!c) { c = hslToRgb(hueDeg, 0.55, 0.42); _tintCache.set(hueDeg, c); }
  return c;
}

/**
 * Per-pixel night grade: darken + optional hue shift toward blue/purple (for sky/distant layers), then
 * lightness/saturation scaling in HSL space. Alpha untouched.
 *
 * The hue shift is a LINEAR RGB MIX toward a fixed target color (luminance-matched to the source pixel), not
 * an HSL hue rotation/mix. Found the hard way (2026-10-03 relight pass): HSL hue is numerically unstable for
 * near-gray pixels (saturation≈0 means hue is nearly undefined — a 1-unit JPEG-block rounding difference in
 * which channel is max flips the computed hue by ~120°). Mixing hue in HSL space amplifies that per-pixel
 * noise into visible red/pink speckle once lCeil drops low enough to make the hue error visible against a
 * darkened background (confirmed by diffing the staged PNG pre-repack: the speckle was already there, not a
 * repack/Ruffle artifact). Mixing in RGB space first — then deriving h/s/l from the already-tinted, no-longer-
 * near-gray pixel for the lightness/saturation step — sidesteps the instability because by the time hue is
 * extracted, the pixel has real saturation again.
 */
export function nightGradePixel(r, g, b, opts) {
  const { lScale = 0.55, lFloor = 0.02, lCeil = 0.85, sScale = 1.1, sCeil = 0.6, hueShiftDeg = 0, hueShiftMix = 0 } = opts;
  let rr = r, gg = g, bb = b;
  if (hueShiftDeg !== 0 && hueShiftMix > 0) {
    const [tr, tg, tb] = nightTintRgb(hueShiftDeg);
    // Scale the tint to the source pixel's own luminance so a bright pixel mixed toward a mid-brightness
    // anchor color doesn't just go flat/gray — it keeps reading as "this pixel, but cooler".
    const srcLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const tintLum = 0.2126 * tr + 0.7152 * tg + 0.0722 * tb || 1;
    const rel = srcLum / tintLum;
    rr = r * (1 - hueShiftMix) + Math.min(255, tr * rel) * hueShiftMix;
    gg = g * (1 - hueShiftMix) + Math.min(255, tg * rel) * hueShiftMix;
    bb = b * (1 - hueShiftMix) + Math.min(255, tb * rel) * hueShiftMix;
  }
  let [h, s, l] = rgbToHsl(clampByte(rr), clampByte(gg), clampByte(bb));
  const l2 = Math.min(lCeil, Math.max(lFloor, l * lScale));
  const s2 = Math.min(sCeil, s * sScale);
  return hslToRgb(h, s2, l2).map((v) => Math.round(Math.max(0, Math.min(255, v))));
}
function clampByte(v) { return Math.max(0, Math.min(255, v)); }

export function applyNightGrade(raw, info, opts) {
  const out = Buffer.from(raw);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    const [r, g, b] = nightGradePixel(out[i], out[i + 1], out[i + 2], opts);
    out[i] = r; out[i + 1] = g; out[i + 2] = b;
  }
  return out;
}

/** Mean/variance stats used for sky-vs-building classification. Ignores fully-transparent pixels. */
export function pixelStats(raw, info) {
  let n = 0, r = 0, g = 0, b = 0, l2sum = 0;
  const ch = info.channels;
  for (let i = 0; i < raw.length; i += ch) {
    const a = ch >= 4 ? raw[i + 3] : 255;
    if (a === 0) continue;
    r += raw[i]; g += raw[i + 1]; b += raw[i + 2]; n++;
  }
  if (!n) return { n: 0, r: 0, g: 0, b: 0, lightness: 0, sat: 0, blueBias: 0, stdL: 0 };
  r /= n; g /= n; b /= n;
  const [, s, l] = rgbToHsl(r, g, b);
  // Std-dev of luminance (flatness indicator: skies/gradients are low-variance, busy building art is high).
  let varSum = 0, m = 0;
  for (let i = 0; i < raw.length; i += ch) {
    const a = ch >= 4 ? raw[i + 3] : 255;
    if (a === 0) continue;
    const lum = 0.2126 * raw[i] + 0.7152 * raw[i + 1] + 0.0722 * raw[i + 2];
    varSum += lum; m++;
  }
  const meanLum = varSum / m;
  let sq = 0;
  for (let i = 0; i < raw.length; i += ch) {
    const a = ch >= 4 ? raw[i + 3] : 255;
    if (a === 0) continue;
    const lum = 0.2126 * raw[i] + 0.7152 * raw[i + 1] + 0.0722 * raw[i + 2];
    sq += (lum - meanLum) * (lum - meanLum);
  }
  const stdL = Math.sqrt(sq / m) / 255;
  return { n, r, g, b, lightness: l, sat: s, blueBias: b - r, stdL };
}

/** Composite a starfield + optional moon disc directly into a raw RGBA buffer (in place). Deterministic PRNG. */
export function paintStars(raw, info, { seed, count, skyTopFrac = 0, skyBottomFrac = 1, moon = null }) {
  const rnd = mulberry32(seed);
  const { width: W, height: H, channels: ch } = info;
  const y0 = Math.floor(H * skyTopFrac), y1 = Math.floor(H * skyBottomFrac);
  const blend = (i, cr, cg, cb, a) => {
    if (i < 0 || i >= raw.length) return;
    const destA = ch >= 4 ? raw[i + 3] : 255;
    if (destA === 0) return; // never paint onto fully-transparent (outside the sprite's real silhouette)
    raw[i] = Math.round(raw[i] * (1 - a) + cr * a);
    raw[i + 1] = Math.round(raw[i + 1] * (1 - a) + cg * a);
    raw[i + 2] = Math.round(raw[i + 2] * (1 - a) + cb * a);
  };
  if (moon) {
    const { cx, cy, r } = moon;
    const haloR = r * 2.6;
    const x0 = Math.max(0, Math.floor(cx - haloR)), x1 = Math.min(W - 1, Math.ceil(cx + haloR));
    const yy0 = Math.max(0, Math.floor(cy - haloR)), yy1 = Math.min(H - 1, Math.ceil(cy + haloR));
    for (let y = yy0; y <= yy1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > haloR) continue;
        const i = (y * W + x) * ch;
        if (d <= r) blend(i, 250, 248, 232, 0.92);
        else blend(i, 210, 220, 245, Math.max(0, 0.38 * (1 - (d - r) / (haloR - r))));
      }
    }
  }
  for (let k = 0; k < count; k++) {
    const x = Math.floor(rnd() * W);
    const y = y0 + Math.floor(rnd() * Math.max(1, y1 - y0));
    const bright = 0.5 + rnd() * 0.5;
    const size = rnd() < 0.15 ? 2 : 1;
    const i = (y * W + x) * ch;
    blend(i, 255, 255, 255, bright);
    if (size === 2) {
      blend(i - ch, 255, 255, 255, bright * 0.35);
      blend(i + ch, 255, 255, 255, bright * 0.35);
      blend(i - W * ch, 255, 255, 255, bright * 0.35);
      blend(i + W * ch, 255, 255, 255, bright * 0.35);
    }
  }
  return raw;
}

/** Subtle radial vignette darkening the corners/edges of a raw RGBA buffer, in place. */
export function paintVignette(raw, info, { strength = 0.35 } = {}) {
  const { width: W, height: H, channels: ch } = info;
  const cx = W / 2, cy = H / 2;
  const maxD = Math.hypot(cx, cy);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * ch;
      if (ch >= 4 && raw[i + 3] === 0) continue;
      const d = Math.hypot(x - cx, y - cy) / maxD;
      const f = Math.max(0, d - 0.45) / 0.55; // only darken the outer ~55% radius
      if (f <= 0) continue;
      const k = 1 - strength * Math.min(1, f);
      raw[i] = Math.round(raw[i] * k);
      raw[i + 1] = Math.round(raw[i + 1] * k);
      raw[i + 2] = Math.round(raw[i + 2] * k);
    }
  }
  return raw;
}

/**
 * Coarse-grid "bright small spot" detector for lit-window glow: splits the image into blocks, flags blocks
 * whose mean luminance is a strong local outlier vs. the image mean (small bright rects on a darker facade —
 * exactly how windows read once the building is night-graded), and paints a soft warm (lamp-light) glow
 * centered on each flagged block directly into the buffer (in place). Deliberately coarse/approximate —
 * there is no segmentation model here, just a local-contrast heuristic, acceptable for a "subtle glow" accent.
 */
export function addWindowGlow(raw, info, { block = 10, minLum = 150, minDeltaOverMean = 40, maxFracFlagged = 0.25 } = {}) {
  const { width: W, height: H, channels: ch } = info;
  const cols = Math.ceil(W / block), rows = Math.ceil(H / block);
  const blockLum = new Float32Array(cols * rows);
  const blockA = new Float32Array(cols * rows);
  let meanLum = 0, nBlocks = 0;
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      let sum = 0, n = 0, aSum = 0;
      const x0 = bx * block, y0 = by * block;
      const x1 = Math.min(W, x0 + block), y1 = Math.min(H, y0 + block);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * W + x) * ch;
          const a = ch >= 4 ? raw[i + 3] : 255;
          aSum += a;
          if (a < 40) continue;
          sum += 0.2126 * raw[i] + 0.7152 * raw[i + 1] + 0.0722 * raw[i + 2];
          n++;
        }
      }
      const idx = by * cols + bx;
      blockA[idx] = aSum / ((x1 - x0) * (y1 - y0));
      blockLum[idx] = n ? sum / n : 0;
      if (n) { meanLum += blockLum[idx]; nBlocks++; }
    }
  }
  if (!nBlocks) return raw;
  meanLum /= nBlocks;
  let flagged = 0;
  const spots = [];
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const idx = by * cols + bx;
      if (blockA[idx] < 60) continue;
      if (blockLum[idx] >= minLum && blockLum[idx] - meanLum >= minDeltaOverMean) {
        spots.push({ x: bx * block + block / 2, y: by * block + block / 2 });
        flagged++;
      }
    }
  }
  // Busy/bright images (e.g. already-pale sky) would flag nearly every block — that's not "windows", skip.
  if (flagged === 0 || flagged / nBlocks > maxFracFlagged) return raw;
  for (const { x, y } of spots) {
    const r = block * 1.3;
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r));
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const i = (yy * W + xx) * ch;
        const a = ch >= 4 ? raw[i + 3] : 255;
        if (a === 0) continue;
        const d = Math.hypot(xx - x, yy - y) / r;
        if (d > 1) continue;
        const glow = 0.45 * (1 - d);
        raw[i] = Math.round(Math.min(255, raw[i] + (255 - raw[i]) * glow * 0.9)); // warm amber push
        raw[i + 1] = Math.round(Math.min(255, raw[i + 1] + (200 - raw[i + 1]) * glow * 0.6));
        raw[i + 2] = Math.round(Math.max(0, raw[i + 2] - raw[i + 2] * glow * 0.25));
      }
    }
  }
  return raw;
}

/**
 * Sobel-ish local-contrast edge magnitude on luminance, used by dark-frames.mjs to find and protect small
 * high-contrast components (text glyph strokes, icon outlines) from the dark remap.
 */
export function edgeMagnitudeMap(raw, info) {
  const { width: W, height: H, channels: ch } = info;
  const lum = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * ch;
      lum[y * W + x] = 0.2126 * raw[i] + 0.7152 * raw[i + 1] + 0.0722 * raw[i + 2];
    }
  }
  const mag = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const gx = lum[y * W + x + 1] - lum[y * W + x - 1];
      const gy = lum[(y + 1) * W + x] - lum[(y - 1) * W + x];
      mag[y * W + x] = Math.hypot(gx, gy);
    }
  }
  return mag;
}

/**
 * Dark remap for bespoke window-frame art (bag/shop/settings/quest/mail/guild backgrounds) that PROTECTS
 * legibility: text glyph strokes (found via local luminance-edge magnitude — small high-contrast components)
 * and saturated icon pixels are blended back toward their original color instead of being darkened, so
 * labels and colorful icons baked into the same bitmap as the frame stay readable. Everything else gets the
 * same hue-preserving HSL darken as dark-mode-skins.mjs (material identity preserved, just darker/richer).
 * Protection is graduated (0..1), not a hard mask, so there's no jagged edge around protected regions.
 */
export function applyProtectedDarken(raw, info, opts = {}) {
  const { lScale = 0.42, lFloor = 0.02, lCeil = 0.82, sScale = 1.12, sCeil = 0.6, edgeThreshold = 35, satProtect = 0.45 } = opts;
  const mag = edgeMagnitudeMap(raw, info);
  const out = Buffer.from(raw);
  const { width: W, height: H, channels: ch } = info;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const i = idx * ch;
      if (out[i + 3] === 0) continue;
      const r = out[i], g = out[i + 1], b = out[i + 2];
      const [h, s, l] = rgbToHsl(r, g, b);
      const l2 = Math.min(lCeil, Math.max(lFloor, l * lScale));
      const s2 = Math.min(sCeil, s * sScale);
      const [dr, dg, db] = hslToRgb(h, s2, l2);
      const edgeProtect = Math.min(1, mag[idx] / edgeThreshold);
      const satProtectF = s > satProtect ? Math.min(1, (s - satProtect) / (1 - satProtect)) : 0;
      const protect = Math.max(edgeProtect, satProtectF);
      out[i] = Math.round(r * protect + dr * (1 - protect));
      out[i + 1] = Math.round(g * protect + dg * (1 - protect));
      out[i + 2] = Math.round(b * protect + db * (1 - protect));
    }
  }
  return out;
}

export function extForFile(file) {
  return file.toLowerCase().endsWith(".jpg") || file.toLowerCase().endsWith(".jpeg") ? "jpeg" : "png";
}
