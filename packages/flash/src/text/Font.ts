/** `flash.text.Font` — fontes; o jogo usa fontes do sistema (texto desenhado via Canvas2D). */
import { $class } from "../as3";

export class Font {
  $name = "Arial";
  fontStyle = "regular";
  fontType = "device";
  get fontName(): string { return this.$name; }
  hasGlyphs(_s: string): boolean { return true; }
  static enumerateFonts(_device = false): Font[] { return []; }
  static registerFont(_f: any): void {}
}
$class(Font, "flash.text.Font");
