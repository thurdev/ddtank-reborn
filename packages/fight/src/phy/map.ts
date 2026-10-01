import { f32 } from "../math/num.js";
import { LivingBody, Physics, PhysicsSet } from "./physics.js";
import { EMPTY_POINT, type Point, type Rect, intersectsWith, offset, rect } from "./rect.js";
import type { Tile } from "./tile.js";

/** Subset of `SqlDataProvider.Data.MapInfo` (DB table `Game_Map`) the engine needs. */
export interface MapInfo {
  id: number;
  name?: string;
  /** gravity (`Map.gravity`) */
  weight: number;
  /** air resistance (`Map.airResistance`) */
  dragIndex: number;
  /** team spawn points `"x,y|x,y|..."` */
  posX?: string;
  posX1?: string;
  /** eMapType bits: Normal 1, PairUp 2, Arena 4, Duplicate 8 */
  type?: number;
  foregroundWidth?: number;
  foregroundHeight?: number;
}

/** Port of `Game.Logic/Phy/Maps/Map.cs` (two terrain layers + the physics set). */
export class GameMap {
  readonly info: MapInfo;
  readonly ground: Tile | null;
  readonly deadTile: Tile | null;
  readonly bound: Rect;
  readonly physics = new PhysicsSet<Physics>();
  private _wind = 0;

  constructor(info: MapInfo, layer1: Tile | null, layer2: Tile | null) {
    this.info = info;
    this.ground = layer1;
    this.deadTile = layer2;
    const t = (layer1 ?? layer2)!;
    this.bound = rect(0, 0, t.width, t.height);
  }

  /** float wind (-5.0..5.0) */
  get wind(): number {
    return this._wind;
  }
  set wind(v: number) {
    this._wind = f32(v);
  }
  get gravity(): number {
    return this.info.weight;
  }
  get airResistance(): number {
    return this.info.dragIndex;
  }

  clone(): GameMap {
    return new GameMap(this.info, this.ground?.clone() ?? null, this.deadTile?.clone() ?? null);
  }

  dig(cx: number, cy: number, surface: Tile | null, border?: Tile | null): void {
    this.ground?.dig(cx, cy, surface, border);
    this.deadTile?.dig(cx, cy, surface, border);
  }

  isEmpty(x: number, y: number): boolean {
    if (this.ground && !this.ground.isEmpty(x, y)) return false;
    if (this.deadTile) return this.deadTile.isEmpty(x, y);
    return true;
  }

  isRectangleEmpty(r: Rect): boolean {
    if (this.ground && !this.ground.isRectangleEmptyQuick(r)) return false;
    if (this.deadTile) return this.deadTile.isRectangleEmptyQuick(r);
    return true;
  }

  /** Map.cs:101. Returns `Point.Empty` (0,0) when nothing found. Note: tests x-1 and x+1, not x. */
  findYLineNotEmptyPointDown(x: number, y: number, h: number = this.bound.height): Point {
    const b = this.bound;
    x = x >= 0 ? (x >= b.width ? b.width - 1 : x) : 0;
    y = y >= 0 ? y : 0;
    h = y + h >= b.height ? b.height - y - 1 : h;
    for (let n = 0; n < h; n++) {
      if (!this.isEmpty(x - 1, y) || !this.isEmpty(x + 1, y)) return { x, y };
      y++;
    }
    return { ...EMPTY_POINT };
  }

  findYLineNotEmptyPointUp(x: number, y: number, h: number): Point {
    const b = this.bound;
    x = x >= 0 ? (x >= b.width ? b.width : x) : 0;
    y = y >= 0 ? y : 0;
    h = y + h >= b.height ? b.height - y : h;
    for (let n = 0; n < h; n++) {
      if (!this.isEmpty(x - 1, y) || !this.isEmpty(x + 1, y)) return { x, y };
      y--;
    }
    return { ...EMPTY_POINT };
  }

  /** Map.cs:148-165 — note the original passes `_bound.Width` as the search height. */
  findNextWalkPoint(x: number, y: number, direction: number, stepX: number, stepY: number): Point {
    if (direction !== 1 && direction !== -1) return { ...EMPTY_POINT };
    const x2 = x + direction * stepX;
    if (x2 < 0 || x2 > this.bound.width) return { ...EMPTY_POINT };
    const p = this.findYLineNotEmptyPointDown(x2, y - stepY - 1, this.bound.width);
    if (!(p.x === 0 && p.y === 0) && Math.abs(p.y - y) > stepY) return { ...EMPTY_POINT };
    return p;
  }

  canMove(x: number, y: number): boolean {
    return this.isEmpty(x, y) && !this.isOutMap(x, y);
  }

  /** Map.cs:280 — flying above the top is allowed. */
  isOutMap(x: number, y: number): boolean {
    if (x >= this.bound.x && x <= this.bound.width) return y > this.bound.height;
    return true;
  }

  addPhysical(phy: Physics): void {
    phy.setMap(this);
    this.physics.add(phy);
  }

  removePhysical(phy: Physics): void {
    phy.setMap(null);
    this.physics.delete(phy);
  }

  findPhysicalObjects(r: Rect, except: Physics | null): Physics[] {
    const out: Physics[] = [];
    for (const p of this.physics) {
      if (p.isLiving && p !== except) {
        if (intersectsWith(offset(p.bound, p.x, p.y), r) || intersectsWith(offset(p.bound1, p.x, p.y), r)) out.push(p);
      }
    }
    return out;
  }

  livings(): LivingBody[] {
    const out: LivingBody[] = [];
    for (const p of this.physics) if (p instanceof LivingBody) out.push(p);
    return out;
  }

  /** Map.cs:480 — victims of an explosion. */
  findHitByHitPoint(p: Point, radius: number): LivingBody[] {
    return this.livings().filter((l) => l.isLiving && l.boundDistance(p) < radius);
  }

  /** Map.cs `FindPlayers(Point, radius)`: true when ≥ 2 living players are within radius (cure split). */
  findPlayersCount2(p: Point, radius: number): boolean {
    let n = 0;
    for (const l of this.livings()) {
      if (l.kind === "player" && l.isLiving && l.boundDistance(p) < radius) n++;
      if (n >= 2) return true;
    }
    return false;
  }

  findNearestEnemy(x: number, y: number, maxDistance: number, except: LivingBody): LivingBody | null {
    let best: LivingBody | null = null;
    for (const l of this.livings()) {
      if (l !== except && l.isLiving && l.team !== except.team) {
        const d = l.distance(x, y);
        if (d < maxDistance) {
          best = l;
          maxDistance = d;
        }
      }
    }
    return best;
  }
}
