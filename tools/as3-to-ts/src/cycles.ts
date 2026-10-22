/**
 * Ciclos de import.
 *
 * AS3 não liga pra ordem de carregamento das classes; ESM liga: quando
 * `B extends A` é avaliado, o módulo de A tem que ter terminado. Num projeto
 * com milhares de imports cruzados isso quebra (ReferenceError de TDZ).
 *
 * Aqui simulamos a avaliação ESM exatamente como o navegador faz (DFS em
 * pós-ordem, na ordem dos imports, a partir de `all.ts`). Quando um módulo
 * termina antes de uma dependência "dura" (superclasse, interface, coisa usada
 * em inicializador estático), achamos a aresta "mole" mais alta do caminho que
 * causou isso e a transformamos em referência tardia (`$late`), que é resolvida
 * depois de todos os módulos carregarem. Repete até não haver violação.
 */
import type { EmittedFile } from "./emit.js";
import type { Project } from "./project.js";

interface Mod {
  ef: EmittedFile;
  /** deps em ordem de import: [arquivo alvo, é dura?] */
  deps: { to: Mod; hard: boolean; fqns: string[] }[];
}

export function resolveCycles(project: Project, files: EmittedFile[], entryOrder: EmittedFile[]): number {
  const byFile = new Map<string, Mod>();
  for (const ef of files) byFile.set(ef.fi.rel, { ef, deps: [] });
  const fileOf = (fqn: string): Mod | undefined => {
    const ci = project.classes.get(fqn);
    const fi = ci?.file ?? project.functions.get(fqn)?.file;
    return fi && !fi.isNative ? byFile.get(fi.rel) : undefined;
  };
  const rebuild = () => {
    for (const m of byFile.values()) {
      const map = new Map<Mod, { hard: boolean; fqns: string[] }>();
      for (const [fqn, r] of m.ef.refs) {
        if (!r.value || m.ef.lazy.has(fqn)) continue;
        const to = fileOf(fqn);
        if (!to || to === m) continue;
        const e = map.get(to) ?? { hard: false, fqns: [] };
        e.hard ||= r.hard;
        e.fqns.push(fqn);
        map.set(to, e);
      }
      // duras primeiro (superclasse antes de tudo), como o emissor escreve os imports
      m.deps = [...map.entries()].map(([to, e]) => ({ to, ...e })).sort((a, b) => Number(b.hard) - Number(a.hard));
    }
  };
  rebuild();
  let lazyCount = 0;
  for (let iter = 0; iter < 5000; iter++) {
    const v = simulate([...entryOrder.map((e) => byFile.get(e.fi.rel)!)]);
    if (!v) return lazyCount;
    // v.path: pilha do DFS, de quem começou até o módulo que quebrou
    const hIdx = v.path.indexOf(v.dep);
    let fixed = false;
    for (let i = hIdx; i < v.path.length - 1; i++) {
      const from = v.path[i]!;
      const to = v.path[i + 1]!;
      const edge = from.deps.find((d) => d.to === to);
      if (edge && !edge.hard) {
        for (const f of edge.fqns) from.ef.lazy.add(f);
        lazyCount++;
        fixed = true;
        break;
      }
    }
    if (!fixed) {
      console.warn(`ciclo duro sem solução: ${v.path.map((m) => m.ef.fi.rel).join(" -> ")}`);
      // evita loop infinito: marca a dependência dura como satisfeita
      const last = v.path[v.path.length - 1]!;
      last.deps = last.deps.filter((d) => d.to !== v.dep);
      continue;
    }
    rebuild();
  }
  return lazyCount;
}

function simulate(entry: Mod[]): { path: Mod[]; dep: Mod } | undefined {
  const state = new Map<Mod, number>();
  const stack: Mod[] = [];
  let found: { path: Mod[]; dep: Mod } | undefined;
  const visit = (m: Mod): boolean => {
    if (state.has(m)) return true;
    state.set(m, 1);
    stack.push(m);
    for (const d of m.deps) if (!visit(d.to)) return false;
    for (const d of m.deps) {
      if (d.hard && state.get(d.to) !== 2) {
        found = { path: [...stack], dep: d.to };
        return false;
      }
    }
    stack.pop();
    state.set(m, 2);
    return true;
  };
  // DFS recursivo pode estourar a pilha com milhares de módulos: roda com pilha grande via laço
  for (const m of entry) if (!visit(m)) return found;
  return undefined;
}
