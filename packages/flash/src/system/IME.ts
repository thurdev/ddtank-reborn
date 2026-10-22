/** `flash.system.IME` — o navegador cuida do IME (input HTML real). */
import { $class } from "../as3";
import { EventDispatcher } from "../events/EventDispatcher";

export class IME extends EventDispatcher {
  static enabled = true;
  static conversionMode = "UNKNOWN";
  static get isSupported(): boolean { return true; }
  static setCompositionString(_s: string): void {}
  static doConversion(): void {}
  static compositionSelectionChanged(_a: number, _b: number): void {}
  static compositionAbandoned(): void {}
}
$class(IME, "flash.system.IME");
