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
import type { ClassDecl, Expr, MethodMember, Stmt } from "../../as3-to-ts/src/ast.ts";
import type { FrameScriptOp } from "../../../packages/flash/src/swf/library-types.ts";

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
  /** frame (0-based, igual addFrameScript) → ops — ver extractFrameScripts() */
  frameScripts?: Map<number, FrameScriptOp[]>;
}

/** tira as aspas de uma string literal do AS3 (`e.value` do parser vem com elas) */
function unquoteStr(raw: string): string {
  return raw.slice(1, -1).replace(/\\(["'\\])/g, "$1");
}

/** nome chamado por um `call`/`id`/`member` — ignora `this.` na frente (equivalente) */
function calleeName(e: Expr): string | undefined {
  if (e.kind === "id") return e.name;
  if (e.kind === "member" && e.obj.kind === "this") return e.name;
  return undefined;
}

/**
 * `addFrameScript(idx, this.frameN, idx2, this.frameM, ...)`: extrai os pares
 * (frame 0-based → nome do método). Aceita a chamada em qualquer statement
 * de expressão do construtor (normalmente é a única linha).
 */
function findAddFrameScriptCalls(stmts: Stmt[], out: Map<number, string>): void {
  for (const s of stmts) {
    let call: Expr | undefined;
    if (s.kind === "expr" && s.expr.kind === "call" && calleeName(s.expr.callee) === "addFrameScript") call = s.expr;
    if (call && call.kind === "call") {
      for (let i = 0; i + 1 < call.args.length; i += 2) {
        const idx = call.args[i]!, fn = call.args[i + 1]!;
        if (idx.kind !== "num") continue;
        const name = fn.kind === "id" ? fn.name : fn.kind === "member" && fn.obj.kind === "this" ? fn.name : undefined;
        if (name) out.set(Math.trunc(Number(idx.value)), name);
      }
    }
    // desce em blocos/if simples (addFrameScript quase sempre é direto no corpo, mas por garantia)
    if (s.kind === "if") { findAddFrameScriptCalls([s.then], out); if (s.else) findAddFrameScriptCalls([s.else], out); }
  }
}

/** um statement simples (`stop()`, `gotoAndPlay("stand")`...) → FrameScriptOp, ou undefined se não reconhecido */
function toFrameScriptOp(s: Stmt): FrameScriptOp | undefined {
  if (s.kind !== "expr" || s.expr.kind !== "call") return undefined;
  const name = calleeName(s.expr.callee);
  const args = s.expr.args;
  switch (name) {
    case "stop": return args.length === 0 ? { op: "stop" } : undefined;
    case "play": return args.length === 0 ? { op: "play" } : undefined;
    case "nextFrame": return args.length === 0 ? { op: "next" } : undefined;
    case "prevFrame": return args.length === 0 ? { op: "prev" } : undefined;
    case "gotoAndPlay": case "gotoAndStop": {
      const a = args[0];
      if (!a) return undefined;
      const to = a.kind === "str" ? unquoteStr(a.value) : a.kind === "num" ? Number(a.value) : undefined;
      if (to === undefined) return undefined;
      return { op: "goto", to, play: name === "gotoAndPlay" };
    }
    default: return undefined;
  }
}

/**
 * Lê `addFrameScript` do construtor e os métodos que ele referencia, convertendo
 * pra `FrameScriptOp[]` (ver tipo em packages/flash/src/swf/library-types.ts).
 * Statement que não reconhece é ignorado (melhor esforço — loga em `warn` pra
 * aparecer no EXPORT-REPORT, mas ainda aplica o resto do método).
 */
function extractFrameScripts(d: ClassDecl, warn: (m: string) => void): Map<number, FrameScriptOp[]> | undefined {
  const ctor = d.members.find((m): m is MethodMember => m.kind === "method" && m.name === d.name);
  if (!ctor?.fn.body) return undefined;
  const frameToMethod = new Map<number, string>();
  findAddFrameScriptCalls(ctor.fn.body, frameToMethod);
  if (!frameToMethod.size) return undefined;
  const out = new Map<number, FrameScriptOp[]>();
  for (const [frame, methodName] of frameToMethod) {
    const m = d.members.find((x): x is MethodMember => x.kind === "method" && x.name === methodName);
    const body = m?.fn.body;
    if (!body) { warn(`addFrameScript: método "${methodName}" (classe ${d.name}) não encontrado`); continue; }
    const ops: FrameScriptOp[] = [];
    let unrecognized = 0;
    for (const s of body) {
      if (s.kind === "empty") continue;
      const op = toFrameScriptOp(s);
      if (op) ops.push(op);
      else unrecognized++;
    }
    if (unrecognized) warn(`addFrameScript: "${methodName}" (classe ${d.name}) tem ${unrecognized} statement(s) não reconhecido(s) além de ${ops.length} aplicado(s)`);
    if (ops.length) out.set(frame, ops);
  }
  return out.size ? out : undefined;
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
      let frameScripts: Map<number, FrameScriptOp[]> | undefined;
      try { frameScripts = extractFrameScripts(d, (m) => warn(`${fqn}: ${m}`)); }
      catch (e) { warn(`${fqn}: frame scripts: ${(e as Error).message}`); }
      out.set(fqn, { base, hasCode, frameScripts });
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
