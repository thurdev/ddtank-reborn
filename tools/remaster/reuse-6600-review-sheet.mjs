#!/usr/bin/env node
// reuse-6600-review-sheet.mjs — m1-bitmap-text passo 6: contact sheet antes/depois de uma amostra do reuso
// direto 4.1->6600 (remaster/approved-6600.json, já importado por build-client-art.mjs --only-approved-6600).
// "antes" = pixel original 6600 (remaster/_6600/inputs/<swf>/<sourceFile>, turco/caractere original);
// "depois" = reexportado do SWF overlay JÁ PATCHADO (apps/api/assets/flash6600/...), prova que o import
// realmente gravou o PT-BR aprovado da 4.1 dentro do SWF servido (não só que os bytes de origem existiam).
// Saída: research/6600/bitmap-reuse-review.jpg
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { readFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OVERLAY = join(ROOT, "apps", "api", "assets", "flash6600");
const FFDEC_JAR = join(ROOT, "vendor", "_tools", "ffdec", "ffdec-cli.jar");
const SCRATCH = join(ROOT, "node_modules", ".cache", "ddt-reuse-6600-review");

const entries = JSON.parse(readFileSync(join(ROOT, "remaster", "approved-6600.json"), "utf8"));
// amostra espalhada (1 a cada N) pra cobrir vários SWFs em vez de só os 54 do mesmo ddthallicon.swf
const N = Math.max(1, Math.floor(entries.length / 30));
const sample = entries.filter((_, i) => i % N === 0).slice(0, 30);

function exportChid(swfPath, sourceFile) {
  const dir = join(SCRATCH, "export", sourceFile.replace(/[^A-Za-z0-9._-]/g, "_"));
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  execFileSync("java", ["-jar", FFDEC_JAR, "-export", "image", dir, swfPath], { stdio: "pipe" });
  const stem = sourceFile.slice(0, sourceFile.lastIndexOf("."));
  const chid = stem.match(/^\d+/)?.[0];
  const files = existsSync(dir) ? readdirSync(dir) : [];
  const hit = files.find((f) => f === sourceFile || f.startsWith(`${chid}_`) || f.startsWith(`${chid}.`));
  return hit ? join(dir, hit) : null;
}

const H = 90, W = 640, rows = [];
const fit = async (p) => {
  if (!p || !existsSync(p)) return null;
  const m = await sharp(p).metadata();
  const s = Math.min(H / m.height, (W / 2 - 10) / m.width, 4);
  return sharp(p).resize(Math.max(1, Math.round(m.width * s)), Math.max(1, Math.round(m.height * s)), { kernel: "nearest" }).flatten({ background: "#808080" }).png().toBuffer();
};

console.log(`Amostra: ${sample.length} de ${entries.length} entradas`);
for (const e of sample) {
  const beforePath = join(ROOT, "remaster", "_6600", "inputs", e.swfPath.replace(/\\/g, "__"), e.sourceFile);
  const overlaySwf = join(OVERLAY, e.swfPath);
  const afterPath = existsSync(overlaySwf) ? exportChid(overlaySwf, e.sourceFile) : null;
  const before = await fit(beforePath);
  const after = await fit(afterPath);
  if (!before || !after) {
    console.log("SKIP (sem imagem)", e.swfPath, e.sourceFile);
    continue;
  }
  rows.push([before, after, `${e.swf}/${e.sourceFile}`]);
}

const label = (t, y) => ({
  input: Buffer.from(`<svg width="${W}" height="14"><text x="2" y="11" font-size="10" fill="#ff0">${t.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></svg>`),
  top: y,
  left: 0,
});
const comp = [];
rows.forEach(([a, b, id], i) => {
  const y = i * (H + 18);
  comp.push(label(`${i} ${id} (esquerda=original 6600 turco, direita=reusado da 4.1 PT-BR, dentro do SWF patcheado)`, y), { input: a, top: y + 16, left: 0 }, { input: b, top: y + 16, left: W / 2 });
});
const outPath = join(ROOT, "research", "6600", "bitmap-reuse-review.jpg");
await sharp({ create: { width: W, height: Math.max(1, rows.length * (H + 18)), channels: 3, background: "#202020" } })
  .composite(comp)
  .jpeg({ quality: 90 })
  .toFile(outPath);
console.log(`${rows.length} linhas -> ${outPath}`);
