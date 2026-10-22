/** Smoke test: faz parse de todos os .as e lista falhas. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "./parser.js";

export const AS3_ROOT = fileURLToPath(new URL("../../../vendor/DDTank41/Source Flash/src/", import.meta.url));

export function listAs(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) listAs(p, out);
    else if (n.endsWith(".as")) out.push(p);
  }
  return out;
}

if (process.argv[1]?.endsWith("parse-all.ts")) {
  const files = listAs(AS3_ROOT);
  let fail = 0;
  const t0 = Date.now();
  for (const f of files) {
    try { parse(readFileSync(f, "utf8"), f.slice(AS3_ROOT.length)); }
    catch (e) { fail++; if (fail <= 40) console.log((e as Error).message); }
  }
  console.log(`${files.length} arquivos, ${fail} falhas, ${Date.now() - t0}ms`);
}
