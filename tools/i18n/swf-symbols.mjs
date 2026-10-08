// SymbolClass (linkage) names of a SWF via `ffdec -swf2xml` (the <names> list of every SymbolClassTag).
// Used to check whether a SkelletonX SWF can replace ours wholesale: every class our client instantiates from that
// SWF must exist in theirs too.
//   node tools/i18n/swf-symbols.mjs <a.swf> [b.swf]   -> counts; with b, the names only a has
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const FFDEC = "vendor/_tools/ffdec/ffdec-cli.jar";
export function symbols(swf) {
  const tmp = join(tmpdir(), `swfsym-${process.pid}-${Math.random().toString(36).slice(2)}.xml`);
  execFileSync("java", ["-jar", FFDEC, "-swf2xml", swf, tmp], { stdio: "ignore" });
  const xml = readFileSync(tmp, "utf8");
  rmSync(tmp, { force: true });
  const names = new Set();
  for (const tag of xml.matchAll(/type="SymbolClassTag"[\s\S]*?<names>([\s\S]*?)<\/names>/g))
    for (const n of tag[1].matchAll(/<item>([^<]*)<\/item>/g)) names.add(n[1]);
  return names;
}
if (process.argv[1]?.endsWith("swf-symbols.mjs")) {
  const [a, b] = process.argv.slice(2);
  const sa = symbols(a);
  if (!b) { console.log(sa.size); process.exit(0); }
  const sb = symbols(b);
  const missing = [...sa].filter((x) => !sb.has(x));
  console.log(JSON.stringify({ ours: sa.size, theirs: sb.size, missingInTheirs: missing.length, sample: missing.slice(0, 12) }));
}
