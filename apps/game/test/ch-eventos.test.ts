/**
 * ch-eventos: 2 `GameServer` em processo (SERVER_ID 4/5, mesmo PGlite compartilhado via `sharedDb()`, ligados
 * por um `Bus` de teste `createMemoryBus` — igual `ch-bus.test.ts`), cobrindo o que `ch-bus` deixou faltando
 * (docs/GAME-SERVER.md "Canais" § "O que ainda não funciona com 2+ canais" antes desta tarefa):
 *  1. boss mundial: HP/ranking COMPARTILHADO entre canais (líder = menor SERVER_ID, `bus/leader.ts`); dano em
 *     qualquer canal reduz o MESMO HP, e o prêmio do ranking só é pago uma vez — mesmo quando o ganhador está
 *     logado num canal diferente do líder (entrega cross-canal, `ctx.crossChannel.deliverReward`).
 *  2. liga (evento agendado comum, sem estado compartilhado de verdade): cada canal ticka o PRÓPRIO scheduler
 *     contra o mesmo `app."ScheduledEvents"` + o mesmo relógio, então os dois abrem a MESMA janela (mesma
 *     chave) e notificam os PRÓPRIOS jogadores locais — não precisa de líder aqui (ao contrário do boss
 *     mundial, não há um contador mutável compartilhado; o que precisa ser "uma vez só" por jogador — ex.
 *     weekly_reset — já é garantido por `claimOnce`, Postgres compartilhado, testado em `events.test.ts`).
 *  3. aviso de admin (POST /broadcast no canal local) chega nos jogadores do OUTRO canal via
 *     `ctx.crossChannel.systemNotice` (bus/cross-channel.ts).
 *
 * Testes de 1 canal só (events.test.ts etc.) continuam exatamente iguais — sem barramento (`NoopBus`), este
 * canal é sempre o líder (`bus/leader.ts`) e aplica tudo direto, síncrono, igual antes desta tarefa.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { eventsRuntime } from "../src/handlers/eventos/agendador.js";
import { worldBossDamage } from "../src/handlers/eventos/boss-mundial.js";
import { createMemoryHub, createMemoryBus, type MemoryHub } from "../src/bus/memory.js";
import { loggedIn, sleep, startServer } from "./helpers.js";

let hub: MemoryHub;
let ch4: GameServer; // canal "local" padrão (SERVER_ID 4) — menor SERVER_ID entre os dois: é o líder (bus/leader.ts)
let ch5: GameServer; // 2º canal/processo, mesmo Postgres, ligado a ch4 pelo bus de teste — sempre seguidor aqui

beforeAll(async () => {
  hub = createMemoryHub();
  ch4 = await startServer({ SERVER_ID: "4" }, { bus: createMemoryBus(hub) });
  ch5 = await startServer({ SERVER_ID: "5" }, { bus: createMemoryBus(hub) });
});
afterAll(async () => {
  await ch4?.stop();
  await ch5?.stop();
});

async function waitUntil(fn: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!fn()) {
    if (Date.now() > deadline) throw new Error("timeout waiting for condition");
    await sleep(20);
  }
}

describe("ch-eventos: boss mundial compartilhado entre canais", () => {
  it("dano nos dois canais reduz o MESMO HP; ranking/prêmio paga uma vez só, mesmo pro ganhador logado no canal seguidor", async () => {
    const rt4 = eventsRuntime(ch4.ctx);
    const rt5 = eventsRuntime(ch5.ctx);
    const ev = {
      id: 9501, kind: "worldboss", title: "boss de teste", enabled: true, weekdays: "", startTime: "00:00", durationMin: 5,
      startDate: null, endDate: null, params: { bossHp: 1000, rankAwards: [{ rank: 1, giftToken: 77 }] },
    } as const;
    rt4.scheduler.setEvents([ev]);
    rt5.scheduler.setEvents([ev]);
    // Simula o que o admin faria numa linha real de app.ScheduledEvents (os dois canais tickando a mesma
    // janela no mesmo instante) — `force`/`stop` são overrides locais de cada EventScheduler, por isso chamo
    // nos dois, não só no líder.
    rt4.scheduler.force("worldboss", 5);
    rt5.scheduler.force("worldboss", 5);
    await rt4.scheduler.tick();
    await rt5.scheduler.tick();

    // Só o líder (ch4, menor SERVER_ID) abre de verdade; o seguidor (ch5) espelha via ch:boss:open (bus).
    expect(rt4.boss.window).toBeTruthy();
    expect(rt4.boss.maxBlood).toBe(1000);
    await waitUntil(() => !!rt5.boss.window);
    expect(rt5.boss.maxBlood).toBe(1000);
    expect(rt5.boss.blood).toBe(1000);

    const a = await loggedIn(ch4); // conectado no LÍDER
    const b = await loggedIn(ch5); // conectado no SEGUIDOR — vai ser o 1º lugar do ranking

    worldBossDamage(ch4.ctx, a.player(), 200); // aplica direto no líder (síncrono)
    worldBossDamage(ch5.ctx, b.player(), 300); // repassa pro líder via ch:boss:damage (ch5 não decrementa local)

    // O líder acumula os dois danos (500 total) e replica (ch:boss:sync) pro seguidor espelhar o MESMO HP.
    await waitUntil(() => rt4.boss.blood === 500);
    await waitUntil(() => rt5.boss.blood === 500);
    expect(rt5.boss.rank.get(b.ch.userId)?.damage).toBe(300); // ranking espelhado também (top 10 do líder)

    const giftBefore = b.player().info.GiftToken;
    rt4.scheduler.stop("worldboss");
    rt5.scheduler.stop("worldboss");
    await rt4.scheduler.tick(); // líder: finishWorldBoss paga o 1º lugar (b, 300 de dano) uma vez só
    await rt5.scheduler.tick(); // seguidor: break (isLeader() false) — não paga de novo
    await waitUntil(() => rt4.boss.window === null);
    await waitUntil(() => rt5.boss.window === null); // espelhado via ch:boss:close

    // b estava logado no SEGUIDOR (ch5), não no líder: a entrega atravessou canal (ctx.crossChannel.deliverReward).
    expect(b.player().info.GiftToken - giftBefore).toBe(77);
    expect(a.player().info.GiftToken).toBe(0); // 2º lugar (200 de dano) não bate a única faixa (rank 1) — sem prêmio

    a.c.close();
    b.c.close();
  });
});

describe("ch-eventos: evento agendado comum (liga) — sem contador compartilhado, não precisa de líder", () => {
  it("cada canal abre a MESMA janela (mesmo app.ScheduledEvents) e notifica os próprios jogadores locais", async () => {
    const a = await loggedIn(ch4);
    const b = await loggedIn(ch5);
    const markA = a.c.mark();
    const markB = b.c.mark();
    const ev = { id: 9601, kind: "league", title: "liga de teste", enabled: true, weekdays: "", startTime: "00:00", durationMin: 5, startDate: null, endDate: null, params: { maxCount: 10 } } as const;
    eventsRuntime(ch4.ctx).scheduler.setEvents([ev]);
    eventsRuntime(ch5.ctx).scheduler.setEvents([ev]);
    eventsRuntime(ch4.ctx).scheduler.force("league", 5);
    eventsRuntime(ch5.ctx).scheduler.force("league", 5);
    await eventsRuntime(ch4.ctx).scheduler.tick();
    await eventsRuntime(ch5.ctx).scheduler.tick();

    await a.c.waitFor((r) => r.code === 42, 2000, markA); // 42 LEAGUE_START_NOTICE no canal 4
    await b.c.waitFor((r) => r.code === 42, 2000, markB); // e também no canal 5 — cada um notificou o próprio jogador

    eventsRuntime(ch4.ctx).scheduler.stop("league");
    eventsRuntime(ch5.ctx).scheduler.stop("league");
    await eventsRuntime(ch4.ctx).scheduler.tick();
    await eventsRuntime(ch5.ctx).scheduler.tick();
    a.c.close();
    b.c.close();
  });
});

describe("ch-eventos: aviso de admin (POST /broadcast) alcança todo mundo, não só o canal local", () => {
  it("mandado no canal 4 chega também em quem está logado no canal 5 (via barramento)", async () => {
    const a = await loggedIn(ch4);
    const b = await loggedIn(ch5);
    const markA = a.c.mark();
    const markB = b.c.mark();
    const msg = "manutencao em 10 min";
    const res = await fetch(`http://127.0.0.1:${ch4.adminPort}/broadcast`, { method: "POST", body: JSON.stringify({ msg }) });
    expect((await res.json()).sent).toBeGreaterThanOrEqual(1);
    const isMsg = (r: { code: number; pkt: { offset: number; readInt(): number; readString(): string } }) => {
      if (r.code !== 3) return false;
      r.pkt.offset = 20;
      return r.pkt.readInt() === 3 && r.pkt.readString() === msg;
    };
    await a.c.waitFor(isMsg, 2000, markA); // local, imediato
    await b.c.waitFor(isMsg, 3000, markB); // via ctx.crossChannel.systemNotice (bus/cross-channel.ts)
    a.c.close();
    b.c.close();
  });
});
