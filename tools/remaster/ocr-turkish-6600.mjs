#!/usr/bin/env node
// ocr-turkish-6600.mjs — m1-bitmap-text passo 3: roda OCR (tesseract.js, tur+por) sobre as imagens
// exportadas do pack 6600 (remaster/_6600/inputs/<swf>/*) pra achar texto turco cozido no bitmap, e marca
// prioridade: P0 (boot/lobby/sala/HUD de batalha), P1 (janelas comuns), P2 (resto).
// Heuristicas pra reduzir volume (milhares de icones puros, sem texto, nao valem OCR):
//   - pula imagens minusculas (w<24 || h<16): icone puro, nunca tem texto legivel
//   - prioriza por SWF conhecido (lista P0_SWF/P1_SWF abaixo, ver research/6600/swf-inventory.md +
//     docs/plan/TASKS.md m1-bitmap-text pelos exemplos do dono) -- escaneados primeiro e por completo;
//     o resto (P2) é escaneado em amostra (ver --sample) por orcamento de tempo, documentado no relatorio.
// Saida: research/6600/bitmap-turkish.tsv (swf, image, w, h, ocrText, confidence, priority)
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const IN6600 = join(ROOT, "remaster", "_6600", "inputs");
const LANG_PATH = join(HERE, "_lang"); // tur.traineddata baixado aqui (gitignored)

const argv = process.argv.slice(2);
const sampleEvery = Number((argv.find((a) => a.startsWith("--sample=")) || "").split("=")[1] || 1);
const onlyP0P1 = argv.includes("--p0p1-only");

// SWFs P0 (boot/lobby/sala/HUD) -- telas que o jogador ve sempre, confirmado contra
// research/6600/swf-inventory.md (candidatos a renome hall->ddthall etc.) + exemplos do dono em TASKS.md.
const P0_SWF = new Set([
  "ui\\turkey\\swf\\ddthall.swf", "ui\\turkey\\swf\\ddthallmain.swf", "ui\\turkey\\swf\\ddthallicon.swf",
  "ui\\turkey\\swf\\firstcore.swf", "ui\\turkey\\swf\\login.swf", "ui\\turkey\\swf\\ddtroom.swf",
  "ui\\turkey\\swf\\ddtroomlist.swf", "ui\\turkey\\swf\\ddtroomloading.swf", "ui\\turkey\\swf\\newfightlib.swf",
  "ui\\turkey\\swf\\gameiii.swf", "ui\\turkey\\swf\\gameover.swf", "ui\\turkey\\swf\\ddtvipview.swf",
  "ui\\turkey\\swf\\yyvip.swf", "ui\\turkey\\swf\\task.swf", "ui\\turkey\\swf\\dayactivity.swf",
  "ui\\turkey\\swf\\sevendaytarget.swf", "shape.swf", "Loading.swf", "DDT_Loading.swf", "DDT_Loading1.swf",
]);
// SWFs P1 (janelas comuns: forja, loja, bolsa, academia, consorcio/guilda, ranqueada...)
const P1_SWF = new Set([
  "ui\\turkey\\swf\\academycommon.swf", "ui\\turkey\\swf\\ddtacademy.swf", "ui\\turkey\\swf\\consortionii.swf",
  "ui\\turkey\\swf\\ddtconsortion.swf", "ui\\turkey\\swf\\ddtconsortion1.swf", "ui\\turkey\\swf\\kingdivision.swf",
  "ui\\turkey\\swf\\ringstation.swf", "ui\\turkey\\swf\\coreiconandtip.swf", "ui\\turkey\\swf\\ddplay.swf",
  "ui\\turkey\\swf\\ddtbagandinfo.swf", "ui\\turkey\\swf\\enthrall.swf", "ui\\turkey\\swf\\challengeroom.swf",
  "ui\\turkey\\swf\\consortiabattle.swf", "ui\\turkey\\swf\\boguadventure.swf", "ui\\turkey\\swf\\entertainmentmode.swf",
]);

function priorityOf(swfRel) {
  if (P0_SWF.has(swfRel)) return "P0";
  if (P1_SWF.has(swfRel)) return "P1";
  return "P2";
}

