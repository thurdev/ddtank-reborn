/**
 * M4 `m4-passe-classico` (docs/plan/TASKS.md): 84 ACTIVITY_PACKAGE sub-cmd 1
 * (`GrowthPackageType.GROWTHPACKAGE`, `growthpackage.swf`) — 6600 only. Real C# in `vendor/DDT-6600/Source/
 * Game.Server/Game.Server.Packets.Client/ActivityPackageHandler.cs:23-117` (dead/commented in the 4.1
 * vendor, see `handlers/eventos/ativacao-pintinho.ts` header + `handlers/eventos/passe-classico.ts` for the
 * full citation trail). Covers: admin gate default-closed, level gating, the non-P2W Gold price (default
 * 0, only the first claim pays), and the bug fix (never charge without delivering the reward).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { seedDatabase, player as P } from "@ddt/db";
import type { GSPacket } from "@ddt/protocol";
import type { GameServer } from "../src/server.js";
import { loggedIn, sharedDb, startServer, type FakeClient } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  const h = await sharedDb();
  // 58 real rows, ActivityType=20, Quality 0-8 (one per tier) — not in the shared SEED_TABLES subset.
  await seedDatabase(h, { only: ["Activity_System_Item"] });
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

/** `game."Server_Config"` is loaded once at boot (`templates.load()`); tests poke the in-memory Map
 *  directly instead of reseeding + reloading, same technique as `client-6600-m2-forja.test.ts` (strengthenExp). */
function setGrowthConfig(open: boolean, priceGold = 0): void {
  server.ctx.templates.serverConfig.set("IsPromotePackageOpen", open ? "1" : "0");
  server.ctx.templates.serverConfig.set("PromotePackagePrice", String(priceGold));
}

async function waitForCode84(c: FakeClient, from: number, count: number): Promise<GSPacket[]> {
  const deadline = Date.now() + 2000;
  for (;;) {
    const matches = c.received.filter((r) => r.code === 84);
    if (matches.length >= from + count) {
      return matches.slice(from, from + count).map((r) => { r.pkt.offset = 20; return r.pkt; });
    }
    if (Date.now() > deadline) throw new Error(`timeout waiting for ${count} code-84 packet(s), got ${matches.length}`);
    await new Promise((r) => setTimeout(r, 20));
  }
}
async function noMoreCode84(c: FakeClient, atLeastMs = 150): Promise<number> {
  await new Promise((r) => setTimeout(r, atLeastMs));
  return c.received.filter((r) => r.code === 84).length;
}

