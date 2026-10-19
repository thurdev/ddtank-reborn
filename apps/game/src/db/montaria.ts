/**
 * Persistence of `player."Mount_Data"` (migration 0013, m1-schema; one row per player, created lazily at
 * first login — `PlayerBussiness.GetSingleMountData`/`AddMountDatas`/`UpdateMountData`).
 */
import { eq } from "drizzle-orm";
import { player, type Database } from "@ddt/db";
import type { MountDataRow } from "../game/montaria.js";

const M = player.Mount_Data;

export async function loadMountData(db: Database, userId: number): Promise<MountDataRow | null> {
  const rows = await db.select().from(M).where(eq(M.UserID, userId)).limit(1);
  return rows[0] ?? null;
}

/** PlayerHorse.SaveToDatabase: insert on first write (ID still 0), update by ID after that. */
export async function saveMountData(db: Database, row: MountDataRow): Promise<MountDataRow> {
  const { ID: _id, ...values } = row;
  if (row.ID > 0) {
    await db.update(M).set(values).where(eq(M.ID, row.ID));
    return row;
  }
  const [r] = await db.insert(M).values(values).returning({ ID: M.ID });
  return r ? { ...row, ID: r.ID } : row;
}
