/**
 * `flash.text.TextField` — texto do Flash desenhado num Canvas2D (vira textura).
 *
 * - Texto é guardado em trechos com formato (`$runs`); `htmlText` é lido por
 *   um parser de HTML do Flash (p, font, b, i, u, br, a, textformat...).
 * - Layout próprio (quebra de linha, alinhamento, leading, rolagem
 *   `scrollV`), com 2px de margem interna igual ao Flash, pra que `textWidth`,
 *   `numLines`, autoSize etc. deem os mesmos valores.
 * - Campo de digitação (`type = "input"`): ao focar, um `<input>`/`<textarea>`
 *   de verdade é posicionado por cima do canvas (ver input-overlay.ts) — assim
 *   funciona teclado do celular, IME, colar etc.
 *
 * Como lê esse código:
 * - `$runs`   [{text, fmt}] texto formatado (fmt já mesclado com o padrão)
 * - `$lines`  resultado do layout: cada linha com trechos, largura, altura
 * - `$w/$h`   tamanho da caixa (não é escala! `width=` muda a caixa)
 * - `$dirty`  precisa refazer layout/desenho (feito 1x por frame)
 */
import { Sprite as PSprite, Texture, CanvasSource } from "pixi.js";
import { $class } from "../as3";
import { Event } from "../events/Event";
import { TextEvent } from "../events/TextEvent";
import { Rectangle } from "../geom/Rectangle";
import { queueFlush } from "../render-queue";
import type { EditTextT, RectT } from "../swf/library-types";
import { InteractiveObject } from "../display/InteractiveObject";
import { TextFormat } from "./TextFormat";
import { parseFlashHtml, runsToHtml } from "./html";
import { InputOverlay } from "./input-overlay";

export interface Run { text: string; fmt: TextFormat }
interface LineRun { text: string; fmt: TextFormat; x: number; w: number; start: number }
interface Line { runs: LineRun[]; w: number; ascent: number; descent: number; h: number; y: number; start: number; end: number; align: string }

const GUTTER = 2;
const RES = 2; // resolução do canvas (texto nítido)

