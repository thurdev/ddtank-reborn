/**
 * M4 `m4-coleta` (docs/plan/TASKS.md): 261 COLLECTION_TASK (`collectiontask.swf`). Sala global
 * (`game/collection-task.ts`) + condição de missão 64 (`game/quests.ts onCollectionTaskCollect`).
 *
 * `ctx.collectionTask` é uma sala ÚNICA pro servidor inteiro (igual `ctx.newHall`) — cada teste chama
 * `ctx.collectionTask.removePlayer(id)` explicitamente antes de fechar a conexão (em vez de confiar no
 * cleanup assíncrono de desconexão) pra não vazar jogador registrado pro próximo teste deste arquivo.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import type { ServerContext } from "../src/session/context.js";
import type { QuestTemplate, QuestCondRow, QuestRow } from "../src/db/templates.js";
import { eventsRuntime } from "../src/handlers/eventos/agendador.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
let ctx: ServerContext;
beforeAll(async () => {
  server = await startServer();
  ctx = (server as unknown as { ctx: ServerContext }).ctx;
});
afterAll(async () => {
  await server.stop();
});

const enter = (c: { out(code: number, fill: (p: import("@ddt/protocol").PacketOut) => void): void }) => c.out(261, (p) => p.writeByte(5));

describe("261 COLLECTION_TASK", () => {
  it("sub 5 INIT_PLAYERS: snapshot inclui o próprio jogador em (0,0) (posição nunca andada)", async () => {
    const { c, ch } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    enter(c);
    const r = await c.code(261, 5, m);
    r.pkt.readByte();
    r.pkt.readInt(); // total (>=1; outros testes deste arquivo podem ter deixado jogadores)
    expect(r.pkt.readInt()).toBe(ch.userId);
    r.pkt.readString(); // NickName
    r.pkt.readInt(); r.pkt.readInt(); r.pkt.readBoolean(); r.pkt.readString(); r.pkt.readString(); r.pkt.readInt(); // VIP/typeVIP/Sex/Style/Colors/MountsType
    expect(r.pkt.readInt()).toBe(0); // posX
    expect(r.pkt.readInt()).toBe(0); // posY
    ctx.collectionTask.removePlayer(ch.userId);
    c.close();
  });

  it("segundo jogador entra: o 1º nunca recebe um 261/1 ADD_ONE_PLAYER (SendAddPlayer sem caller no original)", async () => {
    const { c: c1, ch: ch1 } = await loggedIn(server, { client: "6600" });
    const m1 = c1.mark();
    enter(c1);
    await c1.code(261, 5, m1);

    const { c: c2, ch: ch2 } = await loggedIn(server, { client: "6600" });
    enter(c2);
    await c2.code(261, 5);

    // c1 never gets a 261/1 ADD_ONE_PLAYER broadcast for c2 — SendAddPlayer has no caller in the original.
    await new Promise((res) => setTimeout(res, 150));
    expect(c1.received.slice(m1 + 1).some((r) => r.code === 261 && r.sub === 1)).toBe(false);
    ctx.collectionTask.removePlayer(ch1.userId);
    ctx.collectionTask.removePlayer(ch2.userId);
    c1.close();
    c2.close();
  });

  it("sub 2 WALK: broadcast pros outros com path de 1 ponto (fix do mismatch original), não pro remetente", async () => {
    const { c: c1, ch: ch1 } = await loggedIn(server, { client: "6600" });
    enter(c1);
    await c1.code(261, 5);
    const { c: c2, ch: ch2 } = await loggedIn(server, { client: "6600" });
    enter(c2);
    await c2.code(261, 5);

    const m1 = c1.mark();
    const m2 = c2.mark();
    c1.out(261, (p) => { p.writeByte(2); p.writeInt(100); p.writeInt(200); p.writeUTF("0,0,100,200"); });
    const walk = await c2.code(261, 2, m2);
    walk.pkt.readByte();
    expect(walk.pkt.readInt()).toBe(ch1.userId);
    expect(walk.pkt.readInt()).toBe(100);
    expect(walk.pkt.readInt()).toBe(200);
    expect(walk.pkt.readString()).toBe("100,200");

    await new Promise((res) => setTimeout(res, 150));
    expect(c1.received.slice(m1).some((r) => r.code === 261 && r.sub === 2)).toBe(false); // sender never echoed
    ctx.collectionTask.removePlayer(ch1.userId);
    ctx.collectionTask.removePlayer(ch2.userId);
    c1.close();
    c2.close();
  });

  it("sub 4 QUIT: remove o próprio remetente (nunca um id de terceiro) e avisa quem ficou", async () => {
    const { c: c1, ch: ch1 } = await loggedIn(server, { client: "6600" });
    enter(c1);
    await c1.code(261, 5);
    const { c: c2, ch: ch2 } = await loggedIn(server, { client: "6600" });
    enter(c2);
    await c2.code(261, 5);

    const m2 = c2.mark();
    c1.out(261, (p) => p.writeByte(4)); // cliente real nunca escreve um int aqui
    const quit = await c2.code(261, 4, m2);
    quit.pkt.readByte();
    expect(quit.pkt.readInt()).toBe(ch1.userId);

    ctx.collectionTask.removePlayer(ch2.userId);
    c1.close();
    c2.close();
  });

  it("isOpen(ctx,'collection_task')=false: entrada recusada com mensagem, sem snapshot", async () => {
    const { c, ch } = await loggedIn(server, { client: "6600" });
    const rt = eventsRuntime(ctx);
    rt.scheduler.setEvents([{ id: 901, kind: "collection_task", title: "", enabled: false, weekdays: "", startTime: "00:00", durationMin: 0, startDate: null, endDate: null, params: {} }]);
    const m = c.mark();
    enter(c);
    const msg = await c.waitFor((r) => r.code === 3, 2000, m);
    msg.pkt.readInt();
    expect(msg.pkt.readString()).toContain("Coleta está fechada");
    expect(c.received.slice(m).some((r) => r.code === 261)).toBe(false);
    rt.scheduler.setEvents([]);
    ctx.collectionTask.removePlayer(ch.userId);
    c.close();
  });

  it("sub 3 COLLECT: soma +1 na condição 64 quando o id bate, ignora id errado, e respeita cooldown anti-spam", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    // Injeta uma missão fake com condição CollectionTaskCondition (64) direto no QuestInventory — sem precisar
    // de uma linha real em game."Quest"/"Quest_Condiction" (nenhuma existe pro tipo 64 no seed de teste).
    const tpl: QuestTemplate = {
      info: { NotMustCount: 0 } as unknown as QuestRow,
      conds: [{ CondictionType: 64, Para1: 11499, Para2: 3, CondictionID: 1 } as unknown as QuestCondRow],
      goods: [],
    };
    const data = { UserID: p().id, QuestID: 999001, IsComplete: false, CompletedDate: new Date(), Condition1: 0, Condition2: 0, Condition3: 0, Condition4: 0, IsExist: true, RepeatFinish: 0, RandDobule: 1 };
    p().questInv!.list.set(999001, { tpl, data });

    c.out(261, (pk) => { pk.writeByte(3); pk.writeInt(11499); });
    await new Promise((res) => setTimeout(res, 150));
    expect(p().questInv!.list.get(999001)!.data.Condition1).toBe(1);

    // spam imediato com o id certo: cooldown bloqueia (nem a tentativa errada acima reinicia o relógio por sorte).
    c.out(261, (pk) => { pk.writeByte(3); pk.writeInt(11499); });
    await new Promise((res) => setTimeout(res, 150));
    expect(p().questInv!.list.get(999001)!.data.Condition1).toBe(1);

    // id certo de novo, fora do cooldown: soma.
    await new Promise((res) => setTimeout(res, 4100));
    c.out(261, (pk) => { pk.writeByte(3); pk.writeInt(11499); });
    await new Promise((res) => setTimeout(res, 150));
    expect(p().questInv!.list.get(999001)!.data.Condition1).toBe(2);

    // id errado: não soma, mas também consome a janela de cooldown (mesma checagem por tentativa, não só por acerto).
    await new Promise((res) => setTimeout(res, 4100));
    c.out(261, (pk) => { pk.writeByte(3); pk.writeInt(99999); });
    await new Promise((res) => setTimeout(res, 150));
    expect(p().questInv!.list.get(999001)!.data.Condition1).toBe(2);
    c.close();
  }, 15000);
});
