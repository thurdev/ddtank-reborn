import { eTankCmdType } from "@ddt/protocol/codes";
import type { BombAction } from "../phy/bomb.js";

/**
 * Outgoing events. Every event is one GAME_CMD (91) packet: `code` = first body byte (`eTankCmdType`), `livingId` =
 * header Parameter1, fields named/ordered after the C# writer cited on each type. `except` = living id that must
 * NOT receive it (SendToAll(pkg, except)); `to` = only these living ids (SendTCP to one player).
 */
interface Ev<C extends keyof typeof eTankCmdType> {
  cmd: C;
  code: (typeof eTankCmdType)[C];
  livingId: number;
  except?: number;
  to?: number[];
}

/** BaseGame.SendCreateGame (BaseGame.cs:2037) — the lobby part of each player block is filled by the server. */
export interface GameCreateEvent extends Ev<"GAME_CREATE"> {
  roomType: number;
  gameType: number;
  timeType: number;
  players: { userId: number; team: number; livingId: number; maxBlood: number }[];
}
/** BaseGame.SendStartLoading (BaseGame.cs:2916) */
export interface GameLoadEvent extends Ev<"GAME_LOAD"> {
  maxTime: number;
  mapId: number;
}
/** LoadCommand.cs:13 rebroadcast: i32 progress, i32 zoneId, i32 userId */
export interface LoadEvent extends Ev<"LOAD"> {
  progress: number;
  userId: number;
}
/** BaseGame.cs:2955 */
export interface SyncLifetimeEvent extends Ev<"SYNC_LIFETIME"> {
  lifeTime: number;
}
export interface StartGamePlayer {
  id: number;
  x: number;
  y: number;
  direction: number;
  blood: number;
  maxBlood: number;
  team: number;
  weaponRefineryLevel: number;
  powerRatio: number;
  dander: number;
  buffs: { type: number; value: number }[];
  isFrost: boolean;
  isHide: boolean;
  isNoHole: boolean;
}
/** PVPGame.StartGame (PVPGame.cs:786-829), followed by `date now` */
export interface StartGameEvent extends Ev<"START_GAME"> {
  players: StartGamePlayer[];
}
export interface TurnPlayer {
  id: number;
  isLiving: boolean;
  x: number;
  y: number;
  blood: number;
  isNoHole: boolean;
  energy: number;
  psychic: number;
  dander: number;
  petMaxMP: number;
  petMP: number;
  shootCount: number;
  flyCount: number;
}
/** BaseGame.SendGameNextTurn (BaseGame.cs:2190-2238) */
export interface TurnEvent extends Ev<"TURN"> {
  windPositive: boolean;
  vane1: number;
  vane2: number;
  vane3: number;
  isHide: boolean;
  turnTime: number;
  boxes: { id: number; x: number; y: number; type: number }[];
  players: TurnPlayer[];
  turnIndex: number;
}
export interface FireBomb {
  bombCount: number;
  shootCount: number;
  digMap: boolean;
  bombId: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ballId: number;
  flyingPartical: string;
  /** Radii*1000/4 */
  radii: number;
  /** (int)Power*1000 */
  power: number;
  actions: BombAction[];
}
/** Living.ShootImp (Living.cs:1761-1870) */
export interface FireEvent extends Ev<"FIRE"> {
  wind10: number;
  windPositive: boolean;
  vane1: number;
  vane2: number;
  vane3: number;
  bombs: FireBomb[];
  /** pet block: list of [p1,p2,p4,p3] + trailing flag (we never have pets → `[]`, flag 0) */
  petActions: number[][];
  petFlag: number;
}
/** BaseGame.SendGameUpdateHealth (BaseGame.cs:2340): u8 type, i32 blood, i32 value */
export interface HealthEvent extends Ev<"HEALTH"> {
  type: number;
  blood: number;
  value: number;
}
export interface DanderEvent extends Ev<"DANDER"> {
  dander: number;
}
export interface DirectionEvent extends Ev<"DIRECTION"> {
  direction: number;
}
/** BaseGame.cs:2722 (rebroadcast/correction): bool false?, u8 type, i32 x, i32 y, u8 dir, bool isLiving */
export interface MoveStartEvent extends Ev<"MOVESTART"> {
  type: number;
  x: number;
  y: number;
  dir: number;
  isLiving: boolean;
}
export interface SkipNextEvent extends Ev<"SKIPNEXT"> {}
/** BaseGame.cs:2865: u8 type, i32 place, i32 templateId, i32 userLivingId, bool templateId==10017 */
export interface PropEvent extends Ev<"PROP"> {
  type: number;
  place: number;
  templateId: number;
  userLivingId: number;
}
export interface ChangeBallEvent extends Ev<"CHANGE_BALL"> {
  special: boolean;
  ballId: number;
}
export interface StateEvent<C extends "FROST" | "HIDE" | "NONOLE"> extends Ev<C> {
  state: boolean;
}
/** BaseGame.cs:2396: i32 wind*10, bool >0, u8 vane1, u8 vane2, u8 vane3 */
export interface VaneEvent extends Ev<"VANE"> {
  wind10: number;
  windPositive: boolean;
  vane1: number;
  vane2: number;
  vane3: number;
}
export interface AddAttackEvent extends Ev<"ADDATTACK"> {
  shootCount: number;
}
export interface FireTagEvent extends Ev<"FIRE_TAG"> {
  hasTime: boolean;
  speedTime: number;
}
export interface UseDeputyWeaponEvent extends Ev<"USE_DEPUTY_WEAPON"> {
  remaining: number;
}
export interface BotCommandEvent extends Ev<"BOT_COMMAND"> {}
export interface PlayerPropertyEvent extends Ev<"PLAYER_PROPERTY"> {
  type: string;
  state: string;
}
export interface GameOverPlayer {
  id: number;
  userId: number;
  win: boolean;
  grade: number;
  /** total GP after the game (server fills from its own player) */
  gp: number;
  totalKill: number;
  gpGained: number;
  hitCount: number;
  psychic: number;
  vipBonus: number;
  reward: number;
  offer: number;
  isVip: boolean;
  gainOffer: number;
  canTakeOut: number;
  /** extra Match rewards (not in the packet; for the server to apply) */
  money: number;
  giftToken: number;
  totalHurt: number;
}
/** PVPGame.GameOver (PVPGame.cs:522-549) */
export interface GameOverEvent extends Ev<"GAME_OVER"> {
  winTeam: number;
  players: GameOverPlayer[];
  riches: number;
}

