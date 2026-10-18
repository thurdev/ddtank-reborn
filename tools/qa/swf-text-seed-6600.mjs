// Pipeline helper (2nd step of the 6600 static-text workflow, after swf-text-audit-6600.sh): reads
// research/i18n/swf-text-tr.tsv (swf-text-audit-6600.sh
// output) + the raw per-charId exports under research/i18n/swf-texts-6600/<swf>/<charId>.txt and builds the
// skeleton research/i18n/swf-text-pt-6600.json ({ swf: { charId: { tr: [records], pt: ["", ...] } } }), one
// entry per flagged charId, ready for hand translation (fill "pt"). Re-run-safe: merges into an existing file
// without clobbering any "pt" already filled in.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const tsv = readFileSync(join(ROOT, "research", "i18n", "swf-text-tr.tsv"), "utf8");
const outPath = join(ROOT, "research", "i18n", "swf-text-pt-6600.json");
const db = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {};

let added = 0;
for (const line of tsv.split(/\r?\n/)) {
  if (!line.trim()) continue;
  const [swf, charId] = line.split("\t");
  const txtPath = join(ROOT, "research", "i18n", "swf-texts-6600", swf, `${charId}.txt`);
  if (!existsSync(txtPath)) continue;
  const raw = readFileSync(txtPath, "utf8").replace(/\r\n/g, "\n");
  const records = raw.split("\n--- RECORDSEPARATOR ---\n").map((r) => r.replace(/\n+$/, ""));
  db[swf] ??= {};
  if (db[swf][charId]) continue; // already seeded (keeps any pt filled by hand)
  db[swf][charId] = { tr: records, pt: records.map(() => "") };
  added++;
}
writeFileSync(outPath, JSON.stringify(db, null, 1));
console.log(`${added} new charId entr${added === 1 ? "y" : "ies"} seeded into ${outPath}`);
