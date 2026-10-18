// title-text-ml.mjs — variante multilinha do title-text.mjs (mesmo motor: degrade creme->dourado,
// contorno marrom, borda clara, caixa transparente) pra textos que ocupavam 2-3 linhas no original
// (instrucoes do gameover, prompts de clique). Nao mexe no title-text.mjs original (usado por outras
// categorias ja aprovadas) -- `\n` no --text separa as linhas; cada linha e ajustada e depois o bloco
// inteiro e centralizado verticalmente na caixa opaca do original.
//   node tools/remaster/title-text-ml.mjs --manifest remaster/manifest-6600.csv <id> "linha1\nlinha2"
import sharp from "sharp";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const manifestPath = opt("--manifest", "remaster/manifest.csv");
const positional = args.filter((a, i) => !a.startsWith("--") && (i === 0 || !args[i - 1].startsWith("--")));
const id = positional[0], pt = positional[1].replace(/\\n/g, "\n");
const manifest = readFileSync(manifestPath, "utf8").trim().split("\n").slice(1).map((l) => { const [category, file] = l.split(","); return { category, file }; });
const m = manifest.find((x) => x.file.replace(/\.(png|jpe?g)$/i, "") === id);
if (!m) throw new Error("no manifest row " + id);
const inp = `remaster/${m.category}/inputs/${m.file}`;
const out = opt("--out", `remaster/${m.category}/outputs/${id}.png`);
const font = opt("--font", "Arial Black"), top = opt("--top", "#fff3c8"), bottom = opt("--bottom", "#f3a73a");
const stroke = opt("--stroke", "#5b3e00"), sw = Number(opt("--sw", 2.5)), rim = opt("--rim", "#ffffff"), rw = Number(opt("--rw", 1.5));

const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
let x0 = W, x1 = -1, y0 = H, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 100) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
const bh = y1 - y0 + 1, cy = y0 + bh / 2;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const lines = pt.split("\n");
const nLines = lines.length;
const WW = W * 6, HH = H * 3;
const lhFactor = 1.02;

const render = (size, sx, offsetX) => {
  const pad = sw + rw;
  const lh = size * lhFactor;
  const y0t = HH / 2 - ((nLines - 1) / 2) * lh;
  const t = (extra) => lines.map((ln, i) => `<text x="0" y="${y0t + i * lh}" text-anchor="start" dominant-baseline="central" font-family="${font}" font-size="${size}" ${extra}>${esc(ln)}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WW}" height="${HH}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.15" stop-color="${top}"/><stop offset="0.9" stop-color="${bottom}"/></linearGradient></defs>
  <g transform="translate(${offsetX} 0) scale(${sx} 1)">
  ${t(`fill="${rim}" stroke="${rim}" stroke-width="${pad * 2}" stroke-linejoin="round"`)}
  ${t(`fill="${stroke}" stroke="${stroke}" stroke-width="${sw * 2}" stroke-linejoin="round"`)}
  ${t(`fill="url(#g)"`)}</g></svg>`;
  return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
};
const bbox = ({ data: d, info: i }) => { let a = i.width, b = -1, c = i.height, e = -1; for (let y = 0; y < i.height; y++) for (let x = 0; x < i.width; x++) if (d[(y * i.width + x) * 4 + 3] > 100) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); e = Math.max(e, y); } return { a, b, c, e }; };

// altura total do bloco de N linhas tem que caber em H: encolhe ate caber.
let size = Number(opt("--size", Math.round((H / nLines) * 0.62 * 2) / 2)), r, bb;
for (; size > 4; size -= 0.5) {
  const lh = size * lhFactor;
  const blockH = lh * nLines + (sw + rw) * 2;
  if (blockH <= H) break;
}
r = await render(size, 1, 0); bb = bbox(r);
const unscaledW = bb.b - bb.a + 1, unscaledCx = (bb.a + bb.b + 1) / 2;
const sx = Math.min(1, (W - 2) / unscaledW);
const offsetX = WW / 2 - sx * unscaledCx;
r = await render(size, sx, offsetX); bb = bbox(r);
const top0 = Math.max(0, Math.min(HH - H, Math.round((bb.c + bb.e + 1) / 2 - cy)));
const cropTop = Math.min(bb.c - 1, Math.max(bb.e + 2 - H, top0));
const left = Math.round((WW - W) / 2);
const crop = await sharp(r.data, { raw: { width: WW, height: HH, channels: 4 } }).extract({ left, top: cropTop, width: W, height: H }).png().toBuffer();
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: crop, left: 0, top: 0 }]).png().toFile(out);
console.log(id, `${W}x${H}`, "lines", nLines, "size", size, "squeeze", sx.toFixed(2), "->", out);
