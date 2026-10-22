/**
 * Tabela de símbolos do projeto inteiro: todas as classes/interfaces/funções
 * do jogo (fonte AS3) + a API do Flash Player (`playerglobal/`, stubs
 * descompilados do playerglobal32_0.swc).
 *
 * O emissor usa isso pra:
 * - saber se `foo` dentro de um método é `this.foo`, `Classe.foo`, um import…
 * - saber se `obj.metodo` (sem chamar) precisa virar closure ligada (`$m`);
 * - inferir tipos (int, XML, Dictionary…) pras conversões semânticas;
 * - renomear membros `private` que colidem na hierarquia (em AS3 cada classe
 *   tem o seu `private var _x`; em JS seriam a mesma propriedade).
 */
import { readFileSync } from "node:fs";
import type { ClassDecl, Decl, InterfaceDecl, MethodMember, Program, TypeRef } from "./ast.js";
import { parse } from "./parser.js";

export type MemberKind = "field" | "const" | "method" | "accessor";

export interface MemberInfo {
  name: string;
  /** nome emitido (≠ name quando private renomeado) */
  emitName: string;
  kind: MemberKind;
  isStatic: boolean;
  access: string;
  /** tipo do campo / retorno do método / tipo do getter */
  type?: TypeRef;
  hasGet?: boolean;
  hasSet?: boolean;
  owner: ClassInfo;
}

export interface ClassInfo {
  fqn: string;
  pkg: string;
  name: string;
  isInterface: boolean;
  /** veio do playerglobal (implementado à mão em @ddt/flash) */
  isNative: boolean;
  /** classe auxiliar privada do arquivo (fora do package) */
  isFilePrivate: boolean;
  extendsFqn?: string;
  implementsFqn: string[];
  instance: Map<string, MemberInfo>;
  statics: Map<string, MemberInfo>;
  decl?: ClassDecl | InterfaceDecl;
  file?: FileInfo;
  dynamic: boolean;
}

export interface FunctionInfo {
  fqn: string;
  pkg: string;
  name: string;
  isNative: boolean;
  isVar: boolean;
  type?: TypeRef;
  file?: FileInfo;
}

export interface FileInfo {
  /** caminho relativo ao root AS3 (ex.: `ddt/manager/SocketManager.as`) */
  rel: string;
  prog: Program;
  isNative: boolean;
  /** definições principais do arquivo */
  classes: ClassInfo[];
  functions: FunctionInfo[];
  privateClasses: Map<string, ClassInfo>;
}

export class Project {
  readonly classes = new Map<string, ClassInfo>();
  readonly functions = new Map<string, FunctionInfo>();
  readonly packages = new Set<string>();
  readonly files: FileInfo[] = [];
  /** filhos diretos por fqn (pra detectar colisões de private pra baixo) */
  readonly children = new Map<string, string[]>();

  addFile(rel: string, src: string, isNative: boolean): FileInfo {
    const prog = parse(src, rel);
    const fi: FileInfo = { rel, prog, isNative, classes: [], functions: [], privateClasses: new Map() };
    const add = (d: Decl, pkg: string, filePrivate: boolean) => {
      if (d.kind === "class" || d.kind === "interface") {
        const ci = this.makeClass(d, pkg, isNative, filePrivate, fi);
        if (filePrivate) fi.privateClasses.set(d.name, ci);
        else { fi.classes.push(ci); this.classes.set(ci.fqn, ci); }
      } else if (d.kind === "function") {
        const f: FunctionInfo = { fqn: pkg ? `${pkg}.${d.name}` : d.name, pkg, name: d.name, isNative, isVar: false, type: d.fn.returnType, file: fi };
        if (!filePrivate) { fi.functions.push(f); this.functions.set(f.fqn, f); }
      } else if (d.kind === "var") {
        for (const v of d.decls) {
          const f: FunctionInfo = { fqn: pkg ? `${pkg}.${v.name}` : v.name, pkg, name: v.name, isNative, isVar: true, type: v.type, file: fi };
          if (!filePrivate) { fi.functions.push(f); this.functions.set(f.fqn, f); }
        }
      } else if (d.kind === "namespace") {
        const f: FunctionInfo = { fqn: pkg ? `${pkg}.${d.name}` : d.name, pkg, name: d.name, isNative, isVar: true, file: fi };
        if (!filePrivate) { fi.functions.push(f); this.functions.set(f.fqn, f); }
      }
    };
    for (const d of prog.decls) add(d, prog.pkg, false);
    for (const d of prog.privateDecls) add(d, prog.pkg, true);
    let p = prog.pkg;
    while (p) { this.packages.add(p); p = p.includes(".") ? p.slice(0, p.lastIndexOf(".")) : ""; }
    this.files.push(fi);
    return fi;
  }

