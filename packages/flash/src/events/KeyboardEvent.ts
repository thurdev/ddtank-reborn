/** `flash.events.KeyboardEvent` */
import { $class } from "../as3";
import { Event } from "./Event";

export class KeyboardEvent extends Event {
  static readonly KEY_DOWN = "keyDown";
  static readonly KEY_UP = "keyUp";

  charCode: number;
  keyCode: number;
  keyLocation: number;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  constructor(type: string, bubbles = false, cancelable = false, charCode: number = 0, keyCode: number = 0, keyLocation: number = 0, ctrlKey: boolean = false, altKey: boolean = false, shiftKey: boolean = false) {
    super(type, bubbles, cancelable);
    this.charCode = charCode;
    this.keyCode = keyCode;
    this.keyLocation = keyLocation;
    this.ctrlKey = ctrlKey;
    this.altKey = altKey;
    this.shiftKey = shiftKey;
  }
  clone(): KeyboardEvent {
    return new KeyboardEvent(this.type, this.bubbles, this.cancelable, this.charCode, this.keyCode, this.keyLocation, this.ctrlKey, this.altKey, this.shiftKey);
  }
  updateAfterEvent(): void {}
}
$class(KeyboardEvent, "flash.events.KeyboardEvent");
