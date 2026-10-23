/** `flash.filters.BevelFilter` — só dados; vira filtro Pixi em filters/convert.ts. */
import { $class } from "../as3";
import { BitmapFilter } from "./BitmapFilter";

export class BevelFilter extends BitmapFilter {
  distance: number;
  angle: number;
  highlightColor: number;
  highlightAlpha: number;
  shadowColor: number;
  shadowAlpha: number;
  blurX: number;
  blurY: number;
  strength: number;
  quality: number;
  type: string;
  knockout: boolean;
  constructor(distance: number = 4, angle: number = 45, highlightColor: number = 0xffffff, highlightAlpha: number = 1, shadowColor: number = 0, shadowAlpha: number = 1, blurX: number = 4, blurY: number = 4, strength: number = 1, quality: number = 1, type: string = "inner", knockout: boolean = false) {
    super();
    this.distance = distance;
    this.angle = angle;
    this.highlightColor = highlightColor;
    this.highlightAlpha = highlightAlpha;
    this.shadowColor = shadowColor;
    this.shadowAlpha = shadowAlpha;
    this.blurX = blurX;
    this.blurY = blurY;
    this.strength = strength;
    this.quality = quality;
    this.type = type;
    this.knockout = knockout;
  }
  clone(): BevelFilter {
    return new BevelFilter(this.distance, this.angle, this.highlightColor, this.highlightAlpha, this.shadowColor, this.shadowAlpha, this.blurX, this.blurY, this.strength, this.quality, this.type, this.knockout);
  }
}
$class(BevelFilter, "flash.filters.BevelFilter");
