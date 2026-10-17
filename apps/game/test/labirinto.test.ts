/**
 * Labirinto: a parte que faltava (ver docs/features/labirinto.md §5) — subir de andar lutando contra NPC de
 * verdade, não só a camada administrativa (essa já é testada em activities.test.ts, "131 LABYRINTH economy").
 *
 * Duas frentes:
 * 1. `94 GAME_ROOM` por FakeClient: criar + configurar sala `RoomType.Labyrinth` (15) resolve o `Pve_Info.ID`
 *    fixo (401) e o andar salvo do jogador (`SetupChange.cs:26-29`), e "iniciar" de fato cria um `PveGame`
 *    real (antes: nada acontecia) — prova que o gap de wiring foi fechado.
 * 2. Chamada direta de `updateLabyrinthFloor`/`outLabyrinth` (os hooks que `server.ts` liga a
 *    `onMissionOver`/`onLabyrinthFinished`): avançar andar, recompensa, dobro, persistência e "tentar de
 *    novo" na derrota — sem precisar simular a física real de uma partida de tiro (isso já é coberto por
 *    packages/fight/test/pve*.test.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player, seedDatabase } from "@ddt/db";
import type { PacketOut } from "@ddt/protocol";
import type { GameServer } from "../src/server.js";
import type { ServerContext } from "../src/session/context.js";
import { RoomType } from "../src/rooms/room.js";
import { ItemInfo } from "../src/game/item.js";
import { eventsRuntime } from "../src/handlers/eventos/agendador.js";
import { LABYRINTH_PVE_ID, currentLabyrinthFloor, updateLabyrinthFloor, outLabyrinth, type LabyrinthRow } from "../src/handlers/eventos/labirinto.js";
import { FakeClient, loggedIn, sharedDb, startServer } from "./helpers.js";

const roomCmd = (c: FakeClient, sub: number, fill: (p: PacketOut) => void = () => {}) => c.out(94, (p) => { p.writeInt(sub); fill(p); });

let server: GameServer;
let ctx: ServerContext;
beforeAll(async () => {
  // NPC_Info (monstros reais do Labirinto, "Kiến Mê Cung" etc) não está em helpers.ts SEED_TABLES (tabela
  // grande, 1005 linhas, só usada por essa suíte) — seed local, não toca o helper compartilhado.
  const h = await sharedDb();
  await seedDatabase(h, { only: ["NPC_Info"] });
  server = await startServer();
  ctx = (server as unknown as { ctx: ServerContext }).ctx;
});
afterAll(async () => { await server.stop(); });

const freshLabyrinthRow = (userId: number, extra: Partial<LabyrinthRow> = {}): LabyrinthRow => ({
  UserID: userId, myProgress: 0, myRanking: 0, completeChallenge: true, isDoubleAward: false, currentFloor: 1, accumulateExp: 0,
  remainTime: 0, currentRemainTime: 0, cleanOutAllTime: 0, cleanOutGold: 50, tryAgainComplete: true, isInGame: false, isCleanOut: false,
  serverMultiplyingPower: false, LastDate: new Date(), ProcessAward: "-1", ...extra,
});

describe("Labirinto: sala real (94 GAME_ROOM roomType 15 Labyrinth)", () => {
  it("criar + configurar sala resolve Pve_Info.ID=401 e o andar salvo (SetupChange.cs:26-29), e GAME_START cria um PveGame de verdade", async () => {
    const { c, ch } = await loggedIn(server, { grade: 10 });
    const h = await sharedDb();
    await h.db.insert(player.Sys_Users_Labyrinth).values(freshLabyrinthRow(ch.userId, { currentFloor: 5, myProgress: 4 }) as never).onConflictDoNothing();

    roomCmd(c, 0, (p) => { p.writeByte(RoomType.Labyrinth); p.writeByte(3); p.writeUTF(""); p.writeUTF("x"); });
    await c.code(94, 0);

    // enterUserGuide(0, LANBYRINTH_ROOM): mapId=0 roomType=15 -> server resolves mapId=401 + currentFloor
    roomCmd(c, 2, (p) => { p.writeInt(0); p.writeByte(RoomType.Labyrinth); p.writeBoolean(false); p.writeUTF(""); p.writeUTF(""); p.writeByte(0); p.writeByte(0); p.writeInt(0); p.writeBoolean(false); });
    const setup = await c.code(94, 2);
    setup.pkt.readByte(); // sub 2
    expect(setup.pkt.readBoolean()).toBe(false); // isOpenBoss
    expect(setup.pkt.readInt()).toBe(LABYRINTH_PVE_ID); // Pve_Info.ID resolved, not the packet's mapId=0
    expect(setup.pkt.readByte()).toBe(RoomType.Labyrinth);

    const gp = ctx.world.get(ch.userId)!;
    expect(gp.currentRoom?.currentFloor).toBe(5); // the player's saved floor, not a hardcoded 1

    roomCmd(c, 7); // GAME_START
    const created = await c.code(91, 101); // 91 GAME_CMD sub 101 GAME_CREATE — a PveGame is actually running
    expect(created).toBeTruthy();
    expect(gp.currentRoom?.game).not.toBeNull();

    const [row] = await h.db.select().from(player.Sys_Users_Labyrinth).where(eq(player.Sys_Users_Labyrinth.UserID, ch.userId));
    expect(row!.isInGame).toBe(true); // currentLabyrinthFloor marks the run as started
    c.close();
  });

  it("evento fechado no admin (ScheduledEvents.enabled=false): criar sala Labirinto é recusada (ALL_OPEN bypassa)", async () => {
    const { c } = await loggedIn(server, { grade: 10 });
    const rt = eventsRuntime(ctx);
    rt.scheduler.setEvents([{ id: 900, kind: "labyrinth", title: "", enabled: false, weekdays: "", startTime: "00:00", durationMin: 0, startDate: null, endDate: null, params: {} }]);
    const m = c.mark();
    roomCmd(c, 0, (p) => { p.writeByte(RoomType.Labyrinth); p.writeByte(3); p.writeUTF(""); p.writeUTF("x"); });
    const msg = await c.waitFor((r) => r.code === 3, 2000, m);
    msg.pkt.readInt(); // tipo
    expect(msg.pkt.readString()).toContain("Labirinto está fechado");
    expect(c.received.slice(m).some((r) => r.code === 94 && r.sub === 0)).toBe(false); // nenhuma sala criada
    rt.scheduler.setEvents([]);
    c.close();
  });
});

describe("Labirinto: subir andar lutando (updateLabyrinthFloor / outLabyrinth)", () => {
  async function setup(extra: Partial<LabyrinthRow> = {}) {
    const { c, ch } = await loggedIn(server, { grade: 10 });
    const h = await sharedDb();
    await h.db.insert(player.Sys_Users_Labyrinth).values(freshLabyrinthRow(ch.userId, extra) as never).onConflictDoNothing();
    const gp = ctx.world.get(ch.userId)!;
    return { c, ch, h, gp };
  }
  async function row(h: Awaited<ReturnType<typeof sharedDb>>, userId: number) {
    const [r] = await h.db.select().from(player.Sys_Users_Labyrinth).where(eq(player.Sys_Users_Labyrinth.UserID, userId));
    return r!;
  }

  it("currentLabyrinthFloor: devolve o andar salvo e marca isInGame=true", async () => {
    const { ch, h, gp } = await setup({ currentFloor: 5, isInGame: false });
    const floor = await currentLabyrinthFloor(ctx, gp);
    expect(floor).toBe(5);
    expect((await row(h, ch.userId)).isInGame).toBe(true);
  });

  it("vencer o andar 1 (ímpar): soma 660 exp (CreateExps[0]), sem moeda forte, avança currentFloor/myProgress pra 2", async () => {
    const { ch, h, gp } = await setup();
    const gpBefore = gp.info.GP;
    const hcBefore = gp.info.hardCurrency;
    await updateLabyrinthFloor(ctx, gp, 40001);
    const r = await row(h, ch.userId);
    expect(r.currentFloor).toBe(2);
    expect(r.myProgress).toBe(2);
    expect(r.accumulateExp).toBe(660);
    expect(gp.info.GP).toBe(gpBefore + 660);
    expect(gp.info.hardCurrency).toBe(hcBefore); // labyrinthGolds[0] = "0|0"
  });

  it("vencer o andar 2 (par, 'portão'): soma 1350 exp (660+690) e 2 de moeda forte (labyrinthGolds[1]=2|2)", async () => {
    const { ch, h, gp } = await setup({ currentFloor: 2, myProgress: 2 });
    const hcBefore = gp.info.hardCurrency;
    await updateLabyrinthFloor(ctx, gp, 40002);
    const r = await row(h, ch.userId);
    expect(r.currentFloor).toBe(3);
    expect(r.myProgress).toBe(3);
    expect(r.accumulateExp).toBe(1350);
    expect(gp.info.hardCurrency).toBe(hcBefore + 2);
  });

  it("isDoubleAward: dobra exp/moeda e consome 1 Đá mê cung (11916) por andar vencido (GamePlayer.cs:4396-4399)", async () => {
    const { ch, h, gp } = await setup({ currentFloor: 2, myProgress: 2, isDoubleAward: true });
    const stoneTpl = ctx.templates.findItem(11916)!;
    gp.propBag.addItem(ItemInfo.createFromTemplate(stoneTpl, 3, 101));
    const hcBefore = gp.info.hardCurrency;
    await updateLabyrinthFloor(ctx, gp, 40002);
    const r = await row(h, ch.userId);
    expect(r.accumulateExp).toBe(2700); // 1350 * 2
    expect(gp.info.hardCurrency).toBe(hcBefore + 4); // 2 * 2
    expect(r.isDoubleAward).toBe(true); // 2 scrolls left, still on
    expect(gp.propBag.getItemByTemplateID(0, 11916)!.Count).toBe(2);
  });

  it("isDoubleAward sem Pedra: desliga o dobro em vez de falhar o andar", async () => {
    const { ch, h, gp } = await setup({ isDoubleAward: true }); // no 11916 in the bag
    await updateLabyrinthFloor(ctx, gp, 40001);
    const r = await row(h, ch.userId);
    expect(r.isDoubleAward).toBe(false);
    expect(r.accumulateExp).toBe(660); // not doubled
  });

  it("andar fora do range (>30 ou id inválido) não faz nada (sem Mission_Info além do 30)", async () => {
    const { ch, h, gp } = await setup({ currentFloor: 30, myProgress: 30 });
    const before = await row(h, ch.userId);
    await updateLabyrinthFloor(ctx, gp, 40031);
    const after = await row(h, ch.userId);
    expect(after).toEqual(before);
  });

  it("outLabyrinth derrota (andar>1): manda '131 sub9' com o preço de tentar de novo e reseta isInGame/completeChallenge", async () => {
    const { c, ch, h, gp } = await setup({ currentFloor: 6, myProgress: 6, isInGame: true });
    const m = c.mark();
    await outLabyrinth(ctx, gp, false);
    const tryAgain = await c.code(131, 9, m);
    tryAgain.pkt.readByte(); // sub 9
    expect(tryAgain.pkt.readInt()).toBeGreaterThan(0); // labyrinthTryAgainMoney
    const r = await row(h, ch.userId);
    expect(r.isInGame).toBe(false);
    expect(r.completeChallenge).toBe(false);
    c.close();
  });

  it("outLabyrinth derrota no andar 1: não manda 'tentar de novo' (ainda não subiu nada)", async () => {
    const { c, ch, h, gp } = await setup({ currentFloor: 1, isInGame: true });
    const m = c.mark();
    await outLabyrinth(ctx, gp, false);
    expect(c.received.slice(m).some((r) => r.code === 131 && r.sub === 9)).toBe(false);
    expect((await row(h, ch.userId)).isInGame).toBe(false);
    c.close();
  });

  it("outLabyrinth vitória: não manda 'tentar de novo', ainda assim reseta isInGame", async () => {
    const { c, ch, h, gp } = await setup({ currentFloor: 30, myProgress: 30, isInGame: true });
    const m = c.mark();
    await outLabyrinth(ctx, gp, true);
    expect(c.received.slice(m).some((r) => r.code === 131 && r.sub === 9)).toBe(false);
    expect((await row(h, ch.userId)).isInGame).toBe(false);
    c.close();
  });
});
