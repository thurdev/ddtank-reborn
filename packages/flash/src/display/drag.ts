/**
 * `startDrag`/`stopDrag` — um objeto arrastado por vez, segue o mouse
 * (Player chama `Drag.move` a cada movimento).
 */
import { Point } from "../geom/Point";
import type { Rectangle } from "../geom/Rectangle";

interface DragState {
  obj: any;
  offX: number;
  offY: number;
  bounds: Rectangle | null;
}

let state: DragState | null = null;

export const Drag = {
  dropTarget: null as any,

  start(obj: any, lockCenter: boolean, bounds: Rectangle | null): void {
    const parent = obj.$parent;
    const mouse = parent ? parent.globalToLocal(new Point(Player.mouseX, Player.mouseY)) : new Point(Player.mouseX, Player.mouseY);
    state = {
      obj,
      offX: lockCenter ? 0 : obj.x - mouse.x,
      offY: lockCenter ? 0 : obj.y - mouse.y,
      bounds: bounds ? bounds.clone() : null,
    };
  },

  stop(obj: any): void {
    if (state && (state.obj === obj || !obj)) state = null;
  },

  /** chamado pelo Player quando o mouse anda */
  move(gx: number, gy: number): void {
    if (!state) return;
    const { obj, bounds } = state;
    const parent = obj.$parent;
    const p = parent ? parent.globalToLocal(new Point(gx, gy)) : new Point(gx, gy);
    let x = p.x + state.offX;
    let y = p.y + state.offY;
    if (bounds) {
      x = Math.max(bounds.x, Math.min(bounds.x + bounds.width, x));
      y = Math.max(bounds.y, Math.min(bounds.y + bounds.height, y));
    }
    obj.x = x;
    obj.y = y;
  },

  get active(): boolean { return !!state; },
};

/** posição global do mouse (Player atualiza) */
import { Player } from "./DisplayObject";
