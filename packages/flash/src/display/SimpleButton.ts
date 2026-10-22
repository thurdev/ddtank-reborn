/**
 * `flash.display.SimpleButton` — botão de 4 estados (up/over/down/hit).
 * Só o estado atual é desenhado; o clique usa `hitTestState`.
 * O Player troca o estado conforme o mouse (`$setMouseState`).
 */
import { $class } from "../as3";
import { Rectangle } from "../geom/Rectangle";
import { symbolOf, takePendingSymbol } from "../swf/symbol";
import { Matrix } from "../geom/Matrix";
import { DisplayObject } from "./DisplayObject";
import { InteractiveObject } from "./InteractiveObject";
import { Sprite } from "./Sprite";
import { filtersFromData } from "./MovieClip";
import { ColorTransform } from "../geom/ColorTransform";

type State = "up" | "over" | "down";

export class SimpleButton extends InteractiveObject {
  $up: DisplayObject | null = null;
  $over: DisplayObject | null = null;
  $down: DisplayObject | null = null;
  $hit: DisplayObject | null = null;
  $state: State = "up";
  $enabled = true;
  $useHandCursor = true;
  trackAsMenu = false;
  soundTransform: any = null;

  constructor(upState: DisplayObject | null = null, overState: DisplayObject | null = null, downState: DisplayObject | null = null, hitTestState: DisplayObject | null = null) {
    super();
    const sym = takePendingSymbol() ?? symbolOf(this.constructor);
    if (sym && sym.char.k === "button") {
      this.$symbol = { swf: sym.lib.key, id: sym.id, linkage: sym.linkage };
      const build = (ops: any[]): DisplayObject => {
        const s = new Sprite();
        for (const op of [...ops].sort((a, b) => a.d - b.d)) {
          const o = sym.lib.create(op.id);
          if (!o) continue;
          if (op.m) o.$setMatrix(new Matrix(...(op.m as [number, number, number, number, number, number])));
          if (op.ct) { o.$colorTransform = new ColorTransform(...(op.ct as [number, number, number, number, number, number, number, number])); o.$applyColor(); }
          if (op.fl) o.filters = filtersFromData(op.fl);
          if (op.bl) o.blendMode = op.bl;
          s.addChild(o);
        }
        return s;
      };
      upState = build(sym.char.up);
      overState = build(sym.char.over);
      downState = build(sym.char.down);
      hitTestState = build(sym.char.hit);
      this.trackAsMenu = !!sym.char.menu;
    }
    this.upState = upState;
    this.overState = overState;
    this.downState = downState;
    this.hitTestState = hitTestState;
  }

  private $adopt(o: DisplayObject | null): void {
    if (o) o.$parent = this; // pai "virtual": não entra na lista de filhos, mas as coordenadas funcionam
  }

  get upState(): DisplayObject | null { return this.$up; }
  set upState(v: DisplayObject | null) { this.$up = v; this.$adopt(v); this.$show(); }
  get overState(): DisplayObject | null { return this.$over; }
  set overState(v: DisplayObject | null) { this.$over = v; this.$adopt(v); this.$show(); }
  get downState(): DisplayObject | null { return this.$down; }
  set downState(v: DisplayObject | null) { this.$down = v; this.$adopt(v); this.$show(); }
  get hitTestState(): DisplayObject | null { return this.$hit; }
  set hitTestState(v: DisplayObject | null) { this.$hit = v; this.$adopt(v); }
  get enabled(): boolean { return this.$enabled; }
  set enabled(v: boolean) { this.$enabled = !!v; if (!v) this.$setMouseState("up"); }
  get useHandCursor(): boolean { return this.$useHandCursor; }
  set useHandCursor(v: boolean) { this.$useHandCursor = !!v; }

  $current(): DisplayObject | null {
    return (this.$state === "down" ? this.$down : this.$state === "over" ? this.$over : this.$up) ?? this.$up;
  }

  private $show(): void {
    this.$node.removeChildren();
    const c = this.$current();
    if (c) this.$node.addChild(c.$node);
  }

  /** Player: mouse entrou/saiu/apertou */
  $setMouseState(s: State): void {
    if (!this.$enabled) s = "up";
    if (s === this.$state) return;
    this.$state = s;
    this.$show();
  }

  $setStage(stage: any): void {
    super.$setStage(stage);
    for (const o of [this.$up, this.$over, this.$down, this.$hit]) o?.$setStage(stage);
  }

  $boundsIn(m: Matrix): Rectangle | null {
    const c = this.$current();
    if (!c) return null;
    const cm = c.$m.clone();
    cm.concat(m);
    return c.$boundsIn(cm);
  }

  $hitGlobal(gx: number, gy: number, shape: boolean): boolean {
    const h = this.$hit ?? this.$current();
    return !!h && h.$visible !== false && h.$hitGlobal(gx, gy, shape);
  }
}
$class(SimpleButton, "flash.display.SimpleButton");
