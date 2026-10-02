import { f32 } from "../math/num.js";
import { DotNetRandom, type Rng, gaussian } from "../math/random.js";
import type { FightCommand, FightEvent } from "../game/events.js";
import { type BaseGame, GameState } from "../game/game.js";
import { Player } from "../game/living.js";
import { solveAim } from "./aim.js";

/** Bot tuning (02-bots.md §2.3/2.4 `bot_profile` subset). */
export interface BotProfile {
  /** 0..100 (Easy 20, Normal 50, Hard 80, Expert 100) */
  difficulty: number;
  aimForceSigma?: number;
  aimAngleSigma?: number;
  windMisread?: number;
  useStuntPct?: number;
  allowedProps?: number[];
}

const lerp = (pts: [number, number][], d: number) => {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (d <= x1) return y0 + ((y1 - y0) * (d - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

/** Difficulty table of 02-bots.md §2.3, linearly interpolated. */
export function difficultyParams(p: BotProfile) {
  const d = Math.max(0, Math.min(100, p.difficulty));
  return {
    forceSigma: p.aimForceSigma ?? lerp([[0, 150], [20, 120], [50, 60], [80, 25], [100, 0]], d),
    angleSigma: p.aimAngleSigma ?? lerp([[0, 5], [20, 4], [50, 2], [80, 1], [100, 0]], d),
    windMisread: p.windMisread ?? lerp([[0, 0.6], [20, 0.5], [50, 0.25], [80, 0.1], [100, 0]], d),
    stuntPct: p.useStuntPct ?? lerp([[0, 20], [20, 30], [50, 70], [80, 100], [100, 100]], d),
    thinkMs: [lerp([[0, 3500], [20, 3000], [50, 2000], [80, 1500], [100, 1000]], d), lerp([[0, 6500], [20, 6000], [50, 4000], [80, 3000], [100, 2000]], d)] as const,
    props: d < 35 ? [0, 1] : d < 65 ? [1, 2] : [2, 3],
    target: d < 35 ? "random" : d < 65 ? "nearest" : "lowestHp",
  };
}

export interface PlannedAction {
  /** ms after the turn start */
  at: number;
  cmd: FightCommand;
}

/** Plans a whole bot turn (think → props → stunt → aim → FIRE_TAG → FIRE), using only public player commands. */
export function planBotTurn(game: BaseGame, bot: Player, profile: BotProfile, rng: Rng): PlannedAction[] {
  const P = difficultyParams(profile);
  const enemies = game.enemiesOf(bot);
  if (!enemies.length) return [{ at: 500, cmd: { cmd: "SKIPNEXT", spendTime: 1 } }];
  let target = enemies[rng.nextMax(enemies.length)];
  if (P.target === "nearest") target = enemies.reduce((a, b) => (Math.abs(a.x - bot.x) <= Math.abs(b.x - bot.x) ? a : b));
  else if (P.target === "lowestHp") target = enemies.reduce((a, b) => (a.blood <= b.blood ? a : b));

  const plan: PlannedAction[] = [];
  const think = P.thinkMs[0] + rng.nextMax(Math.max(1, P.thinkMs[1] - P.thinkMs[0]));
  const maxT = Math.max(1500, (game.timeType ? [0, 8, 10, 12, 16, 21, 31][game.timeType] ?? 10 : 10) * 1000 - 2500);
  const fireAt = Math.min(think, maxT);
  const dir = target.x >= bot.x ? 1 : -1;
  if (dir !== bot.direction) plan.push({ at: 200, cmd: { cmd: "DIRECTION", direction: dir } });

  let t = 600;
  let energy = bot.energy;
  if (bot.dander >= 200 && rng.nextMax(100) < P.stuntPct) plan.push({ at: (t += 400), cmd: { cmd: "STUNT" } });
  else {
    const n = P.props[0] + rng.nextMax(P.props[1] - P.props[0] + 1);
    const allowed = profile.allowedProps ?? [10001, 10003, 10004, 10008];
    const pick: number[] = [];
    // preferred combos (BotCommand.cs: 10001+10003+10004 / 10001+10004+10004)
    const order = [10004, 10001, 10003, 10008, 10002, 10005, 10006, 10007].filter((x) => allowed.includes(x));
    for (const id of order) {
      if (pick.length >= n) break;
      const it = game.assets.items.get(id);
      if (!it || it.property4 > energy) continue;
      if (id === 10003 && pick.includes(10001)) continue;
      pick.push(id);
      energy -= it.property4;
    }
    for (const id of pick) plan.push({ at: (t += 500), cmd: { cmd: "PROP", bag: 2, place: -1, templateId: id } });
  }

  // aim with the real integrator on the (mis-read) wind
  const ball = game.ball(bot.currentBall?.id ?? 0);
  const sol = solveAim({
    map: game.map, ball, from: { x: bot.x, y: bot.y, team: bot.team, bound: bot.bound }, target: { x: target.x, y: target.y - 10 },
    wind: f32(game.map.wind * (1 - P.windMisread)),
    bodies: game.bodiesFor(bot).map((p) => ({ id: p.id, x: p.x, y: p.y, team: p.team, bound: p.bound })),
  });
  const at = Math.max(t + 300, fireAt);
  if (!sol) {
    plan.push({ at, cmd: { cmd: "SKIPNEXT", spendTime: Math.round(at / 1000) } });
    return plan;
  }
  const force = Math.max(0, Math.min(2000, Math.round(sol.force + gaussian(rng, P.forceSigma))));
  const angle = Math.round(sol.angle + gaussian(rng, P.angleSigma));
  plan.push({ at: at - 100, cmd: { cmd: "FIRE_TAG", hasTime: true, speedTime: Math.min(game.timeType, Math.round(at / 1000)) } });
  plan.push({ at, cmd: { cmd: "FIRE", x: sol.muzzle.x, y: sol.muzzle.y, force, angle } });
  return plan;
}

/**
 * Drives every bot seat of a game: when a bot's turn starts it plans the turn and replays the commands at their
 * time through `game.handle` (exactly like a human client). Call `update(now)` right after `game.update(now)`.
 */
export class BotRunner {
  private readonly rng: Rng;
  private plan: { turn: number; start: number; actions: PlannedAction[] } | null = null;

  constructor(
    private readonly game: BaseGame,
    private readonly bots: Map<number, BotProfile>,
    seed = 1,
  ) {
    this.rng = new DotNetRandom(seed);
  }

  update(now: number): FightEvent[] {
    const g = this.game;
    const out: FightEvent[] = [];
    if (g.state === GameState.Loading) {
      for (const p of g.players) if (this.bots.has(p.spec.userId) && p.loadingProcess < 100) out.push(...g.handle(p.spec.userId, { cmd: "LOAD", progress: 100 }, now));
      return out;
    }
    if (g.state !== GameState.Playing) return out;
    const cur = g.currentLiving instanceof Player ? g.currentLiving : null;
    if (!cur || !cur.isAttacking || !this.bots.has(cur.spec.userId)) return out;
    if (!this.plan || this.plan.turn !== g.turnIndex) {
      this.plan = { turn: g.turnIndex, start: now, actions: planBotTurn(g, cur, this.bots.get(cur.spec.userId)!, this.rng) };
    }
    while (this.plan.actions.length && this.plan.start + this.plan.actions[0].at <= now) {
      const a = this.plan.actions.shift()!;
      if (cur.isAttacking) out.push(...g.handle(cur.spec.userId, a.cmd, now));
    }
    return out;
  }
}
