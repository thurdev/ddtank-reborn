// Ícones redondos do hall (ddthallicon): arte + legenda dourada embaixo. Troca SÓ a legenda, mantendo a arte:
//   1. acha a faixa da legenda (linhas de baixo do ícone);
//   2. apaga a legenda VN: cada pixel da faixa vira o pixel da última linha acima da faixa (estende a borda da bola);
//      onde essa linha é transparente, vira transparente;
//   3. desenha o texto PT-BR no estilo do jogo (degradê creme→dourado, contorno marrom, borda clara) centrado na faixa.
// Uso: node tools/remaster/icon-caption.mjs [id ...]   (sem id = todos de tools/remaster/icon-captions.json)
//
// Como lê esse código (cada variável): CAP mapa id->legenda PT; W/H tamanho do ícone; last última linha opaca;
// bandH altura da faixa (~27% do ícone); y0 topo da faixa; src pixels do original; ref linha logo acima da faixa;
// size tamanho da fonte que cabe na faixa; sx aperto horizontal se a palavra for larga demais.
import sharp from "sharp";
import { readFileSync } from "node:fs";

const CAP = JSON.parse(readFileSync("tools/remaster/icon-captions.json", "utf8"));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CAP);
const DIR = "remaster/04-botoes-titulos";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function renderText(text, size, sx, W, H) {
  const WW = W * 6, HH = H * 3;
  const lines = text.split(/\n/), lh = size * 0.98;
  const t = (extra) => lines.map((ln, i) => `<text x="${WW / 2}" y="${HH / 2 + (i - (lines.length - 1) / 2) * lh}" text-anchor="middle" dominant-baseline="central" font-family="Arial Black" font-size="${size}" ${extra}>${esc(ln)}</text>`).join("");
  const sw = Math.max(1.6, size * 0.16), rw = Math.max(0.8, size * 0.07);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WW}" height="${HH}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.15" stop-color="#fff3c8"/><stop offset="0.9" stop-color="#f3a73a"/></linearGradient></defs>
  <g transform="translate(${WW / 2} 0) scale(${sx} 1) translate(${-WW / 2} 0)">
  ${t(`fill="#fff6e0" stroke="#fff6e0" stroke-width="${(sw + rw) * 2}" stroke-linejoin="round"`)}
  ${t(`fill="#4a2a00" stroke="#4a2a00" stroke-width="${sw * 2}" stroke-linejoin="round"`)}
  ${t(`fill="url(#g)"`)}</g></svg>`;
  const r = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let a = WW, b = -1, c = HH, e = -1;
  for (let y = 0; y < HH; y++) for (let x = 0; x < WW; x++) if (r.data[(y * WW + x) * 4 + 3] > 60) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); e = Math.max(e, y); }
  return { r, box: { a, b, c, e, w: b - a + 1, h: e - c + 1 }, WW, HH };
}

for (const id of ids) {
  const spec = typeof CAP[id] === "string" ? { t: CAP[id] } : CAP[id];
  if (!spec?.t) { console.log("sem legenda:", id); continue; }
  const pt = spec.t, nLines = pt.split(/\n/).length;
  const inp = `${DIR}/inputs/${id}.png`;
  const { data: src, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  let last = -1;
  for (let y = H - 1; y >= 0 && last < 0; y--) for (let x = 0; x < W; x++) if (src[(y * W + x) * 4 + 3] > 40) { last = y; break; }
  const bandH = Math.max(10, Math.round(H * (nLines > 1 ? 0.44 : 0.27)));
  const y0 = Math.max(1, last - bandH + 1);
  const out = Buffer.from(src);
  // círculo da bola: topo opaco + linha mais larga (acima da faixa) => centro/raio
  let yt = -1, maxW = 0;
  for (let y = 0; y < y0; y++) { let a = W, b = -1; for (let x = 0; x < W; x++) if (src[(y * W + x) * 4 + 3] > 120) { a = Math.min(a, x); b = Math.max(b, x); } if (b >= a) { if (yt < 0) yt = y; maxW = Math.max(maxW, b - a + 1); } }
  const rad = maxW / 2, cxB = W / 2, cyB = yt + rad;
  // apaga a legenda VN: dentro da bola estende a linha logo acima da faixa; fora da bola fica transparente
  const ref = y0 - 1;
  for (let y = y0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, r = (ref * W + x) * 4;
    const inside = spec.free ? src[r + 3] > 0 : (x + 0.5 - cxB) ** 2 + (y + 0.5 - cyB) ** 2 <= rad * rad;
    for (let k = 0; k < 4; k++) out[o + k] = inside ? src[r + k] : 0;
  }
  // maior fonte que cabe na faixa; aperta na horizontal se passar da largura
  let size = (bandH / nLines) * 1.05, t;
  for (; size > 6; size -= 0.5) { t = await renderText(pt, size, 1, W, H); if (t.box.h <= bandH + 1 && t.box.w * 0.56 <= W - 1) break; }
  const sx = Math.min(1, (W - 1) / t.box.w);
  if (sx < 1) t = await renderText(pt, size, sx, W, H);
  const left = Math.round(t.box.a + t.box.w / 2 - W / 2), top = t.box.c - (y0 + Math.max(0, Math.floor((bandH - t.box.h) / 2)));
  const crop = await sharp(t.r.data, { raw: { width: t.WW, height: t.HH, channels: 4 } })
    .extract({ left: Math.max(0, left), top: Math.max(0, top), width: W, height: H }).png().toBuffer();
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).composite([{ input: crop, left: 0, top: 0 }]).png().toFile(`${DIR}/outputs/${id}.png`);
  console.log(id, `${W}x${H}`, "faixa", y0, "fonte", size, "aperto", sx.toFixed(2));
}
