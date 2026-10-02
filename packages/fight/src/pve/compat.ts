/**
 * C#-compatible member surface on the engine bodies (Living.cs / Player.cs / SimpleNpc.cs / SimpleBoss.cs /
 * PhysicalObj.cs) so donor scripts call `Body.MoveTo(...)`, `player.X`, `boss.NpcInfo.CurrentBallId` unchanged.
 * Overloads are resolved by argument types at runtime. Installed once on the prototypes (side-effect import).
 */
import { Living, LivingConfig, Player, TurnedLiving } from "../game/living.js";
import { int } from "../math/num.js";
import { CsList, Point, Rectangle } from "./cs.js";
import type { PveGame } from "./game.js";
import { type NpcInfo, PhysicalObj, SimpleBoss, SimpleNpc } from "./livings.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Cb = (() => void) | null | undefined;

declare module "../game/living.js" {
  interface Living {
    X: number; Y: number; readonly Id: number; Blood: number; MaxBlood: number; readonly IsLiving: boolean; Direction: number;
    Config: LivingConfig; IsSay: boolean; CurrentDamagePlus: number; CurrentShootMinus: number; MaxBeatDis: number;
    FireX: number; FireY: number; SyncAtTime: boolean; IsFrost: boolean; IsHide: boolean; IsNoHole: boolean; Team: number; readonly Name: string;
    Grade: number; Agility: number; Attack: number; Defence: number; Lucky: number; BaseDamage: number; BaseGuard: number; Experience: number;
    State: number; Properties1: number; Properties2: any; Degree: number; BlockTurn: boolean; readonly Game: PveGame; readonly Bound: Rectangle;
    readonly IsAttacking: boolean; TurnNum: number; readonly ModelId: string; ActionStr: string; readonly EffectList: any; IgnoreArmor: boolean; readonly Type: number;
    KeepLife: boolean; readonly LastLifeTimeShoot: number; readonly TotalKill: number; readonly TotalHurt: number;
    MoveTo(x: number, y: number, action: string, ...rest: any[]): boolean;
    FallFrom(x: number, y: number, action: string | null, delay: number, type: number, speed: number, cb?: Cb): boolean;
    FallFromTo(x: number, y: number, action: string | null, delay: number, type: number, speed: number, cb?: Cb): boolean;
    JumpTo(x: number, y: number, action: string, delay: number, type: number, speed?: number, cb?: Cb, value?: number): boolean;
    JumpToSpeed(x: number, y: number, action: string, delay: number, type: number, speed?: number, cb?: Cb): boolean;
    FlyTo(X: number, Y: number, x: number, y: number, action: string, delay: number, speed: number, cb?: Cb): boolean;
    BoltMove(x: number, y: number, delay: number): void;
    ChangeDirection(a: number | Living, delay: number): void;
    FindDirection(l: Living): number;
    Beat(target: Living | null, action: string, dmg: number, crit: number, delay: number, livingCount?: number, attackEffect?: number): boolean;
    BeatDirect(target: Living, action: string, delay: number, livingCount: number, attackEffect: number): void;
    PlayerBeat(target: Living, action: string, dmg: number, crit: number, delay: number): boolean;
    ShootPoint(x: number, y: number, ballId: number, minTime: number, maxTime: number, bombCount: number, time: number, delay: number, cb?: Cb): boolean;
    PlayMovie(action: string, delay: number, movieTime: number, cb?: Cb): void;
    Say(msg: string, type: number, delay: number, finish?: number): void;
    CallFuction(fn: Cb, delay: number): void;
    CallFunction(fn: Cb, delay: number): void;
    RangeAttacking(fx: number, tx: number, action: string, delay: number, ...rest: any[]): boolean;
    Die(a?: number | boolean, b?: boolean): void;
    AddBlood(v: number, type?: number, delay?: number): number;
    SetXY(x: number | Point, y?: number): void;
    SetRect(x: number, y: number, w: number, h: number): void;
    SetRelateDemagemRect(x: number, y: number, w: number, h: number): void;
    SetOffsetY(p: number): void;
    Distance(x: number | Point, y?: number): number;
    StartMoving(delay?: number, speed?: number): void;
    StartAttacking(): void;
    StopAttacking(): void;
    IsFriendly(l: Living): boolean;
    MakeDamage(target: Living): number;
    GetShootPoint(): Point;
    AddEffect(e: unknown, delay: number): void;
    Seal(target: Living, type: number, delay: number): void;
    OffSeal(target: Living, delay: number): void;
    SetHidden(s: boolean): void;
    SetVisible(s: boolean): void;
    SetIceFronze(l: Living): void;
    SetSeal(s: boolean): void;
    SpeedMultX(v: number, t?: string): void;
    SpeedMultY(v: number): void;
    OnSmallMap(s: boolean): void;
    NoFly(v: boolean): void;
    SetSystemState(s: boolean): void;
    ReducedBlood(v: number): number;
    PrepareNewTurn(): void;
    PrepareSelfTurn(): void;
    Dispose(): void;
  }
  interface TurnedLiving {
    Delay: number; Dander: number;
    AddDelay(v: number): void; SetDander(v: number): void; AddDander(v: number): void; GetTurnDelay(): number;
  }
  interface Player {
    readonly PlayerDetail: any; Energy: number; readonly IsActive: boolean; ShootCount: number; readonly CurrentBall: any;
    SetBall(id: number, special?: boolean): void; Skip(t?: number): void; AddLoadingProcess?(): void;
  }
}

