/**
 * `flash.display.DisplayObject` sobre PixiJS.
 *
 * Cada objeto de display do Flash tem um nó Pixi (`$node`) que só serve pra
 * desenhar. Toda a lógica do Flash (matriz, bounds, hit-test, eventos, ordem
 * dos filhos) é calculada aqui, com as regras do Flash, e o resultado é
 * copiado pro nó Pixi. Assim `width`, `getBounds`, `hitTestPoint`... dão o
 * mesmo número que davam no Flash, independente de como o Pixi calcula.
 *
 * Como lê esse código:
 * - `$m`  matriz local (a, b, c, d, tx, ty) — igual `transform.matrix`
 * - `$sx/$sy/$rot` escala e rotação guardadas separadas (o Flash faz isso pra
 *   não acumular erro quando o jogo seta `rotation` várias vezes)
 * - `$parent` container pai (DisplayObjectContainer)
 * - `$stage` Stage quando está no palco, senão null
 * - `$localRect()` retângulo do conteúdo próprio (sem filhos) no espaço local
 * - `$symbol` de onde veio a arte (SWF/símbolo/PNG) — usado pelo modo debug
 */
import { ColorMatrixFilter as PColorMatrixFilter, Container, Graphics as PGraphics, Matrix as PMatrix, type Filter } from "pixi.js";
import { $class } from "../as3";
import type { SymbolInfo } from "../debug";
import { Event } from "../events/Event";
import { EventDispatcher } from "../events/EventDispatcher";
import { ColorTransform } from "../geom/ColorTransform";
import { Matrix } from "../geom/Matrix";
import { Point } from "../geom/Point";
import { Rectangle } from "../geom/Rectangle";
import { Transform } from "../geom/Transform";
import { toPixiFilters } from "../filters/convert";
import { IBitmapDrawable } from "./IBitmapDrawable";

let instanceCounter = 1;

/** modo de mistura Flash → Pixi */
const BLEND: Record<string, string> = {
  normal: "normal", layer: "normal", add: "add", multiply: "multiply", screen: "screen", lighten: "lighten",
  darken: "darken", difference: "difference", subtract: "subtract", invert: "difference", overlay: "overlay",
  hardlight: "hard-light", erase: "erase", alpha: "normal", shader: "normal",
};

export class DisplayObject extends EventDispatcher {
  $node: Container;
  $m = new Matrix();
  $sx = 1;
  $sy = 1;
  $rot = 0;
  $name: string;
  $parent: any = null;
  $stage: any = null;
  $visible = true;
  $alpha = 1;
  $mask: DisplayObject | null = null;
  /** objeto que usa este como máscara */
  $maskOf: DisplayObject | null = null;
  $scrollRect: Rectangle | null = null;
  $filters: any[] = [];
  $blendMode = "normal";
  $colorTransform = new ColorTransform();
  $cacheAsBitmap = false;
  $symbol?: SymbolInfo;
  $loaderInfo: any = null;
  /** caixa 9-fatias (`scale9Grid`) */
  $scale9: Rectangle | null = null;
  opaqueBackground: any = null;
  accessibilityProperties: any = null;

  constructor(node?: Container) {
    super();
    this.$node = node ?? new Container();
    (this.$node as any).$owner = this;
    this.$name = `instance${instanceCounter++}`;
  }

  // ------------------------------------------------------------ transform
  /** copia a matriz pro nó Pixi */
  $syncMatrix(): void {
    const m = this.$m;
    const sr = this.$scrollRect;
    const tx = sr ? m.tx - (m.a * sr.x + m.c * sr.y) : m.tx;
    const ty = sr ? m.ty - (m.b * sr.x + m.d * sr.y) : m.ty;
    this.$node.setFromMatrix(new PMatrix(m.a, m.b, m.c, m.d, tx, ty));
  }

  private $composeMatrix(): void {
    const r = (this.$rot * Math.PI) / 180;
    const cos = Math.cos(r), sin = Math.sin(r);
    this.$m.a = this.$sx * cos;
    this.$m.b = this.$sx * sin;
    this.$m.c = -this.$sy * sin;
    this.$m.d = this.$sy * cos;
    this.$syncMatrix();
  }

  /** usado quando a matriz inteira muda (transform.matrix, timeline) */
  $setMatrix(m: Matrix): void {
    this.$m.copyFrom(m);
    this.$sx = Math.sqrt(m.a * m.a + m.b * m.b);
    this.$sy = Math.sqrt(m.c * m.c + m.d * m.d);
    if (m.a * m.d - m.b * m.c < 0) this.$sy = -this.$sy;
    this.$rot = (Math.atan2(m.b, m.a) * 180) / Math.PI;
    this.$syncMatrix();
  }