  private makeClass(d: ClassDecl | InterfaceDecl, pkg: string, isNative: boolean, filePrivate: boolean, fi: FileInfo): ClassInfo {
    const ci: ClassInfo = {
      fqn: pkg ? `${pkg}.${d.name}` : d.name,
      pkg, name: d.name, isInterface: d.kind === "interface", isNative, isFilePrivate: filePrivate,
      implementsFqn: [], instance: new Map(), statics: new Map(), decl: d, file: fi,
      dynamic: d.mods.isDynamic,
    };
    if (filePrivate) ci.fqn = `${pkg ? pkg + "." : ""}${fi.rel.replace(/\.as$/, "").replace(/[\\/]/g, ".")}$${d.name}`;
    const members = d.kind === "class" ? d.members : d.members;
    for (const m of members) {
      const map = m.mods.isStatic ? ci.statics : ci.instance;
      if (m.kind === "field") {
        map.set(m.name, { name: m.name, emitName: m.name, kind: m.isConst ? "const" : "field", isStatic: m.mods.isStatic, access: m.mods.access, type: m.type, owner: ci });
      } else {
        const mm = m as MethodMember;
        if (mm.fn.name === d.name && !mm.accessor && !m.mods.isStatic && d.kind === "class") continue; // construtor
        const prev = map.get(m.name);
        if (mm.accessor) {
          const type = mm.accessor === "get" ? mm.fn.returnType : mm.fn.params[0]?.type;
          const info = prev && prev.kind === "accessor" ? prev : { name: m.name, emitName: m.name, kind: "accessor" as const, isStatic: m.mods.isStatic, access: m.mods.access, type, owner: ci };
          if (mm.accessor === "get") { info.hasGet = true; info.type = mm.fn.returnType ?? info.type; }
          else info.hasSet = true;
          map.set(m.name, info);
        } else {
          map.set(m.name, { name: m.name, emitName: m.name, kind: "method", isStatic: m.mods.isStatic, access: m.mods.access, type: mm.fn.returnType, owner: ci });
        }
      }
    }
    return ci;
  }

  /** Resolve nomes de extends/implements pra fqn (depois de carregar tudo). */
  link(): void {
    for (const fi of this.files) {
      const all = [...fi.classes, ...fi.privateClasses.values()];
      for (const ci of all) {
        const d = ci.decl!;
        const res = (n: string) => this.resolveTypeName(n, fi, ci.isFilePrivate)?.fqn;
        if (d.kind === "class") {
          if (d.extends) ci.extendsFqn = res(d.extends) ?? d.extends;
          ci.implementsFqn = d.implements.map((n) => res(n) ?? n);
        } else {
          ci.implementsFqn = d.extends.map((n) => res(n) ?? n);
        }
        if (!ci.extendsFqn && !ci.isInterface && ci.fqn !== "Object") ci.extendsFqn = "Object";
        if (ci.extendsFqn) {
          const arr = this.children.get(ci.extendsFqn) ?? [];
          arr.push(ci.fqn);
          this.children.set(ci.extendsFqn, arr);
        }
        if (ci.isFilePrivate) this.classes.set(ci.fqn, ci);
      }
    }
    this.renamePrivates();
  }

