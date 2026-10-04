// Side-by-side sheet: original vs generated output, over a dark checker-free background, scaled with nearest neighbour.
// Usage: node tools/remaster/compare.mjs out.png id1 id2 ...   (ids = file basenames in remaster/*/inputs|outputs)
import sharp from "sharp";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const [out, ...ids] = process.argv.slice(2);
const cats = readdirSync("remaster").filter((d) => existsSync(join("remaster", d, "inputs")));
const find = (dir, id) => {
  for (const c of cats) for (const f of readdirSync(join("remaster", c, dir))) if (f.replace(/\.(png|jpe?g)$/i, "") === id) return join("remaster", c, dir, f);
  return null;
};
const BG = { r: 40, g: 60, b: 90, alpha: 1 };
const rows = [];
for (const id of ids) {
  const a = find("inputs", id), b = find("outputs", id);
  if (!a || !b) continue;
  const m = await sharp(a).metadata();
  const k = Math.max(1, Math.min(4, Math.floor(700 / m.width)));
  const tile = async (f) => sharp(f).resize(m.width * k, m.height * k, { kernel: "nearest" }).flatten({ background: BG }).png().toBuffer();
  rows.push({ w: m.width * k, h: m.height * k, a: await tile(a), b: await tile(b) });
}
const W = Math.max(...rows.map((r) => r.w * 2 + 30));
const H = rows.reduce((s, r) => s + r.h + 10, 10);
const comp = [];
let y = 10;
for (const r of rows) {
  comp.push({ input: r.a, left: 10, top: y }, { input: r.b, left: r.w + 20, top: y });
  y += r.h + 10;
}
await sharp({ create: { width: W, height: H, channels: 3, background: { r: 128, g: 128, b: 128 } } }).composite(comp).png().toFile(out);
console.log(`${out}: ${rows.length} rows`);
