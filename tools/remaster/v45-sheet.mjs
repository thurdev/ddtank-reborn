// Folha de revisão (original | resultado) dos ids em .playwright-mcp/v45-results.txt → research/i18n/v45-last.jpg
import sharp from "sharp"; import fs from "node:fs";
const R = (p) => new URL("../../" + p, import.meta.url);
const man = fs.readFileSync(R("remaster/manifest.csv"), "utf8").split(/\r?\n/);
const ids = fs.readFileSync(R(".playwright-mcp/v45-results.txt"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split(" ")[1]);
const t = []; let y = 0;
for (const id of ids) {
  const r = man.find((l) => l.split(",")[1]?.replace(/\.(png|jpe?g)$/i, "") === id); const [cat, file] = r.split(",");
  for (const [k, p] of [["inputs/" + file], ["outputs/" + id + ".png"]].entries()) t.push({ input: await sharp(fs.readFileSync(R(`remaster/${cat}/${p[0]}`))).flatten({ background: "#556" }).resize(300, 130, { fit: "contain", background: "#222" }).toBuffer(), left: k * 310, top: y });
  y += 135;
}
await sharp({ create: { width: 610, height: y, channels: 3, background: "#111" } }).composite(t).jpeg({ quality: 82 }).toFile(R("research/i18n/v45-last.jpg").pathname.slice(1));
console.log(ids.length);