const def = (proto: object, name: string, get: (this: any) => unknown, set?: (this: any, v: any) => void): void => {
  Object.defineProperty(proto, name, { get, set: set ?? (() => {}), configurable: true });
};
const fn = (proto: object, name: string, f: (this: any, ...a: any[]) => unknown): void => {
  Object.defineProperty(proto, name, { value: f, writable: true, configurable: true });
};
const G = (l: Living): PveGame => l.game as PveGame;
const isCb = (v: unknown): v is () => void => typeof v === "function";

const L = Living.prototype;
def(L, "X", function () { return this.x; }, function (v) { this.setXY(int(v), this.y); });
def(L, "Y", function () { return this.y; }, function (v) { this.setXY(this.x, int(v)); });
def(L, "Id", function () { return this.id; });
def(L, "Blood", function () { return this.blood; }, function (v) { this.blood = int(v); });
def(L, "MaxBlood", function () { return this.maxBlood; }, function (v) { this.maxBlood = int(v); });
def(L, "IsLiving", function () { return this.isLiving; });
def(L, "Direction", function () { return this.direction; }, function (v) { G(this).setLivingDirection?.(this, v) ?? (this.direction = v); });
def(L, "Config", function () { return this.config; }, function (v) { this.config = v; });
def(L, "IsSay", function () { return this.isSay; }, function (v) { this.isSay = !!v; });
def(L, "CurrentDamagePlus", function () { return this.currentDamagePlus; }, function (v) { this.currentDamagePlus = Number(v); });
def(L, "CurrentShootMinus", function () { return this.currentShootMinus; }, function (v) { this.currentShootMinus = Number(v); });
def(L, "MaxBeatDis", function () { return this.maxBeatDis; }, function (v) { this.maxBeatDis = Number(v); });
def(L, "FireX", function () { return this.fireX; }, function (v) { this.fireX = int(v); });
def(L, "FireY", function () { return this.fireY; }, function (v) { this.fireY = int(v); });
def(L, "SyncAtTime", function () { return this.syncAtTime; }, function (v) { this.syncAtTime = !!v; });
def(L, "IsFrost", function () { return this.isFrost; }, function (v) { this.isFrost = !!v; });
def(L, "IsHide", function () { return this.isHide; }, function (v) { this.isHide = !!v; });
def(L, "IsNoHole", function () { return this.isNoHole; }, function (v) { this.isNoHole = !!v; });
def(L, "Team", function () { return this.team; }, function (v) { this.team = v; });
def(L, "Name", function () { return this.name; });
for (const [P, f] of [["Grade", "grade"], ["Agility", "agility"], ["Attack", "attack"], ["Defence", "defence"], ["Lucky", "lucky"], ["BaseDamage", "baseDamage"], ["BaseGuard", "baseGuard"], ["Experience", "experience"], ["TurnNum", "turnNum"]] as const)
  def(L, P, function () { return this[f]; }, function (v) { this[f] = Number(v); });
