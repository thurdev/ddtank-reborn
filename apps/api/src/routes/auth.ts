/** Site + launcher auth (member."Accounts", scrypt) and the play config (flashvars incl. the one-time web key). */
import { issueWebKey } from "@ddt/auth";
import { app as appTables, checkLogin, findAccount, hashPassword, verifyPassword, Accounts } from "@ddt/db";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AppCtx } from "../context.js";
import { q } from "../lib/db.js";
import { signJwt, verifyJwt, type Claims } from "../lib/jwt.js";

export async function roleOf(ctx: AppCtx, acc: { ID: number; IsAdmin: boolean }): Promise<string> {
  const [r] = await ctx.h.db.select().from(appTables.AccountRoles).where(eq(appTables.AccountRoles.AccountID, acc.ID)).limit(1);
  if (r && r.active) return r.role;
  return acc.IsAdmin ? "admin" : "player";
}

export function authOf(ctx: AppCtx, req: FastifyRequest): Claims | null {
  const h = req.headers.authorization ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? verifyJwt(m[1]!, ctx.cfg.JWT_SECRET) : null;
}

export function requireUser(ctx: AppCtx) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const c = authOf(ctx, req);
    if (!c) return reply.code(401).send({ message: "Não autenticado" });
    (req as FastifyRequest & { user: Claims }).user = c;
  };
}

export function requireAdmin(ctx: AppCtx) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const c = authOf(ctx, req);
    if (!c) return reply.code(401).send({ message: "Não autenticado" });
    if (c.role !== "admin") return reply.code(403).send({ message: "Acesso restrito a administradores" });
    (req as FastifyRequest & { user: Claims }).user = c;
  };
}

export const userOf = (req: FastifyRequest) => (req as FastifyRequest & { user: Claims }).user;

const publicUser = (acc: { ID: number; UserName: string; Email: string | null }, role: string) => ({ id: acc.ID, username: acc.UserName, email: acc.Email ?? "", role });

/** Everything the page / launcher needs to start the Flash client for `userName` (issues a fresh one-time key). */
export async function playConfig(ctx: AppCtx, acc: { ID: number; UserName: string } | null, ip?: string) {
  const c = ctx.cfg;
  const base = c.PUBLIC_URL;
  let flashvars: Record<string, string> = { user: "", key: "", config: `${base}/flash/config.xml` };
  let expiresAt: string | undefined;
  if (acc) {
    const t = await issueWebKey(ctx.h, acc.UserName, { accountId: acc.ID, ttlMinutes: c.LOGIN_KEY_TTL_MIN, ip });
    flashvars = { user: acc.UserName.toLowerCase(), key: t.key, config: `${base}/flash/config.xml` };
    expiresAt = t.expiresAt.toISOString();
  }
  const proxy = [{ host: c.GAME_HOST, port: c.GAME_PORT, proxyUrl: c.GAME_WS_URL }];
  if (c.GAME_HOST === "127.0.0.1") proxy.push({ host: "localhost", port: c.GAME_PORT, proxyUrl: c.GAME_WS_URL });
  return {
    rufflePath: c.RUFFLE_URL || `${base}/ruffle/ruffle.js`,
    swfUrl: `${base}/flash/Loading.swf`,
    base: `${base}/flash/`,
    flashvars,
    socketProxy: proxy,
    socket: { host: c.GAME_HOST, port: c.GAME_PORT, policyPort: c.POLICY_PORT },
    wsUrl: c.GAME_WS_URL,
    requestUrl: `${base}/request/`,
    resourceUrl: `${base}/resource/`,
    flashUrl: `${base}/flash/`,
    configUrl: `${base}/flash/config.xml`,
    expiresAt,
  };
}

const NAME_RE = /^[A-Za-z0-9_.]{3,32}$/;

