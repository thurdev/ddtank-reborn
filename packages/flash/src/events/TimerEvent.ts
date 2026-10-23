/** `flash.events.TimerEvent` */
import { $class } from "../as3";
import { Event } from "./Event";

export class TimerEvent extends Event {
  static readonly TIMER = "timer";
  static readonly TIMER_COMPLETE = "timerComplete";

  constructor(type: string, bubbles = false, cancelable = false) {
    super(type, bubbles, cancelable);
  }
  clone(): TimerEvent {
    return new TimerEvent(this.type, this.bubbles, this.cancelable);
  }
  updateAfterEvent(): void {}
}
$class(TimerEvent, "flash.events.TimerEvent");
