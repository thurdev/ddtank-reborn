/**
 * Everything a transpiled donor script can reference by its C# name (the generated files import from here).
 * Action/effect classes the donor scripts instantiate (`Game.AddAction(new FocusAction(...))`,
 * `p.AddEffect(new ReduceStrengthEffect(2, 100), 0)`) are thin ports with a `run(game)` method.
 */
import "../compat.js";
import type { PveGame } from "../game.js";
import { Living, LivingConfig, Player, TurnedLiving } from "../../game/living.js";
import { GameState } from "../../game/game.js";

export { Living, LivingConfig, Player, TurnedLiving };
export { ABrain, AMissionControl, APVEGameControl, registerScript } from "../script.js";
export { SimpleNpc, SimpleBoss, PhysicalObj, Layer, LayerTop, Ball, TransmissionGate, eLivingType } from "../livings.js";
export { PveGame as PVEGame, PveGame as BaseGame, eHardLevel, eRoomType, eGameType } from "../game.js";
export { CsList, CsDictionary, CsMath, CsRandom, Point, Rectangle, LanguageMgr, Console, NotImplementedException, Exception, __arr, __newArr, __int, __fmt, __is, __as } from "../cs.js";
export const eGameState = GameState;
export const eMirariType = { 0: 0 } as Record<string, number>;
export const eMessageType = { Normal: 0, ERROR: 1, ChatNormal: 2, ChatERROR: 3, ALERT: 4, GM_NOTICE: 5 } as const;

/** `new List<T>(x)` */
import { CsList, CsDictionary } from "../cs.js";
export function __list<T>(src?: Iterable<T> | number): CsList<T> {
  if (src === undefined || typeof src === "number") return new CsList<T>();
  return CsList.from2(src);
}
export function __dict<K, V>(): CsDictionary<K, V> {
  return new CsDictionary<K, V>();
}

abstract class ScriptAction {
  constructor(public delay = 0) {}
  abstract run(g: PveGame): void;
}
export class FocusAction extends ScriptAction {
  constructor(private obj: { x: number; y: number }, private type: number, delay: number, private finish = 0) { super(0); this.d = delay; }
  private d: number;
  run(g: PveGame): void { g.SendObjectFocus(this.obj, this.type, this.d, this.finish); }
}
export class FocusFreeAction extends ScriptAction {
  constructor(private x: number, private y: number, private type: number, delay: number, private finish = 0) { super(0); this.d = delay; }
  private d: number;
  run(g: PveGame): void { g.SendFreeFocus(this.x, this.y, this.type, this.d, this.finish); }
}
export class LivingCallFunctionAction extends ScriptAction {
  constructor(private l: Living, private fn: () => void, delay: number) { super(0); this.d = delay; }
  private d: number;
  run(g: PveGame): void { g.livingCallFunction(this.l, this.fn, this.d); }
}
export class LivingBoltMoveAction extends ScriptAction {
  constructor(private l: Living, private x: number, private y: number, _action: string, delay: number, _finish = 0) { super(0); this.d = delay; }
  private d: number;
  run(g: PveGame): void { g.livingBoltMove(this.l, this.x, this.y, this.d); }
}
export class LivingMoveToAction extends ScriptAction {
  constructor(private l: Living, private path: { X: number; Y: number }[], private action: string, delay: number, private speed = 3) { super(0); this.d = delay; }
  private d: number;
  run(g: PveGame): void { const p = this.path[this.path.length - 1]; if (p) g.livingMoveTo(this.l, p.X, p.Y, this.action, "", this.speed, this.d); }
}
export class PlaySoundAction extends ScriptAction {
  constructor(private s: string, delay: number) { super(delay); }
  run(g: PveGame): void { g.SendPlaySound(this.s); }
}
export class PlayBackgroundSoundAction extends ScriptAction {
  constructor(private play: boolean, delay: number) { super(delay); }
  run(g: PveGame): void { g.SendPlayBackgroundSound(this.play); }
}
export class LockFocusAction extends ScriptAction {
  constructor(private lock: boolean, delay: number, _finish = 0) { super(delay); }
  run(g: PveGame): void { g.SendLockFocus(this.lock); }
}
export class ShowBloodItem extends ScriptAction {
  constructor(private id: number, _a = 0, _b = 0) { super(0); }
  run(g: PveGame): void { g.raw(73, 0, [["i32", this.id]]); }
}
export class LivingSayAction extends ScriptAction {
  constructor(private l: Living, private msg: string, private type: number, delay: number, private finish = 1000) { super(0); this.d = delay; }
  private d: number;
  run(g: PveGame): void { g.livingSay(this.l, this.msg, this.type, this.d, this.finish); }
}
export class LoadingFileInfo {
  constructor(public Type: number, public Path: string, public ClassName: string) {}
}
/** donor ESM missions: spawn parameters */
export class NpcCreateParam {
  [k: string]: unknown;
  constructor(...a: unknown[]) { Object.assign(this, { args: a }); }
}
export class StringBuilder {
  private s = "";
  Append(v: unknown): this { this.s += String(v); return this; }
  ToString(): string { return this.s; }
  toString(): string { return this.s; }
}

