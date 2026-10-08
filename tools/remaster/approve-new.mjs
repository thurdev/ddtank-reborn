// Adds every remaster output that is not yet in remaster/approved.json (matched through manifest.csv).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const csv = readFileSync("remaster/manifest.csv", "utf8").trim().split(/\r?\n/);
const hdr = csv[0].split(",");
const parse = (l) => { const o = []; let cur = "", q = false; for (const ch of l) { if (ch === '"') { q = !q; continue; } if (ch === "," && !q) { o.push(cur); cur = ""; continue; } cur += ch; } o.push(cur); return o; };
const rows = csv.slice(1).map((l) => Object.fromEntries(parse(l).map((v, i) => [hdr[i], v])));
const ap = JSON.parse(readFileSync("remaster/approved.json", "utf8"));
const have = new Set(ap.map((e) => e.swf + "::" + e.sourceFile));
let n = 0;
for (const r of rows) {
  const id = r.file.replace(/\.(png|jpe?g)$/i, "");
  if (!existsSync(`remaster/${r.category}/outputs/${id}.png`) || have.has(r.source_swf + "::" + r.source_file)) continue;
  ap.push({ category: r.category, file: id + ".png", swf: r.source_swf, sourceFile: r.source_file, fit: "cover", auto: true, review: "pending" }); n++;
}
writeFileSync("remaster/approved.json", JSON.stringify(ap, null, 1));
console.log("added", n, "total", ap.length);
