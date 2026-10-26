/** Public JSON for the site and the launcher: config, status, news, ranking, launcher manifest. */
import { app as appTables, findAccount } from "@ddt/db";
import { type AimTableResult, computeAimTable } from "@ddt/fight";
import { loadPackedAssets } from "@ddt/fight/node";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { AppCtx } from "../context.js";
import { q } from "../lib/db.js";
import { topUsers } from "../templates/defs.js";
import { authOf, maintenance, playConfig } from "./auth.js";

/** Ball 20: the `common` ball of weapon 7001 (`ballconfig.json`) — the starter weapon, i.e. the "standard ball". */
const AIM_STANDARD_BALL_ID = 20;
const AIM_DEFAULT_ANGLES = [20, 30, 50, 65];

let fightAssets: ReturnType<typeof loadPackedAssets> | null = null;
let aimCache: { key: string; result: AimTableResult } | null = null;

/** GET /api/public/aim-tables: angles come from admin server-config ("aimAngles"), everything else (ball,
 *  gravity/drag, distance unit) is `computeAimTable`'s default — same physics the game server runs. Cached in
 *  memory per distinct angle list (cheap to recompute — ~100ms for 4 angles × 20 distances — but no reason to
 *  redo it on every request). */
function aimTablesFor(angles: number[]): AimTableResult {
  const key = angles.join(",");
  if (aimCache && aimCache.key === key) return aimCache.result;
  fightAssets ??= loadPackedAssets();
  const ball = fightAssets.ball(AIM_STANDARD_BALL_ID);
  if (!ball) throw new Error(`aim-tables: ball ${AIM_STANDARD_BALL_ID} missing from @ddt/fight data`);
  const result = computeAimTable({ angles, ball });
  aimCache = { key, result };
  return result;
}

export async function gameInternal<T>(ctx: AppCtx, path: string): Promise<T | null> {
  if (!ctx.cfg.GAME_INTERNAL_URL) return null;
  try {
    const res = await fetch(`${ctx.cfg.GAME_INTERNAL_URL.replace(/\/+$/, "")}${path}`, { signal: AbortSignal.timeout(1500), headers: ctx.cfg.GAME_INTERNAL_TOKEN ? { authorization: `Bearer ${ctx.cfg.GAME_INTERNAL_TOKEN}` } : {} });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * ch-processo: live `/status` of ANOTHER channel's `apps/game` (`player."Server_List"."InternalUrl"`, filled in
 * by the admin once that channel runs as its own process) — same shape as `gameInternal`'s `/status` but
 * against an arbitrary URL instead of this process' own `GAME_INTERNAL_URL`, and cached a few seconds (module-
 * level, keyed by URL) so `ServerList.ashx` polling every other enabled channel on every request doesn't hammer
 * N `apps/game` admin ports. Reuses this process' own `GAME_INTERNAL_TOKEN` (every channel's `apps/game` shares
 * the same deploy secret today; a per-channel token is future work if that stops being true).
 */
const remoteStatusCache = new Map<string, { at: number; value: { online?: number; players?: number } | null }>();
const REMOTE_STATUS_TTL_MS = 5000;

export async function fetchRemoteStatus(ctx: AppCtx, internalUrl: string): Promise<{ online?: number; players?: number } | null> {
  const cached = remoteStatusCache.get(internalUrl);
  if (cached && Date.now() - cached.at < REMOTE_STATUS_TTL_MS) return cached.value;
  let value: { online?: number; players?: number } | null = null;
  try {
    const res = await fetch(`${internalUrl.replace(/\/+$/, "")}/status`, {
      signal: AbortSignal.timeout(1500),
      headers: ctx.cfg.GAME_INTERNAL_TOKEN ? { authorization: `Bearer ${ctx.cfg.GAME_INTERNAL_TOKEN}` } : {},
    });
    if (res.ok) value = (await res.json()) as { online?: number; players?: number };
  } catch {
    value = null;
  }
  remoteStatusCache.set(internalUrl, { at: Date.now(), value });
  return value;
}

