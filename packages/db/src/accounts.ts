import { eq, sql } from "drizzle-orm";
import type { DbHandle } from "./client.js";
import { hashPassword, verifyPassword } from "./password.js";
import { Accounts, type Account } from "./schema/accounts.js";

/** Creates or resets (password/admin flag) an account. UserName match is case-insensitive. */
export async function upsertAccount(
  h: DbHandle,
  a: { userName: string; password: string; isAdmin?: boolean; email?: string | null },
): Promise<Account> {
  const PasswordHash = await hashPassword(a.password);
  const existing = await findAccount(h, a.userName);
  if (existing) {
    const [row] = await h.db
      .update(Accounts)
      .set({ PasswordHash, IsAdmin: a.isAdmin ?? existing.IsAdmin, Email: a.email ?? existing.Email, IsBanned: false })
      .where(eq(Accounts.ID, existing.ID))
      .returning();
    return row!;
  }
  const [row] = await h.db
    .insert(Accounts)
    .values({ UserName: a.userName, PasswordHash, IsAdmin: a.isAdmin ?? false, Email: a.email ?? null })
    .returning();
  return row!;
}

export async function findAccount(h: DbHandle, userName: string): Promise<Account | undefined> {
  const [row] = await h.db
    .select()
    .from(Accounts)
    .where(sql`lower(${Accounts.UserName}) = lower(${userName})`)
    .limit(1);
  return row;
}

/** Returns the account when the password matches and it is not banned. */
export async function checkLogin(h: DbHandle, userName: string, password: string): Promise<Account | null> {
  const acc = await findAccount(h, userName);
  if (!acc || acc.IsBanned) return null;
  return (await verifyPassword(password, acc.PasswordHash)) ? acc : null;
}

/** Dev only: admin/admin (IsAdmin) + test/test. */
export async function createDevAccounts(h: DbHandle): Promise<Account[]> {
  return [
    await upsertAccount(h, { userName: "admin", password: "admin", isAdmin: true }),
    await upsertAccount(h, { userName: "test", password: "test", isAdmin: false }),
  ];
}
