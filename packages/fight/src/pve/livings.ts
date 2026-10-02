/**
 * PvE bodies: SimpleNpc (Phy/Object/SimpleNpc.cs, a non-turned Living moved in the NPC phase), SimpleBoss
 * (SimpleBoss.cs, a TurnedLiving with its own turns), PhysicalObj/Layer/Ball/LayerTop (Phy/Object/*.cs) and the
 * DB rows they are built from (NPC_Info / Mission_Info / Pve_Info, PascalCase like the columns scripts read).
 */
import { Living, TurnedLiving } from "../game/living.js";
import { Physics } from "../phy/physics.js";
import { SimpleBomb } from "../phy/bomb.js";
import { rect, type Point } from "../phy/rect.js";
import { ABrain as ABrainBase, type ABrain, GenericBossBrain, GenericNpcBrain, createScript } from "./script.js";
import type { PveGame } from "./game.js";

export interface NpcInfo {
  ID: number; Name: string; Level: number; Camp: number; Type: number;
  X: number; Y: number; Width: number; Height: number; Blood: number;
  MoveMin: number; MoveMax: number; BaseDamage: number; BaseGuard: number; Defence: number; Agility: number; Lucky: number; Attack: number;
  ModelID: string; ResourcesPath: string; DropRate?: string | null; Experience: number; Delay: number; Immunity: number;
  Alert?: number; Range?: number; Preserve?: number; Script: string; FireX: number; FireY: number; DropId: number; CurrentBallId: number; speed?: number;
}
export interface MissionInfo {
  Id: number; Name: string; TotalCount: number; TotalTurn: number; Script: string; Success: string; Failure: string; Description: string;
  IncrementDelay: number; Delay: number; Title: string; Param1: number; Param2: number; TakeCard?: number; TryAgain?: boolean; TryAgainCost?: number;
}
export interface PveInfo {
  ID: number; Name: string; Type: number; LevelLimits: number;
  SimpleTemplateIds?: string | null; NormalTemplateIds?: string | null; HardTemplateIds?: string | null; TerrorTemplateIds?: string | null;
  SimpleGameScript?: string | null; NormalGameScript?: string | null; HardGameScript?: string | null; TerrorGameScript?: string | null; EpicGameScript?: string | null;
  Pic?: string | null; Description?: string | null; BossFightNeedMoney?: string | null;
}

/** eLivingType (Game.Logic/eLivingType.cs) */
export const eLivingType = { Living: 0, ClearEnemy: 1, SimpleNpc1: 2, SimpleNpc: 3, SimpleBoss1: 4, SimpleBoss: 5, BossSpecialDie: 6 } as const;

function safe(game: PveGame, what: string, fn: () => void): void {
  game.runScript(what, fn);
}

/** shared NPC/boss setup (SimpleNpc.Reset / SimpleBoss.Reset) */
function resetFromInfo(l: Living, info: NpcInfo): void {
  l.maxBlood = info.Blood;
  l.blood = info.Blood;
  l.baseDamage = info.BaseDamage;
  l.baseGuard = info.BaseGuard;
  l.attack = info.Attack;
  l.defence = info.Defence;
  l.agility = info.Agility;
  l.lucky = info.Lucky;
  l.grade = info.Level;
  l.experience = info.Experience;
  l.setRect(info.X, info.Y, info.Width, info.Height);
  l.demageRect = rect(info.X, info.Y, info.Width, info.Height);
  if (l.direction === 1) resetRectWithDir(l);
  l.fireX = info.FireX;
  l.fireY = info.FireY;
  l.isLiving = true;
  l.isFrost = false;
  l.isHide = false;
  l.isNoHole = false;
  l.blockTurn = false;
  l.turnNum = 0;
}

/** Living.ReSetRectWithDir (Living.cs:1705) */
export function resetRectWithDir(l: Living): void {
  const b = l.bound;
  l.setRect(-b.x - b.width, b.y, b.width, b.height);
  const b1 = l.bound1;
  l.setRectBomb(-b1.x - b1.width, b1.y, b1.width, b1.height);
  const d = l.demageRect;
  l.demageRect = rect(-d.x - d.width, d.y, d.width, d.height);
}

interface NpcLike extends Living {
  npcInfo: NpcInfo;
  brain: ABrain;
}

