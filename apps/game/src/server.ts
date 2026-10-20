/**
 * GameServer (Game.Server/GameServer.cs Start/Stop + Center.Server's online registry): boots caches, listeners,
 * timers (DB autosave, ping, speed-heartbeat watchdog, server heartbeat) and the admin channel.
 */
import { grantRewards } from "./game/events.js";
import type net from "node:net";
import type http from "node:http";
import type { WebSocketServer } from "ws";
import { createDb, type DbHandle } from "@ddt/db";
import { parseDotNetRsaXml, rsaKeyFromPem, type RsaPrivateKey } from "@ddt/protocol";
import { readRsaKeyText, type Config } from "./config.js";
import { Templates, heartbeat, upsertServer } from "./db/templates.js";
import { resetAllOnline } from "./db/characters.js";
import { createBus, type Bus } from "./bus/index.js";
import { wireCrossChannel } from "./bus/cross-channel.js";
import { wireLeaderElection } from "./bus/leader.js";
import { createRegistry } from "./handlers/index.js";
import type { HandlerRegistry } from "./handlers/registry.js";
import { checkMissingHeartbeat } from "./handlers/basico/index.js";
import { GameClient, type Transport } from "./session/client.js";
import { World, type ServerContext, type TicketValidator } from "./session/context.js";
import { NewHallRoom } from "./game/new-hall.js";
import { ConsBatRoom } from "./game/consortia-battle.js";
import { RingStationRoom, onFightOver as ringStationGameOver } from "./game/ringstation.js";
import { CollectionTaskRoom } from "./game/collection-task.js";
import { dbTicketValidator, quitPlayer } from "./session/login.js";
import { consortiaGameOver } from "./handlers/sociedade/index.js";
import { consortiaMgr } from "./game/consortia-mgr.js";
import { RoomMgr } from "./rooms/room-mgr.js";
import { RoomType } from "./rooms/room.js";
import { StubFightEngine } from "./fight/stub.js";
import { DdtFightEngine } from "./fight/ddt.js";
import type { FightEngine } from "./fight/types.js";
import { updateLabyrinthFloor, outLabyrinth } from "./handlers/eventos/labirinto.js";
import { recordPveClear } from "./db/pve-progress.js";
import { eliteChampionFlee, eliteChampionGameOver, updateEliteScore } from "./handlers/eventos/liga-elite.js";
import { onRescueGameOver } from "./handlers/eventos/resgate.js";
import { onCatchBeastHurt } from "./game/catchbeast.js";
import type { BotProvider, VirtualPlayer } from "./bots/bot.js";
import { DbBotProvider } from "./bots/provider.js";
import { ItemInfo } from "./game/item.js";
import { fightLabDrop, setFightLabPermission } from "./game/fightlab.js";
import type { GamePlayer, RoomMember } from "./game/player.js";
import { startPolicy, startTcp, startWs, type ConnectionGate } from "./net/transports.js";
import { startAdmin } from "./admin/http.js";
import { eventsRuntime } from "./handlers/eventos/agendador.js";
import { pushRecords } from "./handlers/eventos/completar-conquista.js";
import { worldBossDamage } from "./handlers/eventos/boss-mundial.js";
import { scanExpiredAuctions } from "./handlers/leilao/index.js";
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
  /** ch-bus: barramento entre canais. Default: createBus(cfg, ...) (NoopBus sem REDIS_URL). Tests link 2+
   *  GameServer com um `createMemoryBus(hub)` compartilhado (ver bus/memory.ts, test/ch-bus.test.ts). */
  bus?: Bus;
}

export function parseRsaKey(text: string): RsaPrivateKey {
  if (text.includes("BEGIN")) return rsaKeyFromPem(text);
  const m = /<RSAKeyValue>[\s\S]*?<\/RSAKeyValue>/.exec(text);
  const key = parseDotNetRsaXml(m ? m[0] : text) as RsaPrivateKey;
  if (!("d" in key)) throw new Error("RSA key has no private part");
  return key;
}

/**
 * PVPGame.TakeCard drop: DropInventory.CardDrop(roomType) (eDropType.Cards = 1, Para1 = room type, Para2 = "0").
 * The original adds it to the TempBag and moves it to the bags after the game; here it goes straight to its bag.
 */
