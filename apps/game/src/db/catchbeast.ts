/** 145 ACTIVITY_SYSTEM sub 32-36 (Capturar Nian) persistence — `player."Sys_Users_CatchBeast"` (hand-added,
 *  m4-catchbeast, split out of `ActiveSystemInfo`'s 25-column grab-bag — see the table's own header comment in
 *  `packages/db/src/schema/player.ts`). One row per player. */
import { eq } from "drizzle-orm";
import { player, type Database } from "@ddt/db";

const C = player.Sys_Users_CatchBeast;
export type CatchBeastRow = typeof C.$inferSelect;

export function newCatchBeastRow(userId: number): CatchBeastRow {
  return { UserID: userId, ChallengeNum: 0, BuyBuffNum: 0, DamageNum: 0, BoxState: "1-1-1-1-1", LastEnterDay: "" };
}

export async function loadCatchBeastRow(db: Database, userId: number): Promise<CatchBeastRow | null> {
  const rows = await db.select().from(C).where(eq(C.UserID, userId)).limit(1);
  return rows[0] ?? null;
}

/** Upsert by UserID (PK, no identity column). */
export async function saveCatchBeastRow(db: Database, row: CatchBeastRow): Promise<CatchBeastRow> {
  const existing = await loadCatchBeastRow(db, row.UserID);
  if (existing) {
    await db.update(C).set(row).where(eq(C.UserID, row.UserID));
  } else {
    await db.insert(C).values(row);
  }
  return row;
}
