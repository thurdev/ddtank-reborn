/** `flash.events.HTTPStatusEvent` */
import { $class } from "../as3";
import { Event } from "./Event";

export class HTTPStatusEvent extends Event {
  static readonly HTTP_STATUS = "httpStatus";
  static readonly HTTP_RESPONSE_STATUS = "httpResponseStatus";

  status: number;
  redirected: boolean;
  constructor(type: string, bubbles = false, cancelable = false, status: number = 0, redirected: boolean = false) {
    super(type, bubbles, cancelable);
    this.status = status;
    this.redirected = redirected;
  }
  clone(): HTTPStatusEvent {
    return new HTTPStatusEvent(this.type, this.bubbles, this.cancelable, this.status, this.redirected);
  }
}
$class(HTTPStatusEvent, "flash.events.HTTPStatusEvent");
