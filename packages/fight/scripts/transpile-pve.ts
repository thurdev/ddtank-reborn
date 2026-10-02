/**
 * C# → TypeScript transpiler for the restricted C# subset of the donor PvE scripts
 * (vendor/DDTank4.1/Source Server/Game.Server.Scripts/AI/{Game,Messions,NPC}/*.cs, ~607 classes).
 *
 *   pnpm --filter @ddt/fight transpile-pve [--src=<dir>] [--only=Name1,Name2]
 *
 * Token-based (no full C# parser): classes / fields / methods / properties / constructors are recognised
 * structurally; statements are rewritten token by token (local declarations → `let`, foreach → for-of, casts,
 * `new List<T>` → CsList, implicit `this.`/`Class.` for members, method groups → bound functions, `ref` params → `.v`,
 * C# literals). Output: src/pve/scripts/generated/<Ns>/<Class>.ts + generated/index.ts (registerScript) +
 * generated/report.json. Generated files are `@ts-nocheck` (the runtime API is dynamic); a file whose output does not
 * parse is NOT registered (the engine then falls back to the generic AI). Hand fixes go in src/pve/scripts/manual/
 * (registered after the generated ones, so they win).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, "..");
const repo = path.resolve(pkg, "../..");
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const SRC = arg("src") ?? path.join(repo, "vendor/DDTank4.1/Source Server/Game.Server.Scripts/AI");
const OUT = path.join(pkg, "src/pve/scripts/generated");
const ONLY = arg("only")?.split(",");

// ------------------------------------------------------------------------------------------------ tokenizer
type TK = "ws" | "comment" | "str" | "char" | "num" | "id" | "punc" | "istr";
interface Tok { k: TK; v: string }
const PUNCS = ["??=", "<<=", ">>=", "==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "=>", "??", "?.", "::", "<<"];
function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i]!;
    if (c === "\uFEFF") { i++; continue; }
    if (/\s/.test(c)) {
      let j = i;
      while (j < n && /\s/.test(src[j]!)) j++;
      out.push({ k: "ws", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "#" && (out.length === 0 || /\n\s*$/.test(out[out.length - 1]!.v) || out[out.length - 1]!.k === "ws")) {
      // preprocessor line (#region / #endregion / #if) → dropped
      let j = i;
      while (j < n && src[j] !== "\n") j++;
      i = j;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      let j = i;
      while (j < n && src[j] !== "\n") j++;
      out.push({ k: "comment", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const j = src.indexOf("*/", i + 2);
      const e = j < 0 ? n : j + 2;
      out.push({ k: "comment", v: src.slice(i, e) });
      i = e;
      continue;
    }
    if (c === "@" && src[i + 1] === '"') {
      let j = i + 2, s = "";
      while (j < n) {
        if (src[j] === '"' && src[j + 1] === '"') { s += '"'; j += 2; continue; }
        if (src[j] === '"') break;
        s += src[j]; j++;
      }
      out.push({ k: "str", v: JSON.stringify(s) });
      i = j + 1;
      continue;
    }
    if (c === "$" && src[i + 1] === '"') {
      let j = i + 2;
      while (j < n && src[j] !== '"') { if (src[j] === "\\") j++; j++; }
      out.push({ k: "istr", v: src.slice(i + 2, j) });
      i = j + 1;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < n && src[j] !== '"') { if (src[j] === "\\") j++; j++; }
      out.push({ k: "str", v: src.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== "'") { if (src[j] === "\\") j++; j++; }
      out.push({ k: "char", v: src.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      const m = /^(0x[0-9a-fA-F]+|[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?)([fFdDmMlLuU]{0,2})/.exec(src.slice(i))!;
      out.push({ k: "num", v: m[1]! });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_@\u00C0-\uFFFF]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_\u00C0-\uFFFF]/.test(src[j]!)) j++;
      out.push({ k: "id", v: src.slice(c === "@" ? i + 1 : i, j) });
      i = j;
      continue;
    }
    const p = PUNCS.find((x) => src.startsWith(x, i));
    if (p) {
      out.push({ k: "punc", v: p });
      i += p.length;
      continue;
    }
    out.push({ k: "punc", v: c });
    i++;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ model
const MODIFIERS = new Set(["public", "private", "protected", "internal", "static", "override", "virtual", "readonly", "sealed", "abstract", "new", "const", "unsafe", "extern", "partial", "volatile"]);
const PRIM: Record<string, string> = { int: "0", long: "0", short: "0", byte: "0", uint: "0", ulong: "0", sbyte: "0", ushort: "0", float: "0", double: "0", decimal: "0", bool: "false", string: "null", char: "null", object: "null" };
const NUMERIC = new Set(["int", "long", "short", "byte", "uint", "ulong", "sbyte", "ushort"]);
const FLOATS = new Set(["float", "double", "decimal"]);
const KEYWORDS = new Set(["return", "new", "throw", "else", "case", "goto", "break", "continue", "yield", "await", "if", "while", "for", "foreach", "do", "switch", "using", "lock", "try", "catch", "finally", "default", "typeof", "sizeof", "this", "base", "null", "true", "false", "in", "is", "as", "out", "ref", "checked", "unchecked", "delegate"]);
/** names provided by ../../runtime.ts */
const RUNTIME = new Set(`Living LivingConfig Player TurnedLiving ABrain AMissionControl APVEGameControl registerScript SimpleNpc SimpleBoss PhysicalObj Layer LayerTop Ball TransmissionGate eLivingType PVEGame BaseGame eHardLevel eRoomType eGameType eGameState eMirariType eMessageType CsList CsDictionary CsMath CsRandom Point Rectangle LanguageMgr Console NotImplementedException Exception __arr __newArr __int __fmt __is __as __list __dict FocusAction FocusFreeAction LivingCallFunctionAction LivingBoltMoveAction LivingMoveToAction PlaySoundAction PlayBackgroundSoundAction LockFocusAction ShowBloodItem LivingSayAction LoadingFileInfo NpcCreateParam StringBuilder AbstractEffect ContinueReduceBloodEffect ContinueReduceGreenBloodEffect ReduceStrengthEffect LockDirectionEffect GuardEffect DamageEffect NoHoleEffect IceFronzeEffect HideEffect SealEffect AddDamageEffect ReduceDamageEffect InvinciblyEffect DropInventory eEffectType BuffType`.split(" "));
/** members inherited from the runtime bases (implicit this) */
const BASE_MEMBERS: Record<string, string[]> = {
  ABrain: ["Game", "Body", "m_body", "m_game", "OnCreated", "OnBeginNewTurn", "OnBeginSelfTurn", "OnStartAttacking", "OnStopAttacking", "OnBeforeTakedBomb", "OnAfterTakedBomb", "OnAfterTakedFrozen", "OnBeforeTakedDamage", "OnAfterTakeDamage", "OnHeal", "OnDie", "Die", "OnDieByBomb", "OnDieNewMethod", "OnDiedEvent", "OnDiedSay", "OnKillPlayerSay", "OnShootedSay", "Dispose"],
  AMissionControl: ["Game", "OnPrepareNewSession", "OnPrepareStartGame", "OnPrepareNewGame", "OnStartGame", "OnStartMovie", "OnNewTurnStarted", "OnBeginNewTurn", "CanGameOver", "OnGameOver", "OnGameOverMovie", "OnPrepareGameOver", "OnWaitingGameState", "UpdateUIData", "CalculateScoreGrade", "OnShooted", "OnDied", "OnTakeDamage", "OnMoving", "OnMissionEvent", "OnGeneralCommand", "OnCalculatePoint", "DoOther", "GameOverAllSession", "Dispose"],
  APVEGameControl: ["Game", "OnCreated", "OnPrepated", "OnGameOverAllSession", "CalculateScoreGrade", "Dispose"],
};

