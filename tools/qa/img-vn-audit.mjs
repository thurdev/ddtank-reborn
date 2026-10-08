// OCR (tesseract vie) every remaster input that has NO PT-BR output yet and flags the ones with Vietnamese text.
// Output: research/i18n/img-vn-missing.tsv (category, file, vn-char count, OCR text)
import { createWorker } from "tesseract.js";
import sharp from "sharp";
import { readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const R = join(ROOT, "remaster");
const VN = /[ăắằẳẵặấầẩẫậđếềểễệốồổỗộơớờởỡợưứừửữựạảẹẻẽịỉọỏụủỳỵỷỹĂĐƠƯ]/gi;
const w = await createWorker("vie", 1, { langPath: join(ROOT, "tools", "i18n", "images"), gzip: false });
const rows = [];
for (const cat of readdirSync(R).filter((c) => /^\d\d-/.test(c) && existsSync(join(R, c, "inputs")))) {
  const outs = new Set(existsSync(join(R, cat, "outputs")) ? readdirSync(join(R, cat, "outputs")) : []);
  for (const f of readdirSync(join(R, cat, "inputs"))) {
    const id = f.replace(/\.(png|jpe?g)$/i, "");
    if (outs.has(id + ".png")) continue;
    const src = join(R, cat, "inputs", f);
    try {
      const m = await sharp(src).metadata();
      const k = Math.max(1, Math.min(4, Math.floor(1600 / Math.max(m.width, m.height))));
      const buf = await sharp(src).resize(m.width * k).flatten({ background: "#808080" }).png().toBuffer();
      const { data } = await w.recognize(buf);
      const n = (data.text.match(VN) || []).length;
      if (n >= 2) rows.push([cat, f, n, data.text.replace(/\s+/g, " ").trim().slice(0, 160)]);
    } catch (e) { rows.push([cat, f, -1, "ERR " + e.message]); }
  }
}
rows.sort((a, b) => b[2] - a[2]);
writeFileSync(join(ROOT, "research", "i18n", "img-vn-missing.tsv"), rows.map((r) => r.join("\t")).join("\n"));
console.log("flagged", rows.length);
await w.terminate();
