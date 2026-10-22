/**
 * `flash.display.Sprite` — container com `graphics` (desenhado atrás dos filhos)
 * e comportamento de botão (`buttonMode`, `useHandCursor`, arrastar).
 */
import { $class } from "../as3";
import { queueFlush } from "../render-queue";
import { Rectangle } from "../geom/Rectangle";
import { Matrix } from "../geom/Matrix";
import { DisplayObjectContainer } from "./DisplayObjectContainer";
import { Graphics } from "./Graphics";
import { Drag } from "./drag";
import { symbolOf, takePendingSymbol, type SymbolBinding } from "../swf/symbol";

export class Sprite extends DisplayObjectContainer {
  $graphics: Graphics | null = null;
  $buttonMode = false;
  $useHandCursor = true;
  $hitArea: Sprite | null = null;
  soundTransform: any = null;

  constructor() {
    super();
    // símbolo de SWF: Sprite monta o frame 1; MovieClip (isTimeline) monta a timeline no próprio construtor
    if (!(this as any).$isTimeline) {
      const sym = takePendingSymbol() ?? symbolOf(this.constructor);
      if (sym) this.$buildStatic(sym);
    }
  }

  /** filhos do frame 1 de um símbolo (Sprite exportado sem timeline) */
  $buildStatic(sym: SymbolBinding): void {
    this.$symbol = { swf: sym.lib.key, id: sym.id, linkage: sym.linkage };
    if (sym.char.k !== "sprite") return;
    const ops = sym.char.tl.f[0] ?? [];
    for (const op of ops) {
      if ("rm" in op || op.id === undefined) continue;
      const o = sym.lib.create(op.id);
      if (!o) continue;
      if (op.m) o.$setMatrix(new Matrix(...op.m));
      if (op.nm) { o.name = op.nm; (this as any)[op.nm] = o; }
      (o as any).$depth = op.d;
      this.addChild(o);
    }
    if (sym.char.grid) this.scale9Grid = new Rectangle(...sym.char.grid);
  }

  get graphics(): Graphics {
    if (!this.$graphics) {
      this.$graphics = new Graphics(this);
      this.$node.addChildAt(this.$graphics.$updatePixi(), 0);
    }
    return this.$graphics;
  }

  /** chamado pelo Graphics quando os comandos mudam */
  $graphicsChanged(): void {
    if (this.$graphics) queueFlush(this.$graphics);
  }

  get buttonMode(): boolean { return this.$buttonMode; }
  set buttonMode(v: boolean) { this.$buttonMode = !!v; }
  get useHandCursor(): boolean { return this.$useHandCursor; }
  set useHandCursor(v: boolean) { this.$useHandCursor = !!v; }
  get hitArea(): Sprite | null { return this.$hitArea; }
  set hitArea(v: Sprite | null) { this.$hitArea = v; }
  get dropTarget(): any { return Drag.dropTarget; }

  startDrag(lockCenter = false, bounds: Rectangle | null = null): void { Drag.start(this, lockCenter, bounds); }
  stopDrag(): void { Drag.stop(this); }
  startTouchDrag(_id: number, lockCenter = false, bounds: Rectangle | null = null): void { this.startDrag(lockCenter, bounds); }
  stopTouchDrag(_id: number): void { this.stopDrag(); }

  $localRect(): Rectangle | null { return this.$graphics?.$bounds() ?? null; }
  $hitLocal(x: number, y: number, shape: boolean): boolean {
    const g = this.$graphics;
    if (!g) return false;
    return shape ? g.$hitShape(x, y) : !!g.$bounds()?.contains(x, y);
  }
}
$class(Sprite, "flash.display.Sprite");
