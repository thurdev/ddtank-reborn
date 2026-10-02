import { Physics } from "../phy/physics.js";
import type { DropItem } from "./events.js";

/**
 * Port of `Phy/Object/Box.cs`: a drop box (type 1, carries an item from the Box drop table) or a ghost box (type 2/3,
 * psychic for dead players). Picked by a bomb of a player (CollidedByObject → Living.PickBox) or by a moving ghost.
 */
export class Box extends Physics {
  userId = 0;
  constructor(id: number, readonly type: number, readonly item: DropItem | null, private readonly onCollide: (box: Box, phy: Physics) => void) {
    super(id);
    this.bound = { x: -15, y: -15, width: 30, height: 30 };
  }
  get isGhost(): boolean {
    return this.type > 1;
  }
  place(x: number, y: number): void {
    this._x = x;
    this._y = y;
  }
  override collidedByObject(phy: Physics): void {
    this.onCollide(this, phy);
  }
}
