// Remaster HD do lobby (hall.swf): troca o fundo inteiro (hall__12.jpg, 1000x600) pela versão repintada em HD e
// recorta de novo cada peça de prédio (recorte .jpg com brilho de hover e recorte .png com transparência) a partir
// do fundo novo, no MESMO lugar — assim área clicável, hover e posição continuam batendo com o cliente Flash.
//   peça nova = fundo novo no mesmo lugar + (peça original − fundo original)   → mantém o brilho amarelo do hover
//   o canal alfa da peça .png é o mesmo do original.
// Uso: node tools/remaster/hd-hall.mjs <fundo-hd.png>       (roda de dentro de tools/remaster ou da raiz)
// Saídas: remaster/02-lobby-hall/outputs/<id>.png + relatório research/i18n/hd-hall-pieces.tsv
// Como lê esse código (cada variável): IN/OUT pastas; bg/nbg fundo original/novo (RGBA 1000x600); piece peça
// original; best melhor posição (x,y) e erro médio; add diferença peça−fundo (o brilho); small versões 1/4 pra
// busca rápida.
import sharp from "sharp";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = existsSync("remaster") ? "." : "../..";
const IN = join(ROOT, "remaster/02-lobby-hall/inputs"), OUT = join(ROOT, "remaster/02-lobby-hall/outputs");
const hdPath = process.argv[2];
const W = 1000, H = 600;
const raw = async (p, w, h) => {
  let s = sharp(p).ensureAlpha();
  if (w) s = s.resize(w, h, { fit: "fill" });
  const { data, info } = await s.raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height };
};
const bg = await raw(join(IN, "hall__12.jpg"));
const nbg = await raw(hdPath, W, H);
await sharp(nbg.d, { raw: { width: W, height: H, channels: 4 } }).removeAlpha().png().toFile(join(OUT, "hall__12.png"));
const lum = (img) => { const o = new Float32Array(img.w * img.h); for (let i = 0; i < o.length; i++) o[i] = img.d[i * 4] * 0.3 + img.d[i * 4 + 1] * 0.59 + img.d[i * 4 + 2] * 0.11; return o; };

// busca a posição da peça no fundo original: erro médio (só pixels opacos) em escala 1/4, depois refina em 1:1
async function locate(piece, file) {
  const S = 4;
  const sb = await raw(join(IN, "hall__12.jpg"), W / S, H / S), sp = await raw(join(IN, file), Math.max(1, Math.round(piece.w / S)), Math.max(1, Math.round(piece.h / S)));
  const lb = lum(sb), lp = lum(sp);
  let best = { x: 0, y: 0, e: 1e9 };
  for (let y = 0; y + sp.h <= sb.h; y++) for (let x = 0; x + sp.w <= sb.w; x++) {
    let e = 0, n = 0;
    for (let j = 0; j < sp.h; j += 1) for (let i = 0; i < sp.w; i += 1) { if (sp.d[(j * sp.w + i) * 4 + 3] < 250) continue; e += Math.abs(lb[(y + j) * sb.w + x + i] - lp[j * sp.w + i]); n++; }
    if (n && e / n < best.e) best = { x, y, e: e / n };
  }
  const lB = lum(bg), lP = lum(piece);
  if (best.e > 30) { // busca grossa falhou: varre tudo em 1:1 (passo 2), só pixels bem opacos
    let g = { x: 0, y: 0, e: 1e9 };
    for (let y = 0; y + piece.h <= H; y += 2) for (let x = 0; x + piece.w <= W; x += 2) {
      let e = 0, n = 0;
      for (let j = 0; j < piece.h; j += 4) for (let i = 0; i < piece.w; i += 4) { if (piece.d[(j * piece.w + i) * 4 + 3] < 254) continue; e += Math.abs(lB[(y + j) * W + x + i] - lP[j * piece.w + i]); n++; if (e / Math.max(1, n) > g.e * 1.5 && n > 40) break; }
      if (n > 40 && e / n < g.e) g = { x, y, e: e / n };
    }
    best = { x: Math.round(g.x / S), y: Math.round(g.y / S), e: g.e };
  }
  let fine = { x: best.x * S, y: best.y * S, e: 1e9 };
  for (let y = Math.max(0, best.y * S - 2 * S); y <= Math.min(H - piece.h, best.y * S + 2 * S); y++) for (let x = Math.max(0, best.x * S - 2 * S); x <= Math.min(W - piece.w, best.x * S + 2 * S); x++) {
    let e = 0, n = 0;
    for (let j = 0; j < piece.h; j += 1) for (let i = 0; i < piece.w; i += 1) { if (piece.d[(j * piece.w + i) * 4 + 3] < 250) continue; e += Math.abs(lB[(y + j) * W + x + i] - lP[j * piece.w + i]); n++; }
    if (n && e / n < fine.e) fine = { x, y, e: e / n };
  }
  return fine;
}

const rows = ["id\tx\ty\terro\tusado"];
for (const f of readdirSync(IN).filter((f) => f.startsWith("hall__") && f !== "hall__12.jpg")) {
  const piece = await raw(join(IN, f));
  if (piece.w < 100 || piece.h < 100 || f === "hall__141.png" || f === "hall__168.png" || piece.w > W || piece.h > H) continue;
  const at = await locate(piece, f);
  const used = at.e < 50; // peça que não é recorte do fundo (ex.: NPC, bolha de dica) fica de fora
  rows.push(`${f}\t${at.x}\t${at.y}\t${at.e.toFixed(1)}\t${used ? "sim" : "nao"}`);
  if (!used) continue;
  // brilho do hover = (peça − fundo) DESFOCADO: o brilho é suave, então sobrevive ao blur; detalhe da arte antiga
  // (que vazaria por desalinhamento de 1px) some. Guardado com +128 pra caber em 8 bits.
  const diff = Buffer.alloc(piece.w * piece.h * 3);
  for (let j = 0; j < piece.h; j++) for (let i = 0; i < piece.w; i++) {
    const o = (j * piece.w + i) * 4, b = ((at.y + j) * W + at.x + i) * 4, q = (j * piece.w + i) * 3;
    for (let k = 0; k < 3; k++) diff[q + k] = Math.max(0, Math.min(255, 128 + (piece.d[o + k] - bg.d[b + k])));
  }
  const glow = await sharp(diff, { raw: { width: piece.w, height: piece.h, channels: 3 } }).blur(3).raw().toBuffer();
  const out = Buffer.alloc(piece.w * piece.h * 4);
  for (let j = 0; j < piece.h; j++) for (let i = 0; i < piece.w; i++) {
    const o = (j * piece.w + i) * 4, b = ((at.y + j) * W + at.x + i) * 4, q = (j * piece.w + i) * 3;
    const edge = Math.min(1, Math.min(i, j, piece.w - 1 - i, piece.h - 1 - j) / 18); // some na borda: sem retângulo visível
    for (let k = 0; k < 3; k++) out[o + k] = Math.max(0, Math.min(255, nbg.d[b + k] + edge * 1.35 * Math.max(0, glow[q + k] - 128)));
    out[o + 3] = piece.d[o + 3];
  }
  await sharp(out, { raw: { width: piece.w, height: piece.h, channels: 4 } }).png().toFile(join(OUT, f.replace(/\.(png|jpe?g)$/i, ".png")));
}
writeFileSync(join(ROOT, "research/i18n/hd-hall-pieces.tsv"), rows.join("\n") + "\n");
console.log(rows.join("\n"));
