import type { BallInfo, ItemTemplate } from "../data/types.js";
import { getBallType, BombType, isSpecialBall } from "../data/types.js";
import { f32, int } from "../math/num.js";
import { LivingBody, type Physics } from "../phy/physics.js";
import { type Point, isEmptyPoint } from "../phy/rect.js";
import { SimpleBomb } from "../phy/bomb.js";
import { hertAddition, turnDelay, turnEnergy } from "./formulas.js";
import type { BaseGame } from "./game.js";

/** Game.Logic/LivingConfig.cs — PascalCase on purpose: donor scripts set these fields directly. */
export class LivingConfig {
  HaveShield = false;
  IsShowBloodBar = false;
  IsWorldBoss = false;
  BallCanDamage = 0;
  MinBlood = 0;
  KeepLife = false;
  FirstStepMove = 0;
  MaxStepMove = 0;
  CompleteStep = false;
  CanHeal = false;
  CanTakeDamage = true;
  DamageForzen = false;
  isBotom = 1;
  isConsortiaBoss = false;
  IsFly = false;
  IsHelper = false;
  isShowBlood = true;
  isShowSmallMapPoint = true;
  IsTurn = true;
  ReduceBloodStart = 1;
  CanFrost = false;
  CanCountKill = true;
  CanCollied = true;
  CancelGuard = false;
  IsGoal = false;
  FriendlyBoss = { ID: 0, CanShareDamage: false, ActionStr: "" };
}

/** Turn-counted effects (Effects/IceFronzeEffect.cs, HideEffect.cs, NoHoleEffect.cs, SealEffect.cs). */
export type EffectKind = "ice" | "hide" | "nohole" | "seal";

/** Port of the combat-relevant part of `Game.Logic/Living.cs`. */
export class Living extends LivingBody {
  readonly game: BaseGame;
  name: string;
  blood: number;
  maxBlood: number;
  grade = 1;
  agility = 0;
  attack = 0;
  defence = 0;
  lucky = 0;
  baseDamage = 0;
  baseGuard = 0;
  currentDamagePlus = 1;
  currentShootMinus = 1;
  ignoreArmor = false;
  controlBall = false;
  noHoleTurn = false;
  addArmor = false;
  blockTurn = false;
  keepLife = false;
  syncAtTime = true;
  isAttacking = false;
  currentIsHitTarget = false;
  totalHurt = 0;
  totalKill = 0;
  totalShootCount = 0;
  totalHitTargetCount = 0;
  totalCure = 0;
  reduceCrit = 0;
  critRate = 0;
  guildAddCritical = 0;
  turnNum = 0;
  /** PvE fields (Living.cs): config, NPC fire offset, melee range, say flag, exp given when killed */
  config = new LivingConfig();
  fireX = 0;
  fireY = 0;
  maxBeatDis = 100;
  isSay = false;
  experience = 0;
  /** eLivingType byte sent in ADD_LIVING (64) */
  livingType = 0;
  modelId = "";
  actionStr = "";
  /** Living.LastLifeTimeShoot: ms the last shot flies (ShootPoint callbacks) */
  lastLifeTimeShoot = 0;
  readonly effects = new Map<EffectKind, number>();
  private _frost = false;
  private _hide = false;
  private _noHole = false;
  private _seal = false;

  constructor(id: number, game: BaseGame, team: number, name: string, maxBlood: number, direction: number) {
    super(id);
    this.game = game;
    this.team = team;
    this.name = name;
    this.maxBlood = maxBlood;
    this.blood = maxBlood;
    this.direction = direction;
  }

