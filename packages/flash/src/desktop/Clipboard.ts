/** `flash.desktop.Clipboard` — só texto, via navigator.clipboard. */
import { $class } from "../as3";

export class Clipboard {
  static $general = new Clipboard();
  static get generalClipboard(): Clipboard { return Clipboard.$general; }
  $text = "";
  get formats(): string[] { return this.$text ? ["air:text"] : []; }
  setData(_format: string, data: any, _serializable = true): boolean {
    this.$text = String(data);
    void navigator.clipboard?.writeText(this.$text).catch(() => {});
    return true;
  }
  getData(_format: string, _t = "originalPreferred"): any { return this.$text; }
  hasFormat(_f: string): boolean { return !!this.$text; }
  clear(): void { this.$text = ""; }
  clearData(_f: string): void { this.$text = ""; }
  setDataHandler(..._a: any[]): boolean { return false; }
}
$class(Clipboard, "flash.desktop.Clipboard");