interface Member { name: string; kind: "field" | "method" | "prop"; isStatic: boolean }
interface ClassDef { name: string; base: string; ns: string; file: string; members: Member[]; body: [number, number]; toks: Tok[]; flags: string[] }

const sig = (t: Tok | undefined) => !!t && t.k !== "ws" && t.k !== "comment";
function next(toks: Tok[], i: number): number {
  while (i < toks.length && !sig(toks[i])) i++;
  return i;
}
function prev(toks: Tok[], i: number): number {
  while (i >= 0 && !sig(toks[i])) i--;
  return i;
}
function matchClose(toks: Tok[], i: number): number {
  const open = toks[i]!.v, close = open === "{" ? "}" : open === "(" ? ")" : open === "[" ? "]" : ">";
  let d = 0;
  for (let j = i; j < toks.length; j++) {
    if (toks[j]!.k !== "punc") continue;
    if (toks[j]!.v === open) d++;
    else if (toks[j]!.v === close) { d--; if (d === 0) return j; }
  }
  return toks.length - 1;
}
/** parse a type starting at i (identifier[.identifier][<...>][?][[]...]); returns index after it or -1 */
function parseType(toks: Tok[], i: number): number {
  i = next(toks, i);
  const t = toks[i];
  if (!t || t.k !== "id" || KEYWORDS.has(t.v)) return -1;
  let j = i + 1;
  for (;;) {
    const k = next(toks, j);
    const tk = toks[k];
    if (tk?.k === "punc" && tk.v === "." && toks[next(toks, k + 1)]?.k === "id") { j = next(toks, k + 1) + 1; continue; }
    if (tk?.k === "punc" && tk.v === "<") {
      // generic args: only identifiers, commas, dots, [], nested <>
      let d = 0, m = k;
      for (; m < toks.length; m++) {
        const x = toks[m]!;
        if (!sig(x)) continue;
        if (x.v === "<") d++;
        else if (x.v === ">") { d--; if (d === 0) break; }
        else if (!(x.k === "id" || x.v === "," || x.v === "." || x.v === "[" || x.v === "]" || x.v === "?")) return -1;
      }
      j = m + 1;
      continue;
    }
    if (tk?.k === "punc" && tk.v === "?") { const a = toks[next(toks, k + 1)]; if (a?.k === "id") { j = k + 1; continue; } return j; }
    if (tk?.k === "punc" && tk.v === "[") {
      let c = next(toks, k + 1);
      while (toks[c]?.v === ",") c = next(toks, c + 1);
      if (toks[c]?.v === "]") { j = c + 1; continue; }
    }
    return j;
  }
}
const typeText = (toks: Tok[], a: number, b: number) => toks.slice(a, b).filter(sig).map((t) => t.v).join("");

