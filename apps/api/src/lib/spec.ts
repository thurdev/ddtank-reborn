/**
 * Compact attribute specs for porting FlashUtils.Create*Info builders:
 *   "ID Power Radii"        attribute = column of the same name
 *   "Count=Type"            attribute from another column
 *   "EndDate:d"             DateTime.ToString("yyyy-MM-dd HH:mm:ss")
 *   "AddTime:D"             DateTime.ToString() (en-US)
 *   "typeVIP:0"             null -> 0 (C# value-type default)
 *   "ActiveType='0'"        constant
 * Null values serialize as "" (the `x == null ? "" : x` pattern used everywhere in FlashUtils).
 */
import { el, fmtDate, fmtDateDefault, type XEl, type XValue } from "./flash-xml.js";

export type Row = Record<string, unknown>;
type Getter = (r: Row) => XValue;
export type Spec = [string, Getter][];

const cache = new Map<string, Spec>();

export function spec(s: string): Spec {
  let out = cache.get(s);
  if (out) return out;
  out = s
    .trim()
    .split(/\s+/)
    .map((tok): [string, Getter] => {
      const c = /^([\w.]+)='(.*)'$/.exec(tok);
      if (c) return [c[1]!, () => c[2]!];
      const m = /^([\w.]+)(?:=([\w.]+))?(?::([dD0]))?$/.exec(tok);
      if (!m) throw new Error(`bad spec token ${tok}`);
      const [, attr, col = attr, fmt] = m as unknown as [string, string, string | undefined, string | undefined];
      const key = col ?? attr;
      if (fmt === "d") return [attr, (r) => fmtDate(r[key] as Date | null)];
      if (fmt === "D") return [attr, (r) => fmtDateDefault(r[key] as Date | null)];
      if (fmt === "0") return [attr, (r) => (r[key] ?? 0) as XValue];
      return [attr, (r) => r[key] as XValue];
    });
  cache.set(s, out);
  return out;
}

export function item(name: string, s: string | Spec, row: Row): XEl {
  const sp = typeof s === "string" ? spec(s) : s;
  return el(
    name,
    sp.map(([k, g]) => [k, g(row)]),
  );
}
