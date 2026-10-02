/**
 * Script runtime (01-pve.md §4): the three C# script bases with the ORIGINAL member names (PascalCase) so the
 * transpiled donor scripts (scripts/generated/**) stay 1:1 with the C# — `Game.CreateNpc`, `Body.MoveTo`,
 * `Game.Random.Next`. Registry keyed by the C# full name used in the DB (`GameServerScript.AI.NPC.SimpleNpcAi`).
 *
 * Missing scripts never freeze a mission: an unknown brain gets `GenericNpcBrain` (walk to / beat / shoot the nearest
 * player), an unknown mission gets `GenericMission` (spawns nothing by itself, ends when every NPC is dead), an unknown
 * game gets `GenericGameControl` (plays the Pve_Info template ids as missions when possible).
 */
import type { PveGame } from "./game.js";
import type { Living } from "../game/living.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** mutable `ref int` parameter (transpiler rewrites `x` → `x.v` inside the method) */
export interface Ref<T> {
  v: T;
}

/** Game.Logic/AI/APVEGameControl.cs */
export class APVEGameControl {
  Game!: PveGame;
  OnCreated(): void {}
  OnPrepated(): void {}
  OnGameOverAllSession(): void {}
  CalculateScoreGrade(_score: number): number {
    return 0;
  }
  Dispose(): void {}
}

/** Game.Logic/AI/AMissionControl.cs */
export class AMissionControl {
  Game!: PveGame;
  OnPrepareNewSession(): void {}
  OnPrepareStartGame(): void {}
  OnPrepareNewGame(): void {}
  OnStartGame(): void {}
  OnStartMovie(): void {}
  OnNewTurnStarted(): void {}
  OnBeginNewTurn(): void {}
  CanGameOver(): boolean {
    return true;
  }
  OnGameOver(): void {}
  OnGameOverMovie(): void {}
  OnPrepareGameOver(): void {}
  OnWaitingGameState(): void {}
  UpdateUIData(): number {
    return 0;
  }
  CalculateScoreGrade(_score: number): number {
    return 0;
  }
  OnShooted(): void {}
  OnDied(): void {}
  OnTakeDamage(): void {}
  OnMoving(): void {}
  OnMissionEvent(_pkt: unknown): void {}
  OnGeneralCommand(_pkt: unknown): void {}
  OnCalculatePoint(_point: number, _isDouble: boolean): void {}
  DoOther(): void {}
  GameOverAllSession(): void {}
  Dispose(): void {}
}

/** Game.Logic/AI/ABrain.cs */
export class ABrain {
  Game!: PveGame;
  Body!: any;
  get m_body(): any {
    return this.Body;
  }
  set m_body(v: any) {
    this.Body = v;
  }
  get m_game(): PveGame {
    return this.Game;
  }
  OnCreated(): void {}
  OnBeginNewTurn(): void {}
  OnBeginSelfTurn(): void {}
  OnStartAttacking(): void {}
  OnStopAttacking(): void {}
  OnBeforeTakedBomb(): void {}
  OnAfterTakedBomb(): void {}
  OnAfterTakedFrozen(): void {}
  OnBeforeTakedDamage(_source: Living, _damage: Ref<number>, _critical: Ref<number>): void {}
  OnAfterTakeDamage(_source: Living): void {}
  OnHeal(_blood: number): void {}
  OnDie(): void {}
  Die(): void {}
  OnDieByBomb(): void {}
  OnDieNewMethod(): void {}
  OnDiedEvent(): void {}
  OnDiedSay(): void {}
  OnKillPlayerSay(): void {}
  OnShootedSay(_delay?: number): void {}
  Dispose(): void {}
}

type Ctor<T> = new () => T;
export type ScriptKind = "game" | "mission" | "brain";
interface Entry {
  kind: ScriptKind;
  ctor: Ctor<unknown>;
  /** "generated" (transpiled), "manual" (hand-fixed / authored), "builtin" */
  origin: string;
}

const registry = new Map<string, Entry>();
const shortNames = new Map<string, string>();

