/**
 * m1-bot-pvp: bots (VirtualPlayer, auto-match fallback in rooms/room-mgr.ts) must (1) actually play every
 * turn of a real battle to a winner, through the real `DbBotProvider` (not a test double), and (2) show up
 * with the Attack/Defence/Style/Colors the admin equipped on app."Bots", via the same `game/stats.ts
 * computeStats()` path real players use (bots/view.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app, game as gameSchema } from "@ddt/db";
import { GameServer, payTakeCard } from "../src/server.js";
import { testConfig } from "../src/config.js";
import { DdtFightEngine } from "../src/fight/ddt.js";
import { Templates } from "../src/db/templates.js";
import { DbBotProvider } from "../src/bots/provider.js";
import { buildBotEquip, buildBotView } from "../src/bots/view.js";
import { placeForCategory, type ItemTemplate } from "../src/game/item.js";
import { type FakeClient, loggedIn, sharedDb, testKey } from "./helpers.js";

describe("bots/view.ts placeForCategory (EquipType.CategeryIdToPlace, Source Flash/src/ddt/data/EquipType.as:699-727)", () => {
  it("places the categories this server already relies on at the right slot", () => {
    expect(placeForCategory(1)).toEqual([0]); // Hat (userNimbus "category 1" armour)
    expect(placeForCategory(5)).toEqual([4]); // Cloth (userNimbus "category 5" armour)
    expect(placeForCategory(7)).toEqual([6]); // Weapon (GamePlayer.mainWeapon = equipBag.getItemAt(6))
    expect(placeForCategory(14)).toEqual([12]); // Necklace (getBaseBlood equip[12])
    expect(placeForCategory(17)).toEqual([15]); // Second weapon (GamePlayer.secondWeapon)
    expect(placeForCategory(13)).toEqual([11]); // Suits
    expect(placeForCategory(19)).toEqual([18]); // Healstone (fight/ddt.ts equipBag.getItemAt(18))
    expect(placeForCategory(8)).toEqual([7, 8]); // Armlet: 2 candidate slots
  });
});

describe("bots/view.ts buildBotEquip/buildBotView", () => {
  const TPL: Record<number, Partial<ItemTemplate>> = {
    7001: { TemplateID: 7001, CategoryID: 7, Attack: 5, Defence: 0, Agility: 0, Luck: 0, Property7: 100, Pic: "w7001", Colors: "" },
    990001: { TemplateID: 990001, CategoryID: 1, Attack: 0, Defence: 40, Agility: 0, Luck: 0, Property7: 20, Pic: "hat1", Colors: "red,green" },
    990002: { TemplateID: 990002, CategoryID: 5, Attack: 0, Defence: 10, Agility: 5, Luck: 5, Property7: 10, Pic: "cloth1", Colors: "blue" },
  };
  const findItem = (id: number): ItemTemplate | undefined => TPL[id] as ItemTemplate | undefined;
  const stats: import("../src/bots/view.js").BotStatSource = {
    findItem,
    stats: { findItem, exercise: [], totems: new Map(), goldEquip: () => undefined, cardUpdate: () => undefined, petFight: () => undefined, petMoe: () => undefined, suitParts: new Map(), suits: new Map(), clothProperty: () => undefined, countClothGroupWithID: () => 0, mountTemplate: () => undefined, mountDraw: () => undefined },
    levels: new Map([[20, 500]]),
  };

  it("auto-places weapon + equips by CategoryID and builds the EquipBag-shaped array", () => {
    const equip = buildBotEquip({ id: 1, nickname: "x", sex: true, level: 20, weaponTemplateId: 7001, equips: [990001, 990002] }, findItem);
    expect(equip[6]?.TemplateID).toBe(7001); // weapon
    expect(equip[0]?.TemplateID).toBe(990001); // hat
    expect(equip[4]?.TemplateID).toBe(990002); // cloth
  });

  it("computes real Attack/Defence/Style/Colors/Skin from the equipped templates (same computeStats path as a human)", () => {
    const view = buildBotView({ id: 1, nickname: "x", sex: true, level: 20, weaponTemplateId: 7001, equips: [990001, 990002] }, stats);
    expect(view.attack).toBeGreaterThan(0); // weapon Attack=5 at least
    expect(view.defence).toBeGreaterThan(0); // hat 40 + cloth 10
    expect(view.agility).toBeGreaterThan(0); // cloth 5
    expect(view.luck).toBeGreaterThan(0); // cloth 5
    expect(view.baseAttack).toBeGreaterThan(0); // weapon Property7 + hert addition
    expect(view.baseDefence).toBeGreaterThan(0); // hat + cloth Property7
    expect(view.hp).toBeGreaterThan(500); // levelBlood(20)=500 + extras
    expect(view.style.startsWith("990001|hat1,")).toBe(true); // place 0 first, no leading comma
    expect(view.style).toContain("990002|cloth1"); // place 4 (5th comma-separated field)
    expect(view.style).toContain("7001|w7001"); // place 6 (weapon, 7th field)
    expect(view.colors.startsWith("red,")).toBe(true);
    expect(view.skin).toBe(""); // only place 5 (Face) feeds Skin; cloth isn't read for it (same as player.ts)
  });

  it("never leaves a bot at literal 0 stats when the admin gave it no equips at all (level-scaled floor, documented)", () => {
    const view = buildBotView({ id: 2, nickname: "bare", sex: true, level: 20, weaponTemplateId: 404040, equips: [] }, stats); // unknown weapon id -> no template found
    expect(view.attack).toBeGreaterThan(0);
    expect(view.defence).toBeGreaterThan(0);
    expect(view.baseAttack).toBeGreaterThan(0);
    expect(view.baseDefence).toBeGreaterThan(0);
  });
});

describe("m1-bot-pvp: real DbBotProvider through a full GameServer", () => {
  let server: GameServer;
  let engine: DdtFightEngine;
  let bots: DbBotProvider;
  let clock = Date.now();

  beforeAll(async () => {
    const db = await sharedDb();
    // Synthetic armour templates (seeded test DB already has a real weapon 7001 from SEED_TABLES).
    await db.db.insert(gameSchema.Shop_Goods).values([
      { TemplateID: 991001, CanRecycle: 0, CategoryID: 1, Attack: 0, Defence: 60, Agility: 0, Luck: 0, Level: 1, Quality: 1, MaxCount: 1, NeedSex: 0, NeedLevel: 1, CanStrengthen: false, CanCompose: false, CanDrop: false, CanEquip: true, CanUse: false, CanDelete: true, Property1: 0, Property2: 0, Property3: 0, Property4: 0, Property5: 0, Property6: 0, Property7: 30, Property8: 0, BindType: 0, FusionType: 0, FusionRate: 0, FusionNeedRate: 0, RefineryLevel: 0, ReclaimValue: 0, ReclaimType: 0, Pic: "bothat", Colors: "" },
      { TemplateID: 991002, CanRecycle: 0, CategoryID: 5, Attack: 0, Defence: 20, Agility: 10, Luck: 10, Level: 1, Quality: 1, MaxCount: 1, NeedSex: 0, NeedLevel: 1, CanStrengthen: false, CanCompose: false, CanDrop: false, CanEquip: true, CanUse: false, CanDelete: true, Property1: 0, Property2: 0, Property3: 0, Property4: 0, Property5: 0, Property6: 0, Property7: 15, Property8: 0, BindType: 0, FusionType: 0, FusionRate: 0, FusionNeedRate: 0, RefineryLevel: 0, ReclaimValue: 0, ReclaimType: 0, Pic: "bocloth", Colors: "" },
    ]);
    // 2 enabled rows: a solo human match only ever needs 1, but this keeps the provider from starving if two
    // tests happen to race (each test still gets its own level-nearest pick; `release()` frees them back anyway).
    // Level 22 (not 20): migration 0007_bots_seed.sql seeds 5 enabled bots including one at level 20
    // ("BoomMaster") — acquire(20) would tie with it (both at distance 0, `Math.random()` tie-break) and
    // make the "equipped look" assertions below flaky. 22 is still closer to every one of our tests' level-20
    // human than any seeded bot (nearest is BoomMaster at distance 2), so `acquire()` always picks ours.
    await db.db.insert(app.Bots).values([
      { nickname: "GearedBot", sex: "m", level: 22, difficulty: "easy", weaponTemplateId: 7001, equips: [991001, 991002], guild: "Testers", enabled: true },
      { nickname: "GearedBot2", sex: "m", level: 22, difficulty: "easy", weaponTemplateId: 7001, equips: [991001, 991002], guild: "Testers", enabled: true },
    ]);
    const templates = await new Templates().load(db.db, 1, "pt-BR");
    bots = await new DbBotProvider(templates).load(db.db);
    engine = new DdtFightEngine({ manualClock: true, seed: () => 42, payTakeCard: (m) => payTakeCard(m) });
    const cfg = testConfig({ GAME_PORT: "0", WS_PORT: "0", POLICY_PORT: "0", ADMIN_PORT: "0", BIND_HOST: "127.0.0.1", LOG_LEVEL: "silent", PACKET_RATE_BURST: "100000", PACKET_RATE_PER_SEC: "100000" } as never);
    server = await new GameServer(cfg, { db, rsaKey: testKey(), fight: engine, bots }).start();
    (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 0;
  });
  afterAll(async () => {
    await server?.stop();
  });

  const roomCmd = (c: FakeClient, sub: number, fill: (p: import("@ddt/protocol").PacketOut) => void = () => {}) =>
    c.out(94, (p) => {
      p.writeInt(sub);
      fill(p);
    });
  const gameCmd = (c: FakeClient, sub: number, fill: (p: import("@ddt/protocol").PacketOut) => void = () => {}) =>
    c.out(91, (p) => {
      p.writeByte(sub);
      fill(p);
    });

  async function lobby() {
    const x = await loggedIn(server, { grade: 20 });
    x.c.out(16);
    await x.c.code(94, 9);
    roomCmd(x.c, 0, (p) => {
      p.writeByte(0); p.writeByte(2); p.writeUTF("m"); p.writeUTF("");
    });
    await x.c.code(94, 0);
    return x;
  }

  /** Same shape as fight.test.ts's playToEnd: whoever gets TURN aims with the solver and fires. */
  async function playToEnd(human: { c: FakeClient; ch: { userId: number } }) {
    const { solveAim } = await import("@ddt/fight");
    for (let i = 0; i < 500 && !human.c.received.some((r) => r.code === 91 && r.sub === 103); i++) {
      engine.tick((clock += 40));
      await new Promise((r) => setTimeout(r, 2));
    }
    gameCmd(human.c, 16, (p) => p.writeInt(100));
    const seen = new Set<number>();
    for (let i = 0; i < 20000; i++) {
      clock += 200;
      engine.tick(clock);
      await new Promise((r) => setImmediate(r));
      const g = [...engine.games.values()][0];
      if (!g) break;
      const gm = g.game;
      const cur = gm.currentLiving;
      if (gm.findByUser(human.ch.userId) === cur && cur?.isAttacking && !seen.has(gm.turnIndex)) {
        const turn = human.c.received.find((r) => r.code === 91 && r.sub === 6 && r.p1 === cur.id);
        if (!turn) continue;
        seen.add(gm.turnIndex);
        const me = gm.findByUser(human.ch.userId)!;
        const foe = gm.players.find((p) => p.team !== me.team && p.isLiving)!;
        const sol = solveAim({ map: gm.map, ball: me.currentBall, from: me, target: { x: foe.x, y: foe.y - 10 }, bodies: [{ id: foe.id, x: foe.x, y: foe.y, team: foe.team, bound: foe.bound }] });
        gameCmd(human.c, 96, (p) => { p.writeBoolean(true); p.writeByte(2); });
        if (sol) gameCmd(human.c, 2, (p) => { p.writeInt(sol.muzzle.x); p.writeInt(sol.muzzle.y); p.writeInt(sol.force); p.writeInt(sol.angle); });
        else gameCmd(human.c, 12, (p) => p.writeByte(1));
      }
      if (human.c.received.some((r) => r.code === 91 && r.sub === 100)) break;
    }
    return human.c.waitFor((r) => r.code === 91 && r.sub === 100, 1000);
  }

  it("DbBotProvider.acquire() seats a bot with its admin-equipped look/stats (not the old empty/0 placeholder)", () => {
    // Exactly the call `rooms/room-mgr.ts processMatchQueue` makes on the real auto-match fallback path.
    // level 22 (not 20): matches our own seeded bots' level exactly (distance 0), strictly closer than any
    // migration-seeded bot (nearest is level 20/25, distance 2/3) — guarantees this one, not a tie-broken pick.
    const bot = bots.acquire(22)!;
    try {
      expect(bot).toBeTruthy();
      expect(["GearedBot", "GearedBot2"]).toContain(bot.info.NickName);
      expect(bot.info.ConsortiaName).toBe("Testers"); // guild name from app."Bots".guild
      expect(bot.info.Style.startsWith("991001|bothat,")).toBe(true); // hat (place 0) from app."Bots".equips
      expect(bot.info.Style).toContain("991002|bocloth"); // cloth (place 4)
      expect(bot.info.Attack).toBeGreaterThan(0);
      expect(bot.info.Defence).toBeGreaterThan(0); // hat(60) + cloth(20) template Defence, not the old hardcoded 0
      expect(bot.baseAttack).toBeGreaterThan(0);
      expect(bot.baseDefence).toBeGreaterThan(0);
    } finally {
      bots.release(bot); // don't starve the matchmaking tests below
    }
  });

  it("auto-match fallback seats that bot and it plays every turn to a winner (bug: bot never fired)", async () => {
    (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 0;
    const a = await lobby();
    const gp0 = a.player().info.GP;
    roomCmd(a.c, 7);
    const over = await playToEnd(a);
    // Both the human and the bot fired at least once (same regression guard as fight.test.ts, but through the REAL provider).
    const fires = a.c.received.filter((r) => r.code === 91 && r.sub === 2);
    expect(new Set(fires.map((f) => f.p1)).size).toBe(2);
    expect(a.player().info.GP).toBeGreaterThan(gp0);
    over.pkt.readByte();
    // Drain the 20s card window so the game actually `stop()`s and releases its bot/room (same pattern as
    // fight.test.ts) — otherwise it stays allocated forever (manualClock never advances past GAME_OVER on its
    // own) and starves the tests below of both their bot and a free room.
    for (let i = 0; i < 200 && engine.games.size; i++) engine.tick((clock += 200));
    expect(engine.games.size).toBe(0);
    a.c.close();
  }, 60000);

  it("a human fleeing mid-fight against a bot does not freeze the room (bot keeps playing, game resolves)", async () => {
    (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 0;
    const a = await lobby();
    roomCmd(a.c, 7);
    // `engine` is `manualClock: true` — nothing advances the fight on its own; pump it (like playToEnd does)
    // until GAME_LOAD (103) arrives, then report the human's own loading progress (only bot seats
    // auto-complete loading, `BotRunner.update`'s `GameState.Loading` branch — a human must send this).
    for (let i = 0; i < 500 && !a.c.received.some((r) => r.code === 91 && r.sub === 103); i++) {
      engine.tick((clock += 40));
      await new Promise((r) => setTimeout(r, 2));
    }
    gameCmd(a.c, 16, (p) => p.writeInt(100));
    for (let i = 0; i < 500 && !a.c.received.some((r) => r.code === 91 && r.sub === 6); i++) {
      engine.tick((clock += 40));
      await new Promise((r) => setTimeout(r, 2));
    }
    expect(a.c.received.some((r) => r.code === 91 && r.sub === 99)).toBe(true); // START_GAME did happen
    a.c.close(); // flee: disconnects while the game is still running
    await new Promise((r) => setTimeout(r, 50)); // let the disconnect handler run (real wall-clock event, not `engine`'s manual clock)
    for (let i = 0; i < 500 && engine.games.size; i++) engine.tick((clock += 200));
    expect(engine.games.size).toBe(0); // room was freed, not stuck forever on a dead/gone human
  }, 30000);
});
