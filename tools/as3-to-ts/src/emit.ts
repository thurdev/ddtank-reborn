/**
 * Emissor AS3 → TypeScript.
 *
 * Gera um módulo TS por arquivo .as, preservando nomes, estrutura e
 * comentários, e convertendo a semântica do AS3 que o JS não tem:
 *
 * | AS3                                   | TS gerado                                   |
 * |---------------------------------------|---------------------------------------------|
 * | `foo` (membro implícito)              | `this.foo` / `Classe.foo`                   |
 * | `addEventListener(E, onX)` (closure)  | `$m(this, "onX")` (bind estável/cacheado)   |
 * | `var i:int = a / 2`                   | `var i: number = int(a / 2)`                |
 * | `x as T` / `x is T`                   | `$as(x, T)` / `$is(x, T)`                   |
 * | `xml.@id`, `xml..Item`, `xml.(@a==1)` | `xml.attribute("id")`, `.descendants`, `.filter` |
 * | `dict[obj]` (Dictionary)              | `dict.get(obj)` / `dict.set(obj, v)`        |
 * | `for each (v in o)`                   | `for (v of $each(o))`                       |
 * | campos com inicializador              | `$class(..., { fields() {...} })` — rodam ANTES do construtor da mãe, como no AS3 |
 * | `private` que colide na hierarquia    | renomeado `nome$Classe`                     |
 *
 * O emissor roda em duas fases: (1) gera o corpo de cada arquivo e anota
 * quais classes cada módulo usa em tempo de execução; (2) depois da análise
 * de ciclos (cycles.ts) escreve os imports.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type {
  ClassDecl, Expr, FieldMember, FunctionNode, InterfaceDecl, MethodMember, Param, Stmt, TypeRef, VarDeclarator,
} from "./ast.js";
import type { ClassInfo, FileInfo, MemberInfo, Project } from "./project.js";
import {
  ANY, ARRAY_T, AS3_RUNTIME_GLOBALS, BOOLEAN, INT, isIntT, isNumT, isVectorT, isXmlT, JS_GLOBALS, NUMBER,
  RESERVED_LOCALS, STRING, STRING_METHODS, UINT, XML_METHODS, XML_T, XMLLIST_T, type RType,
} from "./types.js";

export const RUNTIME_MODULE = "@ddt/flash/as3";

/**
 * Textos fixos no código AS3 (vietnamita) → PT-BR. Só literais string que
 * batem EXATAMENTE com uma chave de `i18n/strings.pt-BR.json` são trocados.
 * Textos que vêm do `language.txt` não passam por aqui (já são traduzidos lá).
 */
const STRINGS_PT: Record<string, string> = JSON.parse(
  readFileSync(fileURLToPath(new URL("../i18n/strings.pt-BR.json", import.meta.url)), "utf8"),
);

/** literal AS3 cru ('x' ou "x") → texto; troca pela tradução se houver */
function translateLiteral(raw: string): string {
  const q = raw[0];
  if (q !== '"' && q !== "'") return raw;
  let text: string;
  try { text = new Function(`return ${raw}`)() as string; } catch { return raw; }
  const pt = STRINGS_PT[text];
  return pt === undefined ? raw : JSON.stringify(pt);
}

export interface RefInfo {
  /** usado como valor (não só tipo) */
  value: boolean;
  /** usado durante a avaliação do módulo (extends, estáticos) — não pode ser lazy */
  hard: boolean;
}

export interface EmittedFile {
  fi: FileInfo;
  /** caminho do .ts gerado relativo a `apps/client/src/game` (sem extensão) */
  outRel: string;
  body: string;
  refs: Map<string, RefInfo>;
  /** nome local de cada fqn referenciado */
  bindings: Map<string, string>;
  runtime: Set<string>;
  /** fqns resolvidos em tempo de execução (quebra de ciclo) — preenchido por cycles.ts */
  lazy: Set<string>;
  warnings: string[];
}

interface Scope {
  vars: Map<string, RType>;
  /** nome emitido (renomeado se reservado) */
  rename: Map<string, string>;
  parent?: Scope;
  /** fronteira de função (var hoisting) */
  fn?: FnCtx;
}

interface FnCtx {
  /** nomes já declarados com `var` nesta função */
  declared: Set<string>;
  /** defaults a içar pro topo (declarações sem init dentro de loops) */
  hoisted: string[];
  returnType?: RType;
  /** função aninhada (arrow) — this continua sendo a instância */
  nested: boolean;
  usesArguments?: boolean;
}

const PREC: Record<string, number> = {
  ",": 1, "=": 2, "?": 3, "||": 4, "&&": 5, "|": 6, "^": 7, "&": 8,
  "==": 9, "!=": 9, "===": 9, "!==": 9,
  "<": 10, ">": 10, "<=": 10, ">=": 10, instanceof: 10, in: 10,
  "<<": 11, ">>": 11, ">>>": 11, "+": 12, "-": 12, "*": 13, "/": 13, "%": 13,
};

export function outRelFor(fi: FileInfo): string {
  return fi.rel.replace(/\\/g, "/").replace(/\.as$/, "");
}

export function emitFile(project: Project, fi: FileInfo): EmittedFile {
  return new FileEmitter(project, fi).run();
}

class FileEmitter {
  private out: string[] = [];
  private ind = 0;
  private refs = new Map<string, RefInfo>();
  private bindings = new Map<string, string>();
  private usedBindingNames = new Map<string, string>();
  private runtime = new Set<string>();
  private warnings: string[] = [];
  private cls?: ClassInfo;
  private staticCtx = false;
  /** emitindo código que roda na avaliação do módulo */
  private hardCtx = false;
  private scope: Scope = { vars: new Map(), rename: new Map() };
  private filterDepth = 0;
  private outRel: string;

  constructor(private project: Project, private fi: FileInfo) {
    this.outRel = outRelFor(fi);
    // nomes das próprias classes do arquivo
    for (const c of [...fi.classes, ...fi.privateClasses.values()]) {
      this.bindings.set(c.fqn, c.name);
      this.usedBindingNames.set(c.name, c.fqn);
    }
    for (const f of fi.functions) {
      this.bindings.set(f.fqn, f.name);
      this.usedBindingNames.set(f.name, f.fqn);
    }
  }

  run(): EmittedFile {
    const prog = this.fi.prog;
    for (const c of prog.headerComments) this.line(c);
    const all = [...prog.decls, ...prog.privateDecls];
    for (const d of all) {
      const isPrivate = prog.privateDecls.includes(d);
      this.comments(d.comments);
      switch (d.kind) {
        case "class": this.emitClass(d, isPrivate); break;
        case "interface": this.emitInterface(d, isPrivate); break;
        case "function": {
          const exp = isPrivate ? "" : "export ";
          this.withHard(false, () => this.emitFunction(`${exp}function ${d.name}`, d.fn, { method: false }));
          break;
        }
        case "var": {
          const exp = isPrivate ? "" : "export ";
          this.withHard(true, () => {
            for (const v of d.decls) {
              const t = this.resolveType(v.type);
              const init = v.init ? this.coerceTo(t, v.init) : defaultValue(t);
              this.line(`${exp}${d.isConst ? "const" : "let"} ${v.name}: ${this.tsType(v.type)} = ${init};`);
            }
          });
          break;
        }
        case "namespace":
          this.line(`${isPrivate ? "" : "export "}const ${d.name} = ${d.uri ?? JSON.stringify(d.name)};`);
          break;
      }
      this.line("");
    }
    return {
      fi: this.fi, outRel: this.outRel, body: this.out.join("\n"), refs: this.refs, bindings: this.bindings,
      runtime: this.runtime, lazy: new Set(), warnings: this.warnings,
    };
  }

  // ------------------------------------------------------------ saída
  private line(s: string): void {
    if (s === "") { this.out.push(""); return; }
    const pad = "  ".repeat(this.ind);
    for (const l of s.split("\n")) this.out.push(pad + l);
  }
  private comments(cs?: string[]): void {
    if (!cs) return;
    for (const c of cs) {
      // reindenta comentário de bloco
      const lines = c.split(/\r?\n/).map((l, i) => (i === 0 ? l : l.replace(/^\s+\*/, " *").replace(/^\s+/, "")));
      this.line(lines.join("\n"));
    }
  }
  private withHard<T>(hard: boolean, f: () => T): T {
    const prev = this.hardCtx;
    this.hardCtx = hard;
    try { return f(); } finally { this.hardCtx = prev; }
  }
  private rt(name: string): string {
    this.runtime.add(name);
    return name;
  }
  private warn(msg: string, pos: number): void {
    const line = this.fi.prog ? lineOf(this.fi, pos) : 0;
    this.warnings.push(`${this.fi.rel}:${line}: ${msg}`);
  }

  // ------------------------------------------------------------ refs / imports
  /** nome local pra referenciar uma classe/função (registra import) */
  private ref(fqn: string, asValue: boolean): string {
    const ci = this.project.classes.get(fqn);
    if (ci?.isFilePrivate && ci.file === this.fi) return ci.name;
    if (ci && ci.isNative && ci.pkg === "") {
      if (JS_GLOBALS.has(ci.name)) return ci.name;
      if (AS3_RUNTIME_GLOBALS.has(ci.name)) return this.rt(ci.name);
    }
    const own = [...this.fi.classes, ...this.fi.functions].some((x) => x.fqn === fqn);
    if (!own) {
      const r = this.refs.get(fqn) ?? { value: false, hard: false };
      if (asValue) { r.value = true; if (this.hardCtx) r.hard = true; }
      this.refs.set(fqn, r);
    }
    let b = this.bindings.get(fqn);
    if (!b) {
      const simple = fqn.slice(fqn.lastIndexOf(".") + 1);
      b = simple;
      if (this.usedBindingNames.has(b) && this.usedBindingNames.get(b) !== fqn) b = fqn.replace(/\./g, "_");
      this.bindings.set(fqn, b);
      this.usedBindingNames.set(b, fqn);
    }
    return b;
  }

