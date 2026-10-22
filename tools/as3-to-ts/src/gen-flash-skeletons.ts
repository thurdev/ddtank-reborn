/**
 * Gera esqueletos das classes `flash.*` que o jogo usa em `packages/flash/src`
 * a partir da API real (playerglobal). NÃO sobrescreve arquivo existente.
 *
 * Cada esqueleto já vem com: superclasse certa, TODAS as constantes estáticas
 * com os valores do Flash Player, e cada método/propriedade como stub que
 * avisa uma vez no console "não implementado" (assim o que falta aparece
 * sozinho ao jogar). Depois é só implementar o que importa.
 *
 *   npx tsx tools/as3-to-ts/src/gen-flash-skeletons.ts
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import type { ClassDecl, Expr, FieldMember, InterfaceDecl, MethodMember, TypeRef } from "./ast.js";
import { listAs } from "./parse-all.js";
import { Project, type ClassInfo } from "./project.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PG = join(HERE, "../playerglobal");
const FLASH_SRC = join(HERE, "../../../packages/flash/src");
const GAME = join(HERE, "../../../apps/client/src/game");

function walk(d: string, out: string[] = []): string[] {
  for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p, out); else if (n.endsWith(".ts")) out.push(p); }
  return out;
}

const project = new Project();
for (const f of listAs(PG)) project.addFile(f.slice(PG.length + 1).replace(/\\/g, "/"), readFileSync(f, "utf8"), true);
project.link();

// módulos @ddt/flash usados pelo código gerado
const needed = new Set<string>();
for (const f of walk(GAME)) {
  for (const m of readFileSync(f, "utf8").matchAll(/from "@ddt\/flash\/([^"]+)"/g)) needed.add(m[1]!);
}
// + superclasses
const queue = [...needed];
while (queue.length) {
  const mod = queue.pop()!;
  if (mod === "as3" || mod.endsWith("/functions")) continue;
  const fqn = "flash." + mod.replace(/\//g, ".");
  const ci = project.classes.get(fqn);
  const sup = ci?.extendsFqn;
  if (sup && sup.startsWith("flash.")) {
    const m = sup.slice(6).replace(/\./g, "/");
    if (!needed.has(m)) { needed.add(m); queue.push(m); }
  }
}

function tsType(t?: TypeRef): string {
  if (!t) return "any";
  switch (t.name) {
    case "int": case "uint": case "Number": return "number";
    case "String": return "string";
    case "Boolean": return "boolean";
    case "void": return "void";
    case "Array": return "any[]";
    case "Function": return "Function";
    default: return "any";
  }
}

function lit(e?: Expr): string | undefined {
  if (!e) return undefined;
  if (e.kind === "num" || e.kind === "str") return e.value;
  if (e.kind === "bool") return String(e.value);
  if (e.kind === "null") return "null";
  if (e.kind === "unary" && e.op === "-" && e.arg.kind === "num") return "-" + e.arg.value;
  return undefined;
}

let written = 0;
for (const mod of [...needed].sort()) {
  if (mod === "as3" || mod.endsWith("/functions")) continue;
  const out = join(FLASH_SRC, mod + ".ts");
  if (existsSync(out)) continue;
  const fqn = "flash." + mod.replace(/\//g, ".");
  const ci = project.classes.get(fqn);
  if (!ci) { console.warn("sem API pra", fqn); continue; }
  writeFileSync(out, skeleton(ci, mod), { flag: "wx" });
  written++;
}
console.log(`${written} esqueletos novos`);

function skeleton(ci: ClassInfo, mod: string): string {
  mkdirSync(dirname(join(FLASH_SRC, mod)), { recursive: true });
  const L: string[] = [];
  L.push(`/**\n * \`${ci.fqn}\` — esqueleto gerado por tools/as3-to-ts/src/gen-flash-skeletons.ts.\n * Constantes conferem com o Flash Player; métodos não implementados avisam no console.\n */`);
  const rel = (target: string) => {
    let r = posix.relative(posix.dirname(mod), target);
    if (!r.startsWith(".")) r = "./" + r;
    return r;
  };
  const d = ci.decl!;
  if (ci.isInterface) {
    L.push(`import { $interface } from "${rel("as3")}";`);
    L.push(`import { $todo } from "${rel("todo")}";`);
    L.push("");
    L.push(`export interface ${ci.name} {`);
    for (const m of (d as InterfaceDecl).members) {
      if (m.accessor) L.push(`  ${m.name}: ${tsType(m.accessor === "get" ? m.fn.returnType : m.fn.params[0]?.type)};`);
      else L.push(`  ${m.name}(...args: any[]): ${tsType(m.fn.returnType)};`);
    }
    L.push("}");
    L.push(`export const ${ci.name} = $interface(${JSON.stringify(ci.fqn)});`);
    L.push(`void $todo;`);
    return L.join("\n") + "\n";
  }
  const sup = ci.extendsFqn && ci.extendsFqn !== "Object" ? project.classes.get(ci.extendsFqn) : undefined;
  L.push(`import { $class } from "${rel("as3")}";`);
  L.push(`import { $todo } from "${rel("todo")}";`);
  if (sup) L.push(`import { ${sup.name} } from "${rel(sup.fqn.slice(6).replace(/\./g, "/"))}";`);
  L.push("");
  L.push(`export class ${ci.name}${sup ? ` extends ${sup.name}` : ""} {`);
  const cd = d as ClassDecl;
  for (const m of cd.members) {
    if (m.kind !== "field" || !m.mods.isStatic || m.mods.access !== "public") continue;
    const f = m as FieldMember;
    const v = lit(f.init);
    if (v !== undefined) L.push(`  static readonly ${f.name}${f.isConst ? "" : ""} = ${v};`);
  }
  const ctor = cd.members.find((m): m is MethodMember => m.kind === "method" && m.name === ci.name && !m.accessor);
  const cparams = ctor ? ctor.fn.params.map((p) => `${p.rest ? "..." : ""}${p.name}${p.init && !p.rest ? "?" : ""}: ${p.rest ? "any[]" : tsType(p.type)}`).join(", ") : "";
  L.push("");
  L.push(`  constructor(${cparams}) {`);
  if (sup) L.push("    super();");
  L.push("  }");
  const seen = new Set<string>();
  for (const m of cd.members) {
    if (m.kind !== "method" || m.mods.access !== "public" || m.name === ci.name) continue;
    const mm = m as MethodMember;
    const st = mm.mods.isStatic ? "static " : "";
    const key = `${st}${mm.accessor ?? ""}${mm.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const tag = `${ci.name}.${mm.name}`;
    if (mm.accessor === "get") L.push(`  ${st}get ${mm.name}(): ${tsType(mm.fn.returnType)} { return $todo(${JSON.stringify(tag)}); }`);
    else if (mm.accessor === "set") L.push(`  ${st}set ${mm.name}(_v: ${tsType(mm.fn.params[0]?.type)}) { $todo(${JSON.stringify(tag + "=")}); }`);
    else {
      const ps = mm.fn.params.map((p) => `${p.rest ? "..." : "_"}${p.name}${p.init && !p.rest ? "?" : ""}: ${p.rest ? "any[]" : tsType(p.type)}`).join(", ");
      L.push(`  ${st}${mm.name}(${ps}): ${tsType(mm.fn.returnType)} { return $todo(${JSON.stringify(tag + "()")}); }`);
    }
  }
  L.push("}");
  L.push(`$class(${ci.name}, ${JSON.stringify(ci.fqn)});`);
  return L.join("\n") + "\n";
}
