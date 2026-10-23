/** `flash.ui.Mouse` — esconder/mostrar cursor do sistema (o jogo desenha cursor próprio às vezes). */
import { $class } from "../as3";
import { MouseState } from "./mouse-state";

export class Mouse {
  static get supportsCursor(): boolean { return true; }
  static get supportsNativeCursor(): boolean { return true; }
  static get cursor(): string { return MouseState.cursor; }
  static set cursor(v: string) { MouseState.cursor = v; }
  static hide(): void {
    MouseState.hidden = true;
    for (const c of document.querySelectorAll("canvas")) (c as HTMLCanvasElement).style.cursor = "none";
  }
  static show(): void {
    MouseState.hidden = false;
    for (const c of document.querySelectorAll("canvas")) (c as HTMLCanvasElement).style.cursor = "default";
  }
  static registerCursor(_name: string, _data: any): void {}
  static unregisterCursor(_name: string): void {}
}
$class(Mouse, "flash.ui.Mouse");
