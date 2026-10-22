/** `flash.system.Capabilities` — finge ser Flash Player 32 no Windows (o jogo só lê versão/idioma/tela). */
import { $class } from "../as3";

export class Capabilities {
  static get version(): string { return "WIN 32,0,0,465"; }
  static get os(): string { return typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "Mac OS" : "Windows 10"; }
  static get playerType(): string { return "PlugIn"; }
  static get language(): string { return "pt"; }
  static get isDebugger(): boolean { return false; }
  static get screenResolutionX(): number { return typeof screen !== "undefined" ? screen.width : 1920; }
  static get screenResolutionY(): number { return typeof screen !== "undefined" ? screen.height : 1080; }
  static get screenDPI(): number { return 96; }
  static get pixelAspectRatio(): number { return 1; }
  static get hasIME(): boolean { return true; }
  static get hasAudio(): boolean { return true; }
  static get hasMP3(): boolean { return true; }
  static get manufacturer(): string { return "Adobe Windows"; }
  static get cpuArchitecture(): string { return "x86"; }
  static get supports32BitProcesses(): boolean { return true; }
  static get supports64BitProcesses(): boolean { return true; }
  static get serverString(): string { return ""; }
  static get isEmbeddedInAcrobat(): boolean { return false; }
  static get localFileReadDisable(): boolean { return true; }
  static get avHardwareDisable(): boolean { return true; }
  static get touchscreenType(): string { return "none"; }
  static hasMultiChannelAudio(_t: string): boolean { return false; }
}
$class(Capabilities, "flash.system.Capabilities");
