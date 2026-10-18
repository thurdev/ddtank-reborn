/**
 * m3-consortia-battle (docs/plan/TASKS.md): `153 CONSORTIA_BATTLE` entrar/elenco/andar/desafiar/confirmar.
 * Mesmo método dos outros testes de cena 6600 (`client-6600-hall.test.ts`): monta o pacote exato que o AS3
 * manda, roda pelo handler de verdade via `FakeClient`, lê a resposta campo a campo.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GSPacket, PacketOut } from "@ddt/protocol";
import type { GameServer } from "../src/server.js";
import { RoomType } from "../src/rooms/room.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

function expectFullyConsumed(p: GSPacket): void {
  expect(p.offset).toBe(p.length);
}

/** 94 GAME_ROOM sub 18 SINGLE_ROOM_BEGIN num=4 (sendSingleRoomBegin(4), ConsortiaBattleEntryBtn.as:113). */
function enterConsortiaBattle(c: { out(code: number, fill?: (p: PacketOut) => void): void }): void {
  c.out(94, (p) => {
    p.writeInt(18);
    p.writeInt(4);
  });
}

/** Lê o corpo de 153/3 ADD_PLAYER / 153/21 CONFIRM_ENTER na ordem exata (packets/out.ts writeConsBatPlayerRow). */
function readRoster(p: GSPacket) {
  expect(p.readByte()).toBe(3);
  const count = p.readInt();
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      id: p.readInt(), tombstoneEndTime: p.readDateTime(), status: p.readByte(), posX: p.readInt(), posY: p.readInt(),
      sex: p.readBoolean(), consortiaId: p.readInt(), consortiaName: p.readString(),
      winningStreak: p.readInt(), failBuffCount: p.readInt(),
      pad: p.readInt(), petsId: p.readInt(), sex2: p.readBoolean(), style: p.readString(), colors: p.readString(),
    });
  }
  return rows;
}

