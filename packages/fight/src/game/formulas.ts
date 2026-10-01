/** Pure combat formulas (each cites the C# it mirrors). */
import { f32, int } from "../math/num.js";
import type { Rng } from "../math/random.js";

/** TurnedLiving.GetTurnDelay (TurnedLiving.cs:161) */
export function turnDelay(agility: number, attack: number): number {
  return int(1600.0 - (1200.0 * agility) / (agility + 1200.0) + attack / 10.0);
}

/** BaseGame.getTurnTime (BaseGame.cs:1566) */
export function turnTime(timeType: number): number {
  return ({ 1: 8, 2: 10, 3: 12, 4: 16, 5: 21, 6: 31 } as Record<number, number>)[timeType] ?? 10;
}

/** Player.PrepareNewTurn energy (Player.cs:2112) */
export function turnEnergy(agility: number, guildAddEnergy = 0): number {
  return int(agility / 30) + 240 + (guildAddEnergy > 0 ? guildAddEnergy : 0);
}

/** WindMgr.GetWindID (WindMgr.cs:179) */
export function windId(wind: number, pos: number): number {
  for (let t = 0; t < 5; t++) {
    if (t === 0 ? wind < 10 : wind >= t * 10 && wind < t * 10 + 10) {
      if (pos === 1) return t === 0 ? 10 : t;
      if (pos === 3) return wind - t * 10 !== 0 ? wind - t * 10 : 10;
    }
  }
  return 0;
}

/** BaseGame.GetVane (BaseGame.cs:1599) */
export function vane(wind10: number, pos: number): number {
  const w = Math.abs(wind10);
  return pos === 1 ? windId(w, 1) : pos === 3 ? windId(w, 3) : 0;
}

export interface WindState {
  wind: number;
  nextWind: number;
  frozen: boolean;
}
/** BaseGame.GetNextWind (BaseGame.cs:1463) — incl. its retarget bug (only triggers on equality). */
export function nextWind(s: WindState, rng: Rng): number {
  if (s.frozen) return 0;
  const n = int(f32(s.wind * 10));
  let n2: number;
  if (n > s.nextWind) {
    n2 = n - rng.nextMax(11);
    if (n <= s.nextWind) s.nextWind = rng.nextRange(-40, 40);
  } else {
    n2 = n + rng.nextMax(11);
    if (n >= s.nextWind) s.nextWind = rng.nextRange(-40, 40);
  }
  return f32(n2 / 10);
}

/** Living.getHertAddition (Living.cs:998) */
export function hertAddition(property7: number, strengthen: number): number {
  return Math.round(property7 * Math.pow(1.1, strengthen) - property7) + property7;
}

export interface DamageAttacker {
  baseDamage: number;
  attack: number;
  grade: number;
  lucky: number;
  currentDamagePlus: number;
  currentShootMinus: number;
  ignoreArmor: boolean;
  worldBossAddDamage?: number;
}
export interface DamageTarget {
  baseGuard: number;
  defence: number;
  /** armor bonus H from the deputy weapon when AddArmor is active (0 otherwise) */
  armorBonus?: number;
  cancelGuard?: boolean;
}

/** core of SimpleBomb.MakeDamage (SimpleBomb.cs:478-548); `distance`/`radius` null → melee (Living.MakeDamage, no DR3). */
export function shellDamage(a: DamageAttacker, t: DamageTarget, distance: number | null, radius: number, melee = false): number {
  let baseGuard = t.baseGuard;
  let defence = t.defence;
  if (t.armorBonus) {
    const add = int(t.armorBonus);
    baseGuard += add;
    defence += add;
  }
  if (a.ignoreArmor || (!melee && t.cancelGuard)) {
    baseGuard = 0;
    defence = 0;
  }
  const dr1 = (0.95 * (baseGuard - 3 * a.grade)) / (500.0 + baseGuard - 3 * a.grade);
  const dr2 = defence - a.lucky >= 0 ? (0.95 * (defence - a.lucky)) / (600.0 + defence - a.lucky) : 0;
  const dr3 = melee ? 0 : (a.worldBossAddDamage ?? 0) * (1.0 - (baseGuard / 200.0 + defence * 0.003));
  let dmg = (dr3 + a.baseDamage * (1.0 + a.attack * 0.001) * (1.0 - (dr1 + dr2 - dr1 * dr2))) * f32(a.currentDamagePlus) * f32(a.currentShootMinus);
  if (melee) return dmg < 0 ? 1 : int(dmg);
  if (distance !== null && distance < radius) {
    dmg *= 1.0 - distance / radius / 4.0;
    return dmg < 0 ? 1 : int(dmg);
  }
  return 0;
}

