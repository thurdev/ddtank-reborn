// Saída de IA gerada sobre fundo verde (#00ff00) → PNG com transparência no tamanho do original.
//   1. redimensiona pro tamanho do original (as proporções vêm do upload verde, que preserva o aspecto);
//   2. chroma key: quanto "mais verde que o resto" o pixel é, mais transparente fica (alfa recalculado — texto novo
//      sobre área transparente aparece, o que não dá copiando o alfa do original);
//   3. despill: tira o verde que vazou nos painéis translúcidos (C = (P − (1−a)·G) / a);
//   4. onde o original é 100% opaco, mantém opaco (evita furos em arte esverdeada de verdade).
// Uso: node tools/remaster/fit-green.mjs <ai.png> <original.png> <saida.png>
// Como lê esse código (cada variável): W/H tamanho final; px pixels da IA redimensionados; oa alfa do original;
// g "verdice" do pixel (G − max(R,B)); a alfa novo 0..1.
import sharp from "sharp";

const [aiPath, origPath, outPath] = process.argv.slice(2);
const om = await sharp(origPath).metadata();
const W = om.width, H = om.height;
const px = await sharp(aiPath).resize(W, H, { fit: "fill", kernel: "lanczos3" }).removeAlpha().raw().toBuffer();
const oa = await sharp(origPath).ensureAlpha().extractChannel(3).raw().toBuffer();
const out = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  let r = px[i * 3], gr = px[i * 3 + 1], b = px[i * 3 + 2];
  const g = gr - Math.max(r, b); // 255 = verde puro
  const keyA = Math.max(0, Math.min(1, 1 - (g - 40) / 150));
  const orig = oa[i] / 255;
  // painel/arte que já existia (alfa do original > 0): mantém o alfa original e "desmistura" o verde que vazou;
  // mas se a IA pintou verde forte ali (texto antigo apagado sobre área transparente) → vira transparente.
  let a = orig > 0 && g < 110 ? orig : keyA;
  if (a > 0 && a < 1) gr = (gr - (1 - a) * 255) / a; // despill só no canal verde
  if (a > 0) gr = Math.min(gr, Math.max(r, b) + 40);
  out[i * 4] = Math.max(0, Math.min(255, r)); out[i * 4 + 1] = Math.max(0, Math.min(255, gr)); out[i * 4 + 2] = Math.max(0, Math.min(255, b));
  out[i * 4 + 3] = Math.round(a * 255);
}
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(outPath);
console.log("ok", outPath);