def(L, "State", function () { return this._state ?? 0; }, function (v) {
  if ((this._state ?? 0) !== v) {
    this._state = v;
    if (this.syncAtTime && G(this).raw) G(this).raw(118, this.id, [["i32", int(v)]]);
  }
});
def(L, "Properties1", function () { return this._p1 ?? 0; }, function (v) { this._p1 = v; });
def(L, "Properties2", function () { return this._p2 ?? 0; }, function (v) { this._p2 = v; });
def(L, "Degree", function () { return this._degree ?? 0; }, function (v) { this._degree = v; this.degree = v; });
def(L, "BlockTurn", function () { return this.blockTurn; }, function (v) { this.blockTurn = !!v; });
def(L, "KeepLife", function () { return this.keepLife; }, function (v) { this.keepLife = !!v; });
def(L, "IgnoreArmor", function () { return this.ignoreArmor; }, function (v) { this.ignoreArmor = !!v; });
def(L, "Game", function () { return this.game; });
def(L, "Bound", function () { const b = this.bound; return new Rectangle(b.x, b.y, b.width, b.height); });
def(L, "IsAttacking", function () { return this.isAttacking; });
def(L, "ModelId", function () { return this.modelId; });
def(L, "ActionStr", function () { return this.actionStr; }, function (v) { this.actionStr = v; });
def(L, "Type", function () { return this.livingType; });
def(L, "LastLifeTimeShoot", function () { return this.lastLifeTimeShoot; });
def(L, "TotalKill", function () { return this.totalKill; });
def(L, "TotalHurt", function () { return this.totalHurt; });
const effectList = { StopAllEffect() {}, StopEffect() {}, GetOfType() { return null; }, Add() { return true; } };
def(L, "EffectList", function () { return effectList; });

