/** `flash.filters.GradientGlowFilter` — só dados; vira filtro Pixi em filters/convert.ts. */
import { $class } from "../as3";
import { BitmapFilter } from "./BitmapFilter";

export class GradientGlowFilter extends BitmapFilter {
  distance: number;
  angle: number;
  colors: number[];
  alphas: number[];
  ratios: number[];
  blurX: number;
  blurY: number;
  strength: number;
  quality: number;
  type: string;
  knockout: boolean;
  constructor(distance: number = 4, angle: number = 45, colors: number[] = [], alphas: number[] = [], ratios: number[] = [], blurX: number = 4, blurY: number = 4, strength: number = 1, quality: number = 1, type: string = "inner", knockout: boolean = false) {
    super();
    this.distance = distance;
    this.angle = angle;
    this.colors = colors;
    this.alphas = alphas;
    this.ratios = ratios;
    this.blurX = blurX;
    this.blurY = blurY;
    this.strength = strength;
    this.quality = quality;
    this.type = type;
    this.knockout = knockout;
  }
  clone(): GradientGlowFilter {
    return new GradientGlowFilter(this.distance, this.angle, this.colors?.slice(), this.alphas?.slice(), this.ratios?.slice(), this.blurX, this.blurY, this.strength, this.quality, this.type, this.knockout);
  }
}
$class(GradientGlowFilter, "flash.filters.GradientGlowFilter");
