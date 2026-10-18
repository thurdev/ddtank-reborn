/** 134 DICE_SYSTEM persistence — `player."Dice_Data"` (DiceDataInfo, 37 real rows in the source .bak — the
 *  table existed since m1-schema, just never got writers) + `game."Dice_Level_Award"` (DiceLevelAwardInfo,
 *  5 real rows, one per level 1-5). `game."Dice_Game_Award"`/`DiceGameAwardMgr` is a SEPARATE, unrelated
 *  table (a rank-based leaderboard payout, `GameProperties.DiceGameAwardAndCount`) never referenced by
 *  `DiceHandler.cs` — not used here. */
import { eq } from "drizzle-orm";
import { game, player, type Database } from "@ddt/db";

const D = player.Dice_Data;
export type DiceDataRow = typeof D.$inferSelect;

export function newDiceData(userId: number): DiceDataRow {
  return { ID: 0, UserID: userId, LuckIntegral: 0, LuckIntegralLevel: -1, Level: 0, FreeCount: 3, CurrentPosition: 0, UserFirstCell: false, AwardArray: "" };
}

export async function loadDiceData(db: Database, userId: number): Promise<DiceDataRow | null> {
  const rows = await db.select().from(D).where(eq(D.UserID, userId)).limit(1);
  return rows[0] ?? null;
}

/** Upsert by ID (new rows get `ID: 0` from `newDiceData`, so a fresh insert path is taken once). */
export async function saveDiceData(db: Database, row: DiceDataRow): Promise<DiceDataRow> {
  const { ID, ...rest } = row;
  if (ID > 0) {
    await db.update(D).set(rest).where(eq(D.ID, ID));
    return row;
  }
  const [inserted] = await db.insert(D).values(rest).returning();
  return inserted!;
}

const LA = game.Dice_Level_Award;
export type DiceLevelAwardRow = typeof LA.$inferSelect;

/** `DiceLevel` is 1-indexed in the DB (`DiceLevelAwardMgr.FindDiceLevelAward(i+1)` for in-memory index `i`). */
export async function loadDiceLevelAward(db: Database, diceLevel: number): Promise<DiceLevelAwardRow[]> {
  return db.select().from(LA).where(eq(LA.DiceLevel, diceLevel));
}
