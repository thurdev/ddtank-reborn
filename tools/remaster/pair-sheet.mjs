// Before/after contact sheet for reviewing a loop batch: each row = original input | output, scaled to a common height.
// Usage: node tools/remaster/pair-sheet.mjs <out.png> <id> [id...]   (ids = file names without extension, looked up in manifest.csv)
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";

const [out, ...ids] = process.argv.slice(2);
const manifest = readFileSync("remaster/manifest.csv", "utf8").trim().split("\n").slice(1).map((l) => { const [category, file] = l.split(","); return { category, file }; });
const H = Number(process.env.SHEET_H ?? 90), W = Number(process.env.SHEET_W ?? 620), rows = [];
const fit = async (p) => {
  const m = await sharp(p).metadata();
  const s = Math.min(H / m.height, (W / 2 - 10) / m.width, 4);
  return sharp(p).resize(Math.max(1, Math.round(m.width * s)), Math.max(1, Math.round(m.height * s)), { kernel: "nearest" }).flatten({ background: "#808080" }).png().toBuffer({ resolveWithObject: true });
};
for (const id of ids) {
  const m = manifest.find((x) => x.file.replace(/\.(png|jpe?g)$/i, "") === id);
  if (!m) { console.log("no manifest row:", id); continue; }
  const inp = `remaster/${m.category}/inputs/${m.file}`, outp = `remaster/${m.category}/outputs/${id}.png`;
  if (!existsSync(outp)) { console.log("no output:", id); continue; }
  rows.push([await fit(inp), await fit(outp), id]);
}
const label = (t, y) => ({ input: Buffer.from(`<svg width="${W}" height="14"><text x="2" y="11" font-size="11" fill="#ff0">${t.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></svg>`), top: y, left: 0 });
const comp = [];
rows.forEach(([a, b, id], i) => {
  const y = i * (H + 18);
  comp.push(label(`${i} ${id}`, y), { input: a.data, top: y + 16, left: 0 }, { input: b.data, top: y + 16, left: W / 2 });
});
await sharp({ create: { width: W, height: Math.max(1, rows.length * (H + 18)), channels: 3, background: "#202020" } }).composite(comp).png().toFile(out);
console.log("rows", rows.length, out);
