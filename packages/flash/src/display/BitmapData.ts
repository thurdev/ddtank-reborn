/**
 * `flash.display.BitmapData` — imagem com acesso a pixel.
 *
 * Três representações, sincronizadas sob demanda:
 * - `$img`   imagem original carregada (PNG do asset), sem cópia — rápido;
 * - `$canvas` Canvas2D, criado na 1ª operação de desenho (fillRect, draw...);
 * - `$data`  ImageData (pixels no CPU), criado na 1ª leitura/escrita de pixel
 *            (getPixel/setPixel — o terreno da batalha usa muito).
 * A textura do Pixi (`$texture()`) é atualizada uma vez por frame
 * (render-queue). Cores seguem o Flash: ARGB não-premultiplicado.
 */
import { CanvasSource, ImageSource, Texture } from "pixi.js";
import { $class } from "../as3";
import { ColorTransform } from "../geom/ColorTransform";
import { Matrix } from "../geom/Matrix";
import { Point } from "../geom/Point";
import { Rectangle } from "../geom/Rectangle";
import { queueFlush } from "../render-queue";
import { ByteArray } from "../utils/ByteArray";
import { IBitmapDrawable } from "./IBitmapDrawable";
import { renderToCanvas } from "./software-render";

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function makeCanvas(w: number, h: number): AnyCanvas {
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  return new OffscreenCanvas(w, h);
}

const argbToCss = (c: number, transparent: boolean) =>
  `rgba(${(c >>> 16) & 255},${(c >>> 8) & 255},${c & 255},${transparent ? ((c >>> 24) & 255) / 255 : 1})`;

export class BitmapData {
  $w: number;
  $h: number;
  $transparent: boolean;
  $img: (CanvasImageSource & { width: number; height: number }) | null = null;
  $canvas: AnyCanvas | null = null;
  $ctx: Ctx | null = null;
  $data: ImageData | null = null;
  /** `$data` mais novo que o canvas (precisa putImageData) */
  $dataDirty = false;
  $tex: Texture | null = null;
  $disposed = false;
  /** de onde veio (debug) */
  $source?: string;

  constructor(width: number, height: number, transparent = true, fillColor = 0xffffffff) {
    this.$w = Math.max(0, Math.floor(width));
    this.$h = Math.max(0, Math.floor(height));
    // limite do Flash Player 11+ (8191 de lado, 16.777.215 pixels): acima disso o Flash lança
    // ArgumentError #2015 — sem isso o navegador tenta alocar e a aba cai
    if (!(this.$w <= 8191 && this.$h <= 8191 && this.$w * this.$h <= 16777215)) {
      throw Object.assign(new Error(`Error #2015: Invalid BitmapData (${width}x${height}).`), { name: "ArgumentError", errorID: 2015 });
    }
    this.$transparent = transparent;
    if (this.$w > 0 && this.$h > 0) {
      this.$ensureCanvas();
      const ctx = this.$ctx!;
      ctx.fillStyle = argbToCss(fillColor, transparent);
      if (!transparent || (fillColor >>> 24) !== 0) ctx.fillRect(0, 0, this.$w, this.$h);
    }
  }

  /** BitmapData em volta de uma imagem já carregada (sem copiar pixels) */
  static $fromImage(img: CanvasImageSource & { width: number; height: number }, source?: string): BitmapData {
    const bd = Object.create(BitmapData.prototype) as BitmapData;
    bd.$w = img.width;
    bd.$h = img.height;
    bd.$transparent = true;
    bd.$img = img;
    bd.$canvas = null;
    bd.$ctx = null;
    bd.$data = null;
    bd.$dataDirty = false;
    bd.$tex = null;
    bd.$disposed = false;
    bd.$source = source;
    return bd;
  }

  get width(): number { return this.$w; }
  get height(): number { return this.$h; }
  get transparent(): boolean { return this.$transparent; }
  get rect(): Rectangle { return new Rectangle(0, 0, this.$w, this.$h); }

