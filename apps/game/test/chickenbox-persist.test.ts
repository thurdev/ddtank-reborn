/**
 * 41-chickenbox-persistencia: o board do Baú da Galinha (18 cartas) e os contadores
 * (canOpenCounts/canEagleEyeCounts/isShowAll/lastFlushTime) agora persistem em `player."New_ChickenBox_Data"`
 * + `player."Sys_Active_System_Data"` — antes só numa WeakMap em memória, perdidos a cada reconexão/restart
 * do processo (desvio documentado em docs/MIGRATION-GAP.md/HANDLERS.md antes desta tarefa). As moedas
 * acumuladas da Estrela da Sorte (`LuckystarCoins`, mesma linha `Sys_Active_System_Data`) também persistem
 * agora; o board da Estrela da Sorte em si continua só em memória, igual ao original
 * (`PlayerActives.SetupLuckyStart`/`m_LuckyStartRewards`, recriado a cada `ENTER_GAME`).
 * C#: `ChickenBoxHandler.cs`, `PlayerActives.cs:357-368` (`EnterChickenBox`/`LoadChickenBox`), `:489-501`
 * (`PayFlushView`), `:917-943` (`GetAward`/coins), `NewChickenBoxItemInfo.cs`,
 * `Bussiness/PlayerBussiness.cs:7905-8045` (`GetSingleNewChickenBox`/`AddNewChickenBox`/`UpdateNewChickenBox`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import type { ServerContext } from "../src/session/context.js";
import { loadCoins, saveCoins } from "../src/handlers/eventos/estrela-da-sorte.js";
import { FakeClient, loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
let ctx: ServerContext;
beforeAll(async () => { server = await startServer(); ctx = (server as unknown as { ctx: ServerContext }).ctx; });
afterAll(async () => { await server.stop(); });

describe("87 NEWCHICKENBOX_SYS (Baú do Rei Galo) persistence", () => {
  it("ENTERCHICKENVIEW grava o board (dedupado por templateId, até 18 cartas) + contadores default no banco", async () => {
    const { c, ch } = await loggedIn(server);
    const db = (await sharedDb()).db;
    const m = c.mark();
    c.out(87, (p) => p.writeInt(10)); // ENTERCHICKENVIEW
    await c.code(87, undefined, m);

    const rows = await db.select().from(player.New_ChickenBox_Data).where(eq(player.New_ChickenBox_Data.UserID, ch.userId));
    // drawDistinct dedupa por templateId; o pool default embutido (DEFAULT_CHICKENBOX_POOL) tem menos de 18
    // templateIds únicos, então o board real fica menor que 18 até um admin configurar um pool maior
    // (app."ScheduledEvents" kind "chickenbox") — mesmo comportamento de antes desta tarefa, só agora com
    // as linhas gravadas de verdade em vez de uma WeakMap.
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(18);
    expect(new Set(rows.map((r) => r.Position)).size).toBe(rows.length); // posições distintas, sem duplicata

    const [misc] = await db.select().from(player.Sys_Active_System_Data).where(eq(player.Sys_Active_System_Data.UserID, ch.userId));
    expect(misc?.canOpenCounts).toBe(5);
    expect(misc?.canEagleEyeCounts).toBe(5); // CreateActiveSystemInfo = 5, não o DEFAULT 3 da coluna (DDL original)
    expect(misc?.isShowAll).toBe(true);
    c.close();
  });

  it("TAKEOVERCARD/USEEAGLEEYE persistem a carta certa e decrementam os contadores no banco", async () => {
    const { c, ch } = await loggedIn(server);
    const db = (await sharedDb()).db;
    let m = c.mark();
    c.out(87, (p) => p.writeInt(10));
    await c.code(87, undefined, m);
    const rows = await db.select().from(player.New_ChickenBox_Data).where(eq(player.New_ChickenBox_Data.UserID, ch.userId));
    const openTarget = rows[0]!;

    m = c.mark();
    c.out(87, (p) => { p.writeInt(13); p.writeInt(openTarget.Position); }); // TAKEOVERCARD
    await c.code(87, undefined, m);
    const [afterOpen] = await db.select().from(player.New_ChickenBox_Data).where(eq(player.New_ChickenBox_Data.ID, openTarget.ID));
    expect(afterOpen?.IsSelected).toBe(true);
    expect(afterOpen?.IsBinds).toBe(true);
    const [miscAfterOpen] = await db.select().from(player.Sys_Active_System_Data).where(eq(player.Sys_Active_System_Data.UserID, ch.userId));
    expect(miscAfterOpen?.canOpenCounts).toBe(4);

    const eyeTarget = rows.find((r) => r.ID !== openTarget.ID)!;
    m = c.mark();
    c.out(87, (p) => { p.writeInt(11); p.writeInt(eyeTarget.Position); }); // USEEAGLEEYE
    await c.code(87, undefined, m);
    const [afterEye] = await db.select().from(player.New_ChickenBox_Data).where(eq(player.New_ChickenBox_Data.ID, eyeTarget.ID));
    expect(afterEye?.IsSeeded).toBe(true);
    const [miscAfterEye] = await db.select().from(player.Sys_Active_System_Data).where(eq(player.Sys_Active_System_Data.UserID, ch.userId));
    expect(miscAfterEye?.canEagleEyeCounts).toBe(4);
    c.close();
  });

  it("sobrevive a uma reconexão: uma instância de GamePlayer nova recarrega do banco, não recria o board do zero", async () => {
    const { c, ch } = await loggedIn(server);
    const db = (await sharedDb()).db;
    let m = c.mark();
    c.out(87, (p) => p.writeInt(10));
    await c.code(87, undefined, m);
    const rowsBefore = await db.select().from(player.New_ChickenBox_Data).where(eq(player.New_ChickenBox_Data.UserID, ch.userId));
    const openTarget = rowsBefore[0]!;
    m = c.mark();
    c.out(87, (p) => { p.writeInt(13); p.writeInt(openTarget.Position); });
    await c.code(87, undefined, m);
    c.close();
    await c.waitClosed();

    const c2 = FakeClient.memory(server);
    c2.login(ch.user, ch.pass);
    await c2.code(95);
    m = c2.mark();
    c2.out(87, (p) => p.writeInt(10)); // ENTERCHICKENVIEW de novo, instância de GamePlayer nova (WeakMap vazio)
    await c2.code(87, undefined, m);

    const rowsAfter = await db.select().from(player.New_ChickenBox_Data).where(eq(player.New_ChickenBox_Data.UserID, ch.userId));
    expect(rowsAfter).toHaveLength(rowsBefore.length); // não recriou um board novo (LoadChickenBox: só PayFlushView se length === 0)
    const sameRow = rowsAfter.find((r) => r.ID === openTarget.ID);
    expect(sameRow?.IsSelected).toBe(true); // a carta aberta antes da reconexão continua aberta
    c2.close();
  });

  it("FLUSHCHICKENVIEW fora da janela grátis cobra e recria o board; dentro da janela, grátis", async () => {
    const { c, ch } = await loggedIn(server);
    const db = (await sharedDb()).db;
    let m = c.mark();
    c.out(87, (p) => p.writeInt(10));
    await c.code(87, undefined, m);
    const rowsBefore = await db.select().from(player.New_ChickenBox_Data).where(eq(player.New_ChickenBox_Data.UserID, ch.userId));
    const moneyBefore = ctx.world.get(ch.userId)!.info.Money;

    // `misc.lastFlushTime` já foi carregado em memória pelo ENTERCHICKENVIEW acima (igual ao original:
    // ActiveSystemInfo fica residente em GamePlayer.Actives pro resto da sessão) — pra testar "fora da
    // janela grátis" sem depender de um timer de verdade, avança o relógio do próprio ctx (mesmo padrão de
    // events.test.ts), não a linha no banco (que o código nem relê enquanto o cache em memória existe).
    const real = ctx.now;
    ctx.now = () => new Date(real().getTime() + 200 * 60_000);
    try {
      m = c.mark();
      c.out(87, (p) => p.writeInt(14)); // FLUSHCHICKENVIEW (fora da janela grátis)
      await c.code(87, undefined, m);

      expect(ctx.world.get(ch.userId)!.info.Money).toBe(moneyBefore - 500); // flushPrice default, cobrado
      const rowsAfter = await db.select().from(player.New_ChickenBox_Data).where(eq(player.New_ChickenBox_Data.UserID, ch.userId));
      expect(rowsAfter.length).toBeGreaterThan(0);
      expect(rowsAfter.every((r) => !rowsBefore.some((b) => b.ID === r.ID))).toBe(true); // linhas antigas apagadas, novas criadas
      const [misc] = await db.select().from(player.Sys_Active_System_Data).where(eq(player.Sys_Active_System_Data.UserID, ch.userId));
      expect(misc?.canOpenCounts).toBe(5);
      expect(misc?.canEagleEyeCounts).toBe(5);

      // Logo em seguida (dentro da janela de 120 min do flush que acabou de rodar): grátis, sem cobrar de novo.
      const moneyAfterFirstFlush = ctx.world.get(ch.userId)!.info.Money;
      m = c.mark();
      c.out(87, (p) => p.writeInt(14));
      await c.code(87, undefined, m);
      expect(ctx.world.get(ch.userId)!.info.Money).toBe(moneyAfterFirstFlush); // nada cobrado
    } finally {
      ctx.now = real;
    }
    c.close();
  });
});

describe("Estrela da Sorte: LuckystarCoins persiste entre reconexões (board em si continua só em memória)", () => {
  it("saveCoins/loadCoins fazem round-trip pela mesma linha Sys_Active_System_Data (UserID), sem tocar nas colunas do Baú", async () => {
    const { ch, player: p } = await loggedIn(server);
    const db = (await sharedDb()).db;
    const first = await loadCoins(ctx, p());
    expect(first.coins).toBe(500); // CreateActiveSystemInfo default (linha ainda não existe pra este usuário)
    expect(first.rowId).toBeNull();

    const saved = await saveCoins(ctx, p(), { coins: first.coins + 15, rowId: first.rowId });
    expect(saved.rowId).not.toBeNull();

    const reloaded = await loadCoins(ctx, p());
    expect(reloaded.coins).toBe(515);
    expect(reloaded.rowId).toBe(saved.rowId);

    // A mesma linha recém-criada já tem os defaults completos (CreateActiveSystemInfo), não só LuckystarCoins.
    const [row] = await db.select().from(player.Sys_Active_System_Data).where(eq(player.Sys_Active_System_Data.ID, saved.rowId!));
    expect(row?.canOpenCounts).toBe(5);
    expect(row?.canEagleEyeCounts).toBe(5);
  });
});
