/**
 * `flash.text.TextFormat` — formatação de texto. `null` = "não definido"
 * (herda do formato padrão do campo), igual ao Flash.
 */
import { $class } from "../as3";

export class TextFormat {
  font: string | null;
  size: number | null;
  color: number | null;
  bold: boolean | null;
  italic: boolean | null;
  underline: boolean | null;
  url: string | null;
  target: string | null;
  align: string | null;
  leftMargin: number | null;
  rightMargin: number | null;
  indent: number | null;
  leading: number | null;
  letterSpacing: number | null = null;
  kerning: boolean | null = null;
  blockIndent: number | null = null;
  bullet: boolean | null = null;
  tabStops: number[] | null = null;
  display = "block";

  constructor(font: string | null = null, size: number | null = null, color: number | null = null, bold: boolean | null = null, italic: boolean | null = null,
    underline: boolean | null = null, url: string | null = null, target: string | null = null, align: string | null = null,
    leftMargin: number | null = null, rightMargin: number | null = null, indent: number | null = null, leading: number | null = null) {
    this.font = font;
    this.size = size;
    this.color = color;
    this.bold = bold;
    this.italic = italic;
    this.underline = underline;
    this.url = url;
    this.target = target;
    this.align = align;
    this.leftMargin = leftMargin;
    this.rightMargin = rightMargin;
    this.indent = indent;
    this.leading = leading;
  }

  /** campos que podem ser mesclados */
  static readonly KEYS = ["font", "size", "color", "bold", "italic", "underline", "url", "target", "align", "leftMargin", "rightMargin",
    "indent", "leading", "letterSpacing", "kerning", "blockIndent", "bullet", "tabStops"] as const;

  /** cópia com os campos definidos de `over` por cima */
  $merge(over: TextFormat | null | undefined): TextFormat {
    const r = this.$clone();
    if (!over) return r;
    for (const k of TextFormat.KEYS) {
      const v = (over as any)[k];
      if (v !== null && v !== undefined) (r as any)[k] = v;
    }
    return r;
  }

  $clone(): TextFormat {
    const r = new TextFormat();
    for (const k of TextFormat.KEYS) (r as any)[k] = (this as any)[k];
    return r;
  }

  /** igual em todos os campos? (pra juntar trechos) */
  $equals(o: TextFormat): boolean {
    return TextFormat.KEYS.every((k) => (this as any)[k] === (o as any)[k]);
  }
}
$class(TextFormat, "flash.text.TextFormat");
