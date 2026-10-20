/**
 * 41-hot-update: `POST /hot-update` no canal interno de admin (admin/http.ts) — "Aplicar agora" sem
 * desconectar ninguém. Cobre:
 *  1. reload + refresh de stats/propriedades (kind "config"/"items"/"shop") no jogador já logado (67
 *     UPDATE_PLAYER_INFO reenviado, `GamePlayer.updatePlayerProperties`).
 *  2. notice opcional (3 SYS_MESSAGE) junto do reload.
 *  3. kind "events" reenvia o estado ATUAL de um ícone de evento já aberto (42 league notice) pra quem já
 *     estava online — cobre o caso de `reload()` não repetir o broadcast do `onStart` por não ser uma
 *     transição nova (`EventScheduler.tick`, game/scheduler.ts).
 *  4. cross-channel (`ctx.crossChannel.hotUpdate`, bus/cross-channel.ts): `POST /hot-update` em UM canal
 *     também reloada + empurra pros jogadores do OUTRO canal (2 `GameServer` ligados por `createMemoryBus`,
 *     mesmo padrão de `ch-eventos.test.ts`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { eventsRuntime } from "../src/handlers/eventos/agendador.js";
import { createMemoryHub, createMemoryBus, type MemoryHub } from "../src/bus/memory.js";
import { loggedIn, startServer } from "./helpers.js";

async function hotUpdate(server: GameServer, body: { kinds?: string[]; notice?: string }): Promise<Record<string, unknown>> {
  const res = await fetch(`http://127.0.0.1:${server.adminPort}/hot-update`, { method: "POST", body: JSON.stringify(body) });
  expect(res.status).toBe(200);
  return (await res.json()) as Record<string, unknown>;
}

describe("41-hot-update: canal único", () => {
  let server: GameServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server?.stop();
  });

  it("kind config/items: reloada templates e reenvia 67 UPDATE_PLAYER_INFO pro jogador já logado", async () => {
    const a = await loggedIn(server);
    const mark = a.c.mark();
    const r = await hotUpdate(server, { kinds: ["config"] });
    expect(r.notified).toBeGreaterThanOrEqual(1);
    await a.c.waitFor((x) => x.code === 67, 2000, mark);
    a.c.close();
  });

  it("notice: 3 SYS_MESSAGE (type 1) chega no jogador junto do reload, sem precisar de kinds", async () => {
    const a = await loggedIn(server);
    const mark = a.c.mark();
    const msg = "atualizacao aplicada, algumas telas atualizam ao reabrir";
    await hotUpdate(server, { notice: msg });
    const r = await a.c.waitFor((x) => x.code === 3, 2000, mark);
    r.pkt.offset = 20;
    expect(r.pkt.readInt()).toBe(1); // type 1 (informativo), igual aos avisos de evento em agendador.ts
    expect(r.pkt.readString()).toBe(msg);
    a.c.close();
  });

  it("kind events: reenvia o ícone de um evento JÁ aberto (liga) pra quem já estava online", async () => {
    const rt = eventsRuntime(server.ctx);
    rt.leagueOpen = true;
    try {
      const a = await loggedIn(server);
      const mark = a.c.mark();
      await hotUpdate(server, { kinds: ["events"] });
      const r = await a.c.waitFor((x) => x.code === 42, 2000, mark);
      expect(r.sub).toBe(1); // type=1 (aberto) — Out.leagueNotice primeiro byte do corpo
      a.c.close();
    } finally {
      rt.leagueOpen = false;
    }
  });
});

describe("41-hot-update: entre canais (ctx.crossChannel.hotUpdate)", () => {
  let hub: MemoryHub;
  let ch4: GameServer;
  let ch5: GameServer;
  beforeAll(async () => {
    hub = createMemoryHub();
    ch4 = await startServer({ SERVER_ID: "4" }, { bus: createMemoryBus(hub) });
    ch5 = await startServer({ SERVER_ID: "5" }, { bus: createMemoryBus(hub) });
  });
  afterAll(async () => {
    await ch4?.stop();
    await ch5?.stop();
  });

  it("POST /hot-update no canal 4 também reloada + empurra pro jogador logado no canal 5", async () => {
    const a = await loggedIn(ch4);
    const b = await loggedIn(ch5);
    const markA = a.c.mark();
    const markB = b.c.mark();
    const msg = "hot-update entre canais";
    const r = await hotUpdate(ch4, { kinds: ["config"], notice: msg });
    expect(r.notified).toBeGreaterThanOrEqual(1); // só conta os locais (ch4); ch5 conta por conta própria
    const isNotice = (x: { code: number; pkt: { offset: number; readInt(): number; readString(): string } }) => {
      if (x.code !== 3) return false;
      x.pkt.offset = 20;
      return x.pkt.readInt() === 1 && x.pkt.readString() === msg;
    };
    await a.c.waitFor(isNotice, 2000, markA); // local, direto
    await b.c.waitFor(isNotice, 3000, markB); // via ctx.crossChannel.hotUpdate (bus/cross-channel.ts)
    await a.c.waitFor((x) => x.code === 67, 2000, markA);
    await b.c.waitFor((x) => x.code === 67, 3000, markB); // ch5 também reloadou + reenviou localmente
    a.c.close();
    b.c.close();
  });
});
