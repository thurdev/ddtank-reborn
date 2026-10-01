/**
 * GameServer (Game.Server/GameServer.cs Start/Stop + Center.Server's online registry): boots caches, listeners,
 * timers (DB autosave, ping, speed-heartbeat watchdog, server heartbeat) and the admin channel.
 */
import type net from "node:net";
import type http from "node:http";
import type { WebSocketServer } from "ws";
import { createDb, type DbHandle } from "@ddt/db";
import { parseDotNetRsaXml, rsaKeyFromPem, type RsaPrivateKey } from "@ddt/protocol";
import { readRsaKeyText, type Config } from "./config.js";
import { Templates, heartbeat, upsertServer } from "./db/templates.js";
import { resetAllOnline } from "./db/characters.js";
import { createRegistry } from "./handlers/index.js";
import type { HandlerRegistry } from "./handlers/registry.js";
import { checkMissingHeartbeat } from "./handlers/basic.js";
import { GameClient, type Transport } from "./session/client.js";
import { World, type ServerContext, type TicketValidator } from "./session/context.js";
import { dbTicketValidator, quitPlayer } from "./session/login.js";
import { RoomMgr } from "./rooms/room-mgr.js";
import { StubFightEngine } from "./fight/stub.js";
import type { FightEngine } from "./fight/types.js";
import type { BotProvider } from "./bots/bot.js";
import { startPolicy, startTcp, startWs, type ConnectionGate } from "./net/transports.js";
import { startAdmin } from "./admin/http.js";
import * as Out from "./packets/out.js";
import { LanguageMgr } from "./util/lang.js";
import { createLogger, type Logger } from "./util/log.js";

export interface GameServerOptions {
  /** Pre-opened DB (tests use PGlite memory). Default: createDb(cfg.DATABASE_URL). */
  db?: DbHandle;
  rsaKey?: RsaPrivateKey;
  tickets?: TicketValidator;
  fight?: FightEngine;
  bots?: BotProvider;
  logger?: Logger;
}

export function parseRsaKey(text: string): RsaPrivateKey {
  if (text.includes("BEGIN")) return rsaKeyFromPem(text);
  const m = /<RSAKeyValue>[\s\S]*?<\/RSAKeyValue>/.exec(text);
  const key = parseDotNetRsaXml(m ? m[0] : text) as RsaPrivateKey;
  if (!("d" in key)) throw new Error("RSA key has no private part");
  return key;
}

export class GameServer {
  ctx!: ServerContext;
  handlers!: HandlerRegistry;
  readonly clients = new Set<GameClient>();
  private perIp = new Map<string, number>();
  tcp: net.Server | null = null;
  ws: WebSocketServer | null = null;
  policy: net.Server | null = null;
  admin: http.Server | null = null;
  private timers: NodeJS.Timeout[] = [];
  private ownsDb = false;
  private startedAt = Date.now();

  constructor(readonly cfg: Config, private readonly opts: GameServerOptions = {}) {}

