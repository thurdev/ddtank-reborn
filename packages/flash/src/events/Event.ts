/**
 * `flash.events.Event` — base de todos os eventos.
 * Fases: captura (stage → pai), alvo, bolha (pai → stage) — igual ao Flash.
 */
import { $class } from "../as3";

export class Event {
  static readonly ACTIVATE = "activate";
  static readonly ADDED = "added";
  static readonly ADDED_TO_STAGE = "addedToStage";
  static readonly BROWSER_ZOOM_CHANGE = "browserZoomChange";
  static readonly CANCEL = "cancel";
  static readonly CHANGE = "change";
  static readonly CLEAR = "clear";
  static readonly CLOSE = "close";
  static readonly COMPLETE = "complete";
  static readonly CONNECT = "connect";
  static readonly COPY = "copy";
  static readonly CUT = "cut";
  static readonly DEACTIVATE = "deactivate";
  static readonly ENTER_FRAME = "enterFrame";
  static readonly FRAME_CONSTRUCTED = "frameConstructed";
  static readonly EXIT_FRAME = "exitFrame";
  static readonly FRAME_LABEL = "frameLabel";
  static readonly ID3 = "id3";
  static readonly INIT = "init";
  static readonly MOUSE_LEAVE = "mouseLeave";
  static readonly OPEN = "open";
  static readonly PASTE = "paste";
  static readonly REMOVED = "removed";
  static readonly REMOVED_FROM_STAGE = "removedFromStage";
  static readonly RENDER = "render";
  static readonly RESIZE = "resize";
  static readonly SCROLL = "scroll";
  static readonly TEXT_INTERACTION_MODE_CHANGE = "textInteractionModeChange";
  static readonly SELECT = "select";
  static readonly SELECT_ALL = "selectAll";
  static readonly SOUND_COMPLETE = "soundComplete";
  static readonly TAB_CHILDREN_CHANGE = "tabChildrenChange";
  static readonly TAB_ENABLED_CHANGE = "tabEnabledChange";
  static readonly TAB_INDEX_CHANGE = "tabIndexChange";
  static readonly UNLOAD = "unload";
  static readonly FULLSCREEN = "fullScreen";

  /** campos internos (prefixo $ pra não colidir com subclasses do jogo) */
  $type: string;
  $bubbles: boolean;
  $cancelable: boolean;
  $target: any = null;
  $currentTarget: any = null;
  $phase = 0;
  /** 1 = stopPropagation, 2 = stopImmediatePropagation */
  $stop = 0;
  $prevented = false;

  constructor(type: string, bubbles = false, cancelable = false) {
    this.$type = type;
    this.$bubbles = bubbles;
    this.$cancelable = cancelable;
  }

  get type(): string { return this.$type; }
  get bubbles(): boolean { return this.$bubbles; }
  get cancelable(): boolean { return this.$cancelable; }
  get target(): any { return this.$target; }
  get currentTarget(): any { return this.$currentTarget; }
  /** 1 captura, 2 alvo, 3 bolha */
  get eventPhase(): number { return this.$phase; }

  clone(): Event { return new Event(this.$type, this.$bubbles, this.$cancelable); }
  stopPropagation(): void { if (this.$stop < 1) this.$stop = 1; }
  stopImmediatePropagation(): void { this.$stop = 2; }
  preventDefault(): void { if (this.$cancelable) this.$prevented = true; }
  isDefaultPrevented(): boolean { return this.$prevented; }
  formatToString(className: string, ...args: string[]): string {
    return `[${className}${args.map((a) => ` ${a}=${JSON.stringify((this as any)[a])}`).join("")}]`;
  }
  toString(): string { return this.formatToString("Event", "type", "bubbles", "cancelable", "eventPhase"); }
}
$class(Event, "flash.events.Event");
