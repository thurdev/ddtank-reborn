/**
 * Ponto de entrada do transpilador.
 *
 *   pnpm --filter @ddt/as3-to-ts build-client [--only <prefixo>]
 *
 * Lê `vendor/DDTank41/Source Flash/src/**.as` + a API do Flash
 * (`tools/as3-to-ts/playerglobal`), gera `apps/client/src/game/**.ts` e
 * `apps/client/src/game/all.ts` (carrega todos os módulos na ordem certa).
 * Relatório de avisos em `apps/client/src/game/TRANSPILE-REPORT.md`.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCycles } from "./cycles.js";
import { emitFile, RUNTIME_MODULE, type EmittedFile } from "./emit.js";
import { AS3_ROOT, listAs } from "./parse-all.js";
import { Project, type ClassInfo, type FunctionInfo } from "./project.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PG_ROOT = join(HERE, "../playerglobal");
const OUT_ROOT = join(HERE, "../../../apps/client/src/game");

function rel(root: string, p: string): string {
  return p.slice(root.length).replace(/^[\\/]/, "").replace(/\\/g, "/");
}

function main(): void {
  const t0 = Date.now();
  const project = new Project();
  for (const f of listAs(PG_ROOT)) project.addFile(rel(PG_ROOT, f), readFileSync(f, "utf8"), true);
  const gameFiles = listAs(AS3_ROOT).filter((f) => !/_flash_display_Sprite\.as$/.test(f));
  for (const f of gameFiles) project.addFile(rel(AS3_ROOT, f), readFileSync(f, "utf8"), false);
  project.link();
  console.log(`parse+link: ${Date.now() - t0}ms, ${project.classes.size} classes`);

  const emitted: EmittedFile[] = [];
  for (const fi of project.files) {
    if (fi.isNative) continue;
    try {
      emitted.push(emitFile(project, fi));
    } catch (e) {
      console.error(`ERRO emitindo ${fi.rel}: ${(e as Error).stack}`);
    }
  }
  console.log(`emit: ${Date.now() - t0}ms`);

  // ordem do all.ts: raízes da hierarquia primeiro
  const depth = (ci: ClassInfo | undefined): number => {
    let d = 0;
    for (let a = ci; a; a = project.superOf(a)) d++;
    return d;
  };
  const entryOrder = [...emitted].sort((a, b) => {
    const da = Math.min(...a.fi.classes.map(depth), 99);
    const db = Math.min(...b.fi.classes.map(depth), 99);
    return da - db || a.outRel.localeCompare(b.outRel);
  });
  const lazy = resolveCycles(project, emitted, entryOrder);
  console.log(`ciclos: ${lazy} arestas tardias, ${Date.now() - t0}ms`);

  rmSync(OUT_ROOT, { recursive: true, force: true });
  const warnings: string[] = [];
  for (const ef of emitted) {
    const code = renderModule(project, ef);
    const out = join(OUT_ROOT, ef.outRel + ".ts");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, code);
    warnings.push(...ef.warnings);
  }
  const all = [
    "// GERADO por tools/as3-to-ts — não edite. Carrega todos os módulos do jogo na ordem certa",
    "// e resolve as referências tardias (ciclos de import). Ver docs/client-pixi/TRANSPILADOR.md.",
    `import { $runLate } from "${RUNTIME_MODULE}";`,
    ...entryOrder.map((ef) => `import "./${ef.outRel}";`),
    "$runLate();",
    "",
  ].join("\n");
  writeFileSync(join(OUT_ROOT, "all.ts"), all);

  const counts = new Map<string, number>();
  for (const w of warnings) {
    const k = w.replace(/^[^:]+:\d+: /, "");
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  writeFileSync(join(OUT_ROOT, "TRANSPILE-REPORT.md"), [
    "# Relatório do transpilador (gerado)",
    "",
    `- Arquivos: ${emitted.length}`,
    `- Arestas de import tardias (ciclos): ${lazy}`,
    `- Avisos: ${warnings.length}`,
    "",
    "## Avisos agrupados",
    "",
    ...top.map(([k, n]) => `- ${n}× ${k}`),
    "",
  ].join("\n"));
  console.log(`ok: ${emitted.length} arquivos, ${warnings.length} avisos, ${Date.now() - t0}ms`);
}

/** especificador de import pra uma classe/função */
function specFor(project: Project, ef: EmittedFile, info: ClassInfo | FunctionInfo): { spec: string; name: string } {
  if (info.isNative) {
    const parts = info.pkg.split(".");
    if (parts[0] === "flash") parts.shift();
    const isFn = !("instance" in info);
    return { spec: `@ddt/flash/${parts.join("/")}/${isFn ? "functions" : info.name}`, name: info.name };
  }
  const target = info.file!.rel.replace(/\.as$/, "");
  let r = posix.relative(posix.dirname(ef.outRel), target);
  if (!r.startsWith(".")) r = "./" + r;
  return { spec: r, name: info.name };
}

function renderModule(project: Project, ef: EmittedFile): string {
  const lines: string[] = [];
  lines.push(`// Gerado de \`${ef.fi.rel}\` (vendor/DDTank41/Source Flash/src) por tools/as3-to-ts.`);
  lines.push("// Código-fonte do jogo em TS: pode editar à vontade depois do congelamento (ver docs/client-pixi/TRANSPILADOR.md).");
  lines.push("/* eslint-disable */");
  if (ef.runtime.size) lines.push(`import { ${[...ef.runtime].sort().join(", ")} } from "${RUNTIME_MODULE}";`);
  const valueBySpec = new Map<string, string[]>();
  const typeBySpec = new Map<string, string[]>();
  const lazyLines: string[] = [];
  const hardFirst = [...ef.refs.entries()].sort((a, b) => Number(b[1].hard) - Number(a[1].hard));
  for (const [fqn, r] of hardFirst) {
    const info = project.classes.get(fqn) ?? project.functions.get(fqn);
    if (!info) continue;
    const { spec, name } = specFor(project, ef, info);
    const b = ef.bindings.get(fqn) ?? name;
    const imp = b === name ? name : `${name} as ${b}`;
    if (r.value && ef.lazy.has(fqn)) {
      const ns = `$lazy_${b}`;
      lazyLines.push(`import type * as ${ns} from "${spec}";`);
      lazyLines.push(`let ${b}!: typeof ${ns}.${name}; type ${b} = ${ns}.${name};`);
      lazyLines.push(`$late(() => { ${b} = $cls(${JSON.stringify(info.fqn)}); });`);
      continue;
    }
    const m = r.value ? valueBySpec : typeBySpec;
    const arr = m.get(spec) ?? [];
    arr.push(imp);
    m.set(spec, arr);
  }
  for (const [spec, names] of valueBySpec) lines.push(`import { ${names.join(", ")} } from "${spec}";`);
  for (const [spec, names] of typeBySpec) lines.push(`import type { ${names.join(", ")} } from "${spec}";`);
  if (lazyLines.length) {
    lines.push(`import { $late, $cls } from "${RUNTIME_MODULE}";`);
    lines.push("// referências resolvidas depois que todos os módulos carregam (ciclo de import)");
    lines.push(...lazyLines);
  }
  lines.push("");
  lines.push(ef.body);
  return lines.join("\n");
}

main();
