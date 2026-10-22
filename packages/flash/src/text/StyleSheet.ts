/**
 * `flash.text.StyleSheet` — esqueleto gerado por tools/as3-to-ts/src/gen-flash-skeletons.ts.
 * Constantes conferem com o Flash Player; métodos não implementados avisam no console.
 */
import { $class } from "../as3";
import { $todo } from "../todo";
import { EventDispatcher } from "../events/EventDispatcher";

export class StyleSheet extends EventDispatcher {

  constructor() {
    super();
  }
  getStyle(_styleName: string): any { return $todo("StyleSheet.getStyle()"); }
  setStyle(_styleName: string, _styleObject: any): void { return $todo("StyleSheet.setStyle()"); }
  clear(): void { return $todo("StyleSheet.clear()"); }
  get styleNames(): any[] { return $todo("StyleSheet.styleNames"); }
  transform(_formatObject: any): any { return $todo("StyleSheet.transform()"); }
  parseCSS(_CSSText: string): void { return $todo("StyleSheet.parseCSS()"); }
}
$class(StyleSheet, "flash.text.StyleSheet");