  // ------------------------------------------------------------ sincronização
  $ensureCanvas(): Ctx {
    if (!this.$canvas) {
      this.$canvas = makeCanvas(Math.max(1, this.$w), Math.max(1, this.$h));
      this.$ctx = this.$canvas.getContext("2d", { willReadFrequently: true }) as Ctx;
      if (this.$img) this.$ctx.drawImage(this.$img, 0, 0);
      this.$img = null;
      if (this.$tex) this.$tex.source = new CanvasSource({ resource: this.$canvas as HTMLCanvasElement });
    }
    if (this.$dataDirty && this.$data) {
      this.$ctx!.putImageData(this.$data, 0, 0);
      this.$dataDirty = false;
    }
    return this.$ctx!;
  }

  /** pixels no CPU (lê do canvas se preciso) */
  $pixels(): Uint8ClampedArray {
    if (!this.$data) {
      const ctx = this.$ensureCanvas();
      this.$data = ctx.getImageData(0, 0, Math.max(1, this.$w), Math.max(1, this.$h));
    }
    return this.$data.data;
  }

  /** canvas mudou: pixels em cache ficaram velhos; textura precisa subir */
  $canvasChanged(): void {
    this.$data = null;
    this.$dataDirty = false;
    queueFlush(this);
  }
  /** $data mudou: canvas e textura precisam atualizar */
  $dataChanged(): void {
    this.$dataDirty = true;
    queueFlush(this);
  }

  /** render-queue: sobe pra GPU */
  $flush(): void {
    if (this.$dataDirty) this.$ensureCanvas();
    this.$tex?.source.update();
  }

  /** textura do Pixi (criada na 1ª vez) */
  $texture(): Texture {
    if (!this.$tex) {
      if (this.$canvas || !this.$img) {
        this.$ensureCanvas();
        this.$tex = new Texture({ source: new CanvasSource({ resource: this.$canvas as HTMLCanvasElement }) });
      } else {
        this.$tex = new Texture({ source: new ImageSource({ resource: this.$img as any, alphaMode: typeof ImageBitmap !== "undefined" && this.$img instanceof ImageBitmap ? "premultiplied-alpha" : "premultiply-alpha-on-upload" }) });
      }
    }
    return this.$tex;
  }

  /** imagem pra drawImage/pattern no Canvas2D */
  $canvasSource(): CanvasImageSource | null {
    if (this.$img) return this.$img;
    if (this.$dataDirty) this.$ensureCanvas();
    return this.$canvas;
  }