/** Living.MakeCriticalDamage (Living.cs:722) — consumes one `Random.Next(100)`. */
export function criticalDamage(rng: Rng, lucky: number, baseDamage: number, o: { critRate?: number; targetReduce?: number; guildAddCritical?: number } = {}): number {
  if ((lucky * 45.0) / (800.0 + lucky) + (o.critRate ?? 0) >= rng.nextMax(100)) {
    let n = int((0.5 + lucky * 0.00015) * baseDamage);
    n = int((n * (100 - (o.targetReduce ?? 0))) / 100);
    if ((o.guildAddCritical ?? 0) > 0) n += o.guildAddCritical!;
    return n;
  }
  return 0;
}

/** Living.ComputeVx/ComputeVy (Living.cs:825-833) — float sub-expressions as in C#. */
export function computeV(dx: number, m: number, af: number, f: number, t: number, k: number): number {
  return (dx - f32(f32(f32(f32(f / m) * t) * t) / 2)) / t + f32(af / m) * dx * k;
}

/** Living.GetShootForceAndAngle (Living.cs:1019-1060): the analytic NPC/bot aim approximation. */
export function analyticAim(
  dx: number,
  dy: number,
  p: { mass: number; airResistance: number; gravity: number; windForce: number; direction: number; time: number },
): { force: number; angle: number } | null {
  dx = f32(dx);
  dy = f32(dy);
  for (let t = f32(p.time); t <= 4; t = f32(t + f32(0.6))) {
    const vx = computeV(dx, p.mass, p.airResistance, p.windForce, t, 0.7);
    const vy = computeV(dy, p.mass, p.airResistance, p.gravity, t, 1.3);
    if (vy >= 0 || vx * p.direction <= 0) continue;
    const v = Math.sqrt(vx * vx + vy * vy);
    if (v < 2000) {
      let angle = int((Math.atan(vy / vx) / Math.PI) * 180.0);
      if (vx < 0) angle += 180;
      return { force: int(v), angle };
    }
  }
  return null;
}

/** PVPGame.CalculateExperience (PVPGame.cs:202-249) — Match rooms only; inputs as data. */
export function calculateExperience(o: {
  isMatch: boolean;
  won: boolean;
  grade: number;
  totalHurt: number;
  totalKill: number;
  totalShootCount: number;
  totalHitTargetCount: number;
  opponentAvgLevel: number;
  opponentCount: number;
  gameTotalHurt: number;
  doubleEvent?: boolean;
  coupleGP?: (gp: number) => number;
}): { gp: number; reward: number } {
  if (!o.isMatch) return { gp: 0, reward: 0 };
  const avg = f32(o.opponentAvgLevel);
  if (o.totalHurt === 0) return avg - o.grade >= 5 && o.gameTotalHurt > 0 ? { gp: 201, reward: 200 } : { gp: 1, reward: 0 };
  const isWin = o.won ? 2 : 0;
  let shoot = o.totalShootCount === 0 ? 1 : o.totalShootCount;
  if (shoot < o.totalHitTargetCount) shoot = o.totalHitTargetCount;
  const maxHurt = int(f32(f32(o.opponentCount * avg) * 300));
  const hurt = o.totalHurt > maxHurt ? maxHurt : o.totalHurt;
  let gp = Math.ceil((isWin + hurt * 0.001 + o.totalKill * 0.5 + int(o.totalHitTargetCount / shoot) * 2) * avg * (0.9 + (o.opponentCount - 1) * 0.3));
  let reward = 0;
  if (avg - o.grade >= 5 && o.gameTotalHurt > 0) {
    reward = 200;
    gp += 200;
  }
  if (o.coupleGP) gp = o.coupleGP(gp);
  if (o.doubleEvent) gp *= 2;
  if (gp > 12000) gp = 12000;
  return { gp: gp < 1 ? 1 : gp, reward };
}

/** PVPGame.CalculateOffer (PVPGame.cs:563-588) */
export function calculateOffer(o: { isMatch: boolean; isGuild: boolean; won: boolean; opponentCount: number; gainOffer: number; killedPunishmentOffer: number; doubleEvent?: boolean }): number {
  if (!o.isMatch) return 0;
  const append = o.isGuild ? (o.won ? o.opponentCount : int(o.opponentCount * 0.5)) : 0;
  let offer = int(f32(o.gainOffer + append)) - o.killedPunishmentOffer;
  if (o.doubleEvent) offer *= 2;
  return offer;
}

/** Player.CalculatePlayerOffer (Player.cs:1883-1899): offer stolen on a PvP kill. */
export function playerKillOffer(o: { isGuildGame: boolean; bothInGuilds: boolean; victimTotalHurt: number }): number {
  const base = o.isGuildGame ? 10 : o.bothInGuilds ? 3 : 1;
  return base + int(o.victimTotalHurt / 2000);
}
