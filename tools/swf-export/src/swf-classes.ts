/**
 * Classes AS3 de dentro dos SWFs de assets (as de linkage: `asset.hall.xxx`).
 *
 * - Toda classe: guarda a classe base (MovieClip, BitmapData, SimpleButton...)
 *   no library.json — o cliente cria a classe sozinho em runtime.
 * - Classes com código (frame scripts `stop()`, `gotoAndPlay`, eventos...):
 *   o .as é guardado em `tools/swf-export/.as3/<caminho>/` e o transpilador
 *   (tools/as3-to-ts, `--swf-classes`) gera TS em
 *   `apps/client/src/swf-classes/`. Depois do congelamento só fica o TS.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../../as3-to-ts/src/parser.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const AS3_OUT = join(HERE, "../.as3");

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith(".as")) out.push(p);
  }
  return out;
}

export interface SwfClassInfo {
  base: string;
  hasCode: boolean;
}

export function readClasses(scriptsDir: string, key: string, warn: (m: string) => void): Map<string, SwfClassInfo> {
  const out = new Map<string, SwfClassInfo>();
  const root = join(scriptsDir, "scripts");
  for (const f of walk(existsSync(root) ? root : scriptsDir)) {
    let prog;
    try { prog = parse(readFileSync(f, "utf8"), f); }
    catch (e) { warn(`script ${relative(scriptsDir, f)}: ${(e as Error).message}`); continue; }
    for (const d of prog.decls) {
      if (d.kind !== "class") continue;
      const fqn = prog.pkg ? `${prog.pkg}.${d.name}` : d.name;
      let base = d.extends ?? "Object";
      if (!base.includes(".")) {
        const imp = prog.imports.find((i) => i.endsWith("." + base));
        if (imp) base = imp;
        else if (prog.pkg) base = `${prog.pkg}.${base}`;
      }
      const methods = d.members.filter((m) => m.kind === "method" && m.name !== d.name);
      const hasCode = methods.length > 0;
      out.set(fqn, { base, hasCode });
      if (hasCode) {
        const rel = relative(existsSync(root) ? root : scriptsDir, f);
        const dest = join(AS3_OUT, key, rel);
        mkdirSync(dirname(dest), { recursive: true });
        cpSync(f, dest);
      }
    }
  }
  return out;
}
