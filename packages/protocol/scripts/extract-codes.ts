/**
 * Extracts every packet-code enum from the original DDTank 4.1 sources and writes TS const objects to src/codes/.
 *
 *   tsx scripts/extract-codes.ts [path/to/vendor/DDTank41]
 *
 * Server (C#): every `enum` whose name contains Package|Packet|Cmd, plus every enum declared directly in
 *   Game.Server/Packets/*.cs (sub-codes / protocol value lists). Grouped by C# project (game-server.ts, game-logic.ts,
 *   center-server.ts, bussiness.ts, ...).
 * Client (AS3): `public static const NAME:int = N;` in every *PackageType.as / *PackageInType.as / *CmdType.as
 *   under "Source Flash/src" -> client.ts (the client is fixed, so these are the ground truth for client codes).
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const vendor = resolve(process.argv[2] ?? join(pkgRoot, "../../vendor/DDTank41"));
const outDir = join(pkgRoot, "src/codes");

interface Member {
  name: string;
  value: number;
}
interface EnumDef {
  name: string;
  exportName: string;
  namespace: string;
  file: string; // relative to vendor
  line: number;
  members: Member[];
  duplicates: string[];
}

function walk(dir: string, filter: (p: string) => boolean, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === "bin" || e === "obj" || e === ".git" || e === "node_modules") continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, filter, acc);
    else if (filter(p)) acc.push(p);
  }
  return acc.sort();
}

/** Removes // and /* *\/ comments while respecting C#/AS3 string and char literals. Keeps newlines. */
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i]!;
    const d = src[i + 1];
    if (c === "/" && d === "/") {
      while (i < n && src[i] !== "\n") i++;
    } else if (c === "/" && d === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
    } else if (c === "@" && d === '"') {
      out += '""';
      i += 2;
      while (i < n) {
        if (src[i] === '"' && src[i + 1] === '"') i += 2;
        else if (src[i] === '"') { i++; break; }
        else { if (src[i] === "\n") out += "\n"; i++; }
      }
    } else if (c === '"' || c === "'") {
      out += c + c;
      i++;
      while (i < n && src[i] !== c && src[i] !== "\n") i += src[i] === "\\" ? 2 : 1;
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

function lineOf(src: string, pos: number): number {
  let l = 1;
  for (let i = 0; i < pos; i++) if (src.charCodeAt(i) === 10) l++;
  return l;
}

function evalExpr(expr: string, scope: Map<string, number>, ctx: string): number {
  let e = expr.trim().replace(/\(\s*(?:int|short|byte|uint|long|ushort|sbyte)\s*\)/g, "");
  e = e.replace(/\b0x([0-9a-fA-F]+)[uUlL]*\b/g, (_, h: string) => String(parseInt(h, 16)));
  e = e.replace(/\b(\d+)[uUlL]+\b/g, "$1");
  e = e.replace(/\b([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\b/g, (id: string) => {
    const short = id.split(".").pop()!;
    const v = scope.get(id) ?? scope.get(short);
    if (v === undefined) throw new Error(`${ctx}: unknown identifier ${id} in "${expr}"`);
    return `(${v})`;
  });
  if (!/^[\d\s()+\-*/%|&^~<>]+$/.test(e)) throw new Error(`${ctx}: unsupported expression "${expr}"`);
  const v = Function(`"use strict"; return (${e});`)() as number;
  if (!Number.isInteger(v)) throw new Error(`${ctx}: non-integer value for "${expr}"`);
  return v;
}

// ------------------------------------------------------------------------------------------------ C#

function parseCsFile(abs: string): EnumDef[] {
  const raw = readFileSync(abs, "latin1").replace(/^ï»¿/, "");
  const src = stripComments(raw);
  const rel = relative(vendor, abs).split(sep).join("/");
  const defs: EnumDef[] = [];
  const nsRe = /\bnamespace\s+([\w.]+)/g;
  const namespaces: { pos: number; name: string }[] = [];
  for (let m; (m = nsRe.exec(src)); ) namespaces.push({ pos: m.index, name: m[1]! });
  const enumRe = /\benum\s+(\w+)\s*(?::\s*\w+)?\s*\{([^}]*)\}/g;
  for (let m; (m = enumRe.exec(src)); ) {
    const name = m[1]!;
    const ns = [...namespaces].reverse().find((x) => x.pos < m!.index)?.name ?? "";
    const scope = new Map<string, number>();
    const members: Member[] = [];
    let next = 0;
    for (let part of m[2]!.split(",")) {
      part = part.replace(/\[[^\]]*\]/g, "").trim();
      if (!part) continue;
      const mm = /^([A-Za-z_]\w*)\s*(?:=\s*([\s\S]+))?$/.exec(part);
      if (!mm) throw new Error(`${rel}: cannot parse enum member "${part}"`);
      const value = mm[2] !== undefined ? evalExpr(mm[2], scope, `${rel} ${name}.${mm[1]}`) : next;
      scope.set(mm[1]!, value);
      scope.set(`${name}.${mm[1]}`, value);
      members.push({ name: mm[1]!, value });
      next = value + 1;
    }
    const seen = new Map<number, string>();
    const duplicates: string[] = [];
    for (const mem of members) {
      const prev = seen.get(mem.value);
      if (prev !== undefined) duplicates.push(`${mem.name} = ${prev} (${mem.value})`);
      else seen.set(mem.value, mem.name);
    }
    defs.push({ name, exportName: name, namespace: ns, file: rel, line: lineOf(raw, m.index), members, duplicates });
  }
  return defs;
}

function isServerCodeEnum(d: EnumDef): boolean {
  if (/Package|Packet|Cmd/i.test(d.name)) return true;
  return /^Game\.Server\/Packets\/[^/]+\.cs$/.test(d.file);
}

// ------------------------------------------------------------------------------------------------ AS3

function parseAsFile(abs: string): EnumDef | null {
  const raw = readFileSync(abs, "utf8").replace(/^﻿/, "");
  const src = stripComments(raw);
  const rel = relative(vendor, abs).split(sep).join("/");
  const cls = /\bclass\s+(\w+)/.exec(src)?.[1];
  const pkg = /\bpackage\s+([\w.]*)/.exec(src)?.[1] ?? "";
  if (!cls) return null;
  const scope = new Map<string, number>();
  const members: Member[] = [];
  const re = /\bpublic\s+static\s+const\s+(\w+)\s*:\s*(?:int|uint|Number)\s*=\s*([^;]+);/g;
  for (let m; (m = re.exec(src)); ) {
    const value = evalExpr(m[2]!, scope, `${rel} ${cls}.${m[1]}`);
    scope.set(m[1]!, value);
    scope.set(`${cls}.${m[1]}`, value);
    members.push({ name: m[1]!, value });
  }
  if (members.length === 0) return null;
  const seen = new Map<number, string>();
  const duplicates: string[] = [];
  for (const mem of members) {
    const prev = seen.get(mem.value);
    if (prev !== undefined) duplicates.push(`${mem.name} = ${prev} (${mem.value})`);
    else seen.set(mem.value, mem.name);
  }
  return { name: cls, exportName: cls, namespace: pkg, file: rel, line: 1, members, duplicates };
}

// ------------------------------------------------------------------------------------------------ emit

const HEADER = (what: string) =>
  `// AUTO-GENERATED by scripts/extract-codes.ts from vendor/DDTank41 (${what}). DO NOT EDIT.\n` +
  `// Regenerate: pnpm --filter @ddt/protocol extract-codes\n/* eslint-disable */\n\n`;

function emitEnum(d: EnumDef): string {
  let s = `/**\n * ${d.namespace ? d.namespace + "." : ""}${d.name} — ${d.file}${d.line > 1 ? `:${d.line}` : ""}\n`;
  if (d.duplicates.length) s += ` * Duplicate values (aliases): ${d.duplicates.join("; ")}\n`;
  s += ` */\nexport const ${d.exportName} = {\n`;
  for (const m of d.members) s += `  ${m.name}: ${m.value},\n`;
  s += `} as const;\nexport type ${d.exportName} = (typeof ${d.exportName})[keyof typeof ${d.exportName}];\n\n`;
  return s;
}

function assignExportNames(defs: EnumDef[]): void {
  const count = new Map<string, number>();
  for (const d of defs) count.set(d.name, (count.get(d.name) ?? 0) + 1);
  for (const d of defs) {
    if (count.get(d.name)! > 1) {
      const tag = d.file.replace(/\.(cs|as)$/, "").split("/").slice(-2, -1)[0]!.replace(/[^\w]/g, "_");
      d.exportName = `${d.name}_${tag}`;
    }
  }
}

function fileSlug(project: string): string {
  return project.replace(/\./g, "-").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  const csFiles = walk(vendor, (p) => p.endsWith(".cs") && !p.includes(`${sep}Source Flash${sep}`));
  const byProject = new Map<string, EnumDef[]>();
  for (const f of csFiles) {
    for (const d of parseCsFile(f)) {
      if (!isServerCodeEnum(d)) continue;
      const project = d.file.split("/")[0]!;
      if (!byProject.has(project)) byProject.set(project, []);
      byProject.get(project)!.push(d);
    }
  }
  const index: string[] = [];
  const manifest: Record<string, { file: string; source: string; members: number }[]> = {};
  for (const [project, defs] of [...byProject].sort(([a], [b]) => a.localeCompare(b))) {
    assignExportNames(defs);
    const slug = fileSlug(project);
    let out = HEADER(`C# project ${project}`);
    for (const d of defs) out += emitEnum(d);
    writeFileSync(join(outDir, `${slug}.ts`), out);
    const nsName = project.replace(/\./g, "");
    index.push(`export * as ${nsName} from "./${slug}.js";`);
    manifest[`${slug}.ts`] = defs.map((d) => ({ file: d.exportName, source: `${d.file}:${d.line}`, members: d.members.length }));
  }

  const asRoot = join(vendor, "Source Flash/src");
  const asFiles = walk(asRoot, (p) => /(PackageType|PackageInType|CmdType)\.as$/.test(p));
  const asDefs = asFiles.map(parseAsFile).filter((d): d is EnumDef => d !== null);
  assignExportNames(asDefs);
  let clientOut = HEADER('AS3 client "Source Flash/src"');
  for (const d of asDefs) clientOut += emitEnum(d);
  writeFileSync(join(outDir, "client.ts"), clientOut);
  index.push(`export * as Client from "./client.js";`);
  manifest["client.ts"] = asDefs.map((d) => ({ file: d.exportName, source: d.file, members: d.members.length }));

  const idx =
    HEADER("index") +
    index.join("\n") +
    `\n\n/** All names that map to \`value\` in a generated code object (several when the C# enum has aliases). */\n` +
    `export function codeNames(codes: Readonly<Record<string, number>>, value: number): string[] {\n` +
    `  return Object.keys(codes).filter((k) => codes[k] === value);\n}\n\n` +
    `/** First name for \`value\`, or \`undefined\`. */\n` +
    `export function codeName(codes: Readonly<Record<string, number>>, value: number): string | undefined {\n` +
    `  for (const k in codes) if (codes[k] === value) return k;\n  return undefined;\n}\n`;
  writeFileSync(join(outDir, "index.ts"), idx);
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  const total = [...byProject.values()].flat().length;
  console.log(`C#: ${total} enums in ${byProject.size} projects; AS3: ${asDefs.length} classes -> ${relative(pkgRoot, outDir)}`);
}

main();
