/** `flash.events.TextEvent` */
import { $class } from "../as3";
import { Event } from "./Event";

export class TextEvent extends Event {
  static readonly LINK = "link";
  static readonly TEXT_INPUT = "textInput";

  text: string;
  constructor(type: string, bubbles = false, cancelable = false, text: string = "") {
    super(type, bubbles, cancelable);
    this.text = text;
  }
  clone(): TextEvent {
    return new TextEvent(this.type, this.bubbles, this.cancelable, this.text);
  }
}
$class(TextEvent, "flash.events.TextEvent");