describe("84 ACTIVITY_PACKAGE sub-cmd 1 — Passe Clássico (6600 only)", () => {
  it("fechado por padrão (IsPromotePackageOpen=0, GameProperties.cs:240): login não manda nada, OPEN é no-op", async () => {
    setGrowthConfig(false);
    const { c, player: p } = await loggedIn(server, { client: "6600", grade: 10, gold: 100_000 });
    const before84 = c.received.filter((r) => r.code === 84).length;
    expect(before84).toBe(0); // nothing sent at login while closed
    const goldBefore = p().info.Gold;
    c.out(84, (pk) => { pk.writeInt(1); pk.writeInt(1); }); // GROWTHPACKAGE / OPEN
    expect(await noMoreCode84(c)).toBe(0);
    expect(p().info.Gold).toBe(goldBefore);
    c.close();
  });

  it("aberto: login manda ISOPEN=true + estado inicial (availTime=0, 9 flags 0)", async () => {
    setGrowthConfig(true, 0);
    const { c } = await loggedIn(server, { client: "6600", grade: 5 });
    const [isOpenPkt, statePkt] = await waitForCode84(c, 0, 2);
    expect(isOpenPkt!.readInt()).toBe(1); // GrowthPackageType.GROWTHPACKAGE (family selector)
    expect(isOpenPkt!.readInt()).toBe(3); // GROWTHPACKAGE_ISOPEN
    expect(isOpenPkt!.readBoolean()).toBe(true);
    expect(statePkt!.readInt()).toBe(1); // family
    expect(statePkt!.readInt()).toBe(1); // GROWTHPACKAGE_OPEN (login send)
    expect(statePkt!.readInt()).toBe(0); // availTime
    for (let i = 0; i < 9; i++) expect(statePkt!.readInt()).toBe(0);
    c.close();
  });

  it("nível insuficiente pro tier 0 (precisa Grade>=10): OPEN não cobra nem avança", async () => {
    setGrowthConfig(true, 0);
    const { c, player: p } = await loggedIn(server, { client: "6600", grade: 5, gold: 100_000 });
    await waitForCode84(c, 0, 2); // login burst (isOpen + state)
    const goldBefore = p().info.Gold;
    c.out(84, (pk) => { pk.writeInt(1); pk.writeInt(1); }); // OPEN
    const [updatePkt] = await waitForCode84(c, 2, 1);
    updatePkt!.readInt(); updatePkt!.readInt();
    expect(updatePkt!.readInt()).toBe(0); // availTime unchanged
    expect(p().info.Gold).toBe(goldBefore); // never charged for a level it can't claim
    c.close();
  });

  it("preço default 0: 1º claim (OPEN) grátis, sobe avail. pra 1, manda recompensa por correio", async () => {
    setGrowthConfig(true, 0);
    const { c, player: p, ch } = await loggedIn(server, { client: "6600", grade: 10, gold: 100_000 });
    await waitForCode84(c, 0, 2);
    const goldBefore = p().info.Gold;
    const mailBefore = (await server.ctx.db.db.select().from(P.User_Messages).where(eq(P.User_Messages.ReceiverID, ch.userId))).length;
    c.out(84, (pk) => { pk.writeInt(1); pk.writeInt(1); }); // OPEN
    const [updatePkt] = await waitForCode84(c, 2, 1);
    updatePkt!.readInt(); updatePkt!.readInt();
    expect(updatePkt!.readInt()).toBe(1); // availTime advanced
    expect(updatePkt!.readInt()).toBe(1); // tier 0 flag now complete
    expect(p().info.Gold).toBe(goldBefore); // price 0 -> never charged
    const mailAfter = (await server.ctx.db.db.select().from(P.User_Messages).where(eq(P.User_Messages.ReceiverID, ch.userId))).length;
    expect(mailAfter).toBeGreaterThan(mailBefore); // real Activity_System_Item reward was mailed
    c.close();
  });

  it("preço configurado (Gold): sem saldo não cobra nem avança (bug do original corrigido)", async () => {
    setGrowthConfig(true, 500);
    const { c, player: p } = await loggedIn(server, { client: "6600", grade: 10, gold: 100 });
    await waitForCode84(c, 0, 2);
    c.out(84, (pk) => { pk.writeInt(1); pk.writeInt(1); }); // OPEN
    const [updatePkt] = await waitForCode84(c, 2, 1);
    updatePkt!.readInt(); updatePkt!.readInt();
    expect(updatePkt!.readInt()).toBe(0); // availTime unchanged
    expect(p().info.Gold).toBe(100); // never debited — original would have charged even on failure here
    c.close();
  });

  it("preço configurado (Gold): com saldo, cobra só no 1º claim; claims seguintes (UPDATEDATA) são de graça", async () => {
    setGrowthConfig(true, 500);
    const { c, player: p } = await loggedIn(server, { client: "6600", grade: 20, gold: 10_000 });
    await waitForCode84(c, 0, 2);
    const goldBefore = p().info.Gold;
    c.out(84, (pk) => { pk.writeInt(1); pk.writeInt(1); }); // OPEN (tier 0, pays)
    const [u1] = await waitForCode84(c, 2, 1);
    u1!.readInt(); u1!.readInt();
    expect(u1!.readInt()).toBe(1); // tier 0 claimed
    expect(p().info.Gold).toBe(goldBefore - 500);
    const goldAfterFirst = p().info.Gold;

    await new Promise((r) => setTimeout(r, 550)); // clear the 500ms LastOpenGrowthPackage throttle (ActivityPackageHandler.cs:30)
    c.out(84, (pk) => { pk.writeInt(1); pk.writeInt(2); pk.writeInt(0); }); // UPDATEDATA (tier 1, free — client's $index is ignored server-side)
    const [u2] = await waitForCode84(c, 3, 1);
    u2!.readInt(); u2!.readInt();
    expect(u2!.readInt()).toBe(2); // tier 1 claimed too
    expect(p().info.Gold).toBe(goldAfterFirst); // 2nd claim never charged, only the 1st does
    c.close();
  });
});