  // ------------------------------------------------------------ tipos
  resolveType(t: TypeRef | undefined, fi: FileInfo = this.fi): RType {
    if (!t) return ANY;
    switch (t.name) {
      case "int": case "uint": case "Number": case "String": case "Boolean": case "Array": case "Object":
      case "XML": case "XMLList": case "Function": case "Class": case "*": case "void":
        return { fqn: t.name };
      case "Vector": case "__AS3__.vec.Vector":
        return { fqn: "Vector", params: t.params?.map((p) => this.resolveType(p, fi)) };
    }
    const ci = this.project.resolveTypeName(t.name, fi);
    return ci ? { fqn: ci.fqn } : { fqn: t.name };
  }

  /** anotação TS pra um TypeRef AS3 */
  tsType(t: TypeRef | undefined): string {
    if (!t) return "any";
    switch (t.name) {
      case "int": case "uint": case "Number": return "number";
      case "String": return "string";
      case "Boolean": return "boolean";
      case "void": return "void";
      case "*": case "Object": case "Class": return "any";
      case "Array": return "any[]";
      case "Function": return "Function";
      case "XML": return this.rt("XML");
      case "XMLList": return this.rt("XMLList");
      case "Vector": case "__AS3__.vec.Vector":
        return t.params?.[0] ? `${wrapArr(this.tsType(t.params[0]))}[]` : "any[]";
    }
    const ci = this.project.resolveTypeName(t.name, this.fi);
    if (!ci) return "any";
    if (ci.isNative && ci.pkg === "") {
      if (JS_GLOBALS.has(ci.name)) return ci.name === "Error" ? "Error" : ci.name === "Date" ? "Date" : ci.name === "RegExp" ? "RegExp" : "any";
      if (AS3_RUNTIME_GLOBALS.has(ci.name)) return this.rt(ci.name);
      return "any";
    }
    return this.ref(ci.fqn, false);
  }

  private memberType(m: MemberInfo): RType {
    return this.resolveType(m.type, m.owner.file ?? this.fi);
  }

  // ------------------------------------------------------------ escopos
  private pushScope(fn?: FnCtx): void {
    this.scope = { vars: new Map(), rename: new Map(), parent: this.scope, fn };
  }
  private popScope(): void { this.scope = this.scope.parent!; }
  private fnCtx(): FnCtx | undefined {
    for (let s: Scope | undefined = this.scope; s; s = s.parent) if (s.fn) return s.fn;
    return undefined;
  }
  private declareLocal(name: string, t: RType): string {
    // AS3 var é por função: declara no escopo da função
    let s: Scope = this.scope;
    while (!s.fn && s.parent) s = s.parent;
    s.vars.set(name, t);
    const emitName = RESERVED_LOCALS.has(name) ? `${name}_` : name;
    s.rename.set(name, emitName);
    return emitName;
  }
  private lookupLocal(name: string): { type: RType; emit: string } | undefined {
    for (let s: Scope | undefined = this.scope; s; s = s.parent) {
      const t = s.vars.get(name);
      if (t) return { type: t, emit: s.rename.get(name) ?? name };
    }
    return undefined;
  }

  // ------------------------------------------------------------ classes
  private emitClass(d: ClassDecl, isPrivate: boolean): void {
    const ci = isPrivate ? this.fi.privateClasses.get(d.name)! : this.fi.classes.find((c) => c.name === d.name)!;
    this.cls = ci;
    const sup = ci.extendsFqn && ci.extendsFqn !== "Object" ? this.project.classes.get(ci.extendsFqn) : undefined;
    let ext = "";
    if (sup) ext = ` extends ${this.withHard(true, () => this.ref(sup.fqn, true))}`;
    else if (ci.extendsFqn && ci.extendsFqn !== "Object") {
      this.warn(`superclasse desconhecida ${ci.extendsFqn}`, d.pos);
    }
    this.line(`${isPrivate ? "" : "export "}class ${d.name}${ext} {`);
    this.ind++;

    // declarações de campos de instância (sem runtime; valores vão em fields())
    const instFields = d.members.filter((m): m is FieldMember => m.kind === "field" && !m.mods.isStatic);
    for (const f of instFields) {
      const info = ci.instance.get(f.name)!;
      this.comments(f.comments);
      this.line(`declare ${info.emitName}: ${this.tsType(f.type)};`);
    }
    if (instFields.length) this.line("");

    // estáticos
    const statFields = d.members.filter((m): m is FieldMember => m.kind === "field" && m.mods.isStatic);
    this.staticCtx = true;
    // No AS3 os estáticos de uma classe são inicializados no 1º uso da classe, não
    // ao carregar o script. Literais ficam como campo normal; o resto vira
    // inicialização preguiçosa (`$statics`, depois da classe).
    const lazyStatics: FieldMember[] = [];
    for (const f of statFields) {
      this.comments(f.comments);
      const t = this.resolveType(f.type);
      if (f.init && !isLiteral(f.init)) {
        lazyStatics.push(f);
        this.line(`declare static ${f.name}: ${this.tsType(f.type)};`);
        continue;
      }
      const init = this.withHard(true, () => (f.init ? this.coerceTo(t, f.init) : defaultValue(t)));
      this.line(`static ${f.isConst ? "readonly " : ""}${f.name}: ${this.tsType(f.type)} = ${init};`);
    }
    this.$lazyStatics = lazyStatics;
    if (statFields.length) this.line("");
    this.staticCtx = false;

    // construtor
    const ctor = d.members.find((m): m is MethodMember => m.kind === "method" && !m.accessor && !m.mods.isStatic && m.name === d.name);
    const isRootGameClass = !sup || sup.isNative;
    const movedInits = this.takePreSuperFieldInits(ctor, ci);
    // campos que já têm valor por fields() (inicializador ou atribuição movida): não viram temporária
    this.$initializedFields = new Set([
      ...d.members.filter((m): m is FieldMember => m.kind === "field" && !m.mods.isStatic && !!m.init).map((m) => m.name),
      ...movedInits.map((st: any) => (st.expr.left.kind === "member" ? st.expr.left.name : st.expr.left.name) as string),
    ]);
    if (ctor || isRootGameClass) this.emitConstructor(d, ci, ctor, !!sup, isRootGameClass);

    // métodos e accessors
    const methods = d.members.filter((m): m is MethodMember => m.kind === "method" && m !== ctor);
    for (const m of methods) {
      this.staticCtx = m.mods.isStatic;
      this.comments(m.comments);
      const info = (m.mods.isStatic ? ci.statics : ci.instance).get(m.name);
      const name = info?.emitName ?? m.name;
      const st = m.mods.isStatic ? "static " : "";
      if (m.accessor === "get") this.emitFunction(`${st}get ${name}`, m.fn, { method: true, accessor: "get" });
      else if (m.accessor === "set") this.emitFunction(`${st}set ${name}`, m.fn, { method: true, accessor: "set" });
      else this.emitFunction(`${st}${name}`, m.fn, { method: true });
      this.line("");
    }
    this.staticCtx = false;

    // AS3 permite sobrescrever só o get (ou só o set); em JS isso apaga o par
    // herdado. Completa o par delegando pra super.
    for (const info of ci.instance.values()) {
      if (info.kind !== "accessor" || !sup) continue;
      const inherited = this.project.findInstance(sup, info.name);
      if (!inherited || inherited.kind !== "accessor") continue;
      if (info.hasGet && !info.hasSet && inherited.hasSet) {
        this.line(`set ${info.emitName}(value: any) { super.${info.emitName} = value; }`);
      }
      if (info.hasSet && !info.hasGet && inherited.hasGet) {
        this.line(`get ${info.emitName}(): any { return super.${info.emitName}; }`);
      }
    }

    this.ind--;
    this.line("}");

    // registro + inicializadores de campo
    const ifaces = ci.implementsFqn.map((f) => this.project.classes.get(f)).filter((c): c is ClassInfo => !!c && !c.isNative);
    const opts: string[] = [];
    if (ifaces.length) opts.push(`implements: [${this.withHard(true, () => ifaces.map((i) => this.ref(i.fqn, true))).join(", ")}]`);
    if (instFields.length || movedInits.length) {
      const body: string[] = [];
      this.staticCtx = false;
      for (const f of instFields) {
        const info = ci.instance.get(f.name)!;
        const t = this.resolveType(f.type);
        // sem inicializador: não sobrescreve valor já posto (filho de timeline, método virtual chamado pelo construtor da mãe)
        if (!f.init) { body.push(`this.${info.emitName} ??= ${defaultValue(t)};`); continue; }
        const val = this.withScope(() => this.coerceTo(t, f.init!));
        body.push(`this.${info.emitName} = ${val};`);
      }
      if (movedInits.length) {
        const save = this.out; const saveInd = this.ind;
        this.out = []; this.ind = 0;
        this.withScope(() => { for (const st of movedInits) this.stmt(st); });
        body.push(...this.out);
        this.out = save; this.ind = saveInd;
      }
      opts.push(`fields(this: ${d.name}) {\n${body.map((b) => "  " + b).join("\n")}\n}`);
    }
    if (d.mods.isDynamic) opts.push("dynamic: true");
    // metadados pro describeType (ObjectUtils.copyProperties do pickgliss aplica estilos por eles)
    const desc: string[] = [];
    for (const m of ci.instance.values()) {
      if (m.access !== "public") continue;
      const tn = m.type ? describeTypeName(this.resolveType(m.type)) : "*";
      if (m.kind === "field") desc.push(`v:${m.emitName}:${tn}`);
      else if (m.kind === "const") desc.push(`c:${m.emitName}:${tn}`);
      else if (m.kind === "accessor") desc.push(`a:${m.emitName}:${tn}:${m.hasGet && m.hasSet ? "readwrite" : m.hasGet ? "readonly" : "writeonly"}`);
    }
    if (desc.length) opts.push(`describe: ${JSON.stringify(desc.join(";"))}`);
    const fqn = ci.isFilePrivate ? `${ci.pkg ? ci.pkg + "." : ""}${d.name}` : ci.fqn;
    this.line(`${this.rt("$class")}(${d.name}, ${JSON.stringify(fqn)}${opts.length ? `, {\n${opts.map((o) => indent(o) + ",").join("\n")}\n}` : ""});`);

    // estáticos preguiçosos (+ código solto no corpo da classe, que roda junto)
    const lazy = this.$lazyStatics;
    if (lazy.length) {
      this.staticCtx = true;
      this.line(`${this.rt("$statics")}(${d.name}, ${JSON.stringify(lazy.map((f) => f.name))}, () => {`);
      this.ind++;
      this.withScope(() => {
        for (const f of lazy) {
          this.comments(f.comments);
          this.line(`${d.name}.${f.name} = ${this.coerceTo(this.resolveType(f.type), f.init!)};`);
        }
        for (const s of d.staticInit) this.stmt(s);
      });
      this.ind--;
      this.line("});");
      this.staticCtx = false;
    } else if (d.staticInit.length) {
      // inicializador estático solto no corpo da classe (sem campos preguiçosos: roda na carga)
      this.staticCtx = true;
      this.withHard(true, () => { for (const s of d.staticInit) this.stmt(s); });
      this.staticCtx = false;
    }
    this.cls = undefined;
  }