export async function authRoutes(f: FastifyInstance, ctx: AppCtx) {
  const issue = async (acc: Awaited<ReturnType<typeof findAccount>> & object, ip: string) => {
    const role = await roleOf(ctx, acc);
    const token = signJwt({ sub: acc.ID, name: acc.UserName, role }, ctx.cfg.JWT_SECRET, ctx.cfg.JWT_TTL);
    const play = await playConfig(ctx, acc, ip);
    return { token, user: publicUser(acc, role), play: { flashvars: play.flashvars, swfUrl: play.swfUrl, expiresAt: play.expiresAt }, game: play };
  };

  f.post("/api/auth/register", async (req, reply) => {
    const b = z.object({ username: z.string(), email: z.string().optional().default(""), password: z.string() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ message: "Dados inválidos" });
    const { username, email, password } = b.data;
    if (!NAME_RE.test(username)) return reply.code(400).send({ message: "Usuário deve ter 3–32 letras, números, _ ou ." });
    if (password.length < 6) return reply.code(400).send({ message: "A senha deve ter pelo menos 6 caracteres" });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply.code(400).send({ message: "E-mail inválido" });
    if (await findAccount(ctx.h, username)) return reply.code(409).send({ message: "Este usuário já existe" });
    const [acc] = await ctx.h.db.insert(Accounts).values({ UserName: username, Email: email || null, PasswordHash: await hashPassword(password) }).returning();
    return reply.code(201).send(await issue(acc!, req.ip));
  });

  f.post("/api/auth/login", async (req, reply) => {
    const b = z.object({ username: z.string().min(1), password: z.string().min(1) }).passthrough().safeParse(req.body);
    if (!b.success) return reply.code(400).send({ message: "Informe usuário e senha" });
    const existing = await findAccount(ctx.h, b.data.username);
    if (existing?.IsBanned) return reply.code(403).send({ message: existing.BanReason ? `Conta banida: ${existing.BanReason}` : "Conta banida" });
    const acc = await checkLogin(ctx.h, b.data.username, b.data.password);
    if (!acc) return reply.code(401).send({ message: "Usuário ou senha incorretos." });
    await ctx.h.db.update(Accounts).set({ LastLoginAt: new Date(), LastLoginIP: req.ip }).where(eq(Accounts.ID, acc.ID));
    const out = await issue(acc, req.ip);
    // maintenance: only admins may enter
    const m = await maintenance(ctx);
    if (m.on && out.user.role !== "admin") return reply.code(503).send({ message: m.message || "Servidor em manutenção" });
    return out;
  });

  f.get("/api/auth/me", { preHandler: requireUser(ctx) }, async (req, reply) => {
    const acc = await findAccount(ctx.h, userOf(req).name);
    if (!acc) return reply.code(401).send({ message: "Não autenticado" });
    return { user: publicUser(acc, await roleOf(ctx, acc)) };
  });

  f.get("/api/account/me", { preHandler: requireUser(ctx) }, async (req, reply) => {
    const acc = await findAccount(ctx.h, userOf(req).name);
    if (!acc) return reply.code(401).send({ message: "Não autenticado" });
    const chars = await q(
      ctx.h,
      sql`SELECT "UserID","NickName","Grade","Gold","Money","Sex","ConsortiaName" FROM app."V_Sys_Users_Detail" WHERE lower("UserName") = lower(${acc.UserName}) AND "NickName" <> '' ORDER BY "UserID"`,
    );
    return {
      user: publicUser(acc, await roleOf(ctx, acc)),
      characters: chars.map((c) => ({
        id: c.UserID,
        nickname: c.NickName,
        level: c.Grade,
        gold: c.Gold,
        money: c.Money,
        sex: c.Sex ? "m" : "f",
        guild: (c.ConsortiaName as string) || null,
      })),
    };
  });

  f.post("/api/account/password", { preHandler: requireUser(ctx) }, async (req, reply) => {
    const b = z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ message: "A nova senha deve ter pelo menos 6 caracteres" });
    const acc = await findAccount(ctx.h, userOf(req).name);
    if (!acc || !(await verifyPassword(b.data.currentPassword, acc.PasswordHash))) return reply.code(400).send({ message: "Senha atual incorreta" });
    await ctx.h.db.update(Accounts).set({ PasswordHash: await hashPassword(b.data.newPassword) }).where(eq(Accounts.ID, acc.ID));
    return reply.code(204).send();
  });

  /** Fresh play config for the logged-in user (new one-time key each call). */
  f.get("/api/play/config", { preHandler: requireUser(ctx) }, async (req, reply) => {
    const acc = await findAccount(ctx.h, userOf(req).name);
    if (!acc || acc.IsBanned) return reply.code(401).send({ message: "Não autenticado" });
    return playConfig(ctx, acc, req.ip);
  });
}

export async function maintenance(ctx: AppCtx): Promise<{ on: boolean; message: string }> {
  const [s] = await ctx.h.db.select().from(appTables.Settings).where(eq(appTables.Settings.key, "server-config")).limit(1);
  const v = (s?.value ?? {}) as Record<string, unknown>;
  return { on: !!v.maintenance, message: String(v.maintenanceMessage ?? "") };
}