function attachBrain(l: NpcLike, game: PveGame, boss: boolean): void {
  let brain = createScript<ABrain>(l.npcInfo.Script, (m) => game.log(m), ABrainBase);
  if (!brain) {
    if (l.npcInfo.Script) game.reportMissing("brain", l.npcInfo.Script);
    brain = boss ? new GenericBossBrain() : new GenericNpcBrain();
  }
  brain.Game = game;
  brain.Body = l;
  l.brain = brain;
  safe(game, `${l.npcInfo.Script}.OnCreated`, () => brain!.OnCreated());
}

/** NPC muzzle (Living.GetShootPoint for SimpleNpc/SimpleBoss, Living.cs:1062) */
function npcShootPoint(l: Living): Point {
  return l.direction <= 0 ? { x: l.x + l.fireX, y: l.y + l.fireY } : { x: l.x - l.fireX, y: l.y + l.fireY };
}

/** Living.StartMoving(0, 30) for NPCs: fall when standing in the air (Living.cs:1968-2005) */
function npcStartMoving(l: Living, game: PveGame): void {
  if (l.config.IsFly || !l.map) return;
  if (l.map.isEmpty(l.x, l.y)) game.livingFallFrom(l, l.x, l.y, null, 0, 0, 30);
}

export class SimpleNpc extends Living implements NpcLike {
  npcInfo: NpcInfo;
  brain!: ABrain;
  declare readonly game: PveGame;

  constructor(id: number, game: PveGame, info: NpcInfo, type: number, direction: number, action: string) {
    super(id, game, info.Camp, info.Name, info.Blood, direction);
    this.kind = "npc";
    this.npcInfo = info;
    this.livingType = type === 0 ? eLivingType.SimpleNpc : eLivingType.SimpleNpc1;
    this.modelId = info.ModelID;
    this.actionStr = action ?? "";
    attachBrain(this, game, false);
  }
  reset(): void {
    resetFromInfo(this, this.npcInfo);
  }
  override getShootPoint(): Point {
    return npcShootPoint(this);
  }
  override startMoving(): void {
    npcStartMoving(this, this.game);
    super.startMoving();
  }
  override prepareNewTurn(): void {
    super.prepareNewTurn();
  }
  override onBeginNewTurn(): void {
    safe(this.game, "OnBeginNewTurn", () => this.brain.OnBeginNewTurn());
  }
  override onBeginSelfTurn(): void {
    safe(this.game, "OnBeginSelfTurn", () => this.brain.OnBeginSelfTurn());
  }
  override onStartAttacking(): void {
    safe(this.game, "OnStartAttacking", () => this.brain.OnStartAttacking());
  }
  override onStopAttacking(): void {
    safe(this.game, "OnStopAttacking", () => this.brain.OnStopAttacking());
  }
  override onBeforeTakedDamage(source: Living, d: { damage: number; critical: number }): void {
    const a = { v: d.damage }, b = { v: d.critical };
    safe(this.game, "OnBeforeTakedDamage", () => this.brain.OnBeforeTakedDamage(source, a, b));
    d.damage = a.v | 0;
    d.critical = b.v | 0;
  }
  override onAfterTakedDamage(source: Living): void {
    safe(this.game, "OnAfterTakeDamage", () => this.brain.OnAfterTakeDamage(source));
  }
  /** SimpleNpc.Die → GetDropItemInfo (NPCDrop for the current player) */
  override die(): void {
    if (this.isLiving) this.game.npcDrop(this);
    super.die();
  }
  protected override onDied(): void {
    safe(this.game, "OnDie", () => this.brain.OnDie());
  }
  override collidedByObject(phy: Physics): void {
    if (phy instanceof SimpleBomb) phy.bomb();
  }
}

export class SimpleBoss extends TurnedLiving implements NpcLike {
  npcInfo: NpcInfo;
  brain!: ABrain;
  readonly child: SimpleNpc[] = [];
  /** damage per player (FindMostHatefulPlayer) */
  readonly hate = new Map<Living, number>();
  declare readonly game: PveGame;

