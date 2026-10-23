/** `flash.media.SoundChannel` — um som tocando (parar, volume, posição). */
import { $class } from "../as3";
import { Event } from "../events/Event";
import { EventDispatcher } from "../events/EventDispatcher";
import { safe } from "../player-safe";
import { audioCtx, masterGain } from "./audio";
import { SoundTransform } from "./SoundTransform";

export class SoundChannel extends EventDispatcher {
  $src: AudioBufferSourceNode | null = null;
  $gain: GainNode | null = null;
  $pan: StereoPannerNode | null = null;
  $startedAt = 0;
  $offset = 0;
  $stopped = false;
  $transform = new SoundTransform();

  /** começa a tocar (Sound.play chama quando o buffer chega) */
  $start(buf: AudioBuffer, startMs: number, loops: number, t: SoundTransform | null): void {
    const c = audioCtx();
    if (!c || this.$stopped) return;
    this.$transform = t ? new SoundTransform(t.volume, t.pan) : new SoundTransform();
    const src = c.createBufferSource();
    src.buffer = buf;
    if (loops > 1) {
      src.loop = true;
      src.loopStart = 0;
      src.loopEnd = buf.duration;
    }
    const gain = c.createGain();
    gain.gain.value = this.$transform.volume;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pan) { pan.pan.value = this.$transform.pan; src.connect(gain).connect(pan).connect(masterGain()!); }
    else src.connect(gain).connect(masterGain()!);
    const offset = Math.max(0, startMs / 1000);
    if (loops > 1) src.start(0, offset, buf.duration * loops - offset);
    else src.start(0, offset);
    src.onended = () => {
      if (this.$stopped) return;
      this.$stopped = true;
      safe(() => this.dispatchEvent(new Event(Event.SOUND_COMPLETE)), "SOUND_COMPLETE");
    };
    this.$src = src;
    this.$gain = gain;
    this.$pan = pan;
    this.$startedAt = c.currentTime;
    this.$offset = startMs;
  }

  get position(): number {
    const c = audioCtx();
    if (!c || !this.$src) return this.$offset;
    return this.$offset + (c.currentTime - this.$startedAt) * 1000;
  }
  get soundTransform(): SoundTransform { return new SoundTransform(this.$transform.volume, this.$transform.pan); }
  set soundTransform(t: SoundTransform) {
    this.$transform = new SoundTransform(t.volume, t.pan);
    if (this.$gain) this.$gain.gain.value = t.volume;
    if (this.$pan) this.$pan.pan.value = t.pan;
  }
  get leftPeak(): number { return 0; }
  get rightPeak(): number { return 0; }

  stop(): void {
    this.$stopped = true;
    try { this.$src?.stop(); } catch { /* já parou */ }
    this.$src?.disconnect();
    this.$src = null;
  }
}
$class(SoundChannel, "flash.media.SoundChannel");
