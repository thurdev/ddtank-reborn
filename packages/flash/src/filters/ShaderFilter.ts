/** `flash.filters.ShaderFilter` — só dados; vira filtro Pixi em filters/convert.ts. */
import { $class } from "../as3";
import { BitmapFilter } from "./BitmapFilter";

export class ShaderFilter extends BitmapFilter {
  shader: any;
  constructor(shader: any = null) {
    super();
    this.shader = shader;
  }
  clone(): ShaderFilter {
    return new ShaderFilter(this.shader);
  }
}
$class(ShaderFilter, "flash.filters.ShaderFilter");