  get isFrost(): boolean {
    return this._frost;
  }
  set isFrost(v: boolean) {
    if (this._frost !== v) {
      this._frost = v;
      if (this.syncAtTime) this.game.emit({ cmd: "FROST", livingId: this.id, state: v });
    }
  }
  get isHide(): boolean {
    return this._hide;
  }
  set isHide(v: boolean) {
    if (this._hide !== v) {
      this._hide = v;
      if (this.syncAtTime) this.game.emit({ cmd: "HIDE", livingId: this.id, state: v });
    }
  }
  get isNoHole(): boolean {
    return this._noHole;
  }
  set isNoHole(v: boolean) {
    if (this._noHole !== v) {
      this._noHole = v;
      if (this.syncAtTime) this.game.emit({ cmd: "NONOLE", livingId: this.id, state: v });
    }
  }
  get isSeal(): boolean {
    return this._seal;
  }
  set isSeal(v: boolean) {
    if (this._seal !== v) {
      this._seal = v;
      if (this.syncAtTime) this.game.emit({ cmd: "PLAYER_PROPERTY", livingId: this.id, type: "silenceMany", state: v ? "True" : "False" });
    }
  }

  /** AbstractEffect.Start: an effect of the same type only refreshes its counter. */
  startEffect(kind: EffectKind, count: number): boolean {
    const had = this.effects.has(kind);
    this.effects.set(kind, count);
    if (!had) this.setEffectFlag(kind, true);
    return true;
  }
  stopEffect(kind: EffectKind): void {
    if (this.effects.delete(kind)) this.setEffectFlag(kind, false);
  }
  private setEffectFlag(kind: EffectKind, v: boolean): void {
    if (kind === "ice") this.isFrost = v;
    else if (kind === "hide") this.isHide = v;
    else if (kind === "nohole") this.isNoHole = v;
    else this.isSeal = v;
  }
  /** BeginSelfTurn handlers: ice stops when count < 0, the others when ≤ 0. */
  protected tickEffects(): void {
    for (const [k, c] of [...this.effects]) {
      const n = c - 1;
      this.effects.set(k, n);
      if (k === "ice" ? n < 0 : n <= 0) this.stopEffect(k);
    }
  }

  override collidedByObject(phy: Physics): void {
    if (phy instanceof SimpleBomb) phy.bomb();
  }

  /** Living.AddBlood (Living.cs:672) */
  addBlood(value: number, type = 0): number {
    this.blood += value;
    if (this.blood > this.maxBlood) this.blood = this.maxBlood;
    if (this.syncAtTime) this.game.emit({ cmd: "HEALTH", livingId: this.id, type, blood: this.blood, value });
    if (this.blood <= 0) this.die();
    return value;
  }

  /** Living.TakeDamage (Living.cs:2117-2188). `d` is mutated like the C# `ref` params. */
  takeDamage(source: Living, d: { damage: number; critical: number }): boolean {
    let result = false;
    if (this.config.IsHelper && this.kind !== "player" && source.kind === "player") return false;
    if (!this.isFrost && this.blood > 0) {
      if (source !== this || source.team === this.team) this.onBeforeTakedDamage(source, d);
      let total = d.damage + d.critical >= 0 ? d.damage + d.critical : 0;
      if (this instanceof Player && total !== 0) total -= int((total * this.reduceDamePlus) / 100);
      this.blood -= total >= 0 ? total : 0;
      if (this.syncAtTime) this.game.emit({ cmd: "HEALTH", livingId: this.id, type: 1, blood: this.blood, value: total });
      this.onAfterTakedDamage(source);
      if (this.blood <= 0 && (this.keepLife || this.config.KeepLife)) this.blood = 1;
      if (this.blood <= 0) this.die();
      source.onAfterKillingLiving(this, d.damage, d.critical);
      result = true;
    }
    this.stopEffect("ice");
    this.stopEffect("hide");
    this.stopEffect("nohole");
    return result;
  }

  /** Living.OnAfterKillingLiving (Living.cs:1283) */
  onAfterKillingLiving(target: Living, damage: number, critical: number): void {
    if (target.team !== this.team) {
      this.currentIsHitTarget = true;
      this.totalHurt += damage + critical;
      if (!target.isLiving) this.totalKill++;
      this.game.totalHurt += damage + critical;
    }
  }

