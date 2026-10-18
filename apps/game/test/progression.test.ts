/**
 * Protocol-level tests for handlers/progression.ts that persist-all.test.ts doesn't cover (that file only checks
 * the save-quit-reload path for 136 TOTEM). Covers: 18 GET_PLAYER_CARD (online + offline target), 402 AVATAR_COLLECTION
 * sub 4 (the "not available" stub that mirrors the C# original's own unfinished branch), and the four lottery/platinum-
 * card codes (104 CARD_LOTTERY / 105 LUCK_LOTTERY / 239 GOTO_CARD_LOTTERY / 11 ACTIVE_PULLDOWN) that have no C# handler
 * at all in vendor/DDTank41 or vendor/DDT-6600 — see research/qa/port-B.md for the "why no economy" note.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { newCard } from "../src/game/cards.js";
import { createCharacter, loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server?.stop(); });

describe("18 GET_PLAYER_CARD", () => {
  it("online target: reads the equipped cards straight from memory (GetPlayerCardHandler.cs:9-36)", async () => {
    const a = await loggedIn(server);
    const b = await loggedIn(server);
    b.player().cardBag.addCardTo(newCard(b.ch.userId, 90001, 1), 0);
    a.c.out(18, (x) => x.writeInt(b.ch.userId));
    const reply = await a.c.code(216);
    expect(reply.pkt.readInt()).toBe(b.ch.userId); // targetId
    expect(reply.pkt.readInt()).toBe(1); // 1 equipped card
    expect(reply.pkt.readInt()).toBe(0); // Place
    expect(reply.pkt.readBoolean()).toBe(true);
  });

  it("offline target: falls back to loadPlayerInfo/loadUserCardBag (WorldMgr.GetPlayerById miss)", async () => {
    const db = await sharedDb();
    const target = await createCharacter(db);
    await db.db.insert(player.Sys_Users_Card).values({ UserID: target.userId, TemplateID: 90002, Place: 1, Count: 0 });
    const a = await loggedIn(server);
    a.c.out(18, (x) => x.writeInt(target.userId));
    const reply = await a.c.code(216);
    expect(reply.pkt.readInt()).toBe(target.userId);
    expect(reply.pkt.readInt()).toBe(1);
  });

  it("unknown target (never existed): no reply, same as the C# original (playerInfo null -> return)", async () => {
    const a = await loggedIn(server);
    const m = a.c.mark();
    a.c.out(18, (x) => x.writeInt(999_999_999));
    await new Promise((r) => setTimeout(r, 150));
    expect(a.c.received.slice(m).some((r) => r.code === 216)).toBe(false);
  });
});

describe("402 AVATAR_COLLECTION sub 4 (renew) — stub, matches the C# original's own disabled branch", () => {
  it("answers with a SYS_MESSAGE instead of touching Gold/the collection", async () => {
    const { c, player: p } = await loggedIn(server, { gold: 10_000 });
    const gold = p().info.Gold;
    c.out(402, (x) => { x.writeByte(4); x.writeInt(1); x.writeInt(1); });
    const reply = await c.code(3);
    expect(reply.pkt.readInt()).toBe(0);
    expect(typeof reply.pkt.readString()).toBe("string");
    expect(p().info.Gold).toBe(gold);
  });
});

describe("Loteria de cartas/sorte + cartão platina (design próprio, sem fonte C#, research/qa/feature-designs.md)", () => {
  it("239 GOTO_CARD_LOTTERY: nível >= 3 permite, custo = lottery.cardCost (200 default)", async () => {
    const { c } = await loggedIn(server); // grade default 10
    c.out(239);
    const reply = await c.code(93);
    expect(reply.pkt.readBoolean()).toBe(true);
    expect(reply.pkt.readInt()).toBe(200);
  });

  it("239 GOTO_CARD_LOTTERY: nível baixo nega", async () => {
    const { c } = await loggedIn(server, { grade: 1 });
    c.out(239);
    const reply = await c.code(93);
    expect(reply.pkt.readBoolean()).toBe(false);
  });

  it("104 CARD_LOTTERY: cobra o custo do giro e respeita o limite diário", async () => {
    const { c, player: p } = await loggedIn(server, { money: 5_000 });
    const moneyBefore = p().info.Money;
    // Sob carga (suíte inteira) avisos código 3 do burst de login chegam atrasados e se confundiam com a resposta
    // do giro — espera pelo efeito real (saldo) em vez de "o próximo código 3".
    const moneyIs = async (v: number) => {
      const deadline = Date.now() + 4000;
      while (p().info.Money !== v && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20));
      expect(p().info.Money).toBe(v);
    };
    c.out(104, (x) => { x.writeInt(2); x.writeInt(1); x.writeInt(2); });
    await moneyIs(moneyBefore - 200);
    // esgota o limite diário (3 giros/dia default) e confere a mensagem de limite
    c.out(104, (x) => { x.writeInt(1); x.writeInt(1); });
    await moneyIs(moneyBefore - 400);
    c.out(104, (x) => { x.writeInt(1); x.writeInt(1); });
    await moneyIs(moneyBefore - 600);
    const mark = c.mark();
    c.out(104, (x) => { x.writeInt(1); x.writeInt(1); }); // 4º giro: acima do limite
    const limitMsg = await c.waitFor((r) => {
      if (r.code !== 3) return false;
      r.pkt.offset = 20;
      r.pkt.readInt();
      return r.pkt.readString().includes("giros de hoje");
    }, 4000, mark);
    expect(limitMsg.pkt.readInt()).toBe(0);
    expect(limitMsg.pkt.readString()).toContain("giros de hoje");
    expect(p().info.Money).toBe(moneyBefore - 600); // só 3 giros cobrados
  });

  it("105 LUCK_LOTTERY: 1ª vez no dia responde (código 1 prêmio ou 3 sem sorte), 2ª vez no mesmo dia é sempre 'já consultou'", async () => {
    const { c } = await loggedIn(server);
    c.out(105);
    const reply = await c.code(251);
    const code = reply.pkt.readInt();
    expect([1, 3]).toContain(code);
    const mark = c.mark();
    c.out(105);
    const again = await c.code(251, undefined, mark);
    expect(again.pkt.readInt()).toBe(3);
    expect(again.pkt.readString()).toContain("já consultou");
  });

  it("11 ACTIVE_PULLDOWN: cartão platina de novato resgata 1x só, nível baixo é elegível", async () => {
    const { c, player: p } = await loggedIn(server, { grade: 5, money: 0, gold: 0 });
    c.out(11, (x) => { x.writeInt(1); x.writeString("qualquer coisa"); });
    const reply = await c.code(11);
    expect(reply.pkt.readBoolean()).toBe(true);
    expect(p().info.Money).toBeGreaterThan(0);
    const mark = c.mark();
    c.out(11, (x) => { x.writeInt(1); x.writeString("de novo"); });
    const again = await c.code(11, undefined, mark);
    expect(again.pkt.readBoolean()).toBe(false); // já resgatado
  });

  it("11 ACTIVE_PULLDOWN: nível alto (não é mais novato) é rejeitado", async () => {
    const { c } = await loggedIn(server, { grade: 50 });
    c.out(11, (x) => { x.writeInt(1); x.writeString("codigo"); });
    const reply = await c.code(11);
    expect(reply.pkt.readBoolean()).toBe(false);
  });
});