/** registerScript("GameServerScript.AI.NPC.SimpleNpcAi", SimpleNpcAi) — later registrations override (manual > generated) */
export function registerScript(fullName: string, ctor: Ctor<unknown>, kind?: ScriptKind, origin = "manual"): void {
  const k = kind ?? (fullName.includes(".Messions.") ? "mission" : fullName.includes(".Game.") ? "game" : "brain");
  registry.set(fullName, { kind: k, ctor, origin });
  shortNames.set(fullName.split(".").pop()!, fullName);
}
export function scriptInfo(fullName: string): { kind: ScriptKind; origin: string } | null {
  const e = lookup(fullName);
  return e ? { kind: e.kind, origin: e.origin } : null;
}
export function listScripts(): { name: string; kind: ScriptKind; origin: string }[] {
  return [...registry].map(([name, e]) => ({ name, kind: e.kind, origin: e.origin }));
}
function lookup(name: string | null | undefined): Entry | undefined {
  if (!name) return undefined;
  const n = name.trim();
  return registry.get(n) ?? registry.get(shortNames.get(n.split(".").pop()!) ?? "");
}

/** ScriptMgr.CreateInstance(...) as T; null when unknown, of the wrong kind (`as AMissionControl` → null in C#) or the
 *  constructor throws. */
export function createScript<T>(name: string | null | undefined, log?: (m: string) => void, base?: abstract new () => T): T | null {
  const e = lookup(name);
  if (!e) return null;
  try {
    const o = new e.ctor();
    if (base && !(o instanceof base)) {
      log?.(`script ${name} is not a ${base.name}`);
      return null;
    }
    return o as T;
  } catch (err) {
    log?.(`script ${name}: constructor failed: ${(err as Error).message}`);
    return null;
  }
}

// --------------------------------------------------------------------------------------------- generic fallbacks
/**
 * Generic NPC AI (spec §4 "missing script" rule, modelled on donor SimpleNpcAi / SimpleShootNpc): turn to the
 * nearest player; melee within MaxBeatDis, else walk toward him (MoveMin..MoveMax) and beat on arrival; NPCs with a
 * ball (NpcInfo.CurrentBallId > 0) shoot with the engine aim solver instead.
 */
export class GenericNpcBrain extends ABrain {
  override OnStartAttacking(): void {
    const body = this.Body;
    const target = this.Game.FindNearestPlayer(body.X, body.Y);
    if (!target) return;
    body.ChangeDirection(target.X > body.X ? 1 : -1, 0);
    const info = body.NpcInfo;
    if (info && info.CurrentBallId > 0) {
      body.ShootPoint(target.X, target.Y, info.CurrentBallId, 1000, 10000, 1, 1.5, 1500);
      body.PlayMovie("beat", 1000, 0);
      return;
    }
    if (body.Beat(target, "beatA", 0, 0, 0)) return;
    const min = info?.MoveMin ?? 50;
    const max = Math.max(min + 1, info?.MoveMax ?? 150);
    const step = this.Game.Random.Next(min, max);
    const dist = Math.abs(target.X - body.X) - 60;
    const dx = Math.max(10, Math.min(step, dist)) * (target.X > body.X ? 1 : -1);
    body.MoveTo(body.X + dx, body.Y, "walk", 0, () => body.Beat(target, "beatA", 0, 0, 0));
  }
}
/** A boss without script: same as the NPC brain on its own turn. */
export class GenericBossBrain extends GenericNpcBrain {}

/** Mission without script: CanGameOver when every NPC/boss is dead (and at least one existed or turns ran out). */
export class GenericMission extends AMissionControl {
  override CanGameOver(): boolean {
    const g = this.Game;
    const alive = g.GetLivedLivings().length + g.FindAllTurnBossLiving().length;
    if (alive === 0 && (g.spawnedCount > 0 || g.TurnIndex >= 1)) {
      g.IsWin = true;
      return true;
    }
    if (g.TotalTurn > 0 && g.TurnIndex > g.TotalTurn) {
      g.IsWin = false;
      return true;
    }
    return false;
  }
  override UpdateUIData(): number {
    return this.Game.TotalKillCount;
  }
  override OnGameOver(): void {
    if (this.Game.GetLivedLivings().length + this.Game.FindAllTurnBossLiving().length === 0) this.Game.IsWin = true;
  }
}

/** Game without script: one mission per id found in the dungeon's map history (or the Pve_Info Pic). */
export class GenericGameControl extends APVEGameControl {
  override OnCreated(): void {
    const ids = this.Game.fallbackMissionIds();
    if (ids.length) this.Game.SetupMissions(ids.join(","));
    this.Game.TotalMissionCount = ids.length;
  }
  override OnPrepated(): void {
    this.Game.SessionId = 0;
  }
}