  /**
   * Troca leituras/escritas de CAMPOS de instância (var, não getter/método) por
   * variáveis temporárias, num comando antes do super(). Anota quais foram gravados.
   */
  private rewriteFieldsToTemps(st: Stmt, tempFor: (name: string) => string, written: Set<string>): Stmt {
    const isField = (name: string) => {
      const m = this.cls && this.project.findInstance(this.cls, name);
      return !!m && (m.kind === "field" || m.kind === "const") && m.owner === this.cls;
    };
    const fieldName = (n: any): string | undefined => {
      if (n?.kind === "member" && n.obj?.kind === "this" && isField(n.name)) return n.name;
      if (n?.kind === "id" && !this.lookupLocal(n.name) && isField(n.name)) return n.name;
      return undefined;
    };
    // campo com valor inicial (fields()) lido aqui: não dá pra adiantar — o comando fica pra depois do super
    let abort = false;
    const check = (n: any): void => {
      if (abort || !n || typeof n !== "object") return;
      if (Array.isArray(n)) { n.forEach(check); return; }
      const f = fieldName(n);
      if (f && this.$initializedFields.has(f)) { abort = true; return; }
      for (const v of Object.values(n)) if (typeof v === "object") check(v);
    };
    check(st);
    if (abort) return st;
    const visit = (n: any): any => {
      if (!n || typeof n !== "object") return n;
      if (Array.isArray(n)) return n.map(visit);
      if (n.kind === "func") return n;
      if ((n.kind === "assign" || n.kind === "update") && fieldName(n.kind === "assign" ? n.left : n.arg)) {
        const f = fieldName(n.kind === "assign" ? n.left : n.arg)!;
        written.add(f);
      }
      const f = fieldName(n);
      if (f) return { kind: "id", name: tempFor(f), pos: n.pos };
      const out: any = {};
      for (const [k, v] of Object.entries(n)) out[k] = typeof v === "object" ? visit(v) : v;
      return out;
    };
    return visit(st);
  }

  /** `this.f = E` / `f = E` (f campo de instância)? devolve f */
  private preSuperFieldAssign(st: Stmt): string | undefined {
    if (st.kind !== "expr" || st.expr.kind !== "assign" || st.expr.op !== "=") return undefined;
    const l = st.expr.left;
    if (l.kind === "member" && l.obj.kind === "this") return l.name;
    if (l.kind === "id" && !this.lookupLocal(l.name) && this.cls && this.project.findInstance(this.cls, l.name)) return l.name;
    return undefined;
  }

  /**
   * argumentos do super(): `this.f` vira a temporária `$pre_f`; outras leituras
   * de membro antes do super valem o default (no AS3 o objeto já existe "vazio")
   */
  private rewritePreSuper(e: Expr, temps: Map<string, string>): Expr {
    const visit = (n: any): any => {
      if (!n || typeof n !== "object") return n;
      if (Array.isArray(n)) return n.map(visit);
      if (n.kind === "func") return n;
      if (n.kind === "member" && n.obj?.kind === "this") {
        const t = temps.get(n.name);
        return t ? { kind: "id", name: t, pos: n.pos } : { kind: "undefined", pos: n.pos };
      }
      if (n.kind === "id" && !this.lookupLocal(n.name) && this.cls && this.project.findInstance(this.cls, n.name)) {
        const t = temps.get(n.name);
        return t ? { kind: "id", name: t, pos: n.pos } : { kind: "undefined", pos: n.pos };
      }
      if (n.kind === "this") return { kind: "undefined", pos: n.pos };
      const out: any = {};
      for (const [k, v] of Object.entries(n)) out[k] = typeof v === "object" ? visit(v) : v;
      return out;
    };
    return visit(e);
  }

  /** o comando usa `this` (explícito ou membro de instância implícito)? */
  private usesThis(st: Stmt | Expr): boolean {
    let found = false;
    const visit = (n: unknown): void => {
      if (found || !n || typeof n !== "object") return;
      if (Array.isArray(n)) { for (const x of n) visit(x); return; }
      const o = n as { kind?: string; name?: unknown };
      if (o.kind === "this" || o.kind === "super") { found = true; return; }
      if (o.kind === "id" && typeof o.name === "string" && !this.lookupLocal(o.name) && this.cls && this.project.findInstance(this.cls, o.name)) { found = true; return; }
      for (const v of Object.values(n)) visit(v);
    };
    visit(st);
    return found;
  }

  /**
   * Atribuições `this.campo = expr` / `campo = expr` antes do super() no
   * construtor (o mxmlc/descompilador põe inicializadores de campo ali). Saem
   * do construtor e vão pra fields(), que roda antes de qualquer construtor —
   * mesma semântica do AS3.
   */
  private takePreSuperFieldInits(ctor: MethodMember | undefined, ci: ClassInfo): Stmt[] {
    const body = ctor?.fn.body;
    if (!body) return [];
    const idx = body.findIndex((s) => s.kind === "expr" && s.expr.kind === "call" && s.expr.callee.kind === "super");
    if (idx <= 0) return [];
    // parâmetros e variáveis locais do construtor não existem em fields(): quem usa fica onde está
    const params = new Set(ctor!.fn.params.map((p) => p.name));
    for (const s of body) if (s.kind === "var") for (const d of s.decls) params.add(d.name);
    const moved: Stmt[] = [];
    for (let i = 0; i < idx; i++) {
      const st = body[i]!;
      if (st.kind !== "expr" || st.expr.kind !== "assign" || st.expr.op !== "=") continue;
      const l = st.expr.left;
      const isField = (l.kind === "member" && l.obj.kind === "this" && ci.instance.has(l.name)) || (l.kind === "id" && ci.instance.has(l.name));
      if (!isField) continue;
      const json = JSON.stringify(st.expr.right);
      if ([...params].some((p) => json.includes(`"name":"${p}"`))) continue;
      moved.push(st);
    }
    ctor!.fn.body = body.filter((s) => !moved.includes(s));
    return moved;
  }

  private withScope<T>(f: () => T): T {
    this.pushScope({ declared: new Set(), hoisted: [], nested: false });
    try { return f(); } finally { this.popScope(); }
  }

  private emitConstructor(d: ClassDecl, ci: ClassInfo, ctor: MethodMember | undefined, hasSuper: boolean, isRoot: boolean): void {
    this.staticCtx = false;
    if (ctor) this.comments(ctor.comments);
    const fn: FunctionNode = ctor?.fn ?? { params: [], body: [], pos: d.pos };
    this.emitFunction("constructor", fn, { method: true, ctor: { hasSuper, isRoot } });
    this.line("");
  }

  private emitInterface(d: InterfaceDecl, isPrivate: boolean): void {
    const ci = isPrivate ? this.fi.privateClasses.get(d.name)! : this.fi.classes.find((c) => c.name === d.name)!;
    const exts = ci.implementsFqn.map((f) => this.project.classes.get(f)).filter((c): c is ClassInfo => !!c && !c.isNative);
    const ex = exts.length ? ` extends ${exts.map((e) => this.ref(e.fqn, false)).join(", ")}` : "";
    const exp = isPrivate ? "" : "export ";
    this.line(`${exp}interface ${d.name}${ex} {`);
    this.ind++;
    const seen = new Set<string>();
    for (const m of d.members) {
      this.comments(m.comments);
      if (m.accessor) {
        if (seen.has(m.name)) continue;
        seen.add(m.name);
        const info = ci.instance.get(m.name)!;
        this.line(`${info.hasSet ? "" : "readonly "}${m.name}: ${this.tsType(info.type)};`);
      } else {
        this.line(`${m.name}(${m.fn.params.map((p) => this.paramSig(p)).join(", ")}): ${this.tsType(m.fn.returnType)};`);
      }
    }
    this.ind--;
    this.line("}");
    const fqn = ci.fqn;
    const sup = this.withHard(true, () => exts.map((e) => this.ref(e.fqn, true)));
    this.line(`${exp}const ${d.name} = ${this.rt("$interface")}(${JSON.stringify(fqn)}${sup.length ? `, [${sup.join(", ")}]` : ""});`);
  }

