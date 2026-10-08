// Finds Vietnamese string literals hardcoded in server code (apps/game, apps/api, packages/*/src).
// Usage: node tools/qa/code-vn-scan.mjs extract <out.json>   — unique literals → {"vn": ""}
//        node tools/qa/code-vn-scan.mjs apply <map.json>     — replace each literal in place with its PT-BR value
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const VN = /[ăắằẳẵặấầẩẫậđếềểễệốồổỗộơớờởỡợưứừửữựạảẹẻẽịỉọỏụủỳỵỷỹĂĐƠƯ]/;
const LIT = /"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const ROOTS = ["apps/game/src", "apps/api/src", ...readdirSync("packages").map((p) => join("packages", p, "src"))];

function* walk(d) {
  let es;
  try { es = readdirSync(d); } catch { return; }
  for (const e of es) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.ts$/.test(p) && !/\.test\.ts$/.test(p)) yield p;
  }
}

const [, , cmd, file] = process.argv;
if (cmd === "extract") {
  const m = new Map();
  for (const r of ROOTS) for (const f of walk(r)) for (const line of readFileSync(f, "utf8").split("\n")) {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
    const code = line.replace(/\s\/\/.*$/, "");
    for (const x of code.matchAll(LIT)) { const s = x[1] ?? x[2]; if (s && VN.test(s)) m.set(s, (m.get(s) ?? new Set()).add(f)); }
  }
  writeFileSync(file, JSON.stringify(Object.fromEntries([...m.keys()].map((k) => [k, ""])), null, 1));
  console.log(m.size, "unique literals in", new Set([...m.values()].flatMap((s) => [...s])).size, "files");
} else if (cmd === "apply") {
  const map = JSON.parse(readFileSync(file, "utf8"));
  let n = 0, files = 0;
  for (const r of ROOTS) for (const f of walk(r)) {
    const t = readFileSync(f, "utf8");
    if (!VN.test(t)) continue;
    const out = t.split("\n").map((line) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return line;
      return line.replace(LIT, (all, a, b) => {
        const s = a ?? b, pt = map[s];
        if (!pt) return all;
        n++;
        const q = all[0];
        return q + (q === '"' ? pt.replace(/(?<!\\)"/g, '\\"') : pt) + q;
      });
    }).join("\n");
    if (out !== t) { writeFileSync(f, out); files++; }
  }
  console.log("replaced", n, "literals in", files, "files");
}