/** fontes do Flash → CSS (com alternativas) */
export function cssFont(f: TextFormat): string {
  const fam = (f.font ?? "Times New Roman").replace(/["']/g, "");
  const map: Record<string, string> = {
    "宋体": "SimSun, 'Microsoft YaHei', Arial, sans-serif",
    "Microsoft YaHei": "'Microsoft YaHei', Arial, sans-serif",
    "微软雅黑": "'Microsoft YaHei', Arial, sans-serif",
    "Arial Unicode MS": "'Arial Unicode MS', Arial, sans-serif",
  };
  const family = map[fam] ?? `'${fam}', Arial, sans-serif`;
  return `${f.italic ? "italic " : ""}${f.bold ? "bold " : ""}${f.size ?? 12}px ${family}`;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function mctx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const c = typeof document !== "undefined" ? document.createElement("canvas") : (new OffscreenCanvas(1, 1) as any);
    measureCtx = c.getContext("2d") as CanvasRenderingContext2D;
  }
  return measureCtx!;
}

function measure(text: string, f: TextFormat): { w: number; ascent: number; descent: number } {
  const ctx = mctx();
  ctx.font = cssFont(f);
  const m = ctx.measureText(text || " ");
  const size = f.size ?? 12;
  const asc = (m as any).fontBoundingBoxAscent ?? size * 0.9;
  const desc = (m as any).fontBoundingBoxDescent ?? size * 0.22;
  const w = text ? m.width + (f.letterSpacing ?? 0) * text.length : 0;
  return { w, ascent: asc, descent: desc };
}

export class TextField extends InteractiveObject {
  $runs: Run[] = [];
  $defaultFormat = new TextFormat("Times New Roman", 12, 0, false, false, false, "", "", "left", 0, 0, 0, 0);
  $w = 100;
  $h = 100;
  $type = "dynamic";
  $autoSize = "none";
  $wordWrap = false;
  $multiline = false;
  $selectable = true;
  $password = false;
  $border = false;
  $borderColor = 0;
  $background = false;
  $backgroundColor = 0xffffff;
  $maxChars = 0;
  $restrict: string | null = null;
  $scrollV = 1;
  $scrollH = 0;
  $html = false;
  $condenseWhite = false;
  $lines: Line[] = [];
  $dirty = true;
  $sprite: PSprite;
  $canvas: HTMLCanvasElement | null = null;
  $tex: Texture | null = null;
  $editing = false;
  $selBegin = 0;
  $selEnd = 0;
  embedFonts = false;
  antiAliasType = "normal";
  gridFitType = "pixel";
  sharpness = 0;
  thickness = 0;
  alwaysShowSelection = false;
  mouseWheelEnabled = true;
  useRichTextClipboard = false;
  styleSheet: any = null;
  textInteractionMode = "normal";

  constructor() {
    super();
    this.$sprite = new PSprite(Texture.EMPTY);
    this.$node.addChild(this.$sprite);
    this.$invalidate();
  }

  /** campo de texto vindo do SWF exportado */
  static $fromData(r: RectT, p: EditTextT): TextField {
    const tf = new TextField();
    tf.$w = r[2];
    tf.$h = r[3];
    tf.$m.tx = 0;
    // a caixa do SWF começa em (xmin, ymin): desloca o conteúdo
    tf.$offX = r[0];
    tf.$offY = r[1];
    const f = new TextFormat(p.font ?? "Arial", p.size ?? 12, p.color ?? 0, false, false, false, "", "", p.align ?? "left",
      p.leftMargin ?? 0, p.rightMargin ?? 0, p.indent ?? 0, p.leading ?? 0);
    tf.$defaultFormat = f;
    tf.$multiline = !!p.multiline;
    tf.$wordWrap = !!p.wordWrap;
    tf.$password = !!p.password;
    tf.$selectable = !!p.selectable;
    tf.$border = !!p.border;
    tf.$maxChars = p.maxChars ?? 0;
    tf.embedFonts = !!p.embed;
    if (!p.readOnly) tf.$type = "input";
    if (p.text) {
      if (p.html) tf.htmlText = p.text;
      else tf.text = p.text;
    }
    return tf;
  }
  $offX = 0;
  $offY = 0;

  // ------------------------------------------------------------ texto
  get text(): string { return this.$runs.map((r) => r.text).join("").replace(/\n/g, "\r"); }
  set text(v: string) {
    v = v === null || v === undefined ? "" : String(v);
    v = v.replace(/\r\n?/g, "\n");
    this.$runs = v ? [{ text: v, fmt: this.$defaultFormat.$clone() }] : [];
    this.$html = false;
    this.$clampScroll();
    this.$invalidate();
  }
  get htmlText(): string { return runsToHtml(this.$runs, this.$defaultFormat); }
  set htmlText(v: string) {
    this.$runs = parseFlashHtml(v == null ? "" : String(v), this.$defaultFormat, this.$condenseWhite, this.$multiline, this.styleSheet);
    this.$html = true;
    this.$invalidate();
  }
  get length(): number { return this.text.length; }
  appendText(s: string): void {
    s = String(s).replace(/\r\n?/g, "\n");
    const last = this.$runs[this.$runs.length - 1];
    if (last) last.text += s;
    else this.$runs.push({ text: s, fmt: this.$defaultFormat.$clone() });
    this.$invalidate();
  }
  replaceText(begin: number, end: number, s: string): void {
    const t = this.text;
    const fmt = this.getTextFormat(begin, Math.max(begin + 1, end));
    const before = this.$slice(0, begin), after = this.$slice(end, t.length);
    this.$runs = [...before, { text: s.replace(/\r\n?/g, "\n"), fmt: this.$defaultFormat.$merge(fmt) }, ...after].filter((r) => r.text);
    this.$invalidate();
  }
  replaceSelectedText(s: string): void { this.replaceText(this.$selBegin, this.$selEnd, s); }

  /** trechos entre [a, b) */
  private $slice(a: number, b: number): Run[] {
    const out: Run[] = [];
    let pos = 0;
    for (const r of this.$runs) {
      const s = pos, e = pos + r.text.length;
      pos = e;
      const x0 = Math.max(a, s), x1 = Math.min(b, e);
      if (x1 > x0) out.push({ text: r.text.slice(x0 - s, x1 - s), fmt: r.fmt.$clone() });
    }
    return out;
  }

  // ------------------------------------------------------------ formato
  get defaultTextFormat(): TextFormat { return this.$defaultFormat.$clone(); }
  set defaultTextFormat(f: TextFormat) {
    this.$defaultFormat = this.$defaultFormat.$merge(f);
    if (!this.$runs.length) this.$invalidate();
  }
  setTextFormat(f: TextFormat, begin = -1, end = -1): void {
    const total = this.text.length;
    const a = begin < 0 ? 0 : begin;
    const b = end < 0 ? (begin < 0 ? total : begin + 1) : end;
    const before = this.$slice(0, a), mid = this.$slice(a, b), after = this.$slice(b, total);
    for (const r of mid) r.fmt = r.fmt.$merge(f);
    this.$runs = mergeRuns([...before, ...mid, ...after]);
    this.$invalidate();
  }
  getTextFormat(begin = -1, end = -1): TextFormat {
    const total = this.text.length;
    const a = begin < 0 ? 0 : begin, b = end < 0 ? total : end;
    const runs = this.$slice(a, Math.max(b, a + 1));
    if (!runs.length) return this.$defaultFormat.$clone();
    const out = runs[0]!.fmt.$clone();
    for (const r of runs.slice(1)) for (const k of TextFormat.KEYS) if ((out as any)[k] !== (r.fmt as any)[k]) (out as any)[k] = null;
    return out;
  }
  get textColor(): number { return this.$runs[0]?.fmt.color ?? this.$defaultFormat.color ?? 0; }
  set textColor(c: number) {
    this.$defaultFormat.color = c;
    for (const r of this.$runs) r.fmt.color = c;
    this.$invalidate();
  }

  // ------------------------------------------------------------ propriedades
  get type(): string { return this.$type; }
  set type(v: string) { this.$type = v; }
  get autoSize(): string { return this.$autoSize; }
  set autoSize(v: string) { this.$autoSize = String(v); this.$invalidate(); }
  get wordWrap(): boolean { return this.$wordWrap; }
  set wordWrap(v: boolean) { this.$wordWrap = !!v; this.$invalidate(); }
  get multiline(): boolean { return this.$multiline; }
  set multiline(v: boolean) { this.$multiline = !!v; this.$invalidate(); }
  get selectable(): boolean { return this.$selectable; }
  set selectable(v: boolean) { this.$selectable = !!v; }
  get displayAsPassword(): boolean { return this.$password; }
  set displayAsPassword(v: boolean) { this.$password = !!v; this.$invalidate(); }
  get border(): boolean { return this.$border; }
  set border(v: boolean) { this.$border = !!v; this.$invalidate(); }
  get borderColor(): number { return this.$borderColor; }
  set borderColor(v: number) { this.$borderColor = v; this.$invalidate(); }
  get background(): boolean { return this.$background; }
  set background(v: boolean) { this.$background = !!v; this.$invalidate(); }
  get backgroundColor(): number { return this.$backgroundColor; }
  set backgroundColor(v: number) { this.$backgroundColor = v; this.$invalidate(); }
  get maxChars(): number { return this.$maxChars; }
  set maxChars(v: number) { this.$maxChars = v | 0; }
  get restrict(): string | null { return this.$restrict; }
  set restrict(v: string | null) { this.$restrict = v; }
  get condenseWhite(): boolean { return this.$condenseWhite; }
  set condenseWhite(v: boolean) { this.$condenseWhite = !!v; }

  // caixa: width/height mudam o tamanho do campo, não a escala
  get width(): number { this.$layout(); return this.$w * Math.abs(this.$sx); }
  set width(v: number) { this.$w = Math.max(0, Number(v) / (Math.abs(this.$sx) || 1)); this.$invalidate(); }
  get height(): number { this.$layout(); return this.$h * Math.abs(this.$sy); }
  set height(v: number) { this.$h = Math.max(0, Number(v) / (Math.abs(this.$sy) || 1)); this.$invalidate(); }

  // ------------------------------------------------------------ métricas
  get textWidth(): number { this.$layout(); return Math.max(0, ...this.$lines.map((l) => l.w)); }
  get textHeight(): number {
    this.$layout();
    if (!this.$lines.length) return 0;
    const last = this.$lines[this.$lines.length - 1]!;
    return last.y + last.ascent + last.descent;
  }
  get numLines(): number { this.$layout(); return Math.max(1, this.$lines.length); }
  get scrollV(): number { return this.$scrollV; }
  set scrollV(v: number) { this.$scrollV = Math.max(1, Math.min(this.maxScrollV, v | 0)); this.$invalidate(); }
  get maxScrollV(): number {
    this.$layout();
    const visibleH = this.$h - GUTTER * 2;
    let i = this.$lines.length;
    let h = 0;
    while (i > 0 && h + this.$lines[i - 1]!.h <= visibleH + 0.5) { h += this.$lines[i - 1]!.h; i--; }
    return Math.max(1, i + 1);
  }
  get bottomScrollV(): number {
    this.$layout();
    const visibleH = this.$h - GUTTER * 2;
    let h = 0, i = this.$scrollV - 1;
    while (i < this.$lines.length && h + this.$lines[i]!.h <= visibleH + 0.5) { h += this.$lines[i]!.h; i++; }
    return Math.max(this.$scrollV, i);
  }
  get scrollH(): number { return this.$scrollH; }
  set scrollH(v: number) { this.$scrollH = Math.max(0, v); this.$invalidate(); }
  get maxScrollH(): number { return Math.max(0, Math.ceil(this.textWidth - this.$w + GUTTER * 2)); }
  get caretIndex(): number { return this.$selEnd; }
  get selectionBeginIndex(): number { return this.$selBegin; }
  get selectionEndIndex(): number { return this.$selEnd; }
  setSelection(b: number, e: number): void {
    this.$selBegin = b;
    this.$selEnd = e;
    if (this.$editing) InputOverlay.setSelection(this, b, e);
  }

  getLineText(i: number): string {
    this.$layout();
    const l = this.$lines[i];
    if (!l) throw new RangeError("Error #2006: The supplied index is out of bounds.");
    return this.text.slice(l.start, l.end);
  }
  getLineLength(i: number): number { return this.getLineText(i).length; }
  getLineOffset(i: number): number { this.$layout(); return this.$lines[i]?.start ?? 0; }
  getLineIndexOfChar(c: number): number {
    this.$layout();
    return this.$lines.findIndex((l) => c >= l.start && c <= l.end);
  }
  getLineIndexAtPoint(_x: number, y: number): number {
    this.$layout();
    return this.$lines.findIndex((l) => y >= l.y + GUTTER && y < l.y + GUTTER + l.h);
  }
  getLineMetrics(i: number): any {
    this.$layout();
    const l = this.$lines[i];
    return l ? { x: l.runs[0]?.x ?? 0, width: l.w, height: l.h, ascent: l.ascent, descent: l.descent, leading: l.h - l.ascent - l.descent } : null;
  }
  getCharBoundaries(c: number): Rectangle | null {
    this.$layout();
    for (const l of this.$lines) {
      for (const r of l.runs) {
        if (c >= r.start && c < r.start + r.text.length) {
          const pre = measure(r.text.slice(0, c - r.start), r.fmt).w;
          const w = measure(r.text[c - r.start] ?? "", r.fmt).w;
          return new Rectangle(r.x + pre, l.y + GUTTER, w, l.h);
        }
      }
    }
    return null;
  }
  getCharIndexAtPoint(x: number, y: number): number {
    this.$layout();
    const li = this.getLineIndexAtPoint(x, y);
    const l = this.$lines[li];
    if (!l) return -1;
    for (const r of l.runs) {
      if (x >= r.x && x < r.x + r.w) {
        for (let k = 1; k <= r.text.length; k++) if (r.x + measure(r.text.slice(0, k), r.fmt).w > x) return r.start + k - 1;
      }
    }
    return -1;
  }
  getFirstCharInParagraph(c: number): number { const t = this.text; return t.lastIndexOf("\r", c - 1) + 1; }
  getParagraphLength(c: number): number { const t = this.text; const s = this.getFirstCharInParagraph(c); const e = t.indexOf("\r", s); return (e < 0 ? t.length : e + 1) - s; }
  getImageReference(_id: string): any { return null; }
  getRawText(): string { return this.text; }
  getTextRuns(): any[] { return []; }
  getXMLText(): string { return this.htmlText; }
  insertXMLText(..._a: any[]): void {}
  static isFontCompatible(_f: string, _s: string): boolean { return true; }

  // ------------------------------------------------------------ layout
  $invalidate(): void {
    this.$dirty = true;
    queueFlush(this);
  }

  private $clampScroll(): void {
    if (this.$scrollV < 1) this.$scrollV = 1;
  }

  /** quebra o texto em linhas (se mudou) */
  $layout(): void {
    if (!this.$dirty && this.$lines.length) return;
    const lines: Line[] = [];
    const maxW = this.$wordWrap ? Math.max(1, this.$w - GUTTER * 2) : Infinity;
    const shown = this.$password ? this.$runs.map((r) => ({ text: r.text.replace(/[^\n]/g, "*"), fmt: r.fmt })) : this.$runs;
    let cur: Line = newLine(0, this.$defaultFormat.align ?? "left");
    let pos = 0;
    const pushLine = (end: number) => {
      cur.end = end;
      if (!cur.runs.length) { const m = measure("", this.$defaultFormat); cur.ascent = m.ascent; cur.descent = m.descent; }
      lines.push(cur);
    };
    for (const run of shown) {
      const f = run.fmt;
      cur.align = f.align ?? cur.align;
      const parts = run.text.split("\n");
      for (let pi = 0; pi < parts.length; pi++) {
        if (pi > 0) {
          pushLine(pos);
          pos += 1;
          cur = newLine(pos, f.align ?? "left");
        }
        let seg = parts[pi]!;
        while (seg.length) {
          const m = measure(seg, f);
          const avail = maxW - cur.w;
          if (m.w <= avail || !this.$wordWrap) {
            addRun(cur, seg, f, m, pos);
            pos += seg.length;
            seg = "";
            break;
          }
          // quebra por palavra
          let cut = fitChars(seg, f, avail);
          const sp = seg.lastIndexOf(" ", cut);
          if (sp > 0 && cut < seg.length) cut = sp + 1;
          if (cut <= 0) {
            if (cur.runs.length) { pushLine(pos); cur = newLine(pos, f.align ?? "left"); continue; }
            cut = Math.max(1, fitChars(seg, f, maxW));
          }
          const piece = seg.slice(0, cut);
          addRun(cur, piece, f, measure(piece, f), pos);
          pos += piece.length;
          seg = seg.slice(cut);
          pushLine(pos);
          cur = newLine(pos, f.align ?? "left");
        }
      }
    }
    pushLine(pos);
    // y de cada linha + alinhamento
    let y = 0;
    for (const l of lines) {
      const lead = l.runs.reduce((m, r) => Math.max(m, r.fmt.leading ?? 0), this.$defaultFormat.leading ?? 0);
      l.h = l.ascent + l.descent + lead;
      l.y = y;
      y += l.h;
    }
    // autoSize
    const tw = Math.max(0, ...lines.map((l) => l.w));
    if (this.$autoSize !== "none") {
      const th = lines.length ? lines[lines.length - 1]!.y + lines[lines.length - 1]!.ascent + lines[lines.length - 1]!.descent : 0;
      if (!this.$wordWrap) {
        const nw = Math.ceil(tw + GUTTER * 2);
        if (this.$autoSize === "center") this.$m.tx += (this.$w - nw) / 2;
        else if (this.$autoSize === "right") this.$m.tx += this.$w - nw;
        this.$w = nw;
        this.$syncMatrix();
      }
      this.$h = Math.ceil(th + GUTTER * 2);
    }
    const boxW = this.$w - GUTTER * 2;
    for (const l of lines) {
      const off = l.align === "center" ? (boxW - l.w) / 2 : l.align === "right" ? boxW - l.w : 0;
      for (const r of l.runs) r.x += GUTTER + Math.max(0, off) + (r.fmt.leftMargin ?? 0) + (r.fmt.indent ?? 0);
    }
    this.$lines = lines;
  }

  /** render-queue: refaz layout + desenha no canvas + sobe textura */
  $flush(): void {
    if (!this.$dirty) return;
    this.$layout();
    this.$dirty = false;
    const w = Math.max(1, Math.ceil(this.$w)), h = Math.max(1, Math.ceil(this.$h));
    if (!this.$canvas) this.$canvas = document.createElement("canvas");
    const c = this.$canvas;
    if (c.width !== w * RES || c.height !== h * RES) { c.width = w * RES; c.height = h * RES; }
    const ctx = c.getContext("2d")!;
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!this.$editing) this.$drawText(ctx);
    else this.$drawBox(ctx);
    if (!this.$tex) {
      this.$tex = new Texture({ source: new CanvasSource({ resource: c, resolution: RES }) });
      this.$sprite.texture = this.$tex;
    } else {
      this.$tex.source.resize(w, h, RES);
      this.$tex.source.update();
    }
    this.$sprite.position.set(this.$offX, this.$offY);
  }

  private $drawBox(ctx: CanvasRenderingContext2D): void {
    if (this.$background) { ctx.fillStyle = hex(this.$backgroundColor); ctx.fillRect(0, 0, this.$w, this.$h); }
    if (this.$border) { ctx.strokeStyle = hex(this.$borderColor); ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, this.$w - 1, this.$h - 1); }
  }

  /** desenha o texto (também usado por BitmapData.draw) */
  $drawText(ctx: CanvasRenderingContext2D): void {
    this.$layout();
    ctx.save();
    ctx.translate(this.$offX, this.$offY);
    this.$drawBox(ctx);
    ctx.beginPath();
    ctx.rect(0, 0, this.$w, this.$h);
    ctx.clip();
    const first = this.$lines[this.$scrollV - 1];
    const y0 = first ? first.y : 0;
    ctx.textBaseline = "alphabetic";
    for (const l of this.$lines) {
      const ly = l.y - y0 + GUTTER;
      if (ly > this.$h) break;
      if (ly + l.h < 0) continue;
      for (const r of l.runs) {
        ctx.font = cssFont(r.fmt);
        ctx.fillStyle = hex(r.fmt.color ?? 0);
        const x = r.x - this.$scrollH;
        const by = ly + l.ascent;
        if (r.fmt.letterSpacing) {
          let cx = x;
          for (const ch of r.text) { ctx.fillText(ch, cx, by); cx += ctx.measureText(ch).width + r.fmt.letterSpacing; }
        } else ctx.fillText(r.text, x, by);
        if (r.fmt.underline) ctx.fillRect(x, by + 1, r.w, Math.max(1, (r.fmt.size ?? 12) / 14));
      }
    }
    ctx.restore();
  }

  $localRect(): Rectangle | null {
    this.$layout();
    return new Rectangle(this.$offX, this.$offY, this.$w, this.$h);
  }

  /** clicou: link `<a href="event:...">` dispara TextEvent.LINK; campo de digitação ganha foco */
  $onClick(localX: number, localY: number): void {
    const i = this.getCharIndexAtPoint(localX - this.$offX, localY - this.$offY);
    if (i >= 0) {
      let pos = 0;
      for (const r of this.$runs) {
        if (i >= pos && i < pos + r.text.length) {
          const url = r.fmt.url;
          if (url && url.startsWith("event:")) this.dispatchEvent(new TextEvent(TextEvent.LINK, true, false, url.slice(6)));
          else if (url) window.open(url, r.fmt.target || "_blank");
          break;
        }
        pos += r.text.length;
      }
    }
  }

  /** começa/termina edição (Stage.focus chama) */
  $setEditing(on: boolean): void {
    if (this.$type !== "input") return;
    if (on === this.$editing) return;
    this.$editing = on;
    if (on) InputOverlay.open(this);
    else InputOverlay.close(this);
    this.$invalidate();
  }

  /** texto digitado no `<input>` (input-overlay chama) */
  $userInput(value: string): void {
    let v = value;
    if (this.$restrict) v = applyRestrict(v, this.$restrict);
    if (this.$maxChars > 0) v = v.slice(0, this.$maxChars);
    if (!this.$multiline) v = v.replace(/[\r\n]/g, "");
    if (v === this.text.replace(/\r/g, "\n")) return;
    this.$runs = v ? [{ text: v, fmt: (this.$runs[0]?.fmt ?? this.$defaultFormat).$clone() }] : [];
    this.$invalidate();
    this.dispatchEvent(new Event(Event.CHANGE, true));
  }
}
$class(TextField, "flash.text.TextField");

