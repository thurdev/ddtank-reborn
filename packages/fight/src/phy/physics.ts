import { type Point, type Rect, offset, rect } from "./rect.js";
import type { GameMap } from "./map.js";

/** Port of `Game.Logic/Phy/Object/Physics.cs`. */
export class Physics {
  readonly id: number;
  isLiving = true;
  isMoving = false;
  map: GameMap | null = null;
  /** body rect relative to (x,y) — `Bound` */
  bound: Rect = rect(-5, -5, 10, 10);
  /** secondary rect — `Bound1` (`m_rectBomb`) */
  bound1: Rect = rect(0, 0, 0, 0);
  protected _x = 0;
  protected _y = 0;

  constructor(id: number) {
    this.id = id;
  }

  get x(): number {
    return this._x;
  }
  get y(): number {
    return this._y;
  }

  /** Called when a bomb's swept rect touches this body (Physics.cs:118). */
  collidedByObject(_phy: Physics): void {}

  die(): void {
    this.stopMoving();
    this.isLiving = false;
  }

  dispose(): void {
    this.map?.removePhysical(this);
  }

  distance(x: number, y: number): number {
    return Math.sqrt((this._x - x) * (this._x - x) + (this._y - y) * (this._y - y));
  }

  getCollidePoint(): Point {
    return { x: this.x, y: this.y };
  }

  prepareNewTurn(): void {}

  setMap(map: GameMap | null): void {
    this.map = map;
  }

  setRect(x: number, y: number, width: number, height: number): void {
    this.bound = rect(x, y, width, height);
  }

  setRectBomb(x: number, y: number, width: number, height: number): void {
    this.bound1 = rect(x, y, width, height);
  }

  setXY(x: number, y: number): void {
    this._x = x;
    this._y = y;
  }

  startMoving(): void {
    if (this.map) this.isMoving = true;
  }

  stopMoving(): void {
    this.isMoving = false;
  }

  /** absolute bound rect */
  absBound(): Rect {
    return offset(this.bound, this._x, this._y);
  }
}

/**
 * Minimal living contract the map/bomb layer needs (`Living` members used by `Map.cs` and `SimpleBomb.cs`).
 * The full `Living` class lives in `game/living.ts`.
 */
export abstract class LivingBody extends Physics {
  team = 0;
  direction = 1;
  isHelper = false;
  /** player vs NPC/boss; used by the homing ball (boss → damage rect) and Map.FindPlayers */
  kind: "player" | "npc" | "boss" = "player";
  /** relative damage rect (`m_demageRect`), default empty → damage distance is measured to (X,Y) */
  demageRect: Rect = rect(0, 0, 0, 0);

  getDirectDemageRect(): Rect {
    return offset(this.demageRect, this.x, this.y);
  }

  getDirectBoundRects(): Rect[] {
    return [offset(this.bound, this.x, this.y)];
  }

  /** `Living.BoundDistance` (Living.cs:778-795): min distance from `p` to the bound edges sampled every 10 px. */
  boundDistance(p: Point): number {
    let min = Infinity;
    for (const r of this.getDirectBoundRects()) min = Math.min(min, edgeDistance(r, p));
    return min;
  }

  /** `Living.Distance(Point)` (Living.cs:921-936): same sampling on the damage rect. */
  damageDistance(p: Point): number {
    return edgeDistance(this.getDirectDemageRect(), p);
  }
}

function edgeDistance(r: Rect, p: Point): number {
  let min = Infinity;
  for (let i = r.x; i <= r.x + r.width; i += 10) {
    min = Math.min(min, Math.sqrt((i - p.x) * (i - p.x) + (r.y - p.y) * (r.y - p.y)));
    min = Math.min(min, Math.sqrt((i - p.x) * (i - p.x) + (r.y + r.height - p.y) * (r.y + r.height - p.y)));
  }
  for (let j = r.y; j <= r.y + r.height; j += 10) {
    min = Math.min(min, Math.sqrt((r.x - p.x) * (r.x - p.x) + (j - p.y) * (j - p.y)));
    min = Math.min(min, Math.sqrt((r.x + r.width - p.x) * (r.x + r.width - p.x) + (j - p.y) * (j - p.y)));
  }
  return min;
}

/**
 * Insertion-ordered set that reproduces .NET `HashSet<T>` enumeration order: removed slots go on a LIFO free list and
 * are reused by the next `Add`, so a new object can be enumerated *before* older ones (same as the C# `Map.hashSet_0`).
 */
export class PhysicsSet<T> implements Iterable<T> {
  private slots: (T | undefined)[] = [];
  private free: number[] = [];
  private index = new Map<T, number>();

  add(v: T): boolean {
    if (this.index.has(v)) return false;
    const i = this.free.length ? this.free.pop()! : this.slots.length;
    this.slots[i] = v;
    this.index.set(v, i);
    return true;
  }

  delete(v: T): boolean {
    const i = this.index.get(v);
    if (i === undefined) return false;
    this.slots[i] = undefined;
    this.index.delete(v);
    this.free.push(i);
    if (this.index.size === 0) {
      // .NET Framework HashSet.Remove resets m_lastIndex/m_freeList when the set becomes empty
      this.slots = [];
      this.free = [];
    }
    return true;
  }

  has(v: T): boolean {
    return this.index.has(v);
  }

  get size(): number {
    return this.index.size;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (const v of this.slots.slice()) if (v !== undefined) yield v;
  }
}
