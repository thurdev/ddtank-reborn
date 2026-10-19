/** 277 RESCUE persistence — `player."Sys_Users_Rescue"` (hand-added, m4-resgate, no vendor equivalent at
 *  all — see the table's own header comment in `packages/db/src/schema/player.ts`). One row per player. */
import { eq } from "drizzle-orm";
import { player, type Database } from "@ddt/db";

const R = player.Sys_Users_Rescue;
export type RescueRow = typeof R.$inferSelect;

export function newRescueRow(userId: number): RescueRow {
  return { UserID: userId, Arrow: 0, BloodPack: 0, KingBless: 0, SceneData: "", LastFreeDay: "" };
}

export async function loadRescueRow(db: Database, userId: number): Promise<RescueRow | null> {
  const rows = await db.select().from(R).where(eq(R.UserID, userId)).limit(1);
  return rows[0] ?? null;
}

/** Upsert by UserID (PK, no identity column — unlike Dice_Data there's no separate surrogate ID to branch on). */
export async function saveRescueRow(db: Database, row: RescueRow): Promise<RescueRow> {
  const existing = await loadRescueRow(db, row.UserID);
  if (existing) {
    await db.update(R).set(row).where(eq(R.UserID, row.UserID));
  } else {
    await db.insert(R).values(row);
  }
  return row;
}
