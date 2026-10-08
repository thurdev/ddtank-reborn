// Hall building titles (cream→gold gradient letters, thick dark-brown stroke, white outer rim, transparent canvas):
// render the PT-BR word directly instead of the AI, which misspells short words and clips descenders (g, j, ç).
// Fits the text into the original's opaque bounding box (same canvas size), centred like the original.
//   node tools/remaster/title-text.mjs <id> "<pt>" [--font "Arial Black"] [--top #fff3c8] [--bottom #f3a73a]
//        [--stroke #5b3e00] [--sw 4] [--rim #ffffff] [--rw 2.5] [--out file]
import sharp from "sharp";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const id = args[0], pt = args[1];
const opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const manifest = readFileSync("remaster/manifest.csv", "utf8").trim().split("\n").slice(1).map((l) => { const [category, file] = l.split(","); return { category, file }; });
const m = manifest.find((x) => x.file.replace(/\.(png|jpe?g)$/i, "") === id);
if (!m) throw new Error("no manifest row " + id);
const inp = `remaster/${m.category}/inputs/${m.file}`;
const out = opt("--out", `remaster/${m.category}/outputs/${id}.png`);
const font = opt("--font", "Arial Black"), top = opt("--top", "#fff3c8"), bottom = opt("--bottom", "#f3a73a");
const stroke = opt("--stroke", "#5b3e00"), sw = Number(opt("--sw", 4)), rim = opt("--rim", "#ffffff"), rw = Number(opt("--rw", 2.5));

const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
let x0 = W, x1 = -1, y0 = H, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 100) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
const bw = x1 - x0 + 1, bh = y1 - y0 + 1, cx = x0 + bw / 2, cy = y0 + bh / 2;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const render = (size, sx = 1) => {
  const pad = sw + rw;
  const t = (extra) => `<text x="${W / 2}" y="${H * 1.5}" text-anchor="middle" dominant-baseline="central" font-family="${font}" font-size="${size}" ${extra}>${esc(pt)}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H * 3}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.15" stop-color="${top}"/><stop offset="0.9" stop-color="${bottom}"/></linearGradient></defs>
  <g transform="translate(${W / 2} 0) scale(${sx} 1) translate(${-W / 2} 0)">
  ${t(`fill="${rim}" stroke="${rim}" stroke-width="${(pad) * 2}" stroke-linejoin="round"`)}
  ${t(`fill="${stroke}" stroke="${stroke}" stroke-width="${sw * 2}" stroke-linejoin="round"`)}
  ${t(`fill="url(#g)"`)}</g></svg>`;
  return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
};
const bbox = ({ data: d, info: i }) => { let a = i.width, b = -1, c = i.height, e = -1; for (let y = 0; y < i.height; y++) for (let x = 0; x < i.width; x++) if (d[(y * i.width + x) * 4 + 3] > 100) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); e = Math.max(e, y); } return { a, b, c, e }; };

// largest size whose rendered height fits the original box height; then squeeze horizontally if wider than the box
let size = Number(opt("--size", Math.round(H * 0.58 * 2) / 2)), r, bb;
for (; size > 6; size -= 0.5) { r = await render(size); bb = bbox(r); if (bb.e - bb.c + 1 <= H - 2 && bb.b - bb.a + 1 <= W - 2) break; }
const sx = Math.min(1, (W - 2) / (bb.b - bb.a + 1));
r = await render(size, sx); bb = bbox(r);
// text is centred horizontally; crop vertically so its box centre matches the original's
const top0 = Math.max(0, Math.min(H * 3 - H, Math.round((bb.c + bb.e + 1) / 2 - cy)));
const cropTop = Math.min(bb.c - 1, Math.max(bb.e + 2 - H, top0)); // keep the whole word inside the canvas
const crop = await sharp(r.data, { raw: { width: W, height: H * 3, channels: 4 } }).extract({ left: 0, top: cropTop, width: W, height: H }).png().toBuffer();
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: crop, left: 0, top: 0 }]).png().toFile(out);
console.log(id, `${W}x${H}`, "box", `${bw}x${bh}`, "size", size, "squeeze", sx.toFixed(2), "->", out);
