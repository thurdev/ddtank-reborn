// Ajusta uma saída de IA (Seedream 4.5 etc.) ao slot original do SWF:
//   1. corta a borda branca/uniforme que o modelo adiciona (trim) e, se o aspecto ainda difere do original,
//      recorta pelo centro até bater o aspecto;
//   2. redimensiona pro tamanho exato do original (lanczos);
//   3. copia o canal alfa do original (janelas com canto transparente continuam iguais).
// Uso: node tools/remaster/fit-ai.mjs <ai.png> <original.png> <saida.png>
// Como lê esse código (cada variável): ai imagem da IA; orig original; W/H tamanho final; t imagem após trim;
// ar/at aspecto do original/da IA; cw/ch recorte central; a alfa do original.
import sharp from "sharp";

const [aiPath, origPath, outPath] = process.argv.slice(2);
const om = await sharp(origPath).metadata();
const W = om.width, H = om.height;
let t = await sharp(aiPath).trim({ threshold: 18 }).png().toBuffer();
const tm = await sharp(t).metadata();
const ar = W / H, at = tm.width / tm.height;
let cw = tm.width, ch = tm.height;
if (at > ar * 1.01) cw = Math.round(tm.height * ar);
else if (at < ar / 1.01) ch = Math.round(tm.width / ar);
const left = Math.floor((tm.width - cw) / 2), top = Math.floor((tm.height - ch) / 2);
const rgb = await sharp(t).extract({ left, top, width: cw, height: ch }).resize(W, H, { fit: "fill", kernel: "lanczos3" }).removeAlpha().raw().toBuffer();
const a = await sharp(origPath).ensureAlpha().extractChannel(3).raw().toBuffer();
const out = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { out[i * 4] = rgb[i * 3]; out[i * 4 + 1] = rgb[i * 3 + 1]; out[i * 4 + 2] = rgb[i * 3 + 2]; out[i * 4 + 3] = a[i]; }
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(outPath);
console.log("ok", outPath, `${W}x${H}`, "trim", `${tm.width}x${tm.height}`, "crop", `${cw}x${ch}`);