fn(L, "MoveTo", function (x: number, y: number, action: string, ...r: any[]) {
  // overloads (Living.cs:1173-1213): (delay) (delay,speed) (delay,cb) (delay,cb,speed) (delay,sAction,speed) (delay,sAction,speed,cb)
  // (sAction,speed,delay,cb) (sAction,speed,delay,cb,delayCb) (speed,sAction,delay,cb,delayCb)
  let delay = 0, speed = 3, sAction = "", cb: Cb = null, delayCb = 0;
  if (typeof r[0] === "string") {
    sAction = r[0]; speed = r[1] ?? 3; delay = r[2] ?? 0; cb = r[3]; delayCb = r[4] ?? 0;
  } else if (typeof r[1] === "string") {
    if (r.length >= 5) { speed = r[0]; sAction = r[1]; delay = r[2]; cb = r[3]; delayCb = r[4] ?? 0; } else { delay = r[0] ?? 0; sAction = r[1]; speed = r[2] ?? 3; cb = r[3]; }
  } else {
    delay = r[0] ?? 0;
    if (isCb(r[1]) || r[1] === null) { cb = r[1]; speed = r[2] ?? 3; } else if (typeof r[1] === "number") speed = r[1];
  }
  return G(this).livingMoveTo(this, x, y, action, sAction, speed, delay, cb, delayCb);
});
fn(L, "FallFrom", function (x, y, action, delay, type, speed, cb) { return G(this).livingFallFrom(this, x, y, action, delay, type, speed, cb); });
fn(L, "FallFromTo", function (x, y, action, delay, type, speed, cb) { G(this).livingFallTo(this, int(x), int(y), action, delay, type, speed, cb); return true; });
fn(L, "JumpTo", function (x, y, action, delay, type, speed = 20, cb = null, value = 0) { return G(this).livingJumpTo(this, x, y, action, delay, type, speed, cb, value); });
fn(L, "JumpToSpeed", function (x, y, action, delay, type, speed = 20, cb = null) { return G(this).livingJumpTo(this, x, y, action, delay, type, speed, cb, 1); });
fn(L, "FlyTo", function (_X, _Y, x, y, action, delay, speed, cb) {
  const g = G(this);
  const save = this.config.IsFly;
  this.config.IsFly = true;
  const r = g.livingMoveTo(this, x, y, action, "", speed, delay, cb);
  this.config.IsFly = save;
  return r;
});
fn(L, "BoltMove", function (x, y, delay) { G(this).livingBoltMove(this, x, y, delay); });
fn(L, "ChangeDirection", function (a, delay) { G(this).livingChangeDirection(this, typeof a === "number" ? a : this.FindDirection(a), delay ?? 0); });
fn(L, "FindDirection", function (l: Living) { return l.x > this.x ? 1 : -1; });
fn(L, "Beat", function (t, action, dmg, crit, delay, count = 1, eff = 1) { return G(this).livingBeat(this, t, action, dmg, crit, delay, count, eff); });
fn(L, "PlayerBeat", function (t, action, dmg, crit, delay) { return G(this).livingBeat(this, t, action, dmg, crit, delay); });
fn(L, "BeatDirect", function (t, action, delay, count = 1, eff = 1) {
  const save = this.maxBeatDis;
  this.maxBeatDis = 100000;
  G(this).livingBeat(this, t, action, 0, 0, delay, count, eff);
  this.maxBeatDis = save;
});
fn(L, "ShootPoint", function (x, y, ball, minT, maxT, count, time, delay, cb) { return G(this).livingShootPoint(this, x, y, ball, minT, maxT, count, time, delay, cb); });
fn(L, "PlayMovie", function (action, delay, movieTime, cb) { G(this).livingPlayMovie(this, action, delay, movieTime, cb); });
fn(L, "Say", function (msg, type, delay, finish = 1000) { G(this).livingSay(this, msg, type, delay, finish); });
fn(L, "CallFuction", function (f, delay) { G(this).livingCallFunction(this, f, delay); });
fn(L, "CallFunction", function (f, delay) { G(this).livingCallFunction(this, f, delay); });
fn(L, "RangeAttacking", function (fx, tx, action, delay, ...r: any[]) {
  // (players) (directDamage) (removeFrost, players) (removeFrost, directDamage, players)
  let removeFrost = false, direct = false, players: Player[] | null = null;
  const bools = r.filter((v) => typeof v === "boolean");
  const list = r.find((v) => Array.isArray(v)) ?? null;
  if (bools.length === 1 && r.length === 1) direct = bools[0];
  else if (bools.length === 1) removeFrost = bools[0];
  else if (bools.length >= 2) { removeFrost = bools[0]; direct = bools[1]; }
  players = list;
  return G(this).livingRangeAttacking(this, fx, tx, action, delay, removeFrost, direct, players);
});
fn(L, "Die", function (a?: number | boolean, b?: boolean) {
  if (typeof a === "number") G(this).livingDie(this, a, !!b);
  else if (a === true && this.blood > 0) { this.blood = 0; this.game.emit({ cmd: "HEALTH", livingId: this.id, type: 6, blood: 0, value: 0 }); this.die(); }
  else this.die();
});
fn(L, "AddBlood", function (v, type = 0, delay?: number) {
  if (delay !== undefined && delay > 0) { G(this).addStepAction(delay, 0, () => (this.addBlood(int(v), type), true)); return v; }
  return this.addBlood(int(v), type);
});
fn(L, "ReducedBlood", function (v) { return this.addBlood(int(v), 1); });
fn(L, "SetXY", function (x, y) { if (x instanceof Point) this.setXY(x.X, x.Y); else this.setXY(int(x), int(y)); });
fn(L, "SetRect", function (x, y, w, h) { this.setRect(int(x), int(y), int(w), int(h)); });
fn(L, "SetRelateDemagemRect", function (x, y, w, h) { this.demageRect = { x: int(x), y: int(y), width: int(w), height: int(h) }; });
fn(L, "SetOffsetY", function (p) { G(this).SendGamePlayerProperty?.(this, "offsetY", String(p)); });
fn(L, "Distance", function (x, y) { if (x instanceof Point) return this.distance(x.X, x.Y); return this.distance(x, y); });
fn(L, "StartMoving", function () { this.startMoving(); });
fn(L, "StartFalling", function (_direct?: boolean, delay = 0) { if (delay > 0) G(this).addStepAction?.(delay, 0, () => (this.startMoving(), true)); else this.startMoving(); });
fn(L, "StartAttacking", function () { this.startAttacking(); });
fn(L, "StopAttacking", function () { this.stopAttacking(); });
fn(L, "IsFriendly", function (l) { return this.isFriendly(l); });
fn(L, "MakeDamage", function (t) { return G(this).livingMakeDamage(this, t); });
fn(L, "GetShootPoint", function () { const p = this.getShootPoint(); return new Point(p.x, p.y); });
fn(L, "AddEffect", function (e: any, delay = 0) {
  if (e && typeof e.apply === "function") G(this).addStepAction?.(delay, 0, () => (e.apply(this), true));
  return true;
});
for (const n of ["AddPetEffect", "Seal", "OffSeal", "SetHidden", "SetVisible", "SetSeal", "OnSmallMap", "NoFly", "SetSystemState", "SetIndian", "SetNiutou", "ShowImprisonment", "IconPicture", "SendAfterShootedAction", "SendAfterShootedFrozen", "AddRemoveEnergy", "ChangeDamage"])
  fn(L, n, function () { return true; });
