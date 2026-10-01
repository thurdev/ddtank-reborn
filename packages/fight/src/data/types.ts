/** Template data the engine consumes (all supplied by the caller — no DB access). Field names mirror the DB columns. */

/** `Ball` table (`SqlDataProvider/Data/BallInfo.cs`). */
export interface BallInfo {
  id: number;
  name?: string;
  power: number;
  radii: number;
  mass: number;
  weight: number;
  wind: number;
  dragIndex: number;
  amount: number;
  delay: number;
  hasTunnel: boolean;
  flyingPartical: string;
}

/** `BallConfig` table: weapon template → balls. */
export interface BallConfigInfo {
  templateId: number;
  common: number;
  special: number;
  commonAddWound: number;
  commonMultiBall: number;
}

/** Item template subset for fight props / weapons (`Shop_Goods` Property1..8). */
export interface ItemTemplate {
  templateId: number;
  name?: string;
  property1: number;
  property2: number;
  property3: number;
  property4: number;
  property5: number;
  property6: number;
  property7: number;
  property8: number;
}

/** `BallInfo.IsSpecial()` (BallInfo.cs:49) — special balls never dig. */
const SPECIAL = new Set([
  1, 3, 5, 16, 59, 64, 97, 98, 110, 117, 10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010, 10011, 10012,
  10013, 10014, 10015, 10016, 10017, 10018,
]);
export function isSpecialBall(id: number): boolean {
  return SPECIAL.has(id);
}

/** `BombType` + `BallMgr.GetBallType` (BallMgr.cs:45-72). */
export const BombType = { Normal: 0, FORZEN: 1, FLY: 2, CURE: 3, WORLDCUP: 30, CATCHINSECT: 31 } as const;
export type BombType = (typeof BombType)[keyof typeof BombType];
export function getBallType(ballId: number): BombType {
  switch (ballId) {
    case 1:
    case 56:
    case 99:
      return BombType.FORZEN;
    case 3:
      return BombType.FLY;
    case 5:
    case 59:
    case 64:
    case 97:
    case 98:
    case 120:
    case 10009:
      return BombType.CURE;
    case 110:
    case 117:
      return BombType.WORLDCUP;
    case 128:
    case 129:
      return BombType.CATCHINSECT;
    default:
      return BombType.Normal;
  }
}

/** `ActionType` (Phy/Actions/ActionType.cs) — BombAction types inside FIRE. */
export const ActionType = {
  NULLSHOOT: -1,
  PICK: 1,
  BOMB: 2,
  START_MOVE: 3,
  FLY_OUT: 4,
  KILL_PLAYER: 5,
  TRANSLATE: 6,
  FORZEN: 7,
  CHANGE_SPEED: 8,
  UNFORZEN: 9,
  DANDER: 10,
  CURE: 11,
  DEFENCE: 12,
  UNANGLE: 13,
  DO_ACTION: 14,
  PLAYBUFFER: 15,
  Laser: 16,
  BOMBED: 17,
  PUP: 18,
  AUP: 19,
  PET: 20,
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];
