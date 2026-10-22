/**
 * HTML do TextField do Flash (subconjunto): `<p align>`, `<font face size
 * color letterSpacing>`, `<b>`, `<i>`, `<u>`, `<br>`, `<a href target>`,
 * `<textformat leading indent leftmargin rightmargin>`, `<li>`, `<span>`.
 * Converte pra trechos com TextFormat e de volta.
 */
import { TextFormat } from "./TextFormat";

export interface Run { text: string; fmt: TextFormat }

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e.toLowerCase()] ?? m;
  });
}
function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    out[m[1]!.toLowerCase()] = decode(m[3] ?? m[4] ?? m[5] ?? "");
  }
  return out;
}
function parseColor(c: string): number | null {
  const s = c.trim().replace(/^#/, "").replace(/^0x/i, "");
  const n = parseInt(s, 16);
  return Number.isNaN(n) ? null : n;
}

export function parseFlashHtml(html: string, base: TextFormat, condenseWhite: boolean, _multiline: boolean): Run[] {
  const runs: Run[] = [];
  const stack: TextFormat[] = [base.$clone()];
  const top = () => stack[stack.length - 1]!;
  const push = (text: string) => {
    if (!text) return;
    const fmt = top();
    const last = runs[runs.length - 1];
    if (last && last.fmt.$equals(fmt)) last.text += text;
    else runs.push({ text, fmt: fmt.$clone() });
  };
  let inP = false;
  let afterP = false;
  const re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[5] !== undefined) {
      let t = decode(m[5]);
      if (condenseWhite) t = t.replace(/\s+/g, " ");
      t = t.replace(/\r\n?/g, "\n");
      if (afterP && t.trim()) { push("\n"); afterP = false; }
      push(t);
      continue;
    }
    const closing = m[1] === "/";
    const tag = m[2]!.toLowerCase();
    const attrs = parseAttrs(m[3] ?? "");
    const selfClose = m[4] === "/" || tag === "br" || tag === "img";
    if (tag === "br") { push("\n"); continue; }
    if (closing) {
      if (["font", "b", "i", "u", "a", "textformat", "li", "span", "p"].includes(tag) && stack.length > 1) stack.pop();
      if (tag === "p" || tag === "li") { inP = false; afterP = true; }
      continue;
    }
    if (selfClose) continue;
    if (afterP) { push("\n"); afterP = false; }
    const f = top().$clone();
    switch (tag) {
      case "p":
        if (attrs.align) f.align = attrs.align.toLowerCase();
        inP = true;
        break;
      case "font":
        if (attrs.face) f.font = attrs.face;
        if (attrs.size) {
          const sz = attrs.size;
          f.size = /^[+-]/.test(sz) ? (f.size ?? 12) + Number(sz) : Number(sz);
        }
        if (attrs.color) f.color = parseColor(attrs.color);
        if (attrs.letterspacing) f.letterSpacing = Number(attrs.letterspacing);
        if (attrs.kerning) f.kerning = attrs.kerning !== "0";
        break;
      case "b": f.bold = true; break;
      case "i": f.italic = true; break;
      case "u": f.underline = true; break;
      case "a":
        if (attrs.href) f.url = attrs.href;
        if (attrs.target) f.target = attrs.target;
        break;
      case "textformat":
        if (attrs.leading) f.leading = Number(attrs.leading);
        if (attrs.indent) f.indent = Number(attrs.indent);
        if (attrs.leftmargin) f.leftMargin = Number(attrs.leftmargin);
        if (attrs.rightmargin) f.rightMargin = Number(attrs.rightmargin);
        if (attrs.blockindent) f.blockIndent = Number(attrs.blockindent);
        break;
      case "li":
        f.bullet = true;
        push("• ");
        break;
      case "span":
        break;
      default:
        continue; // tag desconhecida: ignora (não empilha)
    }
    stack.push(f);
  }
  void inP;
  return runs;
}

const colorHex = (c: number | null) => "#" + ((c ?? 0) >>> 0 & 0xffffff).toString(16).toUpperCase().padStart(6, "0");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** volta pro htmlText (formato parecido com o que o Flash devolve) */
export function runsToHtml(runs: Run[], base: TextFormat): string {
  const paras: Run[][] = [[]];
  for (const r of runs) {
    const parts = r.text.split("\n");
    parts.forEach((p, i) => {
      if (i > 0) paras.push([]);
      if (p) paras[paras.length - 1]!.push({ text: p, fmt: r.fmt });
    });
  }
  return paras.map((rs) => {
    const align = (rs[0]?.fmt.align ?? base.align ?? "left").toUpperCase();
    const inner = rs.map((r) => {
      let s = esc(r.text);
      if (r.fmt.underline) s = `<U>${s}</U>`;
      if (r.fmt.italic) s = `<I>${s}</I>`;
      if (r.fmt.bold) s = `<B>${s}</B>`;
      if (r.fmt.url) s = `<A HREF="${esc(r.fmt.url)}" TARGET="${esc(r.fmt.target ?? "")}">${s}</A>`;
      return `<FONT FACE="${esc(r.fmt.font ?? "")}" SIZE="${r.fmt.size ?? 12}" COLOR="${colorHex(r.fmt.color)}" LETTERSPACING="${r.fmt.letterSpacing ?? 0}" KERNING="${r.fmt.kerning ? 1 : 0}">${s}</FONT>`;
    }).join("");
    return `<P ALIGN="${align}">${inner}</P>`;
  }).join("");
}
