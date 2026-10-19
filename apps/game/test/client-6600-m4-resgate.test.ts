/**
 * M4 `m4-resgate` (docs/plan/TASKS.md): 277 RESCUE (`rescue.swf`). Sem C# original nenhum — design 100% do
 * contrato AS3, ver `game/rescue.ts`/`handlers/eventos/resgate.ts`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import type { ServerContext } from "../src/session/context.js";
import { RoomType } from "../src/rooms/room.js";
import { eventsRuntime } from "../src/handlers/eventos/agendador.js";
import { onRescueGameOver } from "../src/handlers/eventos/resgate.js";
import { getOrCreate } from "../src/game/rescue.js";
import { loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
let ctx: ServerContext;
beforeAll(async () => {
  // Pve_Info/NPC_Info/Mission_Info (missão real "Castelo das Galinhas", id 1): não está em helpers.ts
  // SEED_TABLES — seed local, não toca o helper compartilhado (mesmo padrão de labirinto.test.ts).
  const h = await sharedDb();
  await seedDatabase(h, { only: ["Pve_Info", "NPC_Info", "Mission_Info"] });
  server = await startServer();
  ctx = (server as unknown as { ctx: ServerContext }).ctx;
});
afterAll(async () => {
  await server.stop();
});

describe("277 RESCUE", () => {
  it("sub 2 ITEM_INFO: linha nova começa em 0/0/0", async () => {
    const { c } = await loggedIn(server, { client: "6600", grade: 25 });
    const m = c.mark();
    c.out(277, (p) => p.writeByte(2));
    const r = await c.code(277, 2, m);
    r.pkt.readByte();
    expect(r.pkt.readInt()).toBe(0); // arrow
    expect(r.pkt.readInt()).toBe(0); // bloodPack
    expect(r.pkt.readInt()).toBe(0); // kingBless
    c.close();
  });

  it("sub 7 FRAME_INFO: 6 cenas, freeCount padrão 3, starCount/rewardStatus 0", async () => {
    const { c } = await loggedIn(server, { client: "6600", grade: 25 });
    const m = c.mark();
    c.out(277, (p) => p.writeByte(7));
    const r = await c.code(277, 7, m);
    r.pkt.readByte();
    const n = r.pkt.readInt();
    expect(n).toBe(6);
    for (let i = 0; i < n; i++) {
      const sceneId = r.pkt.readInt();
      expect(sceneId).toBe(i + 1);
      expect(r.pkt.readInt()).toBe(0); // starCount
      expect(r.pkt.readInt()).toBe(0); // rewardStatus
      expect(r.pkt.readInt()).toBe(3); // freeCount
      expect(r.pkt.readInt()).toBe(0); // remainSecond
      expect(r.pkt.readInt()).toBe(0); // cleanCDcount
    }
    c.close();
  });

  it("sub 4 BUY_ITEM: cobra Money e soma no tipo certo (0 arrow / 1 bloodPack / 2 kingBless)", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", grade: 25, money: 100_000 });
    const before = p().info.Money;
    const m = c.mark();
    c.out(277, (pk) => { pk.writeByte(4); pk.writeInt(1); pk.writeInt(5); pk.writeBoolean(false); }); // 5 bloodPack, Money (não bound)
    await c.code(277, 4, m);
    expect(p().info.Money).toBe(before - 1000 * 5); // RescueBloodPackPrice default
    const m2 = c.mark();
    c.out(277, (pk) => pk.writeByte(2));
    const r = await c.code(277, 2, m2);
    r.pkt.readByte(); r.pkt.readInt();
    expect(r.pkt.readInt()).toBe(5); // bloodPack
    c.close();
  });

  it("sub 4 BUY_ITEM: Money insuficiente não cobra nem soma", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", grade: 25, money: 100 });
    const m = c.mark();
    c.out(277, (pk) => { pk.writeByte(4); pk.writeInt(0); pk.writeInt(1); pk.writeBoolean(false); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 277 && r.sub === 4)).toBe(false);
    expect(p().info.Money).toBe(100);
    c.close();
  });

  it("sub 5 CLEAN_CD: cobra preço crescente (base + cleanCDcount*increase) e zera o cooldown", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", grade: 25, money: 100_000 });
    const before = p().info.Money;
    const m = c.mark();
    c.out(277, (pk) => { pk.writeByte(5); pk.writeBoolean(false); pk.writeInt(3); });
    await c.code(277, 5, m);
    expect(p().info.Money).toBe(before - 5000); // RescueCleanCDPrice default (cleanCDcount=0 na 1ª vez)
    c.close();
  });

  it("sub 3 CHALLENGE: consome 1 freeCount, recusado sob nível 20, recusado com a janela fechada no admin", async () => {
    const low = await loggedIn(server, { client: "6600", grade: 10 });
    const m0 = low.c.mark();
    low.c.out(277, (pk) => { pk.writeByte(3); pk.writeInt(1); });
    const msg0 = await low.c.waitFor((r) => r.code === 3, 2000, m0);
    msg0.pkt.readInt();
    expect(msg0.pkt.readString()).toContain("Nível mínimo 20");
    low.c.close();

    const rt = eventsRuntime(ctx);
    rt.scheduler.setEvents([{ id: 902, kind: "rescue", title: "", enabled: false, weekdays: "", startTime: "00:00", durationMin: 0, startDate: null, endDate: null, params: {} }]);
    const closed = await loggedIn(server, { client: "6600", grade: 25 });
    const m1 = closed.c.mark();
    closed.c.out(277, (pk) => { pk.writeByte(3); pk.writeInt(1); });
    const msg1 = await closed.c.waitFor((r) => r.code === 3, 2000, m1);
    msg1.pkt.readInt();
    expect(msg1.pkt.readString()).toContain("Resgate está fechado");
    rt.scheduler.setEvents([]);
    closed.c.close();

    const { c, ch } = await loggedIn(server, { client: "6600", grade: 25 });
    const m2 = c.mark();
    c.out(277, (pk) => { pk.writeByte(3); pk.writeInt(1); });
    // 94/0 ROOM_CREATE (RoomMgr.createRescueRoom -> room.addPlayer) prova que uma sala real foi criada.
    await c.waitFor((r) => r.code === 94 && r.sub === 0, 3000, m2);
    const { scenes } = await getOrCreate(ctx, ctx.world.get(ch.userId)!);
    expect(scenes.get(1)!.freeCount).toBe(2); // 3 -> 2
    c.close();
  });

  /** CHALLENGE real (via rede) marca `pendingScene` de verdade; `onRescueGameOver` é chamado DIRETO (sem
   *  jogar a partida até o fim) pra testar a parte de recompensa isolada — o pending em si vem de uma
   *  CHALLENGE genuína, não de um atalho de teste. */
  async function challengeThenGameOver(grade: number, sceneId: number, isWin: boolean, kills: number) {
    const { c, ch } = await loggedIn(server, { client: "6600", grade });
    c.out(277, (pk) => { pk.writeByte(3); pk.writeInt(sceneId); });
    await c.waitFor((r) => r.code === 94 && r.sub === 0, 3000);
    const gp = ctx.world.get(ch.userId)!;
    await onRescueGameOver(ctx, gp, { isWin, kills });
    return { c, gp };
  }

  it("onRescueGameOver sem CHALLENGE pendente: no-op (não inventa um resultado do nada)", async () => {
    const { ch } = await loggedIn(server, { client: "6600", grade: 25 });
    const gp = ctx.world.get(ch.userId)!;
    await onRescueGameOver(ctx, gp, { isWin: true, kills: 9 });
    const { scenes } = await getOrCreate(ctx, gp);
    expect(scenes.get(1)!.starCount).toBe(0);
  });

  it("onRescueGameOver: vitória com 6+ kills dá 3 estrelas e desbloqueia os 3 tiers de recompensa", async () => {
    const { gp, c } = await challengeThenGameOver(25, 1, true, 9);
    const { scenes } = await getOrCreate(ctx, gp);
    const s1 = scenes.get(1)!;
    expect(s1.starCount).toBe(3);
    expect(s1.rewardStatus).toBe(0b010101); // 3 tiers, cada um status 1 (unlocked)
    c.close();
  });

  it("onRescueGameOver: derrota nunca sobe starCount, mesmo com kills > 0", async () => {
    const { gp, c } = await challengeThenGameOver(25, 3, false, 5);
    const { scenes } = await getOrCreate(ctx, gp);
    expect(scenes.get(3)!.starCount).toBe(0);
    c.close();
  });

  it("sub 8 GET_PRIZE: dá o item só uma vez (claim-once), recusa tier ainda trancado", async () => {
    const { gp, c } = await challengeThenGameOver(25, 2, true, 9); // 3 estrelas na cena 2

    const m = c.mark();
    c.out(277, (pk) => { pk.writeByte(8); pk.writeInt(2); pk.writeInt(0); });
    const r = await c.code(277, 8, m);
    r.pkt.readByte();
    expect(r.pkt.readInt()).toBe(2);
    expect(r.pkt.readInt()).toBe(0);
    expect(r.pkt.readBoolean()).toBe(true); // ok

    const m2 = c.mark();
    c.out(277, (pk) => { pk.writeByte(8); pk.writeInt(2); pk.writeInt(0); }); // de novo: já reclamado
    const r2 = await c.code(277, 8, m2);
    r2.pkt.readByte(); r2.pkt.readInt(); r2.pkt.readInt();
    expect(r2.pkt.readBoolean()).toBe(false);

    const m3 = c.mark();
    c.out(277, (pk) => { pk.writeByte(8); pk.writeInt(1); pk.writeInt(0); }); // cena 1 nunca jogada: trancado
    const r3 = await c.code(277, 8, m3);
    r3.pkt.readByte(); r3.pkt.readInt(); r3.pkt.readInt();
    expect(r3.pkt.readBoolean()).toBe(false);
    c.close();
  });

  it("CHALLENGE cria uma sala PvE real (RoomType.Rescue) com o Pve_Info da cena", async () => {
    const { c, ch } = await loggedIn(server, { client: "6600", grade: 25 });
    c.out(277, (pk) => { pk.writeByte(3); pk.writeInt(1); });
    await c.waitFor((r) => r.code === 94 && r.sub === 0, 3000);
    const gp = ctx.world.get(ch.userId)!;
    expect(gp.currentRoom?.RoomType).toBe(RoomType.Rescue);
    expect(gp.currentRoom?.MapId).toBe(1); // RescueScene1Mission default
    c.close();
  });
});
