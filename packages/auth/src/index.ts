/**
 * @ddt/auth — the DDTank 4.1 login ticket chain, shared by apps/api (issuer, Login.ashx) and apps/game (socket LOGIN).
 *
 * Original (vendor/DDTank41):
 *  - Tank.Flash/LoginGame.aspx.cs: key = Guid.NewGuid(), content = name|key|time|md5(name+key+time+LoginKey)
 *  - Tank.Request/CreateLogin.aspx.cs + Bussiness/Interface/BaseInterface.cs UnEncryptLogin: verify md5, PlayerManager.Add(name.ToLower(), key.ToLower())
 *  - Tank.Request/Login.ashx.cs: RSA "name,key,tempPwd,nick" -> PlayerManager.Login(name,key) (commented out in 4.1! enforced here),
 *    then PlayerManager.Update(name, tempPwd) and Center CreatePlayer(id, name, tempPwd)
 *  - Game.Server UserLoginHandler: socket LOGIN "name,tempPwd" validated against Center.
 * Here the PlayerManager dictionary is the shared table app."LoginSessions" (see packages/db/src/schema/app.ts).
 */
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { app, type DbHandle } from "@ddt/db";

const { LoginSessions } = app;
export type LoginSession = typeof LoginSessions.$inferSelect;

export const md5Hex = (s: string) => createHash("md5").update(s, "utf8").digest("hex");

function safeEq(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** BaseInterface.GetNameBySite: "<site>_<user>" when a per-site LoginKey_<site> exists. */
export function getNameBySite(user: string, site: string, siteKeys: Record<string, string> = {}): string {
  return site && siteKeys[site] ? `${site}_${user}` : user;
}

/** Builds the CreateLogin.aspx `content` exactly like the original portal (md5 lowercase hex). */
export function buildCreateLoginContent(name: string, key: string, time: number, loginKey: string): string {
  return `${name}|${key}|${time}|${md5Hex(name + key + String(time) + loginKey)}`;
}

/**
 * BaseInterface.UnEncryptLogin. Returns the split fields or an error code like the original
 * (2 = too few fields, 4 = no LoginKey, 5 = bad md5). Extra: rejects tickets older than maxAgeSec when time is numeric.
 */
export function verifyCreateLoginContent(
  content: string,
  loginKey: string,
  opts: { maxAgeSec?: number; now?: number } = {},
): { ok: true; name: string; key: string; time: string } | { ok: false; code: number } {
  if (!loginKey) return { ok: false, code: 4 };
  const parts = content.split("|");
  if (parts.length <= 3) return { ok: false, code: 2 };
  const [name, key, time, sig] = parts as [string, string, string, string];
  if (!safeEq(md5Hex(name + key + time + loginKey), sig.toLowerCase())) return { ok: false, code: 5 };
  if (opts.maxAgeSec && /^\d+$/.test(time)) {
    const now = opts.now ?? Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(time)) > opts.maxAgeSec) return { ok: false, code: 7 };
  }
  return { ok: true, name, key, time };
}

/** Uppercase GUID, like `Guid.NewGuid().ToString().ToUpper()` in Tank.Flash/LoginGame.aspx.cs. */
export const newWebKey = () => randomUUID().toUpperCase();

export interface IssueOptions {
  accountId?: number | null;
  site?: string;
  /** PlayerManager LoginSessionTimeOut (Web.config: 30 min). */
  ttlMinutes?: number;
  key?: string;
  ip?: string | null;
}

/** PlayerManager.Add(name, key): one row per account; issuing a new key invalidates the previous one. */
export async function issueWebKey(h: DbHandle, userName: string, o: IssueOptions = {}): Promise<{ key: string; expiresAt: Date }> {
  const key = o.key ?? newWebKey();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (o.ttlMinutes ?? 30) * 60_000);
  const name = userName.trim().toLowerCase();
  const values = {
    UserName: name,
    AccountID: o.accountId ?? null,
    WebKey: key,
    GameKey: null,
    Site: o.site ?? "",
    Count: 0,
    CreatedAt: now,
    UpdatedAt: now,
    ExpiresAt: expiresAt,
    GameKeyExpiresAt: null,
    LastIP: o.ip ?? null,
  };
  await h.db
    .insert(LoginSessions)
    .values(values)
    .onConflictDoUpdate({ target: LoginSessions.UserName, set: { ...values, UserName: undefined } });
  return { key, expiresAt };
}

