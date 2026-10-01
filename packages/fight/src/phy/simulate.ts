import { type BallInfo, ActionType, getBallType } from "../data/types.js";
import { BombAction, type BombHost, SimpleBomb, initialVelocity } from "./bomb.js";
import type { GameMap } from "./map.js";
import { LivingBody, type Physics } from "./physics.js";
import type { Tile } from "./tile.js";

/** A dummy owner for stand-alone simulations (not added to the map). */
class GhostOwner extends LivingBody {}

export interface SimulateOptions {
  map: GameMap;
  ball: BallInfo;
  /** crater shape (`bomb/{id}.bomb`), null = no dig */
  shape?: Tile | null;
  /** muzzle point */
  x: number;
  y: number;
  /** either force/angle (+ bomb index for triple shot) or raw vx/vy */
  force?: number;
  angle?: number;
  bombIndex?: number;
  vx?: number;
  vy?: number;
  /** owner living (team for the homing ball, excluded from collisions) */
  owner?: LivingBody;
  /** homing ball (prop "guided") */
  controlled?: boolean;
  /** apply the crater to `map` (default false: pure prediction) */
  dig?: boolean;
  /** record every integration point (for drawing / aiming) */
  recordPath?: boolean;
  /** custom explosion handler (defaults to: dig + BOMB action) */
  bombImp?: (bomb: SimpleBomb) => void;
  id?: number;
}

export interface SimulateResult {
  /** final position (impact point, or where it left the map) */
  x: number;
  y: number;
  lifeTime: number;
  outcome: "bomb" | "flyout";
  actions: BombAction[];
  tempPoints: { x: number; y: number }[];
  /** physicals touched by the swept rect (bodies hit), in order */
  hits: Physics[];
  path?: { x: number; y: number }[];
  vx: number;
  vy: number;
  digMap: boolean;
}

/**
 * Runs one projectile exactly like `Living.ShootImp` → `SimpleBomb.StartMoving` (Euler dt 0.04 s, float32, swept 3 px
 * collision against bodies in `map.physics` then terrain then map bounds). The bomb is removed from the map afterwards.
 */
export function simulateShot(o: SimulateOptions): SimulateResult {
  const tempPoints: { x: number; y: number }[] = [];
  const hits: Physics[] = [];
  const path: { x: number; y: number }[] | undefined = o.recordPath ? [] : undefined;
  let outcome: "bomb" | "flyout" = "flyout";
  const host: BombHost = {
    addTempPoint: (x, y) => tempPoints.push({ x, y }),
    onPick: (_b, p) => hits.push(p),
    bombImp: (b) => {
      outcome = "bomb";
      if (o.bombImp) return o.bombImp(b);
      if (b.digMap && o.dig) o.map.dig(b.x, b.y, b.shape, null);
      b.actions.push(new BombAction(b.lifeTime, ActionType.BOMB, b.x, b.y, b.digMap ? 1 : 0, 0));
      b.die();
    },
  };
  const owner = o.owner ?? new GhostOwner(-1);
  let vx = o.vx ?? 0;
  let vy = o.vy ?? 0;
  if (o.force !== undefined && o.angle !== undefined) ({ vx, vy } = initialVelocity(o.force, o.angle, o.bombIndex ?? 0));
  const bomb = new TracingBomb(o.id ?? -1000, getBallType(o.ball.id), owner, host, o.ball, o.shape ?? null, !!o.controlled, o.angle ?? 0, path);
  bomb.setXY(o.x, o.y);
  bomb.setSpeedXY(vx, vy);
  o.map.addPhysical(bomb);
  try {
    bomb.startMoving();
  } finally {
    o.map.removePhysical(bomb);
  }
  return { x: bomb.x, y: bomb.y, lifeTime: bomb.lifeTime, outcome, actions: bomb.actions, tempPoints, hits, path, vx, vy, digMap: bomb.digMap };
}

class TracingBomb extends SimpleBomb {
  constructor(...args: [...ConstructorParameters<typeof SimpleBomb>, { x: number; y: number }[] | undefined]) {
    const path = args.pop() as { x: number; y: number }[] | undefined;
    super(...(args as unknown as ConstructorParameters<typeof SimpleBomb>));
    this.path = path;
  }
  private path?: { x: number; y: number }[];
  override moveTo(px: number, py: number): void {
    super.moveTo(px, py);
    this.path?.push({ x: this.x, y: this.y });
  }
}
