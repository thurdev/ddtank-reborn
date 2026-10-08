// Contact sheet of inputs in one category that are NOT in remaster/approved.json (to spot Vietnamese text never
// queued). Usage: node tools/remaster/unapproved-sheet.mjs <category> <out.png> [filterRegex]
import sharp from "sharp";
import { readFileSync, readdirSync } from "node:fs";

const [cat, out, filt] = process.argv.slice(2);
const ap = new Set(JSON.parse(readFileSync("remaster/approved.json", "utf8")).map((e) => e.file.replace(/\.(png|jpe?g)$/i, "")));
const re = filt ? new RegExp(filt) : null;
const all = readdirSync(`remaster/${cat}/inputs`).filter((f) => /\.(png|jpe?g)$/i.test(f) && !ap.has(f.replace(/\.(png|jpe?g)$/i, "")) && (!re || re.test(f)));
const PER = Number(process.env.PER ?? 999), PAGE = Number(process.env.PAGE ?? 0);
const files = all.slice(PAGE * PER, (PAGE + 1) * PER);
const TW = 150, TH = 70, COLS = 6, comp = [];
for (const [i, f] of files.entries()) {
  const m = await sharp(`remaster/${cat}/inputs/${f}`).metadata();
  const s = Math.min((TW - 4) / m.width, (TH - 16) / m.height, 3);
  const img = await sharp(`remaster/${cat}/inputs/${f}`).resize(Math.max(1, Math.round(m.width * s)), Math.max(1, Math.round(m.height * s))).flatten({ background: "#808080" }).png().toBuffer();
  const x = (i % COLS) * TW, y = Math.floor(i / COLS) * TH;
  comp.push({ input: img, left: x + 2, top: y + 14 });
  comp.push({ input: Buffer.from(`<svg width="${TW}" height="13"><text x="1" y="10" font-size="9" fill="#ff0">${PAGE * PER + i} ${f.slice(0, 26).replace(/&/g, "&amp;")}</text></svg>`), left: x, top: y });
}
await sharp({ create: { width: TW * COLS, height: Math.max(1, Math.ceil(files.length / COLS) * TH), channels: 3, background: "#202020" } }).composite(comp).png().toFile(out);
console.log(all.length, "files");
files.forEach((f, i) => console.log(PAGE * PER + i, f));
