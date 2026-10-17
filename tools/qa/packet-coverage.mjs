// Client->server packet coverage: every `send*` in the client's GameSocketOut.as (with its ePackageType code) against
// the codes our game server registers (r.player(N / register({ code: N) and their status.
// Output: research/qa/packet-coverage.tsv + a summary on stdout.
//   node tools/qa/packet-coverage.mjs
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tsImport } from "tsx/esm/api";

// Mesmo catálogo da matriz: inclui outros SocketOut e nomes mistos como SEll_GOODS.
// A regex anterior ignorava esses envios e confundia `);` dentro de um handler com o fim do registro.
const fns = JSON.parse(readFileSync("docs/spec/server/tools/out/client-sends.json", "utf8")).map((s) => ({
  fn: s.func, code: s.code, codeName: s.expr.replace(/^ePackageType\./, ""), firstWrite: s.writes[0] ?? "",
}));
const handled = new Map();
const H = "apps/game/src/handlers";
for (const f of readdirSync(H).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
  const t = readFileSync(join(H, f), "utf8");
  for (const m of t.matchAll(/\.player\(\s*(\d+)\s*,\s*"([^"]+)"[\s\S]*?(?:,\s*"(implemented|partial|stub)")?\)\s*;/g)) handled.set(+m[1], { name: m[2], status: m[3] ?? "implemented", file: f });
  // Loop-registered codes: for (const [code, name] of [[95, "X"], ...]) { r.player(code, name, () => ..., "stub"); }
  for (const m of t.matchAll(/for \(const \[code, name\] of \[([\s\S]*?)\]\s*as[^)]*\)\s*\{\s*r\.player\(code, name, [^;]*?(?:"(implemented|partial|stub)")?\)\s*;/g))
    for (const p of m[1].matchAll(/\[(\d+),\s*"([^"]+)"\]/g)) handled.set(+p[1], { name: p[2], status: m[2] ?? "implemented", file: f });
  for (const m of t.matchAll(/register\(\{\s*code:\s*(\d+)[^}]*?name:\s*"([^"]+)"[^}]*?status:\s*"(\w+)"/g)) handled.set(+m[1], { name: m[2], status: m[3], file: f });
}
// O registro efetivo decide existência/status, inclusive registros feitos em loops. As regex acima só localizam
// o arquivo; não são evidência de implementação e não substituem testes de subcomando ou de cliente.
const { createRegistry } = await tsImport("../../apps/game/src/handlers/index.ts", import.meta.url);
const live = new Map(createRegistry().list().map((h) => [h.code, h]));
const rows = fns.map((x) => { const h = live.get(x.code); return [x.code, x.codeName, x.fn, x.firstWrite, h?.status ?? "MISSING", handled.get(x.code)?.file ?? ""]; });
rows.sort((a, b) => a[0] - b[0]);
mkdirSync("research/qa", { recursive: true });
writeFileSync("research/qa/packet-coverage.tsv", ["code\tname\tclientFn\tfirstWrite\tserver\tfile", ...rows.map((r) => r.join("\t"))].join("\n"));
const by = (s) => rows.filter((r) => r[4] === s);
const codes = (s) => [...new Set(by(s).map((r) => `${r[0]} ${r[1]}`))];
console.log({ clientSends: rows.length, missing: by("MISSING").length, stub: by("stub").length, partial: by("partial").length });
console.log("MISSING codes:", codes("MISSING").join(", "));
console.log("STUB codes:", codes("stub").join(", "));