describe("153 CONSORTIA_BATTLE", () => {
  it("94/18/4 entry jumps straight to the arena (153/2 ENTER_SELF_INFO isJump=true)", async () => {
    const a = await loggedIn(server, { grade: 20 });
    enterConsortiaBattle(a.c);
    const r = await a.c.code(153, 2);
    expect(r.pkt.readByte()).toBe(2);
    expect(r.pkt.readBoolean()).toBe(true); // isJump
    r.pkt.readDateTime(); // tombstoneEndTime
    r.pkt.readInt(); r.pkt.readInt(); // posX=631 posY=959
    expect(r.pkt.readInt()).toBe(Math.max(1, a.player().info.hp)); // curHp
    expect(r.pkt.readInt()).toBe(0); // victoryCount
    expect(r.pkt.readInt()).toBe(0); // winningStreak
    expect(r.pkt.readInt()).toBe(0); // score
    r.pkt.readBoolean(); r.pkt.readBoolean(); // isDoubleScoreUsed / isPowerFullUsed
    expectFullyConsumed(r.pkt);
  });

  it("153/3 ADD_PLAYER roster lists every registered player, full field count", async () => {
    const a = await loggedIn(server, { grade: 20 });
    const b = await loggedIn(server, { grade: 20 });
    enterConsortiaBattle(a.c);
    await a.c.code(153, 2);
    enterConsortiaBattle(b.c);
    await b.c.code(153, 2);
    a.c.out(153, (p) => p.writeByte(3));
    const r = await a.c.code(153, 3);
    const rows = readRoster(r.pkt);
    expectFullyConsumed(r.pkt);
    const ids = rows.map((x) => x.id);
    expect(ids).toContain(a.ch.userId);
    expect(ids).toContain(b.ch.userId);
    const self = rows.find((x) => x.id === a.ch.userId)!;
    expect(self.status).toBe(1); // ConsBatStatus.Free
    expect(self.posX).toBe(631);
    expect(self.posY).toBe(959);
  });

  it("153/4 PLAYER_MOVE broadcasts to everyone registered, including the sender", async () => {
    const a = await loggedIn(server, { grade: 20 });
    const b = await loggedIn(server, { grade: 20 });
    enterConsortiaBattle(a.c);
    await a.c.code(153, 2);
    enterConsortiaBattle(b.c);
    await b.c.code(153, 2);
    const markA = a.c.mark();
    const markB = b.c.mark();
    a.c.out(153, (p) => {
      p.writeByte(4);
      p.writeInt(100);
      p.writeInt(200);
      p.writeUTF("100,200");
    });
    const ra = await a.c.code(153, 4, markA);
    const rb = await b.c.code(153, 4, markB);
    for (const r of [ra, rb]) {
      expect(r.pkt.readByte()).toBe(4);
      expect(r.pkt.readInt()).toBe(a.ch.userId);
      expect(r.pkt.readInt()).toBe(100);
      expect(r.pkt.readInt()).toBe(200);
      expect(r.pkt.readString()).toBe("100,200");
      expectFullyConsumed(r.pkt);
    }
  });

  it("153/5 DELETE_PLAYER removes the player and is echoed to them + the rest of the scene", async () => {
    const a = await loggedIn(server, { grade: 20 });
    const b = await loggedIn(server, { grade: 20 });
    enterConsortiaBattle(a.c);
    await a.c.code(153, 2);
    enterConsortiaBattle(b.c);
    await b.c.code(153, 2);
    const markB = b.c.mark();
    a.c.out(153, (p) => p.writeByte(5));
    const ra = await a.c.code(153, 5);
    expect(ra.pkt.readByte()).toBe(5);
    expect(ra.pkt.readInt()).toBe(a.ch.userId);
    const rb = await b.c.code(153, 5, markB);
    expect(rb.pkt.readByte()).toBe(5);
    expect(rb.pkt.readInt()).toBe(a.ch.userId);
    // roster now only has b
    b.c.out(153, (p) => p.writeByte(3));
    const r = await b.c.code(153, 3, markB + 1);
    const rows = readRoster(r.pkt);
    const ids = rows.map((x) => x.id);
    expect(ids).toContain(b.ch.userId);
    expect(ids).not.toContain(a.ch.userId);
  });

  it("153/21 CONFIRM_ENTER replies with the same roster shape as 153/3", async () => {
    const a = await loggedIn(server, { grade: 20 });
    enterConsortiaBattle(a.c);
    await a.c.code(153, 2);
    a.c.out(153, (p) => p.writeByte(21));
    const r = await a.c.code(153, 3);
    const rows = readRoster(r.pkt);
    expectFullyConsumed(r.pkt);
    expect(rows.map((x) => x.id)).toContain(a.ch.userId);
  });

  it("153/6 CHALLENGE between two free players starts a real PvP room (no client-reported result)", async () => {
    const a = await loggedIn(server, { grade: 20 });
    const b = await loggedIn(server, { grade: 20 });
    enterConsortiaBattle(a.c);
    await a.c.code(153, 2);
    enterConsortiaBattle(b.c);
    await b.c.code(153, 2);
    const markA = a.c.mark();
    const markB = b.c.mark();
    a.c.out(153, (p) => {
      p.writeByte(6);
      p.writeInt(b.ch.userId);
    });
    // both sides get their status flipped to "fighting" (153/7 PLAYER_STATUS) and a real room is created
    const statusA = await a.c.code(153, 7, markA);
    expect(statusA.pkt.readByte()).toBe(7);
    expect(statusA.pkt.readInt()).toBe(a.ch.userId);
    statusA.pkt.readDateTime();
    expect(statusA.pkt.readByte()).toBe(2); // ConsBatStatus.Fighting
    await b.c.code(153, 7, markB);
    await a.c.code(94, 0); // roomCreate to the challenger
    await b.c.code(94, 1); // roomLoginResult(true) to the target
    const room = server.ctx.rooms.rooms.find((r) => r.RoomType === RoomType.ConsortiaBattle && r.IsUsing);
    expect(room).toBeDefined();
    expect(room!.PlayerCount).toBe(2);
    expect(room!.IsPlaying).toBe(true);
  });

  it("153/6 CHALLENGE against someone already fighting is refused (no stuck 'fighting' state for the valid side)", async () => {
    const a = await loggedIn(server, { grade: 20 });
    const b = await loggedIn(server, { grade: 20 });
    const c = await loggedIn(server, { grade: 20 });
    for (const x of [a, b, c]) {
      enterConsortiaBattle(x.c);
      await x.c.code(153, 2);
    }
    a.c.out(153, (p) => { p.writeByte(6); p.writeInt(b.ch.userId); });
    await a.c.code(153, 7);
    // c challenges b while b is already fighting a: must be refused, c must stay "free".
    const markC = c.c.mark();
    c.c.out(153, (p) => { p.writeByte(6); p.writeInt(b.ch.userId); });
    await new Promise((r) => setTimeout(r, 100));
    expect(c.c.received.slice(markC).some((r) => r.code === 153 && r.sub === 7)).toBe(false);
  });
});
