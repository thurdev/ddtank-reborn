// Text finder for writing window block specs: rows of "ink" (pixels far from their local neighbourhood), split into
// groups by horizontal gaps. Prints [x0, y0, x1, y1] per group.
//   node tools/remaster/bands.mjs <image> [gap=14] [threshold=60]
import sharp from "sharp";

const [file, gapArg, tArg] = process.argv.slice(2);
const GAP = +(gapArg ?? 14), T = +(tArg ?? 60);
const { data: d, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const lum = (x, y) => { const i = (y * W + x) * 4, a = d[i + 3] / 255; return a * (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) + (1 - a) * 128; };
const ink = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 2; x < W - 2; x++) {
  const w = [lum(x - 2, y), lum(x + 2, y), lum(x, Math.max(0, y - 3)), lum(x, Math.min(H - 1, y + 3))].sort((p, q) => p - q);
  if (Math.abs(lum(x, y) - (w[1] + w[2]) / 2) > T) ink[y * W + x] = 1;
}
// row bands
const bands = [];
let cur = null;
for (let y = 0; y < H; y++) {
  let any = false;
  for (let x = 0; x < W; x++) if (ink[y * W + x]) { any = true; break; }
  if (any) { if (!cur) bands.push((cur = { y0: y, y1: y })); else cur.y1 = y; } else cur = null;
}
for (const b of bands) {
  if (b.y1 - b.y0 < 3) continue;
  const cols = [];
  for (let x = 0; x < W; x++) { let n = 0; for (let y = b.y0; y <= b.y1; y++) n += ink[y * W + x]; cols.push(n); }
  const groups = [];
  let g = null, gap = 0;
  for (let x = 0; x < W; x++) {
    if (cols[x]) { if (!g || gap > GAP) groups.push((g = { x0: x, x1: x })); else g.x1 = x; gap = 0; } else gap++;
  }
  console.log(`y ${b.y0}-${b.y1}:`, groups.map((q) => `[${q.x0},${b.y0},${q.x1},${b.y1}]`).join(" "));
}
