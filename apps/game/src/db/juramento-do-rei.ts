/**
 * db helpers shared by `handlers/progressao/juramento-do-rei.ts` (142 KING_BLESS_MAIN / 143
 * KING_BLESS_USE_ITEM) and `handlers/missoes/curadoria.ts` (140 TRUSTEESHIP) — both just extend a few
 * `player."Sys_Users_Extra"` columns (KingBlessInfo/Enddate/Index, DeedInfo/Enddate/Index,
 * TrusteeshipSpirit, NormalFightNum/HardFightNum) that have no dedicated `db/*.ts` module yet (same
 * situation as `handlers/loja/roleta-canhao.ts`'s `LeftRoutteCount`/`LeftRoutteRate` — raw upsert, no
 * unique-by-UserID helper existed before this table got its first real writers).
 */
import { and, eq } from "drizzle-orm";
import { player, type Database } from "@ddt/db";

const E = player.Sys_Users_Extra;
export type ExtraRow = typeof E.$inferSelect;

/** PlayerBussiness.GetSingleUsersExtra — row for a possibly-OFFLINE target (king bless gifting a friend). */
export async function loadExtra(db: Database, userId: number): Promise<ExtraRow | null> {
  const rows = await db.select().from(E).where(eq(E.UserID, userId)).limit(1);
  return rows[0] ?? null;
}

/** PlayerBussiness.AddUsersExtra / UpdateUsersExtra — upsert by UserID (Sys_Users_Extra has no `db/*.ts`
 *  module of its own; every column below keeps its current value when omitted). */
export async function upsertExtra(db: Database, userId: number, patch: Partial<ExtraRow>): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await db.insert(E).values({ UserID: userId, ...patch } as never).onConflictDoUpdate({ target: E.UserID, set: patch as never });
}

const T = player.Sys_Users_Trusteeship;
export type TrusteeshipRow = typeof T.$inferSelect;

/** Active "curadoria" entries for a player (140 TRUSTEESHIP). */
export async function loadTrusteeship(db: Database, userId: number): Promise<TrusteeshipRow[]> {
  return db.select().from(T).where(eq(T.UserID, userId));
}

export async function upsertTrusteeship(db: Database, userId: number, questId: number, endTime: Date): Promise<void> {
  await db.insert(T).values({ UserID: userId, QuestID: questId, EndTime: endTime })
    .onConflictDoUpdate({ target: [T.UserID, T.QuestID], set: { EndTime: endTime } });
}

export async function deleteTrusteeship(db: Database, userId: number, questId: number): Promise<void> {
  await db.delete(T).where(and(eq(T.UserID, userId), eq(T.QuestID, questId)));
}
