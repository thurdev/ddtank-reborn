import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { Bogu, littleGameMgr } from "../src/handlers/minigame-termas/index.js";
import { loggedIn, startServer } from "./helpers.js";

describe("little game (166 LITTLEGAME_COMMAND — Đại chiến Hút Gà)", () => {
  let server: GameServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.stop();
  });

  it("blocks players under level 20", async () => {
    const low = await loggedIn(server, { grade: 10 });
    low.c.out(166, (o) => o.writeByte(2));
    const msg = await low.c.code(3);
    expect(msg.pkt.readInt()).toBe(0);
    expect(msg.pkt.readString()).toContain("nível 20");
    const m = littleGameMgr(server.ctx);
    expect(m.inGame(low.player())).toBe(false);
  });

  it("enter, load-complete snapshot, move, click/catch, score, leave", async () => {
    const a = await loggedIn(server, { grade: 25 });
    const b = await loggedIn(server, { grade: 25 });
    const m = littleGameMgr(server.ctx);

    // enter: byte 2 — the reply mirrors LittleGamePacketsOut.SendEnterWorld exactly
    a.c.out(166, (o) => o.writeByte(2));
    const enter = await a.c.code(166, 2);
    expect(enter.pkt.readByte()).toBe(2);
    expect(enter.pkt.readInt()).toBe(1);
    expect(enter.pkt.readInt()).toBe(1);
    expect(enter.pkt.readString()).toBe("bogu1,bogu2,bogu3,bogu4,bogu5,bogu6,bogu7,bogu8");
    expect(enter.pkt.readString()).toBe("2001");
    expect(m.inGame(a.player())).toBe(true);

    // load-complete: byte 3 — full snapshot dump (a itself + every auto-spawned bogu)
    a.c.out(166, (o) => o.writeByte(3));
    const snap = await a.c.code(166, 3);
    snap.pkt.readByte();
    const count = snap.pkt.readInt();
    expect(count).toBeGreaterThan(1); // o próprio "a" + os bichinhos sorteados na abertura

    // b enters: a sees the ADD_SPRITE broadcast (byte 16)
    const fromA = a.c.mark();
    b.c.out(166, (o) => o.writeByte(2));
    await b.c.code(166, 2);
    const added = await a.c.waitFor((r) => r.code === 166 && r.sub === 16, 4000, fromA);
    added.pkt.readByte();
    expect(added.pkt.readInt()).toBe(b.ch.userId);

    // move: server only keeps the (dx,dy) target, broadcasts to everyone except the sender
    const fromB = b.c.mark();
    a.c.out(166, (o) => { o.writeByte(32); o.writeInt(100); o.writeInt(200); o.writeInt(333); o.writeInt(444); o.writeInt(0); });
    const moved = await b.c.waitFor((r) => r.code === 166 && r.sub === 32, 4000, fromB);
    moved.pkt.readByte();
    expect(moved.pkt.readInt()).toBe(a.ch.userId);
    expect(moved.pkt.readInt()).toBe(333);
    expect(moved.pkt.readInt()).toBe(444);
    expect(a.c.received.slice(fromA).some((r) => r.code === 166 && r.sub === 32)).toBe(false);
    expect([m.st(a.player()).x, m.st(a.player()).y]).toEqual([333, 444]);

    // pick a small/medium bogu (maxCatchers 1) for a deterministic single-catcher capture
    const bogu = [...m.scenario.values()].find((v): v is Bogu => v instanceof Bogu && v.maxCatchers === 1);
    expect(bogu).toBeTruthy();
    const boguId = bogu!.id;

    // click: a catches it alone — gets the "normalbogu" HUD payload (byte 64), bogu+player broadcast "livingInhale" (byte 96)
    const fromA2 = a.c.mark();
    a.c.out(166, (o) => { o.writeByte(65); o.writeInt(boguId); o.writeInt(bogu!.x); o.writeInt(bogu!.y); o.writeInt(bogu!.x - 5); o.writeInt(bogu!.y); });
    const hud = await a.c.code(166, 64);
    hud.pkt.readByte();
    expect(hud.pkt.readString()).toBe("normalbogu");
    expect(hud.pkt.readInt()).toBe(1);
    expect(hud.pkt.readInt()).toBe(a.ch.userId);
    expect(hud.pkt.readInt()).toBe(boguId);
    const hp = hud.pkt.readInt();
    const score = hud.pkt.readInt();
    hud.pkt.readInt(); // score/hp por clique
    hud.pkt.readInt(); // "10"
    expect(hud.pkt.readInt()).toBe(1); // 1 capturador
    expect(hud.pkt.readInt()).toBe(a.ch.userId);
    expect(bogu!.caught).toBe(true);
    expect(bogu!.catchers).toContain(a.player());
    await a.c.waitFor((r) => r.code === 166 && r.sub === 96, 4000, fromA2); // bichinho ou jogador inalando

    // report score: removes the bogu from the world (its only catcher let go), credits Score
    const score0 = a.player().info.Score;
    const fromB2 = b.c.mark();
    a.c.out(166, (o) => { o.writeByte(64); o.writeInt(score); o.writeInt(boguId); });
    const removed = await b.c.waitFor((r) => r.code === 166 && r.sub === 17, 4000, fromB2);
    removed.pkt.readByte();
    expect(removed.pkt.readInt()).toBe(boguId);
    expect(a.player().info.Score).toBe(score0 + score);
    expect(m.scenario.has(boguId)).toBe(false);
    void hp;

    // leave: b sees the REMOVE_SPRITE broadcast (byte 17) for a
    const fromB3 = b.c.mark();
    a.c.out(166, (o) => o.writeByte(4));
    const left = await b.c.waitFor((r) => r.code === 166 && r.sub === 17, 4000, fromB3);
    left.pkt.readByte();
    expect(left.pkt.readInt()).toBe(a.ch.userId);
    expect(m.inGame(a.player())).toBe(false);
  });

  it("cancel-click releases the bogu without scoring", async () => {
    const a = await loggedIn(server, { grade: 25 });
    const m = littleGameMgr(server.ctx);
    a.c.out(166, (o) => o.writeByte(2));
    await a.c.code(166, 2);

    const bogu = [...m.scenario.values()].find((v): v is Bogu => v instanceof Bogu);
    expect(bogu).toBeTruthy();
    a.c.out(166, (o) => { o.writeByte(65); o.writeInt(bogu!.id); o.writeInt(bogu!.x); o.writeInt(bogu!.y); o.writeInt(bogu!.x - 5); o.writeInt(bogu!.y); });
    await a.c.code(166, 64);
    expect(bogu!.catchers.length).toBeGreaterThan(0);

    const fromCancel = a.c.mark();
    a.c.out(166, (o) => { o.writeByte(66); o.writeInt(bogu!.id); });
    await a.c.waitFor((r) => r.code === 166 && r.sub === 96, 4000, fromCancel);
    expect(bogu!.catchers).not.toContain(a.player());
    expect(m.st(a.player()).bogu).toBeNull();
  });
});
