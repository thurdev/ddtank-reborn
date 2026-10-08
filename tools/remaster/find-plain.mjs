// Lists pending add:true jobs whose input is sparse text on transparency (candidates for plain-text.mjs instead of AI).
// Usage: node tools/remaster/find-plain.mjs [maxCoverage=0.3]
import sharp from "sharp";
import { readFileSync } from "node:fs";

const maxCov = Number(process.argv[2] ?? 0.3);
const sp = JSON.parse(readFileSync("remaster/_auto/specs.json", "utf8"));
const st = JSON.parse(readFileSync("remaster/_auto/state.json", "utf8"));
const man = readFileSync("remaster/manifest.csv", "utf8").trim().split("\n").slice(1).map((l) => { const [c, f] = l.split(","); return { c, f, id: f.replace(/\.(png|jpe?g)$/i, "") }; });
for (const m of man) {
  const s = sp[m.id];
  if (!s?.add || st.jobs[m.id]?.ok) continue;
  const { data, info } = await sharp(`remaster/${m.c}/inputs/${m.f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const N = info.width * info.height;
  let op = 0, lum = 0, sat = 0;
  for (let i = 0; i < N; i++) {
    if (data[i * 4 + 3] <= 200) continue;
    op++;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    lum += (r + g + b) / 3; sat += Math.max(r, g, b) - Math.min(r, g, b);
  }
  if (op / N < maxCov) console.log([m.id, `${info.width}x${info.height}`, (op / N).toFixed(2), Math.round(lum / op), Math.round(sat / op), JSON.stringify(s.pt)].join("\t"));
}