  constructor(id: number, game: PveGame, info: NpcInfo, direction: number, type: number, action: string) {
    super(id, game, info.Camp, info.Name, info.Blood, direction);
    this.kind = "boss";
    this.npcInfo = info;
    this.livingType = type === 0 ? eLivingType.ClearEnemy : type === 1 ? eLivingType.SimpleBoss : type === 2 ? eLivingType.SimpleNpc1 : type === 3 ? eLivingType.BossSpecialDie : type;
    this.modelId = info.ModelID;
    this.actionStr = action ?? "";
    attachBrain(this, game, true);
  }
  reset(): void {
    resetFromInfo(this, this.npcInfo);
    this.delay = this.agility | 0; // TurnedLiving.Reset: non-players start at (int)Agility
  }
  override getShootPoint(): Point {
    return npcShootPoint(this);
  }
  override startMoving(): void {
    npcStartMoving(this, this.game);
    super.startMoving();
  }
  override onBeginNewTurn(): void {
    safe(this.game, "OnBeginNewTurn", () => this.brain.OnBeginNewTurn());
  }
  /** SimpleBoss.PrepareSelfTurn (SimpleBoss.cs:299): base, AddDelay(NpcInfo.Delay), brain */
  override prepareSelfTurn(): void {
    super.prepareSelfTurn();
    this.addDelay(this.npcInfo.Delay);
    safe(this.game, "OnBeginSelfTurn", () => this.brain.OnBeginSelfTurn());
  }
  override onStartAttacking(): void {
    safe(this.game, "OnStartAttacking", () => this.brain.OnStartAttacking());
  }
  override onStopAttacking(): void {
    safe(this.game, "OnStopAttacking", () => this.brain.OnStopAttacking());
  }
  /** SimpleBoss.StartAttacking (SimpleBoss.cs:313): the brain queues actions, the turn itself ends at once */
  override startAttacking(): void {
    super.startAttacking();
    if (this.isAttacking) this.stopAttacking();
  }
  override onBeforeTakedDamage(source: Living, d: { damage: number; critical: number }): void {
    const a = { v: d.damage }, b = { v: d.critical };
    safe(this.game, "OnBeforeTakedDamage", () => this.brain.OnBeforeTakedDamage(source, a, b));
    d.damage = a.v | 0;
    d.critical = b.v | 0;
  }
  override takeDamage(source: Living, d: { damage: number; critical: number }): boolean {
    const r = super.takeDamage(source, d);
    if (source.kind === "player") this.hate.set(source, (this.hate.get(source) ?? 0) + d.damage + d.critical);
    return r;
  }
  override onAfterTakedDamage(source: Living): void {
    safe(this.game, "OnAfterTakeDamage", () => this.brain.OnAfterTakeDamage(source));
  }
  protected override onDied(): void {
    safe(this.game, "OnDie", () => this.brain.OnDie());
  }
}

/** Phy/Object/PhysicalObj.cs */
export class PhysicalObj extends Physics {
  phyType = 0;
  name: string;
  model: string;
  currentAction: string;
  scale: number;
  rotation: number;
  typeEffect: number;
  canPenetrate: boolean;
  phyBringToFront: number;
  game: PveGame | null = null;
  readonly actionMapping = new Map<string, string>();

  constructor(id: number, name: string, model: string, defaultAction: string, scale: number, rotation: number, typeEffect = 0, canPenetrate = false) {
    super(id);
    this.name = name;
    this.model = model;
    this.currentAction = defaultAction;
    this.scale = scale;
    this.rotation = rotation;
    this.typeEffect = typeEffect;
    this.canPenetrate = canPenetrate;
    this.phyBringToFront = name === "hide" ? 6 : name === "top" ? 1 : name === "normal" ? 0 : -1;
  }
  override collidedByObject(phy: Physics): void {
    if (!this.canPenetrate && phy instanceof SimpleBomb) phy.bomb();
  }
}
export class Layer extends PhysicalObj {
  constructor(id: number, name: string, model: string, action: string, scale: number, rotation: number, canPenetrate = false) {
    super(id, name, model, action, scale, rotation, 0, canPenetrate);
    this.phyType = 2;
    this.setRect(0, 0, 0, 0);
  }
}
export class LayerTop extends PhysicalObj {}
export class Ball extends PhysicalObj {
  constructor(id: number, name: string, action: string, scale = 1, rotation = 0) {
    super(id, name, "", action, scale, rotation);
    this.setRect(-30, -30, 60, 60);
  }
}
export class TransmissionGate extends PhysicalObj {
  constructor(id: number, name: string, model: string, action: string, scale: number, rotation: number) {
    super(id, name, model, action, scale, rotation);
    this.phyType = 3;
  }
}
