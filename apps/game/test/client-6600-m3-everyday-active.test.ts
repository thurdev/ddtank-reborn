/**
 * M3 `m3-everyday-active` (docs/plan/TASKS.md): 155 EVERYDAY_ACTIVEPOINT ("Sist. Treino" da bolsa nova,
 * 6600 only — a 4.1 nunca manda esse código, grep vazio em `vendor/DDTank41`). Mesmo método dos outros
 * `client-6600-*`: template em memória (`eventsRuntime(ctx).data.everyDayActivePoint`/`everyDayActiveReward`,
 * tabelas 0-linhas na origem), pacote via `FakeClient`, decodifica a resposta na ordem que
 * `handlers/bolsa/treino-diario.ts` escreve (confirmada contra o contrato AS3, ver cabeçalho do handler).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { eventsRuntime } from "../src/handlers/eventos/agendador.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

const ACTIVITY_ID = 910001;

function setupTemplate(server: GameServer): void {
  const rt = eventsRuntime(server.ctx);
  rt.data.everyDayActivePoint = [
    { ID: ACTIVITY_ID, MinLevel: 1, MaxLevel: 99, ActivityType: 1, JumpType: 0, Description: null, Count: 3, ActivePoint: 50, MoneyPoint: 200 },
  ];
  rt.data.everyDayActiveReward = new Map([
    [1, [{ ID: 1, RewardID: 1, RewardItemID: 11101, IsSelect: false, RewardItemValid: 0, RewardItemCount: 2, StrengthenLevel: 0, AttackCompose: 0, DefendCompose: 0, AgilityCompose: 0, LuckCompose: 0, IsBind: true }]],
  ]);
}

describe("155 EVERYDAY_ACTIVEPOINT — Sist. Treino (6600)", () => {
  it("sub 1 (enterDayActivity) sem templates configurados: lista vazia, activityValue 0", async () => {
    const rt = eventsRuntime(server.ctx);
    rt.data.everyDayActivePoint = [];
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(155, (o) => o.writeByte(1));
    const r = await c.code(155, 1, m);
    const p = r.pkt;
    expect(p.readByte()).toBe(1);
    expect(p.readInt()).toBe(0); // count1 — nenhuma atividade ativa
    expect(p.readInt()).toBe(4); // count2 — 4 tiers fixos
    for (let i = 0; i < 4; i++) { expect(p.readInt()).toBe(i + 1); expect(p.readInt()).toBe(0); }
    expect(p.readInt()).toBe(0); // sessionArr
    expect(p.readInt()).toBe(0); // activityValue
    expect(p.readInt()).toBe(0); // findBack
    c.close();
  });

  it("sub 8 (sendExpBlessedData) sempre responde byte 8 + int 0 (stub igual ao C# original)", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(155, (o) => o.writeByte(8));
    const r = await c.code(155, 8, m);
    expect(r.pkt.readByte()).toBe(8);
    expect(r.pkt.readInt()).toBe(0);
    c.close();
  });

  it("sub 5 (addSpeed) completa a atividade cobrando MoneyPoint e soma ActivePoint", async () => {
    setupTemplate(server);
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 10_000 });
    const before = p().info.Money;
    const m = c.mark();
    c.out(155, (o) => { o.writeByte(5); o.writeInt(1); o.writeInt(ACTIVITY_ID); }); // type=ActivityType, id
    const r = await c.code(155, 3, m);
    expect(r.pkt.readByte()).toBe(3);
    expect(r.pkt.readInt()).toBe(ACTIVITY_ID);
    expect(r.pkt.readBoolean()).toBe(true);
    expect(r.pkt.readInt()).toBe(50); // ActivePoint da atividade concluída
    expect(r.pkt.readInt()).toBe(ACTIVITY_ID);
    expect(p().info.Money).toBe(before - 200);

    // sub 1 depois: atividade marcada como feita (overCount===Count), activityValue 50, id na lista wantstrong
    const m2 = c.mark();
    c.out(155, (o) => o.writeByte(1));
    const r2 = await c.code(155, 1, m2);
    const pk = r2.pkt;
    expect(pk.readByte()).toBe(1);
    expect(pk.readInt()).toBe(1);
    expect(pk.readInt()).toBe(ACTIVITY_ID);
    expect(pk.readInt()).toBe(3); // overCount === Count
    expect(pk.readInt()).toBe(4);
    for (let i = 0; i < 4; i++) { pk.readInt(); pk.readInt(); }
    expect(pk.readInt()).toBe(0);
    expect(pk.readInt()).toBe(50);
    expect(pk.readInt()).toBe(0);
    c.close();
  });

  it("addSpeed de novo na mesma atividade já concluída não cobra 2x (ok=false)", async () => {
    setupTemplate(server);
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 10_000 });
    c.out(155, (o) => { o.writeByte(5); o.writeInt(1); o.writeInt(ACTIVITY_ID); });
    await c.code(155, 3);
    const moneyAfterFirst = p().info.Money;
    const m = c.mark();
    c.out(155, (o) => { o.writeByte(5); o.writeInt(1); o.writeInt(ACTIVITY_ID); });
    const r = await c.code(155, 3, m);
    expect(r.pkt.readByte()).toBe(3);
    expect(r.pkt.readInt()).toBe(ACTIVITY_ID);
    expect(r.pkt.readBoolean()).toBe(false); // já completa — sem segunda cobrança
    expect(p().info.Money).toBe(moneyAfterFirst); // sem exploit de cobrar/dar pontos 2x
    c.close();
  });

  it("addSpeed sem saldo suficiente falha sem cobrar", async () => {
    setupTemplate(server);
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 10 });
    const before = p().info.Money;
    const m = c.mark();
    c.out(155, (o) => { o.writeByte(5); o.writeInt(1); o.writeInt(ACTIVITY_ID); });
    const r = await c.code(155, 3, m);
    expect(r.pkt.readByte()).toBe(3);
    expect(r.pkt.readInt()).toBe(ACTIVITY_ID);
    expect(r.pkt.readBoolean()).toBe(false);
    expect(p().info.Money).toBe(before);
    c.close();
  });

  it("sub 6 (sendGetGoods) reivindica o tier 1 (threshold 30) uma vez por dia; segunda vez falha (claimOnce)", async () => {
    setupTemplate(server);
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 10_000 });
    c.out(155, (o) => { o.writeByte(5); o.writeInt(1); o.writeInt(ACTIVITY_ID); }); // activityValue -> 50 (>= tier 1 = 30)
    await c.code(155, 3);
    const t = server.ctx.templates;
    const before = p().getTemplateCount(11101, t.findItem);
    const m = c.mark();
    c.out(155, (o) => { o.writeByte(6); o.writeInt(1); });
    const r = await c.code(155, 4, m);
    expect(r.pkt.readByte()).toBe(4);
    expect(r.pkt.readInt()).toBe(1);
    expect(r.pkt.readBoolean()).toBe(true);

    const m2 = c.mark();
    c.out(155, (o) => { o.writeByte(6); o.writeInt(1); });
    const r2 = await c.code(155, 4, m2);
    expect(r2.pkt.readByte()).toBe(4);
    expect(r2.pkt.readInt()).toBe(1);
    expect(r2.pkt.readBoolean()).toBe(false); // claim-once: segunda vez não dá de novo
    expect(p().getTemplateCount(11101, t.findItem)).toBeGreaterThan(before); // recompensa foi concedida 1x
    c.close();
  });

  it("sub 6 falha se activityValue não atingiu o threshold do tier", async () => {
    setupTemplate(server);
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(155, (o) => { o.writeByte(6); o.writeInt(1); }); // sem addSpeed antes — activityValue 0 < 30
    const r = await c.code(155, 4, m);
    expect(r.pkt.readByte()).toBe(4);
    expect(r.pkt.readInt()).toBe(1);
    expect(r.pkt.readBoolean()).toBe(false);
    c.close();
  });

  it("4.1: nunca manda 155 (feature nova do 6600, sem código correspondente no cliente 4.1)", async () => {
    const { c } = await loggedIn(server, { client: "41" });
    expect(c.received.some((r) => r.code === 155)).toBe(false);
    c.close();
  });
});
