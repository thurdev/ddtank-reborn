/**
 * `flash.display.Shape` — desenho sem filhos e sem mouse.
 *
 * Também representa as formas vetoriais vindas dos SWFs exportados: nesse
 * caso a forma já foi rasterizada em PNG pelo exportador (`$setImage`) — é
 * esse PNG que você edita pra mudar a arte (ver docs/client-pixi/ASSETS.md).
 */
import { Sprite as PSprite, type Texture } from "pixi.js";
import { $class } from "../as3";
import { queueFlush } from "../render-queue";
import { Rectangle } from "../geom/Rectangle";
import { DisplayObject } from "./DisplayObject";
import { Graphics } from "./Graphics";
import { alphaAt, type AlphaSource } from "./alpha-hit";

export class Shape extends DisplayObject {
  $graphics: Graphics | null = null;
  /** imagem rasterizada (forma de SWF) */
  $img: PSprite | null = null;
  override $maskNode(): any { return this.$img ?? this.$node; }
  $imgRect: Rectangle | null = null;
  $imgAlpha: AlphaSource | null = null;

  get graphics(): Graphics {
    if (!this.$graphics) {
      this.$graphics = new Graphics(this);
      this.$node.addChildAt(this.$graphics.$updatePixi(), 0);
    }
    return this.$graphics;
  }

  $graphicsChanged(): void {
    if (this.$graphics) queueFlush(this.$graphics);
  }

  /** mostra uma imagem no lugar do vetor: `rect` = posição/tamanho em pixels do Flash */
  $setImage(tex: Texture, rect: Rectangle, alpha: AlphaSource | null): void {
    if (!this.$img) {
      this.$img = new PSprite(tex);
      this.$node.addChild(this.$img);
    } else this.$img.texture = tex;
    this.$img.position.set(rect.x, rect.y);
    this.$img.width = rect.width;
    this.$img.height = rect.height;
    this.$imgRect = rect.clone();
    this.$imgAlpha = alpha;
  }

  $localRect(): Rectangle | null {
    const g = this.$graphics?.$bounds() ?? null;
    if (this.$imgRect) return g ? g.union(this.$imgRect) : this.$imgRect.clone();
    return g;
  }

  $hitLocal(x: number, y: number, shape: boolean): boolean {
    if (this.$imgRect && this.$imgRect.contains(x, y)) {
      if (!shape || !this.$imgAlpha) return true;
      const r = this.$imgRect;
      if (alphaAt(this.$imgAlpha, (x - r.x) / r.width, (y - r.y) / r.height) > 0) return true;
    }
    const g = this.$graphics;
    if (!g) return false;
    return shape ? g.$hitShape(x, y) : !!g.$bounds()?.contains(x, y);
  }
}
$class(Shape, "flash.display.Shape");
