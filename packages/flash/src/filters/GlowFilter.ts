/** `flash.filters.GlowFilter` — só dados; vira filtro Pixi em filters/convert.ts. */
import { $class } from "../as3";
import { BitmapFilter } from "./BitmapFilter";

export class GlowFilter extends BitmapFilter {
  color: number;
  alpha: number;
  blurX: number;
  blurY: number;
  strength: number;
  quality: number;
  inner: boolean;
  knockout: boolean;
  constructor(color: number = 0xff0000, alpha: number = 1, blurX: number = 6, blurY: number = 6, strength: number = 2, quality: number = 1, inner: boolean = false, knockout: boolean = false) {
    super();
    this.color = color;
    this.alpha = alpha;
    this.blurX = blurX;
    this.blurY = blurY;
    this.strength = strength;
    this.quality = quality;
    this.inner = inner;
    this.knockout = knockout;
  }
  clone(): GlowFilter {
    return new GlowFilter(this.color, this.alpha, this.blurX, this.blurY, this.strength, this.quality, this.inner, this.knockout);
  }
}
$class(GlowFilter, "flash.filters.GlowFilter");
