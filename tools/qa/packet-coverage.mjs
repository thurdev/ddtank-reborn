// Client->server packet coverage: every `send*` in the client's GameSocketOut.as (with its ePackageType code) against
// the codes our game server registers (r.player(N / register({ code: N) and their status.
// Output: research/qa/packet-coverage.tsv + a summary on stdout.
//   node tools/qa/packet-coverage.mjs
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "vendor/DDTank41/Source Flash/src";
const types = new Map();
for (const m of readFileSync(join(SRC, "ddt/data/socket/ePackageType.as"), "utf8").matchAll(/const ([A-Z_0-9]+):int = (\d+)/g)) types.set(m[1], +m[2]);
const out = readFileSync(join(SRC, "ddt/manager/GameSocketOut.as"), "utf8");
const fns = [];
for (const m of out.matchAll(/public function (send\w+)\(([^)]*)\)[^{]*\{([\s\S]*?)\n      \}/g)) {
  const body = m[3];
  const pk = body.match(/new PackageOut\(\s*(?:ePackageType\.)?([A-Z_0-9]+|\d+)/);
  if (!pk) continue;
  const code = /^\d+$/.test(pk[1]) ? +pk[1] : types.get(pk[1]);
  const sub = body.match(/\.write(?:Int|Byte)\(\s*(?:[A-Za-z]+PackageType\.)?([A-Z_0-9]+|\d+)\s*\)/);
  fns.push({ fn: m[1], code, codeName: pk[1], firstWrite: sub?.[1] ?? "" });
}
const handled = new Map();
const H = "apps/game/src/handlers";
for (const f of readdirSync(H).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
  const t = readFileSync(join(H, f), "utf8");
  for (const m of t.matchAll(/\.player\(\s*(\d+)\s*,\s*"([^"]+)"[\s\S]*?(?:,\s*"(implemented|partial|stub)")?\)\s*;/g)) handled.set(+m[1], { name: m[2], status: m[3] ?? "implemented", file: f });
  for (const m of t.matchAll(/register\(\{\s*code:\s*(\d+)[^}]*?name:\s*"([^"]+)"[^}]*?status:\s*"(\w+)"/g)) handled.set(+m[1], { name: m[2], status: m[3], file: f });
}
const rows = fns.map((x) => { const h = handled.get(x.code); return [x.code, x.codeName, x.fn, x.firstWrite, h ? h.status : "MISSING", h?.file ?? ""]; });
rows.sort((a, b) => a[0] - b[0]);
mkdirSync("research/qa", { recursive: true });
writeFileSync("research/qa/packet-coverage.tsv", ["code\tname\tclientFn\tfirstWrite\tserver\tfile", ...rows.map((r) => r.join("\t"))].join("\n"));
const by = (s) => rows.filter((r) => r[4] === s);
const codes = (s) => [...new Set(by(s).map((r) => `${r[0]} ${r[1]}`))];
console.log({ clientSends: rows.length, missing: by("MISSING").length, stub: by("stub").length, partial: by("partial").length });
console.log("MISSING codes:", codes("MISSING").join(", "));
console.log("STUB codes:", codes("stub").join(", "));
