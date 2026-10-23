/** `flash.display.InteractiveObject` — o que recebe mouse/teclado/foco. */
import { $class } from "../as3";
import { DisplayObject } from "./DisplayObject";

export class InteractiveObject extends DisplayObject {
  $mouseEnabled = true;
  $doubleClickEnabled = false;
  tabEnabled = false;
  tabIndex = -1;
  focusRect: any = null;
  contextMenu: any = null;
  accessibilityImplementation: any = null;
  needsSoftKeyboard = false;
  softKeyboardInputAreaOfInterest: any = null;

  get mouseEnabled(): boolean { return this.$mouseEnabled; }
  set mouseEnabled(v: boolean) { this.$mouseEnabled = !!v; }
  get doubleClickEnabled(): boolean { return this.$doubleClickEnabled; }
  set doubleClickEnabled(v: boolean) { this.$doubleClickEnabled = !!v; }

  requestSoftKeyboard(): boolean { return false; }
}
$class(InteractiveObject, "flash.display.InteractiveObject");
