/** `flash.display.Scene` — o jogo só tem uma cena por clip. */
import { $class } from "../as3";
import type { FrameLabel } from "./FrameLabel";

export class Scene {
  constructor(public name: string, public labels: FrameLabel[], public numFrames: number) {}
}
$class(Scene, "flash.display.Scene");