/** POST to the apps/game internal channel (reload-templates, mail-notice, events/start|stop). null when unreachable. */
export async function gameInternalPost<T>(ctx: AppCtx, path: string, body: unknown = {}): Promise<T | null> {
  if (!ctx.cfg.GAME_INTERNAL_URL) return null;
  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (ctx.cfg.GAME_INTERNAL_TOKEN) headers.authorization = `Bearer ${ctx.cfg.GAME_INTERNAL_TOKEN}`;
    const res = await fetch(`${ctx.cfg.GAME_INTERNAL_URL.replace(/\/+$/, "")}${path}`, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function serverStatus(ctx: AppCtx) {
  const g = await gameInternal<{ online?: number; players?: number; rooms?: number; capacity?: number }>(ctx, "/status");
  const m = await maintenance(ctx);
  const [srv] = await q<{ n: number; cap: number }>(
    ctx.h,
    sql`SELECT COALESCE(sum("Online"),0)::int AS n, COALESCE(sum("Total"),0)::int AS cap FROM player."Server_List" WHERE "Enabled" = true AND "State" <> -1`,
  );
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

export interface ChannelInfo {
  id: number;
  name: string;
  /** `ddt/data/ServerInfo.as` enum: 1 manutenção, 2 aberto, 4 quase cheio, 5 cheio. */
  state: number;
  online: number;
  capacity: number;
  mustLevel: number;
  lowestLevel: number;
  pvpOnly: boolean;
  newerServer: boolean;
  /** WebSocket endpoint this channel's `apps/game` answers on — same resolution as `channelSocketProxies`
   *  (`routes/auth.ts`), exposed here so the web Play page's channel picker can target the PixiJS client
   *  (`?ws=`) at the exact channel the player picked instead of whichever one this process defaults to. */
  wsUrl: string;
}

/**
 * site-play: channel list for the web Play page's channel picker — same source/filter as `ServerList.ashx`
 * (`apps/api/src/request/endpoints/ServerList.ts`, owned by another task) and `channelSocketProxies`
 * (`routes/auth.ts`), but as plain JSON (id/name/state/online/capacity/levels/pvpOnly) instead of the
 * client's XML wire format. Read-only, no auth required (same visibility as `ServerList.ashx` itself).
 */
export async function channelList(ctx: AppCtx): Promise<ChannelInfo[]> {
  const rows = await q(
    ctx.h,
    sql`SELECT * FROM player."Server_List" WHERE "Enabled" = true AND "State" <> -1 ORDER BY "SortOrder", "ID"`,
  );
  const local = await gameInternal<{ online?: number; players?: number }>(ctx, "/status");
  const out: ChannelInfo[] = [];
  for (const s of rows) {
    const isLocal = Number(s.ID) === ctx.cfg.SERVER_ID;
    const internalUrl = (s.InternalUrl as string | null) || "";
    const remote = !isLocal && internalUrl ? await fetchRemoteStatus(ctx, internalUrl) : null;
    const online = isLocal
      ? Number(local?.players ?? local?.online ?? s.Online ?? 0)
      : Number(remote?.players ?? remote?.online ?? s.Online ?? 0);
    out.push({
      id: Number(s.ID),
      name: String(s.Name ?? ""),
      state: Number(s.State ?? 2),
      online,
      capacity: Number(s.Total ?? 0),
      mustLevel: Number(s.MustLevel ?? 0),
      lowestLevel: Number(s.LowestLevel ?? 0),
      pvpOnly: !!s.PvpOnly,
      newerServer: !!s.NewerServer,
      wsUrl: (s.WsUrl as string | null) || ctx.cfg.GAME_WS_URL,
    });
  }
  return out;
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
      game: await playConfig(ctx, acc && !acc.IsBanned ? acc : null, req.ip, (req.query as { client?: string }).client),
    };
  });

  f.get("/api/public/status", async () => serverStatus(ctx));

  // site-play: canais pro seletor da página Jogar (ver ChannelInfo acima)
  f.get("/api/public/channels", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async () => channelList(ctx));

  f.get("/api/public/aim-tables", async () => {
    const sc = (await setting<Record<string, unknown>>(ctx, "server-config")) ?? {};
    const raw = Array.isArray(sc.aimAngles) ? sc.aimAngles : [];
    const angles = raw.map(Number).filter((n) => Number.isFinite(n) && n > 0 && n < 90);
    return aimTablesFor(angles.length ? angles : AIM_DEFAULT_ANGLES);
  });

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
    const servers = await q(ctx.h, sql`SELECT * FROM player."Server_List" WHERE "Enabled" = true AND "State" <> -1 ORDER BY "SortOrder", "ID"`);
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