  private paramSig(p: Param): string {
    if (p.rest) return `...${p.name}: any[]`;
    const opt = p.init ? "?" : "";
    return `${RESERVED_LOCALS.has(p.name) ? p.name + "_" : p.name}${opt}: ${this.tsType(p.type)}`;
  }

  // ------------------------------------------------------------ funções
  private emitFunction(
    head: string, fn: FunctionNode,
    o: { method: boolean; accessor?: "get" | "set"; ctor?: { hasSuper: boolean; isRoot: boolean }; arrow?: boolean },
  ): string | void {
    const ctx: FnCtx = { declared: new Set(), hoisted: [], returnType: this.resolveType(fn.returnType), nested: !!o.arrow, usesArguments: fn.usesArguments };
    this.pushScope(ctx);
    const params: string[] = [];
    const coerce: string[] = [];
    for (const p of fn.params) {
      const t = p.rest ? ARRAY_T : this.resolveType(p.type);
      const n = this.declareLocal(p.name, t);
      ctx.declared.add(p.name);
      if (p.rest) { params.push(`...${n}: any[]`); continue; }
      let s = `${n}: ${this.tsType(p.type)}`;
      if (p.init) s += ` = ${this.expr(p.init)}`;
      params.push(s);
      if (p.type?.name === "int") coerce.push(`${n} |= 0;`);
      else if (p.type?.name === "uint") coerce.push(`${n} >>>= 0;`);
      else if (p.type?.name === "Number") coerce.push(`${n} = +${n};`);
    }
    if (o.accessor === "set" && params.length === 0) params.push("value: any");
    const ret = o.ctor || o.accessor === "set" ? "" : `: ${this.tsType(fn.returnType)}`;
    if (fn.body === null) {
      this.popScope();
      this.line(`${head}(${params.join(", ")})${ret} { /* native */ }`);
      return;
    }
    // corpo em buffer separado (pra içar declarações)
    const saveOut = this.out;
    const saveInd = this.ind;
    this.out = [];
    // arrow: corpo relativo (vai dentro de uma expressão que passa por line())
    this.ind = o.arrow ? 1 : saveInd + 1;
    if (coerce.length) this.line(coerce.join(" "));
    // funções aninhadas: AS3 iça `function f(){}`; vira const arrow no topo
    const nestedFns = fn.body.filter((s): s is Stmt & { kind: "function" } => s.kind === "function");
    for (const nf of nestedFns) this.declareLocal(nf.fn.name!, { fqn: "Function" });
    let body = fn.body.filter((s) => s.kind !== "function");
    if (o.ctor) {
      const idx = body.findIndex((s) => s.kind === "expr" && s.expr.kind === "call" && s.expr.callee.kind === "super");
      // Em AS3 dá pra mexer em `this` antes do super(); em JS não. O que é
      // atribuição simples de campo já foi pra fields() (emitClass); o resto que
      // usa `this` vai pra logo depois do super().
      const deferred: Stmt[] = [];
      if (o.ctor.hasSuper) {
        if (idx < 0) this.line("super();");
        else {
          // Campos lidos/gravados antes do super() (inclusive dentro de if/else)
          // viram variáveis `$pre_campo`; os gravados vão pro super via $pre e o
          // $init da classe raiz grava no objeto antes de qualquer construtor rodar.
          const temps = new Map<string, string>();
          const written = new Set<string>();
          const tempFor = (name: string): string => {
            let tmp = temps.get(name);
            if (!tmp) {
              tmp = `$pre_${name}`;
              const m = this.cls && this.project.findInstance(this.cls, name);
              const t = m ? this.memberType(m) : ANY;
              this.declareLocal(tmp, t);
              this.line(`var ${tmp}: ${this.tsType(m?.type)} = ${defaultValue(t)};`);
              temps.set(name, tmp);
            }
            return tmp;
          };
          for (let i = 0; i < idx; i++) {
            const st = body[i]!;
            const rewritten = this.rewriteFieldsToTemps(st, tempFor, written);
            if (this.usesThis(rewritten)) deferred.push(st);
            else this.stmt(rewritten);
          }
          const sup = body[idx]! as Stmt & { kind: "expr" };
          const call = sup.expr as Expr & { kind: "call" };
          const args = call.args.map((a) => this.rewritePreSuper(a, temps)).map((a) => this.expr(a, 2));
          if (written.size) {
            // campos gravados antes do super(): o $init da raiz aplica antes dos construtores (ver $pre)
            const fields = [...written].map((name) => {
              const m = this.cls && this.project.findInstance(this.cls, name);
              return `${JSON.stringify(m?.emitName ?? name)}: ${temps.get(name)}`;
            });
            this.line(`super(...${this.rt("$pre")}(new.target, { ${fields.join(", ")} }, [${args.join(", ")}]) as [${args.map(() => "any").join(", ")}]);`);
          } else {
            this.line(`super(${args.join(", ")});`);
          }
        }
        body = idx < 0 ? body : body.slice(idx + 1);
      } else if (idx >= 0) {
        body = body.filter((_, i) => i !== idx); // `super()` de classe raiz (extends Object)
      }
      if (o.ctor.isRoot) this.line(`${this.rt("$init")}(this);`);
      for (const st of deferred) this.stmt(st);
    }
    for (const nf of nestedFns) {
      this.comments(nf.comments);
      const name = this.lookupLocal(nf.fn.name!)!.emit;
      const code = this.funcExpr(nf.fn);
      this.line(`const ${name} = ${code};`);
    }
    for (const s of body) this.stmt(s);
    const bodyLines = this.out;
    this.out = saveOut;
    this.ind = saveInd;
    this.popScope();

    if (o.arrow) {
      const pad = "  ";
      const hoist = ctx.hoisted.length ? [`${pad}var ${ctx.hoisted.join(", ")};`] : [];
      const argsDecl = fn.usesArguments ? "...$args: any[]" : params.join(", ");
      return `(${argsDecl})${ret} => {\n${[...hoist, ...bodyLines].join("\n")}\n}`;
    }
    this.line(`${head}(${fn.usesArguments && !o.method ? "...$args: any[]" : params.join(", ")})${ret} {`);
    if (ctx.hoisted.length) { this.ind++; this.line(`var ${ctx.hoisted.join(", ")};`); this.ind--; }
    this.out.push(...bodyLines);
    this.line("}");
  }

  /** função anônima/aninhada → arrow (mantém `this` da instância, como o escopo do AS3) */
  private funcExpr(fn: FunctionNode): string {
    return this.emitFunction("", fn, { method: false, arrow: true }) as string;
  }

  // ------------------------------------------------------------ comandos
  private stmt(s: Stmt): void {
    this.comments(s.comments);
    switch (s.kind) {
      case "block":
        this.line("{");
        this.ind++;
        for (const b of s.body) this.stmt(b);
        this.ind--;
        this.line("}");
        return;
      case "var": {
        const parts: string[] = [];
        for (const d of s.decls) {
          const r = this.varDecl(d, false);
          if (r) parts.push(r);
        }
        if (parts.length) this.line(parts.join(" ") );
        return;
      }
      case "expr":
        this.line(`${this.expr(s.expr, 0, true)};`);
        return;
      case "if": {
        this.line(`if (${this.expr(s.test)}) ${this.inlineBlock(s.then)}`);
        let e = s.else;
        while (e) {
          if (e.kind === "if" && !e.comments) {
            this.line(`else if (${this.expr(e.test)}) ${this.inlineBlock(e.then)}`);
            e = e.else;
          } else {
            this.line(`else ${this.inlineBlock(e)}`);
            e = undefined;
          }
        }
        return;
      }
      case "for": {
        this.loopDepth++;
        let init = "";
        if (s.init) {
          if (s.init.kind === "var") init = s.init.decls.map((d) => this.varDecl(d, true)).filter(Boolean).join(", ");
          else if (s.init.kind === "expr") init = this.expr(s.init.expr, 0, true);
        }
        const head = `for (${init}; ${s.test ? this.expr(s.test) : ""}; ${s.update ? this.expr(s.update, 0, true) : ""})`;
        this.line(`${head} ${this.inlineBlock(s.body)}`);
        this.loopDepth--;
        return;
      }
      case "forin": {
        this.loopDepth++;
        const rt = this.typeOf(s.right);
        let left: string;
        let keyNumeric = false;
        if ("decls" in s.left && (s.left as Stmt).kind === "var") {
          const d = (s.left as Stmt & { kind: "var" }).decls[0]!;
          const t = this.resolveType(d.type);
          keyNumeric = isNumT(t);
          const fn = this.fnCtx();
          const already = fn?.declared.has(d.name);
          const n = this.declareLocal(d.name, t);
          if (fn) fn.declared.add(d.name);
          left = already ? n : `var ${n}`;
        } else {
          const le = s.left as Expr;
          left = this.expr(le);
          keyNumeric = isNumT(this.typeOf(le));
        }
        const right = this.expr(s.right);
        let iter: string;
        if (s.each) iter = `${this.rt("$each")}(${right})`;
        else iter = `${this.rt("$keys")}(${right}${keyNumeric ? ", true" : ""})`;
        void rt;
        this.line(`for (${left} of ${iter}) ${this.inlineBlock(s.body)}`);
        this.loopDepth--;
        return;
      }
      case "while":
        this.loopDepth++;
        this.line(`while (${this.expr(s.test)}) ${this.inlineBlock(s.body)}`);
        this.loopDepth--;
        return;
      case "dowhile":
        this.loopDepth++;
        this.line(`do ${this.inlineBlock(s.body)}`);
        this.line(`while (${this.expr(s.test)});`);
        this.loopDepth--;
        return;
      case "switch":
        this.line(`switch (${this.expr(s.disc)}) {`);
        this.ind++;
        for (const c of s.cases) {
          this.comments(c.comments);
          this.line(c.test ? `case ${this.expr(c.test)}:` : "default:");
          this.ind++;
          for (const b of c.body) this.stmt(b);
          this.ind--;
        }
        this.ind--;
        this.line("}");
        return;
      case "return": {
        if (!s.arg) { this.line("return;"); return; }
        const rt = this.fnCtx()?.returnType;
        this.line(`return ${rt ? this.coerceTo(rt, s.arg) : this.expr(s.arg)};`);
        return;
      }
      case "break": this.line(`break${s.label ? " " + s.label : ""};`); return;
      case "continue": this.line(`continue${s.label ? " " + s.label : ""};`); return;
      case "throw": this.line(`throw ${this.expr(s.arg)};`); return;
      case "try": {
        this.line("try {");
        this.ind++;
        for (const b of s.block) this.stmt(b);
        this.ind--;
        if (s.handlers.length === 1 && (!s.handlers[0]!.type || ["Error", "*", "Object"].includes(s.handlers[0]!.type.name))) {
          const h = s.handlers[0]!;
          this.pushScope();
          const n = this.declareLocalBlock(h.param, this.resolveType(h.type));
          this.line(`} catch (${n}: any) {`);
          this.ind++;
          for (const b of h.body) this.stmt(b);
          this.ind--;
          this.popScope();
        } else if (s.handlers.length) {
          this.line("} catch ($err: any) {");
          this.ind++;
          s.handlers.forEach((h, i) => {
            const t = this.resolveType(h.type);
            const cond = !h.type || h.type.name === "*" || h.type.name === "Object" ? "true" : `${this.rt("$is")}($err, ${this.typeValue(t)})`;
            this.line(`${i ? "else " : ""}if (${cond}) {`);
            this.ind++;
            this.pushScope();
            const n = this.declareLocalBlock(h.param, t);
            this.line(`const ${n} = $err;`);
            for (const b of h.body) this.stmt(b);
            this.popScope();
            this.ind--;
            this.line("}");
          });
          this.line("else throw $err;");
          this.ind--;
        }
        if (s.finalizer) {
          this.line("} finally {");
          this.ind++;
          for (const b of s.finalizer) this.stmt(b);
          this.ind--;
        }
        this.line("}");
        return;
      }
      case "label":
        this.line(`${s.label}:`);
        this.stmt(s.body);
        return;
      case "empty":
        return;
      case "function": {
        const n = this.declareLocal(s.fn.name!, { fqn: "Function" });
        this.line(`const ${n} = ${this.funcExpr(s.fn)};`);
        return;
      }
      case "directive":
        return;
    }
  }

