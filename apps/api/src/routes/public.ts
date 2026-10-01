/** Public JSON for the site and the launcher: config, status, news, ranking, launcher manifest. */
import { app as appTables, findAccount } from "@ddt/db";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { AppCtx } from "../context.js";
import { q } from "../lib/db.js";
import { topUsers } from "../templates/defs.js";
import { authOf, maintenance, playConfig } from "./auth.js";

export async function gameInternal<T>(ctx: AppCtx, path: string): Promise<T | null> {
  if (!ctx.cfg.GAME_INTERNAL_URL) return null;
  try {
    const res = await fetch(`${ctx.cfg.GAME_INTERNAL_URL.replace(/\/+$/, "")}${path}`, { signal: AbortSignal.timeout(1500) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function serverStatus(ctx: AppCtx) {
  const g = await gameInternal<{ online?: number; players?: number; rooms?: number; capacity?: number }>(ctx, "/status");
  const m = await maintenance(ctx);
  const [srv] = await q<{ n: number; cap: number }>(ctx.h, sql`SELECT COALESCE(sum("Online"),0)::int AS n, COALESCE(sum("Total"),0)::int AS cap FROM player."Server_List" WHERE "State" <> -1`);
  const sc = (await setting<Record<string, unknown>>(ctx, "server-config")) ?? {};
  return {
    online: !!g,
    maintenance: m.on,
    players: Number(g?.players ?? g?.online ?? srv?.n ?? 0),
    capacity: Number(g?.capacity ?? sc.maxPlayers ?? srv?.cap ?? 1000),
    rooms: Number(g?.rooms ?? 0),
    version: "4.1.0",
    motd: (sc.motd as string) || undefined,
  };
}

export async function setting<T>(ctx: AppCtx, key: string): Promise<T | undefined> {
  const [s] = await ctx.h.db.select().from(appTables.Settings).where(eq(appTables.Settings.key, key)).limit(1);
  return s?.value as T | undefined;
}

const RANK_ORDER: Record<string, { order: number; value: string }> = {
  level: { order: 0, value: "Grade" },
  gp: { order: 0, value: "GP" },
  offer: { order: 1, value: "Offer" },
  fight: { order: 6, value: "FightPower" },
};

export async function publicRoutes(f: FastifyInstance, ctx: AppCtx) {
  f.get("/api/public/config", async (req) => {
    const c = authOf(ctx, req);
    const acc = c ? await findAccount(ctx.h, c.name) : undefined;
    return {
      serverName: ctx.cfg.SERVER_NAME,
      launcherUrl: ctx.cfg.LAUNCHER_DOWNLOAD_URL || null,
      game: await playConfig(ctx, acc && !acc.IsBanned ? acc : null, req.ip),
    };
  });

  f.get("/api/public/status", async () => serverStatus(ctx));

  const news = async (limit = 20) =>
    (
      await ctx.h.db
        .select()
        .from(appTables.News)
        .where(and(eq(appTables.News.published, true), lte(appTables.News.publishedAt, new Date())))
        .orderBy(desc(appTables.News.publishedAt))
        .limit(limit)
    ).map((n) => ({ id: n.id, title: n.title, summary: n.summary, category: n.category, publishedAt: n.publishedAt.toISOString(), url: n.url ?? undefined, cover: n.cover ?? undefined, body: n.body ?? undefined }));

  f.get("/api/public/news", async () => news());

  const ranking = async (type: string, limit: number) => {
    const r = RANK_ORDER[type] ?? RANK_ORDER.level!;
    const rows = await topUsers(ctx.h, r.order, limit);
    return rows.map((u, i) => ({ rank: i + 1, nickname: u.NickName, guild: (u.ConsortiaName as string) || null, level: u.Grade, value: Number(u[r.value] ?? 0) }));
  };
  f.get<{ Querystring: { type?: string; limit?: string } }>("/api/public/ranking", async (req) => ranking(req.query.type ?? "level", Math.min(100, Number(req.query.limit) || 20)));
  f.get<{ Querystring: { type?: string; limit?: string } }>("/api/ranking", async (req) => ranking(req.query.type ?? "level", Math.min(100, Number(req.query.limit) || 50)));

  /** Launcher manifest (apps/launcher/src/main/api.ts manifestSchema). */
  f.get("/api/public/launcher", async () => {
    const c = ctx.cfg;
    const st = await serverStatus(ctx);
    const servers = await q(ctx.h, sql`SELECT * FROM player."Server_List" WHERE "State" <> -1 ORDER BY "ID"`);
    const overrides = (await setting<Record<string, unknown>>(ctx, "launcher")) ?? {};
    return {
      launcher: {
        latestVersion: c.LAUNCHER_LATEST_VERSION,
        minVersion: c.LAUNCHER_MIN_VERSION,
        ...(c.LAUNCHER_DOWNLOAD_URL ? { downloadUrl: c.LAUNCHER_DOWNLOAD_URL } : {}),
        ...(c.LAUNCHER_UPDATE_URL ? { updateUrl: c.LAUNCHER_UPDATE_URL } : {}),
      },
      defaultRuntime: "projector",
      client: { swfUrl: `${c.PUBLIC_URL}/flash/Loading.swf`, configUrl: `${c.PUBLIC_URL}/flash/config.xml`, width: 1000, height: 600 },
      servers: (servers.length ? servers : [{ ID: 1, Name: c.SERVER_NAME }]).map((s, i) => ({
        id: String(s.ID),
        name: String(s.Name ?? c.SERVER_NAME),
        status: st.maintenance ? "maintenance" : "online",
        players: Number(s.Online ?? 0),
        recommended: i === 0,
      })),
      news: (await news(10)).map((n) => ({ id: String(n.id), title: n.title, body: n.summary, url: n.url, date: n.publishedAt, tag: n.category })),
      ...overrides,
    };
  });
}
