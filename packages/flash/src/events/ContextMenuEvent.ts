/** `flash.events.ContextMenuEvent` */
import { $class } from "../as3";
import { Event } from "./Event";

export class ContextMenuEvent extends Event {
  static readonly MENU_ITEM_SELECT = "menuItemSelect";
  static readonly MENU_SELECT = "menuSelect";

  mouseTarget: any;
  contextMenuOwner: any;
  constructor(type: string, bubbles = false, cancelable = false, mouseTarget: any = null, contextMenuOwner: any = null) {
    super(type, bubbles, cancelable);
    this.mouseTarget = mouseTarget;
    this.contextMenuOwner = contextMenuOwner;
  }
  clone(): ContextMenuEvent {
    return new ContextMenuEvent(this.type, this.bubbles, this.cancelable, this.mouseTarget, this.contextMenuOwner);
  }
}
$class(ContextMenuEvent, "flash.events.ContextMenuEvent");
