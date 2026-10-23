/** `flash.events.ErrorEvent` */
import { $class } from "../as3";
import { TextEvent } from "./TextEvent";

export class ErrorEvent extends TextEvent {
  static readonly ERROR = "error";

  errorID: number;
  constructor(type: string, bubbles = false, cancelable = false, text: string = "", errorID: number = 0) {
    super(type, bubbles, cancelable, text);
    this.errorID = errorID;
  }
  clone(): ErrorEvent {
    return new ErrorEvent(this.type, this.bubbles, this.cancelable, this.text, this.errorID);
  }
}
$class(ErrorEvent, "flash.events.ErrorEvent");
