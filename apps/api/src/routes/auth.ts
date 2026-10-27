/** Site + launcher auth (member."Accounts", scrypt) and the play config (flashvars incl. the one-time web key). */
import { issueWebKey } from "@ddt/auth";
import {
  app as appTables,
  checkLogin,
  createNextCharacterSlot,
  ensureFirstSlot,
  findAccount,
  getAccountCharacterSlot,
  hashPassword,
  listAccountCharacterSlots,
  verifyPassword,
  Accounts,
  type AccountCharacterRow,
} from "@ddt/db";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AppCtx } from "../context.js";
import { q, q1 } from "../lib/db.js";
import { itemIconRel } from "../lib/item-icon.js";
import { signJwt, verifyJwt, type Claims } from "../lib/jwt.js";

/**
 * ch-processo: one Ruffle `socketProxy` entry per ENABLED channel (`player."Server_List"`, same filter as
 * `ServerList.ashx`), so the browser client can open a socket to WHICHEVER channel's host:port the player picks
 * in the in-game channel selector, not just the one this `apps/api` happens to pair with locally. Each entry's
 * `host`/`port` is the REAL TCP endpoint the Flash client ultimately connects to (`ServerListAnalyzer.as`: the
 * 4.1 client re-adds the 69 `ServerList.ashx` subtracted; the 6600 client never subtracts it) — i.e. the row's
 * own `Port` when set, else this process' `GAME_PORT` fallback (same convention as `IP`/`Port` in
 * `ServerList.ts`). `proxyUrl` is the target channel's own `apps/game` WebSocket endpoint: `WsUrl` on the row
 * (migration `0015_blue_frog_thor.sql`) when an admin filled it in for a channel served by ANOTHER
 * apps/api+apps/game pair (`ch-processo`), else this process' own `GAME_WS_URL` — identical to the single-row
 * fallback this function replaces, so the current/local channel's mapping is byte-for-byte the same as before.
 */
async function channelSocketProxies(ctx: AppCtx): Promise<{ host: string; port: number; proxyUrl: string }[]> {
  const c = ctx.cfg;
  const proxies: { host: string; port: number; proxyUrl: string }[] = [];
  try {
    const rows = await q<{ IP: string | null; Port: number | null; WsUrl: string | null }>(
      ctx.h,
      sql`SELECT "IP", "Port", "WsUrl" FROM player."Server_List" WHERE "Enabled" = true AND "State" <> -1`,
    );
    for (const r of rows) {
      const rowPort = Number(r.Port ?? 0);
      const host = r.IP || c.GAME_HOST;
      const port = rowPort > 0 ? rowPort : c.GAME_PORT;
      const proxyUrl = r.WsUrl || c.GAME_WS_URL;
      proxies.push({ host, port, proxyUrl });
      if (host === "127.0.0.1") proxies.push({ host: "localhost", port, proxyUrl });
    }
  } catch (e) {
    ctx.log.warn(`channelSocketProxies: ${(e as Error).message}`);
  }
  // player."Server_List" unreachable/empty (fresh DB not migrated/seeded yet): today's single-row fallback.
  if (!proxies.length) {
    proxies.push({ host: c.GAME_HOST, port: c.GAME_PORT, proxyUrl: c.GAME_WS_URL });
    if (c.GAME_HOST === "127.0.0.1") proxies.push({ host: "localhost", port: c.GAME_PORT, proxyUrl: c.GAME_WS_URL });
  }
  return proxies;
}

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

/**
 * Everything the page / launcher needs to start the Flash client for `userName` (issues a fresh one-time
 * key). task multi-char: `slot` (1-based, default 1 = the account's original character) picks WHICH of the
 * account's characters the ticket opens — `flashvars.user` becomes that slot's `gameUserName` (e.g.
 * "name" or "name~2") instead of always the account's own UserName, everything else about the ticket
 * chain (`@ddt/auth` issueWebKey/consumeWebKey, apps/game `findCharacterByUserName`) is unchanged because
 * it never knew about "account" to begin with — it only ever saw a username.
 */
