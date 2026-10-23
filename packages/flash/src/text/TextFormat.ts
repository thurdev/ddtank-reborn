/**
 * `flash.text.TextFormat` — formatação de texto. `null` = "não definido"
 * (herda do formato padrão do campo), igual ao Flash.
 *
 * Os campos são `Object` na API do Flash mas o player converte: o pickgliss
 * copia valores do XML de layout como string ("14", "2", "0xFFFFFF"), então os
 * setters numéricos/booleanos convertem aqui.
 */
import { $class } from "../as3";

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string" && /^0x/i.test(v.trim())) return parseInt(v, 16);
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};
const bool = (v: unknown): boolean | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v !== "" && v !== "false" && v !== "0";
  return !!v;
};

export class TextFormat {
  $size: number | null = null;
  $color: number | null = null;
  $bold: boolean | null = null;
  $italic: boolean | null = null;
  $underline: boolean | null = null;
  $leftMargin: number | null = null;
  $rightMargin: number | null = null;
  $indent: number | null = null;
  $leading: number | null = null;
  $letterSpacing: number | null = null;
  $kerning: boolean | null = null;
  $blockIndent: number | null = null;
  $bullet: boolean | null = null;
  $font: string | null = null;
  url: string | null = null;
  target: string | null = null;
  align: string | null = null;
  tabStops: number[] | null = null;
  display = "block";

  constructor(font: string | null = null, size: unknown = null, color: unknown = null, bold: unknown = null, italic: unknown = null,
    underline: unknown = null, url: string | null = null, target: string | null = null, align: string | null = null,
    leftMargin: unknown = null, rightMargin: unknown = null, indent: unknown = null, leading: unknown = null) {
    this.font = font;
    this.size = size as number;
    this.color = color as number;
    this.bold = bold as boolean;
    this.italic = italic as boolean;
    this.underline = underline as boolean;
    this.url = url;
    this.target = target;
    this.align = align;
    this.leftMargin = leftMargin as number;
    this.rightMargin = rightMargin as number;
    this.indent = indent as number;
    this.leading = leading as number;
  }

  get font(): string | null { return this.$font; }
  set font(v: string | null) { this.$font = v === null || v === undefined || v === "null" || v === "" ? null : String(v); }
  get size(): number | null { return this.$size; }
  set size(v: number | null) { this.$size = num(v); }
  get color(): number | null { return this.$color; }
  set color(v: number | null) { this.$color = num(v); }
  get bold(): boolean | null { return this.$bold; }
  set bold(v: boolean | null) { this.$bold = bool(v); }
  get italic(): boolean | null { return this.$italic; }
  set italic(v: boolean | null) { this.$italic = bool(v); }
  get underline(): boolean | null { return this.$underline; }
  set underline(v: boolean | null) { this.$underline = bool(v); }
  get leftMargin(): number | null { return this.$leftMargin; }
  set leftMargin(v: number | null) { this.$leftMargin = num(v); }
  get rightMargin(): number | null { return this.$rightMargin; }
  set rightMargin(v: number | null) { this.$rightMargin = num(v); }
  get indent(): number | null { return this.$indent; }
  set indent(v: number | null) { this.$indent = num(v); }
  get leading(): number | null { return this.$leading; }
  set leading(v: number | null) { this.$leading = num(v); }
  get letterSpacing(): number | null { return this.$letterSpacing; }
  set letterSpacing(v: number | null) { this.$letterSpacing = num(v); }
  get kerning(): boolean | null { return this.$kerning; }
  set kerning(v: boolean | null) { this.$kerning = bool(v); }
  get blockIndent(): number | null { return this.$blockIndent; }
  set blockIndent(v: number | null) { this.$blockIndent = num(v); }
  get bullet(): boolean | null { return this.$bullet; }
  set bullet(v: boolean | null) { this.$bullet = bool(v); }

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
