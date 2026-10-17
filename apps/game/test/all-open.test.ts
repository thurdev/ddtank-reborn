/**
 * ALL_OPEN (QA dev switch, cfg.ALL_OPEN) — "o dono quer tudo ativo pra poder ir testando".
 * Covers the two concrete asks: every hall activity icon goes out on login regardless of the scheduler
 * window (session/login.ts sendActivityIcons), and a low-level player can enter a high-level Dungeon room
 * (rooms/room-mgr.ts enterRoom, RoomMgrOptions.allOpen). Also a light check that EventsRuntime.reload()
 * force-opens world boss/league once (handlers/eventos/agendador.ts) — see docs/features/eventos.md,
 * docs/features/pve-masmorras.md.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { game } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import type { ServerContext } from "../src/session/context.js";
import { eventsRuntime } from "../src/handlers/eventos/agendador.js";
import { RoomType } from "../src/rooms/room.js";
import { FakeClient, loggedIn, startServer } from "./helpers.js";

const roomCmd = (c: FakeClient, sub: number, fill: (p: import("@ddt/protocol").PacketOut) => void = () => {}) =>
  c.out(94, (p) => {
    p.writeInt(sub);
    fill(p);
  });

let stock: GameServer; // default config: ALL_OPEN off (stock behavior must be unchanged)
let open: GameServer; // ALL_OPEN=true
beforeAll(async () => {
  stock = await startServer();
  open = await startServer({ ALL_OPEN: "true" });
});
afterAll(async () => {
  await stock?.stop();
  await open?.stop();
});

describe("ALL_OPEN activity icons (session/login.ts sendActivityIcons)", () => {
  it("stock login: left-gun roulette (137) and lightroad/guildweek open (145 sub 64/7) are NOT sent without admin config", async () => {
    const { c } = await loggedIn(stock);
    expect(c.received.some((r) => r.code === 137)).toBe(false);
    // 145 sub 0 (guildMemberWeek "closed" notice, Out.guildMemberWeek) is always sent at login -- only the
    // sub 64 (lightRoadOpen) / sub 7 (guildMemberWeekOpen) icons are gated.
    const sub145 = c.received.filter((r) => r.code === 145).map((r) => { r.pkt.offset = 20; return r.pkt.readByte(); });
    expect(sub145).not.toContain(64);
    expect(sub145).not.toContain(7);
    c.close();
  });

  it("ALL_OPEN=true login: every one of those icons is sent, unconditionally", async () => {
    const { c } = await loggedIn(open);
    const roulette = c.received.find((r) => r.code === 137);
    expect(roulette).toBeTruthy();
    roulette!.pkt.offset = 20;
    roulette!.pkt.readInt(); // type
    roulette!.pkt.readInt(); // sub
    expect(roulette!.pkt.readBoolean()).toBe(true); // open
    const sub64 = c.received.filter((r) => r.code === 145).map((r) => { r.pkt.offset = 20; return r.pkt.readByte(); });
    expect(sub64).toContain(64); // lightroad
    expect(sub64).toContain(7); // guildmemberweek
    c.close();
  });
});

describe("ALL_OPEN extra hall icons (littlegame note 80, novato tabs 258/0 -- research/qa/hall-icons.md)", () => {
  it("stock login: littlegame badge (80) NOT sent (no hour-based schedule yet, QA-only); novato tabs (258/0) ARE sent -- default-open like chickenbox/luckystar", async () => {
    const { c } = await loggedIn(stock);
    expect(c.received.some((r) => r.code === 80)).toBe(false);
    const novato = c.received.filter((r) => r.code === 258);
    expect(novato.length).toBe(10);
    novato[0]!.pkt.offset = 20;
    expect(novato[0]!.pkt.readInt()).toBe(0); // NOVICEACTIVITY_MESSAGE case 0
    c.close();
  });

  it("ALL_OPEN=true login: littlegame badge (80) sent true; novato tabs (258/0) still 10", async () => {
    const { c } = await loggedIn(open);
    const lg = c.received.find((r) => r.code === 80);
    expect(lg).toBeTruthy();
    lg!.pkt.offset = 20;
    expect(lg!.pkt.readBoolean()).toBe(true);
    expect(c.received.filter((r) => r.code === 258).length).toBe(10);
    c.close();
  });
});

describe("ALL_OPEN dungeon level gate (rooms/room-mgr.ts enterRoom)", () => {
  it("stock: a level-5 player is refused entry into a level-25-created Dungeon room", async () => {
    const host = await loggedIn(stock, { grade: 25 });
    roomCmd(host.c, 0, (p) => { p.writeByte(RoomType.Dungeon); p.writeByte(2); p.writeUTF("dungeon"); p.writeUTF(""); });
    const created = await host.c.code(94, 0);
    created.pkt.offset = 20; created.pkt.readByte();
    const roomId = created.pkt.readInt();

    const guest = await loggedIn(stock, { grade: 5 });
    roomCmd(guest.c, 1, (p) => { p.writeBoolean(false); p.writeInt(2); p.writeInt(-1); p.writeInt(roomId); p.writeUTF(""); });
    const res = await guest.c.code(94, 1);
    res.pkt.offset = 20; res.pkt.readByte();
    expect(res.pkt.readBoolean()).toBe(false);
    host.c.close(); guest.c.close();
  });

  it("ALL_OPEN=true: the same level-5 player CAN enter the level-25 Dungeon room", async () => {
    const host = await loggedIn(open, { grade: 25 });
    roomCmd(host.c, 0, (p) => { p.writeByte(RoomType.Dungeon); p.writeByte(2); p.writeUTF("dungeon"); p.writeUTF(""); });
    const created = await host.c.code(94, 0);
    created.pkt.offset = 20; created.pkt.readByte();
    const roomId = created.pkt.readInt();

    const guest = await loggedIn(open, { grade: 5 });
    roomCmd(guest.c, 1, (p) => { p.writeBoolean(false); p.writeInt(2); p.writeInt(-1); p.writeInt(roomId); p.writeUTF(""); });
    const res = await guest.c.code(94, 1);
    res.pkt.offset = 20; res.pkt.readByte();
    expect(res.pkt.readBoolean()).toBe(true);
    host.c.close(); guest.c.close();
  });
});

describe("ALL_OPEN totem level gate (handlers/progressao/totem.ts totemOpenOne)", () => {
  it("stock: a level-5 player is refused (OpenOneTotemHandler.Msg1), totemId stays 0", async () => {
    const { c, player: p } = await loggedIn(stock, { grade: 5 });
    const m = c.mark();
    c.out(136);
    const msg = await c.code(3, undefined, m); // 3 SYS_MESSAGE (Out.message) -- OpenOneTotemHandler.Msg1
    msg.pkt.offset = 20;
    expect(msg.pkt.readInt()).toBe(0); // sendMessage(0, ...) type
    expect(p().info.totemId).toBe(0);
    c.close();
  });

  it("ALL_OPEN=true: the same level-5 player CAN open their first totem", async () => {
    await open.ctx.db.db.insert(game.Totem_Info).values({ ID: 10001, AddAttack: 1, ConsumeExp: 0, ConsumeHonor: 0 })
      .onConflictDoUpdate({ target: game.Totem_Info.ID, set: { AddAttack: 1, ConsumeExp: 0, ConsumeHonor: 0 } });
    await open.ctx.templates.loadProgression(open.ctx.db.db);
    const { c, player: p } = await loggedIn(open, { grade: 5 });
    const m = c.mark();
    c.out(136);
    await c.code(136, undefined, m);
    expect(p().info.totemId).toBe(10001);
    c.close();
  });
});

describe("ALL_OPEN world boss / league (handlers/eventos/agendador.ts EventsRuntime.reload)", () => {
  it("forces a world-boss window and league open with no app.ScheduledEvents row configured", async () => {
    const ctx = (open as unknown as { ctx: ServerContext }).ctx;
    const rt = eventsRuntime(ctx);
    expect(rt.boss.window).toBeTruthy();
    expect(rt.leagueOpen).toBe(true);
    // admin "Eventos" calendar reads scheduler.status().open -- same source, so it shows them active too
    expect((rt.status() as { worldBoss: unknown }).worldBoss).toBeTruthy();
  });
});