function takeCardDrop(templates: Templates, m: RoomMember, roomType: number): { templateId: number; count: number } {
  const dropId = templates.findDropCondition(1, String(roomType), "0");
  const d = dropId ? templates.dropOne(dropId) : null;
  const t = d ? templates.findItem(d.templateId) : undefined;
  if (!d || !t || m.isBot) return { templateId: 0, count: 0 };
  const p = m as GamePlayer;
  const item = ItemInfo.createFromTemplate(t, d.count, 101);
  item.IsBinds = d.isBind;
  item.ValidDate = d.validDate;
  const inv = p.getItemInventory?.(t);
  if (!inv?.addTemplate(item, d.count)) p.tempBag?.addTemplate(item, d.count);
  return { templateId: d.templateId, count: d.count };
}

/**
 * PaymentTakeCardCommand.cs (GAME_CMD sub 114): pay Money for an extra card flip (437 VIP / 486 non-VIP). The
 * original's Card_Get buff (BuffType 73) free-use fast path isn't ported — bots never have it and the common case
 * is Money, so this always charges Money (same net cost to a player without that rare buff).
 */
export function payTakeCard(m: RoomMember): boolean {
  if (m.isBot) return false;
  const p = m as GamePlayer;
  const cost = (p.info.typeVIP ?? 0) > 0 ? 437 : 486;
  if (p.info.Money + p.info.MoneyLock < cost) { p.sendMessage?.(1, "Cupons insuficientes."); return false; }
  p.removeMoney(cost);
  return true;
}

/** PVEGame.TakeCard / SimpleNpc.GetDropItemInfo: special templates are currencies (ShopMgr.FindSpecialItemInfo), the rest
 *  goes to its bag (temp bag when full). */
function giveDropItems(templates: Templates, m: RoomMember, items: { templateId: number; count: number; isBind?: boolean; validDate?: number }[], goldRate = 1, bag: "temp" | "fight" = "temp"): void {
  if (m.isBot) return;
  const p = m as GamePlayer;
  for (const d of items) {
    if (d.templateId === -100) { p.addGold?.(d.count * goldRate); continue; }
    if (d.templateId === -200) { p.info.Money += d.count; p.updateProperties?.(); continue; }
    if (d.templateId === -300) { p.addGiftToken?.(d.count); continue; }
    const t = templates.findItem(d.templateId);
    if (!t) continue;
    const item = ItemInfo.createFromTemplate(t, d.count, 101);
    item.IsBinds = d.isBind ?? true;
    item.ValidDate = d.validDate ?? 0;
    // Player.OpenBox: fight props (category 10) from a battle box go to the FightBag (usable at once, bag 2)
    if (bag === "fight" && t.CategoryID === 10 && p.fightBag?.addTemplate(item, d.count)) continue;
    const inv = p.getItemInventory?.(t);
    if (!inv?.addTemplate(item, d.count)) p.tempBag?.addTemplate(item, d.count);
  }
}