// ------------------------------------------------------------------------------------------------ pass 1: classes
function scanClasses(file: string, src: string): ClassDef[] {
  const toks = tokenize(src);
  const out: ClassDef[] = [];
  let ns = "";
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!;
    if (t.k === "id" && t.v === "namespace") {
      const a = next(toks, i + 1);
      let b = a, s = "";
      while (toks[b] && !(toks[b]!.v === "{")) { if (sig(toks[b])) s += toks[b]!.v; b++; }
      ns = s;
    }
    if (t.k === "id" && (t.v === "class") && toks[prev(toks, i - 1)]?.v !== ".") {
      const ni = next(toks, i + 1);
      const name = toks[ni]!.v;
      let j = next(toks, ni + 1), base = "";
      if (toks[j]?.v === ":") {
        const bi = next(toks, j + 1);
        base = toks[bi]!.v;
        j = bi;
      }
      while (toks[j] && toks[j]!.v !== "{") j++;
      const end = matchClose(toks, j);
      const c: ClassDef = { name, base, ns, file, members: [], body: [j + 1, end], toks, flags: [] };
      scanMembers(c);
      out.push(c);
      i = end;
    }
  }
  return out;
}
function scanMembers(c: ClassDef): void {
  const toks = c.toks;
  let i = c.body[0];
  while (i < c.body[1]) {
    i = next(toks, i);
    if (i >= c.body[1]) break;
    if (toks[i]!.v === "[") { i = matchClose(toks, i) + 1; continue; }
    if (toks[i]!.v === ";") { i++; continue; }
    let isStatic = false;
    while (toks[i]?.k === "id" && MODIFIERS.has(toks[i]!.v)) { if (toks[i]!.v === "static" || toks[i]!.v === "const") isStatic = true; i = next(toks, i + 1); }
    const t = toks[i]!;
    if (t.k === "id" && (t.v === "class" || t.v === "enum" || t.v === "struct")) {
      const b = toks.indexOf(toks.slice(i).find((x) => x.v === "{")!, i);
      if (t.v === "enum") c.members.push({ name: toks[next(toks, i + 1)]!.v, kind: "field", isStatic: true });
      c.flags.push(`nested ${t.v}`);
      i = matchClose(toks, b) + 1;
      continue;
    }
    if (t.k === "id" && t.v === c.name && toks[next(toks, i + 1)]?.v === "(") {
      const p = next(toks, i + 1);
      let b = matchClose(toks, p) + 1;
      while (toks[b] && toks[b]!.v !== "{") b++;
      i = matchClose(toks, b) + 1;
      continue;
    }
    if (t.k === "punc" && t.v === "~") { const b = toks.slice(i).findIndex((x) => x.v === "{") + i; i = matchClose(toks, b) + 1; continue; }
    const te = parseType(toks, i);
    if (te < 0) { i++; continue; }
    const ni = next(toks, te);
    const name = toks[ni]?.v ?? "";
    const after = next(toks, ni + 1);
    const a = toks[after]?.v;
    if (a === "(") {
      c.members.push({ name, kind: "method", isStatic });
      let b = matchClose(toks, after) + 1;
      b = next(toks, b);
      if (toks[b]?.v === ";") { i = b + 1; continue; }
      while (toks[b] && toks[b]!.v !== "{" && toks[b]!.v !== "=>") b++;
      if (toks[b]?.v === "=>") { while (toks[b] && toks[b]!.v !== ";") b++; i = b + 1; continue; }
      i = matchClose(toks, b) + 1;
    } else if (a === "{") {
      c.members.push({ name, kind: "prop", isStatic });
      i = matchClose(toks, after) + 1;
      if (toks[next(toks, i)]?.v === "=") { while (toks[i] && toks[i]!.v !== ";") i++; i++; }
    } else if (a === "=>") {
      c.members.push({ name, kind: "prop", isStatic });
      while (toks[i] && toks[i]!.v !== ";") i++;
      i++;
    } else {
      // field(s): name [= init] {, name [= init]} ;
      let k = ni;
      c.members.push({ name, kind: "field", isStatic });
      let d = 0;
      for (k = ni + 1; k < c.body[1]; k++) {
        const x = toks[k]!;
        if (x.k !== "punc") continue;
        if (x.v === "(" || x.v === "{" || x.v === "[") d++;
        else if (x.v === ")" || x.v === "}" || x.v === "]") d--;
        else if (d === 0 && x.v === ",") { const nn = next(toks, k + 1); if (toks[nn]?.k === "id") c.members.push({ name: toks[nn]!.v, kind: "field", isStatic }); }
        else if (d === 0 && x.v === ";") break;
      }
      i = k + 1;
    }
  }
}

// ------------------------------------------------------------------------------------------------ pass 2: emit
interface Ctx { cls: ClassDef; members: Map<string, Member & { owner: string }>; locals: Set<string>; refs: Set<string>; isStatic: boolean; used: Set<string>; flags: string[]; renames?: Set<string> }

const allClasses = new Map<string, ClassDef>();
function memberMap(c: ClassDef): Map<string, Member & { owner: string }> {
  const m = new Map<string, Member & { owner: string }>();
  const chain: ClassDef[] = [];
  let cur: ClassDef | undefined = c;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.name)) { seen.add(cur.name); chain.unshift(cur); cur = allClasses.get(cur.base); }
  const root = chain[0]!.base;
  for (const n of BASE_MEMBERS[root] ?? BASE_MEMBERS[c.base] ?? []) m.set(n, { name: n, kind: n[0] === "O" || n === "Die" || n === "Dispose" || n === "CanGameOver" || n === "UpdateUIData" || n === "CalculateScoreGrade" || n === "DoOther" || n === "GameOverAllSession" ? "method" : "field", isStatic: false, owner: root });
  for (const k of chain) for (const mem of k.members) m.set(mem.name, { ...mem, owner: k.name });
  return m;
}

