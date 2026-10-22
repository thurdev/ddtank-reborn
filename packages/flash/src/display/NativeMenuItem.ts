/**
 * `flash.display.NativeMenuItem` — esqueleto gerado por tools/as3-to-ts/src/gen-flash-skeletons.ts.
 * Constantes conferem com o Flash Player; métodos não implementados avisam no console.
 */
import { $class } from "../as3";
import { $todo } from "../todo";
import { EventDispatcher } from "../events/EventDispatcher";

export class NativeMenuItem extends EventDispatcher {

  constructor() {
    super();
  }
  get enabled(): boolean { return $todo("NativeMenuItem.enabled"); }
  set enabled(_v: boolean) { $todo("NativeMenuItem.enabled="); }
}
$class(NativeMenuItem, "flash.display.NativeMenuItem");
