/**
 * M3 `m3-oldplayer-regress` (docs/plan/TASKS.md): 149 OLDPLAYER_REGRESS + the real `IsOldPlayer`/`LastDate`
 * eligibility that feeds the `isOld` field in 1 LOGIN / 18 SCENE_ADD_USER / 94/4 / 160/160 (see
 * `handlers/eventos/jogador-antigo.ts`, `packets/out.ts`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { FakeClient, loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.stop();
});

/** Espera o `quitPlayer` (save + remoção de `ctx.world`) terminar depois de `c.close()`, pra uma escrita
 *  manual no banco não ser sobrescrita por um save do logout em andamento (corrida). */
async function waitOffline(userId: number): Promise<void> {
  const deadline = Date.now() + 4000;
  while (server.ctx.world.get(userId)) {
    if (Date.now() > deadline) throw new Error("player never went offline");
    await new Promise((r) => setTimeout(r, 20));
  }
}

describe("149 OLDPLAYER_REGRESS / isOld eligibility (6600)", () => {
  it("personagem recém-criado (LastDate ~ agora) NÃO é jogador antigo", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    expect(p().info.IsOldPlayer).toBe(false);
    c.close();
  });

  it("LastDate muito antigo no próximo login vira IsOldPlayer=true e regrava LastDate pra agora", async () => {
    const db = (await sharedDb()).db;
    const { c, ch, player: p } = await loggedIn(server, { client: "6600" });
    expect(p().info.IsOldPlayer).toBe(false);
    c.close();
    await waitOffline(ch.userId); // senão o save do logout sobrescreve o LastDate abaixo (corrida)

    // Simula inatividade real: LastDate 30 dias atrás (> default de 15 dias) — fato do banco, nunca
    // declarado pelo cliente.
    const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.update(player.Sys_Users_Detail).set({ LastDate: past }).where(eq(player.Sys_Users_Detail.UserID, ch.userId));

    const c2 = FakeClient.memory(server);
    c2.login(ch.user, ch.pass);
    await c2.code(95);
    const p2 = () => server.ctx.world.get(ch.userId)!;
    expect(p2().info.IsOldPlayer).toBe(true);
    // LastDate foi regravado pra agora (não fica congelado) — próximo login mede a partir desta sessão.
    expect(Date.now() - p2().info.LastDate.getTime()).toBeLessThan(5000);
    c2.close();
  });

  it("LastDate recente (dentro do limiar) não vira jogador antigo", async () => {
    const db = (await sharedDb()).db;
    const { c, ch } = await loggedIn(server, { client: "6600" });
    c.close();
    await waitOffline(ch.userId);
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 dias, abaixo do default de 15
    await db.update(player.Sys_Users_Detail).set({ LastDate: recent }).where(eq(player.Sys_Users_Detail.UserID, ch.userId));

    const c2 = FakeClient.memory(server);
    c2.login(ch.user, ch.pass);
    await c2.code(95);
    expect(server.ctx.world.get(ch.userId)!.info.IsOldPlayer).toBe(false);
    c2.close();
  });

  it("sub 6 APPLY_ENABLE: desabilitado pra quem não é jogador antigo", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    expect(p().info.IsOldPlayer).toBe(false);
    const m = c.mark();
    c.out(149, (o) => { o.writeByte(6); });
    const r = await c.code(149, 6, m);
    r.pkt.readByte(); // sub echo
    expect(r.pkt.readInt()).toBe(1); // 1 = desabilitado
    c.close();
  });

  it("sub 6 APPLY_ENABLE: habilitado pra jogador antigo que ainda não aplicou; sub 3 APPLYPACKS aplica e desabilita", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    p().info.IsOldPlayer = true; // elegibilidade já estabelecida (não o escopo deste teste)

    let m = c.mark();
    c.out(149, (o) => { o.writeByte(6); });
    let r = await c.code(149, 6, m);
    r.pkt.readByte();
    expect(r.pkt.readInt()).toBe(0); // 0 = habilitado

    m = c.mark();
    c.out(149, (o) => { o.writeByte(3); });
    r = await c.code(149, 3, m);
    r.pkt.readByte();
    expect(r.pkt.readInt()).toBe(1); // aplicado agora -> desabilita

    // depois de aplicar, APPLY_ENABLE reporta desabilitado (claim-once, sem segunda chance).
    m = c.mark();
    c.out(149, (o) => { o.writeByte(6); });
    r = await c.code(149, 6, m);
    r.pkt.readByte();
    expect(r.pkt.readInt()).toBe(1);
    c.close();
  });

  it("sub 0 PACKS / 1 GETPACKS: envelope correto, sem nenhum item configurado (sem fonte de dados real)", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    p().info.IsOldPlayer = true;

    for (const [sub, build] of [[0, (o: import("@ddt/protocol").PacketOut) => o.writeByte(0)], [1, (o: import("@ddt/protocol").PacketOut) => { o.writeByte(1); o.writeInt(0); }]] as const) {
      const m = c.mark();
      c.out(149, build);
      const r = await c.code(149, 0, m); // os dois sub-ações respondem no MESMO sub-byte 0 (PacksView.as)
      r.pkt.readByte(); // sub echo
      expect(r.pkt.readInt()).toBe(1); // dayNum
      expect(r.pkt.readInt()).toBe(6); // length (placeholder, cliente sobrescreve)
      for (let i = 0; i < 15; i++) {
        expect(r.pkt.readByte()).toBe(1); // isRecv = já recebido (nada a reivindicar)
        expect(r.pkt.readInt()).toBe(0); // 0 itens
      }
      void sub;
    }
    c.close();
  });

  it("sub 5 REVCPACKS: mostra o botão enquanto houver apply/call pendente, some depois de usados", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    p().info.IsOldPlayer = true;

    let m = c.mark();
    c.out(149, (o) => { o.writeByte(5); });
    let r = await c.code(149, 5, m);
    r.pkt.readByte(); // sub echo
    expect(r.pkt.readInt()).toBe(0); // isCallEnable (habilitado)
    expect(r.pkt.readInt()).toBe(0); // isApplyEnable (habilitado)
    r.pkt.readInt(); // dayNum
    expect(r.pkt.readInt()).toBe(1); // length
    expect(r.pkt.readByte()).toBe(0); // pending=true -> isOver=false (mostra botão)

    // consome os dois (apply + a 1 chamada via sub 4, com um amigo elegível)
    const other = await loggedIn(server, { client: "6600" });
    other.player().info.IsOldPlayer = true;
    p().friends.set(other.ch.userId, 1);

    m = c.mark();
    c.out(149, (o) => { o.writeByte(3); });
    await c.code(149, 3, m);

    m = c.mark();
    c.out(149, (o) => { o.writeByte(4); o.writeInt(other.ch.userId); });
    r = await c.code(149, 4, m);
    r.pkt.readByte(); // sub echo
    expect(r.pkt.readInt()).toBe(0); // sucesso (callID != 1 no AS3 -> dispara o callback)

    m = c.mark();
    c.out(149, (o) => { o.writeByte(5); });
    r = await c.code(149, 5, m);
    r.pkt.readByte(); // sub echo
    expect(r.pkt.readInt()).toBe(1); // isCallEnable (esgotado)
    expect(r.pkt.readInt()).toBe(1); // isApplyEnable (esgotado)
    r.pkt.readInt();
    expect(r.pkt.readInt()).toBe(1); // length
    expect(r.pkt.readByte()).toBe(1); // nada pendente -> isOver=true (esconde o botão)
    c.close();
    other.c.close();
  });

  it("sub 2 CHECK reflete a MESMA cota global de sub 4 CALL (1 chamada por conta, pra sempre)", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    p().info.IsOldPlayer = true;
    const other = await loggedIn(server, { client: "6600" });
    other.player().info.IsOldPlayer = true;
    p().friends.set(other.ch.userId, 1);

    let m = c.mark();
    c.out(149, (o) => { o.writeByte(2); o.writeString("qualquerNome"); });
    let r = await c.code(149, 2, m);
    r.pkt.readByte(); // sub echo
    expect(r.pkt.readInt()).toBe(0); // cota disponível

    m = c.mark();
    c.out(149, (o) => { o.writeByte(4); o.writeInt(other.ch.userId); });
    await c.code(149, 4, m);

    m = c.mark();
    c.out(149, (o) => { o.writeByte(2); o.writeString("qualquerNome"); });
    r = await c.code(149, 2, m);
    r.pkt.readByte(); // sub echo
    expect(r.pkt.readInt()).toBe(1); // cota esgotada depois da chamada
    c.close();
    other.c.close();
  });

  it("sub 4 CALL recusa quem não é amigo e quem não é jogador antigo (não gasta a cota)", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    p().info.IsOldPlayer = true;
    const notFriend = await loggedIn(server, { client: "6600" });
    notFriend.player().info.IsOldPlayer = true;
    const friendNotOld = await loggedIn(server, { client: "6600" });
    p().friends.set(friendNotOld.ch.userId, 1); // amigo, mas NÃO é jogador antigo

    let m = c.mark();
    c.out(149, (o) => { o.writeByte(4); o.writeInt(notFriend.ch.userId); });
    let r = await c.code(149, 4, m);
    r.pkt.readByte(); // sub echo
    expect(r.pkt.readInt()).toBe(1); // recusado: não é amigo

    m = c.mark();
    c.out(149, (o) => { o.writeByte(4); o.writeInt(friendNotOld.ch.userId); });
    r = await c.code(149, 4, m);
    r.pkt.readByte(); // sub echo
    expect(r.pkt.readInt()).toBe(1); // recusado: amigo não é jogador antigo

    // a cota NÃO foi gasta pelas tentativas recusadas — sub 6 continua habilitado.
    m = c.mark();
    c.out(149, (o) => { o.writeByte(6); });
    r = await c.code(149, 6, m);
    r.pkt.readByte(); // sub echo
    expect(r.pkt.readInt()).toBe(0);
    c.close();
    notFriend.c.close();
    friendNotOld.c.close();
  });

  it("sub 7-10 (ticket/loja de pontos, sem fonte de dados): no-op, sem resposta nem crash", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(149, (o) => { o.writeByte(7); });
    c.out(149, (o) => { o.writeByte(8); });
    c.out(149, (o) => { o.writeByte(9); });
    c.out(149, (o) => { o.writeByte(10); o.writeInt(1); o.writeInt(1); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 149)).toBe(false);
    c.close();
  });
});

