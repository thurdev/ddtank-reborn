/** `flash.events.NetStatusEvent` */
import { $class } from "../as3";
import { Event } from "./Event";

export class NetStatusEvent extends Event {
  static readonly NET_STATUS = "netStatus";

  info: any;
  constructor(type: string, bubbles = false, cancelable = false, info: any = null) {
    super(type, bubbles, cancelable);
    this.info = info;
  }
  clone(): NetStatusEvent {
    return new NetStatusEvent(this.type, this.bubbles, this.cancelable, this.info);
  }
}
$class(NetStatusEvent, "flash.events.NetStatusEvent");
