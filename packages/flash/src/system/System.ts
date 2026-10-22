/** `flash.system.System` — memória, área de transferência. */
import { $class } from "../as3";

export class System {
  static useCodePage = false;
  static get totalMemory(): number { return (performance as any).memory?.usedJSHeapSize ?? 0; }
  static get totalMemoryNumber(): number { return System.totalMemory; }
  static get freeMemory(): number { return 0; }
  static get privateMemory(): number { return System.totalMemory; }
  static get vmVersion(): string { return "1.4.0"; }
  static get ime(): any { return null; }
  static setClipboard(s: string): void { void navigator.clipboard?.writeText(String(s)).catch(() => {}); }
  static gc(): void {}
  static pause(): void {}
  static resume(): void {}
  static exit(_code: number): void {}
  static pauseForGCIfCollectionImminent(_f = 0.75): void {}
  static disposeXML(_x: any): void {}
}
$class(System, "flash.system.System");