  /** Living.Die (Living.cs:897) */
  override die(): void {
    if (this.blood > 0) {
      this.blood = 0;
      if (this.syncAtTime) this.game.emit({ cmd: "HEALTH", livingId: this.id, type: 6, blood: 0, value: 0 });
    }
    if (this.isLiving) {
      if (this.isAttacking) this.stopAttacking();
      super.die();
      this.onDied();
      this.game.onLivingDied(this);
      this.game.checkState(0);
    }
  }
  protected onDied(): void {}
  /** brain hooks (SimpleNpc/SimpleBoss override) */
  onBeforeTakedDamage(_source: Living, _d: { damage: number; critical: number }): void {}
  onAfterTakedDamage(_source: Living): void {}
  onStartAttacking(): void {}
  onStopAttacking(): void {}
  onBeginSelfTurn(): void {}
  onBeginNewTurn(): void {}

  startAttacking(): void {
    if (!this.isAttacking) {
      this.isAttacking = true;
      this.onStartAttacking();
    }
  }
  stopAttacking(): void {
    if (this.isAttacking) {
      this.isAttacking = false;
      this.onStopAttacking();
      this.game.onEndAttacking(this);
    }
  }

  /** Living.PrepareNewTurn (Living.cs:1570) */
  override prepareNewTurn(): void {
    this.currentDamagePlus = 1;
    this.currentShootMinus = 1;
    this.ignoreArmor = false;
    this.controlBall = false;
    this.noHoleTurn = false;
    this.currentIsHitTarget = false;
    this.onBeginNewTurn();
  }
  prepareSelfTurn(): void {
    this.tickEffects();
    this.onBeginSelfTurn();
  }

  /** Living.GetShootPoint (Living.cs:1062) — player variant */
  getShootPoint(): Point {
    return this.direction <= 0 ? { x: this.x + this.bound.x - 30, y: this.y + this.bound.y - 20 } : { x: this.x - this.bound.x + 30, y: this.y + this.bound.y - 20 };
  }

  /** Living.IsFriendly */
  isFriendly(l: Living): boolean {
    return !l.isHelper && !l.config.IsHelper && !(l instanceof Player) && l.team === this.team;
  }
}

/** Phy/Object/TurnedLiving.cs */
export class TurnedLiving extends Living {
  delay = 0;
  defaultDelay = 0;
  dander = 0;
  psychic = 999;
  petMP = 10;

  getTurnDelay(): number {
    return turnDelay(this.agility, this.attack);
  }
  /** TurnedLiving.AddDelay (TurnedLiving.cs:132): in PvE the delay becomes MissionInfo.IncrementDelay */
  addDelay(v: number): void {
    const inc = this.game.pveIncrementDelay();
    if (inc !== null) this.delay = inc;
    else this.delay += v;
  }
  addDander(v: number): void {
    if (v > 0 && this.isLiving) this.setDander(this.dander + v);
  }
  setDander(v: number): void {
    this.dander = Math.min(v, 200);
    if (this.syncAtTime) this.game.emit({ cmd: "DANDER", livingId: this.id, dander: this.dander });
  }
  addPetMP(v: number): void {
    if (v > 0 && this.isLiving) this.petMP = Math.min(100, this.petMP + v);
  }
  override prepareSelfTurn(): void {
    this.defaultDelay = this.delay;
    if (this.isFrost || this.blockTurn) this.addDelay(this.getTurnDelay());
    super.prepareSelfTurn();
  }
}

/** Everything the engine needs about a player (from the lobby/DB, already computed — no I/O). */
export interface PlayerSpec {
  userId: number;
  nickname: string;
  team: number;
  grade: number;
  attack: number;
  defence: number;
  agility: number;
  lucky: number;
  /** GamePlayer.GetBaseAttack() (+DameAddPlus) */
  baseAttack: number;
  /** GamePlayer.GetBaseDefence() (+GuardAddPlus) */
  baseDefence: number;
  hp: number;
  weapon: { templateId: number; property8: number; refineryLevel?: number };
  deputyWeapon?: { template: ItemTemplate; strengthenLevel: number } | null;
  /** % damage reduction from equipment/suit (PlayerInfo.ReduceDamePlus) */
  reduceDamePlus?: number;
  isBot?: boolean;
  isVip?: boolean;
  /** fight bag / prop templates allowed for this player (default: all known props) */
  props?: number[];
  inGuild?: boolean;
}

