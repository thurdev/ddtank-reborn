/**
 * `flash.display.DisplayObjectContainer` — lista de filhos.
 *
 * A ordem dos filhos (`$children`) é a do Flash; os nós Pixi dos filhos ficam
 * numa camada própria (`$childLayer`) na mesma ordem. O nó do container tem:
 * [graphics (Sprite/Shape)] [camada de filhos] [máscara do scrollRect].
 */
import { Container } from "pixi.js";
import { $class } from "../as3";
import { Event } from "../events/Event";
import { Point } from "../geom/Point";
import { DisplayObject } from "./DisplayObject";
import { InteractiveObject } from "./InteractiveObject";

const rangeError = () => new RangeError("Error #2006: The supplied index is out of bounds.");

export class DisplayObjectContainer extends InteractiveObject {
  $children: DisplayObject[] = [];
  $childLayer: Container = new Container();
  $mouseChildren = true;
  tabChildren = true;

  constructor() {
    super();
    this.$node.addChild(this.$childLayer);
  }

  get numChildren(): number { return this.$children.length; }
  get mouseChildren(): boolean { return this.$mouseChildren; }
  set mouseChildren(v: boolean) { this.$mouseChildren = !!v; }
  get textSnapshot(): any { return null; }

  // Regra: métodos públicos do Flash NUNCA chamam outros métodos públicos (classes do
  // jogo sobrescrevem addChild/removeChildAt... pra redirecionar pra um container
  // interno; no Flash nativo um não passava pelo outro). Tudo vai pelos $internos.

  addChild<T extends DisplayObject>(child: T): T {
    if (!child) throw new TypeError("Error #2007: Parameter child must be non-null.");
    const at = child.$parent === this ? this.$children.length - 1 : this.$children.length;
    return this.$addAt(child, at);
  }

  addChildAt<T extends DisplayObject>(child: T, index: number): T {
    return this.$addAt(child, index);
  }

  /** inserção de verdade (não sobrescrevível) */
  $addAt<T extends DisplayObject>(child: T, index: number): T {
    if (!child) throw new TypeError("Error #2007: Parameter child must be non-null.");
    if ((child as unknown) === this) throw new Error("Error #2024: An object cannot be added as a child of itself.");
    for (let p: any = this.$parent; p; p = p.$parent) if (p === child) throw new Error("Error #2150: An object cannot be added as a child to one of it's children (or children's children, etc.).");
    if (child.$parent === this) {
      if (index < 0 || index >= this.$children.length) throw rangeError();
      this.$setIndex(child, index);
      return child;
    }
    if (index < 0 || index > this.$children.length) throw rangeError();
    // tira do pai antigo pelo caminho interno
    if (child.$parent) {
      const old = child.$parent as any;
      if (typeof old.$detach === "function") old.$detach(child);
      else child.$parent = null; // pai "virtual" (estado de SimpleButton)
    }
    index = Math.min(index, this.$children.length);
    this.$children.splice(index, 0, child);
    this.$childLayer.addChildAt(child.$node, index);
    child.$parent = this;
    this.$onChildAdded?.(child);
    child.dispatchEvent(new Event(Event.ADDED, true));
    if (this.$stage) propagateStage(child, this.$stage);
    return child;
  }

  removeChild<T extends DisplayObject>(child: T): T {
    if (this.$children.indexOf(child) < 0) throw new ArgumentError2025();
    return this.$detach(child) as T;
  }

  removeChildAt(index: number): DisplayObject {
    const child = this.$children[index];
    if (!child) throw rangeError();
    return this.$detach(child);
  }