function newLine(start: number, align: string): Line {
  return { runs: [], w: 0, ascent: 0, descent: 0, h: 0, y: 0, start, end: start, align };
}
function addRun(l: Line, text: string, fmt: TextFormat, m: { w: number; ascent: number; descent: number }, start: number): void {
  l.runs.push({ text, fmt, x: l.w, w: m.w, start });
  l.w += m.w;
  l.ascent = Math.max(l.ascent, m.ascent);
  l.descent = Math.max(l.descent, m.descent);
}
function fitChars(s: string, f: TextFormat, w: number): number {
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (measure(s.slice(0, mid), f).w <= w) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
function mergeRuns(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    const last = out[out.length - 1];
    if (last && last.fmt.$equals(r.fmt)) last.text += r.text;
    else if (r.text) out.push({ text: r.text, fmt: r.fmt });
  }
  return out;
}
function hex(c: number): string {
  return "#" + ((c >>> 0) & 0xffffff).toString(16).padStart(6, "0");
}

/** `restrict` do Flash: "0-9", "a-zA-Z", "^abc" (negação), "\\-" escapa */
export function applyRestrict(v: string, restrict: string): string {
  let allow = "", deny = "", neg = false;
  for (let i = 0; i < restrict.length; i++) {
    let ch = restrict[i]!;
    if (ch === "^") { neg = !neg; continue; }
    if (ch === "\\" && i + 1 < restrict.length) ch = restrict[++i]!;
    if (restrict[i + 1] === "-" && i + 2 < restrict.length) {
      const end = restrict[i + 2]!;
      const range = `${escapeRe(ch)}-${escapeRe(end)}`;
      if (neg) deny += range; else allow += range;
      i += 2;
      continue;
    }
    if (neg) deny += escapeRe(ch); else allow += escapeRe(ch);
  }
  const reA = allow ? new RegExp(`[${allow}]`) : null;
  const reD = deny ? new RegExp(`[${deny}]`) : null;
  return [...v].filter((c) => (!reA || reA.test(c)) && (!reD || !reD.test(c))).join("");
}
function escapeRe(c: string): string {
  return c.replace(/[\]\\^-]/g, "\\$&");
}