fn(L, "SetIceFronze", function (l: Living) { l.startEffect("ice", 2); });
fn(L, "SpeedMultX", function (v, t = "speedX") { if (this.syncAtTime) G(this).SendGamePlayerProperty?.(this, t, String(v)); });
fn(L, "SpeedMultY", function (v) { if (this.syncAtTime) G(this).SendGamePlayerProperty?.(this, "speedY", String(v)); });
fn(L, "PrepareNewTurn", function () { this.prepareNewTurn(); });
fn(L, "PrepareSelfTurn", function () { this.prepareSelfTurn(); });
fn(L, "Dispose", function () { this.dispose(); });

const T = TurnedLiving.prototype;
def(T, "Delay", function () { return this.delay; }, function (v) { this.delay = int(v); });
def(T, "Dander", function () { return this.dander; }, function (v) { this.dander = int(v); });
fn(T, "AddDelay", function (v) { this.addDelay(int(v)); });
fn(T, "SetDander", function (v) { this.setDander(int(v)); });
fn(T, "AddDander", function (v) { this.addDander(int(v)); });
fn(T, "GetTurnDelay", function () { return this.getTurnDelay(); });

const P = Player.prototype;
def(P, "PlayerDetail", function () {
  const s = this.spec;
  return {
    PlayerCharacter: { ID: s.userId, NickName: s.nickname, Grade: this.grade, Attack: s.attack, Defence: s.defence, Agility: s.agility, Luck: s.lucky, Sex: true, ConsortiaID: 0 },
    SendMessage: () => {}, AddGP: () => 0, AddGold: () => {}, AddMoney: () => {}, IsViewer: false, ZoneId: 1, ZoneName: "",
    GetBaseAttack: () => s.baseAttack, GetBaseDefence: () => s.baseDefence, MainWeapon: { TemplateID: s.weapon.templateId },
  };
});
def(P, "Energy", function () { return this.energy; }, function (v) { this.energy = int(v); });
def(P, "IsActive", function () { return this.isActive; });
def(P, "ShootCount", function () { return this.shootCount; }, function (v) { this.setShootCount(int(v)); });
def(P, "CurrentBall", function () { return this.currentBall; });
fn(P, "SetBall", function (id, sp = false) { this.setBall(id, sp); });
fn(P, "Skip", function () { this.skip(); });
/** Player.StartSpeedMult + PlayerSpeedMultAction: knock the player to (x, y) at 20 px/tick */
fn(P, "StartSpeedMult", function (x: number, y: number, delay = 0) {
  const g = G(this);
  let sent = false;
  g.addStepAction?.(0, delay, () => {
    if (!sent) {
      sent = true;
      if (this.syncAtTime) g.SendGamePlayerProperty(this, "speedX", "18");
      g.emit({ cmd: "MOVESTART", livingId: this.id, type: 4, x: int(x), y: int(y), dir: x > this.x ? 1 : -1, isLiving: this.isLiving });
    }
    const dx = x - this.x, dy = y - this.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > 20) { this.place(int(this.x + (dx / d) * 20), int(this.y + (dy / d) * 20)); return false; }
    this.place(int(x), int(y));
    return true;
  });
});

