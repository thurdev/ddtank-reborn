/** `flash.filters.BlurFilter` — só dados; vira filtro Pixi em filters/convert.ts. */
import { $class } from "../as3";
import { BitmapFilter } from "./BitmapFilter";

export class BlurFilter extends BitmapFilter {
  blurX: number;
  blurY: number;
  quality: number;
  constructor(blurX: number = 4, blurY: number = 4, quality: number = 1) {
    super();
    this.blurX = blurX;
    this.blurY = blurY;
    this.quality = quality;
  }
  clone(): BlurFilter {
    return new BlurFilter(this.blurX, this.blurY, this.quality);
  }
}
$class(BlurFilter, "flash.filters.BlurFilter");
