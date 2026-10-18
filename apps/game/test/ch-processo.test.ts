/**
 * ch-processo: 2 `GameServer` em processo, SERVER_ID diferentes (4 e 5), MESMO Postgres (PGlite compartilhado
 * via `sharedDb()`, igual a qualquer outro par de testes deste arquivo de helpers) — simula 2 canais/processos
 * `apps/game` reais na mesma instância de banco (produção: mesmo Neon/Postgres, processos diferentes).
 *
 * Cobre as duas coisas que esta tarefa corrigiu em `apps/game/src/db/characters.ts`:
 *  1. Login/contagem online isolados por canal (cada `GameServer` já tinha seu próprio `World` em memória —
 *     este teste é a rede de segurança contra regressão).
 *  2. O bug real: `resetAllOnline` (chamado no boot de TODO `GameServer.start()`, server.ts:233) fazia
 *     `UPDATE ... SET "State" = 0 WHERE "State" = 1` SEM filtro de canal — reiniciar o canal 5 zerava o
 *     "online" de jogadores DE VERDADE conectados no canal 4 no mesmo Postgres. Corrigido com a coluna nova
 *     `OnlineServerID` (migração `0015_blue_frog_thor.sql`, gravada por `setOnlineState` no login) + o filtro
 *     em `resetAllOnline`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { heartbeat } from "../src/db/templates.js";
import { resetAllOnline, setOnlineState } from "../src/db/characters.js";
import { loggedIn, sharedDb, startServer } from "./helpers.js";

let ch4: GameServer; // canal "local" padrão (SERVER_ID 4, igual ao resto da suíte)
let ch5: GameServer; // 2º canal/processo, mesmo Postgres

beforeAll(async () => {
  ch4 = await startServer({ SERVER_ID: "4" });
  ch5 = await startServer({ SERVER_ID: "5" });
  // ch5 não tem linha própria no seed (só o canal 4 "Reborn") — insere uma pra heartbeat/online ter onde
  // gravar, igual um canal novo criado no admin (ch-admin) antes do primeiro boot do processo que o serve.
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

describe("ch-processo: login + online count isolados por canal", () => {
  it("login no canal 4 não aparece no World do canal 5 (e vice-versa)", async () => {
    const { ch: a } = await loggedIn(ch4);
    expect(ch4.ctx.world.size).toBe(1);
    expect(ch5.ctx.world.size).toBe(0);
    expect(ch4.ctx.world.get(a.userId)).toBeTruthy();
    expect(ch5.ctx.world.get(a.userId)).toBeFalsy();

    const { ch: b } = await loggedIn(ch5);
    expect(ch5.ctx.world.size).toBe(1);
    // o login no canal 5 não soma no World do canal 4, que continua só com o jogador "a".
    expect(ch4.ctx.world.size).toBe(1);
    expect(ch5.ctx.world.get(b.userId)).toBeTruthy();
    expect(ch4.ctx.world.get(b.userId)).toBeFalsy();
  });

  it("heartbeat de um canal não sobrescreve o Online do outro (player.\"Server_List\")", async () => {
    const db = await sharedDb();
    await heartbeat(db.db, 4, 3);
    await heartbeat(db.db, 5, 7);
    const [row4] = await db.db.select().from(player.Server_List).where(eq(player.Server_List.ID, 4));
    const [row5] = await db.db.select().from(player.Server_List).where(eq(player.Server_List.ID, 5));
    expect(row4?.Online).toBe(3);
    expect(row5?.Online).toBe(7);
  });

  it("resetAllOnline (boot de UM canal) nunca zera o State de jogador online em OUTRO canal", async () => {
    const db = await sharedDb();
    const { ch } = await loggedIn(ch4); // login real: setOnlineState(db, userId, 1, 4) -> State=1, OnlineServerID=4
    const row = async () => (await db.db.select().from(player.Sys_Users_Detail).where(eq(player.Sys_Users_Detail.UserID, ch.userId)))[0]!;

    expect((await row()).State).toBe(1);
    expect((await row()).OnlineServerID).toBe(4);

    // Canal 5 reiniciando (GameServer.start() chama exatamente isto) não pode tocar o jogador do canal 4.
    await resetAllOnline(db.db, 5);
    expect((await row()).State).toBe(1);

    // O próprio canal 4 reiniciando SIM limpa seu próprio State=1 travado (recuperação de crash).
    await resetAllOnline(db.db, 4);
    expect((await row()).State).toBe(0);
  });

  it("setOnlineState sem serverId (ex.: logout, state=0) não altera OnlineServerID", async () => {
    const db = await sharedDb();
    const { ch } = await loggedIn(ch5);
    await setOnlineState(db.db, ch.userId, 0);
    const [r] = await db.db.select().from(player.Sys_Users_Detail).where(eq(player.Sys_Users_Detail.UserID, ch.userId));
    expect(r?.State).toBe(0);
    expect(r?.OnlineServerID).toBe(5); // gravado no login (loggedIn -> setOnlineState(..., 1, 5)); logout não limpa.
  });
});