describe("159/405/373 GM Activity e 144 Compra em Grupo (6600, stubs/no-op)", () => {
  it("159 WONDERFUL_ACTIVITY ecoa o type com count=0 (sem campanha real)", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(159, (o) => { o.writeInt(0); o.writeInt(-1); });
    const r = await c.code(159, undefined, m);
    expect(r.pkt.readByte()).toBe(0); // type ecoado
    expect(r.pkt.readInt()).toBe(0); // count
    c.close();
  });

  it("405 WONDERFUL_ACTIVITY_INIT devolve o mesmo envelope fixo do C# original (byte a byte)", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(405, (o) => { o.writeInt(1); });
    const r = await c.code(405, undefined, m);
    expect(r.pkt.readInt()).toBe(1); // updateInfoType ecoado
    expect(r.pkt.readInt()).toBe(1); // actCount
    expect(r.pkt.readString()).toBe("4ac24166-267e-99fa-b875-824323d1ad83");
    c.close();
  });

  it("373 WONDERFUL_GETREWARD: sem handler no C# original, no-op sem resposta", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(373, (o) => { o.writeInt(0); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 373)).toBe(false);
    c.close();
  });

  it("144 GROUP_PURCHASE: sem handler nem sender no C# original, no-op sem resposta", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(144, (o) => { o.writeByte(2); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 144)).toBe(false);
    c.close();
  });
});
