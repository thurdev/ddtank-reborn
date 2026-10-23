/** `flash.events.ProgressEvent` */
import { $class } from "../as3";
import { Event } from "./Event";

export class ProgressEvent extends Event {
  static readonly PROGRESS = "progress";
  static readonly SOCKET_DATA = "socketData";

  bytesLoaded: number;
  bytesTotal: number;
  constructor(type: string, bubbles = false, cancelable = false, bytesLoaded: number = 0, bytesTotal: number = 0) {
    super(type, bubbles, cancelable);
    this.bytesLoaded = bytesLoaded;
    this.bytesTotal = bytesTotal;
  }
  clone(): ProgressEvent {
    return new ProgressEvent(this.type, this.bubbles, this.cancelable, this.bytesLoaded, this.bytesTotal);
  }
}
$class(ProgressEvent, "flash.events.ProgressEvent");