/** Effects (Game.Logic/Effects/*.cs) — only the simple turn-counted ones change state; the rest are accepted no-ops. */
export class AbstractEffect {
  constructor(public count = 1, public value = 0, ..._r: unknown[]) {}
  apply(_l: Living): void {}
}
export class ContinueReduceBloodEffect extends AbstractEffect {
  override apply(l: Living): void { l.addBlood(-Math.abs(this.value), 1); }
}
export class ContinueReduceGreenBloodEffect extends ContinueReduceBloodEffect {}
export class ReduceStrengthEffect extends AbstractEffect {
  override apply(l: Living): void { if (l instanceof Player) l.energy = Math.max(0, l.energy - this.value); }
}
export class LockDirectionEffect extends AbstractEffect {}
export class GuardEffect extends AbstractEffect {}
export class DamageEffect extends AbstractEffect {}
export class NoHoleEffect extends AbstractEffect {
  override apply(l: Living): void { l.startEffect("nohole", this.count); }
}
export class IceFronzeEffect extends AbstractEffect {
  override apply(l: Living): void { l.startEffect("ice", this.count); }
}
export class HideEffect extends AbstractEffect {
  override apply(l: Living): void { l.startEffect("hide", this.count); }
}
export class SealEffect extends AbstractEffect {
  override apply(l: Living): void { l.startEffect("seal", this.count); }
}
export class AddDamageEffect extends AbstractEffect {}
export class ReduceDamageEffect extends AbstractEffect {}
export class InvinciblyEffect extends AbstractEffect {}

/** DropInventory (Game.Logic/DropInventory.cs): drops are applied by the server via PveGame events; scripts that roll
 * their own boxes (SpecialDrop) get "no drop". */
export const DropInventory = { SpecialDrop: (..._a: unknown[]) => false, CopyDrop: (..._a: unknown[]) => false, NPCDrop: (..._a: unknown[]) => false, BossDrop: (..._a: unknown[]) => false };

/** Game.Logic/eEffectType.cs */
export const eEffectType = { AddAgilityEffect: 1, AddAttackEffect: 2, AddBloodEffect: 3, AddBombEquipEffect: 24, AddDamageEffect: 4, AddDander: 20, AddDefenceEffect: 5, AddGuardEquipEffect: 39, AddLuckyEffect: 6, AddTurnEquipEffect: 19, ArmorPiercer: 17, AssimilateBloodEffect: 28, AssimilateDamageEffect: 27, AtomBomb: 16, AvoidDamageEffect: 25, ContinueDamageEffect: 23, ContinueReduceBaseDamageEffect: 36, ContinueReduceBaseDamageEquipEffect: 30, ContinueReduceBlood: 40, ContinueReduceBloodEffect: 33, ContinueReduceBloodEquipEffect: 32, ContinueReduceDamageEffect: 38, ContinueReduceGreenBloodEffect: 1001, DamageEffect: 41, FatalEffect: 7, GuardEffect: 42, HideEffect: 8, IceFronzeEffect: 9, IceFronzeEquipEffect: 10, InvinciblyEffect: 11, LockDirectionEffect: 35, LockDirectionEquipEffect: 34, MakeCriticalEffect: 26, NoHoleEffect: 12, NoHoleEquipEffect: 13, PhongAn: 1000, RecoverBloodEffect: 37, ReduceDamageEffect: 14, ReduceStrengthEffect: 22, ReduceStrengthEquipEffect: 31, ReflexDamageEffect: 29, ReflexDamageEquipEffect: 21, SealEffect: 15, SealEquipEffect: 18, AddTargetEffect: 44, AddBloodTurnEffect: 45, AddDamageTurnEffect: 46, AddGuardTurnEffect: 47 } as const;
/** Bussiness/BuffType.cs (scripts only test Targeting) */
export const BuffType = { Turn: 0, Local: 1, Targeting: 7 } as const;
