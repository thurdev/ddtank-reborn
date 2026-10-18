// badge-text.mjs — plaquinhas/botões sólidos (pill/badge) com texto turco cozido em cima de um fundo
// opaco (não transparente) tipo ui/turkey/swf/dayactivity.swf: detecta a cor de fundo pelas bordas/cantos,
// apaga só os pixels de texto (diferentes do fundo) preenchendo com a cor de fundo, e desenha o PT-BR por
// cima no mesmo estilo (degrade creme->dourado, contorno marrom, borda clara) — mesmo motor de
// title-text.mjs, mas confinado à caixa do próprio texto detectado (não precisa de manifest).
// Uso: node tools/remaster/badge-text.mjs --in <png> --out <png> --text "PT" [opções de cor/traço]
import sharp from "sharp";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const inp = opt("--in"), out = opt("--out"), pt = opt("--text");
const font = opt("--font", "Arial Black"), top = opt("--top", "#fff3c8"), bottom = opt("--bottom", "#f3a73a");
const stroke = opt("--stroke", "#5b3e00"), sw = Number(opt("--sw", 2.5)), rim = opt("--rim", "#ffffff"), rw = Number(opt("--rw", 1.4));
const thresh = Number(opt("--thresh", 40)); // distancia de cor p/ considerar "texto" (difere do fundo)

const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const px = (x, y) => { const o = (y * W + x) * 4; return [data[o], data[o + 1], data[o + 2], data[o + 3]]; };

// cor de fundo: moda entre os pixels opacos (fundo solido = 1 cor exata repetida muito; texto tem
// degrade/contorno espalhados por varias cores -- a moda ganha mesmo sem ser maioria de area).
const freq = new Map();
for (let i = 0; i < W * H; i++) {
  const a = data[i * 4 + 3];
  if (a < 200) continue;
  const key = (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2];
  freq.set(key, (freq.get(key) || 0) + 1);
}
if (!freq.size) throw new Error("imagem sem pixel opaco");
let bestKey = -1, bestCount = -1;
for (const [k, c] of freq) if (c > bestCount) { bestCount = c; bestKey = k; }
const bg = [(bestKey >> 16) & 255, (bestKey >> 8) & 255, bestKey & 255];

// mascara: pixel difere do fundo (texto) -> apaga pro fundo; senao mantem (fundo/decoracao preservados)
const out1 = Buffer.from(data);
let tx0 = W, tx1 = -1, ty0 = H, ty1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const o = (y * W + x) * 4;
  const a = data[o + 3];
  if (a < 10) continue;
  const dr = data[o] - bg[0], dg = data[o + 1] - bg[1], db = data[o + 2] - bg[2];
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
  if (dist > thresh) {
    out1[o] = bg[0]; out1[o + 1] = bg[1]; out1[o + 2] = bg[2]; out1[o + 3] = 255;
    tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, x); ty0 = Math.min(ty0, y); ty1 = Math.max(ty1, y);
  }
}
if (tx1 < 0) throw new Error("nenhum pixel de texto detectado -- ajuste --thresh");
const boxW = tx1 - tx0 + 1, boxH = ty1 - ty0 + 1, cx = tx0 + boxW / 2, cy = ty0 + boxH / 2;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const WW = boxW * 6;
const render = (size, sx = 1, offsetX = WW / 2) => {
  const pad = sw + rw;
  const t = (extra) => `<text x="0" y="${boxH * 1.5}" text-anchor="start" dominant-baseline="central" font-family="${font}" font-size="${size}" ${extra}>${esc(pt)}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WW}" height="${boxH * 3}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.15" stop-color="${top}"/><stop offset="0.9" stop-color="${bottom}"/></linearGradient></defs>
  <g transform="translate(${offsetX} 0) scale(${sx} 1)">
  ${t(`fill="${rim}" stroke="${rim}" stroke-width="${pad * 2}" stroke-linejoin="round"`)}
  ${t(`fill="${stroke}" stroke="${stroke}" stroke-width="${sw * 2}" stroke-linejoin="round"`)}
  ${t(`fill="url(#g)"`)}</g></svg>`;
  return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
};
const bbox = ({ data: d, info: i }) => { let a = i.width, b = -1, c = i.height, e = -1; for (let y = 0; y < i.height; y++) for (let x = 0; x < i.width; x++) if (d[(y * i.width + x) * 4 + 3] > 100) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); e = Math.max(e, y); } return { a, b, c, e }; };

let size = Number(opt("--size", Math.round(boxH * 0.62 * 2) / 2)), r, bb;
for (; size > 5; size -= 0.5) { r = await render(size, 1, 0); bb = bbox(r); if (bb.e - bb.c + 1 <= boxH) break; }
const unscaledW = bb.b - bb.a + 1, unscaledCx = (bb.a + bb.b + 1) / 2;
const sx = Math.min(1, (boxW - 1) / unscaledW);
const offsetX = WW / 2 - sx * unscaledCx;
r = await render(size, sx, offsetX); bb = bbox(r);
const top0 = Math.max(0, Math.min(boxH * 3 - boxH, Math.round((bb.c + bb.e + 1) / 2 - boxH / 2)));
const cropTop = Math.min(bb.c - 1, Math.max(bb.e + 2 - boxH, top0));
const left = Math.round((WW - boxW) / 2);
const textCrop = await sharp(r.data, { raw: { width: WW, height: boxH * 3, channels: 4 } }).extract({ left, top: cropTop, width: boxW, height: boxH }).png().toBuffer();

await sharp(out1, { raw: { width: W, height: H, channels: 4 } }).png()
  .composite([{ input: textCrop, left: tx0, top: ty0 }])
  .toFile(out);
console.log(`${inp} ${W}x${H} bg=rgb(${bg}) textbox ${boxW}x${boxH}@(${tx0},${ty0}) size=${size} squeeze=${sx.toFixed(2)} -> ${out}`);
