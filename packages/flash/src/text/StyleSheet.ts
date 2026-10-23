/**
 * `flash.text.StyleSheet` — CSS simples pra `htmlText` (seletores de tag `p`,
 * `a`, `a:hover` e de classe `.nome`). O TextField aplica os estilos em
 * `parseFlashHtml` (text/html.ts) quando `styleSheet` está definido.
 *
 * Propriedades suportadas (as mesmas do Flash): color, display, fontFamily,
 * fontSize, fontStyle, fontWeight, kerning, leading, letterSpacing,
 * marginLeft, marginRight, textAlign, textDecoration, textIndent.
 */
import { $class } from "../as3";
import { EventDispatcher } from "../events/EventDispatcher";
import { TextFormat } from "./TextFormat";

/** "font-size" → "fontSize" (o Flash aceita os dois) */
const camel = (k: string) => k.trim().replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
const px = (v: unknown) => parseFloat(String(v));

export class StyleSheet extends EventDispatcher {
  $styles = new Map<string, Record<string, any>>();

  constructor() {
    super();
  }

  getStyle(styleName: string): any {
    const s = this.$styles.get(String(styleName).toLowerCase());
    return s ? { ...s } : {};
  }

  setStyle(styleName: string, styleObject: any): void {
    const key = String(styleName).toLowerCase();
    if (styleObject == null) { this.$styles.delete(key); return; }
    const o: Record<string, any> = {};
    for (const k of Object.keys(styleObject)) o[camel(k)] = styleObject[k];
    this.$styles.set(key, o);
  }

  clear(): void { this.$styles.clear(); }

  get styleNames(): any[] { return [...this.$styles.keys()]; }

  /** objeto de estilo → TextFormat (campos não informados ficam null) */
  transform(formatObject: any): TextFormat {
    const f = new TextFormat();
    const s = formatObject ?? {};
    if (s.color != null) f.color = parseInt(String(s.color).replace(/^#/, ""), 16);
    if (s.fontFamily != null) f.font = String(s.fontFamily).split(",")[0]!.trim().replace(/^['"]|['"]$/g, "");
    if (s.fontSize != null) f.size = px(s.fontSize);
    if (s.fontStyle != null) f.italic = s.fontStyle === "italic";
    if (s.fontWeight != null) f.bold = s.fontWeight === "bold";
    if (s.kerning != null) f.kerning = String(s.kerning) === "true";
    if (s.leading != null) f.leading = px(s.leading);
    if (s.letterSpacing != null) f.letterSpacing = px(s.letterSpacing);
    if (s.marginLeft != null) f.leftMargin = px(s.marginLeft);
    if (s.marginRight != null) f.rightMargin = px(s.marginRight);
    if (s.textAlign != null) f.align = String(s.textAlign);
    if (s.textDecoration != null) f.underline = s.textDecoration === "underline";
    if (s.textIndent != null) f.indent = px(s.textIndent);
    if (s.display != null) f.display = String(s.display);
    return f;
  }

  parseCSS(CSSText: string): void {
    const css = String(CSSText).replace(/\/\*[\s\S]*?\*\//g, "");
    const re = /([^{}]+)\{([^}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(css))) {
      const props: Record<string, string> = {};
      for (const decl of m[2]!.split(";")) {
        const i = decl.indexOf(":");
        if (i > 0) props[camel(decl.slice(0, i))] = decl.slice(i + 1).trim();
      }
      for (const sel of m[1]!.split(",")) {
        const key = sel.trim().toLowerCase();
        if (key) this.$styles.set(key, { ...(this.$styles.get(key) ?? {}), ...props });
      }
    }
  }

  /** formato pra uma tag aberta (`tag` + `class`); null se nenhum estilo bate */
  $formatFor(tag: string, cls: string | undefined): TextFormat | null {
    const parts = [this.$styles.get(tag), cls ? this.$styles.get("." + cls.toLowerCase()) : undefined].filter(Boolean);
    if (!parts.length) return null;
    return this.transform(Object.assign({}, ...parts));
  }
}
$class(StyleSheet, "flash.text.StyleSheet");
