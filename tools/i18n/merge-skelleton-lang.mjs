// Merge the SkelletonX (BR community, human-translated) client language.txt into ours: for every key both files have,
// Skelleton's text wins unless it would drop a {n} placeholder / HTML tag ours relies on, or still has Vietnamese.
// Keys only we have (newer client features) keep our translation.
//   node tools/i18n/merge-skelleton-lang.mjs [--dry]
// Writes data/i18n/pt-BR/client-language.txt and apps/api/assets/flash/ui/vietnam/language.txt, report on stdout.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const OURS = "data/i18n/pt-BR/client-language.txt";
const SERVED = "apps/api/assets/flash/ui/vietnam/language.txt";
const SKEL = "vendor/SkelletonX-DDTank4.1/Web/Flash/ui/spain/language.txt";
const VN = /[ăắằẳẵặấầẩẫậđếềểễệốồổỗộơớờởỡợưứừửữựạảẹẻẽịỉọỏụủỳỵỷỹĂĐƠƯ]/;
const parse = (t) => {
  const m = new Map();
  for (const line of t.replace(/^﻿/, "").split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    m.set(line.slice(0, i), line.slice(i + 1));
  }
  return m;
};
const tokens = (v) => [...v.matchAll(/\{\d+\}|<\/?[a-z][^>]*>/gi)].map((x) => x[0].toLowerCase().replace(/\s+/g, "")).sort().join("|");
const skel = parse(readFileSync(SKEL, "utf8"));
const raw = readFileSync(OURS, "utf8");
const lines = raw.replace(/^﻿/, "").split(/\r?\n/);
let taken = 0, keptTokens = 0, keptVn = 0, onlyOurs = 0, same = 0;
const out = lines.map((line) => {
  const i = line.indexOf(":");
  if (i <= 0) return line;
  const k = line.slice(0, i), ours = line.slice(i + 1), theirs = skel.get(k);
  if (theirs === undefined) { onlyOurs++; return line; }
  if (!theirs.trim() || theirs === ours) { same++; return line; }
  if (VN.test(theirs)) { keptVn++; return line; }
  if (tokens(theirs) !== tokens(ours)) { keptTokens++; return line; }
  taken++;
  return `${k}:${theirs}`;
});
console.log({ ourKeys: lines.length, skelKeys: skel.size, takenFromSkelleton: taken, keptOursPlaceholderMismatch: keptTokens, keptOursVnInSkel: keptVn, onlyOurs, identicalOrEmpty: same });
if (!process.argv.includes("--dry")) {
  if (!existsSync(OURS + ".pre-skelleton")) copyFileSync(OURS, OURS + ".pre-skelleton");
  writeFileSync(OURS, out.join("\n"));
  copyFileSync(OURS, SERVED);
}
