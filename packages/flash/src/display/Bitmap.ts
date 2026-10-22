/**
 * `flash.display.Bitmap` — mostra um BitmapData. Vários Bitmaps podem usar o
 * mesmo BitmapData (a textura é compartilhada).
 */
import { Sprite as PSprite, Texture } from "pixi.js";
import { $class } from "../as3";
import { Rectangle } from "../geom/Rectangle";
import { BitmapData } from "./BitmapData";
import { DisplayObject } from "./DisplayObject";

export class Bitmap extends DisplayObject {
  $bitmapData: BitmapData | null = null;
  $sprite: PSprite;
  $smoothing = false;
  pixelSnapping = "auto";

  constructor(bitmapData: BitmapData | null = null, pixelSnapping = "auto", smoothing = false) {
    super();
    this.$sprite = new PSprite(Texture.EMPTY);
    this.$node.addChild(this.$sprite);
    this.pixelSnapping = pixelSnapping;
    this.$smoothing = smoothing;
    // interno: o construtor do Flash não chama setter sobrescrito por subclasse
    this.$setBitmapData(bitmapData);
  }

  get bitmapData(): BitmapData | null { return this.$bitmapData; }
  set bitmapData(bd: BitmapData | null) {
    this.$setBitmapData(bd);
  }

  $setBitmapData(bd: BitmapData | null): void {
    this.$bitmapData = bd;
    if (bd && !bd.$disposed && bd.width > 0 && bd.height > 0) {
      this.$sprite.texture = bd.$texture();
      this.$sprite.visible = true;
    } else {
      this.$sprite.texture = Texture.EMPTY;
      this.$sprite.visible = false;
    }
    if (bd?.$source && !this.$symbol) this.$symbol = { swf: "", id: 0, image: bd.$source };
  }

  get smoothing(): boolean { return this.$smoothing; }
  set smoothing(v: boolean) { this.$smoothing = !!v; }

  $localRect(): Rectangle | null {
    const bd = this.$bitmapData;
    return bd && !bd.$disposed ? new Rectangle(0, 0, bd.width, bd.height) : null;
  }
}
$class(Bitmap, "flash.display.Bitmap");
