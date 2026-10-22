/**
 * Funções de pacote de `flash.utils` (getTimer, setTimeout, getDefinitionByName...).
 */
import { $cls, $tryCls } from "../as3";
import { NATIVE_DESCRIBE } from "../gen/native-describe";
import { XML } from "../xml";
import { safe } from "../player-safe";

const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();

/** ms desde que o "player" iniciou */
export function getTimer(): number {
  return Math.floor((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0);
}

export function setTimeout(fn: Function, delay: number, ...args: any[]): number {
  return globalThis.setTimeout(() => safe(() => fn(...args), "setTimeout"), delay) as unknown as number;
}
export function clearTimeout(id: number): void { globalThis.clearTimeout(id); }
export function setInterval(fn: Function, delay: number, ...args: any[]): number {
  return globalThis.setInterval(() => safe(() => fn(...args), "setInterval"), delay) as unknown as number;
}
export function clearInterval(id: number): void { globalThis.clearInterval(id); }

/** classe pelo nome AS3 (`a.b.C` ou `a.b::C`) */
export function getDefinitionByName(name: string): any {
  return $cls(name);
}

function classOf(v: any): any {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "function") return v;
  return v.constructor;
}

function qn(fqn: string): string {
  const i = fqn.lastIndexOf(".");
  return i < 0 ? fqn : `${fqn.slice(0, i)}::${fqn.slice(i + 1)}`;
}

/** `pacote::Classe` */
export function getQualifiedClassName(v: any): string {
  if (v === null) return "null";
  if (v === undefined) return "void";
  if (typeof v === "number") return Number.isInteger(v) && (v | 0) === v ? "int" : "Number";
  if (typeof v === "string") return "String";
  if (typeof v === "boolean") return "Boolean";
  if (Array.isArray(v)) return "Array";
  const c = classOf(v);
  if (c && Object.prototype.hasOwnProperty.call(c, "$fqn")) return qn(c.$fqn);
  if (c === Object) return "Object";
  return c?.name ?? "Object";
}

export function getQualifiedSuperclassName(v: any): string | null {
  const c = classOf(v);
  const s = c && Object.getPrototypeOf(c);
  if (!s || s === Function.prototype) return c === Object ? null : "Object";
  return getQualifiedClassName(s);
}

/**
 * XML no formato do `describeType` do Flash (só variable/constant/accessor —
 * é o que o jogo usa, em ObjectUtils.copyProperties/encode).
 */
export function describeType(v: any): XML {
  const c = classOf(v);
  const name = getQualifiedClassName(v);
  const members = new Map<string, { kind: string; type: string; access?: string }>();
  const chain: any[] = [];
  for (let k = c; k && k !== Object && k !== Function.prototype; k = Object.getPrototypeOf(k)) chain.unshift(k);
  for (const k of chain) {
    const own = Object.prototype.hasOwnProperty.call(k, "$fqn") ? (k.$fqn as string) : "";
    const desc: string | undefined = Object.prototype.hasOwnProperty.call(k, "$describe") ? k.$describe : NATIVE_DESCRIBE[own];
    if (!desc) continue;
    for (const part of desc.split(";")) {
      const [kind, n, type, access] = part.split(":") as [string, string, string, string | undefined];
      const prev = members.get(n);
      if (prev && prev.kind === "a" && kind === "a" && prev.access !== access) members.set(n, { kind, type, access: "readwrite" });
      else members.set(n, { kind: kind!, type: type!, access });
    }
  }
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const lines = [`<type name="${esc(name)}" base="${esc(getQualifiedSuperclassName(v) ?? "")}" isDynamic="false" isFinal="false" isStatic="${typeof v === "function"}">`];
  for (const [n, m] of members) {
    if (m.kind === "v") lines.push(`<variable name="${esc(n)}" type="${esc(m.type)}"/>`);
    else if (m.kind === "c") lines.push(`<constant name="${esc(n)}" type="${esc(m.type)}"/>`);
    else lines.push(`<accessor name="${esc(n)}" access="${m.access}" type="${esc(m.type)}" declaredBy="${esc(name)}"/>`);
  }
  lines.push("</type>");
  return new XML(lines.join(""));
}

export function escapeMultiByte(s: string): string { return encodeURIComponent(s); }
export function unescapeMultiByte(s: string): string { return decodeURIComponent(s); }

/** namespace `flash_proxy` (só usado como marcador) */
export const flash_proxy = "http://www.adobe.com/2006/actionscript/flash/proxy";

void $tryCls;
