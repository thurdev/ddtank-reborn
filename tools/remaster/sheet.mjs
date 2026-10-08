// Contact sheets of pending jobs for hand-writing specs: each tile = index, original image, current OCR (vn) and
// translation (pt). Usage: node tools/remaster/sheet.mjs <outDir> [perSheet=16]  (reads remaster/_auto/pending.json)
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [outDir, per = "16"] = process.argv.slice(2);
const rows = JSON.parse(readFileSync("remaster/_auto/pending.json", "utf8"));
mkdirSync(outDir, { recursive: true });
const TW = 400, TH = 150, IMG_H = 96, COLS = 2;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 70);
const n = +per;
for (let s = 0; s * n < rows.length; s++) {
  const part = rows.slice(s * n, s * n + n);
  const comp = [];
  for (let i = 0; i < part.length; i++) {
    const r = part[i], idx = s * n + i;
    const x = (i % COLS) * TW, y = Math.floor(i / COLS) * TH;
    const src = join("remaster", r.category, "inputs", r.file);
    const m = await sharp(src).metadata();
    const k = Math.min((TW - 20) / m.width, IMG_H / m.height, 4);
    const img = await sharp(src).resize(Math.max(1, Math.round(m.width * k)), Math.max(1, Math.round(m.height * k)), { kernel: k > 1 ? "nearest" : "lanczos3" })
      .flatten({ background: { r: 40, g: 60, b: 90 } }).png().toBuffer();
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">
      <rect width="${TW}" height="${TH}" fill="#d8d8d8" stroke="#555"/>
      <text x="6" y="16" font-family="Arial" font-size="14" font-weight="700" fill="#b00">#${idx}</text>
      <text x="50" y="16" font-family="Arial" font-size="11" fill="#333">${esc(r.id)}</text>
      <text x="6" y="${TH - 22}" font-family="Arial" font-size="12" fill="#000">vn: ${esc(r.vn)}</text>
      <text x="6" y="${TH - 7}" font-family="Arial" font-size="12" fill="#004">pt: ${esc(r.pt)}  (L${r.lines ?? "?"})</text></svg>`);
    comp.push({ input: label, left: x, top: y }, { input: img, left: x + 10, top: y + 22 });
  }
  const H = Math.ceil(part.length / COLS) * TH;
  await sharp({ create: { width: TW * COLS, height: H, channels: 3, background: "#999" } }).composite(comp).png().toFile(join(outDir, `sheet-${String(s).padStart(2, "0")}.png`));
}
console.log(`${Math.ceil(rows.length / n)} sheets`);
