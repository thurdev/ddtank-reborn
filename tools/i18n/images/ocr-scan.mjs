// OCR sweep over FFDec-exported images, detecting Vietnamese text.
// Usage: node ocr-scan.mjs <exportRoot> <outNdjson> [--swf=name1,name2] [--workers=4] [--append]
import { createWorker } from "tesseract.js";
import sharp from "sharp";
import { readdirSync, statSync, appendFileSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";

const [, , exportRoot, outPath, ...rest] = process.argv;
if (!exportRoot || !outPath) {
  console.error("Usage: node ocr-scan.mjs <exportRoot> <outNdjson> [--swf=a,b] [--workers=4] [--append]");
  process.exit(1);
}
const opts = Object.fromEntries(rest.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const swfFilter = opts.swf ? new Set(opts.swf.split(",")) : null;
const workerCount = Number(opts.workers || 4);
const append = "append" in opts;

// Vietnamese-specific diacritic characters (beyond plain Latin) — a strong signal that OCR text is really Vietnamese,
// not misread Latin/numeric noise.
const VN_RE = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;

const swfDirs = readdirSync(exportRoot).filter((d) => statSync(join(exportRoot, d)).isDirectory() && (!swfFilter || swfFilter.has(d)));

const already = new Set();
if (append && existsSync(outPath)) {
  for (const line of readFileSync(outPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line);
      already.add(o.swf + "::" + o.file);
    } catch {}
  }
}
if (!append) writeFileSync(outPath, "");

const jobs = [];
for (const swf of swfDirs) {
  const dir = join(exportRoot, swf);
  for (const file of readdirSync(dir)) {
    const ext = extname(file).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".gif", ".bmp"].includes(ext)) continue;
    if (already.has(swf + "::" + file)) continue;
    jobs.push({ swf, file, full: join(dir, file) });
  }
}
console.error(`[ocr] ${jobs.length} images to scan across ${swfDirs.length} swf dirs (workers=${workerCount})`);

let done = 0;
let hits = 0;
const t0 = Date.now();

async function runWorker(id, queue) {
  const worker = await createWorker("vie");
  while (queue.length) {
    const job = queue.pop();
    if (!job) break;
    let text = "",
      conf = 0,
      w = 0,
      h = 0,
      size = 0;
    try {
      const meta = await sharp(job.full).metadata();
      w = meta.width || 0;
      h = meta.height || 0;
      size = statSync(job.full).size;
      // Normalize size for speed/consistency: upscale tiny images (OCR struggles below ~32px glyphs), downscale huge ones.
      const longest = Math.max(w, h) || 1;
      let pipeline = sharp(job.full).ensureAlpha().flatten({ background: "#ffffff" }).grayscale();
      if (longest < 200) pipeline = pipeline.resize({ width: w * 3, height: h * 3 });
      else if (longest > 900) pipeline = pipeline.resize({ width: Math.round((w / longest) * 900), height: Math.round((h / longest) * 900) });
      const buf = await pipeline.png().toBuffer();
      const res = await worker.recognize(buf);
      text = (res.data.text || "").trim();
      conf = res.data.confidence || 0;
    } catch (e) {
      text = "";
      conf = 0;
    }
    const hasVN = VN_RE.test(text);
    if (hasVN) hits++;
    done++;
    if (done % 50 === 0) console.error(`[ocr] ${done}/${jobs.length} (${hits} VN hits) ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    appendFileSync(outPath, JSON.stringify({ swf: job.swf, file: job.file, size, w, h, text, hasVN, conf: Math.round(conf) }) + "\n");
  }
  await worker.terminate();
}

const queue = jobs.slice();
await Promise.all(Array.from({ length: Math.min(workerCount, Math.max(1, queue.length)) }, (_, i) => runWorker(i, queue)));
console.error(`[ocr] done. ${done} scanned, ${hits} VN hits, ${((Date.now() - t0) / 1000).toFixed(0)}s total`);
