import { type BallInfo, type BombType, ActionType, isSpecialBall } from "../data/types.js";
import { f32, idiv, int, roundEven } from "../math/num.js";
import type { GameMap } from "./map.js";
import { LivingBody, Physics } from "./physics.js";
import { type Point, offset } from "./rect.js";
import type { Tile } from "./tile.js";

/** `Phy/Maths/EulerVector.cs` — all float32. */
export class EulerVector {
  x0: number;
  x1: number;
  x2: number;
  constructor(x0: number, x1: number, x2: number) {
    this.x0 = f32(x0);
    this.x1 = f32(x1);
    this.x2 = f32(x2);
  }
  /** `ComputeOneEulerStep(m, af, f, dt)`: a = (f − af·v)/m ; v += a·dt ; x += v·dt */
  step(m: number, af: number, f: number, dt: number): void {
    this.x2 = f32(f32(f - f32(af * this.x1)) / m);
    this.x1 = f32(this.x1 + f32(this.x2 * dt));
    this.x0 = f32(this.x0 + f32(this.x1 * dt));
  }
}

/** `Phy/Actions/BombAction.cs`. */
export class BombAction {
  readonly time: number;
  constructor(
    time: number,
    readonly type: number,
    readonly param1: number,
    readonly param2: number,
    readonly param3: number,
    readonly param4: number,
  ) {
    this.time = f32(time);
  }
  /** `(int)Math.Round(Time * 1000f)` */
  get timeInt(): number {
    return int(roundEven(f32(this.time * 1000)));
  }
  toJSON(): { timeInt: number; type: number; param1: number; param2: number; param3: number; param4: number } {
    return { timeInt: this.timeInt, type: this.type, param1: this.param1, param2: this.param2, param3: this.param3, param4: this.param4 };
  }
}

/** Port of `Phy/Object/BombObject.cs` (forces + swept collision). */
export class BombObject extends Physics {
  protected airResistFactor: number;
  protected gravityFactor: number;
  protected windFactor: number;
  protected mass: number;
  protected arf = 0;
  protected gf = 0;
  protected wf = 0;
  protected vx = new EulerVector(0, 0, 0);
  protected vy = new EulerVector(0, 0, 0);

  constructor(id: number, mass: number, gravityFactor: number, windFactor: number, airResistFactor: number) {
    super(id);
    this.mass = f32(mass);
    this.gravityFactor = f32(gravityFactor);
    this.windFactor = f32(windFactor);
    this.airResistFactor = f32(airResistFactor);
    this.bound = { x: -3, y: -3, width: 6, height: 6 };
  }

  get vX(): number {
    return this.vx.x1;
  }
  get vY(): number {
    return this.vy.x1;
  }
  get forces(): { arf: number; gf: number; wf: number } {
    return { arf: this.arf, gf: this.gf, wf: this.wf };
  }

  protected collideGround(): void {
    this.stopMoving();
  }
  protected collideObjects(_list: Physics[]): void {}
  protected flyoutMap(): void {
    this.stopMoving();
    if (this.isLiving) this.die();
  }

  protected completeNextMovePoint(dt: number): Point {
    this.vx.step(this.mass, this.arf, this.wf, dt);
    this.vy.step(this.mass, this.arf, this.gf, dt);
    return { x: int(this.vx.x0), y: int(this.vy.x0) };
  }

  /** BombObject.cs:93-144 — walks the segment along the major axis in 3 px steps. */
  moveTo(px: number, py: number): void {
    if (px === this._x && py === this._y) return;
    const map = this.map!;
    const dx = px - this._x;
    const dy = py - this._y;
    let byX: boolean;
    let len: number;
    let dir: number;
    if (Math.abs(dx) > Math.abs(dy)) {
      byX = true;
      len = Math.abs(dx);
      dir = idiv(dx, len);
    } else {
      byX = false;
      len = Math.abs(dy);
      dir = idiv(dy, len);
    }
    const x1 = this._x;
    const y1 = this._y;
    for (let i = 1; i <= len; i += 3) {
      let p: Point;
      if (byX) {
        const x = x1 + i * dir;
        p = px === x1 ? { x, y: y1 } : { x, y: idiv((x - x1) * (py - y1), px - x1) + y1 };
      } else {
        const y = y1 + i * dir;
        p = py === y1 ? { x: x1, y } : { x: idiv((y - y1) * (px - x1), py - y1) + x1, y };
      }
      const r = offset(this.bound, p.x, p.y);
      const list = map.findPhysicalObjects(r, this);
      if (list.length !== 0) {
        super.setXY(p.x, p.y);
        this.collideObjects(list);
      } else if (!map.isRectangleEmpty(r)) {
        super.setXY(p.x, p.y);
        this.collideGround();
      } else if (map.isOutMap(p.x, p.y)) {
        super.setXY(p.x, p.y);
        this.flyoutMap();
      }
      if (!this.isLiving || !this.isMoving) return;
    }
    super.setXY(px, py);
  }

  override setMap(map: GameMap | null): void {
    super.setMap(map);
    this.updateAGW();
  }

  setSpeedXY(vx: number, vy: number): void {
    this.vx.x1 = f32(vx);
    this.vy.x1 = f32(vy);
  }

  /** NB: `MoveTo` calls `base.SetXY` (Physics) — the Euler state is only reset by this override. */
  override setXY(x: number, y: number): void {
    super.setXY(x, y);
    this.vx.x0 = f32(x);
    this.vy.x0 = f32(y);
  }

  private updateAGW(): void {
    const m = this.map;
    if (m) {
      this.arf = f32(f32(m.airResistance) * this.airResistFactor);
      this.gf = f32(f32(f32(m.gravity) * this.gravityFactor) * this.mass);
      this.wf = f32(m.wind * this.windFactor);
    }
  }

