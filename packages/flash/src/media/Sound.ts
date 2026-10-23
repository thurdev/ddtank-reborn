/**
 * `flash.media.Sound` — som de arquivo (`load`) ou de linkage de SWF
 * exportado (`$url` preenchido pela SwfLibrary com o MP3 exportado).
 */
import { $class } from "../as3";
import { dlog } from "../debug";
import { Event } from "../events/Event";
import { EventDispatcher } from "../events/EventDispatcher";
import { IOErrorEvent } from "../events/IOErrorEvent";
import { safe } from "../player-safe";
import { loadBuffer } from "./audio";
import { SoundChannel } from "./SoundChannel";
import type { SoundTransform } from "./SoundTransform";

export class Sound extends EventDispatcher {
  $url = "";
  $buffer: AudioBuffer | null = null;

  constructor(stream: any = null, _context: any = null) {
    super();
    if (stream) this.load(stream);
  }

  load(stream: any, _context: any = null): void {
    this.$url = typeof stream === "string" ? stream : stream?.url ?? "";
    loadBuffer(this.$url).then((b) => {
      this.$buffer = b;
      if (b) safe(() => this.dispatchEvent(new Event(Event.COMPLETE)), "Sound.COMPLETE");
      else safe(() => this.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, `Error #2032: ${this.$url}`)), "Sound.IO_ERROR");
    });
  }

  get url(): string { return this.$url; }
  get length(): number { return this.$buffer ? this.$buffer.duration * 1000 : 0; }
  get bytesLoaded(): number { return this.$buffer ? 1 : 0; }
  get bytesTotal(): number { return 1; }
  get isBuffering(): boolean { return !this.$buffer; }
  get isURLInaccessible(): boolean { return false; }
  get id3(): any { return {}; }

  /** toca; volta um SoundChannel na hora (o som começa quando o arquivo chegar) */
  play(startTime = 0, loops = 0, sndTransform: SoundTransform | null = null): SoundChannel {
    const ch = new SoundChannel();
    if (!this.$url) return ch;
    dlog("sound", `toca ${this.$url}${loops > 1 ? ` (x${loops})` : ""}`);
    loadBuffer(this.$url).then((b) => { if (b) ch.$start(b, startTime, loops, sndTransform); });
    return ch;
  }

  close(): void {}
  extract(_target: any, _length: number, _start = -1): number { return 0; }
  loadCompressedDataFromByteArray(_b: any, _len: number): void {}
  loadPCMFromByteArray(..._a: any[]): void {}
}
$class(Sound, "flash.media.Sound");