  async start(): Promise<this> {
    const cfg = this.cfg;
    const log = this.opts.logger ?? createLogger(cfg.LOG_LEVEL);
    const db = this.opts.db ?? (await createDb(cfg.DATABASE_URL));
    this.ownsDb = !this.opts.db;
    let rsaKey = this.opts.rsaKey;
    if (!rsaKey) {
      const text = readRsaKeyText(cfg);
      if (!text) throw new Error("No RSA private key: set RSA_PRIVATE_KEY / RSA_PRIVATE_KEY_FILE (or RSA_USE_VENDOR_KEY=true in dev)");
      rsaKey = parseRsaKey(text);
    }
    const templates = await new Templates().load(db.db, cfg.SERVER_ID);
    log.info(`templates: ${templates.items.size} items, ${templates.shop.size} shop goods, ${templates.maps.size} maps`);
    const lang = LanguageMgr.fromFile(cfg.LANGUAGE_FILE);
    const fight = this.opts.fight ?? new StubFightEngine((m) => templates.pickMap(m, cfg.SERVER_ID), (m) => log.debug(m));
    const zoneId = templates.server?.ZoneId ?? 1;
    const zoneName = templates.server?.ZoneName ?? cfg.SERVER_NAME ?? "DDTank";
    const rooms = new RoomMgr({ maxRooms: templates.server?.Room ?? cfg.MAX_ROOMS, fight, lang: (k, ...a) => lang.t(k, ...a), bots: this.opts.bots });
    this.ctx = {
      cfg, db, templates, lang, log, rooms, fight, rsaKey, zoneId, zoneName,
      world: new World(),
      tickets: this.opts.tickets ?? dbTicketValidator(db, cfg.DEV_ALLOW_ANY_TICKET),
      now: () => new Date(),
    };
    this.handlers = createRegistry();
    await resetAllOnline(db.db).catch(() => {});
    rooms.start();

    const gate: ConnectionGate = {
      accept: (ip) => {
        if (this.clients.size >= cfg.MAX_CONNECTIONS) return false;
        const n = this.perIp.get(ip) ?? 0;
        if (n >= cfg.MAX_CONNECTIONS_PER_IP) return false;
        this.perIp.set(ip, n + 1);
        return true;
      },
      release: (ip) => {
        const n = (this.perIp.get(ip) ?? 1) - 1;
        if (n <= 0) this.perIp.delete(ip);
        else this.perIp.set(ip, n);
      },
      attach: (t) => this.attach(t),
    };
    this.tcp = await startTcp(cfg.BIND_HOST, cfg.GAME_PORT, gate, log);
    if (cfg.WS_ENABLED) {
      const origins = cfg.WS_ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
      this.ws = await startWs({ host: cfg.BIND_HOST, port: cfg.WS_PORT, path: cfg.WS_PATH, allowedOrigins: origins, maxPayload: cfg.WS_MAX_PAYLOAD }, gate, log);
    }
    if (cfg.POLICY_ENABLED) this.policy = await startPolicy(cfg.BIND_HOST, cfg.POLICY_PORT, log);
    if (cfg.ADMIN_ENABLED) this.admin = await startAdmin(cfg.ADMIN_HOST, cfg.ADMIN_PORT, cfg.ADMIN_TOKEN, this.adminApi(), log);

    if (cfg.SERVER_HEARTBEAT) {
      const wsUrl = cfg.WS_ENABLED ? cfg.WS_PUBLIC_URL ?? `ws://${cfg.PUBLIC_HOST}:${this.wsPort}${cfg.WS_PATH}` : null;
      await upsertServer(db.db, { id: cfg.SERVER_ID, name: zoneName, host: cfg.PUBLIC_HOST, port: this.tcpPort, wsUrl }).catch((e) => log.warn(`app."Servers" not available (no migration yet?): ${(e as Error).message.split(String.fromCharCode(10))[0]}`));
      this.every(60_000, () => heartbeat(db.db, cfg.SERVER_ID, this.ctx.world.size));
    }
    // m_saveDbTimer (DBAutosaveInterval) + speed heartbeat watchdog (GamePlayer.SaveIntoDatabase).
    this.every(cfg.SAVE_INTERVAL_MIN * 60_000, () => this.saveAll(true));
    // m_pingCheckTimer: SendPingTime to every player.
    this.every(cfg.PING_INTERVAL_MIN * 60_000, () => {
      for (const p of this.ctx.world.all()) {
        p.pingStart = Date.now();
        p.send(Out.pingTime(p.info.AntiAddiction));
      }
    });
    return this;
  }