  /** remoção de verdade (não sobrescrevível): eventos REMOVED/REMOVED_FROM_STAGE e tira da lista */
  $detach(child: DisplayObject): DisplayObject {
    if (this.$children.indexOf(child) < 0) return child;
    child.dispatchEvent(new Event(Event.REMOVED, true));
    // listeners de REMOVED / REMOVED_FROM_STAGE podem mexer na lista (o SpriteLayer do
    // pickgliss reinsere a camada de bloqueio): o índice é calculado só no fim
    if (this.$children.indexOf(child) < 0) return child;
    if (child.$stage) propagateStage(child, null);
    const i = this.$children.indexOf(child);
    if (i < 0) return child;
    this.$children.splice(i, 1);
    this.$childLayer.removeChild(child.$node);
    child.$parent = null;
    this.$onChildRemoved?.(child);
    return child;
  }

  removeChildren(begin = 0, end = 0x7fffffff): void {
    const last = Math.min(end, this.$children.length - 1);
    for (let i = last; i >= begin; i--) { const c = this.$children[i]; if (c) this.$detach(c); }
  }

  getChildAt(index: number): DisplayObject {
    const c = this.$children[index];
    if (!c) throw rangeError();
    return c;
  }

  getChildByName(name: string): DisplayObject | null {
    return this.$children.find((c) => c.$name === name) ?? null;
  }

  getChildIndex(child: DisplayObject): number {
    const i = this.$children.indexOf(child);
    if (i < 0) throw new ArgumentError2025();
    return i;
  }

  setChildIndex(child: DisplayObject, index: number): void {
    this.$setIndex(child, index);
  }

  $setIndex(child: DisplayObject, index: number): void {
    const i = this.$children.indexOf(child);
    if (i < 0) throw new ArgumentError2025();
    if (index < 0 || index >= this.$children.length) throw rangeError();
    if (i === index) return;
    this.$children.splice(i, 1);
    this.$children.splice(index, 0, child);
    this.$childLayer.setChildIndex(child.$node, index);
  }

  swapChildren(a: DisplayObject, b: DisplayObject): void {
    const i = this.$children.indexOf(a), j = this.$children.indexOf(b);
    if (i < 0 || j < 0) throw new ArgumentError2025();
    this.$swap(i, j);
  }

  swapChildrenAt(i: number, j: number): void {
    if (!this.$children[i] || !this.$children[j]) throw rangeError();
    this.$swap(i, j);
  }

  $swap(i: number, j: number): void {
    if (i === j) return;
    const a = this.$children[i]!, b = this.$children[j]!;
    this.$children[i] = b;
    this.$children[j] = a;
    this.$childLayer.swapChildren(a.$node, b.$node);
  }

  contains(child: DisplayObject): boolean {
    for (let o: any = child; o; o = o.$parent) if (o === this) return true;
    return false;
  }

  getObjectsUnderPoint(p: Point): DisplayObject[] {
    const out: DisplayObject[] = [];
    const walk = (o: DisplayObject) => {
      const kids = (o as any).$children as DisplayObject[] | undefined;
      if (!kids) { if (o.$hitGlobal(p.x, p.y, true)) out.push(o); return; }
      for (const c of kids) walk(c);
    };
    walk(this);
    return out;
  }

  areInaccessibleObjectsUnderPoint(_p: Point): boolean { return false; }

  stopAllMovieClips(): void {
    const walk = (o: any) => { o.stop?.(); for (const c of o.$children ?? []) walk(c); };
    walk(this);
  }

  /** ganchos pra MovieClip (nomes de instância) */
  $onChildAdded?(child: DisplayObject): void;
  $onChildRemoved?(child: DisplayObject): void;
  $renamedChild?(child: DisplayObject, oldName: string): void;
}
$class(DisplayObjectContainer, "flash.display.DisplayObjectContainer");

/** entra/sai do palco recursivamente (dispara ADDED_TO_STAGE / REMOVED_FROM_STAGE em todos) */
export function propagateStage(o: DisplayObject, stage: any): void {
  o.$setStage(stage);
  const kids = (o as any).$children as DisplayObject[] | undefined;
  if (kids) for (const c of kids.slice()) propagateStage(c, stage);
}

class ArgumentError2025 extends Error {
  constructor() {
    super("Error #2025: The supplied DisplayObject must be a child of the caller.");
    this.name = "ArgumentError";
  }
}
