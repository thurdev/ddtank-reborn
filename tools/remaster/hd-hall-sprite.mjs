// Peça de hover que NÃO é recorte 1:1 do fundo (o cliente desenha o sprite reduzido, ex. Forja hall__224 em 0.65x):
// recorta a mesma região do fundo HD, amplia pro tamanho do sprite e troca só onde o sprite antigo bate com o fundo
// antigo (o prédio); onde não bate (o brilho amarelo do hover) mantém o pixel original.
// Uso: node hd-hall-sprite.mjs <id.png> <x> <y> <escala> <fundo-hd.png>
// Como lê esse código (cada variável): pc sprite original; ob/nb fundo antigo/novo na região, ampliados; d distância
// sprite↔fundo antigo; w peso do pixel novo (1 = é prédio).
import sharp from "sharp";
const [id, xs, ys, scs, hd] = process.argv.slice(2);
const I = "../../remaster/02-lobby-hall/inputs/", O = "../../remaster/02-lobby-hall/outputs/";
const x = +xs, y = +ys, sc = +scs;
const raw = async (s) => { const { data, info } = await s.ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { d: data, w: info.width, h: info.height }; };
const pc = await raw(sharp(I + id));
const rw = Math.round(pc.w * sc), rh = Math.round(pc.h * sc);
const ob = await raw(sharp(I + "hall__12.jpg").extract({ left: x, top: y, width: rw, height: rh }).resize(pc.w, pc.h, { kernel: "lanczos3" }));
const hd1000 = await sharp(hd).resize(1000, 600, { fit: "fill" }).png().toBuffer();
const nb = await raw(sharp(hd1000).extract({ left: x, top: y, width: rw, height: rh }).resize(pc.w, pc.h, { kernel: "lanczos3" }));
const out = Buffer.alloc(pc.w * pc.h * 4);
for (let i = 0; i < pc.w * pc.h; i++) {
  const o = i * 4;
  const d = Math.abs(pc.d[o] - ob.d[o]) + Math.abs(pc.d[o + 1] - ob.d[o + 1]) + Math.abs(pc.d[o + 2] - ob.d[o + 2]);
  const w = Math.max(0, Math.min(1, 1 - (d - 60) / 120));
  for (let k = 0; k < 3; k++) out[o + k] = Math.round(w * nb.d[o + k] + (1 - w) * pc.d[o + k]);
  out[o + 3] = pc.d[o + 3];
}
await sharp(out, { raw: { width: pc.w, height: pc.h, channels: 4 } }).png().toFile(O + id);
console.log("ok", id, rw, rh);
