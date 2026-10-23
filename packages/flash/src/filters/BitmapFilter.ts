/** `flash.filters.BitmapFilter` — base dos filtros. */
import { $class } from "../as3";

export class BitmapFilter {
  clone(): BitmapFilter { return new BitmapFilter(); }
}
$class(BitmapFilter, "flash.filters.BitmapFilter");
