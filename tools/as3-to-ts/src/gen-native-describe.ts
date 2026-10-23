/**
 * Gera `packages/flash/src/gen/native-describe.ts`: membros públicos (var /
 * accessor) de cada classe flash.* no formato que `describeType` usa.
 * O pickgliss aplica estilos XML copiando propriedades listadas pelo
 * describeType — sem isso `x`, `width`, `text`... das classes do Flash não
 * seriam copiados.
 *
 *   npx tsx tools/as3-to-ts/src/gen-native-describe.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listAs } from "./parse-all.js";
import { Project } from "./project.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PG = join(HERE, "../playerglobal");
const OUT = join(HERE, "../../../packages/flash/src/gen/native-describe.ts");

const project = new Project();
for (const f of listAs(PG)) project.addFile(f.slice(PG.length + 1).replace(/\\/g, "/"), readFileSync(f, "utf8"), true);
project.link();

const tn = (n?: string): string => {
  if (!n) return "*";
  if (["int", "uint", "Number", "String", "Boolean", "Array", "Object", "Function", "Class", "XML", "XMLList", "*", "void"].includes(n)) return n;
  const ci = project.classes.get(n) ?? [...project.classes.values()].find((c) => c.name === n);
  if (!ci) return n;
  return ci.pkg ? `${ci.pkg}::${ci.name}` : ci.name;
};

const out: Record<string, string> = {};
for (const ci of project.classes.values()) {
  if (!ci.fqn.startsWith("flash.") || ci.isInterface) continue;
  const parts: string[] = [];
  for (const m of ci.instance.values()) {
    if (m.access !== "public") continue;
    if (m.kind === "field") parts.push(`v:${m.name}:${tn(m.type?.name)}`);
    else if (m.kind === "const") parts.push(`c:${m.name}:${tn(m.type?.name)}`);
    else if (m.kind === "method") parts.push(`m:${m.name}:${tn(m.type?.name)}:${m.params?.length ?? 0}`);
    else if (m.kind === "accessor") parts.push(`a:${m.name}:${tn(m.type?.name)}:${m.hasGet && m.hasSet ? "readwrite" : m.hasGet ? "readonly" : "writeonly"}`);
  }
  if (parts.length) out[ci.fqn] = parts.join(";");
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, [
  "// GERADO por tools/as3-to-ts/src/gen-native-describe.ts — membros públicos das classes do Flash (pro describeType).",
  "export const NATIVE_DESCRIBE: Record<string, string> = " + JSON.stringify(out, null, 1) + ";",
  "",
].join("\n"));
console.log(Object.keys(out).length, "classes");