  get tcpPort(): number {
    return (this.tcp?.address() as net.AddressInfo | null)?.port ?? this.cfg.GAME_PORT;
  }
  get wsPort(): number {
    return (this.ws?.address() as net.AddressInfo | null)?.port ?? this.cfg.WS_PORT;
  }
  get adminPort(): number {
    return (this.admin?.address() as net.AddressInfo | null)?.port ?? this.cfg.ADMIN_PORT;
  }

  private every(ms: number, fn: () => unknown): void {
    if (!(ms > 0)) return;
    const t = setInterval(() => {
      Promise.resolve()
        .then(fn)
        .catch((e) => this.ctx.log.error("timer failed", e));
    }, ms);
    t.unref();
    this.timers.push(t);
  }

  /** Creates the GameClient for a transport (also used by tests with a fake transport). */
  attach(t: Transport): GameClient {
    const c = new GameClient(t, this.ctx, this.handlers);
    this.clients.add(c);
    c.onClosed = () => {
      this.clients.delete(c);
      const p = c.player;
      if (p) void c.idle().then(() => quitPlayer(this.ctx, p));
    };
    return c;
  }

  async saveAll(watchdog = false): Promise<void> {
    for (const p of this.ctx.world.all()) {
      try {
        if (watchdog && (await checkMissingHeartbeat(this.ctx, p))) continue;
        await p.saveIntoDatabase(this.ctx.db.db);
      } catch (err) {
        this.ctx.log.error(`autosave failed for ${p.id}`, err);
      }
    }
  }

  private adminApi() {
    return {
      status: () => ({ online: this.ctx.world.size, players: this.ctx.world.size, rooms: this.ctx.rooms.usingRooms().length, capacity: this.ctx.templates.server?.Total ?? this.cfg.MAX_CONNECTIONS }),
      stats: () => ({
        online: this.ctx.world.size,
        connections: this.clients.size,
        rooms: this.ctx.rooms.usingRooms().length,
        playingRooms: this.ctx.rooms.usingRooms().filter((r) => r.IsPlaying).length,
        lobby: this.ctx.rooms.waiting.size,
        uptimeSec: Math.round((Date.now() - this.startedAt) / 1000),
        memoryMB: Math.round(process.memoryUsage().rss / 1048576),
        serverId: this.cfg.SERVER_ID,
        zone: this.ctx.zoneName,
        fight: this.ctx.fight.name,
      }),
      broadcast: (msg: string, type: number) => {
        const pkt = Out.message(type, msg);
        const all = this.ctx.world.all();
        for (const p of all) p.send(pkt);
        return all.length;
      },
      kick: async (tgt: { userId?: number; nick?: string }, msg: string) => {
        const p = tgt.userId ? this.ctx.world.get(tgt.userId) : tgt.nick ? this.ctx.world.getByNick(tgt.nick) : undefined;
        if (!p) return false;
        p.send(Out.kitoff(msg));
        p.sink.disconnect("admin kick");
        await quitPlayer(this.ctx, p);
        return true;
      },
      reloadTemplates: async () => {
        await this.ctx.templates.load(this.ctx.db.db, this.cfg.SERVER_ID);
        return { items: this.ctx.templates.items.size, shop: this.ctx.templates.shop.size, maps: this.ctx.templates.maps.size };
      },
    };
  }

  async stop(): Promise<void> {
    for (const t of this.timers) clearInterval(t);
    this.ctx?.rooms.stop();
    await this.saveAll().catch(() => {});
    for (const c of [...this.clients]) c.disconnect("server stop");
    for (const p of this.ctx?.world.all() ?? []) await quitPlayer(this.ctx, p);
    await Promise.all([
      new Promise((r) => (this.tcp ? this.tcp.close(r) : r(null))),
      new Promise((r) => (this.ws ? this.ws.close(r) : r(null))),
      new Promise((r) => (this.policy ? this.policy.close(r) : r(null))),
      new Promise((r) => (this.admin ? this.admin.close(r) : r(null))),
    ]);
    if (this.ownsDb) await this.ctx.db.close();
  }
}
