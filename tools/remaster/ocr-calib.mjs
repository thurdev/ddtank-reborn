import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { readFileSync, readdirSync, existsSync } from "node:fs";
const TR = JSON.parse(readFileSync("remaster/_auto/translations.json", "utf8"));
const w = await createWorker("por", 1, { langPath: "tools/remaster", gzip: true });
const norm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const sim = (a, b) => { a = norm(a); b = norm(b); const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return 1 - d[a.length][b.length] / Math.max(a.length, b.length, 1); };
for (const id of process.argv.slice(2)) {
  const f = readdirSync("remaster").map((c) => `remaster/${c}/outputs/${id}.png`).find(existsSync);
  const buf = await sharp(f).resize({ width: 1400 }).flatten({ background: "#ffffff" }).png().toBuffer();
  const { data } = await w.recognize(buf);
  console.log(sim(data.text, TR[id]).toFixed(2), id, "|", data.text.replace(/\s+/g, " ").slice(0, 70));
}
await w.terminate();
