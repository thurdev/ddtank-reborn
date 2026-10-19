/**
 * m3-ringstation (docs/plan/TASKS.md): `404 RING_STATION` get info / buy battle count or time / armory /
 * battle field / challenge -> real fight / rank swap on win. Same method as the other 6600 scene tests
 * (`consortia-battle.test.ts`): send the exact packet the AS3 client sends, run it through the real handler
 * via `FakeClient`, read the response field by field. The rank-swap/battle-log logic (`onFightOver`) is
 * exercised directly too — it's the same function the fight engine's `onPlayerGameOver` hook calls, so this
 * covers it without reconstructing the whole combat-simulation harness (`fight.test.ts`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { RoomType } from "../src/rooms/room.js";
import { onFightOver } from "../src/game/ringstation.js";
import { loadRingStationRow, loadBattleField, saveRingStationRow } from "../src/db/ringstation.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

function viewInfo(c: { out(code: number, fill?: (p: import("@ddt/protocol").PacketOut) => void): void; code(code: number, sub?: number): Promise<{ pkt: import("@ddt/protocol").GSPacket }> }) {
  c.out(404, (p) => p.writeByte(1));
  return c.code(404, 1);
}

describe("404 RING_STATION", () => {
  it("404/1 VIEWINFO: brand-new player gets rank 0 and the baseline practice bot as the only candidate", async () => {
    const a = await loggedIn(server, { grade: 20 });
    const r = await viewInfo(a.c);
    expect(r.pkt.readByte()).toBe(1); // sub-code
    expect(r.pkt.readInt()).toBe(0); // rank
    const challengeNum = r.pkt.readInt();
    expect(challengeNum).toBeGreaterThan(0); // default ChallengeNum (10)
    const buyCount = r.pkt.readInt();
    expect(buyCount).toBeGreaterThan(0); // default buyCount (10)
    const buyPrice = r.pkt.readInt();
    expect(buyPrice).toBeGreaterThan(0);
    r.pkt.readDateTime(); // challengeTime
    r.pkt.readInt(); // cdPrice
    r.pkt.readInt(); // padding int
    r.pkt.readString(); // signMsg
    r.pkt.readInt(); // awardNum
    r.pkt.readDateTime(); // awardTime
    r.pkt.readString(); // championText
    const count = r.pkt.readInt();
    expect(count).toBe(1);
    const id = r.pkt.readInt();
    expect(id).toBeLessThan(0); // the baseline bot's made-up PlayerInfo.ID
    const row = await loadRingStationRow(server.ctx.db.db, a.ch.userId);
    expect(row).not.toBeNull();
  });

  it("404/2 BUYCOUNTORTIME (buy time): charges buyPrice and clears the cooldown", async () => {
    const a = await loggedIn(server, { grade: 20, money: 50000 });
    await viewInfo(a.c);
    const before = a.player().info.Money;
    a.c.out(404, (p) => { p.writeByte(2); p.writeBoolean(true); p.writeBoolean(false); });
    const r = await a.c.code(404, 2);
    expect(r.pkt.readByte()).toBe(2); // sub-code
    expect(r.pkt.readBoolean()).toBe(true); // echoes timeFlag
    expect(r.pkt.readBoolean()).toBe(true); // charged ok
    const row = await loadRingStationRow(server.ctx.db.db, a.ch.userId);
    expect(row!.ChallengeTime.getTime()).toBeLessThan(Date.now());
    expect(a.player().info.Money).toBeLessThan(before);
  });

  it("404/2 BUYCOUNTORTIME (buy extra challenge) at the daily cap: no charge happens (exploit fix)", async () => {
    const a = await loggedIn(server, { grade: 20, money: 50000 });
    await viewInfo(a.c);
    const row = (await loadRingStationRow(server.ctx.db.db, a.ch.userId))!;
    row.buyCount = 0; // simulate already having bought the max today
    await saveRingStationRow(server.ctx.db.db, row);
    const before = a.player().info.Money;
    a.c.out(404, (p) => { p.writeByte(2); p.writeBoolean(false); p.writeBoolean(false); });
    const r = await a.c.code(404, 2);
    expect(r.pkt.readByte()).toBe(2); // sub-code
    expect(r.pkt.readBoolean()).toBe(false); // echoes timeFlag=false
    expect(r.pkt.readInt()).toBe(0); // buyCount unchanged
    expect(a.player().info.Money).toBe(before); // nothing was charged
  });

  it("404/5 CHALLENGE against the baseline bot starts a real RingStation room", async () => {
    const a = await loggedIn(server, { grade: 20 });
    await viewInfo(a.c);
    a.c.out(404, (p) => { p.writeByte(5); p.writeInt(-1); p.writeInt(0); });
    await a.c.code(94, 0); // roomCreate to the challenger
    const room = server.ctx.rooms.rooms.find((r) => r.RoomType === RoomType.RingStation && r.IsUsing);
    expect(room).toBeDefined();
    expect(room!.IsPlaying).toBe(true);
    expect(room!.PlayerCount).toBe(1); // the opponent never sits in a seat (snapshot bot, not a real player)
  });

  it("404/5 CHALLENGE twice back-to-back is refused the second time (exploit fix: no concurrent farming)", async () => {
    const a = await loggedIn(server, { grade: 20 });
    await viewInfo(a.c);
    expect(server.ctx.ringStation.hasPending(a.ch.userId)).toBe(false);
    a.c.out(404, (p) => { p.writeByte(5); p.writeInt(-1); p.writeInt(0); });
    await a.c.code(94, 0);
    expect(server.ctx.ringStation.hasPending(a.ch.userId)).toBe(true);
    const roomsBefore = server.ctx.rooms.rooms.filter((r) => r.RoomType === RoomType.RingStation && r.IsUsing).length;
    const mark = a.c.mark();
    a.c.out(404, (p) => { p.writeByte(5); p.writeInt(-1); p.writeInt(0); });
    await new Promise((r) => setTimeout(r, 50));
    const roomsAfter = server.ctx.rooms.rooms.filter((r) => r.RoomType === RoomType.RingStation && r.IsUsing).length;
    expect(roomsAfter).toBe(roomsBefore); // no second room created
    expect(a.c.received.slice(mark).some((r) => r.code === 94 && r.sub === 0)).toBe(false);
  });

  it("404/5 CHALLENGE against a defender already OnFight-locked is refused", async () => {
    const a = await loggedIn(server, { grade: 20 });
    const b = await loggedIn(server, { grade: 20 });
    await viewInfo(b.c); // creates b's row
    const bRow = (await loadRingStationRow(server.ctx.db.db, b.ch.userId))!;
    bRow.Rank = 5;
    await saveRingStationRow(server.ctx.db.db, bRow);
    await viewInfo(a.c);
    server.ctx.ringStation.lock(b.ch.userId);
    const roomsBefore = server.ctx.rooms.rooms.filter((r) => r.RoomType === RoomType.RingStation && r.IsUsing).length;
    const mark = a.c.mark();
    a.c.out(404, (p) => { p.writeByte(5); p.writeInt(b.ch.userId); p.writeInt(5); });
    await new Promise((r) => setTimeout(r, 50));
    const roomsAfter = server.ctx.rooms.rooms.filter((r) => r.RoomType === RoomType.RingStation && r.IsUsing).length;
    expect(roomsAfter).toBe(roomsBefore); // no new room created
    expect(a.c.received.slice(mark).some((r) => r.code === 94 && r.sub === 0)).toBe(false);
    server.ctx.ringStation.unlock(b.ch.userId);
  });

  it("onFightOver: a win swaps ranks with a higher-ranked defender, pays League Money, and logs both sides", async () => {
    const a = await loggedIn(server, { grade: 20 });
    const b = await loggedIn(server, { grade: 20 });
    await viewInfo(a.c);
    await viewInfo(b.c);
    const aRow = (await loadRingStationRow(server.ctx.db.db, a.ch.userId))!;
    aRow.Rank = 10;
    await saveRingStationRow(server.ctx.db.db, aRow);
    const bRow = (await loadRingStationRow(server.ctx.db.db, b.ch.userId))!;
    bRow.Rank = 3;
    await saveRingStationRow(server.ctx.db.db, bRow);
    server.ctx.ringStation.lock(b.ch.userId);

    const before = a.player().info.LeagueMoney;
    const now = new Date();
    server.ctx.ringStation.setPending(a.ch.userId, {
      dare: { userId: a.ch.userId, userName: b.ch.nick, levelBefore: 10, battleTime: now },
      success: { userId: b.ch.userId, userName: a.ch.nick, levelBefore: 3, battleTime: now },
    });
    await onFightOver(server.ctx, a.player(), true);

    expect(a.player().info.LeagueMoney).toBeGreaterThan(before);
    const aAfter = (await loadRingStationRow(server.ctx.db.db, a.ch.userId))!;
    const bAfter = (await loadRingStationRow(server.ctx.db.db, b.ch.userId))!;
    expect(aAfter.Rank).toBe(3); // took the defender's old (better) rank
    expect(bAfter.Rank).toBe(10);
    expect(aAfter.Total).toBe(1);
    expect(server.ctx.ringStation.isLocked(b.ch.userId)).toBe(false); // released

    const aLog = await loadBattleField(server.ctx.db.db, a.ch.userId, 1);
    expect(aLog[0]!.DareFlag).toBe(true);
    expect(aLog[0]!.SuccessFlag).toBe(true);
    const bLog = await loadBattleField(server.ctx.db.db, b.ch.userId, 1);
    expect(bLog[0]!.DareFlag).toBe(false);
    expect(bLog[0]!.SuccessFlag).toBe(false);
    expect(server.ctx.ringStation.hasPending(a.ch.userId)).toBe(false);
  });

  it("onFightOver: a loss does not swap ranks, still pays a (smaller) consolation League Money", async () => {
    const a = await loggedIn(server, { grade: 20 });
    await viewInfo(a.c);
    const row = (await loadRingStationRow(server.ctx.db.db, a.ch.userId))!;
    row.Rank = 7;
    await saveRingStationRow(server.ctx.db.db, row);
    const before = a.player().info.LeagueMoney;
    const now = new Date();
    server.ctx.ringStation.setPending(a.ch.userId, { dare: { userId: a.ch.userId, userName: "bot", levelBefore: 7, battleTime: now }, success: null });
    await onFightOver(server.ctx, a.player(), false);
    expect(a.player().info.LeagueMoney).toBeGreaterThan(before);
    const after = (await loadRingStationRow(server.ctx.db.db, a.ch.userId))!;
    expect(after.Rank).toBe(7);
    expect(after.Total).toBe(0);
  });
});
