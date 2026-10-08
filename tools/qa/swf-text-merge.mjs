// Merges hand translations into research/i18n/swf-text-pt.json: node tools/qa/swf-text-merge.mjs <swf> <tr.json>
// tr.json = { "<charId>": ["line0", "line1", ...] } — one entry per original record (line count must match).
import { readFileSync, writeFileSync } from "node:fs";
const [swf, trFile] = process.argv.slice(2);
const db = JSON.parse(readFileSync("research/i18n/swf-text-pt.json", "utf8"));
const tr = JSON.parse(readFileSync(trFile, "utf8"));
let ok = 0, bad = [];
for (const [id, lines] of Object.entries(tr)) {
  const e = db[swf]?.[id];
  if (!e) { bad.push(id + " (unknown)"); continue; }
  if (e.vi.length !== lines.length) { bad.push(`${id} (${lines.length}≠${e.vi.length})`); continue; }
  e.pt = lines; ok++;
}
writeFileSync("research/i18n/swf-text-pt.json", JSON.stringify(db, null, 1));
const left = Object.values(db[swf] ?? {}).filter((e) => e.pt.some((l, i) => !l && e.vi[i].trim())).length;
console.log(`${swf}: ${ok} merged, ${left} still untranslated`, bad.length ? "BAD: " + bad.join(", ") : "");
