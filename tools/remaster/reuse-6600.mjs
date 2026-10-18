#!/usr/bin/env node
// reuse-6600.mjs — m1-bitmap-text passo 2: pra cada imagem exportada do pack 6600
// (remaster/_6600/inputs/<swf>/<chid>[_<label>].png, ver export-6600-images.mjs), acha a contraparte
// 4.1 por (a) nome de símbolo/classe AS3 igual (label depois do "<chid>_" no nome exportado pelo FFDec,
// ex. "asset.hall.battleLABS") cruzado com remaster/manifest.csv, depois (b) hash perceptual (dHash 8x8)
// contra os PNGs originais 4.1 em remaster/<cat>/inputs/ (mesmos pixels que a IA usou de referência) pra
// quem não tem nome de classe ou não bateu por nome.
// Saída: research/6600/bitmap-reuse.tsv (swf6600, image6600, w, h, matchType, cat41, file41(approved output
// se existir), swf41, sourceFile41, w41, h41, sameSize, note) + remaster/approved-6600.json (gerado só com
// os matches sameSize=yes que já têm output 4.1 aprovado -- pronto pra importar, ver build-client-art.mjs
// --only-approved-6600).
import sharp from "sharp";
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const IN6600 = join(ROOT, "remaster", "_6600", "inputs");
const CATS = ["00-site-pagina-jogar", "01-loading", "02-lobby-hall", "03-janelas", "04-botoes-titulos", "05-icones", "06-combate-outros"];

function parseCsvLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
    else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function loadManifest41() {
  const csvPath = join(ROOT, "remaster", "manifest.csv");
  const lines = readFileSync(csvPath, "utf8").split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = Object.fromEntries(header.map((h, idx) => [h, cols[idx]]));
    row.width = Number(row.width);
    row.height = Number(row.height);
    rows.push(row);
  }
  return rows;
}

function labelOf(filename) {
  // "7_asset.hall.battleLABS.png" -> "asset.hall.battleLABS"; "1.jpg" -> null (sem nome de classe)
  const stem = filename.slice(0, filename.lastIndexOf("."));
  const m = stem.match(/^\d+_(.+)$/);
  return m ? m[1] : null;
}

function loadApproved41() {
  const p = join(ROOT, "remaster", "approved.json");
  if (!existsSync(p)) return new Map();
  const entries = JSON.parse(readFileSync(p, "utf8"));
  const map = new Map();
  for (const e of entries) if (e.swf && e.sourceFile) map.set(`${e.swf}::${e.sourceFile}`, e);
  return map;
}

// dHash 8x8 (64 bits) -- robusto a pequenas diferenças de escala/compressão, rápido em lote.
async function dhash(path) {
  try {
    const { data } = await sharp(path).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    let bits = 0n;
    let i = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const left = data[y * 9 + x], right = data[y * 9 + x + 1];
        bits |= (left < right ? 1n : 0n) << BigInt(i);
        i++;
      }
    }
    return bits;
  } catch {
    return null;
  }
}

function hamming(a, b) {
  if (a == null || b == null) return 64;
  let x = a ^ b, c = 0;
  while (x) { c += Number(x & 1n); x >>= 1n; }
  return c;
}

