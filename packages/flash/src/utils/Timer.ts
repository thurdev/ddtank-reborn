/**
 * `flash.utils.Timer` — dispara TIMER a cada `delay` ms, `repeatCount` vezes
 * (0 = infinito), depois TIMER_COMPLETE.
 */
import { $class } from "../as3";
import { EventDispatcher } from "../events/EventDispatcher";
import { TimerEvent } from "../events/TimerEvent";
import { safe } from "../player-safe";

export class Timer extends EventDispatcher {
  $delay: number;
  $repeatCount: number;
  $currentCount = 0;
  $handle: ReturnType<typeof setInterval> | null = null;

  constructor(delay: number, repeatCount = 0) {
    super();
    this.$delay = delay;
    this.$repeatCount = repeatCount;
  }

  get delay(): number { return this.$delay; }
  set delay(v: number) {
    this.$delay = v;
    if (this.running) { this.stop(); this.start(); }
  }
  get repeatCount(): number { return this.$repeatCount; }
  set repeatCount(v: number) { this.$repeatCount = v; }
  get currentCount(): number { return this.$currentCount; }
  get running(): boolean { return this.$handle !== null; }

  start(): void {
    if (this.$handle !== null) return;
    // Flash não deixa delay < ~16ms render rodar mais rápido que o frame; usamos mínimo 1ms
    this.$handle = setInterval(() => this.$tick(), Math.max(1, this.$delay));
  }

  stop(): void {
    if (this.$handle !== null) clearInterval(this.$handle);
    this.$handle = null;
  }

  reset(): void {
    this.stop();
    this.$currentCount = 0;
  }

  $tick(): void {
    this.$currentCount++;
    safe(() => this.dispatchEvent(new TimerEvent(TimerEvent.TIMER)), "Timer.TIMER");
    if (this.$repeatCount > 0 && this.$currentCount >= this.$repeatCount) {
      this.stop();
      safe(() => this.dispatchEvent(new TimerEvent(TimerEvent.TIMER_COMPLETE)), "Timer.TIMER_COMPLETE");
    }
  }
}
$class(Timer, "flash.utils.Timer");