  get x(): number { return this.$m.tx; }
  set x(v: number) {
    v = Number(v);
    if (Number.isNaN(v)) return;
    this.$m.tx = Math.round(v * 20) / 20; // Flash guarda em twips
    this.$syncMatrix();
  }
  get y(): number { return this.$m.ty; }
  set y(v: number) {
    v = Number(v);
    if (Number.isNaN(v)) return;
    this.$m.ty = Math.round(v * 20) / 20;
    this.$syncMatrix();
  }
  get z(): number { return 0; }
  set z(_v: number) {}
  get scaleX(): number { return this.$sx; }
  set scaleX(v: number) { this.$sx = Number(v); this.$composeMatrix(); }
  get scaleY(): number { return this.$sy; }
  set scaleY(v: number) { this.$sy = Number(v); this.$composeMatrix(); }
  get scaleZ(): number { return 1; }
  set scaleZ(_v: number) {}
  get rotation(): number { return this.$rot; }
  set rotation(v: number) {
    v = Number(v) % 360;
    if (v > 180) v -= 360;
    else if (v < -180) v += 360;
    this.$rot = v;
    this.$composeMatrix();
  }
  get rotationX(): number { return 0; }
  set rotationX(_v: number) {}
  get rotationY(): number { return 0; }
  set rotationY(_v: number) {}
  get rotationZ(): number { return this.rotation; }
  set rotationZ(v: number) { this.rotation = v; }

  get width(): number { return this.getBounds(this.$parent ?? this).width; }
  set width(v: number) {
    const w = this.$localBounds().width;
    if (!w) return;
    this.scaleX = Number(v) / w;
  }
  get height(): number { return this.getBounds(this.$parent ?? this).height; }
  set height(v: number) {
    const h = this.$localBounds().height;
    if (!h) return;
    this.scaleY = Number(v) / h;
  }

  get alpha(): number { return this.$alpha; }
  set alpha(v: number) {
    this.$alpha = Math.max(0, Math.min(1, Math.round(Number(v) * 256) / 256));
    this.$applyColor();
  }
  get visible(): boolean { return this.$visible; }
  set visible(v: boolean) {
    this.$visible = !!v;
    this.$node.visible = this.$visible;
  }
  get name(): string { return this.$name; }
  set name(v: string) {
    const old = this.$name;
    this.$name = v;
    this.$parent?.$renamedChild?.(this, old);
  }

  get parent(): any { return this.$parent; }
  get stage(): any { return this.$stage; }
  get root(): any {
    let o: DisplayObject = this;
    while (o.$parent && !o.$parent.$isStage) o = o.$parent;
    return o.$parent || this.$stage ? o : null;
  }
  get loaderInfo(): any {
    for (let o: any = this; o; o = o.$parent) if (o.$loaderInfo) return o.$loaderInfo;
    return this.$stage?.$loaderInfo ?? null;
  }

  get transform(): Transform { return new Transform(this); }
  set transform(t: Transform) {
    this.$setMatrix(t.matrix);
    this.$colorTransform = t.colorTransform.clone();
    this.$applyColor();
  }

  get blendMode(): string { return this.$blendMode; }
  set blendMode(v: string) {
    this.$blendMode = v;
    (this.$node as any).blendMode = BLEND[v] ?? "normal";
  }
  get blendShader(): any { return null; }
  set blendShader(_v: any) {}

  get cacheAsBitmap(): boolean { return this.$cacheAsBitmap; }
  set cacheAsBitmap(v: boolean) { this.$cacheAsBitmap = !!v; }
  get cacheAsBitmapMatrix(): Matrix | null { return null; }
  set cacheAsBitmapMatrix(_v: Matrix | null) {}

  get scale9Grid(): Rectangle | null { return this.$scale9; }
  set scale9Grid(v: Rectangle | null) { this.$scale9 = v ? v.clone() : null; this.$onScale9?.(); }
  $onScale9?(): void;

  /** cópias dos filtros (igual ao Flash: alterar o array devolvido não muda nada) */
  get filters(): any[] { return this.$filters.map((f) => (f && typeof f.clone === "function" ? f.clone() : f)); }
  set filters(v: any[]) {
    this.$filters = (v ?? []).map((f) => (f && typeof f.clone === "function" ? f.clone() : f));
    this.$applyFilters();
  }

