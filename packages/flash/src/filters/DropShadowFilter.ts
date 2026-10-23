/** `flash.filters.DropShadowFilter` — só dados; vira filtro Pixi em filters/convert.ts. */
import { $class } from "../as3";
import { BitmapFilter } from "./BitmapFilter";

export class DropShadowFilter extends BitmapFilter {
  distance: number;
  angle: number;
  color: number;
  alpha: number;
  blurX: number;
  blurY: number;
  strength: number;
  quality: number;
  inner: boolean;
  knockout: boolean;
  hideObject: boolean;
  constructor(distance: number = 4, angle: number = 45, color: number = 0, alpha: number = 1, blurX: number = 4, blurY: number = 4, strength: number = 1, quality: number = 1, inner: boolean = false, knockout: boolean = false, hideObject: boolean = false) {
    super();
    this.distance = distance;
    this.angle = angle;
    this.color = color;
    this.alpha = alpha;
    this.blurX = blurX;
    this.blurY = blurY;
    this.strength = strength;
    this.quality = quality;
    this.inner = inner;
    this.knockout = knockout;
    this.hideObject = hideObject;
  }
  clone(): DropShadowFilter {
    return new DropShadowFilter(this.distance, this.angle, this.color, this.alpha, this.blurX, this.blurY, this.strength, this.quality, this.inner, this.knockout, this.hideObject);
  }
}
$class(DropShadowFilter, "flash.filters.DropShadowFilter");