/** translate tokens [a, b) of an expression / statement block */
function xlate(toks: Tok[], a: number, b: number, ctx: Ctx): string {
  let out = "";
  const emitIds = (s: string) => s;
  for (let i = a; i < b; i++) {
    const t = toks[i]!;
    if (t.k === "ws" || t.k === "comment") { out += t.v; continue; }
    const pi = prev(toks, i - 1);
    const p = pi >= a ? toks[pi] : toks[pi];
    const ni = next(toks, i + 1);
    const nt = toks[ni];
    if (t.k === "str") { out += t.v; continue; }
    if (t.k === "char") { out += JSON.stringify(eval(t.v.replace(/^'|'$/g, '"').replace(/^"\\''"$/, "\"'\""))); continue; }
    if (t.k === "istr") { out += "`" + t.v.replace(/`/g, "\\`").replace(/\{([^}:]+)(?::[^}]*)?\}/g, "${$1}") + "`"; continue; }
    if (t.k === "num") { out += t.v; continue; }
    if (t.k === "punc") {
      // casts: ( Type ) operand
      if (t.v === "(") {
        const te = parseType(toks, i + 1);
        if (te > 0) {
          const ci = next(toks, te);
          const tname = typeText(toks, i + 1, te);
          const after = toks[next(toks, ci + 1)];
          const looksCast = toks[ci]?.v === ")" && after && (after.k === "id" || after.k === "num" || after.k === "str" || after.v === "(") && !(after.k === "id" && (after.v === "is" || after.v === "as" || after.v === "in"))
            && (PRIM[tname] !== undefined || isTypeName(tname));
          if (looksCast) {
            const opStart = next(toks, ci + 1);
            const opEnd = primaryEnd(toks, opStart, b);
            const inner = xlate(toks, opStart, opEnd, ctx);
            if (NUMERIC.has(tname)) { ctx.used.add("__int"); out += `__int(${inner})`; }
            else out += `(${inner})`;
            i = opEnd - 1;
            continue;
          }
        }
      }
      if (t.v === "[" && p && (p.k === "id" || p.v === ")" || p.v === "]")) {
        const c = matchClose(toks, i);
        const parts: [number, number][] = [];
        let d = 0, s0 = i + 1;
        for (let k = i + 1; k < c; k++) {
          const x = toks[k]!;
          if (x.v === "(" || x.v === "[" || x.v === "{") d++;
          else if (x.v === ")" || x.v === "]" || x.v === "}") d--;
          else if (x.v === "," && d === 0) { parts.push([s0, k]); s0 = k + 1; }
        }
        if (parts.length) {
          parts.push([s0, c]);
          out += parts.map(([x, y]) => `[${xlate(toks, x, y, ctx)}]`).join("");
          i = c;
          continue;
        }
      }
      if (t.v === "{" && ctx.flags.includes("@init")) { out += "["; continue; }
      if (t.v === "}" && ctx.flags.includes("@init")) { out += "]"; continue; }
      out += t.v;
      continue;
    }
    // identifiers / keywords
    const v = t.v;
    const afterDot = p && (p.v === "." || p.v === "?.");
    if (!afterDot) {
      if (v === "base") { out += "super"; continue; }
      if (v === "foreach") { out += "for"; continue; }
      if (v === "in" && ctx.flags.includes("@foreach")) { out += "of"; ctx.flags.splice(ctx.flags.indexOf("@foreach"), 1); continue; }
      if (v === "lock" && nt?.v === "(") { i = matchClose(toks, ni); out += "/*lock*/"; continue; }
      if (v === "ref" || v === "out") { ctx.flags.push(`${v} argument`); continue; }
      if (v === "is" && nt?.k === "id") { const te = parseType(toks, ni); out += "instanceof " + mapType(typeText(toks, ni, te), ctx); i = te - 1; continue; }
      if (v === "as" && nt?.k === "id") { const te = parseType(toks, ni); i = te - 1; continue; }
      if (v === "typeof" && nt?.v === "(") { const c2 = matchClose(toks, ni); out += mapType(typeText(toks, ni + 1, c2), ctx); i = c2; continue; }
      if (v === "default" && nt?.v === "(") { const c2 = matchClose(toks, ni); const tn = typeText(toks, ni + 1, c2); out += PRIM[tn] ?? "null"; i = c2; continue; }
      if (v === "new") { const r = xNew(toks, i, b, ctx); if (r) { out += r.text; i = r.end - 1; continue; } }
      if ((v === "string" || v === "String") && nt?.v === ".") {
        const m = toks[next(toks, ni + 1)]!;
        const mi = next(toks, ni + 1);
        if (m.v === "Format") { ctx.used.add("__fmt"); out += "__fmt"; i = mi; continue; }
        if (m.v === "IsNullOrEmpty") { out += "!"; i = mi; continue; }
        if (m.v === "Empty") { out += '""'; i = mi; continue; }
        if (m.v === "Join") { out += "((s, a) => [...a].join(s))"; i = mi; continue; }
        if (m.v === "Concat") { out += "((...a) => a.join(''))"; i = mi; continue; }
      }
      if ((v === "int" || v === "Int32" || v === "long") && nt?.v === ".") {
        const mi = next(toks, ni + 1), m = toks[mi]!.v;
        if (m === "MaxValue") { out += "2147483647"; i = mi; continue; }
        if (m === "MinValue") { out += "-2147483648"; i = mi; continue; }
        if (m === "Parse") { out += "parseInt"; i = mi; continue; }
      }
      if ((v === "double" || v === "float") && nt?.v === ".") {
        const mi = next(toks, ni + 1), m = toks[mi]!.v;
        if (m === "MaxValue") { out += "Number.MAX_VALUE"; i = mi; continue; }
        if (m === "MinValue") { out += "-Number.MAX_VALUE"; i = mi; continue; }
        if (m === "Parse") { out += "parseFloat"; i = mi; continue; }
      }
      if (v === "Convert" && nt?.v === ".") { const mi = next(toks, ni + 1); ctx.used.add("__int"); out += toks[mi]!.v.startsWith("ToInt") ? "__int" : toks[mi]!.v === "ToBoolean" ? "Boolean" : toks[mi]!.v === "ToString" ? "String" : "Number"; i = mi; continue; }
      if (v === "Math" && nt?.v === ".") { ctx.used.add("CsMath"); out += "CsMath"; continue; }
      if (v === "Random" && p?.v === "new") { ctx.used.add("CsRandom"); out += "CsRandom"; continue; }
      // local declaration?
      const decl = declAt(toks, i, b, ctx);
      if (decl) { out += decl.text; i = decl.end - 1; continue; }
      if (ctx.refs.has(v) && !ctx.locals.has(v + "#shadow")) { out += `${v}.v`; continue; }
      // a local named like a type (C# `Point[] Point = {...}`) would shadow the class in JS → rename it
      if (ctx.locals.has(v) && (RUNTIME.has(v) || allClasses.has(v)) && p?.v !== "new") { out += `${v}_`; continue; }
      if (!ctx.locals.has(v)) {
        const m = ctx.members.get(v);
        if (m && !(nt?.v === ":" && toks[next(toks, ni + 1)]?.v !== ":")) {
          const owner = m.isStatic ? m.owner : "this";
          if (m.kind === "method" && nt?.v !== "(") { out += m.isStatic ? `${owner}.${v}` : `${owner}.${v}.bind(this)`; continue; }
          out += `${owner}.${v}`;
          continue;
        }
      }
      if (RUNTIME.has(v)) ctx.used.add(v);
      else if (allClasses.has(v) && v !== ctx.cls.name) ctx.used.add("cls:" + v);
      if (v === "List" || v === "Dictionary") { out += v === "List" ? "CsList" : "CsDictionary"; ctx.used.add(v === "List" ? "CsList" : "CsDictionary"); continue; }
    } else {
      if (v === "ToString" && nt?.v === "(") { out += "toString"; continue; }
      if (v === "Length") { out += "length"; continue; }
      if (v === "Count" && nt?.v === "(") { const c2 = matchClose(toks, ni); out += "length"; i = c2; continue; }
    }
    // generic method call Foo<T>(
    if (nt?.v === "<") {
      const close = matchClose(toks, ni);
      if (toks[next(toks, close + 1)]?.v === "(" && toks.slice(ni, close).every((x) => !sig(x) || x.k === "id" || x.v === "," || x.v === "<" || x.v === "." || x.v === ">" || x.v === "[" || x.v === "]")) {
        out += v;
        i = close;
        continue;
      }
    }
    out += emitIds(v);
  }
  return out;
}
/** array initializer contents: nested `{a, b}` rows become `[a, b]` */
function initX(toks: Tok[], a: number, b: number, ctx: Ctx): string {
  ctx.flags.push("@init");
  try {
    return xlate(toks, a, b, ctx);
  } finally {
    ctx.flags.splice(ctx.flags.lastIndexOf("@init"), 1);
  }
}
function isTypeName(n: string): boolean {
  const base = n.replace(/<.*$/, "").replace(/\[\]$/, "").split(".").pop()!;
  return RUNTIME.has(base) || allClasses.has(base) || /^(List|Dictionary|IList|IEnumerable|Physics|Box|PhysicalObj|Living|Player|SimpleNpc|SimpleBoss|TurnedLiving|PVEGame|BaseGame|LivingConfig|Point|Layer|Ball|NpcInfo|MissionInfo|SimpleWingBoss|LivingCallBack|LivingCallBackHandle|IAction|Physics|object|Object)$/.test(base);
}
function mapType(n: string, ctx: Ctx): string {
  const base = n.replace(/<.*$/, "").replace(/\[\]$/, "").split(".").pop()!;
  if (base === "List" || base === "IList") { ctx.used.add("CsList"); return "CsList"; }
  if (base === "Dictionary") { ctx.used.add("CsDictionary"); return "CsDictionary"; }
  if (base === "SimpleWingBoss") { ctx.used.add("SimpleBoss"); return "SimpleBoss"; }
  if (base === "string") return "String";
  if (RUNTIME.has(base)) ctx.used.add(base);
  else if (allClasses.has(base)) ctx.used.add("cls:" + base);
  return base;
}
/** end of a primary expression (for cast operands): ident/literal/(group) followed by .member, (args), [idx] */
function primaryEnd(toks: Tok[], i: number, b: number): number {
  let j = i;
  const t = toks[j]!;
  if (t.v === "(") j = matchClose(toks, j) + 1;
  else if (t.v === "new") {
    j = parseType(toks, j + 1);
    if (j < 0) return i + 1;
    const k = next(toks, j);
    if (toks[k]?.v === "(" || toks[k]?.v === "[" || toks[k]?.v === "{") j = matchClose(toks, k) + 1;
  } else j++;
  for (;;) {
    const k = next(toks, j);
    if (k >= b) return j;
    const x = toks[k]!;
    if ((x.v === "." || x.v === "?.") && toks[next(toks, k + 1)]?.k === "id") { j = next(toks, k + 1) + 1; continue; }
    if (x.v === "(" || x.v === "[") { j = matchClose(toks, k) + 1; continue; }
    return j;
  }
}
/** `new ...` rewrites */
function xNew(toks: Tok[], i: number, b: number, ctx: Ctx): { text: string; end: number } | null {
  const ts0 = next(toks, i + 1);
  const te = parseType(toks, ts0);
  if (te < 0) {
    if (toks[ts0]?.v === "[") { // new[] { ... }
      const c = matchClose(toks, ts0), ob = next(toks, c + 1);
      if (toks[ob]?.v === "{") { const e = matchClose(toks, ob); ctx.used.add("__arr"); return { text: `__arr([${initX(toks, ob + 1, e, ctx)}])`, end: e + 1 }; }
    }
    return null;
  }
  const tn = typeText(toks, ts0, te);
  const base = tn.replace(/<.*$/, "").replace(/\[\]$/, "");
  const k = next(toks, te);
  const after = toks[k];
  if (/\[,*\]$/.test(tn)) {
    // new T[] { a, b }
    if (after?.v === "{") { const e = matchClose(toks, k); ctx.used.add("__arr"); return { text: `__arr([${initX(toks, k + 1, e, ctx)}])`, end: e + 1 }; }
  }
  // new T[n] / new T[n] {..}
  if (after?.v === "[") {
    const c = matchClose(toks, k);
    const ob = next(toks, c + 1);
    if (toks[ob]?.v === "{") { const e = matchClose(toks, ob); ctx.used.add("__arr"); return { text: `__arr([${initX(toks, ob + 1, e, ctx)}])`, end: e + 1 }; }
    ctx.used.add("__newArr");
    return { text: `__newArr(${xlate(toks, k + 1, c, ctx)}, ${PRIM[base] ?? "null"})`, end: c + 1 };
  }
  if (base === "LivingCallBack" || base === "LivingCallBackHandle") {
    const c = matchClose(toks, k);
    return { text: `(${xlate(toks, k + 1, c, ctx)})`, end: c + 1 };
  }
  if ((base === "List" || base === "IList" || base === "HashSet") && after?.v === "{") {
    const e = matchClose(toks, k);
    ctx.used.add("__arr");
    return { text: `__arr([${initX(toks, k + 1, e, ctx)}])`, end: e + 1 };
  }
  if (base === "List" || base === "IList" || base === "HashSet") {
    const c = matchClose(toks, k);
    ctx.used.add("__list");
    let text = `__list(${xlate(toks, k + 1, c, ctx)})`;
    let end = c + 1;
    const ob = next(toks, end);
    if (toks[ob]?.v === "{") { const e = matchClose(toks, ob); ctx.used.add("__arr"); text = `__arr([${xlate(toks, ob + 1, e, ctx)}])`; end = e + 1; }
    return { text, end };
  }
  if (base === "Dictionary") { const c = matchClose(toks, k); ctx.used.add("__dict"); return { text: `__dict()`, end: c + 1 }; }
  if (after?.v === "(") {
    const c = matchClose(toks, k);
    const ob = next(toks, c + 1);
    const ctor = base === "Random" ? "CsRandom" : base === "SimpleWingBoss" ? "SimpleBoss" : base.split(".").pop()!;
    if (RUNTIME.has(ctor)) ctx.used.add(ctor);
    else if (allClasses.has(ctor)) ctx.used.add("cls:" + ctor);
    else ctx.flags.push(`unknown type new ${ctor}`);
    let text = `new ${ctor}(${xlate(toks, k + 1, c, ctx)})`;
    let end = c + 1;
    if (toks[ob]?.v === "{") {
      // object initializer { A = 1, B = 2 }
      const e = matchClose(toks, ob);
      const body = xlate(toks, ob + 1, e, ctx).replace(/(^|,)\s*([A-Za-z_]\w*)\s*=/g, "$1 $2:");
      text = `Object.assign(${text}, {${body}})`;
      end = e + 1;
    }
    return { text, end };
  }
  if (after?.v === "{") {
    const e = matchClose(toks, k);
    const ctor = base.split(".").pop()!;
    if (RUNTIME.has(ctor)) ctx.used.add(ctor);
    const body = xlate(toks, k + 1, e, ctx).replace(/(^|,)\s*([A-Za-z_]\w*)\s*=/g, "$1 $2:");
    return { text: `Object.assign(new ${ctor}(), {${body}})`, end: e + 1 };
  }
  return null;
}
const localName = (n: string) => (RUNTIME.has(n) || allClasses.has(n) ? `${n}_` : n);
/** local variable declaration at i (statement start)? → "let a = …, b" */
function declAt(toks: Tok[], i: number, b: number, ctx: Ctx): { text: string; end: number } | null {
  const pi = prev(toks, i - 1);
  const p = toks[pi];
  const ppi = prev(toks, pi - 1);
  const stmtStart = !p || p.v === "{" || p.v === "}" || p.v === ";" || p.v === ":" || (p.v === "(" && (toks[ppi]?.v === "for" || toks[ppi]?.v === "foreach" || toks[ppi]?.v === "using")) || (p.k === "id" && p.v === "else");
  if (!stmtStart) return null;
  if (p?.v === ":" && toks[prev(toks, pi - 1)]?.v === "?") return null;
  const te = parseType(toks, i);
  if (te < 0) return null;
  const ni = next(toks, te);
  const nm = toks[ni];
  if (!nm || nm.k !== "id" || KEYWORDS.has(nm.v)) return null;
  const a = toks[next(toks, ni + 1)];
  if (!a || !(a.v === "=" || a.v === ";" || a.v === "," || a.v === "in")) return null;
  const isForeach = p?.v === "(" && toks[ppi]?.v === "foreach";
  const tname = typeText(toks, i, te);
  if (isForeach) { ctx.flags.push("@foreach"); return { text: "const", end: te }; }
  // array initializer: T[] x = { ... }
  const eq = next(toks, ni + 1);
  if (/\[,*\]$/.test(tname) && toks[eq]?.v === "=" && toks[next(toks, eq + 1)]?.v === "{") {
    const ob = next(toks, eq + 1), e = matchClose(toks, ob);
    ctx.used.add("__arr");
    return { text: `let ${localName(nm.v)} = __arr([${initX(toks, ob + 1, e, ctx)}])`, end: e + 1 };
  }
  // uninitialised value-type locals get their C# default (int x; → let x = 0)
  if (a.v === ";" && PRIM[tname] !== undefined) return { text: `let ${localName(nm.v)} = ${PRIM[tname]}`, end: ni + 1 };
  return { text: "let", end: te };
}
/** collect locals + params declared in [a,b) */
function collectLocals(toks: Tok[], a: number, b: number, into: Set<string>): void {
  for (let i = a; i < b; i++) {
    if (!sig(toks[i])) continue;
    const pi = prev(toks, i - 1);
    const p = toks[pi];
    const ppi = prev(toks, pi - 1);
    const ok = !p || p.v === "{" || p.v === "}" || p.v === ";" || p.v === ":" || p.v === "else" || (p.v === "(" && (toks[ppi]?.v === "for" || toks[ppi]?.v === "foreach" || toks[ppi]?.v === "catch"));
    if (!ok) continue;
    const te = parseType(toks, i);
    if (te < 0) continue;
    const ni = next(toks, te);
    const nm = toks[ni];
    const a2 = toks[next(toks, ni + 1)];
    if (nm?.k === "id" && !KEYWORDS.has(nm.v) && a2 && (a2.v === "=" || a2.v === ";" || a2.v === "," || a2.v === "in" || a2.v === ")")) into.add(nm.v);
  }
  // lambda params  x => / (a, b) =>
  for (let i = a; i < b; i++) if (toks[i]!.v === "=>") {
    const pi = prev(toks, i - 1);
    if (toks[pi]?.k === "id") into.add(toks[pi]!.v);
    else if (toks[pi]?.v === ")") { let j = pi; while (j > a && toks[j]!.v !== "(") { if (toks[j]!.k === "id") into.add(toks[j]!.v); j--; } }
  }
}
/** parameter list → "a, b = 1" ; ref params recorded */
function params(toks: Tok[], a: number, b: number, ctx: Ctx): string {
  const parts: string[] = [];
  let i = next(toks, a);
  while (i < b) {
    let isRef = false;
    while (toks[i]?.k === "id" && (toks[i]!.v === "ref" || toks[i]!.v === "out" || toks[i]!.v === "params" || toks[i]!.v === "this")) { if (toks[i]!.v !== "params" && toks[i]!.v !== "this") isRef = true; i = next(toks, i + 1); }
    if (toks[i]?.v === "[") i = next(toks, matchClose(toks, i) + 1);
    const te = parseType(toks, i);
    if (te < 0) break;
    const ni = next(toks, te);
    const name = toks[ni]!.v;
    ctx.locals.add(name);
    if (isRef) ctx.refs.add(name);
    let j = next(toks, ni + 1), def = "";
    if (toks[j]?.v === "=") {
      let d = 0, k = j + 1;
      for (; k < b; k++) { const x = toks[k]!; if (x.v === "(") d++; else if (x.v === ")") d--; else if (x.v === "," && d === 0) break; }
      def = " = " + xlate(toks, j + 1, k, ctx).trim();
      j = k;
    }
    parts.push(name + def);
    i = next(toks, j);
    if (toks[i]?.v === ",") i = next(toks, i + 1);
  }
  return parts.join(", ");
}

function emitClass(c: ClassDef): { code: string; flags: string[]; used: Set<string> } {
  const toks = c.toks;
  const members = memberMap(c);
  const used = new Set<string>();
  const flags = [...c.flags];
  const baseName = c.base && (RUNTIME.has(c.base) || allClasses.has(c.base)) ? c.base : c.base ? "ABrain" : "";
  if (c.base && !RUNTIME.has(c.base) && !allClasses.has(c.base)) flags.push(`unknown base ${c.base}`);
  if (baseName) { if (RUNTIME.has(baseName)) used.add(baseName); else used.add("cls:" + baseName); }
  const lines: string[] = [];
  const statics: string[] = [];
  const fields: string[] = [];
  const seenMethods = new Map<string, number>();
  let ctorText = "";
  let i = c.body[0];
  const mk = (isStatic: boolean): Ctx => ({ cls: c, members, locals: new Set(), refs: new Set(), isStatic, used, flags });
  while (i < c.body[1]) {
    const start = i;
    i = next(toks, i);
    if (i >= c.body[1]) break;
    // carry leading comments
    const lead = toks.slice(start, i).filter((t) => t.k === "comment").map((t) => "  " + t.v).join("\n");
    if (toks[i]!.v === "[") { i = matchClose(toks, i) + 1; continue; }
    if (toks[i]!.v === ";") { i++; continue; }
    let isStatic = false;
    while (toks[i]?.k === "id" && MODIFIERS.has(toks[i]!.v)) { if (toks[i]!.v === "static" || toks[i]!.v === "const") isStatic = true; i = next(toks, i + 1); }
    const t = toks[i]!;
    if (t.k === "id" && (t.v === "class" || t.v === "struct")) { const b = toks.slice(i).findIndex((x) => x.v === "{") + i; i = matchClose(toks, b) + 1; continue; }
    if (t.k === "id" && t.v === "enum") {
      const ni = next(toks, i + 1);
      const b = toks.slice(i).findIndex((x) => x.v === "{") + i;
      const e = matchClose(toks, b);
      let n = 0;
      const ents = typeText(toks, b + 1, e).split(",").filter(Boolean).map((s) => { const [k, val] = s.split("="); if (val !== undefined) n = Number(val); return `${k}: ${n++}`; });
      statics.push(`  static ${toks[ni]!.v} = { ${ents.join(", ")} };`);
      i = e + 1;
      continue;
    }
    if (lead) (isStatic ? statics : lines).push(lead);
    if (t.k === "id" && t.v === c.name && toks[next(toks, i + 1)]?.v === "(") {
      const p = next(toks, i + 1), pe = matchClose(toks, p);
      const ctx = mk(false);
      const ps = params(toks, p + 1, pe, ctx);
      let b = next(toks, pe + 1);
      let sup = "super();";
      if (toks[b]?.v === ":") {
        const kw = next(toks, b + 1), ap = next(toks, kw + 1), ae = matchClose(toks, ap);
        sup = toks[kw]!.v === "base" ? `super(${xlate(toks, ap + 1, ae, ctx)});` : `/* this(...) */ super();`;
        b = next(toks, ae + 1);
      }
      const e = matchClose(toks, b);
      collectLocals(toks, b + 1, e, ctx.locals);
      ctorText = `  constructor(${ps}) {\n    ${baseName ? sup : ""}${xlate(toks, b + 1, e, ctx)}}`;
      i = e + 1;
      continue;
    }
    if (t.k === "punc" && t.v === "~") { const b = toks.slice(i).findIndex((x) => x.v === "{") + i; i = matchClose(toks, b) + 1; continue; }
    const te = parseType(toks, i);
    if (te < 0) { i++; continue; }
    const tname = typeText(toks, i, te);
    const ni = next(toks, te);
    const name = toks[ni]!.v;
    const after = next(toks, ni + 1);
    const a = toks[after]?.v;
    const st = isStatic ? "static " : "";
    if (a === "(") {
      const pe = matchClose(toks, after);
      const ctx = mk(isStatic);
      const ps = params(toks, after + 1, pe, ctx);
      let b = next(toks, pe + 1);
      if (toks[b]?.v === ";") { i = b + 1; continue; }
      while (toks[b] && toks[b]!.v !== "{" && toks[b]!.v !== "=>") b++;
      const cnt = (seenMethods.get(name) ?? 0) + 1;
      seenMethods.set(name, cnt);
      const mname = cnt > 1 ? `${name}$${cnt}` : name;
      if (cnt > 1) flags.push(`overload ${name}`);
      if (toks[b]?.v === "=>") {
        let e = b; while (toks[e] && toks[e]!.v !== ";") e++;
        collectLocals(toks, b + 1, e, ctx.locals);
        (isStatic ? statics : lines).push(`  ${st}${mname}(${ps}) { return ${xlate(toks, b + 1, e, ctx).trim()}; }`);
        i = e + 1;
        continue;
      }
      const e = matchClose(toks, b);
      collectLocals(toks, b + 1, e, ctx.locals);
      for (const r of ctx.refs) ctx.locals.delete(r);
      (isStatic ? statics : lines).push(`  ${st}${mname}(${ps}) {${xlate(toks, b + 1, e, ctx)}}`);
      i = e + 1;
    } else if (a === "{") {
      // property: { get {..} set {..} } or { get; set; } [= init;]
      const e = matchClose(toks, after);
      const inner = toks.slice(after + 1, e).filter(sig).map((x) => x.v).join(" ");
      let end = e + 1;
      if (/^(\w+ )?get ;( (\w+ )?set ;)?$/.test(inner) || /^(\w+ )?set ;( (\w+ )?get ;)?$/.test(inner)) {
        let init = PRIM[tname] ?? "null";
        const eq = next(toks, end);
        if (toks[eq]?.v === "=") { let k = eq; while (toks[k] && toks[k]!.v !== ";") k++; init = xlate(toks, eq + 1, k, mk(isStatic)).trim(); end = k + 1; }
        (isStatic ? statics : fields).push(`  ${st}${name} = ${init};`);
      } else {
        let k = after + 1;
        while (k < e) {
          k = next(toks, k);
          if (k >= e) break;
          while (toks[k]?.k === "id" && MODIFIERS.has(toks[k]!.v)) k = next(toks, k + 1);
          const acc = toks[k]!.v;
          const ob = next(toks, k + 1);
          if (toks[ob]?.v === "=>") { let q = ob; while (toks[q] && toks[q]!.v !== ";") q++; const ctx = mk(isStatic); (isStatic ? statics : lines).push(acc === "get" ? `  ${st}get ${name}() { return ${xlate(toks, ob + 1, q, ctx).trim()}; }` : `  ${st}set ${name}(value) { ${xlate(toks, ob + 1, q, ctx).trim()}; }`); k = q + 1; continue; }
          if (toks[ob]?.v !== "{") { k = ob + 1; continue; }
          const oe = matchClose(toks, ob);
          const ctx = mk(isStatic);
          ctx.locals.add("value");
          collectLocals(toks, ob + 1, oe, ctx.locals);
          (isStatic ? statics : lines).push(acc === "get" ? `  ${st}get ${name}() {${xlate(toks, ob + 1, oe, ctx)}}` : `  ${st}set ${name}(value) {${xlate(toks, ob + 1, oe, ctx)}}`);
          k = oe + 1;
        }
      }
      i = end;
    } else if (a === "=>") {
      let e = after; while (toks[e] && toks[e]!.v !== ";") e++;
      (isStatic ? statics : lines).push(`  ${st}get ${name}() { return ${xlate(toks, after + 1, e, mk(isStatic)).trim()}; }`);
      i = e + 1;
    } else {
      // fields
      let k = ni, d = 0, segStart = ni;
      const emitField = (s: number, e2: number) => {
        const nmI = next(toks, s);
        const nm = toks[nmI]!.v;
        const eq = next(toks, nmI + 1);
        let init = PRIM[tname] ?? "null";
        if (toks[eq]?.v === "=" && eq < e2) {
          const ctx = mk(isStatic);
          const ob = next(toks, eq + 1);
          if (toks[ob]?.v === "{") { const oe = matchClose(toks, ob); used.add("__arr"); init = `__arr([${initX(toks, ob + 1, oe, ctx)}])`; }
          else init = xlate(toks, eq + 1, e2, ctx).trim();
        }
        (isStatic ? statics : fields).push(`  ${st}${nm} = ${init};`);
      };
      for (k = ni + 1; k < c.body[1]; k++) {
        const x = toks[k]!;
        if (x.k !== "punc") continue;
        if (x.v === "(" || x.v === "{" || x.v === "[") d++;
        else if (x.v === ")" || x.v === "}" || x.v === "]") d--;
        else if (d === 0 && x.v === ",") { emitField(segStart, k); segStart = k + 1; }
        else if (d === 0 && x.v === ";") break;
      }
      emitField(segStart, k);
      i = k + 1;
    }
  }
  const ext = baseName ? ` extends ${baseName}` : "";
  const code = `export class ${c.name}${ext} {\n${statics.join("\n")}${statics.length ? "\n" : ""}${fields.join("\n")}${fields.length ? "\n" : ""}${ctorText ? ctorText + "\n" : ""}${lines.join("\n")}\n}\n`;
  return { code, flags: [...new Set(flags.filter((f) => !f.startsWith("@")))], used };
}

// ------------------------------------------------------------------------------------------------ main
interface Report { name: string; full: string; ns: string; file: string; status: "ok" | "syntax-error" | "skipped"; flags: string[]; error?: string }

function main(): void {
  const dirs = ["Game", "Messions", "NPC"];
  const classes: ClassDef[] = [];
  for (const d of dirs) {
    const dir = path.join(SRC, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".cs")).sort()) {
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      for (const c of scanClasses(`${d}/${f}`, src)) classes.push(c);
    }
  }
  // duplicates (same class name in two files): keep the first
  for (const c of classes) if (!allClasses.has(c.name)) allClasses.set(c.name, c);
  fs.rmSync(OUT, { recursive: true, force: true });
  const reports: Report[] = [];
  const registered: { full: string; cls: string; rel: string }[] = [];
  const nsDir = (ns: string) => (ns.endsWith(".Messions") ? "Messions" : ns.endsWith(".Game") ? "Game" : "NPC");
  for (const c of allClasses.values()) {
    if (ONLY && !ONLY.includes(c.name)) continue;
    const full = `${c.ns || "GameServerScript.AI.NPC"}.${c.name}`;
    const sub = nsDir(c.ns);
    let res: { code: string; flags: string[]; used: Set<string> };
    try {
      res = emitClass(c);
    } catch (e) {
      reports.push({ name: c.name, full, ns: c.ns, file: c.file, status: "syntax-error", flags: [], error: `transpiler: ${(e as Error).message}` });
      continue;
    }
    const rt = [...res.used].filter((u) => !u.startsWith("cls:") && RUNTIME.has(u)).sort();
    const deps = [...res.used].filter((u) => u.startsWith("cls:")).map((u) => u.slice(4)).filter((n) => n !== c.name).sort();
    const imports = [`import { ${["registerScript", ...rt.filter((x) => x !== "registerScript")].join(", ")} } from "../../runtime.js";`];
    for (const d of deps) {
      const dc = allClasses.get(d)!;
      const ds = nsDir(dc.ns);
      imports.push(`import { ${d} } from "${ds === sub ? "." : `../${ds}`}/${d}.js";`);
    }
    const header = `// @ts-nocheck\n// AUTO-GENERATED by packages/fight/scripts/transpile-pve.ts from donor ${c.file} — do not edit; hand fixes go in ../../manual/.\n/* eslint-disable */\n`;
    const code = `${header}${imports.join("\n")}\n\n${res.code}`;
    const diag = ts.transpileModule(code, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).diagnostics ?? [];
    const rel = `${sub}/${c.name}`;
    fs.mkdirSync(path.join(OUT, sub), { recursive: true });
    fs.writeFileSync(path.join(OUT, `${rel}.ts`), code);
    if (diag.length) {
      const d0 = diag[0]!;
      const pos = d0.file && d0.start !== undefined ? d0.file.getLineAndCharacterOfPosition(d0.start) : null;
      reports.push({ name: c.name, full, ns: c.ns, file: c.file, status: "syntax-error", flags: res.flags, error: `${pos ? `${pos.line + 1}:${pos.character + 1} ` : ""}${ts.flattenDiagnosticMessageText(d0.messageText, " ")}` });
    } else {
      reports.push({ name: c.name, full, ns: c.ns, file: c.file, status: "ok", flags: res.flags });
      registered.push({ full, cls: c.name, rel });
    }
  }
  const idx = [
    "// @ts-nocheck\n// AUTO-GENERATED by packages/fight/scripts/transpile-pve.ts — registers every transpiled donor script that parses.",
    'import { registerScript } from "../runtime.js";',
    ...registered.map((r, i) => `import { ${r.cls} as C${i} } from "./${r.rel}.js";`),
    "",
    "export const GENERATED_SCRIPTS: [string, unknown][] = [",
    ...registered.map((r, i) => `  [${JSON.stringify(r.full)}, C${i}],`),
    "];",
    'for (const [n, c] of GENERATED_SCRIPTS) registerScript(n, c as never, undefined, "generated");',
    "",
  ];
  fs.writeFileSync(path.join(OUT, "index.ts"), idx.join("\n"));
  const ok = reports.filter((r) => r.status === "ok").length;
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ total: reports.length, ok, syntaxError: reports.length - ok, scripts: reports }, null, 1));
  console.log(`transpiled ${reports.length} classes: ${ok} ok, ${reports.length - ok} syntax errors; flagged: ${reports.filter((r) => r.flags.length).length}`);
  for (const r of reports.filter((x) => x.status !== "ok").slice(0, 40)) console.log(`  ${r.name}: ${r.error}`);
}
main();
