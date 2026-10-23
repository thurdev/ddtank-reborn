/** `flash.events.MouseEvent` */
import { $class } from "../as3";
import { Event } from "./Event";

export class MouseEvent extends Event {
  static readonly CLICK = "click";
  static readonly DOUBLE_CLICK = "doubleClick";
  static readonly MOUSE_DOWN = "mouseDown";
  static readonly MOUSE_MOVE = "mouseMove";
  static readonly MOUSE_OUT = "mouseOut";
  static readonly MOUSE_OVER = "mouseOver";
  static readonly MOUSE_UP = "mouseUp";
  static readonly RELEASE_OUTSIDE = "releaseOutside";
  static readonly MOUSE_WHEEL = "mouseWheel";
  static readonly ROLL_OUT = "rollOut";
  static readonly ROLL_OVER = "rollOver";
  static readonly MIDDLE_CLICK = "middleClick";
  static readonly MIDDLE_MOUSE_DOWN = "middleMouseDown";
  static readonly MIDDLE_MOUSE_UP = "middleMouseUp";
  static readonly RIGHT_CLICK = "rightClick";
  static readonly RIGHT_MOUSE_DOWN = "rightMouseDown";
  static readonly RIGHT_MOUSE_UP = "rightMouseUp";
  static readonly CONTEXT_MENU = "contextMenu";
  /** posição no palco (preenchida pelo gerenciador de mouse) */
  $stageX = 0;
  $stageY = 0;

  localX: number;
  localY: number;
  relatedObject: any;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  buttonDown: boolean;
  delta: number;
  constructor(type: string, bubbles = false, cancelable = false, localX: number = 0, localY: number = 0, relatedObject: any = null, ctrlKey: boolean = false, altKey: boolean = false, shiftKey: boolean = false, buttonDown: boolean = false, delta: number = 0) {
    super(type, bubbles, cancelable);
    this.localX = localX;
    this.localY = localY;
    this.relatedObject = relatedObject;
    this.ctrlKey = ctrlKey;
    this.altKey = altKey;
    this.shiftKey = shiftKey;
    this.buttonDown = buttonDown;
    this.delta = delta;
  }
  clone(): MouseEvent {
    return new MouseEvent(this.type, this.bubbles, this.cancelable, this.localX, this.localY, this.relatedObject, this.ctrlKey, this.altKey, this.shiftKey, this.buttonDown, this.delta);
  }
  get stageX(): number { return this.$stageX; }
  get stageY(): number { return this.$stageY; }
  get isRelatedObjectInaccessible(): boolean { return false; }
  updateAfterEvent(): void {}
}
$class(MouseEvent, "flash.events.MouseEvent");
