/** `flash.events.FocusEvent` */
import { $class } from "../as3";
import { Event } from "./Event";

export class FocusEvent extends Event {
  static readonly FOCUS_IN = "focusIn";
  static readonly FOCUS_OUT = "focusOut";
  static readonly KEY_FOCUS_CHANGE = "keyFocusChange";
  static readonly MOUSE_FOCUS_CHANGE = "mouseFocusChange";

  relatedObject: any;
  shiftKey: boolean;
  keyCode: number;
  constructor(type: string, bubbles = false, cancelable = false, relatedObject: any = null, shiftKey: boolean = false, keyCode: number = 0) {
    super(type, bubbles, cancelable);
    this.relatedObject = relatedObject;
    this.shiftKey = shiftKey;
    this.keyCode = keyCode;
  }
  clone(): FocusEvent {
    return new FocusEvent(this.type, this.bubbles, this.cancelable, this.relatedObject, this.shiftKey, this.keyCode);
  }
}
$class(FocusEvent, "flash.events.FocusEvent");