/** GamePlayer.SetFightLabPermission side effects (GamePlayer.cs:3140-3185): items to bag (mail-less: temp bag), GM notice, 67. */
export function applyFightLabWin(templates: Templates, p: GamePlayer, pveId: number, hardLevel: number, missionId: number, t: (k: string, ...a: unknown[]) => string): void {
  if (!p.info) return;
  const r = setFightLabPermission(p.info.FightLabPermission ?? "", pveId, hardLevel);
  p.info.FightLabPermission = r.perm;
  if (r.reward) {
    const items = fightLabDrop(templates, missionId);
    if (items.length) {
      giveDropItems(templates, p, items);
      const names = items.map((d) => t("Game.Server.Quests.FinishQuest.RewardProp", templates.findItem(d.templateId)?.Name ?? String(d.templateId), d.count)).join(" ");
      p.sendMessage?.(0, `${t("Recompensa da sala de treino")}: ${names}`);
    }
  }
  p.updateProperties?.();
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
    const templates = await new Templates().load(db.db, cfg.SERVER_ID, cfg.DEFAULT_LANG);
    log.info(`templates: ${templates.items.size} items, ${templates.shop.size} shop goods, ${templates.maps.size} maps`);
    const lang = LanguageMgr.fromFile(cfg.LANGUAGE_FILE);
    const pickMap = (m: number) => templates.pickMap(m, cfg.SERVER_ID);
    const fight =
      this.opts.fight ??
      (process.env.FIGHT_ENGINE === "stub"
        ? new StubFightEngine(pickMap, (m) => log.debug(m))
        : new DdtFightEngine({
            pickMap,
            log: (m) => log.warn(m),
            gradeForGp: (gp) => templates.gradeForGp(gp),
            onWorldBossHurt: (m, hurt) => { if (this.ctx) worldBossDamage(this.ctx, m as GamePlayer, hurt); },
            // m4-catchbeast: unconditional overwrite (win or lose) — see game/catchbeast.ts header.
            onCatchBeastHurt: (m, hurt) => { if (this.ctx && !(m as GamePlayer).isBot) void onCatchBeastHurt(this.ctx, m as GamePlayer, hurt).catch((e) => log.warn(`catchbeast hurt: ${(e as Error).message}`)); },
            // admin-config: server-config's expRate (templates.rates.exp) multiplies with any active "double_exp" window.
            expRate: () => templates.rates.exp * (this.ctx ? eventsRuntime(this.ctx).scheduler.rate("double_exp") : 1),
            takeCard: (m, roomType) => takeCardDrop(templates, m, roomType),
            payTakeCard: (m) => payTakeCard(m),
            onPlayerGameOver: (m, g) => {
              (m as GamePlayer).questInv?.onGameOver(g);
              pushRecords(m as GamePlayer); // ChangeWin/ChangeTotal/ChangeGrade achievement records (229)
              // GamePlayer.AddPrestige + RingstationResult (only the real challenger seat; the bot never reaches here)
              if (g.roomType === RoomType.RingStation && !(m as GamePlayer).isBot) void ringStationGameOver(this.ctx!, m as GamePlayer, g.isWin).catch((e) => log.warn(`ringstation game over: ${(e as Error).message}`));
              // m3-elite-brackets: score-phase ladder (162 ELITEGAME) — real PvP room, same shape as a normal
              // Match room, just tagged RoomType.EliteGameScore so this hook can update EliteScore.
              if (g.roomType === RoomType.EliteGameScore && !(m as GamePlayer).isBot) updateEliteScore(m as GamePlayer, g.isWin);
              // m4-resgate: score/star come from this real fight's own kill count — see game/rescue.ts header.
              if (g.roomType === RoomType.Rescue && !(m as GamePlayer).isBot) void onRescueGameOver(this.ctx!, m as GamePlayer, g).catch((e) => log.warn(`rescue game over: ${(e as Error).message}`));
            },
            onGameOver: (g) => {
              void consortiaGameOver(this.ctx!, g).catch((e) => log.warn(`consortia game over: ${e}`));
              // m3-elite-brackets: champion-phase bracket round result (162 ELITEGAME) — advances the winner,
              // closes out the bracket when it's the final.
              if (g.roomType === RoomType.EliteGameChampion) eliteChampionGameOver(this.ctx!, g);
            },
            onMissionOver: (m, g) => {
              (m as GamePlayer).questInv?.onMissionOver(g.missionId, g.isWin, g.turnNum);
              // PVEGame.cs:802: a won fight-lab mission unlocks the next level; first clear pays FightLabUserDrop
              if (g.gameType === 8 && g.isWin && g.pveId !== undefined) applyFightLabWin(templates, m as GamePlayer, g.pveId, g.hardLevel ?? 0, g.missionId, (k, ...a) => lang.t(k, ...a));
              // GamePlayer.UpdateLabyrinth via the gate-triggered ShowBigBox (PVEGame.cs:1495-1515): one floor won.
              if (g.roomType === RoomType.Labyrinth && g.isWin && !(m as GamePlayer).isBot) void updateLabyrinthFloor(this.ctx, m as GamePlayer, g.missionId).catch((e) => log.warn(`labyrinth floor: ${(e as Error).message}`));
              if (this.ctx) void consortiaMgr(this.ctx).then((c) => c.onMission(m as GamePlayer, g.missionId, g.isWin));
            },
            worldBossBlood: () => (this.ctx ? eventsRuntime(this.ctx).boss.blood : 0),
            // admin-config: server-config's goldRate (templates.rates.gold) multiplies with any active "double_gold" window.
            giveItems: (m, items, bag) => giveDropItems(templates, m, items, templates.rates.gold * (this.ctx ? eventsRuntime(this.ctx).scheduler.rate("double_gold") : 1), bag),
            // DropInventory.BoxDrop: eDropType.Box = 2, Para1 = room type
            boxDrop: (roomType) => {
              const id = templates.findDropCondition(2, String(roomType), "0");
              const d = id ? templates.dropOne(id) : null;
              return d ? [d] : null;
            },
            petSkill: (id) => templates.pets.skills.get(id),
            onPlayerFlee: (m, g) => {
              // PVPGame.RemovePlayer (PVPGame.cs:647): −grade×12 GP; Match: −5 offer (−15 guild war)
              const p = m as GamePlayer;
              const gp = p.info.Grade * 12;
              p.info.GP = Math.max(0, p.info.GP - gp);
              const offer = g.roomType === 0 ? (g.gameType === 1 ? 15 : g.gameType === 0 ? 5 : 0) : 0;
              if (offer) p.info.Offer = Math.max(0, p.info.Offer - offer);
              p.updateProperties?.();
              p.sendMessage?.(3, offer ? lang.t("AbstractPacketLib.SendGamePlayerLeave.Msg6", gp, offer) : lang.t("AbstractPacketLib.SendGamePlayerLeave.Msg4", gp));
              // m3-ringstation: fleeing never reaches onPlayerGameOver — without this, `ctx.ringStation`'s
              // pending-challenge guard (game/ringstation.ts) and the defender's OnFight lock would leak
              // forever. Counts as a loss (no client-reported result involved either way).
              if (g.roomType === RoomType.RingStation) void ringStationGameOver(this.ctx!, p, false).catch((e) => log.warn(`ringstation flee: ${(e as Error).message}`));
              // m3-elite-brackets: fleeing a champion-bracket fight never reaches onPlayerGameOver — without
              // this, the opponent's `inProgress` round would never resolve (same leak class as m3-ringstation's flee fix).
              if (g.roomType === RoomType.EliteGameChampion) eliteChampionFlee(this.ctx!, p);
            },
            pve: {
              data: { npc: (id) => templates.npcs.get(id) as never, mission: (id) => templates.missions.get(id) as never },
              pveInfo: (id, roomType, levelLimits) => (id !== 0 && id !== 100000 ? templates.pveInfos.get(id) : templates.pveByType(roomType, levelLimits)) as never,
              drop: (kind, id, user) => templates.pveDrop(kind, id, user),
              translate: (key, args) => lang.t(key, ...args),
              // Task 41-instancias: admin-config NPC HP/damage/defence/reward multipliers per dungeon+difficulty.
              balance: (pveId, hardLevel) => templates.pveBalance(pveId, hardLevel),
            },
            botProfile: (b) => ({ difficulty: (b as VirtualPlayer & { difficulty?: number }).difficulty ?? 50 }),
          }));
    let bots = this.opts.bots;
    if (!bots && cfg.BOT_FALLBACK_SEC > 0) bots = await new DbBotProvider(templates).load(db.db).catch((e) => (log.warn(`bots: ${e}`), new DbBotProvider(templates)));
    const zoneId = templates.server?.ZoneId ?? 1;
    const zoneName = templates.server?.ZoneName ?? cfg.SERVER_NAME ?? "DDTank";
    const rooms = new RoomMgr({
      maxRooms: templates.server?.Room ?? cfg.MAX_ROOMS, fight, lang: (k, ...a) => lang.t(k, ...a), bots, botFallbackSec: cfg.BOT_FALLBACK_SEC, allOpen: cfg.ALL_OPEN,
      // GamePlayer.OutLabyrinth(isWin) (GamePlayer.cs:4315): Labyrinth rooms are solo (host only).
      onLabyrinthFinished: (room, isWin) => {
        const host = room.host;
        if (this.ctx && host && !host.isBot) void outLabyrinth(this.ctx, host as GamePlayer, isWin).catch((e) => log.warn(`labyrinth finished: ${(e as Error).message}`));
      },
      // Task 41-instancias (Reborn addition): a won Dungeon run unlocks the next difficulty for every human
      // seat that was in the room (bots never persist progress — same convention as giveItems/giveDropItems).
      onDungeonCleared: (room, pveId, hardLevel, isWin) => {
        if (!isWin || !this.ctx) return;
        for (const m of room.getPlayers()) {
          if (m.isBot) continue;
          void recordPveClear(this.ctx, m.id, pveId, hardLevel).catch((e) => log.warn(`pve clear: ${(e as Error).message}`));
        }
      },
    });
    const bus = this.opts.bus ?? createBus(cfg, (m) => log.warn(m));
    this.ctx = {
      cfg, db, templates, lang, log, rooms, fight, rsaKey, zoneId, zoneName, bus,
      world: new World(),
      newHall: new NewHallRoom(),
      consBat: new ConsBatRoom(),
      ringStation: new RingStationRoom(),
      collectionTask: new CollectionTaskRoom(),
      tickets: this.opts.tickets ?? dbTicketValidator(db, cfg.DEV_ALLOW_ANY_TICKET),
      now: () => new Date(),
      leader: undefined as never, // set right below: wireLeaderElection precisa do ctx já montado
      crossChannel: undefined as never, // idem: wireCrossChannel usa ctx.leader (ch-eventos: boss mundial)
    };
    this.ctx.leader = wireLeaderElection(this.ctx);
    this.ctx.crossChannel = wireCrossChannel(this.ctx);
    this.handlers = createRegistry();
    await resetAllOnline(db.db, cfg.SERVER_ID).catch(() => {});
    rooms.start();
    // events / activities: template caches + EventScheduler (app."ScheduledEvents"; world boss, league, elite, weekly reset, x2 windows)
    const events = eventsRuntime(this.ctx);
    await events.reload().catch((e) => log.warn(`events: ${(e as Error).message.split(String.fromCharCode(10))[0]}`));
    const tick = Number(process.env.EVENT_TICK_SEC ?? 30);
    if (tick > 0) events.scheduler.start(tick * 1000);

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
    // SP_Auction_Scan equivalent: settle expired listings (buyer win or unsold return) on a timer.
    const auctionScanSec = Number(process.env.AUCTION_SCAN_SEC ?? 300);
    if (auctionScanSec > 0) this.every(auctionScanSec * 1000, () => scanExpiredAuctions(this.ctx));
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
        // ch-eventos: replica pros outros canais (bus/cross-channel.ts systemNotice, no-op sem barramento
        // ativo) — apps/api só precisa falar com o canal LOCAL (GAME_INTERNAL_URL), o resto é aqui.
        this.ctx.crossChannel.systemNotice(msg, type);
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
        await this.ctx.templates.load(this.ctx.db.db, this.cfg.SERVER_ID, this.cfg.DEFAULT_LANG);
        const ev = eventsRuntime(this.ctx);
        await ev.reload();
        return { items: this.ctx.templates.items.size, shop: this.ctx.templates.shop.size, maps: this.ctx.templates.maps.size, scheduledEvents: ev.scheduler.events.length, achievements: ev.data.achievements.size };
      },
      events: () => eventsRuntime(this.ctx).status(),
      eventsForce: async (kind: string, minutes: number) => {
        const ev = eventsRuntime(this.ctx);
        ev.scheduler.force(kind, minutes);
        await ev.scheduler.tick();
        return ev.status();
      },
      eventsStop: async (kind: string) => {
        const ev = eventsRuntime(this.ctx);
        ev.scheduler.stop(kind);
        await ev.scheduler.tick();
        return ev.status();
      },
      giveItem: (tgt: { userId?: number; nick?: string }, templateId: number, count: number, bind: boolean) => {
        const p = tgt.userId ? this.ctx.world.get(tgt.userId) : tgt.nick ? this.ctx.world.getByNick(tgt.nick) : undefined;
        if (!p) return null;
        const r = grantRewards(p, [{ templateId, count, isBind: bind }], this.ctx.templates.findItem, this.ctx.now());
        return r.summary;
      },
      mailNotice: (userId: number) => {
        const p = this.ctx.world.get(userId);
        if (p) p.send(Out.mailResponse(p.id, 1));
        return !!p;
      },
    };
  }

  async stop(): Promise<void> {
    for (const t of this.timers) clearInterval(t);
    if (this.ctx) eventsRuntime(this.ctx).scheduler.stopTimer();
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
    this.ctx?.crossChannel.close();
    this.ctx?.leader.close();
    // Só fecha o bus se este GameServer criou (não é um bus de teste compartilhado entre vários GameServer).
    if (this.ctx && !this.opts.bus) await this.ctx.bus.close().catch(() => {});
    if (this.ownsDb) await this.ctx.db.close();
  }
}