  /**
   * AS3: `private var _x` de uma classe filha é outro slot que o `_x` da mãe.
   * Em JS seria a mesma propriedade. Renomeia o private pra `_x$Classe`
   * quando o nome aparece em qualquer ancestral ou descendente.
   */
  private renamePrivates(): void {
    for (const ci of this.classes.values()) {
      if (ci.isNative || ci.isInterface) continue;
      for (const m of ci.instance.values()) {
        if (m.access !== "private") continue;
        if (this.nameUsedInHierarchy(ci, m.name)) m.emitName = `${m.name}$${ci.name}`;
      }
    }
  }

  private nameUsedInHierarchy(ci: ClassInfo, name: string): boolean {
    for (let a = this.superOf(ci); a; a = this.superOf(a)) if (a.instance.has(name)) return true;
    const stack = [...(this.children.get(ci.fqn) ?? [])];
    while (stack.length) {
      const c = this.classes.get(stack.pop()!);
      if (!c) continue;
      if (c.instance.has(name)) return true;
      stack.push(...(this.children.get(c.fqn) ?? []));
    }
    return false;
  }

  superOf(ci: ClassInfo): ClassInfo | undefined {
    return ci.extendsFqn ? this.classes.get(ci.extendsFqn) : undefined;
  }

  /** procura membro de instância subindo a hierarquia (e interfaces, pra tipos interface) */
  findInstance(ci: ClassInfo | undefined, name: string): MemberInfo | undefined {
    const seen = new Set<string>();
    const walk = (c: ClassInfo | undefined): MemberInfo | undefined => {
      for (let a = c; a; a = this.superOf(a)) {
        if (seen.has(a.fqn)) return undefined;
        seen.add(a.fqn);
        const m = a.instance.get(name);
        if (m) return m;
        if (a.isInterface) {
          for (const i of a.implementsFqn) { const r = walk(this.classes.get(i)); if (r) return r; }
        }
      }
      return undefined;
    };
    return walk(ci);
  }

  findStatic(ci: ClassInfo | undefined, name: string): MemberInfo | undefined {
    for (let a = ci; a; a = this.superOf(a)) {
      const m = a.statics.get(name);
      if (m) return m;
    }
    return undefined;
  }

  isSubclass(ci: ClassInfo | undefined, fqn: string): boolean {
    for (let a = ci; a; a = this.superOf(a)) if (a.fqn === fqn) return true;
    return false;
  }

  /**
   * Resolve um nome de tipo/classe visto num arquivo: fqn direto, import
   * explícito, import `*`, mesmo pacote, classe privada do arquivo, top-level.
   */
  resolveTypeName(name: string, fi: FileInfo, preferPrivate = true): ClassInfo | undefined {
    if (name.includes(".")) return this.classes.get(name);
    if (preferPrivate) { const p = fi.privateClasses.get(name); if (p) return p; }
    const imports = [...fi.prog.imports, ...fi.prog.privateImports];
    for (const imp of imports) if (imp.endsWith("." + name)) { const c = this.classes.get(imp); if (c) return c; }
    const pk = fi.prog.pkg ? `${fi.prog.pkg}.${name}` : name;
    if (this.classes.has(pk)) return this.classes.get(pk);
    for (const imp of imports) if (imp.endsWith(".*")) { const c = this.classes.get(imp.slice(0, -1) + name); if (c) return c; }
    if (!preferPrivate) { const p = fi.privateClasses.get(name); if (p) return p; }
    return this.classes.get(name);
  }

  resolveFunctionName(name: string, fi: FileInfo): FunctionInfo | undefined {
    const imports = [...fi.prog.imports, ...fi.prog.privateImports];
    for (const imp of imports) if (imp.endsWith("." + name)) { const f = this.functions.get(imp); if (f) return f; }
    const pk = fi.prog.pkg ? `${fi.prog.pkg}.${name}` : name;
    if (this.functions.has(pk)) return this.functions.get(pk);
    for (const imp of imports) if (imp.endsWith(".*")) { const f = this.functions.get(imp.slice(0, -1) + name); if (f) return f; }
    return this.functions.get(name);
  }
}

export function loadFile(p: string): string {
  return readFileSync(p, "utf8");
}
