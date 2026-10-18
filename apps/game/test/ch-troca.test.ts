/**
 * ch-troca: trocar de canal sem relogar (docs/plan/TASKS.md "2. Canais" / research/client/channel-switch.md).
 *
 * O cliente (4.1 e 6600, mesmo mecanismo — ver research/client/channel-switch.md §3) troca de canal fechando
 * o socket atual e abrindo um novo pro host:porta do canal escolhido, reenviando LOGIN com a MESMA conta +
 * tempPwd (GameKey) já usada no 1º login — nenhum `.ashx` novo, nenhum pacote de "troca" dedicado. Este
 * arquivo nomeia e testa esse cenário explicitamente (2 `GameServer` em processo, SERVER_ID 4/5, mesmo PGlite,
 * ligados por `createMemoryBus` — igual `ch-bus.test.ts`, que já cobria o mesmo caminho sob o nome "login
 * único entre canais" sem o enquadrar como troca de canal deliberada):
 *
 *  1. o MESMO tempPwd emitido no login do canal 4 é aceito de novo no canal 5 (sem novo Login.ashx/webKey);
 *  2. o canal 4 salva o estado (campo mutado em memória chega no Postgres) e libera o jogador (World.remove)
 *     antes/durante o handshake do canal 5 — sem online duplicado;
 *  3. ida e volta (4 -> 5 -> 4) repetida não entra em loop de kick (cada troca conclui e o jogador fica só no
 *     canal de destino);
 *  4. o `clientKind` (LoginSessions.Client, "41"/"6600") sobrevive à troca — o canal novo lê a MESMA linha de
 *     app."LoginSessions", não depende de qual canal serviu o login anterior.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { createMemoryHub, createMemoryBus, type MemoryHub } from "../src/bus/memory.js";
import { createCharacter, FakeClient, loggedIn, sharedDb, startServer } from "./helpers.js";

let hub: MemoryHub;
let ch4: GameServer; // canal "local" padrão (SERVER_ID 4)
let ch5: GameServer; // 2º canal/processo, mesmo Postgres, ligado a ch4 pelo bus de teste

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

describe("ch-troca: trocar de canal com o MESMO ticket (sem Login.ashx de novo)", () => {
  it("canal 4 -> canal 5: online só no destino, dado mutado em memória é salvo, clientKind sobrevive", async () => {
    const { ch, c: a } = await loggedIn(ch4, { client: "6600" });
    // simula progresso feito no canal 4 antes da troca (equivalente a gastar/ganhar ouro em jogo): muta o
    // GamePlayer em memória direto, sem pacote — o que importa pro teste é se persistIntoDatabase roda no quit.
    const before = ch4.ctx.world.get(ch.userId)!;
    before.info.Gold = 424242;

    // troca de canal: o cliente real fecha o socket do canal 4 e abre um novo pro canal 5 reenviando
    // "user,tempPwd" (seção 3 do research) -- aqui simulado como um 2º FakeClient logando no canal 5 com o
    // MESMO `ch.pass` (o GameKey emitido 1x por createCharacter, nunca reemitido).
    const b = FakeClient.memory(ch5);
    b.login(ch.user, ch.pass);
    await b.code(95); // fim do burst de login no canal novo

    // canal antigo recebe o kitoff (Game.Server.LoginNext) via ch-bus e fecha a conexão velha.
    await a.code(2);
    await a.waitClosed();

    expect(ch5.ctx.world.get(ch.userId)).toBeTruthy(); // online só no destino
    expect(ch4.ctx.world.get(ch.userId)).toBeFalsy(); // não ficou duplicado no canal de origem

    // dado mutado no canal 4 foi salvo no quit (doQuit -> p.saveIntoDatabase) antes da troca completar.
    const db = await sharedDb();
    const [row] = await db.db.select({ Gold: player.Sys_Users_Detail.Gold }).from(player.Sys_Users_Detail).where(eq(player.Sys_Users_Detail.UserID, ch.userId)).limit(1);
    expect(row?.Gold).toBe(424242);

    // clientKind (6600) sobrevive à troca: o canal 5 não tinha essa sessão antes, leu a mesma LoginSessions.Client.
    expect(ch5.ctx.world.get(ch.userId)!.clientKind).toBe("6600");

    b.close();
  });

  it("ida e volta repetida (4 -> 5 -> 4 -> 5) não entra em loop de kick", async () => {
    const ch = await createCharacter(await sharedDb());
    let cur: FakeClient = FakeClient.memory(ch4);
    cur.login(ch.user, ch.pass);
    await cur.code(95);

    const hops: GameServer[] = [ch5, ch4, ch5];
    for (const target of hops) {
      const prev = cur;
      const next = FakeClient.memory(target);
      next.login(ch.user, ch.pass);
      await next.code(95);
      await prev.code(2); // kitoff na sessão anterior
      await prev.waitClosed();
      cur = next;
    }

    // depois de 3 trocas (terminando no canal 5), só o canal 5 tem o jogador; canal 4 está limpo.
    expect(ch5.ctx.world.get(ch.userId)).toBeTruthy();
    expect(ch4.ctx.world.get(ch.userId)).toBeFalsy();
    cur.close();
  });
});
