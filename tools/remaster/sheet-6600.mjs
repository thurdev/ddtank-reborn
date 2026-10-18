// Folha de revisão do lote 6600: original (esquerda) × saída (direita) dos ids do v45-results.txt
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
const ROOT = resolve(import.meta.dirname, "..", "..");
const R = (...p) => join(ROOT, ...p);
const ids = readFileSync(R(".playwright-mcp/v45-results.txt"), "utf8").split(/\r?\n/).filter((l) => l.startsWith("RESULT ")).map((l) => l.split(" ")[1]);
const man = readFileSync(R("remaster/manifest-6600.csv"), "utf8").split(/\r?\n/);
const dirs = readdirSync(R("remaster/_6600/inputs"));
const W = 300, parts = []; let y = 0;
for (const id of ids) {
  const [cat, , swf, src] = man.find((l) => l.split(",")[1]?.startsWith(id + ".")).split(",");
  const inp = join(R("remaster/_6600/inputs"), dirs.find((d) => d.endsWith(swf)), src);
  const out = R("remaster", cat, "outputs", id + ".png");
  const a = await sharp(inp).resize({ width: W, height: 160, fit: "inside" }).flatten({ background: "#345" }).png().toBuffer();
  const b = await sharp(out).resize({ width: W, height: 160, fit: "inside" }).flatten({ background: "#345" }).png().toBuffer();
  const h = Math.max((await sharp(a).metadata()).height, (await sharp(b).metadata()).height);
  parts.push({ input: a, top: y, left: 0 }, { input: b, top: y, left: W + 10 }); y += h + 8;
}
await sharp({ create: { width: W * 2 + 10, height: y, channels: 3, background: "#111" } }).composite(parts).jpeg().toFile(R("research/6600/v45-6600-last.jpg"));
console.log("sheet", ids.length);
