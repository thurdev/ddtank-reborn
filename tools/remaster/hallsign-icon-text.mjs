// hallsign-icon-text.mjs — placas do salao (ddthallmain.swf) que tem icone + texto na MESMA imagem
// (fundo transparente): recorta o icone (preserva intocado) e o texto (apaga + redesenha PT-BR com o
// motor do title-text.mjs, soh que confinado ao recorte), depois recompoe os dois lado a lado no canvas
// original. Uso fixo (3 placas da rodada 2); nao precisa de manifest.
import sharp from "sharp";

const ROWS = [
  { in: "remaster/07-placas-salao/inputs/ddthallmain__306.png", out: "remaster/07-placas-salao/outputs/ddthallmain__306.png", iconEndX: 34, text: "Clube da Sociedade" },
  { in: "remaster/07-placas-salao/inputs/ddthallmain__423.png", out: "remaster/07-placas-salao/outputs/ddthallmain__423.png", iconEndX: 36, text: "Forja" },
  { in: "remaster/07-placas-salao/inputs/ddthallmain__596.png", out: "remaster/07-placas-salao/outputs/ddthallmain__596.png", iconEndX: 34, text: "Casa de Leilões" },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const font = "Arial Black", top = "#fff3c8", bottom = "#f3a73a", stroke = "#5b3e00", sw = 2.2, rim = "#ffffff", rw = 1.3;

async function renderBox(pt, W, H) {
  const WW = W * 6;
  const render = (size, sx, offsetX) => {
    const pad = sw + rw;
    const t = (extra) => `<text x="0" y="${H * 1.5}" text-anchor="start" dominant-baseline="central" font-family="${font}" font-size="${size}" ${extra}>${esc(pt)}</text>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WW}" height="${H * 3}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.15" stop-color="${top}"/><stop offset="0.9" stop-color="${bottom}"/></linearGradient></defs>
    <g transform="translate(${offsetX} 0) scale(${sx} 1)">
    ${t(`fill="${rim}" stroke="${rim}" stroke-width="${pad * 2}" stroke-linejoin="round"`)}
    ${t(`fill="${stroke}" stroke="${stroke}" stroke-width="${sw * 2}" stroke-linejoin="round"`)}
    ${t(`fill="url(#g)"`)}</g></svg>`;
    return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  };
  const bbox = ({ data: d, info: i }) => { let a = i.width, b = -1, c = i.height, e = -1; for (let y = 0; y < i.height; y++) for (let x = 0; x < i.width; x++) if (d[(y * i.width + x) * 4 + 3] > 100) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); e = Math.max(e, y); } return { a, b, c, e }; };
  let size = Math.round(H * 0.58 * 2) / 2, r, bb;
  for (; size > 6; size -= 0.5) { r = await render(size, 1, 0); bb = bbox(r); if (bb.e - bb.c + 1 <= H - 2) break; }
  const unscaledW = bb.b - bb.a + 1, unscaledCx = (bb.a + bb.b + 1) / 2;
  const sx = Math.min(1, (W - 2) / unscaledW);
  const offsetX = WW / 2 - sx * unscaledCx;
  r = await render(size, sx, offsetX); bb = bbox(r);
  const cy = H / 2;
  const top0 = Math.max(0, Math.min(H * 3 - H, Math.round((bb.c + bb.e + 1) / 2 - cy)));
  const cropTop = Math.min(bb.c - 1, Math.max(bb.e + 2 - H, top0));
  const left = Math.round((WW - W) / 2);
  return sharp(r.data, { raw: { width: WW, height: H * 3, channels: 4 } }).extract({ left, top: cropTop, width: W, height: H }).png().toBuffer();
}

for (const row of ROWS) {
  const { data, info } = await sharp(row.in).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const iconCrop = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: 0, top: 0, width: row.iconEndX, height: H }).png().toBuffer();
  const textW = W - row.iconEndX;
  const textCrop = await renderBox(row.text, textW, H);
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: iconCrop, left: 0, top: 0 }, { input: textCrop, left: row.iconEndX, top: 0 }])
    .png().toFile(row.out);
  console.log(row.in, `${W}x${H}`, "icon 0-" + row.iconEndX, "text", row.text, "->", row.out);
}
