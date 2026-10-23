/** `flash.ui.ContextMenuItem` */
import { $class } from "../as3";
import { EventDispatcher } from "../events/EventDispatcher";

export class ContextMenuItem extends EventDispatcher {
  constructor(public caption: string, public separatorBefore = false, public enabled = true, public visible = true) {
    super();
  }
  clone(): ContextMenuItem { return new ContextMenuItem(this.caption, this.separatorBefore, this.enabled, this.visible); }
}
$class(ContextMenuItem, "flash.ui.ContextMenuItem");