  // ------------------------------------------------------------ pixels
  getPixel(x: number, y: number): number { return this.getPixel32(x, y) & 0xffffff; }
  getPixel32(x: number, y: number): number {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.$w || y >= this.$h) return 0;
    const p = this.$pixels();
    const i = (y * this.$w + x) * 4;
    const a = this.$transparent ? p[i + 3]! : 255;
    return ((a << 24) | (p[i]! << 16) | (p[i + 1]! << 8) | p[i + 2]!) >>> 0;
  }
  setPixel(x: number, y: number, c: number): void {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.$w || y >= this.$h) return;
    const p = this.$pixels();
    const i = (y * this.$w + x) * 4;
    p[i] = (c >>> 16) & 255; p[i + 1] = (c >>> 8) & 255; p[i + 2] = c & 255;
    if (!this.$transparent) p[i + 3] = 255;
    this.$dataChanged();
  }
  setPixel32(x: number, y: number, c: number): void {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.$w || y >= this.$h) return;
    const p = this.$pixels();
    const i = (y * this.$w + x) * 4;
    p[i] = (c >>> 16) & 255; p[i + 1] = (c >>> 8) & 255; p[i + 2] = c & 255;
    p[i + 3] = this.$transparent ? (c >>> 24) & 255 : 255;
    this.$dataChanged();
  }

  getPixels(rect: Rectangle): ByteArray {
    const out = new ByteArray();
    const r = rect.intersection(this.rect);
    for (let y = r.y; y < r.bottom; y++) for (let x = r.x; x < r.right; x++) out.writeUnsignedInt(this.getPixel32(x, y));
    out.position = 0;
    return out;
  }
  setPixels(rect: Rectangle, input: ByteArray): void {
    const r = rect.intersection(this.rect);
    for (let y = r.y; y < r.bottom; y++) for (let x = r.x; x < r.right; x++) {
      if (input.bytesAvailable < 4) return;
      this.setPixel32(x, y, input.readUnsignedInt());
    }
  }
  getVector(rect: Rectangle): number[] {
    const out: number[] = [];
    const r = rect.intersection(this.rect);
    for (let y = r.y; y < r.bottom; y++) for (let x = r.x; x < r.right; x++) out.push(this.getPixel32(x, y));
    return out;
  }
  setVector(rect: Rectangle, v: number[]): void {
    const r = rect.intersection(this.rect);
    let k = 0;
    for (let y = r.y; y < r.bottom; y++) for (let x = r.x; x < r.right; x++) this.setPixel32(x, y, v[k++] ?? 0);
  }

  // ------------------------------------------------------------ desenho
  /** pinta o retângulo com a cor (substitui os pixels, não mistura) */
  fillRect(rect: Rectangle, color: number): void {
    const ctx = this.$ensureCanvas();
    ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    ctx.fillStyle = argbToCss(color, this.$transparent);
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    this.$canvasChanged();
  }

  floodFill(x: number, y: number, color: number): void {
    const p = this.$pixels();
    const target = this.getPixel32(x, y);
    if (target === (color >>> 0)) return;
    const stack = [[x | 0, y | 0]];
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      if (cx! < 0 || cy! < 0 || cx! >= this.$w || cy! >= this.$h) continue;
      if (this.getPixel32(cx!, cy!) !== target) continue;
      const i = (cy! * this.$w + cx!) * 4;
      p[i] = (color >>> 16) & 255; p[i + 1] = (color >>> 8) & 255; p[i + 2] = color & 255; p[i + 3] = (color >>> 24) & 255;
      stack.push([cx! + 1, cy!], [cx! - 1, cy!], [cx!, cy! + 1], [cx!, cy! - 1]);
    }
    this.$dataChanged();
  }

  /**
   * copia pixels de outro BitmapData. Sem `mergeAlpha` substitui o destino
   * (inclusive alfa), igual ao Flash.
   */
  copyPixels(src: BitmapData, rect: Rectangle, dest: Point, alphaBitmapData: BitmapData | null = null, alphaPoint: Point | null = null, mergeAlpha = false): void {
    const s = src.$canvasSource();
    if (!s) return;
    const ctx = this.$ensureCanvas();
    if (!mergeAlpha) ctx.clearRect(dest.x, dest.y, rect.width, rect.height);
    ctx.drawImage(s, rect.x, rect.y, rect.width, rect.height, dest.x, dest.y, rect.width, rect.height);
    if (alphaBitmapData) {
      const a = alphaBitmapData.$canvasSource();
      if (a) {
        ctx.globalCompositeOperation = "destination-in";
        const ap = alphaPoint ?? new Point();
        ctx.drawImage(a, ap.x, ap.y, rect.width, rect.height, dest.x, dest.y, rect.width, rect.height);
        ctx.globalCompositeOperation = "source-over";
      }
    }
    this.$canvasChanged();
  }

  copyChannel(src: BitmapData, rect: Rectangle, dest: Point, srcChannel: number, destChannel: number): void {
    const ch = (c: number) => (c === 1 ? 0 : c === 2 ? 1 : c === 4 ? 2 : 3);
    const sc = ch(srcChannel), dc = ch(destChannel);
    const sp = src.$pixels();
    const dp = this.$pixels();
    for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
      const sx = rect.x + x, sy = rect.y + y, dx = dest.x + x, dy = dest.y + y;
      if (sx < 0 || sy < 0 || sx >= src.$w || sy >= src.$h || dx < 0 || dy < 0 || dx >= this.$w || dy >= this.$h) continue;
      dp[(dy * this.$w + dx) * 4 + dc] = sp[(sy * src.$w + sx) * 4 + sc]!;
    }
    this.$dataChanged();
  }

  /**
   * desenha um DisplayObject ou BitmapData aqui (render por software no
   * Canvas2D — usado pra recortar cratera no terreno, miniaturas, etc.)
   */
  draw(source: any, matrix: Matrix | null = null, colorTransform: ColorTransform | null = null, blendMode: string | null = null, clipRect: Rectangle | null = null, smoothing = false): void {
    const ctx = this.$ensureCanvas();
    ctx.save();
    if (clipRect) { ctx.beginPath(); ctx.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height); ctx.clip(); }
    ctx.imageSmoothingEnabled = smoothing;
    const op = blendMode === "erase" ? "destination-out" : blendMode === "alpha" ? "destination-in" : blendMode === "add" ? "lighter" :
      blendMode === "multiply" ? "multiply" : blendMode === "screen" ? "screen" : blendMode === "overlay" ? "overlay" :
      blendMode === "darken" ? "darken" : blendMode === "lighten" ? "lighten" : blendMode === "difference" ? "difference" :
      blendMode === "hardlight" ? "hard-light" : "source-over";
    ctx.globalCompositeOperation = op as GlobalCompositeOperation;
    if (colorTransform) ctx.globalAlpha = Math.max(0, Math.min(1, colorTransform.alphaMultiplier));
    renderToCanvas(ctx as CanvasRenderingContext2D, source, matrix ?? new Matrix(), true);
    ctx.restore();
    this.$canvasChanged();
  }
  drawWithQuality(source: any, matrix: Matrix | null = null, ct: ColorTransform | null = null, blend: string | null = null, clip: Rectangle | null = null, smoothing = false, _q?: string): void {
    this.draw(source, matrix, ct, blend, clip, smoothing);
  }

  colorTransform(rect: Rectangle, ct: ColorTransform): void {
    const p = this.$pixels();
    const r = rect.intersection(this.rect);
    for (let y = r.y; y < r.bottom; y++) for (let x = r.x; x < r.right; x++) {
      const i = (y * this.$w + x) * 4;
      p[i] = p[i]! * ct.redMultiplier + ct.redOffset;
      p[i + 1] = p[i + 1]! * ct.greenMultiplier + ct.greenOffset;
      p[i + 2] = p[i + 2]! * ct.blueMultiplier + ct.blueOffset;
      p[i + 3] = p[i + 3]! * ct.alphaMultiplier + ct.alphaOffset;
    }
    this.$dataChanged();
  }

  /** só ColorMatrixFilter e BlurFilter têm efeito real aqui; o resto copia */
  applyFilter(src: BitmapData, rect: Rectangle, dest: Point, filter: any): void {
    if (filter?.matrix && Array.isArray(filter.matrix)) {
      const m: number[] = filter.matrix;
      const sp = src.$pixels().slice();
      const dp = this.$pixels();
      for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
        const sx = rect.x + x, sy = rect.y + y, dx = dest.x + x, dy = dest.y + y;
        if (sx >= src.$w || sy >= src.$h || dx >= this.$w || dy >= this.$h || sx < 0 || sy < 0 || dx < 0 || dy < 0) continue;
        const si = (sy * src.$w + sx) * 4, di = (dy * this.$w + dx) * 4;
        const r = sp[si]!, g = sp[si + 1]!, b = sp[si + 2]!, a = sp[si + 3]!;
        dp[di] = m[0]! * r + m[1]! * g + m[2]! * b + m[3]! * a + m[4]!;
        dp[di + 1] = m[5]! * r + m[6]! * g + m[7]! * b + m[8]! * a + m[9]!;
        dp[di + 2] = m[10]! * r + m[11]! * g + m[12]! * b + m[13]! * a + m[14]!;
        dp[di + 3] = m[15]! * r + m[16]! * g + m[17]! * b + m[18]! * a + m[19]!;
      }
      this.$dataChanged();
      return;
    }
    const s = src.$canvasSource();
    if (!s) return;
    const ctx = this.$ensureCanvas();
    ctx.save();
    if (filter && typeof filter.blurX === "number" && !("color" in filter)) (ctx as CanvasRenderingContext2D).filter = `blur(${Math.max(filter.blurX, filter.blurY) / 2}px)`;
    ctx.clearRect(dest.x, dest.y, rect.width, rect.height);
    ctx.drawImage(s, rect.x, rect.y, rect.width, rect.height, dest.x, dest.y, rect.width, rect.height);
    ctx.restore();
    this.$canvasChanged();
  }

  generateFilterRect(sourceRect: Rectangle, _filter: any): Rectangle { return sourceRect.clone(); }

  scroll(dx: number, dy: number): void {
    const ctx = this.$ensureCanvas();
    const copy = makeCanvas(this.$w, this.$h);
    (copy.getContext("2d") as Ctx).drawImage(this.$canvas as CanvasImageSource, 0, 0);
    ctx.drawImage(copy as CanvasImageSource, dx, dy);
    this.$canvasChanged();
  }

  merge(src: BitmapData, rect: Rectangle, dest: Point, rM: number, gM: number, bM: number, aM: number): void {
    const sp = src.$pixels(), dp = this.$pixels();
    for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
      const sx = rect.x + x, sy = rect.y + y, dx = dest.x + x, dy = dest.y + y;
      if (sx >= src.$w || sy >= src.$h || dx >= this.$w || dy >= this.$h) continue;
      const si = (sy * src.$w + sx) * 4, di = (dy * this.$w + dx) * 4;
      dp[di] = (sp[si]! * rM + dp[di]! * (256 - rM)) / 256;
      dp[di + 1] = (sp[si + 1]! * gM + dp[di + 1]! * (256 - gM)) / 256;
      dp[di + 2] = (sp[si + 2]! * bM + dp[di + 2]! * (256 - bM)) / 256;
      dp[di + 3] = (sp[si + 3]! * aM + dp[di + 3]! * (256 - aM)) / 256;
    }
    this.$dataChanged();
  }

  noise(randomSeed: number, low = 0, high = 255, channelOptions = 7, grayScale = false): void {
    const p = this.$pixels();
    let s = randomSeed || 1;
    const rnd = () => { s = (s * 16807) % 2147483647; return low + ((s / 2147483647) * (high - low + 1)) | 0; };
    for (let i = 0; i < p.length; i += 4) {
      if (grayScale) { const v = rnd(); p[i] = p[i + 1] = p[i + 2] = v; }
      else {
        if (channelOptions & 1) p[i] = rnd();
        if (channelOptions & 2) p[i + 1] = rnd();
        if (channelOptions & 4) p[i + 2] = rnd();
      }
      if (channelOptions & 8) p[i + 3] = rnd(); else p[i + 3] = 255;
    }
    this.$dataChanged();
  }
  perlinNoise(_bx: number, _by: number, _oct: number, seed: number, _stitch: boolean, _fractal: boolean, channels = 7, gray = false, _offsets: any = null): void {
    this.noise(seed, 0, 255, channels, gray);
  }
  pixelDissolve(src: BitmapData, rect: Rectangle, dest: Point, _seed = 0, _n = 0, _fill = 0): number {
    this.copyPixels(src, rect, dest);
    return 0;
  }
  paletteMap(src: BitmapData, rect: Rectangle, dest: Point, r: number[] | null = null, g: number[] | null = null, b: number[] | null = null, a: number[] | null = null): void {
    const sp = src.$pixels().slice(), dp = this.$pixels();
    for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
      const sx = rect.x + x, sy = rect.y + y, dx = dest.x + x, dy = dest.y + y;
      if (sx >= src.$w || sy >= src.$h || dx >= this.$w || dy >= this.$h) continue;
      const si = (sy * src.$w + sx) * 4, di = (dy * this.$w + dx) * 4;
      let c = 0;
      c += r ? r[sp[si]!]! : sp[si]! << 16;
      c += g ? g[sp[si + 1]!]! : sp[si + 1]! << 8;
      c += b ? b[sp[si + 2]!]! : sp[si + 2]!;
      c += a ? a[sp[si + 3]!]! : sp[si + 3]! << 24;
      dp[di] = (c >>> 16) & 255; dp[di + 1] = (c >>> 8) & 255; dp[di + 2] = c & 255; dp[di + 3] = (c >>> 24) & 255;
    }
    this.$dataChanged();
  }

  threshold(src: BitmapData, rect: Rectangle, dest: Point, operation: string, threshold: number, color = 0, mask = 0xffffffff, copySource = false): number {
    let n = 0;
    const test = (v: number, t: number) => {
      switch (operation) {
        case "<": return v < t; case "<=": return v <= t; case ">": return v > t; case ">=": return v >= t;
        case "==": return v === t; case "!=": return v !== t;
      }
      return false;
    };
    const t = (threshold & mask) >>> 0;
    for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
      const sv = src.getPixel32(rect.x + x, rect.y + y);
      if (test((sv & mask) >>> 0, t)) { this.setPixel32(dest.x + x, dest.y + y, color); n++; }
      else if (copySource) this.setPixel32(dest.x + x, dest.y + y, sv);
    }
    return n;
  }

  /** menor retângulo com pixels que (cor & mask) == color (ou != se findColor=false) */
  getColorBoundsRect(mask: number, color: number, findColor = true): Rectangle {
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    const p = this.$pixels();
    for (let y = 0; y < this.$h; y++) for (let x = 0; x < this.$w; x++) {
      const i = (y * this.$w + x) * 4;
      const c = ((p[i + 3]! << 24) | (p[i]! << 16) | (p[i + 1]! << 8) | p[i + 2]!) >>> 0;
      const match = ((c & mask) >>> 0) === ((color & mask) >>> 0);
      if (match === findColor) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    return maxX < 0 ? new Rectangle() : new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
  }

  /** colisão por alfa (a batalha usa pra terreno x projétil) */
  hitTest(firstPoint: Point, firstAlphaThreshold: number, secondObject: any, secondBitmapDataPoint: Point | null = null, secondAlphaThreshold = 1): boolean {
    const alphaOk = (bd: BitmapData, x: number, y: number, th: number) => ((bd.getPixel32(x, y) >>> 24) & 255) >= th;
    if (secondObject instanceof Point) {
      return alphaOk(this, secondObject.x - firstPoint.x, secondObject.y - firstPoint.y, firstAlphaThreshold);
    }
    if (secondObject instanceof Rectangle) {
      const r = secondObject;
      for (let y = r.y; y < r.bottom; y++) for (let x = r.x; x < r.right; x++) if (alphaOk(this, x - firstPoint.x, y - firstPoint.y, firstAlphaThreshold)) return true;
      return false;
    }
    let other: BitmapData | null = null;
    if (secondObject instanceof BitmapData) other = secondObject;
    else if (secondObject?.bitmapData instanceof BitmapData) other = secondObject.bitmapData;
    if (!other) return false;
    const sp = secondBitmapDataPoint ?? new Point();
    const a = new Rectangle(firstPoint.x, firstPoint.y, this.$w, this.$h);
    const b = new Rectangle(sp.x, sp.y, other.$w, other.$h);
    const r = a.intersection(b);
    for (let y = r.y; y < r.bottom; y++) for (let x = r.x; x < r.right; x++) {
      if (alphaOk(this, x - a.x, y - a.y, firstAlphaThreshold) && alphaOk(other, x - b.x, y - b.y, secondAlphaThreshold)) return true;
    }
    return false;
  }

  compare(other: BitmapData): any {
    if (other.$w !== this.$w) return -3;
    if (other.$h !== this.$h) return -4;
    return 0;
  }
  histogram(_r: Rectangle | null = null): number[][] { return [[], [], [], []]; }

  clone(): BitmapData {
    const bd = new BitmapData(this.$w, this.$h, this.$transparent, 0);
    const s = this.$canvasSource();
    if (s) { const ctx = bd.$ensureCanvas(); ctx.clearRect(0, 0, bd.$w, bd.$h); ctx.drawImage(s, 0, 0); }
    bd.$source = this.$source;
    return bd;
  }

  lock(): void {}
  unlock(_changeRect: Rectangle | null = null): void {}
  encode(_rect: Rectangle, _compressor: any, _out: ByteArray | null = null): ByteArray { return new ByteArray(); }

  dispose(): void {
    this.$disposed = true;
    this.$data = null;
    this.$img = null;
    if (this.$canvas) { this.$canvas.width = 1; this.$canvas.height = 1; }
    this.$tex?.destroy(false);
    this.$tex = null;
  }
}
$class(BitmapData, "flash.display.BitmapData", { implements: [IBitmapDrawable] });
