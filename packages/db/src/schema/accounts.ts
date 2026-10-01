// Hand-written (not generated). New table — see README "Accounts".
import { sql } from "drizzle-orm";
import { boolean, index, integer, primaryKey, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { member } from "./schemas.js";

/**
 * member."Accounts" — web/login accounts for DDTank Reborn.
 *
 * Replaces Db_Membership.Mem_Users + Mem_UserInfo (no PK, nvarchar user ids, MD5/SHA1 "PasswordFormat" hashes, per
 * ApplicationId rows). "UserName" is the join key to player."Sys_Users_Detail"."UserName" (nvarchar(200)), exactly
 * like the original login flow (Tank.Request login -> SP_Users_LoginWeb @UserName).
 * "PasswordHash" is a self-describing scrypt string, see src/password.ts.
 */
export const Accounts = member.table(
  "Accounts",
  {
    ID: integer("ID").generatedByDefaultAsIdentity().notNull(),
    UserName: varchar("UserName", { length: 200 }).notNull(),
    Email: varchar("Email", { length: 256 }),
    PasswordHash: varchar("PasswordHash", { length: 256 }).notNull(),
    IsAdmin: boolean("IsAdmin").notNull().default(false),
    IsBanned: boolean("IsBanned").notNull().default(false),
    BanReason: text("BanReason"),
    CreatedAt: timestamp("CreatedAt", { precision: 3, mode: "date" }).notNull().defaultNow(),
    LastLoginAt: timestamp("LastLoginAt", { precision: 3, mode: "date" }),
    LastLoginIP: varchar("LastLoginIP", { length: 64 }),
  },
  (t) => [
    primaryKey({ name: "Accounts_pkey", columns: [t.ID] }),
    uniqueIndex("UX_Accounts_UserName_lower").on(sql`lower(${t.UserName})`),
    index("IX_Accounts_Email_lower").on(sql`lower(${t.Email})`),
  ],
);

export type Account = typeof Accounts.$inferSelect;
export type NewAccount = typeof Accounts.$inferInsert;