const ALLOWED_SPECIAL_ITEMS = [10009, 10010, 10011, 10012, 10018, 10021];

/** Port of `Phy/Object/Player.cs` (combat parts). */
export class Player extends TurnedLiving {
  readonly spec: PlayerSpec;
  energy = 0;
  shootCount = 1;
  ballCount = 1;
  currentBall!: BallInfo;
  mainBallId = 0;
  spBallId = 0;
  addWoundBallId = 0;
  multiBallId = 0;
  prop = 0;
  canFly = true;
  isSpecialSkill = false;
  isBombOrIgnoreArmor = 0;
  loadingProcess = 0;
  isActive = true;
  vaneOpen: boolean;
  useItemCount = 0;
  deputyWeaponResCount = 0;
  gainOffer = 0;
  killedPunishmentOffer = 0;
  reduceDamePlus: number;
  readonly itemFightBag = new Map<number, number>();
  targetPoint: Point = { x: 0, y: 0 };

  constructor(id: number, game: BaseGame, spec: PlayerSpec) {
    super(id, game, spec.team, spec.nickname, spec.hp, 1);
    this.spec = spec;
    this.setRect(-15, -20, 30, 30);
    this.grade = spec.grade;
    this.vaneOpen = !!spec.isBot || spec.grade >= 9;
    this.reduceDamePlus = spec.reduceDamePlus ?? 0;
    this.deputyWeaponResCount = spec.deputyWeapon ? spec.deputyWeapon.strengthenLevel + 1 : 0;
  }

  /** Player.Reset (Player.cs:2205): stats from the spec, full blood, main weapon balls. */
  reset(): void {
    const s = this.spec;
    this.attack = s.attack;
    this.defence = s.defence;
    this.agility = s.agility;
    this.lucky = s.lucky;
    this.baseDamage = s.baseAttack;
    this.baseGuard = s.baseDefence;
    this.maxBlood = s.hp;
    this.blood = s.hp;
    this.isLiving = true;
    this.delay = this.getTurnDelay();
    this.setDanderQuiet(0);
    this.setCurrentWeapon(s.weapon.templateId, false);
    this.energy = turnEnergy(this.agility);
  }
  private setDanderQuiet(v: number): void {
    this.dander = v;
  }

  /** Player.SetCurrentWeapon (Player.cs:2361) */
  setCurrentWeapon(templateId: number, send = true): void {
    const cfg = this.game.assets.ballConfigs.get(templateId);
    this.mainBallId = cfg?.common ?? 0;
    this.spBallId = cfg?.special ?? this.mainBallId;
    this.addWoundBallId = cfg?.commonAddWound ?? this.mainBallId;
    this.multiBallId = cfg?.commonMultiBall ?? this.mainBallId;
    if (!this.currentBall || !send) this.currentBall = this.game.ball(this.mainBallId);
    else this.setBall(this.mainBallId);
  }

  /** Player.SetBall (Player.cs:2345) */
  setBall(ballId: number, special = false): void {
    if (ballId !== this.currentBall.id) {
      const b = this.game.assets.ball(ballId);
      if (b) this.currentBall = b;
      this.game.emit({ cmd: "CHANGE_BALL", livingId: this.id, special, ballId: this.currentBall.id });
    }
  }

  setShootCount(v: number): void {
    if (this.shootCount !== v) {
      this.shootCount = v;
      this.game.emit({ cmd: "ADDATTACK", livingId: this.id, shootCount: v });
    }
  }

  /** Player.PrepareNewTurn (Player.cs:2105) */
  override prepareNewTurn(): void {
    this.itemFightBag.clear();
    if (this.currentIsHitTarget) this.totalHitTargetCount++;
    this.energy = turnEnergy(this.agility);
    this.shootCount = 1;
    this.ballCount = 1;
    this.isSpecialSkill = false;
    this.mainWeaponReset();
    this.canFly = true;
    super.prepareNewTurn();
  }
  private mainWeaponReset(): void {
    this.setCurrentWeapon(this.spec.weapon.templateId, false);
    if (this.currentBall.id !== this.mainBallId) this.currentBall = this.game.ball(this.mainBallId);
  }