for (const C of [SimpleNpc.prototype, SimpleBoss.prototype]) {
  def(C, "NpcInfo", function (): NpcInfo { return this.npcInfo; });
}
const B = SimpleBoss.prototype;
def(B, "Child", function () { return CsList.from2(this.child); });
def(B, "CurrentLivingNpcNum", function () { return this.child.filter((c: Living) => c.isLiving).length; });
fn(B, "FindChildLivings", function () { return CsList.from2(this.child.filter((c: Living) => c.isLiving)); });
fn(B, "FindChildLiving", function (id: number) { return CsList.from2(this.child.filter((c: SimpleNpc) => c.isLiving && c.npcInfo.ID === id)); });
fn(B, "ClearDiedLiving", function () { for (let i = this.child.length - 1; i >= 0; i--) if (!this.child[i].isLiving) this.child.splice(i, 1); });
fn(B, "RemoveAllChild", function () { for (const c of this.child) if (c.isLiving) c.die(); this.child.length = 0; });
fn(B, "FindMostHatefulPlayer", function () {
  let best: Living | null = null, v = -1;
  for (const [p, d] of this.hate) if (d > v) { v = d; best = p; }
  return best;
});
fn(B, "RandomSay", function (msgs: string[], type: number, delay: number, finish: number) {
  if (!msgs?.length) return;
  G(this).livingSay(this, msgs[G(this).Random.Next(0, msgs.length)]!, type, delay, finish);
});
fn(B, "CreateBoss", function (id, x, y, dir, type) { const n = G(this).CreateNpc(id, x, y, type, dir); this.child.push(n); return n; });
fn(B, "CreateChild", function (id: number, a: any, b: any, c: any, d: any, e?: any, f?: any) {
  const g = G(this);
  if (Array.isArray(a)) {
    // (id, Point[] birth, maxCount, maxCountForOnce, type)
    const k = g.Random.Next(0, c);
    for (let i = 0; i < k; i++) { const p = a[g.Random.Next(0, a.length)]; this.CreateChild(id, p.X, p.Y, 4, b); }
    return;
  }
  if (typeof c === "boolean" || typeof d === "boolean" || typeof e === "boolean") {
    // (id,x,y,showBlood,config) (id,x,y,dir,showBlood,config) (id,x,y,type,dir,showBlood,config)
    const args = [c, d, e, f].filter((v) => v !== undefined);
    const config = args.find((v) => v instanceof LivingConfig) ?? null;
    const show = args.find((v) => typeof v === "boolean") ?? true;
    const nums = args.filter((v) => typeof v === "number");
    const type = nums.length >= 2 ? nums[0] : 1, dir = nums.length >= 2 ? nums[1] : (nums[0] ?? -1);
    const n = config ? g.CreateNpc(id, a, b, type, dir, config) : g.CreateNpc(id, a, b, type, dir);
    this.child.push(n);
    if (!show) g.SendHideBlood(n, 0);
    return n;
  }
  // (id, x, y, disToSecond, maxCount[, direction])
  const dir = e ?? -1;
  const alive = this.child.filter((x: Living) => x.isLiving).length;
  if (alive < d) {
    if (d - alive >= 2) {
      this.child.push(g.CreateNpc(id, a + c, b, 1, dir));
      this.child.push(g.CreateNpc(id, a, b, 1, dir));
    } else this.child.push(g.CreateNpc(id, a, b, 1, dir));
  }
});

const O = PhysicalObj.prototype;
def(O, "X", function () { return this.x; });
def(O, "Y", function () { return this.y; });
def(O, "Id", function () { return this.id; });
def(O, "Name", function () { return this.name; });
def(O, "IsLiving", function () { return this.isLiving; });
def(O, "CurrentAction", function () { return this.currentAction; }, function (v) { this.currentAction = v; });
def(O, "CanPenetrate", function () { return this.canPenetrate; }, function (v) { this.canPenetrate = !!v; });
def(O, "Type", function () { return this.phyType; });
fn(O, "PlayMovie", function (action, delay, movieTime) { if (this.game) this.game.physPlayMovie(this, action, delay, movieTime); });
fn(O, "SetXY", function (x, y) { this.setXY(int(x), int(y)); });
fn(O, "Die", function () { this.die(); });
fn(O, "SetGame", function (g) { this.game = g; });
fn(O, "Distance", function (x, y) { return this.distance(x, y); });

export const compatInstalled = true;
