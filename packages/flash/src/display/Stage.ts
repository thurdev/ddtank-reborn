/**
 * `flash.display.Stage` — raiz da display list. Tamanho lógico fixo
 * (1000x600 no DDTank); o canvas é esticado pra caber na janela pelo Player.
 */
import { $class } from "../as3";
import { Event } from "../events/Event";
import { FocusEvent } from "../events/FocusEvent";
import { Rectangle } from "../geom/Rectangle";
import { DisplayObjectContainer } from "./DisplayObjectContainer";
import { Player } from "./DisplayObject";

export class Stage extends DisplayObjectContainer {
  $isStage = true;
  $stageWidth: number;
  $stageHeight: number;
  $frameRate = 25;
  $focus: any = null;
  $quality = "high";
  $displayState = "normal";
  $invalidated = false;
  $fullscreenHost: HTMLElement | null = null;
  scaleMode = "noScale";
  align = "TL";
  showDefaultContextMenu = false;
  stageFocusRect = false;
  colorCorrection = "default";
  mouseLock = false;
  color = 0;
  fullScreenSourceRect: Rectangle | null = null;
  /** chamado quando frameRate muda (Player reprograma o loop) */
  $onFrameRate?: (fps: number) => void;

  constructor(width = 1000, height = 600) {
    super();
    this.$stageWidth = width;
    this.$stageHeight = height;
    this.$stage = this;
    this.$name = "stage";
  }

  get stage(): Stage { return this; }
  get stageWidth(): number { return this.$stageWidth; }
  set stageWidth(_v: number) {}
  get stageHeight(): number { return this.$stageHeight; }
  set stageHeight(_v: number) {}
  get fullScreenWidth(): number { return typeof screen !== "undefined" ? screen.width : this.$stageWidth; }
  get fullScreenHeight(): number { return typeof screen !== "undefined" ? screen.height : this.$stageHeight; }
  get frameRate(): number { return this.$frameRate; }
  set frameRate(v: number) {
    this.$frameRate = Math.max(0.01, Math.min(1000, Number(v)));
    this.$onFrameRate?.(this.$frameRate);
  }
  get quality(): string { return this.$quality; }
  set quality(v: string) { this.$quality = String(v).toLowerCase(); }
  get displayState(): string { return this.$displayState; }
  set displayState(v: string) {
    this.$displayState = v;
    if (typeof document === "undefined") return;
    if (v === "normal") { if (document.fullscreenElement) void document.exitFullscreen(); }
    else void (this.$fullscreenHost ?? document.documentElement).requestFullscreen?.();
  }
  get allowsFullScreen(): boolean { return true; }
  get allowsFullScreenInteractive(): boolean { return true; }
  get contentsScaleFactor(): number { return typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1; }
  get wmodeGPU(): boolean { return true; }
  get stage3Ds(): any[] { return []; }
  get stageVideos(): any[] { return []; }
  get softKeyboardRect(): Rectangle { return new Rectangle(); }
  get colorCorrectionSupport(): string { return "unsupported"; }

  /** objeto com foco do teclado */
  get focus(): any { return this.$focus; }
  set focus(v: any) {
    if (v === this.$focus) return;
    const old = this.$focus;
    this.$focus = v;
    if (old) {
      old.$setEditing?.(false);
      old.dispatchEvent(new FocusEvent(FocusEvent.FOCUS_OUT, true, false, v));
    }
    if (v) {
      v.$setEditing?.(true);
      v.dispatchEvent(new FocusEvent(FocusEvent.FOCUS_IN, true, false, old));
    }
  }

  get mouseX(): number { return Player.mouseX; }
  get mouseY(): number { return Player.mouseY; }

  /** pede o evento RENDER antes do próximo desenho */
  invalidate(): void { this.$invalidated = true; }
  $dispatchRender(): void {
    if (!this.$invalidated) return;
    this.$invalidated = false;
    const walk = (o: any) => {
      if (o.hasEventListener?.(Event.RENDER)) o.dispatchEvent(new Event(Event.RENDER));
      for (const c of o.$children ?? []) walk(c);
    };
    walk(this);
  }

  // o palco não tem transform próprio
  set x(_v: number) {}
  get x(): number { return 0; }
  set y(_v: number) {}
  get y(): number { return 0; }
  get width(): number { return this.$stageWidth; }
  set width(_v: number) {}
  get height(): number { return this.$stageHeight; }
  set height(_v: number) {}

  assignFocus(o: any, _dir: string): void { this.focus = o; }
  isFocusInaccessible(): boolean { return false; }
  setAspectRatio(_r: string): void {}
  setOrientation(_o: string): void {}
}
$class(Stage, "flash.display.Stage");