  override prepareSelfTurn(): void {
    this.addArmor = false;
    super.prepareSelfTurn();
    this.useItemCount = 0;
    this.defaultDelay = this.delay;
  }

  /** Player.StartAttacking (Player.cs:2624): healstone not modelled. */
  override startAttacking(): void {
    if (this.isAttacking) return;
    this.addDelay(this.getTurnDelay());
    super.startAttacking();
  }

  /** Player.PrepareShoot (Player.cs:2169) */
  prepareShoot(speedTime: number): void {
    const cap = this.game.timeType;
    this.addDelay((speedTime > cap ? cap : speedTime) * 20);
    this.totalShootCount++;
  }

  /**
   * Player.SetXY (Player.cs:2380). The original subtracts `|m_x - x|` *after* assigning m_x (always 0 — energy never
   * drops server-side). We charge the real distance so the server can validate moves (see README "Deviations").
   */
  override setXY(x: number, y: number): void {
    if (this._x === x && this._y === y) return;
    const dx = Math.abs(this._x - x);
    super.setXY(x, y);
    if (this.isLiving) this.energy -= dx;
  }
  /** position change that never costs energy (spawn, falls, teleport) */
  place(x: number, y: number): void {
    super.setXY(x, y);
  }

  /** Player.StartMoving (Player.cs:2678): snap to the ground below; no ground → die. */
  override startMoving(): void {
    if (!this.map) return;
    const p = this.map.findYLineNotEmptyPointDown(this._x, this._y);
    if (isEmptyPoint(p)) {
      if (this.map.ground) this._y = this.map.ground.height;
      this.syncAtTime = false;
      this.die();
      this.syncAtTime = true;
    } else {
      this._x = p.x;
      this._y = p.y;
    }
  }

  /** Player.TakeDamage (Player.cs:2733) */
  override takeDamage(source: Living, d: { damage: number; critical: number }): boolean {
    if ((source === this || source.team === this.team) && d.damage + d.critical >= this.blood) {
      d.damage = this.blood - 1;
      d.critical = 0;
    }
    const r = super.takeDamage(source, d);
    if (this.isLiving) this.addDander(int((int((d.damage * 2) / 5) + 5) / 2));
    return r;
  }

  /** Player.Die lifts the ghost by 70 px (Player.cs:671) */
  protected override onDied(): void {
    this._y -= 70;
  }

  /** Player.Shoot (Player.cs:2414-2544) */
  shoot(x: number, y: number, force: number, angle: number): boolean {
    if (this.shootCount <= 0) return false;
    let id = this.currentBall.id;
    if (this.ballCount === 1 && !this.isSpecialSkill && this.isBombOrIgnoreArmor === 0) {
      if (this.prop === 20002) id = this.multiBallId;
      if (this.prop === 20008) id = this.addWoundBallId;
    }
    if (this.isSpecialSkill) this.controlBall = false;
    if (this.isBombOrIgnoreArmor === 1) this.ignoreArmor = true;
    else if (this.isBombOrIgnoreArmor === 2) id = 4;
    if (getBallType(id) === BombType.CURE) {
      this.ballCount = 1;
      this.setShootCount(1);
    }
    if (!this.game.shootImp(this, id, x, y, force, angle, this.ballCount, this.shootCount)) return false;
    if (this.isBombOrIgnoreArmor === 1) this.ignoreArmor = false;
    this.isBombOrIgnoreArmor = 0;
    this.shootCount--;
    if (this.shootCount <= 0 || !this.isLiving) {
      this.stopAttacking();
      this.addDelay(this.currentBall.delay + this.spec.weapon.property8);
      this.addDander(20);
      this.addPetMP(10);
      this.prop = 0;
    }
    return true;
  }

