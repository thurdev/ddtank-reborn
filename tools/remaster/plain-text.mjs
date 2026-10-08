// Plain tooltip text on a transparent canvas (no art behind it): re-render the PT-BR text from scratch instead of asking
// the AI (which drops accents and invents typos). Measures the original's text colour, left margin, line pitch and
// x-height, then draws Arial at the matching size into a canvas of the same dimensions.
//   node tools/remaster/plain-text.mjs <id> "<pt with \n>" [--bold] [--size N] [--out file]
import sharp from "sharp";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const id = args[0], pt = args[1].replace(/\\n/g, "\n");
const flag = (n) => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const manifest = readFileSync("remaster/manifest.csv", "utf8").trim().split("\n").slice(1).map((l) => { const [category, file] = l.split(","); return { category, file }; });
const m = manifest.find((x) => x.file.replace(/\.(png|jpe?g)$/i, "") === id);
if (!m) throw new Error("no manifest row " + id);
const inp = `remaster/${m.category}/inputs/${m.file}`;
const out = flag("--out") ?? `remaster/${m.category}/outputs/${id}.png`;

const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
// text pixels = strongly opaque; colour = alpha-weighted mean of them
let maxA = 0;
for (let i = 3; i < data.length; i += 4) maxA = Math.max(maxA, data[i]);
const thr = Math.min(160, maxA * 0.6); // translucent labels (grey on the battle result) never reach 160
let r = 0, g = 0, b = 0, n = 0, x0 = W;
const rowHas = new Array(H).fill(0);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4;
  if (data[i + 3] > thr) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; rowHas[y]++; if (x < x0) x0 = x; }
}
const hex = (v) => Math.round(v / n).toString(16).padStart(2, "0");
const color = flag("--color") ?? `#${hex(r)}${hex(g)}${hex(b)}`;
const bands = [];
for (let y = 0, s = -1; y <= H; y++) { const on = y < H && rowHas[y] > 0; if (on && s < 0) s = y; if (!on && s >= 0) { bands.push([s, y - 1]); s = -1; } }
// merge accent/descender fragments: keep bands taller than 3px as line cores
const cores = bands.filter(([a, c]) => c - a >= 3);
const pitch = cores.length > 1 ? (cores[cores.length - 1][0] - cores[0][0]) / (cores.length - 1) : (cores[0][1] - cores[0][0]) * 1.5;
const size = Number(flag("--size") ?? Math.round(pitch / 1.3 * 2) / 2);
const top = cores[0]?.[0] ?? 2;
const bold = args.includes("--bold");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const lines = pt.split("\n");
const svgAt = (sz, w) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}">${lines.map((l, i) =>
  `<text x="${x0}" y="${(top + size * 0.72 + i * pitch).toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-size="${sz}" font-weight="${bold ? "bold" : "normal"}" fill="${color}" fill-opacity="${(maxA / 255).toFixed(2)}">${esc(l)}</text>`).join("")}</svg>`;
// shrink until the widest line fits the canvas (PT is often longer than the VN label)
let sz = size;
for (; sz > 6; sz -= 0.5) {
  const { data: d, info: inf } = await sharp(Buffer.from(svgAt(sz, W * 3))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let right = -1;
  for (let y = 0; y < inf.height; y++) for (let x = inf.width - 1; x > right; x--) if (d[(y * inf.width + x) * 4 + 3] > 20) { right = x; break; }
  if (right <= W - 2) break;
}
await sharp(Buffer.from(svgAt(sz, W))).png().toFile(out);
console.log(id, `${W}x${H}`, "color", color, "size", size, "pitch", pitch.toFixed(1), "left", x0, "top", top, "->", out);
