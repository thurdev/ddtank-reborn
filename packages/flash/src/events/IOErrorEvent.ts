/** `flash.events.IOErrorEvent` */
import { $class } from "../as3";
import { ErrorEvent } from "./ErrorEvent";

export class IOErrorEvent extends ErrorEvent {
  static readonly IO_ERROR = "ioError";
  static readonly NETWORK_ERROR = "networkError";
  static readonly DISK_ERROR = "diskError";
  static readonly VERIFY_ERROR = "verifyError";

  constructor(type: string, bubbles = false, cancelable = false, text: string = "", errorID: number = 0) {
    super(type, bubbles, cancelable, text, errorID);
  }
  clone(): IOErrorEvent {
    return new IOErrorEvent(this.type, this.bubbles, this.cancelable, this.text, this.errorID);
  }
}
$class(IOErrorEvent, "flash.events.IOErrorEvent");
