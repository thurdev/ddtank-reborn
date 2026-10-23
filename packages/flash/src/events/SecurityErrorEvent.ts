/** `flash.events.SecurityErrorEvent` */
import { $class } from "../as3";
import { ErrorEvent } from "./ErrorEvent";

export class SecurityErrorEvent extends ErrorEvent {
  static readonly SECURITY_ERROR = "securityError";

  constructor(type: string, bubbles = false, cancelable = false, text: string = "", errorID: number = 0) {
    super(type, bubbles, cancelable, text, errorID);
  }
  clone(): SecurityErrorEvent {
    return new SecurityErrorEvent(this.type, this.bubbles, this.cancelable, this.text, this.errorID);
  }
}
$class(SecurityErrorEvent, "flash.events.SecurityErrorEvent");
