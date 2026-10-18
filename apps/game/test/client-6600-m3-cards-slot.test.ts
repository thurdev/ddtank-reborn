/**
 * M3 `m3-cards-slot` (docs/plan/TASKS.md): 170 CARDS_SLOT — subir o nível do slot/"alma" de uma carta
 * equipada gastando CardSoul (sub 0) e resetar todas de volta devolvendo CardSoul (sub 1, cobra 300 Money).
 * `CardSlotHandler.cs` (6600 only, sem equivalente 4.1).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import type { CardGrooveRow, UserCardRow } from "../src/game/cards.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

/** Curva simplificada Type 0: nível 0→0 XP, 1→50 XP (+4 Attack), 2→150 XP (+4 Defence) — mesmo shape da seed real. */
function setupGroove(server: GameServer): void {
  const rows: CardGrooveRow[] = [
    { ID: 1, Level: 0, Type: 0, Exp: 0, Attack: 0, Defend: 0, Agility: 0, Lucky: 0, Damage: 0, Guard: 0 },
    { ID: 2, Level: 1, Type: 0, Exp: 50, Attack: 4, Defend: 0, Agility: 0, Lucky: 0, Damage: 0, Guard: 0 },
    { ID: 3, Level: 2, Type: 0, Exp: 150, Attack: 0, Defend: 4, Agility: 0, Lucky: 0, Damage: 0, Guard: 0 },
  ];
  server.ctx.templates.cardGrooveUpdates = new Map([[0, rows]]);
}

function newCard(templateId: number, place: number): UserCardRow {
  return {
    CardID: 0, UserID: 0, TemplateID: templateId, Place: place, Count: 0, Attack: 0, Defence: 0, Agility: 0, Luck: 0, Guard: 0, Damage: 0,
    AttackReset: 0, DefenceReset: 0, AgilityReset: 0, LuckReset: 0, Level: 0, CardGP: 0, isFirstGet: false, Type: 0,
  };
}

describe("170 CARDS_SLOT (6600)", () => {
  it("sub 0 (upgradeSlot) cobra CardSoul, sobe o nível pela curva e devolve o pacote 170", async () => {
    setupGroove(server);
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    p().cardBag.addCardTo(newCard(314001, 0), 0);
    p().info.CardSoul = 100;

    const m = c.mark();
    c.out(170, (o) => { o.writeInt(0); o.writeInt(0); o.writeInt(50); }); // sub 0, slot 0, soulPoint 50
    const r = await c.code(170, undefined, m);
    expect(r.pkt.readInt()).toBe(p().id);
    expect(r.pkt.readInt()).toBe(p().zoneId);
    expect(r.pkt.readInt()).toBe(50); // CardSoul: 100 - 50
    expect(r.pkt.readInt()).toBe(1); // count
    expect(r.pkt.readInt()).toBe(0); // Place
    expect(r.pkt.readInt()).toBe(0); // Type
    expect(r.pkt.readInt()).toBe(1); // Level (atingiu o degrau de 50 XP)
    expect(r.pkt.readInt()).toBe(50); // CardGP
    expect(p().info.CardSoul).toBe(50);
    expect(p().cardBag.getItemAt(0)!.Level).toBe(1);
    c.close();
  });

  it("sub 0 sem CardSoul suficiente: não gasta, não sobe nível, sem resposta", async () => {
    setupGroove(server);
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    p().cardBag.addCardTo(newCard(314001, 0), 0);
    p().info.CardSoul = 10;

    const m = c.mark();
    c.out(170, (o) => { o.writeInt(0); o.writeInt(0); o.writeInt(50); }); // pede 50, só tem 10
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 170)).toBe(false);
    expect(p().info.CardSoul).toBe(10);
    expect(p().cardBag.getItemAt(0)!.Level).toBe(0);
    c.close();
  });

  it("sub 0 no nível máximo: custo é limitado ao que falta pro teto, nunca desperdiça CardSoul", async () => {
    setupGroove(server);
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    p().cardBag.addCardTo(newCard(314001, 0), 0);
    p().info.CardSoul = 1000;

    const m = c.mark();
    // pede 500 CardSoul de uma vez (bem mais que os 150 XP do teto Level 2)
    c.out(170, (o) => { o.writeInt(0); o.writeInt(0); o.writeInt(500); });
    const r = await c.code(170, undefined, m);
    expect(r.pkt.readInt()); expect(r.pkt.readInt());
    expect(r.pkt.readInt()).toBe(1000 - 150); // só gastou os 150 do teto, não os 500 pedidos
    r.pkt.readInt(); r.pkt.readInt(); r.pkt.readInt();
    expect(r.pkt.readInt()).toBe(2); // Level máximo
    expect(r.pkt.readInt()).toBe(150); // CardGP = teto exato
    expect(p().info.CardSoul).toBe(850);
    c.close();
  });

  it("sub 1 (resetCardSoul) cobra 300 Money, zera níveis e devolve o CardGP acumulado como CardSoul", async () => {
    setupGroove(server);
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 10_000 });
    const card = newCard(314001, 0);
    card.Level = 1; card.CardGP = 50;
    p().cardBag.addCardTo(card, 0);
    p().info.CardSoul = 0;
    const startMoney = p().info.Money;

    const m = c.mark();
    c.out(170, (o) => { o.writeInt(1); o.writeBoolean(false); }); // sub 1, isBand
    const r = await c.code(170, undefined, m);
    r.pkt.readInt(); r.pkt.readInt();
    expect(r.pkt.readInt()).toBe(50); // CardSoul devolvido
    expect(r.pkt.readInt()).toBe(1); // count (1 carta equipada)
    r.pkt.readInt();
    r.pkt.readInt();
    expect(r.pkt.readInt()).toBe(0); // Level zerado
    expect(r.pkt.readInt()).toBe(0); // CardGP zerado
    expect(p().info.Money).toBe(startMoney - 300);
    expect(p().info.CardSoul).toBe(50);
    expect(p().cardBag.getItemAt(0)!.Level).toBe(0);
    c.close();
  });

  it("sub 1 sem Money suficiente: não cobra, não reseta, sem pacote 170", async () => {
    setupGroove(server);
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 100 });
    const card = newCard(314001, 0);
    card.Level = 1; card.CardGP = 50;
    p().cardBag.addCardTo(card, 0);

    const m = c.mark();
    c.out(170, (o) => { o.writeInt(1); o.writeBoolean(false); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 170)).toBe(false);
    expect(p().info.Money).toBe(100);
    expect(p().cardBag.getItemAt(0)!.Level).toBe(1);
    c.close();
  });
});