async function main() {
  console.log("Carregando manifest.csv e approved.json (4.1)...");
  const manifest41 = loadManifest41();
  const approved41 = loadApproved41();

  // index por label (classe AS3) -> linhas do manifest 4.1
  const byLabel = new Map();
  for (const row of manifest41) {
    const label = labelOf(row.source_file);
    if (!label) continue;
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push(row);
  }
  console.log(`manifest.csv: ${manifest41.length} linhas, ${byLabel.size} labels de classe distintos`);

  // pré-hash de todas as imagens ORIGINAIS 4.1 (remaster/<cat>/inputs/<swfStem>__<sourceFile>), bucketed by
  // rounded aspect ratio (string "WxH" normalizado) pra não comparar contra tudo.
  console.log("Hasheando imagens originais 4.1 (remaster/<cat>/inputs)...");
  const hash41 = []; // { cat, swf, sourceFile, w, h, hash }
  for (const cat of CATS) {
    const dir = join(ROOT, "remaster", cat, "inputs");
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!/\.(png|jpe?g)$/i.test(f)) continue;
      const idx = f.indexOf("__");
      if (idx < 0) continue;
      const swf = f.slice(0, idx) + ".swf";
      const sourceFile = f.slice(idx + 2);
      const full = join(dir, f);
      let meta;
      try { meta = await sharp(full).metadata(); } catch { continue; }
      const h = await dhash(full);
      if (h == null) continue;
      hash41.push({ cat, swf, sourceFile, w: meta.width, h: meta.height, hash: h });
    }
  }
  console.log(`${hash41.length} imagens 4.1 hasheadas`);

  const swfDirs = existsSync(IN6600) ? readdirSync(IN6600) : [];
  console.log(`Processando ${swfDirs.length} diretorios de SWF 6600 exportados...`);

  const rows = [];
  let nSymbol = 0, nPhash = 0, nNone = 0;
  for (const swfDirName of swfDirs) {
    const swfRel = swfDirName.replace(/__/g, "\\");
    const dir = join(IN6600, swfDirName);
    const files = readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f));
    for (const f of files) {
      const full = join(dir, f);
      let meta;
      try { meta = await sharp(full).metadata(); } catch { continue; }
      const w = meta.width, h = meta.height;
      const label = labelOf(f);

      let matchType = "none", chosen = null, best41 = null;

      if (label && byLabel.has(label)) {
        const candidates = byLabel.get(label);
        // prefere candidato com output aprovado, depois tamanho igual
        candidates.sort((a, b) => {
          const aApp = approved41.has(`${a.source_swf}::${a.source_file}`) ? 1 : 0;
          const bApp = approved41.has(`${b.source_swf}::${b.source_file}`) ? 1 : 0;
          if (aApp !== bApp) return bApp - aApp;
          const aSame = a.width === w && a.height === h ? 1 : 0;
          const bSame = b.width === w && b.height === h ? 1 : 0;
          return bSame - aSame;
        });
        chosen = candidates[0];
        matchType = "symbol";
        nSymbol++;
      } else {
        // fallback: dHash contra o pool 4.1, restrito a proporção W/H parecida (+-15%) pra não gastar tempo
        const ratio = w / h;
        const hSelf = await dhash(full);
        let best = { dist: 65, row: null };
        for (const cand of hash41) {
          const candRatio = cand.w / cand.h;
          if (Math.abs(candRatio - ratio) / ratio > 0.15) continue;
          const d = hamming(hSelf, cand.hash);
          if (d < best.dist) best = { dist: d, row: cand };
        }
        if (best.row && best.dist <= 10) {
          matchType = "phash";
          best41 = best;
          nPhash++;
        } else {
          nNone++;
        }
      }

      let cat41 = "", file41 = "", swf41 = "", sourceFile41 = "", w41 = "", h41 = "", approvedFlag = "no", sameSize = "no", note = "";
      if (matchType === "symbol" && chosen) {
        swf41 = chosen.source_swf;
        sourceFile41 = chosen.source_file;
        w41 = chosen.width;
        h41 = chosen.height;
        const appKey = `${swf41}::${sourceFile41}`;
        if (approved41.has(appKey)) {
          const e = approved41.get(appKey);
          cat41 = e.category;
          file41 = e.file;
          approvedFlag = "yes";
        } else {
          cat41 = chosen.category;
        }
        sameSize = w41 === w && h41 === h ? "yes" : "no";
        if (sameSize === "no") note = `tamanho diferente (6600 ${w}x${h} vs 4.1 ${w41}x${h41})`;
      } else if (matchType === "phash" && best41) {
        swf41 = best41.row.swf;
        sourceFile41 = best41.row.sourceFile;
        w41 = best41.row.w;
        h41 = best41.row.h;
        cat41 = best41.row.cat;
        const appKey = `${swf41}::${sourceFile41}`;
        if (approved41.has(appKey)) {
          const e = approved41.get(appKey);
          file41 = e.file;
          approvedFlag = "yes";
        }
        sameSize = w41 === w && h41 === h ? "yes" : "no";
        note = `dHash dist=${best41.dist}`;
      } else {
        note = "sem correspondencia 4.1";
      }

      rows.push({ swf6600: swfRel, image6600: f, w, h, matchType, cat41, file41, swf41, sourceFile41, w41, h41, approved: approvedFlag, sameSize, note });
    }
  }

  const tsvPath = join(ROOT, "research", "6600", "bitmap-reuse.tsv");
  mkdirSync(dirname(tsvPath), { recursive: true });
  const header = ["swf6600", "image6600", "w", "h", "matchType", "cat41", "file41", "swf41", "sourceFile41", "w41", "h41", "approved", "sameSize", "note"];
  const lines = [header.join("\t")];
  for (const r of rows) lines.push(header.map((k) => String(r[k] ?? "").replace(/\t/g, " ")).join("\t"));
  writeFileSync(tsvPath, lines.join("\n") + "\n");
  console.log(`\n${tsvPath}: ${rows.length} linhas (symbol=${nSymbol}, phash=${nPhash}, none=${nNone})`);

  // approved-6600.json: só os matches por SÍMBOLO (nome de classe AS3 igual -- alta confiança) com output
  // 4.1 aprovado + mesmo tamanho -- prontos pra reuso direto e import imediato. phash fica só no TSV pra
  // revisão humana: na prática deu falso-positivo alto mesmo com dist<=10 (ícones genéricos com gradiente/
  // borda parecida, mas semântica diferente -- ex. "saleShopIcon" bateu com "defendDDTIslandIcon" só pela
  // moldura 70x70 igual), então não é seguro auto-importar por pixel sem olho humano confirmando o símbolo.
  const reuse = rows.filter((r) => r.matchType === "symbol" && r.approved === "yes" && r.sameSize === "yes");
  const approvedOut = reuse.map((r) => ({
    category: r.cat41,
    file: r.file41,
    swf: r.swf6600.split("\\").pop(),
    swfPath: r.swf6600,
    sourceFile: r.image6600,
    fit: "cover",
    note: `reuso direto do 4.1 (${r.matchType}, ${r.swf41}::${r.sourceFile41})`,
  }));
  const outPath = join(ROOT, "remaster", "approved-6600.json");
  writeFileSync(outPath, JSON.stringify(approvedOut, null, 2));
  console.log(`${outPath}: ${approvedOut.length} entradas de reuso direto (approved=yes, mesmo tamanho)`);
}

main();
