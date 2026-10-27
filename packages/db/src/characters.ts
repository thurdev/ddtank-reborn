/**
 * task `multi-char`: app."AccountCharacters" helpers. See packages/db/src/schema/app.ts header for why
 * `gameUserName` (not accountId) is the key the rest of the stack (login ticket, game server) cares about.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import type { DbHandle } from "./client.js";
import { app } from "./schema/index.js";

const { AccountCharacters } = app;
export type AccountCharacterRow = typeof AccountCharacters.$inferSelect;

/** Separator that can never occur in a real account UserName (`NAME_RE` in apps/api/src/routes/auth.ts:
 *  `^[A-Za-z0-9_.]{3,32}$`) — see schema/app.ts header for the full reasoning. */
export const SLOT_SEPARATOR = "~";

/** Slot 1 -> the account's own (lowercased) name, unchanged from the original single-character flow.
 *  Slot N>1 -> `<name>~N`. Pure function, no DB — shared by the migration backfill's SQL equivalent, the
 *  API (reserving a new slot) and tests. */
export function deriveGameUserName(accountUserName: string, slot: number): string {
  const base = accountUserName.trim().toLowerCase();
  return slot <= 1 ? base : `${base}${SLOT_SEPARATOR}${slot}`;
}

/** All reserved slots for an account, slot 1 first. */
export async function listAccountCharacterSlots(h: DbHandle, accountId: number): Promise<AccountCharacterRow[]> {
  return h.db.select().from(AccountCharacters).where(eq(AccountCharacters.accountId, accountId)).orderBy(asc(AccountCharacters.slot));
}

export async function getAccountCharacterSlot(h: DbHandle, accountId: number, slot: number): Promise<AccountCharacterRow | undefined> {
  const [row] = await h.db
    .select()
    .from(AccountCharacters)
    .where(and(eq(AccountCharacters.accountId, accountId), eq(AccountCharacters.slot, slot)))
    .limit(1);
  return row;
}

export async function getAccountCharacterByGameUserName(h: DbHandle, gameUserName: string): Promise<AccountCharacterRow | undefined> {
  const [row] = await h.db
    .select()
    .from(AccountCharacters)
    .where(sql`lower(${AccountCharacters.gameUserName}) = lower(${gameUserName})`)
    .limit(1);
  return row;
}

/** Ensures slot 1 exists for `accountId` (lazy backfill, same shape as the migration — covers an account
 *  row inserted by a path that ran before this migration's data was backfilled, or restored from a backup
 *  taken between migrations). Idempotent. */
export async function ensureFirstSlot(h: DbHandle, accountId: number, accountUserName: string): Promise<AccountCharacterRow> {
  const existing = await getAccountCharacterSlot(h, accountId, 1);
  if (existing) return existing;
  const [row] = await h.db
    .insert(AccountCharacters)
    .values({ accountId, slot: 1, gameUserName: deriveGameUserName(accountUserName, 1) })
    .onConflictDoNothing({ target: [AccountCharacters.accountId, AccountCharacters.slot] })
    .returning();
  return row ?? (await getAccountCharacterSlot(h, accountId, 1))!;
}

export type CreateSlotResult = { ok: true; row: AccountCharacterRow } | { ok: false; reason: "limit" };

/**
 * Reserves the next free slot for `accountId` (server-side limit enforced here, not just in the UI — admin
 * `maxCharactersPerAccount`, apps/api `serverConfigDefaults`). Transaction + advisory lock on `accountId` so
 * two concurrent "create character" calls from the same account can't both grab the same slot number.
 */
export async function createNextCharacterSlot(h: DbHandle, accountId: number, accountUserName: string, maxSlots: number): Promise<CreateSlotResult> {
  await ensureFirstSlot(h, accountId, accountUserName);
  return h.db.transaction(async (tx) => {
    // advisory_xact_lock takes a single bigint; accountId alone is enough (table-specific namespace folded
    // into the low bits so it can't collide with an unrelated feature's lock on the same id).
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${accountId}::bigint)`);
    const existing = await tx.select().from(AccountCharacters).where(eq(AccountCharacters.accountId, accountId)).orderBy(asc(AccountCharacters.slot));
    if (existing.length >= maxSlots) return { ok: false, reason: "limit" } as const;
    const nextSlot = (existing.at(-1)?.slot ?? 0) + 1;
    const [row] = await tx
      .insert(AccountCharacters)
      .values({ accountId, slot: nextSlot, gameUserName: deriveGameUserName(accountUserName, nextSlot) })
      .returning();
    return { ok: true, row: row! } as const;
  });
}
