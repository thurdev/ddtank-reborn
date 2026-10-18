#!/usr/bin/env node
// export-6600-images.mjs — exporta TODAS as imagens dos SWFs de UI do pack DDT-6600 (m1-bitmap-text, passo 1).
// Mesma lista de arquivos do tools/qa/swf-text-audit-6600.sh (overlay apps/api/assets/flash6600 tem
// prioridade sobre o vendor, pra pegar qualquer patch já aplicado por brand-6600.mjs/swf-text-6600):
//   vendor/DDT-6600/WebSimple/Flash_6600_v040/*.swf (raiz do pack, 7 arquivos)
//   vendor/DDT-6600/WebSimple/Flash_6600_v040/ui/turkey/swf/*.swf (174 arquivos)
// Saída: remaster/_6600/inputs/<swf>/<chid>[_<label>].png (gitignored, grande/regenerável) +
//        research/6600/bitmap-export-summary.json (swf, imageCount, error).
//
// Uso: node tools/remaster/export-6600-images.mjs [--only <swf1,swf2,...>]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const VENDOR = join(ROOT, "vendor", "DDT-6600", "WebSimple", "Flash_6600_v040");
const OVERLAY = join(ROOT, "apps", "api", "assets", "flash6600");
const OUT = join(ROOT, "remaster", "_6600", "inputs");
const FFDEC_JAR = join(ROOT, "vendor", "_tools", "ffdec", "ffdec-cli.jar");
const SUMMARY = join(ROOT, "research", "6600", "bitmap-export-summary.json");

const argv = process.argv.slice(2);
const onlyIdx = argv.indexOf("--only");
const only = onlyIdx >= 0 ? new Set(argv[onlyIdx + 1].split(",")) : null;

function listSwfs() {
  const names = [];
  for (const f of readdirSync(VENDOR)) if (f.toLowerCase().endsWith(".swf")) names.push(f);
  const turkeyDir = join(VENDOR, "ui", "turkey", "swf");
  for (const f of readdirSync(turkeyDir)) if (f.toLowerCase().endsWith(".swf")) names.push(join("ui", "turkey", "swf", f));
  return names;
}

function resolve(rel) {
  const overlayPath = join(OVERLAY, rel);
  return existsSync(overlayPath) ? overlayPath : join(VENDOR, rel);
}

function exportOne(rel) {
  const label = rel.replace(/[\\/]/g, "__");
  const dir = join(OUT, label);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const src = resolve(rel);
  try {
    execFileSync("java", ["-jar", FFDEC_JAR, "-export", "image", dir, src], { stdio: "pipe", encoding: "utf8", timeout: 120000 });
  } catch (e) {
    return { rel, label, error: (e.stderr || e.message || String(e)).toString().slice(0, 500), imageCount: existsSync(dir) ? readdirSync(dir).length : 0 };
  }
  const files = existsSync(dir) ? readdirSync(dir) : [];
  return { rel, label, imageCount: files.length, error: null };
}

const all = listSwfs();
const todo = only ? all.filter((r) => only.has(r.split(/[\\/]/).pop())) : all;
mkdirSync(OUT, { recursive: true });
mkdirSync(dirname(SUMMARY), { recursive: true });
const results = [];
let done = 0;
for (const rel of todo) {
  const r = exportOne(rel);
  results.push(r);
  done++;
  console.log(`[${done}/${todo.length}] ${rel} -> ${r.imageCount} imagens${r.error ? " ERROR: " + r.error.split("\n")[0] : ""}`);
}
writeFileSync(SUMMARY, JSON.stringify({ total: results.length, totalImages: results.reduce((s, r) => s + r.imageCount, 0), errors: results.filter((r) => r.error).length, results }, null, 2));
console.log(`\nTotal: ${results.length} swfs, ${results.reduce((s, r) => s + r.imageCount, 0)} imagens, ${results.filter((r) => r.error).length} erros.`);
console.log(`Resumo: ${SUMMARY}`);
