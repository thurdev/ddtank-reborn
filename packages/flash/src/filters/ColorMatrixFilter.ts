/** `flash.filters.ColorMatrixFilter` — só dados; vira filtro Pixi em filters/convert.ts. */
import { $class } from "../as3";
import { BitmapFilter } from "./BitmapFilter";

export class ColorMatrixFilter extends BitmapFilter {
  matrix: number[];
  constructor(matrix: number[] = [1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0]) {
    super();
    this.matrix = matrix ? matrix.slice() : matrix;
  }
  clone(): ColorMatrixFilter {
    return new ColorMatrixFilter(this.matrix?.slice());
  }
}
$class(ColorMatrixFilter, "flash.filters.ColorMatrixFilter");
