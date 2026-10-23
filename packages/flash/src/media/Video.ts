/**
 * `flash.media.Video` — esqueleto gerado por tools/as3-to-ts/src/gen-flash-skeletons.ts.
 * Constantes conferem com o Flash Player; métodos não implementados avisam no console.
 */
import { $class } from "../as3";
import { $todo } from "../todo";
import { DisplayObject } from "../display/DisplayObject";

export class Video extends DisplayObject {

  constructor(width?: number, height?: number) {
    super();
  }
  get deblocking(): number { return $todo("Video.deblocking"); }
  set deblocking(_v: number) { $todo("Video.deblocking="); }
  get smoothing(): boolean { return $todo("Video.smoothing"); }
  set smoothing(_v: boolean) { $todo("Video.smoothing="); }
  get videoWidth(): number { return $todo("Video.videoWidth"); }
  get videoHeight(): number { return $todo("Video.videoHeight"); }
  clear(): void { return $todo("Video.clear()"); }
  attachNetStream(_param1: any): void { return $todo("Video.attachNetStream()"); }
  attachCamera(_param1: any): void { return $todo("Video.attachCamera()"); }
}
$class(Video, "flash.media.Video");
