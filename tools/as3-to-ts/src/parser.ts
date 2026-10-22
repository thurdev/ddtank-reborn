/**
 * Parser recursivo-descendente de AS3 → {@link Program}.
 *
 * Expressões usam precedência por tabela (Pratt). Comentários do fonte são
 * anexados ao próximo comando/membro (`comments`), pra o TS gerado manter a
 * documentação original.
 */
import type {
  ClassDecl, Decl, Expr, FieldMember, FunctionNode, InterfaceDecl, Member, MethodMember, Modifiers, Param, Program,
  Stmt, TypeRef, VarDeclarator,
} from "./ast.js";
import { Lexer, type Comment, type Token } from "./lexer.js";

export class ParseError extends Error {}

const BINARY_PREC: Record<string, number> = {
  "||": 1, "&&": 2, "|": 3, "^": 4, "&": 5,
  "==": 6, "!=": 6, "===": 6, "!==": 6,
  "<": 7, ">": 7, "<=": 7, ">=": 7, instanceof: 7, is: 7, as: 7, in: 7,
  "<<": 8, ">>": 8, ">>>": 8,
  "+": 9, "-": 9,
  "*": 10, "/": 10, "%": 10,
};
const ASSIGN_OPS = new Set(["=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "&&=", "||="]);
const MODIFIER_WORDS = new Set(["public", "private", "protected", "internal", "static", "override", "final", "native", "dynamic", "virtual"]);

export function parse(src: string, file: string): Program {
  return new Parser(src, file).program();
}

class Parser {
  private toks: Token[];
  private comments: Comment[];
  private ci = 0;
  private p = 0;
  /** `in` não é operador binário dentro do init de `for (x in y)` */
  private noIn = false;
  /** pilha de funções em parsing (pra marcar `usesArguments`) */
  private fnStack: FunctionNode[] = [];
  /** lista de imports do escopo atual (package ou arquivo) */
  private curImports: string[] = [];

  constructor(private src: string, private file: string) {
    const lx = new Lexer(src, file).run();
    this.toks = lx.tokens;
    this.comments = lx.comments;
  }

  // ------------------------------------------------------------ utilidades
  private get t(): Token { return this.toks[this.p]!; }
  private peek(n = 1): Token { return this.toks[Math.min(this.p + n, this.toks.length - 1)]!; }
  private err(msg: string, tok: Token = this.t): never {
    throw new ParseError(`${this.file}:${tok.line}: ${msg} (achou ${JSON.stringify(tok.value)})`);
  }
  private is(v: string): boolean { const t = this.t; return (t.kind === "punct" || t.kind === "id") && t.value === v; }
  private isP(v: string): boolean { return this.t.kind === "punct" && this.t.value === v; }
  private eat(v: string): boolean { if (this.is(v)) { this.p++; return true; } return false; }
  private expect(v: string): Token {
    if (!this.is(v)) {
      // `>>` / `>>>` / `>=` fechando tipos genéricos: parte o token
      if (v === ">" && this.t.kind === "punct" && this.t.value.startsWith(">") && this.t.value.length > 1) {
        const t = this.t;
        const rest: Token = { ...t, value: t.value.slice(1), pos: t.pos + 1 };
        this.toks.splice(this.p, 1, { ...t, value: ">", end: t.pos + 1 }, rest);
        return this.toks[this.p++]!;
      }
      this.err(`esperava ${JSON.stringify(v)}`);
    }
    return this.toks[this.p++]!;
  }
  private ident(): string {
    if (this.t.kind !== "id") this.err("esperava identificador");
    return this.toks[this.p++]!.value;
  }
  /** fim de comando: `;` ou ASI (quebra de linha / `}` / EOF) */
  private semi(): void {
    if (this.eat(";")) return;
    if (this.isP("}") || this.t.kind === "eof" || this.t.nlBefore) return;
    this.err("esperava ;");
  }
  private takeComments(): string[] | undefined {
    const limit = this.t.pos;
    let out: string[] | undefined;
    while (this.ci < this.comments.length && this.comments[this.ci]!.pos < limit) {
      (out ??= []).push(this.comments[this.ci]!.text);
      this.ci++;
    }
    return out;
  }

  // ------------------------------------------------------------ programa
  program(): Program {
    const prog: Program = { file: this.file, pkg: "", imports: [], decls: [], privateDecls: [], privateImports: [], headerComments: [] };
    prog.headerComments = this.takeComments() ?? [];
    while (this.t.kind !== "eof") {
      if (this.is("package")) {
        this.p++;
        let name = "";
        if (!this.isP("{")) { name = this.qualifiedName(); }
        prog.pkg = name;
        this.expect("{");
        while (!this.isP("}")) this.topLevel(prog, prog.decls, prog.imports);
        this.expect("}");
      } else {
        this.topLevel(prog, prog.privateDecls, prog.privateImports);
      }
    }
    return prog;
  }

  private qualifiedName(): string {
    let n = this.ident();
    while (this.isP(".") && this.peek().kind === "id") { this.p++; n += "." + this.ident(); }
    return n;
  }

  private topLevel(prog: Program, decls: Decl[], imports: string[]): void {
    this.curImports = imports;
    const comments = this.takeComments();
    if (this.eat(";")) return;
    if (this.is("import")) {
      this.p++;
      let n = this.ident();
      while (this.eat(".")) n += "." + (this.eat("*") ? "*" : this.ident());
      imports.push(n);
      this.semi();
      return;
    }
    if (this.is("use") && this.peek().value === "namespace") {
      this.p += 2; this.qualifiedName(); this.semi(); return;
    }
    if (this.isP("[")) { this.skipMetadata(); return; }
    const mods = this.modifiers();
    let d: Decl;
    if (this.is("class")) d = this.classDecl(mods);
    else if (this.is("interface")) d = this.interfaceDecl(mods);
    else if (this.is("function")) {
      const pos = this.t.pos;
      this.p++;
      const name = this.ident();
      d = { kind: "function", name, mods, fn: this.functionRest(name, pos), pos };
    } else if (this.is("var") || this.is("const")) {
      const pos = this.t.pos;
      const isConst = this.t.value === "const";
      this.p++;
      const decls = this.varDeclarators();
      this.semi();
      d = { kind: "var", mods, isConst, decls, pos };
    } else if (this.is("namespace")) {
      const pos = this.t.pos;
      this.p++;
      const name = this.ident();
      let uri: string | undefined;
      if (this.eat("=")) uri = this.toks[this.p++]!.value;
      this.semi();
      d = { kind: "namespace", name, uri, pos };
    } else if (this.is("include")) {
      this.err("include não suportado");
    } else {
      this.err("declaração de topo inesperada");
    }
    if (comments) d.comments = comments;
    decls.push(d);
  }

  /** `[Event(name="x")]`, `[Embed(...)]`, `[Bindable]` — descartados */
  private skipMetadata(): void {
    let depth = 0;
    do {
      if (this.isP("[")) depth++;
      else if (this.isP("]")) depth--;
      this.p++;
    } while (depth > 0 && this.t.kind !== "eof");
  }

  private modifiers(): Modifiers {
    const m: Modifiers = { access: "internal", isStatic: false, isOverride: false, isFinal: false, isNative: false, isDynamic: false };
    for (;;) {
      const t = this.t;
      if (t.kind !== "id") break;
      const nxt = this.peek();
      // `get`/`set` etc não são modificadores; nome seguido de `(`/`:`/`=` também não
      if (MODIFIER_WORDS.has(t.value) && nxt.kind === "id") {
        this.p++;
        switch (t.value) {
          case "static": m.isStatic = true; break;
          case "override": m.isOverride = true; break;
          case "final": m.isFinal = true; break;
          case "native": m.isNative = true; break;
          case "dynamic": m.isDynamic = true; break;
          case "virtual": break;
          default: m.access = t.value;
        }
        continue;
      }
      // namespace customizado como modificador: `mx_internal function x()`, `flash_proxy override function`
      if (!MODIFIER_WORDS.has(t.value) && nxt.kind === "id" &&
          ["function", "var", "const", "static", "override", "final", "native"].includes(nxt.value) &&
          !["function", "var", "const", "class", "interface", "namespace"].includes(t.value)) {
        this.p++;
        m.access = t.value;
        continue;
      }
      break;
    }
    return m;
  }

  private classDecl(mods: Modifiers): ClassDecl {
    const pos = this.t.pos;
    this.expect("class");
    const name = this.ident();
    let ext: string | undefined;
    const impl: string[] = [];
    if (this.eat("extends")) ext = this.qualifiedName();
    if (this.eat("implements")) { do impl.push(this.qualifiedName()); while (this.eat(",")); }
    this.expect("{");
    const members: Member[] = [];
    const staticInit: Stmt[] = [];
    while (!this.isP("}")) {
      const comments = this.takeComments();
      if (this.eat(";")) continue;
      if (this.isP("[")) { this.skipMetadata(); continue; }
      if (this.is("import") && this.peek().kind === "id") {
        // import dentro do corpo da classe (acontece no fonte descompilado)
        this.p++;
        let n = this.ident();
        while (this.eat(".")) n += "." + (this.eat("*") ? "*" : this.ident());
        this.curImports.push(n);
        this.semi();
        continue;
      }
      const save = this.p;
      const m = this.modifiers();
      if (this.is("function")) {
        const mm = this.methodMember(m);
        if (comments) mm.comments = comments;
        members.push(mm);
      } else if (this.is("var") || this.is("const")) {
        const isConst = this.t.value === "const";
        const fpos = this.t.pos;
        this.p++;
        const decls = this.varDeclarators();
        this.semi();
        decls.forEach((d, i) => {
          const f: FieldMember = { kind: "field", mods: m, isConst, name: d.name, type: d.type, init: d.init, pos: fpos };
          if (i === 0 && comments) f.comments = comments;
          members.push(f);
        });
      } else if (this.is("namespace")) {
        this.p++; this.ident(); if (this.eat("=")) this.p++; this.semi();
      } else {
        this.p = save;
        const s = this.statement();
        if (comments) s.comments = comments;
        staticInit.push(s);
      }
    }
    this.expect("}");
    return { kind: "class", name, mods, extends: ext, implements: impl, members, staticInit, pos };
  }

  private interfaceDecl(mods: Modifiers): InterfaceDecl {
    const pos = this.t.pos;
    this.expect("interface");
    const name = this.ident();
    const ext: string[] = [];
    if (this.eat("extends")) { do ext.push(this.qualifiedName()); while (this.eat(",")); }
    this.expect("{");
    const members: MethodMember[] = [];
    while (!this.isP("}")) {
      const comments = this.takeComments();
      if (this.eat(";")) continue;
      if (this.isP("[")) { this.skipMetadata(); continue; }
      const m = this.modifiers();
      const mm = this.methodMember(m);
      if (comments) mm.comments = comments;
      members.push(mm);
    }
    this.expect("}");
    return { kind: "interface", name, mods, extends: ext, members, pos };
  }

  private methodMember(mods: Modifiers): MethodMember {
    const pos = this.t.pos;
    this.expect("function");
    let accessor: "get" | "set" | undefined;
    if ((this.is("get") || this.is("set")) && this.peek().kind === "id") {
      accessor = this.t.value as "get" | "set";
      this.p++;
    }
    const name = this.ident();
    const fn = this.functionRest(name, pos);
    return { kind: "method", mods, accessor, name, fn, pos };
  }

  /** a partir de `(`: parâmetros, tipo de retorno, corpo (ou `;` em interface/native) */
  private functionRest(name: string | undefined, pos: number): FunctionNode {
    const fn: FunctionNode = { name, params: [], body: null, pos };
    this.expect("(");
    while (!this.isP(")")) {
      const prm: Param = { name: "" };
      if (this.eat("...")) prm.rest = true;
      prm.name = this.ident();
      if (this.eat(":")) prm.type = this.typeRef();
      if (this.eat("=")) prm.init = this.assignExpr();
      fn.params.push(prm);
      if (!this.eat(",")) break;
    }
    this.expect(")");
    if (this.eat(":")) fn.returnType = this.typeRef();
    if (this.isP("{")) {
      this.fnStack.push(fn);
      fn.body = this.blockBody();
      this.fnStack.pop();
    } else this.semi();
    return fn;
  }

  typeRef(): TypeRef {
    if (this.eat("*")) return { name: "*" };
    let name = this.ident();
    while (this.isP(".")) {
      if (this.peek().value === "<") {
        this.p += 2;
        const param = this.typeRef();
        this.expect(">");
        return { name, params: [param] };
      }
      this.p++;
      name += "." + this.ident();
    }
    return { name };
  }

  private varDeclarators(): VarDeclarator[] {
    const out: VarDeclarator[] = [];
    do {
      const d: VarDeclarator = { name: this.ident() };
      if (this.eat(":")) d.type = this.typeRef();
      if (this.eat("=")) d.init = this.assignExpr();
      out.push(d);
    } while (this.eat(","));
    return out;
  }

  // ------------------------------------------------------------ comandos
  private blockBody(): Stmt[] {
    this.expect("{");
    const body: Stmt[] = [];
    while (!this.isP("}")) body.push(this.statement());
    // comentários soltos no fim do bloco
    const tail = this.takeComments();
    if (tail) body.push({ kind: "empty", pos: this.t.pos, comments: tail });
    this.expect("}");
    return body;
  }

  statement(): Stmt {
    const comments = this.takeComments();
    const s = this.statementInner();
    if (comments) s.comments = comments.concat(s.comments ?? []);
    return s;
  }

  private statementInner(): Stmt {
    const t = this.t;
    const pos = t.pos;
    if (t.kind === "punct") {
      if (t.value === "{") return { kind: "block", body: this.blockBody(), pos };
      if (t.value === ";") { this.p++; return { kind: "empty", pos }; }
      if (t.value === "[" ) {
        // metadata dentro de função? raro; trata como expressão
      }
    }
    if (t.kind === "id") {
      switch (t.value) {
        case "var":
        case "const": {
          this.p++;
          const decls = this.varDeclarators();
          this.semi();
          return { kind: "var", isConst: t.value === "const", decls, pos };
        }
        case "if": {
          this.p++;
          this.expect("(");
          const test = this.expression();
          this.expect(")");
          const then = this.statement();
          let els: Stmt | undefined;
          if (this.eat("else")) els = this.statement();
          return { kind: "if", test, then, else: els, pos };
        }
        case "for": return this.forStatement();
        case "while": {
          this.p++;
          this.expect("(");
          const test = this.expression();
          this.expect(")");
          return { kind: "while", test, body: this.statement(), pos };
        }
        case "do": {
          this.p++;
          const body = this.statement();
          this.expect("while");
          this.expect("(");
          const test = this.expression();
          this.expect(")");
          this.eat(";");
          return { kind: "dowhile", test, body, pos };
        }
        case "switch": {
          this.p++;
          this.expect("(");
          const disc = this.expression();
          this.expect(")");
          this.expect("{");
          const cases: { test: Expr | null; body: Stmt[]; comments?: string[] }[] = [];
          while (!this.isP("}")) {
            const cc = this.takeComments();
            let test: Expr | null = null;
            if (this.eat("case")) test = this.expression();
            else this.expect("default");
            this.expect(":");
            const body: Stmt[] = [];
            while (!this.is("case") && !this.is("default") && !this.isP("}")) body.push(this.statement());
            // `default` usado como identificador? não ocorre em AS3 nessa posição
            cases.push({ test, body, comments: cc });
          }
          this.expect("}");
          return { kind: "switch", disc, cases, pos };
        }
        case "return": {
          this.p++;
          let arg: Expr | undefined;
          if (!this.isP(";") && !this.isP("}") && !this.t.nlBefore && this.t.kind !== "eof") arg = this.expression();
          this.semi();
          return { kind: "return", arg, pos };
        }
        case "break":
        case "continue": {
          this.p++;
          let label: string | undefined;
          if (this.t.kind === "id" && !this.t.nlBefore) label = this.ident();
          this.semi();
          return { kind: t.value as "break" | "continue", label, pos };
        }
        case "throw": {
          this.p++;
          const arg = this.expression();
          this.semi();
          return { kind: "throw", arg, pos };
        }
        case "try": {
          this.p++;
          const block = this.blockBody();
          const handlers: { param: string; type?: TypeRef; body: Stmt[] }[] = [];
          while (this.eat("catch")) {
            this.expect("(");
            const param = this.ident();
            let type: TypeRef | undefined;
            if (this.eat(":")) type = this.typeRef();
            this.expect(")");
            handlers.push({ param, type, body: this.blockBody() });
          }
          let finalizer: Stmt[] | undefined;
          if (this.eat("finally")) finalizer = this.blockBody();
          return { kind: "try", block, handlers, finalizer, pos };
        }
        case "function":
          if (this.peek().kind === "id") {
            this.p++;
            const name = this.ident();
            return { kind: "function", fn: this.functionRest(name, pos), pos };
          }
          break;
        case "use":
          if (this.peek().value === "namespace") {
            this.p += 2; this.qualifiedName(); this.semi();
            return { kind: "directive", text: "use namespace", pos };
          }
          break;
        case "default":
          if (this.peek().value === "xml") {
            while (!this.isP(";")) this.p++;
            this.p++;
            return { kind: "directive", text: "default xml namespace", pos };
          }
          break;
      }
      // label:
      if (this.peek().kind === "punct" && this.peek().value === ":" && !["case", "default"].includes(t.value)) {
        this.p += 2;
        return { kind: "label", label: t.value, body: this.statement(), pos };
      }
    }
    const expr = this.expression();
    this.semi();
    return { kind: "expr", expr, pos };
  }

  private forStatement(): Stmt {
    const pos = this.t.pos;
    this.expect("for");
    let each = false;
    if (this.is("each")) { this.p++; each = true; }
    this.expect("(");
    let init: Stmt | Expr | null = null;
    if (!this.isP(";")) {
      this.noIn = true;
      if (this.is("var") || this.is("const")) {
        const ip = this.t.pos;
        const isConst = this.t.value === "const";
        this.p++;
        init = { kind: "var", isConst, decls: this.varDeclarators(), pos: ip };
      } else {
        init = this.expression();
      }
      this.noIn = false;
    }
    if (this.eat("in")) {
      const right = this.expression();
      this.expect(")");
      const body = this.statement();
      return { kind: "forin", each, left: init!, right, body, pos };
    }
    if (each) this.err("for each sem in");
    this.expect(";");
    const test = this.isP(";") ? null : this.expression();
    this.expect(";");
    const update = this.isP(")") ? null : this.expression();
    this.expect(")");
    const body = this.statement();
    let initStmt: Stmt | null = null;
    if (init) initStmt = "kind" in init && (init as Stmt).kind === "var" ? (init as Stmt) : { kind: "expr", expr: init as Expr, pos };
    return { kind: "for", init: initStmt, test, update, body, pos };
  }

  // ------------------------------------------------------------ expressões
  expression(): Expr {
    const first = this.assignExpr();
    if (!this.isP(",")) return first;
    const exprs = [first];
    while (this.eat(",")) exprs.push(this.assignExpr());
    return { kind: "comma", pos: first.pos, exprs };
  }

  assignExpr(): Expr {
    const left = this.condExpr();
    const t = this.t;
    if (t.kind === "punct" && ASSIGN_OPS.has(t.value)) {
      this.p++;
      const right = this.assignExpr();
      return { kind: "assign", op: t.value, left, right, pos: left.pos };
    }
    return left;
  }

  private condExpr(): Expr {
    const test = this.binary(0);
    if (this.eat("?")) {
      const saveNoIn = this.noIn;
      this.noIn = false;
      const then = this.assignExpr();
      this.noIn = saveNoIn;
      this.expect(":");
      const els = this.assignExpr();
      return { kind: "cond", test, then, else: els, pos: test.pos };
    }
    return test;
  }

  private binary(minPrec: number): Expr {
    let left = this.unary();
    for (;;) {
      const t = this.t;
      if (t.kind !== "punct" && t.kind !== "id") break;
      const op = t.value;
      const prec = BINARY_PREC[op];
      if (prec === undefined || prec <= minPrec) break;
      if (t.kind === "id" && !["instanceof", "is", "as", "in"].includes(op)) break;
      if (op === "in" && this.noIn) break;
      this.p++;
      if (op === "as" || op === "is") {
        // lado direito é um tipo (pode ser `Vector.<T>` ou nome qualificado) — mas também pode ser expressão
        const right = this.binary(prec);
        left = { kind: "binary", op, left, right, pos: left.pos };
        continue;
      }
      const right = this.binary(prec);
      left = { kind: "binary", op, left, right, pos: left.pos };
    }
    return left;
  }

  private unary(): Expr {
    const t = this.t;
    if (t.kind === "punct") {
      if (t.value === "++" || t.value === "--") {
        this.p++;
        return { kind: "update", op: t.value, prefix: true, arg: this.unary(), pos: t.pos };
      }
      if (["!", "~", "-", "+"].includes(t.value)) {
        this.p++;
        return { kind: "unary", op: t.value, arg: this.unary(), pos: t.pos };
      }
    } else if (t.kind === "id" && ["typeof", "delete", "void"].includes(t.value)) {
      // `void` também aparece como tipo, mas aqui estamos em posição de expressão
      this.p++;
      return { kind: "unary", op: t.value, arg: this.unary(), pos: t.pos };
    }
    const e = this.postfix(this.callOrMember(this.primaryOrNew()));
    return e;
  }

  private postfix(e: Expr): Expr {
    const t = this.t;
    if (t.kind === "punct" && (t.value === "++" || t.value === "--") && !t.nlBefore) {
      this.p++;
      return { kind: "update", op: t.value, prefix: false, arg: e, pos: e.pos };
    }
    return e;
  }

  private primaryOrNew(): Expr {
    if (this.is("new") && this.t.kind === "id") {
      const pos = this.t.pos;
      this.p++;
      if (this.isP("<")) {
        // new <T>[...]
        this.p++;
        const elem = this.typeRef();
        this.expect(">");
        const arr = this.primary();
        if (arr.kind !== "array") this.err("esperava [ após new <T>");
        return { kind: "vectorLit", elem, items: arr.items.filter((x): x is Expr => x !== null), pos };
      }
      let callee = this.primaryOrNew();
      // membros (sem chamadas) fazem parte do construtor: new a.b.C(...)
      callee = this.memberChain(callee, false);
      let args: Expr[] | null = null;
      if (this.isP("(")) args = this.args();
      return { kind: "new", callee, args, pos };
    }
    return this.primary();
  }

  private args(): Expr[] {
    this.expect("(");
    const out: Expr[] = [];
    while (!this.isP(")")) {
      out.push(this.assignExpr());
      if (!this.eat(",")) break;
    }
    this.expect(")");
    return out;
  }

  private callOrMember(e: Expr): Expr {
    return this.memberChain(e, true);
  }

  private memberChain(e: Expr, allowCall: boolean): Expr {
    for (;;) {
      const t = this.t;
      if (t.kind !== "punct") break;
      if (t.value === ".") {
        const n = this.peek();
        if (n.kind === "punct" && n.value === "<") {
          this.p += 2;
          const elem = this.typeRef();
          this.expect(">");
          e = { kind: "vectorType", elem, pos: e.pos };
          continue;
        }
        if (n.kind === "punct" && n.value === "@") {
          this.p += 2;
          e = { kind: "attr", obj: e, name: this.attrName(), pos: e.pos };
          continue;
        }
        if (n.kind === "punct" && n.value === "(") {
          this.p += 2;
          const pred = this.expression();
          this.expect(")");
          e = { kind: "filter", obj: e, pred, pos: e.pos };
          continue;
        }
        if (n.kind === "punct" && n.value === "*") {
          this.p += 2;
          e = { kind: "member", obj: e, name: "*", pos: e.pos };
          continue;
        }
        this.p++;
        const name = this.ident();
        if (this.isP("::")) { this.p++; const real = this.ident(); e = { kind: "member", obj: e, name: real, ns: name, pos: e.pos }; continue; }
        e = { kind: "member", obj: e, name, pos: e.pos };
        continue;
      }
      if (t.value === "..") {
        this.p++;
        if (this.eat("@")) e = { kind: "descendants", obj: e, name: this.attrNameStr(), attr: true, pos: e.pos };
        else e = { kind: "descendants", obj: e, name: this.eat("*") ? "*" : this.ident(), pos: e.pos };
        continue;
      }
      if (t.value === "[") {
        this.p++;
        const index = this.expression();
        this.expect("]");
        e = { kind: "index", obj: e, index, pos: e.pos };
        continue;
      }
      if (t.value === "(" && allowCall) {
        e = { kind: "call", callee: e, args: this.args(), pos: e.pos };
        continue;
      }
      break;
    }
    return e;
  }

  private attrName(): string | Expr {
    if (this.eat("*")) return "*";
    if (this.isP("[")) { this.p++; const e = this.expression(); this.expect("]"); return e; }
    return this.ident();
  }
  private attrNameStr(): string { const n = this.attrName(); if (typeof n !== "string") this.err("..@[expr] não suportado"); return n; }

  private primary(): Expr {
    const t = this.t;
    const pos = t.pos;
    switch (t.kind) {
      case "num": this.p++; return { kind: "num", value: t.value, pos };
      case "str": this.p++; return { kind: "str", value: t.value, pos };
      case "regex": this.p++; return { kind: "regex", value: t.value, pos };
      case "xml": this.p++; return { kind: "xml", value: t.value, pos };
      case "id": {
        switch (t.value) {
          case "true": this.p++; return { kind: "bool", value: true, pos };
          case "false": this.p++; return { kind: "bool", value: false, pos };
          case "null": this.p++; return { kind: "null", pos };
          case "undefined": this.p++; return { kind: "undefined", pos };
          case "this": this.p++; return { kind: "this", pos };
          case "super": this.p++; return { kind: "super", pos };
          case "function": {
            this.p++;
            let name: string | undefined;
            if (this.t.kind === "id") name = this.ident();
            return { kind: "func", fn: this.functionRest(name, pos), pos };
          }
        }
        this.p++;
        if (t.value === "arguments") { const f = this.fnStack[this.fnStack.length - 1]; if (f) f.usesArguments = true; }
        if (this.isP("::")) {
          this.p++;
          const name = this.ident();
          return { kind: "id", name, ns: t.value, pos };
        }
        return { kind: "id", name: t.value, pos };
      }
      case "punct":
        if (t.value === "(") {
          this.p++;
          const saveNoIn = this.noIn;
          this.noIn = false;
          const expr = this.expression();
          this.noIn = saveNoIn;
          this.expect(")");
          return { kind: "paren", expr, pos };
        }
        if (t.value === "[") {
          this.p++;
          const items: (Expr | null)[] = [];
          while (!this.isP("]")) {
            if (this.isP(",")) { this.p++; items.push(null); continue; }
            items.push(this.assignExpr());
            if (!this.eat(",")) break;
          }
          this.expect("]");
          return { kind: "array", items, pos };
        }
        if (t.value === "{") {
          this.p++;
          const props: { key: string; keyKind: "id" | "str" | "num"; value: Expr }[] = [];
          while (!this.isP("}")) {
            const k = this.t;
            this.p++;
            const keyKind = k.kind === "str" ? "str" : k.kind === "num" ? "num" : "id";
            this.expect(":");
            props.push({ key: k.value, keyKind, value: this.assignExpr() });
            if (!this.eat(",")) break;
          }
          this.expect("}");
          return { kind: "object", props, pos };
        }
        if (t.value === "@") {
          // `@attr` solto dentro de filtro E4X: xml.(@id == 3)
          this.p++;
          return { kind: "attr", obj: { kind: "id", name: "$filterItem", pos }, name: this.attrName(), pos };
        }
    }
    this.err("expressão inesperada");
  }
}
