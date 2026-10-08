// Merge hand-written specs into remaster/_auto/specs.json, keyed by pending.json index or id.
//   node tools/remaster/specs-add.mjs <file.json>   (file: { "<index or id>": { vn, pt, lines, prompt, skip } })
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const P = "remaster/_auto/specs.json";
const pending = JSON.parse(readFileSync("remaster/_auto/pending.json", "utf8"));
const specs = existsSync(P) ? JSON.parse(readFileSync(P, "utf8")) : {};
const add = JSON.parse(readFileSync(process.argv[2], "utf8"));
let n = 0;
for (const [k, v] of Object.entries(add)) {
  const id = /^\d+$/.test(k) ? pending[+k]?.id : k;
  if (!id) { console.log("unknown", k); continue; }
  specs[id] = { ...v };
  n++;
}
writeFileSync(P, JSON.stringify(specs, null, 1));
console.log(`specs +${n} (total ${Object.keys(specs).length})`);