  protected updateForceFactor(air: number, gravity: number, wind: number): void {
    this.airResistFactor = f32(air);
    this.gravityFactor = f32(gravity);
    this.windFactor = f32(wind);
    this.updateAGW();
  }
}

/** What the bomb needs from the game while flying (`BaseGame.AddTempPoint`, `SimpleBomb.BombImp`). */
export interface BombHost {
  addTempPoint?(x: number, y: number): void;
  /** Explosion handler (`SimpleBomb.BombImp`). Must call `bomb.die()` at the end, like the original. */
  bombImp(bomb: SimpleBomb): void;
  /** `PickBox` / `PickBall` etc. — called for non-living physicals the bomb passes through */
  onPick?(bomb: SimpleBomb, phy: Physics): void;
}

/** Safety cap (not in C#): a weightless ball with no wind could otherwise loop forever. 60 s of flight. */
export const MAX_FLIGHT_STEPS = 1500;

/** Port of `Phy/Object/SimpleBomb.cs` flight (`StartMoving`, `MoveTo` collision callbacks, `Bomb`). */
export class SimpleBomb extends BombObject {
  readonly info: BallInfo;
  readonly owner: LivingBody;
  readonly shape: Tile | null;
  readonly type: BombType;
  readonly angle: number;
  readonly host: BombHost;
  digMap: boolean;
  controlled: boolean;
  actions: BombAction[] = [];
  petActions: BombAction[] = [];
  lifeTime = 0;
  radius: number;
  power: number;
  petRadius = 80;
  /** when set, every post-step position is appended (not in C#; for drawing/aiming) */
  trace?: { x: number; y: number }[];
  private bombed = false;

  constructor(id: number, type: BombType, owner: LivingBody, host: BombHost, info: BallInfo, shape: Tile | null, controlled: boolean, angle: number) {
    super(id, info.mass, info.weight, info.wind, info.dragIndex);
    this.owner = owner;
    this.host = host;
    this.info = info;
    this.shape = shape;
    this.type = type;
    this.power = info.power;
    this.radius = info.radii;
    this.controlled = controlled;
    this.angle = Math.abs(angle);
    this.digMap = !isSpecialBall(info.id);
  }

  bomb(): void {
    this.stopMoving();
    this.isLiving = false;
    this.bombed = true;
  }

  protected override collideGround(): void {
    super.collideGround();
    this.bomb();
  }

  protected override collideObjects(list: Physics[]): void {
    for (const p of list) {
      p.collidedByObject(this);
      this.host.onPick?.(this, p);
      this.actions.push(new BombAction(this.lifeTime, ActionType.PICK, p.id, 0, 0, 0));
    }
  }

  protected override flyoutMap(): void {
    this.actions.push(new BombAction(this.lifeTime, ActionType.FLY_OUT, 0, 0, 0, 0));
    super.flyoutMap();
  }

  /** SimpleBomb.cs:550-596 — the whole flight is simulated synchronously. */
  override startMoving(): void {
    super.startMoving();
    this.actions = [];
    this.petActions = [];
    const map = this.map!;
    let steps = 0;
    while (this.isMoving && this.isLiving) {
      if (++steps > MAX_FLIGHT_STEPS) {
        this.flyoutMap();
        break;
      }
      this.lifeTime = f32(this.lifeTime + f32(0.04));
      const point = this.completeNextMovePoint(f32(0.04));
      this.moveTo(point.x, point.y);
      this.trace?.push({ x: this._x, y: this._y });
      if (this.isLiving) {
        if (roundEven(f32(this.lifeTime * 100)) % 40 === 0 && point.y > 0) this.host.addTempPoint?.(point.x, point.y);
        if (this.controlled && this.vY > 0) {
          const living = map.findNearestEnemy(this._x, this._y, 150, this.owner);
          if (living) {
            let p: Point;
            if (living.kind !== "boss") p = { x: living.x - this._x, y: living.y - this._y };
            else {
              const d = living.getDirectDemageRect();
              p = { x: d.x - this._x + 20, y: d.y + d.height - this._y };
            }
            p = normalizePoint(p, 1000);
            this.setSpeedXY(p.x, p.y);
            this.updateForceFactor(0, 0, 0);
            this.controlled = false;
            this.actions.push(new BombAction(this.lifeTime, ActionType.CHANGE_SPEED, p.x, p.y, 0, 0));
          }
        }
      }
      if (this.bombed) {
        this.bombed = false;
        this.host.bombImp(this);
      }
    }
  }
}

/** `PointHelper.Normalize(Point, int)`. */
export function normalizePoint(p: Point, len: number): Point {
  const n = Math.sqrt(p.x * p.x + p.y * p.y);
  return { x: int((p.x * len) / n), y: int((p.y * len) / n) };
}

/** `PointHelper.Normalize(PointF, float)` — float result. */
export function normalizePointF(x: number, y: number, len: number): { x: number; y: number } {
  const n = Math.sqrt(f32(f32(x * x) + f32(y * y)));
  return { x: f32(f32(x * len) / n), y: f32(f32(y * len) / n) };
}

/** Initial velocity of bomb `i` (Living.cs:1782-1802): (k, dAngle) = i==1 ? (0.9,−5) : i==2 ? (1.1,+5) : (1,0). */
export function initialVelocity(force: number, angle: number, i: number): { vx: number; vy: number } {
  const k = i === 2 ? 1.1 : i === 1 ? 0.9 : 1.0;
  const da = i === 2 ? 5 : i === 1 ? -5 : 0;
  return {
    vx: int(force * k * Math.cos(((angle + da) / 180.0) * Math.PI)),
    vy: int(force * k * Math.sin(((angle + da) / 180.0) * Math.PI)),
  };
}
