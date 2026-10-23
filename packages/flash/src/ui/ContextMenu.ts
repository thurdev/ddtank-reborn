/** `flash.ui.ContextMenu` — menu do botão direito (desligado no jogo). */
import { $class } from "../as3";
import { EventDispatcher } from "../events/EventDispatcher";

export class ContextMenu extends EventDispatcher {
  customItems: any[] = [];
  builtInItems: any = {};
  clipboardMenu = false;
  clipboardItems: any = {};
  link: any = null;
  static get isSupported(): boolean { return false; }
  hideBuiltInItems(): void {}
  clone(): ContextMenu { const c = new ContextMenu(); c.customItems = this.customItems.slice(); return c; }
}
$class(ContextMenu, "flash.ui.ContextMenu");