export async function getSession(h: DbHandle, userName: string): Promise<LoginSession | undefined> {
  const [row] = await h.db.select().from(LoginSessions).where(eq(LoginSessions.UserName, userName.trim().toLowerCase())).limit(1);
  return row;
}

/**
 * Login.ashx check (PlayerManager.Login + Update). `key` is the flashvar key (case-insensitive: the portal stored it
 * lowercased while the client sends it uppercase) or, on a re-login from inside the client, the previous tempPwd.
 * On success stores `tempPwd` as the game key (valid `gameKeyTtlMinutes`) and returns the session (with the Count
 * before the update: 0 = first login, PlayerManager.GetByUserIsFirst).
 */
export async function consumeWebKey(
  h: DbHandle,
  userName: string,
  key: string,
  tempPwd: string,
  o: { userId?: number; gameKeyTtlMinutes?: number; now?: Date } = {},
): Promise<LoginSession | null> {
  const s = await getSession(h, userName);
  const now = o.now ?? new Date();
  if (!s || !key) return null;
  const webOk = s.ExpiresAt > now && safeEq(s.WebKey.toLowerCase(), key.toLowerCase());
  const reOk = !!s.GameKey && !!s.GameKeyExpiresAt && s.GameKeyExpiresAt > now && safeEq(s.GameKey, key);
  if (!webOk && !reOk) return null;
  const gameExp = new Date(now.getTime() + (o.gameKeyTtlMinutes ?? 60 * 24) * 60_000);
  await h.db
    .update(LoginSessions)
    .set({
      GameKey: tempPwd,
      GameKeyExpiresAt: gameExp,
      Count: sql`${LoginSessions.Count} + 1`,
      UserID: o.userId ?? s.UserID,
      UpdatedAt: now,
    })
    .where(eq(LoginSessions.UserName, s.UserName));
  return s;
}

/** Sets the game user id after Login.ashx created/loaded the character. */
export async function setSessionUserId(h: DbHandle, userName: string, userId: number): Promise<void> {
  await h.db.update(LoginSessions).set({ UserID: userId }).where(eq(LoginSessions.UserName, userName.trim().toLowerCase()));
}

/** apps/game: validates the socket LOGIN "user,password" (password = tempPwd from Login.ashx). */
export async function validateGameLogin(h: DbHandle, userName: string, gameKey: string, now = new Date()): Promise<LoginSession | null> {
  if (!gameKey) return null;
  const [s] = await h.db
    .select()
    .from(LoginSessions)
    .where(and(eq(LoginSessions.UserName, userName.trim().toLowerCase()), gt(LoginSessions.GameKeyExpiresAt, now)))
    .limit(1);
  if (!s?.GameKey || !safeEq(s.GameKey, gameKey)) return null;
  return s;
}

/** PlayerManager.Remove(name) — logout / failed login. */
export async function removeSession(h: DbHandle, userName: string): Promise<void> {
  await h.db.delete(LoginSessions).where(eq(LoginSessions.UserName, userName.trim().toLowerCase()));
}

/** Deletes expired rows (the original ran a 1-minute timer). */
export async function purgeExpiredSessions(h: DbHandle, now = new Date()): Promise<void> {
  await h.db
    .delete(LoginSessions)
    .where(sql`${LoginSessions.ExpiresAt} < ${now} AND (${LoginSessions.GameKeyExpiresAt} IS NULL OR ${LoginSessions.GameKeyExpiresAt} < ${now})`);
}