export async function playConfig(ctx: AppCtx, acc: { ID: number; UserName: string } | null, ip?: string, client?: string, slot?: number) {
  const c = ctx.cfg;
  const base = c.PUBLIC_URL;
  // ?client=6600: cliente DDT-6600 em paralelo (migração M1); padrão continua o 4.1
  const fl = client === "6600" ? "flash6600" : "flash";
  let flashvars: Record<string, string> = { user: "", key: "", config: `${base}/${fl}/config.xml` };
  let expiresAt: string | undefined;
  if (acc) {
    // Garante o slot 1 (conta pode ter sido criada antes da migração 0029 ser aplicada, ou — caso normal —
    // acabou de se registrar agora: a migração só faz backfill das contas que já existiam na hora dela).
    await ensureFirstSlot(ctx.h, acc.ID, acc.UserName);
    const wantedSlot = slot && slot > 0 ? Math.trunc(slot) : 1;
    const slotRow = wantedSlot === 1 ? undefined : await getAccountCharacterSlot(ctx.h, acc.ID, wantedSlot);
    const gameUserName = slotRow?.gameUserName ?? acc.UserName.toLowerCase();
    const t = await issueWebKey(ctx.h, gameUserName, { accountId: acc.ID, ttlMinutes: c.LOGIN_KEY_TTL_MIN, ip });
    flashvars = { user: gameUserName, key: t.key, config: `${base}/${fl}/config.xml` };
    expiresAt = t.expiresAt.toISOString();
  }
  const proxy = await channelSocketProxies(ctx);
  return {
    rufflePath: c.RUFFLE_URL || `${base}/ruffle/ruffle.js`,
    // cliente PixiJS (TypeScript, sem SWF): a página abre num iframe com user/key/api
    pixiUrl: fl === "flash" && c.PIXI_CLIENT_URL ? c.PIXI_CLIENT_URL : undefined,
    swfUrl: `${base}/${fl}/Loading.swf`,
    base: `${base}/${fl}/`,
    flashvars,
    socketProxy: proxy,
    socket: { host: c.GAME_HOST, port: c.GAME_PORT, policyPort: c.POLICY_PORT },
    wsUrl: c.GAME_WS_URL,
    requestUrl: `${base}/${fl === "flash6600" ? "request6600" : "request"}/`,
    resourceUrl: `${base}/resource/`,
    flashUrl: `${base}/${fl}/`,
    client: fl === "flash6600" ? "6600" : "41",
    configUrl: `${base}/${fl}/config.xml`,
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

  // limite por IP contra força bruta / criação em massa de contas (mesmo plugin do POST /api/donations)
  f.post("/api/auth/register", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
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

  f.post("/api/auth/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
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
    // task multi-char: lista TODOS os personagens da conta (antes só o único que compartilhava o
    // UserName da conta) — qualquer slot ainda não criado (sem NickName) não aparece aqui, só no
    // carrossel de /api/me/characters, que mostra o slot "em criação" também.
    await ensureFirstSlot(ctx.h, acc.ID, acc.UserName);
    const slots = await listAccountCharacterSlots(ctx.h, acc.ID);
    const names = slots.map((s) => s.gameUserName);
    // sql`= ANY(${names})` array binding isn't portable across both drivers this project supports
    // (postgres.js vs PGlite) — an IN list built with sql.join is.
    const chars = names.length
      ? await q(
          ctx.h,
          sql`SELECT "UserID","NickName","Grade","Gold","Money","Sex","ConsortiaName" FROM app."V_Sys_Users_Detail"
              WHERE lower("UserName") IN (${sql.join(
                names.map((n) => sql`${n}`),
                sql`, `,
              )}) AND "NickName" <> '' ORDER BY "UserID"`,
        )
      : [];
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

  /** Fresh play config for the logged-in user (new one-time key each call). `slot` picks which character
   *  (task multi-char) — the web Play page's character carousel calls this again once a slot is chosen. */
  f.get("/api/play/config", { preHandler: requireUser(ctx) }, async (req, reply) => {
    const acc = await findAccount(ctx.h, userOf(req).name);
    if (!acc || acc.IsBanned) return reply.code(401).send({ message: "Não autenticado" });
    const query = req.query as { client?: string; slot?: string };
    return playConfig(ctx, acc, req.ip, query.client, query.slot ? Number(query.slot) : undefined);
  });

  // ---- task multi-char: GET/POST /api/me/characters ----

  async function charLimit(): Promise<number> {
    const [s] = await ctx.h.db.select().from(appTables.Settings).where(eq(appTables.Settings.key, "server-config")).limit(1);
    const v = (s?.value ?? {}) as Record<string, unknown>;
    const n = Number(v.maxCharactersPerAccount ?? 3);
    return Number.isFinite(n) ? Math.min(10, Math.max(1, Math.trunc(n))) : 3;
  }

  /** Icons of everything equipped (EquipBag, `BagType = 0`) for `userId`, resolved with the same
   *  `itemIconRel` path logic already used by the admin item-icon preview (`apps/api/src/lib/item-icon.ts`,
   *  a faithful port of `PathManager.solveGoodsPath`/`EquipType`). `place` lets the web carousel sort the
   *  layers (hair/face/cloth/weapon/wings...) without the API needing to know client-side z-order.
   *
   *  `templateId`/`pic`/`needSex`/`property1`/`property8`/`level` (task multi-char, load-time fix): the
   *  real-client renderer (`apps/client/src/avatar.ts`) needs these to build a MINIMAL `ItemManager`
   *  template dictionary for just this character's own equipped items, instead of the full
   *  `StartupResourceLoader.creatItemTempleteLoader()` fetch — that one loads and throttle-parses ALL
   *  ~7650 item templates (`ItemTempleteAnalyzer.__partexceute`: 40 items per 30ms `Timer` tick, by
   *  design, to not stall the original Flash player's frame rate while the rest of the game's startup
   *  runs in the background) — ~5.7s of dead time alone for a page that only ever needs the handful of
   *  items one character has on. `Property8` (a per-layer bitmap index string, e.g. "01" = draw layers 0
   *  and 1 — `BaseLayer.initLoaders` iterates it character by character) is read by EVERY equip layer, not
   *  just special cases, confirmed by grepping every `ItemTemplateInfo` field `BaseLayer`/`ShowLayer`/
   *  `BaseWingLayer` actually access.
   */
  async function equippedIcons(userId: number): Promise<
    {
      place: number;
      categoryId: number;
      strengthenLevel: number;
      isGold: boolean;
      iconRel: string;
      templateId: number;
      pic: string;
      needSex: number;
      property1: number;
      property8: number;
      level: number;
    }[]
  > {
    const rows = await q(
      ctx.h,
      sql`SELECT g."Place", g."StrengthenLevel", g."IsJudge", g."TemplateID", s."CategoryID", s."Pic", s."NeedSex", s."Property1", s."Property8", s."Level"
          FROM player."Sys_Users_Goods" g JOIN game."Shop_Goods" s ON s."TemplateID" = g."TemplateID"
          WHERE g."UserID" = ${userId} AND g."BagType" = 0 AND g."IsExist" = true`,
    );
    const out: {
      place: number;
      categoryId: number;
      strengthenLevel: number;
      isGold: boolean;
      iconRel: string;
      templateId: number;
      pic: string;
      needSex: number;
      property1: number;
      property8: number;
      level: number;
    }[] = [];
    for (const r of rows) {
      const categoryId = Number(r.CategoryID);
      const rel = itemIconRel(categoryId, String(r.Pic ?? ""), Number(r.NeedSex ?? 0))[0];
      if (rel) {
        out.push({
          place: Number(r.Place),
          categoryId,
          strengthenLevel: Number(r.StrengthenLevel ?? 0),
          isGold: !!r.IsJudge,
          iconRel: rel,
          templateId: Number(r.TemplateID),
          pic: String(r.Pic ?? ""),
          property8: Number(r.Property8 ?? 0),
          needSex: Number(r.NeedSex ?? 0),
          property1: Number(r.Property1 ?? 0),
          level: Number(r.Level ?? 0),
        });
      }
    }
    return out;
  }

  /** One carousel card. `created: false` (no NickName yet) means the slot is reserved but the client's own
   *  "Novato" nickname/sex flow hasn't run for it — the web carousel offers "continue creating" instead of
   *  a filled character. */
  async function characterCard(slotRow: AccountCharacterRow) {
    const row = await q1(
      ctx.h,
      sql`SELECT "UserID","NickName","Sex","Grade","Nimbus","ConsortiaName","DutyName","typeVIP","VIPLevel","Style","Colors","Skin"
          FROM app."V_Sys_Users_Detail" WHERE lower("UserName") = lower(${slotRow.gameUserName}) LIMIT 1`,
    );
    if (!row || !row.NickName) return { slot: slotRow.slot, gameUserName: slotRow.gameUserName, created: false as const };
    return {
      slot: slotRow.slot,
      gameUserName: slotRow.gameUserName,
      created: true as const,
      id: Number(row.UserID),
      nickname: String(row.NickName),
      level: Number(row.Grade ?? 0),
      sex: row.Sex ? "m" : "f",
      guild: (row.ConsortiaName as string) || null,
      // DutyName (cargo na sociedade, ex. "Chairman"): mesmo texto que a plaquinha de nome do lobby mostra
      // junto do nick (RoomCharacter) — é o "título" mais próximo que o jogo tem implementado hoje
      // (Sys_User_Rank/NewTitleID existe no schema mas está com 0 linhas, sem feature ligada ainda).
      title: (row.DutyName as string) || null,
      vip: { type: Number(row.typeVIP ?? 0), level: Number(row.VIPLevel ?? 0) },
      nimbus: Number(row.Nimbus ?? 0),
      // task multi-char (correção do coordenador): o renderer real do carrossel (apps/client avatar.ts,
      // ShowCharacter/BaseCharacterLoader) consome Style/Colors/Skin DIRETAMENTE — exatamente a mesma
      // string que apps/game/src/game/stats.ts styleFromEquip grava e que o pacote 67 PUBLIC_PLAYER/18
      // SCENE_ADD_PLAYER manda pro cliente de verdade. `equip` abaixo (ícones avulsos) fica só pro
      // fallback (sem PIXI_CLIENT_URL configurado).
      style: (row.Style as string) || ",,,,,,,,",
      colors: (row.Colors as string) || ",,,,,,,,",
      skin: (row.Skin as string) || "",
      equip: await equippedIcons(Number(row.UserID)),
    };
  }

  f.get("/api/me/characters", { preHandler: requireUser(ctx) }, async (req, reply) => {
    const acc = await findAccount(ctx.h, userOf(req).name);
    if (!acc) return reply.code(401).send({ message: "Não autenticado" });
    if (acc.IsBanned) return reply.code(403).send({ message: acc.BanReason ? `Conta banida: ${acc.BanReason}` : "Conta banida" });
    await ensureFirstSlot(ctx.h, acc.ID, acc.UserName);
    const slots = await listAccountCharacterSlots(ctx.h, acc.ID);
    const max = await charLimit();
    return { characters: await Promise.all(slots.map(characterCard)), maxCharacters: max, canCreate: slots.length < max };
  });

  f.post(
    "/api/me/characters",
    { preHandler: requireUser(ctx), config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const acc = await findAccount(ctx.h, userOf(req).name);
      if (!acc) return reply.code(401).send({ message: "Não autenticado" });
      if (acc.IsBanned) return reply.code(403).send({ message: acc.BanReason ? `Conta banida: ${acc.BanReason}` : "Conta banida" });
      const max = await charLimit();
      const result = await createNextCharacterSlot(ctx.h, acc.ID, acc.UserName, max);
      if (!result.ok) return reply.code(409).send({ message: `Limite de ${max} personagens por conta atingido.` });
      return reply.code(201).send({ slot: result.row.slot, gameUserName: result.row.gameUserName, created: false });
    },
  );
}

export async function maintenance(ctx: AppCtx): Promise<{ on: boolean; message: string }> {
  const [s] = await ctx.h.db.select().from(appTables.Settings).where(eq(appTables.Settings.key, "server-config")).limit(1);
  const v = (s?.value ?? {}) as Record<string, unknown>;
  return { on: !!v.maintenance, message: String(v.maintenanceMessage ?? "") };
}