  private loopDepth = 0;
  private $lazyStatics: FieldMember[] = [];
  private $initializedFields = new Set<string>();

  private declareLocalBlock(name: string, t: RType): string {
    this.scope.vars.set(name, t);
    const n = RESERVED_LOCALS.has(name) ? `${name}_` : name;
    this.scope.rename.set(name, n);
    return n;
  }

  /** corpo de if/for/while: sempre com chaves, na mesma linha */
  private inlineBlock(s: Stmt): string {
    const saveOut = this.out;
    this.out = [];
    const saveInd = this.ind;
    this.ind = 1; // relativo: quem chama passa por line(), que soma a indentação atual
    if (s.kind === "block") for (const b of s.body) this.stmt(b);
    else this.stmt(s);
    const lines = this.out;
    this.out = saveOut;
    this.ind = saveInd;
    if (!lines.length) return "{}";
    return `{\n${lines.join("\n")}\n}`;
  }

  /**
   * `var x:T = v` — AS3 iça `var` pra função inteira e inicializa com o default
   * do tipo. 1ª declaração vira `var` no lugar; se não tem init e está num
   * loop, o default é içado (senão resetaria a cada volta).
   */
  private varDecl(d: VarDeclarator, inForInit: boolean): string {
    const fn = this.fnCtx();
    const t = this.resolveType(d.type);
    const already = fn?.declared.has(d.name) ?? false;
    const n = this.declareLocal(d.name, t);
    if (fn) fn.declared.add(d.name);
    const tsT = this.tsType(d.type);
    if (already) {
      if (!d.init) return "";
      return inForInit ? `${n} = ${this.coerceTo(t, d.init)}` : `${n} = ${this.coerceTo(t, d.init)};`;
    }
    if (!d.init) {
      if (this.loopDepth > 0 && fn && !inForInit) {
        fn.hoisted.push(`${n}: ${tsT} = ${defaultValue(t)}`);
        return "";
      }
      return inForInit ? `var ${n}: ${tsT} = ${defaultValue(t)}` : `var ${n}: ${tsT} = ${defaultValue(t)};`;
    }
    const init = this.coerceTo(t, d.init);
    return inForInit ? `var ${n}: ${tsT} = ${init}` : `var ${n}: ${tsT} = ${init};`;
  }

  // ------------------------------------------------------------ coerção
  /** expressão convertida pro tipo de destino (int/uint truncam, como no AS3) */
  coerceTo(t: RType, e: Expr): string {
    const et0 = this.typeOf(e);
    // XML/XMLList/número atribuído a String (e XML a Number) converte no AS3
    if (t.fqn === "String" && (isXmlT(et0) || isNumT(et0) || et0.fqn === "Boolean")) return `String(${this.expr(e)})`;
    // AS3 converte pra Number na atribuição (ex.: string vinda do XML em `rect.left = args[0]`)
    if (t.fqn === "Number" && !isNumT(et0) && e.kind !== "num") return `Number(${this.expr(e)})`;
    if (t.fqn === "Boolean" && et0.fqn === "XMLList") return `(${this.expr(e)}.toString() != "")`;
    if (t.fqn === "int" && !isIntT(this.typeOf(e)) && !isIntLiteral(e)) return `${this.rt("int")}(${this.expr(e)})`;
    if (t.fqn === "uint") {
      const et = this.typeOf(e);
      if (et.fqn === "uint" || (isIntLiteral(e) && !e.value.startsWith("-"))) return this.expr(e);
      return `${this.rt("uint")}(${this.expr(e)})`;
    }
    return this.expr(e, 2);
  }

  // ------------------------------------------------------------ inferência
  typeOf(e: Expr): RType {
    switch (e.kind) {
      case "num": return /^(0x[0-9a-f]+|\d+)$/i.test(e.value) && Number(e.value) <= 0x7fffffff ? INT : NUMBER;
      case "str": return STRING;
      case "bool": return BOOLEAN;
      case "xml": return XML_T;
      case "array": return ARRAY_T;
      case "regex": return { fqn: "RegExp" };
      case "paren": return this.typeOf(e.expr);
      case "this": return this.cls ? { fqn: this.cls.fqn, classRef: this.staticCtx } : ANY;
      case "super": { const s = this.cls && this.project.superOf(this.cls); return s ? { fqn: s.fqn } : ANY; }
      case "id": {
        const r = this.resolveId(e.name);
        return r.type;
      }
      case "member": {
        const ot = this.typeOf(e.obj);
        return this.memberAccessType(ot, e.name, e.obj);
      }
      case "attr": case "descendants": case "filter": return XMLLIST_T;
      case "index": {
        const ot = this.typeOf(e.obj);
        if (isVectorT(ot)) return ot.params?.[0] ?? ANY;
        if (ot.fqn === "XMLList" || ot.fqn === "XML") return XML_T;
        return ANY;
      }
      case "call": {
        const c = e.callee;
        if (c.kind === "id" || c.kind === "member" || c.kind === "vectorType") {
          const ct = c.kind === "vectorType" ? { fqn: "Vector", params: [this.resolveType(c.elem)], classRef: true } : this.typeOf(c);
          if (ct.classRef) return { fqn: ct.fqn, params: ct.params };
          if ((ct as RType & { ret?: RType }).ret) return (ct as RType & { ret?: RType }).ret!;
          if (c.kind === "member") {
            const ot = this.typeOf(c.obj);
            if (isXmlT(ot)) {
              if (["length", "childIndex"].includes(c.name)) return INT;
              if (["toString", "toXMLString", "localName", "nodeKind"].includes(c.name)) return STRING;
              if (["parent", "copy"].includes(c.name)) return XML_T;
              if (["hasOwnProperty", "contains", "hasComplexContent", "hasSimpleContent"].includes(c.name)) return BOOLEAN;
              if (c.name === "split" || c.name === "match") return ARRAY_T;
              if (["indexOf", "lastIndexOf", "charCodeAt", "search", "localeCompare"].includes(c.name)) return INT;
              if (STRING_METHODS.has(c.name)) return STRING;
              return XMLLIST_T;
            }
            if (ot.fqn === "String" && ["indexOf", "lastIndexOf", "charCodeAt", "search", "localeCompare"].includes(c.name)) return INT;
            if (ot.fqn === "String") return c.name === "split" || c.name === "match" ? ARRAY_T : STRING;
            if ((isVectorT(ot) || ot.fqn === "Array") && ["indexOf", "lastIndexOf", "push", "unshift"].includes(c.name)) return INT;
            if (isVectorT(ot) && ["pop", "shift"].includes(c.name)) return ot.params?.[0] ?? ANY;
            if (isVectorT(ot) && ["concat", "slice", "splice", "filter", "reverse", "sort"].includes(c.name)) return ot;
            if (ot.fqn === "Math" && ot.classRef) return NUMBER;
          }
        }
        return ANY;
      }
      case "new": {
        const c = e.callee;
        if (c.kind === "vectorType") return { fqn: "Vector", params: [this.resolveType(c.elem)] };
        const ct = this.typeOf(c);
        if (ct.classRef) return { fqn: ct.fqn };
        return ANY;
      }
      case "vectorLit": return { fqn: "Vector", params: [this.resolveType(e.elem)] };
      case "unary":
        if (e.op === "!" || e.op === "delete") return BOOLEAN;
        if (e.op === "typeof") return STRING;
        if (e.op === "~") return INT;
        if (e.op === "-" || e.op === "+") { const t = this.typeOf(e.arg); return isNumT(t) ? t : NUMBER; }
        return ANY;
      case "update": return this.typeOf(e.arg);
      case "binary": {
        const op = e.op;
        if (["==", "!=", "===", "!==", "<", ">", "<=", ">=", "is", "in", "instanceof"].includes(op)) return BOOLEAN;
        if (op === "as") { const t = this.typeOf(e.right); return t.classRef ? { fqn: t.fqn, params: t.params } : ANY; }
        if (["|", "&", "^", "<<", ">>"].includes(op)) return INT;
        if (op === ">>>") return UINT;
        const lt = this.typeOf(e.left);
        const rt = this.typeOf(e.right);
        if (op === "+") {
          if (lt.fqn === "String" || rt.fqn === "String") return STRING;
          if (isIntT(lt) && isIntT(rt)) return INT;
          if (isNumT(lt) && isNumT(rt)) return NUMBER;
          return ANY;
        }
        if (["-", "*", "%"].includes(op)) return isIntT(lt) && isIntT(rt) ? INT : NUMBER;
        if (op === "/") return NUMBER;
        if (op === "&&" || op === "||") return lt.fqn === rt.fqn ? lt : ANY;
        return ANY;
      }
      case "assign": return this.typeOf(e.left);
      case "cond": { const a = this.typeOf(e.then); const b = this.typeOf(e.else); return a.fqn === b.fqn ? a : isIntT(a) && isIntT(b) ? INT : ANY; }
      case "func": return { fqn: "Function" };
      case "object": return { fqn: "Object" };
      case "vectorType": return { fqn: "Vector", params: [this.resolveType(e.elem)], classRef: true };
      default: return ANY;
    }
  }

