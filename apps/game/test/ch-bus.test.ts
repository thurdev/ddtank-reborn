/**
 * ch-bus: 2 `GameServer` em processo (SERVER_ID 4/5, mesmo PGlite compartilhado via `sharedDb()` — igual
 * `ch-processo.test.ts`), MAS agora ligados por um `Bus` de teste (`createMemoryBus`, bus/memory.ts) que simula
 * o Redis pub/sub real entre 2 processos `apps/game`. Cobre os 3 pontos que `ch-processo.test.ts` deixou como
 * "ainda falta" (docs/GAME-SERVER.md "Canais"):
 *  1. login único entre canais (kick)
 *  2. sussurro (160/51) entregue em outro canal quando o alvo não está neste
 *  3. chat mundial (19 SCENE_CHAT, lobby sem sala) atravessando canal
 *  4. presença de amigo (160/165 FRIEND_STATE) em tempo real pro canal onde o amigo NÃO está
 *
 * Testes de 1 servidor só (handlers.test.ts etc.) continuam exatamente iguais — o `NoopBus` default (sem
 * `REDIS_URL`) faz `ctx.crossChannel.*` resolver na hora sem publicar nada.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { createMemoryHub, createMemoryBus, type MemoryHub } from "../src/bus/memory.js";
import { addFriend } from "../src/db/social.js";
import { createCharacter, FakeClient, loggedIn, sharedDb, startServer } from "./helpers.js";

let hub: MemoryHub;
let ch4: GameServer; // canal "local" padrão (SERVER_ID 4)
let ch5: GameServer; // 2º canal/processo, mesmo Postgres, LIGADO a ch4 pelo bus de teste

beforeAll(async () => {
  hub = createMemoryHub();
  ch4 = await startServer({ SERVER_ID: "4" }, { bus: createMemoryBus(hub) });
  ch5 = await startServer({ SERVER_ID: "5" }, { bus: createMemoryBus(hub) });
  const db = await sharedDb();
  await db.db
    .insert(player.Server_List)
    .values({ ID: 5, Name: "Canal 2", State: 2, Online: 0, Total: 1000, Room: 200, ZoneId: 2, ZoneName: "Server S2", Enabled: true, SortOrder: 1, PvpOnly: false })
    .onConflictDoNothing();
});
afterAll(async () => {
  await ch4?.stop();
  await ch5?.stop();
});

describe("ch-bus: login único entre canais", () => {
  it("logar a mesma conta no canal 5 derruba a sessão aberta no canal 4 (mesmo aviso LoginNext, via barramento)", async () => {
    const { ch, c: a } = await loggedIn(ch4);
    expect(ch4.ctx.world.get(ch.userId)).toBeTruthy();

    const b = FakeClient.memory(ch5);
    b.login(ch.user, ch.pass);
    await b.code(95);

    await a.code(2); // kitoff chega na sessão antiga do canal 4
    await a.waitClosed();
    expect(ch5.ctx.world.get(ch.userId)).toBeTruthy();
    expect(ch4.ctx.world.get(ch.userId)).toBeFalsy();
    b.close();
  });
});

describe("ch-bus: sussurro entre canais (160/51 ONE_ON_ONE_TALK)", () => {
  it("entrega no canal 5 quando o remetente está no canal 4 (sem 'jogador offline')", async () => {
    const a = await loggedIn(ch4);
    const b = await loggedIn(ch5);
    const mark = b.c.mark();
    a.c.out(160, (x) => {
      x.writeByte(51);
      x.writeInt(b.ch.userId);
      x.writeUTF("oi de outro canal");
      x.writeBoolean(false);
    });
    const got = await b.c.waitFor((r) => r.code === 160 && r.sub === 51, 4000, mark);
    expect(got.pkt.readByte()).toBe(51);
    expect(got.pkt.readInt()).toBe(a.ch.userId); // receiverId do pacote = quem mandou (eco de identidade)
    expect(got.pkt.readString()).toBe(a.ch.nick);
    got.pkt.readDateTime(true);
    expect(got.pkt.readString()).toBe("oi de outro canal");
    // o remetente (canal 4) não deve ter recebido "jogador offline" (FriendAddHandler.Ofline, pacote 3 MESSAGE).
    expect(a.c.received.some((r) => r.code === 3)).toBe(false);
    a.c.close();
    b.c.close();
  });

  it("'jogador offline' quando o alvo não está logado em canal nenhum", async () => {
    const a = await loggedIn(ch4);
    const mark = a.c.mark();
    a.c.out(160, (x) => {
      x.writeByte(51);
      x.writeInt(999999999);
      x.writeUTF("ninguem ouve");
      x.writeBoolean(false);
    });
    await a.c.waitFor((r) => r.code === 3, 4000, mark);
    a.c.close();
  });
});

describe("ch-bus: chat mundial entre canais (19 SCENE_CHAT, lobby)", () => {
  it("mensagem mandada no canal 4 chega em quem está no lobby do canal 5", async () => {
    const a = await loggedIn(ch4);
    const b = await loggedIn(ch5);
    const mark = b.c.mark();
    a.c.out(19, (x) => {
      x.writeByte(0); // canal "mundial" (lobby, != clã/capela/termas)
      x.writeBoolean(false); // team
      x.writeUTF(""); // string ignorada pelo handler
      x.writeUTF("alo mundo");
    });
    const got = await b.c.waitFor((r) => r.code === 19, 4000, mark);
    got.pkt.readInt(); // zoneId (do canal 4, irrelevante pro teste)
    expect(got.pkt.readByte()).toBe(0);
    expect(got.pkt.readBoolean()).toBe(false);
    expect(got.pkt.readString()).toBe(a.ch.nick);
    expect(got.pkt.readString()).toBe("alo mundo");
    a.c.close();
    b.c.close();
  });
});

describe("ch-bus: presença de amigo entre canais (160/165 FRIEND_STATE)", () => {
  it("amigo logando em outro canal avisa quem já está online e tem ele na lista", async () => {
    const db = await sharedDb();
    const chA = await createCharacter(db);
    const chB = await createCharacter(db);
    await addFriend(db.db, chA.userId, chB.userId, 0); // A tem B como amigo

    const a = FakeClient.memory(ch4);
    a.login(chA.user, chA.pass);
    await a.code(95);
    const mark = a.mark();

    const b = FakeClient.memory(ch5);
    b.login(chB.user, chB.pass);
    await b.code(95);

    const got = await a.waitFor((r) => r.code === 160 && r.sub === 165, 4000, mark);
    expect(got.clientId).toBe(chB.userId);
    got.pkt.readByte(); // sub
    expect(got.pkt.readInt()).toBe(1); // state = online
    a.close();
    b.close();
  });
});
