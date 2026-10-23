/** `flash.media.SoundTransform` — volume (0..1) e pan (-1..1). */
import { $class } from "../as3";

export class SoundTransform {
  volume: number;
  pan: number;
  leftToLeft = 1;
  leftToRight = 0;
  rightToRight = 1;
  rightToLeft = 0;
  constructor(vol = 1, panning = 0) {
    this.volume = vol;
    this.pan = panning;
  }
}
$class(SoundTransform, "flash.media.SoundTransform");
