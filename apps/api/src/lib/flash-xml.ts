/**
 * Reproduces System.Xml.Linq output as written by Tank.Request: `XElement.ToString(check:false)`
 * (Bussiness/XmlExtends.cs: XmlWriter, OmitXmlDeclaration, Indent=true -> 2 spaces, CRLF, `<a />` for empty elements)
 * and the value conversions of `new XAttribute(name, object)` (XmlConvert.ToString).
 */
import { deflateSync } from "node:zlib";

export type XValue = string | number | boolean | bigint | Date | null | undefined;

export class XEl {
  attrs: [string, string][] = [];
  children: XEl[] = [];
  constructor(public name: string) {}
  /** XElement.Add(new XAttribute(name, value)) — order of insertion is the serialized order. */
  attr(name: string, value: XValue): this {
    this.attrs.push([name, xval(value)]);
    return this;
  }
  /** Adds attributes from [name, value] pairs. */
  attrsFrom(pairs: [string, XValue][]): this {
    for (const [k, v] of pairs) this.attr(k, v);
    return this;
  }
  add(...kids: (XEl | null | undefined)[]): this {
    for (const k of kids) if (k) this.children.push(k);
    return this;
  }
  toString(): string {
    const out: string[] = [];
    write(this, 0, out);
    return out.join("");
  }
}

export const el = (name: string, attrs?: [string, XValue][], ...children: (XEl | null | undefined)[]) => {
  const e = new XEl(name);
  if (attrs) e.attrsFrom(attrs);
  return e.add(...children);
};

const NL = "\r\n";

function write(e: XEl, depth: number, out: string[]) {
  const pad = "  ".repeat(depth);
  out.push(pad, "<", e.name);
  for (const [k, v] of e.attrs) out.push(" ", k, '="', escAttr(v), '"');
  if (!e.children.length) {
    out.push(" />");
    return;
  }
  out.push(">");
  for (const c of e.children) {
    out.push(NL);
    write(c, depth + 1, out);
  }
  out.push(NL, pad, "</", e.name, ">");
}

export function escAttr(s: string): string {
  return s.replace(/[&<>"\r\n\t]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : c === "\r" ? "&#xD;" : c === "\n" ? "&#xA;" : "&#x9;",
  );
}

/** XmlConvert.ToString for the CLR types our DB values map to. */
export function xval(v: XValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return fmtNumber(v);
  return isoDate(v);
}

/** Double "R" formatting (XmlConvert.ToString(double)). */
export function fmtNumber(n: number): string {
  if (Number.isNaN(n)) return "NaN";
  if (n === Infinity) return "INF";
  if (n === -Infinity) return "-INF";
  const s = String(n);
  const m = /^(-?[\d.]+)e([+-])(\d+)$/.exec(s);
  if (!m) return s;
  return `${m[1]!}E${m[2]!}${m[3]!.padStart(2, "0")}`;
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** XmlConvert.ToString(DateTime, RoundtripKind) for Kind=Unspecified: yyyy-MM-ddTHH:mm:ss[.FFFFFFF]. Dates are wall-clock in UTC fields. */
export function isoDate(d: Date): string {
  const base = `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
  const ms = d.getUTCMilliseconds();
  return ms ? `${base}.${String(ms).padStart(3, "0").replace(/0+$/, "")}` : base;
}

/** DateTime.ToString("yyyy-MM-dd HH:mm:ss"). */
export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
}

/** DateTime.ToString() with en-US culture ("1/24/2013 11:39:32 PM"), as seen in the shipped TemplateAlllist.xml. */
export function fmtDateDefault(d: Date | null | undefined): string {
  if (!d) return "";
  const h = d.getUTCHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()} ${h12}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} ${h < 12 ? "AM" : "PM"}`;
}

/** Wall-clock "now" in the same representation as DB timestamps (UTC fields = server local time). */
export function wallNow(): Date {
  const n = new Date();
  return new Date(n.getTime() - n.getTimezoneOffset() * 60_000);
}

/** `<Result>` root with value/message appended after the children, as every handler does. */
export function result(value: boolean, message: string, children: XEl[] = [], extra: [string, XValue][] = []): XEl {
  const r = new XEl("Result").add(...children);
  r.attr("value", value).attr("message", message);
  for (const [k, v] of extra) r.attr(k, v);
  return r;
}

/** StaticFunction.Compress: zlib level 9 (78 DA header) of the UTF-8 text. */
export const zlibXml = (xml: string) => deflateSync(Buffer.from(xml, "utf8"), { level: 9 });