export type FightEvent =
  | GameCreateEvent
  | GameLoadEvent
  | LoadEvent
  | SyncLifetimeEvent
  | StartGameEvent
  | TurnEvent
  | FireEvent
  | HealthEvent
  | DanderEvent
  | DirectionEvent
  | MoveStartEvent
  | SkipNextEvent
  | PropEvent
  | ChangeBallEvent
  | StateEvent<"FROST">
  | StateEvent<"HIDE">
  | StateEvent<"NONOLE">
  | VaneEvent
  | AddAttackEvent
  | FireTagEvent
  | UseDeputyWeaponEvent
  | BotCommandEvent
  | PlayerPropertyEvent
  | GameOverEvent;

type DistOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
/** event without `code` (filled from `cmd`) */
export type FightEventInit = DistOmit<FightEvent, "code">;

export function withCode(e: FightEventInit): FightEvent {
  return { ...e, code: eTankCmdType[e.cmd] } as FightEvent;
}

/** Incoming player actions (C→S GAME_CMD payloads, already parsed). */
export type FightCommand =
  | { cmd: "LOAD"; progress: number }
  | { cmd: "FIRE"; x: number; y: number; force: number; angle: number }
  | { cmd: "FIRE_TAG"; hasTime: boolean; speedTime: number }
  | { cmd: "SKIPNEXT"; spendTime: number }
  | { cmd: "DIRECTION"; direction: number }
  | { cmd: "MOVESTART"; type: number; x: number; y: number; dir: number; isLiving: boolean; turnIndex?: number }
  | { cmd: "PROP"; bag: number; place: number; templateId: number }
  | { cmd: "STUNT" }
  | { cmd: "AIRPLANE" }
  | { cmd: "SUICIDE" }
  | { cmd: "USE_DEPUTY_WEAPON" }
  | { cmd: "GHOST_TARGET"; x: number; y: number }
  | { cmd: "BOT_COMMAND" };