const TR_DIAC = /[şŞçÇğĞıİöÖüÜ]/;
const TR_WORDS = /\b(etkinlik|oyun|harika|tamam|kapat|iptal|devam|basla|başla|bugun|bugün|gorev|görev|odul|ödül|hediye|magaza|mağaza|arkadas|arkadaş|dusman|düşman|sunucu|giris|giriş|cikis|çikiş|kayit|kayıt|sifre|şifre|ayarlar|yardim|yardım|hakkinda|hakkında|bekleyin|yukleniyor|yükleniyor|tamamlandi|tamamlandı|gonder|gönder|mesaj|takim|takım|seviye|kazandin|kazandın|savas|savaş|guc|güç|davet|katil|katıl|baslat|başlat|hizli|hızlı|tikla|tıkla|ac|aç|ad\b)/i;

function looksTurkish(text) {
  return TR_DIAC.test(text) || TR_WORDS.test(text);
}

async function main() {
  if (!existsSync(join(LANG_PATH, "tur.traineddata"))) {
    console.error(`faltando ${join(LANG_PATH, "tur.traineddata")} -- baixe de tessdata_fast antes de rodar.`);
    process.exit(1);
  }
  const worker = await createWorker("tur", 1, { langPath: LANG_PATH, gzip: false });

  const swfDirs = existsSync(IN6600) ? readdirSync(IN6600) : [];
  const rows = [];
  let scanned = 0, skippedTiny = 0, found = 0;

  const dirsSorted = swfDirs.sort((a, b) => {
    const ra = a.replace(/__/g, "\\"), rb = b.replace(/__/g, "\\");
    const pa = priorityOf(ra), pb = priorityOf(rb);
    const order = { P0: 0, P1: 1, P2: 2 };
    return order[pa] - order[pb];
  });

  for (const swfDirName of dirsSorted) {
    const swfRel = swfDirName.replace(/__/g, "\\");
    const priority = priorityOf(swfRel);
    if (onlyP0P1 && priority === "P2") continue;
    const dir = join(IN6600, swfDirName);
    const files = readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f));
    let fi = 0;
    for (const f of files) {
      fi++;
      // amostragem só pra P2 (--sample=N escaneia 1 em N); P0/P1 sempre completo
      if (priority === "P2" && sampleEvery > 1 && fi % sampleEvery !== 0) continue;
      const full = join(dir, f);
      let meta;
      try { meta = await sharp(full).metadata(); } catch { continue; }
      if (meta.width < 24 || meta.height < 16) { skippedTiny++; continue; }
      scanned++;
      let text = "", conf = 0;
      try {
        const buf = await sharp(full).resize({ width: Math.max(meta.width, 300) }).flatten({ background: "#ffffff" }).png().toBuffer();
        const { data } = await worker.recognize(buf);
        text = (data.text || "").replace(/\s+/g, " ").trim();
        conf = data.confidence || 0;
      } catch (e) {
        continue;
      }
      if (text.length >= 2 && looksTurkish(text)) {
        found++;
        rows.push({ swf: swfRel, image: f, w: meta.width, h: meta.height, ocrText: text.slice(0, 200), confidence: Math.round(conf), priority });
      }
      if (scanned % 200 === 0) console.log(`...${scanned} escaneadas, ${found} com turco (ultimo swf: ${swfRel})`);
    }
  }

  await worker.terminate();

  const tsvPath = join(ROOT, "research", "6600", "bitmap-turkish.tsv");
  mkdirSync(dirname(tsvPath), { recursive: true });
  const header = ["swf", "image", "w", "h", "ocrText", "confidence", "priority"];
  const lines = [header.join("\t")];
  for (const r of rows) lines.push(header.map((k) => String(r[k] ?? "").replace(/\t/g, " ")).join("\t"));
  writeFileSync(tsvPath, lines.join("\n") + "\n");
  console.log(`\n${tsvPath}: ${rows.length} imagens com turco (escaneadas=${scanned}, puladas-pequenas=${skippedTiny})`);
  const byP = rows.reduce((m, r) => ((m[r.priority] = (m[r.priority] || 0) + 1), m), {});
  console.log("por prioridade:", byP);
}

main();