  /**
   * Nó Pixi usado quando ESTE objeto é máscara de outro. No Flash a máscara
   * recorta pelo desenho (texto = forma das letras, bitmap = pixels). No Pixi
   * só `Sprite` vira máscara de alfa; outro Container vira stencil (retângulo).
   * TextField/Bitmap/Shape-imagem devolvem o Sprite interno (ex.: GradientText
   * do pickgliss = degradê recortado pelo texto — leilão, títulos).
   */
  $maskNode(): Container { return this.$node; }

  get mask(): DisplayObject | null { return this.$mask; }
  set mask(v: DisplayObject | null) {
    if (this.$mask) this.$mask.$maskOf = null;
    this.$mask = v;
    if (v) {
      v.$maskOf = this;
      this.$node.mask = v.$maskNode();
    } else {
      this.$node.mask = this.$scrollRect ? this.$scrollMaskNode() : null;
    }
  }

  get scrollRect(): Rectangle | null { return this.$scrollRect ? this.$scrollRect.clone() : null; }
  set scrollRect(v: Rectangle | null) {
    this.$scrollRect = v ? v.clone() : null;
    if (!this.$mask) this.$node.mask = this.$scrollRect ? this.$scrollMaskNode() : null;
    this.$syncMatrix();
  }
  private $scrollMask?: PGraphics;
  private $scrollMaskNode(): PGraphics {
    const sr = this.$scrollRect!;
    // máscara em coordenadas locais do próprio nó (já deslocado por -sr.x/-sr.y)
    const g = (this.$scrollMask ??= new PGraphics());
    g.clear().rect(sr.x, sr.y, sr.width, sr.height).fill({ color: 0xffffff });
    if (g.parent !== this.$node) this.$node.addChild(g);
    return g;
  }

  // ------------------------------------------------------------ cor e filtros
  $colorFilter: PColorMatrixFilter | null = null;
  $applyColor(): void {
    const ct = this.$colorTransform;
    this.$node.alpha = this.$alpha * ct.alphaMultiplier;
    const plain = ct.redMultiplier === 1 && ct.greenMultiplier === 1 && ct.blueMultiplier === 1 &&
      !ct.redOffset && !ct.greenOffset && !ct.blueOffset && !ct.alphaOffset;
    if (plain) {
      if (this.$colorFilter) { this.$colorFilter = null; this.$applyFilters(); }
      return;
    }
    const f = (this.$colorFilter ??= new PColorMatrixFilter());
    f.matrix = [
      ct.redMultiplier, 0, 0, 0, ct.redOffset / 255,
      0, ct.greenMultiplier, 0, 0, ct.greenOffset / 255,
      0, 0, ct.blueMultiplier, 0, ct.blueOffset / 255,
      0, 0, 0, 1, ct.alphaOffset / 255,
    ];
    this.$applyFilters();
  }

  /** filtros Pixi atuais (reaproveitados entre frames — ver filters/convert.ts) */
  $pfilters: Filter[] = [];
  $applyFilters(): void {
    this.$pfilters = toPixiFilters(this.$filters, this.$pfilters);
    const list: Filter[] = [];
    if (this.$colorFilter) list.push(this.$colorFilter);
    list.push(...this.$pfilters);
    this.$node.filters = list.length ? list : null;
  }

  // ------------------------------------------------------------ hierarquia / eventos
  $eventParent(): EventDispatcher | null {
    return this.$parent;
  }

  /** chamado pelo container quando entra/sai do palco */
  $setStage(stage: any): void {
    if (this.$stage === stage) return;
    const was = this.$stage;
    this.$stage = stage;
    if (stage && !was) this.dispatchEvent(new Event(Event.ADDED_TO_STAGE));
    else if (!stage && was) {
      this.$stage = was; // REMOVED_FROM_STAGE ainda vê o stage
      this.dispatchEvent(new Event(Event.REMOVED_FROM_STAGE));
      this.$stage = null;
    }
  }

  // ------------------------------------------------------------ matrizes e espaços
  /** matriz local → global (palco) */
  $concatMatrix(): Matrix {
    const m = this.$m.clone();
    if (this.$scrollRect) m.translate(-(this.$m.a * this.$scrollRect.x + this.$m.c * this.$scrollRect.y), -(this.$m.b * this.$scrollRect.x + this.$m.d * this.$scrollRect.y));
    for (let p = this.$parent; p && !p.$isStage; p = p.$parent) {
      const pm = (p as DisplayObject).$m.clone();
      const sr = (p as DisplayObject).$scrollRect;
      if (sr) pm.translate(-(pm.a * sr.x + pm.c * sr.y), -(pm.b * sr.x + pm.d * sr.y));
      m.concat(pm);
    }
    return m;
  }

