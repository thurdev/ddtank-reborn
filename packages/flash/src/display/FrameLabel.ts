/** `flash.display.FrameLabel` */
import { $class } from "../as3";
import { EventDispatcher } from "../events/EventDispatcher";

export class FrameLabel extends EventDispatcher {
  $name: string;
  $frame: number;
  constructor(name: string, frame: number) {
    super();
    this.$name = name;
    this.$frame = frame;
  }
  get name(): string { return this.$name; }
  get frame(): number { return this.$frame; }
}
$class(FrameLabel, "flash.display.FrameLabel");