  /** Player.Skip (Player.cs:2546) */
  skip(): void {
    if (!this.isAttacking) return;
    this.game.emit({ cmd: "SKIPNEXT", livingId: this.id });
    this.prop = 0;
    this.addDelay(100);
    this.addDander(20);
    this.addPetMP(10);
    this.stopAttacking();
    this.game.checkState(0);
  }

  /** Player.CheckCanUseItem (Player.cs:605) — stacking rules for the attack props. */
  checkCanUseItem(templateId: number): boolean {
    const b = this.itemFightBag;
    switch (templateId) {
      case 10001:
        if (b.has(10003) && b.has(10002)) return false;
        if ((b.get(10001) ?? 0) >= 2) return false;
        break;
      case 10002:
        if (b.has(10003) && b.has(10001)) return false;
        if ((b.get(10002) ?? 0) >= 2) return false;
        break;
      case 10003:
        if (b.has(10024) || b.has(10025)) return false;
        if (b.has(10001) && b.has(10002)) return false;
        break;
    }
    b.set(templateId, (b.get(templateId) ?? 0) + 1);
    return true;
  }

  /** Player.CanUseItem (Player.cs:537) */
  canUseItem(item: ItemTemplate): boolean {
    if (isSpecialBall(this.currentBall.id) && !ALLOWED_SPECIAL_ITEMS.includes(item.templateId)) return false;
    if (this.energy < item.property4) return false;
    if (!this.isAttacking) return false;
    return true;
  }

  /** Player.UseItem (Player.cs:2770) + SpellMgr dispatch */
  useItem(item: ItemTemplate): boolean {
    this.useItemCount++;
    if (!this.canUseItem(item)) return false;
    this.energy -= item.property4;
    this.delay += item.property5;
    this.game.emit({ cmd: "PROP", livingId: this.id, type: -2 & 0xff, place: -2, templateId: item.templateId, userLivingId: this.id });
    this.game.executeSpell(this, item);
    return true;
  }

  /** Player.UseFlySkill (Player.cs:2758) */
  useFlySkill(): void {
    if (!this.canFly) return;
    this.useItemCount++;
    this.game.emit({ cmd: "PROP", livingId: this.id, type: -2 & 0xff, place: -2, templateId: 10016, userLivingId: this.id });
    this.setBall(3);
  }

  /** Player.UseSpecialSkill (Player.cs:2851) + StuntCommand (CurrentShootMinus *= ball.Power) */
  useSpecialSkill(): boolean {
    if (this.useItemCount > 15 || this.dander < 200) return false;
    this.useItemCount = 9999;
    this.setBall(this.spBallId, true);
    this.isSpecialSkill = true;
    this.ballCount = this.currentBall.amount;
    this.setDander(0);
    this.currentShootMinus = f32(this.currentShootMinus * this.currentBall.power);
    return true;
  }

  /** Player.UseSecondWeapon (Player.cs:2812): shield (Property3 == 31) or healing gun. */
  useSecondWeapon(): boolean {
    const dw = this.spec.deputyWeapon;
    this.useItemCount++;
    if (!dw || !this.canUseItem(dw.template) || this.deputyWeaponResCount <= 0) return false;
    if (dw.template.property3 === 31) {
      this.addArmor = true;
    } else {
      this.setCurrentWeapon(dw.template.templateId);
    }
    this.setShootCount(1);
    this.energy -= dw.template.property4;
    this.delay += dw.template.property5;
    this.game.emit({ cmd: "PROP", livingId: this.id, type: -2 & 0xff, place: -2, templateId: dw.template.templateId, userLivingId: this.id });
    this.deputyWeaponResCount--;
    this.game.emit({ cmd: "USE_DEPUTY_WEAPON", livingId: this.id, remaining: this.deputyWeaponResCount });
    return true;
  }

  /** H for AddArmor (Living.cs:998) */
  armorBonus(): number {
    const dw = this.spec.deputyWeapon;
    return this.addArmor && dw ? hertAddition(dw.template.property7, dw.strengthenLevel) : 0;
  }
}