  localToGlobal(p: Point): Point { return this.$concatMatrix().transformPoint(p); }
  globalToLocal(p: Point): Point {
    const m = this.$concatMatrix();
    m.invert();
    return m.transformPoint(p);
  }
  local3DToGlobal(p: any): Point { return this.localToGlobal(new Point(p.x, p.y)); }
  globalToLocal3D(p: Point): any { return this.globalToLocal(p); }

  get mouseX(): number { return this.globalToLocal(new Point(Player.mouseX, Player.mouseY)).x; }
  get mouseY(): number { return this.globalToLocal(new Point(Player.mouseX, Player.mouseY)).y; }

  // ------------------------------------------------------------ bounds
  /** conteúdo próprio (sem filhos), espaço local. Subclasses sobrescrevem. */
  $localRect(): Rectangle | null { return null; }

  /** bounds no espaço local incluindo filhos */
  $localBounds(): Rectangle {
    return this.$boundsIn(new Matrix()) ?? new Rectangle();
  }

  /** bounds transformados por `m` (m = local → espaço alvo); null se vazio */
  $boundsIn(m: Matrix): Rectangle | null {
    let r: Rectangle | null = null;
    const own = this.$localRect();
    if (own && (own.width > 0 || own.height > 0)) r = transformRect(own, m);
    const kids: DisplayObject[] | undefined = (this as any).$children;
    if (kids) {
      for (const c of kids) {
        if (c.$maskOf) continue;
        const cm = c.$m.clone();
        cm.concat(m);
        const cr = c.$boundsIn(cm);
        if (cr) r = r ? r.union(cr) : cr;
      }
    }
    if (r && this.$scrollRect) {
      const sr = transformRect(this.$scrollRect, (() => { const t = new Matrix(1, 0, 0, 1, -this.$scrollRect!.x, -this.$scrollRect!.y); t.concat(m); return t; })());
      r = r.intersection(sr);
    }
    return r;
  }

  getBounds(target: DisplayObject | null): Rectangle {
    const m = this.$concatMatrix();
    if (target && target !== this.$stage && !(target as any).$isStage) {
      const inv = target.$concatMatrix();
      inv.invert();
      m.concat(inv);
    }
    const r = this.$boundsIn(m);
    if (!r) { const p = m.transformPoint(new Point()); return new Rectangle(p.x, p.y, 0, 0); }
    return r;
  }
  getRect(target: DisplayObject | null): Rectangle { return this.getBounds(target); }

  // ------------------------------------------------------------ hit test
  /** ponto (espaço local) acerta o conteúdo próprio? `shape` = forma exata */
  $hitLocal(x: number, y: number, _shape: boolean): boolean {
    const r = this.$localRect();
    return !!r && r.contains(x, y);
  }

  /** ponto global acerta este objeto (ou filhos)? */
  $hitGlobal(gx: number, gy: number, shape: boolean): boolean {
    if (this.$scrollRect || this.$mask) {
      const p = this.globalToLocal(new Point(gx, gy));
      if (this.$scrollRect && !this.$scrollRect.contains(p.x, p.y)) return false;
      if (this.$mask && !this.$mask.$hitGlobal(gx, gy, true)) return false;
    }
    const p = this.globalToLocal(new Point(gx, gy));
    if (this.$hitLocal(p.x, p.y, shape)) return true;
    const kids: DisplayObject[] | undefined = (this as any).$children;
    if (kids) for (let i = kids.length - 1; i >= 0; i--) {
      const c = kids[i]!;
      if (!c.$visible || c.$maskOf) continue;
      if (c.$hitGlobal(gx, gy, shape)) return true;
    }
    return false;
  }

  hitTestPoint(x: number, y: number, shapeFlag = false): boolean {
    return this.$hitGlobal(x, y, shapeFlag);
  }

  hitTestObject(o: DisplayObject): boolean {
    return this.getBounds(this.$stage).intersects(o.getBounds(o.$stage));
  }

  toString(): string { return `[object ${this.constructor.name}]`; }
}
$class(DisplayObject, "flash.display.DisplayObject", { implements: [IBitmapDrawable] });

/** retângulo transformado (AABB dos 4 cantos) */
export function transformRect(r: Rectangle, m: Matrix): Rectangle {
  const xs = [r.x, r.x + r.width], ys = [r.y, r.y + r.height];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const x of xs) for (const y of ys) {
    const px = m.a * x + m.c * y + m.tx;
    const py = m.b * x + m.d * y + m.ty;
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  return new Rectangle(minX, minY, maxX - minX, maxY - minY);
}

/** estado global do "player" que o display precisa (posição do mouse) */
export const Player = { mouseX: 0, mouseY: 0, /** frames desenhados (debug: ddtDebug.stage + Player.frames) */ frames: 0 };

