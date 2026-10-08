// Full-client Vietnamese image audit: OCR (tesseract vie) EVERY bitmap exported from our client SWFs
// (<exportDir>/<swf>/<chid>[_<linkage>].<ext>, from `ffdec -export image`) that is not already replaced by the
// SkelletonX map (research/i18n/skelleton-map.json) nor by an approved remaster output (remaster/approved.json).
// Flags images with Vietnamese-only letters. Output: research/i18n/img-vn-full.tsv (swf, file, w, h, vnChars, text).
//   node tools/qa/img-vn-full-audit.mjs <exportDir>
import { createWorker } from "tesseract.js";
import sharp from "sharp";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [DIR] = process.argv.slice(2);
const VN = /[ăắằẳẵặấầẩẫậđếềểễệốồổỗộơớờởỡợưứừửữựạảẹẻẽịỉọỏụủỳỵỷỹĂĐƠƯ]/g;
const skel = new Set(JSON.parse(readFileSync("research/i18n/skelleton-map.json", "utf8")).map((e) => `${e.swf.toLowerCase()}::${e.sourceFile}`));
const appr = new Set(JSON.parse(readFileSync("remaster/approved.json", "utf8")).map((e) => `${e.swf.toLowerCase()}::${e.sourceFile}`));
const worker = await createWorker("vie", 1, { langPath: join(process.cwd(), "tools", "i18n", "images"), gzip: false });
const rows = [];
let seen = 0;
for (const swf of readdirSync(DIR)) {
  for (const f of readdirSync(join(DIR, swf))) {
    if (!/\.(png|jpe?g)$/i.test(f)) continue;
    const key = `${swf.toLowerCase()}.swf::${f}`;
    if (skel.has(key) || appr.has(key)) continue;
    const p = join(DIR, swf, f);
    const m = await sharp(p).metadata();
    if (m.width < 14 || m.height < 9 || m.width * m.height > 900 * 700) continue;
    seen++;
    // upscale small art 3x on grey so tesseract reads game fonts; two passes (as-is + inverted) catch light text
    const up = await sharp(p).flatten({ background: "#808080" }).resize({ width: Math.min(1800, m.width * 3) }).greyscale().normalise().png().toBuffer();
    const inv = await sharp(up).negate().png().toBuffer();
    let text = "";
    for (const img of [up, inv]) { const r = await worker.recognize(img); text += " " + r.data.text; }
    const n = (text.match(VN) ?? []).length;
    if (n >= 2) rows.push([`${swf}.swf`, f, m.width, m.height, n, text.replace(/\s+/g, " ").trim().slice(0, 160)]);
    if (seen % 200 === 0) console.log(seen, "checked,", rows.length, "flagged");
  }
}
await worker.terminate();
writeFileSync("research/i18n/img-vn-full.tsv", ["swf\tfile\tw\th\tvn\ttext", ...rows.map((r) => r.join("\t"))].join("\n"));
console.log("done:", seen, "checked,", rows.length, "with Vietnamese");