  private memberAccessType(ot: RType, name: string, _obj: Expr): RType {
    if (ot.classRef) {
      if (ot.fqn === "int" || ot.fqn === "uint") return name === "MAX_VALUE" || name === "MIN_VALUE" ? ot : ANY;
      const ci = this.project.classes.get(ot.fqn);
      const m = this.project.findStatic(ci, name);
      return m ? this.memberRType(m) : ANY;
    }
    if (isXmlT(ot)) return XML_METHODS.has(name) ? ANY : XMLLIST_T;
    if (name === "length" && (ot.fqn === "Array" || ot.fqn === "String" || isVectorT(ot))) return INT;
    const ci = this.project.classes.get(ot.fqn);
    if (!ci) return ANY;
    const m = this.project.findInstance(ci, name);
    return m ? this.memberRType(m) : ANY;
  }

  /** tipo de um membro; método vira Function com `ret` = tipo de retorno */
  private memberRType(m: MemberInfo): RType {
    if (m.kind === "method") return { fqn: "Function", ret: this.memberType(m) } as RType;
    return this.memberType(m);
  }

  // ------------------------------------------------------------ nomes
  /**
   * Resolve identificador solto segundo a cadeia de escopo do AS3:
   * local → membro de instância → estático (subindo a hierarquia) → classe
   * privada do arquivo → import/mesmo pacote → global.
   */
  private resolveId(name: string): { code: string; type: RType; member?: MemberInfo; isMethod?: boolean } {
    const loc = this.lookupLocal(name);
    if (loc) return { code: loc.emit, type: loc.type };
    if (this.filterDepth > 0 && name !== "$filterItem") {
      // dentro de xml.(pred): nome não resolvido vira filho do item
      const r = this.resolveIdNoLocal(name);
      if (r) return r;
      return { code: `$filterItem.child(${JSON.stringify(name)})`, type: XMLLIST_T };
    }
    if (name === "$filterItem") return { code: "$filterItem", type: XML_T };
    const r = this.resolveIdNoLocal(name);
    if (r) return r;
    if (!["undefined", "NaN", "Infinity"].includes(name)) this.warn(`identificador não resolvido: ${name}`, 0);
    return { code: name, type: ANY };
  }

  private resolveIdNoLocal(name: string): { code: string; type: RType; member?: MemberInfo; isMethod?: boolean } | undefined {
    const ci = this.cls;
    if (ci) {
      if (!this.staticCtx) {
        const m = this.project.findInstance(ci, name);
        if (m) return { code: `this.${m.emitName}`, type: this.memberRType(m), member: m, isMethod: m.kind === "method" };
      }
      const sm = this.project.findStatic(ci, name);
      if (sm) {
        const owner = sm.owner === ci ? ci.name : this.ref(sm.owner.fqn, true);
        return { code: `${owner}.${sm.emitName}`, type: this.memberRType(sm), member: sm, isMethod: sm.kind === "method" };
      }
    }
    const pc = this.fi.privateClasses.get(name);
    if (pc) return { code: pc.name, type: { fqn: pc.fqn, classRef: true } };
    if (name === "Vector") return { code: this.rt("Vector"), type: { fqn: "Vector", classRef: true } };
    if (name === "int" || name === "uint") return { code: this.rt(name), type: { fqn: name, classRef: true } };
    if (name === "Math" || JS_GLOBALS.has(name)) {
      if (["isNaN", "parseInt", "parseFloat", "isFinite", "escape", "unescape", "encodeURIComponent", "decodeURIComponent", "encodeURI", "decodeURI"].includes(name)) {
        return { code: name, type: { fqn: "Function", ret: name === "parseInt" ? NUMBER : name.startsWith("is") ? BOOLEAN : name === "parseFloat" ? NUMBER : STRING } as RType };
      }
      if (!["NaN", "Infinity", "undefined"].includes(name)) return { code: name, type: { fqn: name, classRef: true } };
      return { code: name, type: name === "undefined" ? ANY : NUMBER };
    }
    const cls = this.project.resolveTypeName(name, this.fi);
    if (cls) {
      if (cls.isNative && cls.pkg === "" && AS3_RUNTIME_GLOBALS.has(cls.name)) return { code: this.rt(cls.name), type: { fqn: cls.name, classRef: true } };
      return { code: this.ref(cls.fqn, true), type: { fqn: cls.fqn, classRef: true } };
    }
    const fn = this.project.resolveFunctionName(name, this.fi);
    if (fn) {
      if (fn.isNative && fn.pkg === "") {
        if (AS3_RUNTIME_GLOBALS.has(fn.name)) return { code: this.rt(fn.name), type: { fqn: "Function" } };
        return { code: fn.name, type: { fqn: "Function" } };
      }
      const t = this.resolveType(fn.type, fn.file);
      return { code: this.ref(fn.fqn, true), type: fn.isVar ? t : ({ fqn: "Function", ret: t } as RType) };
    }
    if (AS3_RUNTIME_GLOBALS.has(name)) return { code: this.rt(name), type: { fqn: "Function" } };
    // classe importada que não existe no fonte: é classe de asset de SWF (linkage),
    // resolvida em runtime depois que a biblioteca exportada carrega
    const imp = [...this.fi.prog.imports, ...this.fi.prog.privateImports].find((i) => i.endsWith("." + name));
    if (imp) return { code: `${this.rt("$cls")}(${JSON.stringify(imp)})`, type: { fqn: imp, classRef: true } };
    return undefined;
  }

  /** valor que representa um tipo em `$is`/`$as` */
  private typeValue(t: RType): string {
    switch (t.fqn) {
      case "int": case "uint": case "Number": case "String": case "Boolean": case "Array": case "Object":
      case "Function": case "Class": case "XML": case "XMLList":
        return JSON.stringify(t.fqn);
      case "Vector": return JSON.stringify("Vector");
    }
    return this.ref(t.fqn, true);
  }

  /** tenta ler `a.b.c.Classe` como nome qualificado de classe/função */
  private qualifiedRef(e: Expr): { code: string; type: RType } | undefined {
    const parts: string[] = [];
    let x: Expr = e;
    while (x.kind === "member") { parts.unshift(x.name); x = x.obj; }
    if (x.kind !== "id") return undefined;
    if (this.lookupLocal(x.name)) return undefined;
    if (this.cls && (this.project.findInstance(this.cls, x.name) || this.project.findStatic(this.cls, x.name))) return undefined;
    parts.unshift(x.name);
    const fqn = parts.join(".");
    const ci = this.project.classes.get(fqn);
    if (ci && !ci.isFilePrivate) return { code: this.ref(ci.fqn, true), type: { fqn: ci.fqn, classRef: true } };
    const fn = this.project.functions.get(fqn);
    if (fn) return { code: this.ref(fn.fqn, true), type: { fqn: "Function", ret: this.resolveType(fn.type, fn.file) } as RType };
    return undefined;
  }

  // ------------------------------------------------------------ expressões
  /**
   * @param minPrec precedência mínima do contexto (pra parênteses)
   * @param stmtCtx expressão é um comando (resultado descartado)
   */
  expr(e: Expr, minPrec = 0, stmtCtx = false): string {
    const [code, prec] = this.exprP(e, stmtCtx);
    return prec < minPrec ? `(${code})` : code;
  }

