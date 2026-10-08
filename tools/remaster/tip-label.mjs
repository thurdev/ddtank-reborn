// Item-tooltip stat labels (asset.core.tip.GoodsTipItem*): white bold text with a black outline on transparency, plus a
// 1 px fading underline on the last row that starts where the text ends. The AI inverts the colours and drops the line,
// so these are rendered directly: text at the original's size, then the original underline pixels re-attached after
// the new text end (stretched/clipped to the original line end).
//   node tools/remaster/tip-label.mjs <id> "<pt, \n for 2 lines>" [--size N]
import sharp from "sharp";
import { readFileSync } from "node:fs";

const [id, ptRaw, ...rest] = process.argv.slice(2);
const pt = ptRaw.replace(/\\n/g, "\n");
const opt = (n) => { const i = rest.indexOf(n); return i < 0 ? null : rest[i + 1]; };
const man = readFileSync("remaster/manifest.csv", "utf8").trim().split("\n").slice(1).map((l) => { const [c, f] = l.split(","); return { c, f }; });
const m = man.find((x) => x.f.replace(/\.(png|jpe?g)$/i, "") === id);
const inp = `remaster/${m.c}/inputs/${m.f}`, out = `remaster/${m.c}/outputs/${id}.png`;
const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const rowEnd = (y) => { let e = -1; for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 10) e = x; return e; };
// underline row = the row reaching furthest right (descenders may sit below it)
let ly = 0; for (let y = 0; y < H; y++) if (rowEnd(y) > rowEnd(ly)) ly = y;
let lx0 = W, lx1 = -1;
let textEnd = -1; for (let y = 0; y < H; y++) if (y !== ly) textEnd = Math.max(textEnd, rowEnd(y));
for (let x = textEnd + 1; x < W; x++) if (data[(ly * W + x) * 4 + 3] > 10) { lx0 = Math.min(lx0, x); lx1 = x; }
const line = []; for (let x = lx0; x <= lx1; x++) line.push(data.slice((ly * W + x) * 4, (ly * W + x) * 4 + 4));
// text block height (rows above the line that hold text)
let t0 = H, t1 = -1; for (let y = 0; y < H; y++) if (y !== ly && rowEnd(y) >= 0) { t0 = Math.min(t0, y); t1 = y; }
const lines = pt.split("\n");
const size = Number(opt("--size") ?? Math.round(((t1 - t0 + 1) / lines.length) * 0.82 * 2) / 2);
const pitch = (t1 - t0 + 1) / lines.length;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${lines.map((l, i) =>
  `<text x="1.5" y="${(t0 + i * pitch + pitch * 0.8).toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${size}" fill="#ffffff" stroke="#000000" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke">${esc(l)}</text>`).join("")}</svg>`;
const txt = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
// new text end on the last text line (where the underline attaches)
let ne = -1; for (let y = Math.floor(t0 + (lines.length - 1) * pitch); y < H; y++) if (y !== ly) for (let x = 0; x < W; x++) if (txt[(y * W + x) * 4 + 3] > 40) ne = Math.max(ne, x);
const startX = ne + 1;
if (line.length && startX < lx1) {
  const n = lx1 - startX + 1;
  for (let k = 0; k < n; k++) { const src = line[Math.min(line.length - 1, Math.floor((k / n) * line.length))]; const d = (ly * W + startX + k) * 4; for (let c = 0; c < 4; c++) txt[d + c] = src[c]; }
}
await sharp(txt, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);
console.log(id, `${W}x${H}`, "size", size, "text rows", t0, t1, "line", lx0, lx1, "-> starts", startX);