  private exprP(e: Expr, stmtCtx = false): [string, number] {
    switch (e.kind) {
      case "num": return [e.value, 20];
      case "str": return [translateLiteral(e.value).replace(/\r?\n/g, "\\n"), 20];
      case "regex": return [fixRegex(e.value), 20];
      case "xml": {
        if (e.value.includes("{")) {
          const tpl = e.value.replace(/`/g, "\\`").replace(/\{([^}]*)\}/g, (_m, inner: string) => "${" + inner + "}");
          return [`new ${this.rt("XML")}(\`${tpl}\`)`, 18];
        }
        return [`new ${this.rt("XML")}(${JSON.stringify(e.value)})`, 18];
      }
      case "bool": return [String(e.value), 20];
      case "null": return ["null", 20];
      case "undefined": return ["undefined", 20];
      case "this": return [this.cls && this.staticCtx ? this.cls.name : "this", 20];
      case "super": return ["super", 20];
      case "paren": return [`(${this.expr(e.expr)})`, 20];
      case "id": {
        if (e.name === "arguments" && this.fnCtx()?.usesArguments) return ["$args", 20];
        const r = this.resolveId(e.name);
        if (r.isMethod && r.member && !r.member.isStatic) return [`${this.rt("$m")}(this, ${JSON.stringify(r.member.emitName)})`, 18];
        if (r.isMethod && r.member && r.member.isStatic) {
          const [obj, name] = splitLast(r.code);
          return [`${this.rt("$m")}(${obj}, ${JSON.stringify(name)})`, 18];
        }
        return [r.code, 20];
      }
      case "member": return [this.memberExpr(e, false), 18];
      case "index": {
        const ot = this.typeOf(e.obj);
        if (this.isDict(ot)) return [`${this.expr(e.obj, 18)}.get(${this.expr(e.index)})`, 18];
        if (this.isByteArray(ot)) return [`${this.expr(e.obj, 18)}.$get(${this.expr(e.index)})`, 18];
        return [`${this.expr(e.obj, 18)}[${this.expr(e.index)}]`, 18];
      }
      case "attr": {
        const obj = this.expr(e.obj, 18);
        if (typeof e.name === "string") return [e.name === "*" ? `${obj}.attributes()` : `${obj}.attribute(${JSON.stringify(e.name)})`, 18];
        return [`${obj}.attribute(${this.expr(e.name)})`, 18];
      }
      case "descendants": return [`${this.expr(e.obj, 18)}.descendants(${JSON.stringify((e.attr ? "@" : "") + e.name)})`, 18];
      case "filter": {
        this.filterDepth++;
        this.pushScope();
        this.scope.vars.set("$filterItem", XML_T);
        const pred = this.expr(e.pred);
        this.popScope();
        this.filterDepth--;
        return [`${this.expr(e.obj, 18)}.filter(($filterItem: any) => ${pred})`, 18];
      }
      case "vectorType": return [this.rt("Vector"), 20];
      case "call": return [this.callExpr(e), 18];
      case "new": return [this.newExpr(e), 18];
      case "vectorLit": return [`${this.rt("$vectorOf")}([${e.items.map((i) => this.expr(i, 2)).join(", ")}])`, 18];
      case "unary": {
        if (e.op === "delete") {
          const a = e.arg;
          if (a.kind === "index" && this.isDict(this.typeOf(a.obj))) return [`${this.expr(a.obj, 18)}.delete(${this.expr(a.index)})`, 18];
          if (a.kind === "attr" && typeof a.name === "string") return [`${this.expr(a.obj, 18)}.deleteAttribute(${JSON.stringify(a.name)})`, 18];
          return [`delete ${this.expr(a, 15)}`, 15];
        }
        if (e.op === "typeof") return [`${this.rt("$typeof")}(${this.expr(e.arg)})`, 18];
        const sp = /[a-z]/.test(e.op) ? " " : "";
        // evita `- -x` / `+ +x` virarem `--x`
        const arg = this.expr(e.arg, 15);
        const glue = sp || ((e.op === "-" || e.op === "+") && arg.startsWith(e.op) ? " " : "");
        return [`${e.op}${glue}${arg}`, 15];
      }
      case "update": {
        const a = e.arg;
        if (a.kind === "index" && this.isDict(this.typeOf(a.obj))) {
          const o = this.expr(a.obj, 18);
          const k = this.expr(a.index);
          return [`${o}.set(${k}, ${o}.get(${k}) ${e.op === "++" ? "+" : "-"} 1)`, 18];
        }
        return e.prefix ? [`${e.op}${this.expr(a, 16)}`, 15] : [`${this.expr(a, 16)}${e.op}`, 16];
      }
      case "binary": return this.binaryExpr(e);
      case "assign": return [this.assignExpr(e), 2];
      case "cond": return [`${this.expr(e.test, 4)} ? ${this.expr(e.then, 2)} : ${this.expr(e.else, 2)}`, 3];
      case "array": return [`[${e.items.map((i) => (i ? this.expr(i, 2) : "")).join(", ")}]`, 20];
      case "object": {
        if (!e.props.length) return ["{}", 20];
        const ps = e.props.map((p) => `${p.keyKind === "id" && /^[A-Za-z_$][\w$]*$/.test(p.key) ? p.key : p.keyKind === "num" ? p.key : p.key}: ${this.expr(p.value, 2)}`);
        return [`{ ${ps.join(", ")} }`, 20];
      }
      case "func": return [this.funcExpr(e.fn), 2];
      case "comma": return [e.exprs.map((x) => this.expr(x, 2, stmtCtx)).join(", "), 1];
    }
  }

  private memberExpr(e: Expr & { kind: "member" }, called: boolean): string {
    const q = this.qualifiedRef(e);
    if (q) return q.code;
    if (e.obj.kind === "super") return `super.${this.superMemberName(e.name)}`;
    const ot = this.typeOf(e.obj);
    const obj = this.expr(e.obj, 18);
    if (ot.classRef) {
      if (ot.fqn === "int" || ot.fqn === "uint") return `${obj}.${e.name}`;
      const ci = this.project.classes.get(ot.fqn);
      const m = this.project.findStatic(ci, e.name);
      if (m) {
        const owner = m.owner.fqn === ot.fqn ? obj : this.ref(m.owner.fqn, true);
        if (m.kind === "method" && !called) return `${this.rt("$m")}(${owner}, ${JSON.stringify(m.emitName)})`;
        return `${owner}.${m.emitName}`;
      }
      return `${obj}.${e.name}`;
    }
    if (isXmlT(ot)) {
      if (called && XML_METHODS.has(e.name)) return `${obj}.${e.name}`;
      // método de String num XML/XMLList de conteúdo simples (`xml.@a.split(",")`): o AS3 converte pra string
      if (called && STRING_METHODS.has(e.name)) return `String(${this.expr(e.obj)}).${e.name}`;
      if (e.name === "*") return `${obj}.children()`;
      return `${obj}.child(${JSON.stringify(e.name)})`;
    }
    const ci = this.project.classes.get(ot.fqn);
    if (ci) {
      const m = this.project.findInstance(ci, e.name);
      if (m) {
        if (m.kind === "method" && !called) return `${this.rt("$m")}(${obj}, ${JSON.stringify(m.emitName)})`;
        return `${obj}.${m.emitName}`;
      }
    }
    return `${obj}.${e.name}`;
  }

  /** Dictionary ou subclasse (ex.: road7th.data.DictionaryData) */
  private isDict(t: RType): boolean {
    return !t.classRef && this.project.isSubclass(this.project.classes.get(t.fqn), "flash.utils.Dictionary");
  }

  private isByteArray(t: RType): boolean {
    return !t.classRef && this.project.isSubclass(this.project.classes.get(t.fqn), "flash.utils.ByteArray");
  }

  private superMemberName(name: string): string {
    const s = this.cls && this.project.superOf(this.cls);
    const m = s && this.project.findInstance(s, name);
    return m?.emitName ?? name;
  }

  private callExpr(e: Expr & { kind: "call" }): string {
    const c = e.callee;
    const args = () => e.args.map((a) => this.expr(a, 2)).join(", ");
    if (c.kind === "super") return `super(${args()})`;
    // conversões/casts: Classe(x)
    let ct: RType | undefined;
    if (c.kind === "vectorType") ct = { fqn: "Vector", classRef: true, params: [this.resolveType(c.elem)] };
    else if (c.kind === "id" || c.kind === "member") {
      const t = c.kind === "id" ? this.resolveId(c.name).type : this.qualifiedRef(c)?.type;
      if (t?.classRef) ct = t;
    }
    if (ct && e.args.length === 1) {
      const a = e.args[0]!;
      switch (ct.fqn) {
        case "int": return `${this.rt("int")}(${this.expr(a)})`;
        case "uint": return `${this.rt("uint")}(${this.expr(a)})`;
        case "Number": case "String": case "Boolean": return `${ct.fqn}(${this.expr(a)})`;
        case "XML": return `${this.rt("$toXML")}(${this.expr(a)})`;
        case "XMLList": return `${this.rt("$toXMLList")}(${this.expr(a)})`;
        case "Vector": return `${this.rt("$vectorOf")}(${this.expr(a)})`;
        case "Array": return `${this.rt("$toArray")}(${this.expr(a)})`;
        case "Object": case "Function": case "Class": return this.expr(a, 18);
        case "Date": return `Date(${this.expr(a)})`;
        case "Error": case "RegExp": break;
        default: {
          const tsT = this.tsTypeOfR(ct);
          return `(${this.expr(a, 15)} as ${tsT})`;
        }
      }
    }
    // Array.sort/sortOn têm flags no AS3
    if (c.kind === "member" && (c.name === "sort" || c.name === "sortOn")) {
      const ot = this.typeOf(c.obj);
      if (!ot.classRef && !isXmlT(ot) && !this.project.classes.get(ot.fqn)?.instance.has(c.name)) {
        return `${this.rt(c.name === "sort" ? "$sort" : "$sortOn")}(${this.expr(c.obj, 2)}${e.args.length ? ", " + args() : ""})`;
      }
    }
    // dentro de xml.(pred): name(), attribute()... são métodos do item
    if (c.kind === "id" && this.filterDepth > 0 && XML_METHODS.has(c.name) && !this.lookupLocal(c.name) && !this.resolveIdNoLocal(c.name)) {
      return `$filterItem.${c.name}(${args()})`;
    }
    let callee: string;
    let member: MemberInfo | undefined;
    if (c.kind === "member") {
      callee = this.memberExpr(c, true);
      const ot = this.typeOf(c.obj);
      const ci = this.project.classes.get(ot.fqn);
      member = ot.classRef ? this.project.findStatic(ci, c.name) : this.project.findInstance(ci, c.name);
    } else if (c.kind === "id") {
      const r = this.resolveId(c.name);
      callee = r.code;
      member = r.member;
    } else callee = this.expr(c, 18);
    return `${callee}(${this.argList(e.args, member?.params, member?.owner.file)})`;
  }

  /** argumentos com a conversão implícita do AS3 pro tipo do parâmetro (XML → String/Number) */
  private argList(args: Expr[], params: (TypeRef | undefined)[] | undefined, fi: FileInfo | undefined): string {
    return args.map((a, i) => {
      const pt = params?.[i];
      if (pt && (pt.name === "String" || pt.name === "Number")) {
        const at = this.typeOf(a);
        if (isXmlT(at) || (pt.name === "String" && isNumT(at))) return this.coerceTo(this.resolveType(pt, fi), a);
      }
      return this.expr(a, 2);
    }).join(", ");
  }

  private tsTypeOfR(t: RType): string {
    const ci = this.project.classes.get(t.fqn);
    if (!ci) return "any";
    if (ci.isNative && ci.pkg === "") return JS_GLOBALS.has(ci.name) ? "any" : AS3_RUNTIME_GLOBALS.has(ci.name) ? this.rt(ci.name) : "any";
    return this.ref(ci.fqn, false);
  }

  private newExpr(e: Expr & { kind: "new" }): string {
    const argList = (e.args ?? []).map((a) => this.expr(a, 2));
    const args = argList.join(", ");
    const c = e.callee;
    if (c.kind === "vectorType") {
      // new Vector.<T>(length, fixed): posições novas recebem o default do tipo
      const el = this.resolveType(c.elem);
      const def = isNumT(el) ? "0" : el.fqn === "Boolean" ? "false" : "null";
      if (!argList.length) return "[]";
      return `${this.rt("$vector")}(${argList[0]}, ${def})`;
    }
    let callee: string;
    if (c.kind === "id") callee = this.resolveId(c.name).code;
    else if (c.kind === "member") callee = this.memberExpr(c, true);
    else callee = this.expr(c, 18);
    if (/[^\w$.]/.test(callee)) callee = `(${callee})`;
    // parâmetros do construtor (sobe a hierarquia até achar um declarado)
    const ct = c.kind === "id" || c.kind === "member" ? this.typeOf(c) : undefined;
    let cls = ct?.classRef ? this.project.classes.get(ct.fqn) : undefined;
    while (cls && !cls.ctorParams) cls = this.project.superOf(cls);
    if (cls?.ctorParams && e.args) return `new ${callee}(${this.argList(e.args, cls.ctorParams, cls.file)})`;
    return `new ${callee}(${args})`;
  }

  private binaryExpr(e: Expr & { kind: "binary" }): [string, number] {
    const op = e.op;
    if (op === "is" || op === "as") {
      const rt = this.typeOf(e.right);
      const tv = rt.classRef ? this.typeValue(rt) : this.expr(e.right);
      return [`${this.rt(op === "is" ? "$is" : "$as")}(${this.expr(e.left, 2)}, ${tv})`, 18];
    }
    if (op === "in") {
      const rt = this.typeOf(e.right);
      if (this.isDict(rt)) return [`${this.expr(e.right, 18)}.has(${this.expr(e.left)})`, 18];
      return [`${this.rt("$in")}(${this.expr(e.left, 2)}, ${this.expr(e.right, 2)})`, 18];
    }
    const p = PREC[op] ?? 10;
    // associatividade à esquerda: lado direito precisa de prec maior
    return [`${this.expr(e.left, p)} ${op} ${this.expr(e.right, p + 1)}`, p];
  }

  private assignExpr(e: Expr & { kind: "assign" }): string {
    const l = e.left;
    const op = e.op;
    // xml.@a = v
    if (l.kind === "attr" && typeof l.name === "string") {
      const obj = this.expr(l.obj, 18);
      if (op === "=") return `${obj}.setAttribute(${JSON.stringify(l.name)}, ${this.expr(e.right, 2)})`;
      return `${obj}.setAttribute(${JSON.stringify(l.name)}, ${obj}.attribute(${JSON.stringify(l.name)}) ${op.slice(0, -1)} ${this.expr(e.right, 13)})`;
    }
    if (l.kind === "member" && isXmlT(this.typeOf(l.obj)) && !this.typeOf(l.obj).classRef) {
      const obj = this.expr(l.obj, 18);
      if (op === "=") return `${obj}.setChild(${JSON.stringify(l.name)}, ${this.expr(e.right, 2)})`;
    }
    if (l.kind === "index" && this.isByteArray(this.typeOf(l.obj))) {
      const o = this.expr(l.obj, 18), k = this.expr(l.index);
      if (op === "=") return `${o}.$setAt(${k}, ${this.expr(e.right, 2)})`;
      return `${o}.$setAt(${k}, ${o}.$get(${k}) ${op.slice(0, -1)} ${this.expr(e.right, 13)})`;
    }
    if (l.kind === "index" && this.isDict(this.typeOf(l.obj))) {
      const obj = this.expr(l.obj, 18);
      const k = this.expr(l.index);
      if (op === "=") return `${obj}.set(${k}, ${this.expr(e.right, 2)})`;
      return `${obj}.set(${k}, ${obj}.get(${k}) ${op.slice(0, -1)} ${this.expr(e.right, 13)})`;
    }
    // `obj[nome] = v` em objeto sem tipo/classe: o AS3 converte pro tipo do campo
    // declarado (ex.: ObjectUtils.copyPorpertiesByXML grava string em campo Number)
    if (l.kind === "index" && op === "=") {
      const ot = this.typeOf(l.obj);
      const plain = isVectorT(ot) || ot.fqn === "Array" || this.isByteArray(ot) || isXmlT(ot);
      if (!plain) return `${this.rt("$dset")}(${this.expr(l.obj, 2)}, ${this.expr(l.index, 2)}, ${this.expr(e.right, 2)})`;
    }
    const lt = this.typeOf(l);
    const left = this.expr(l, 18);
    if (op === "=" && !lt.classRef && (lt.fqn === "String" || lt.fqn === "Number")) return `${left} = ${this.coerceTo(lt, e.right)}`;
    if (isIntT(lt) && !lt.classRef) {
      const fn = lt.fqn === "uint" ? "uint" : "int";
      if (op === "=") return `${left} = ${this.coerceTo(lt, e.right)}`;
      const base = op.slice(0, -1);
      const rIsInt = isIntT(this.typeOf(e.right)) || isIntLiteral(e.right);
      if (["/", "**"].includes(base) || (!rIsInt && ["+", "-", "*", "%"].includes(base))) {
        return `${left} = ${this.rt(fn)}(${left} ${base} ${this.expr(e.right, (PREC[base] ?? 12) + 1)})`;
      }
    }
    return `${left} ${op} ${this.expr(e.right, 2)}`;
  }
}

// ------------------------------------------------------------ utilidades
/** valor constante (não depende de outras classes): pode inicializar na carga */
function isLiteral(e: Expr): boolean {
  switch (e.kind) {
    case "num": case "str": case "bool": case "null": case "undefined": case "regex": return true;
    case "unary": return (e.op === "-" || e.op === "+" || e.op === "~" || e.op === "!") && isLiteral(e.arg);
    case "paren": return isLiteral(e.expr);
    case "binary": return !["is", "as", "in", "instanceof"].includes(e.op) && isLiteral(e.left) && isLiteral(e.right);
    case "array": return e.items.every((i) => i === null || isLiteral(i));
    default: return false;
  }
}

function isIntLiteral(e: Expr): e is Expr & { kind: "num" } {
  if (e.kind === "unary" && e.op === "-" && e.arg.kind === "num") return isIntLiteral(e.arg);
  return e.kind === "num" && /^(0x[0-9a-f]+|\d+)$/i.test(e.value) && Number(e.value) <= 0x7fffffff;
}

/** nome de tipo no formato do describeType (`flash.display::Sprite`) */
function describeTypeName(t: RType): string {
  if (t.fqn === "Vector") return "__AS3__.vec::Vector.<" + (t.params?.[0] ? describeTypeName(t.params[0]) : "*") + ">";
  const i = t.fqn.lastIndexOf(".");
  return i < 0 ? t.fqn : t.fqn.slice(0, i) + "::" + t.fqn.slice(i + 1);
}

export function defaultValue(t: RType): string {
  switch (t.fqn) {
    case "int": case "uint": return "0";
    case "Number": return "NaN";
    case "Boolean": return "false";
    case "*": return "undefined";
    default: return "null";
  }
}

function wrapArr(t: string): string {
  return /[|&\s]/.test(t) ? `(${t})` : t;
}

function indent(s: string): string {
  return s.split("\n").map((l) => "  " + l).join("\n");
}

function splitLast(code: string): [string, string] {
  const i = code.lastIndexOf(".");
  return [code.slice(0, i), code.slice(i + 1)];
}

/** AS3 aceita flag `x` (estendido) e `s`; JS não tem `x` */
function fixRegex(r: string): string {
  const m = /^\/(.*)\/([a-z]*)$/s.exec(r);
  if (!m) return r;
  let [, body, flags] = m as unknown as [string, string, string];
  if (flags.includes("x")) {
    body = body.replace(/\\\s|\s+|#[^\n]*/g, (s) => (s.startsWith("\\") ? s : ""));
    flags = flags.replace("x", "");
  }
  return `/${body}/${flags}`;
}

const lineCache = new WeakMap<FileInfo, number[]>();
function lineOf(fi: FileInfo, pos: number): number {
  void lineCache;
  void fi;
  return pos ? 0 : 0;
}
