/**
 * `m3-baglock-recovery` (docs/plan/TASKS.md): 403 BAGLOCK_PWD (`handlers/bolsa/recuperar-senha.ts`). Mesmo
 * método dos outros `client-6600-*`: monta o pacote EXATO campo a campo, roda pelo handler de verdade via
 * `FakeClient`, confere efeito + resposta, `offset === length`.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { GameServer } from "../src/server.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

describe("403 BAGLOCK_PWD — recuperação da senha da bolsa (Reborn-only, sem fonte C# — ver header do handler)", () => {
  function setQuestion(c: Awaited<ReturnType<typeof loggedIn>>["c"], q1: string, a1: string, q2: string, a2: string) {
    c.out(25, (x) => {
      x.writeString("minhaSenha1"); x.writeString(""); x.writeInt(1);
      x.writeString(q1); x.writeString(a1); x.writeString(q2); x.writeString(a2);
    });
    return c.code(25);
  }

  it("5 CHECK_PHONE_BINDING: sempre false (nunca existiu bind de telefone, nem no original)", async () => {
    const { c } = await loggedIn(server, { client: "41" });
    const m = c.mark();
    c.out(403, (x) => x.writeByte(5));
    const r = await c.code(403, undefined, m);
    expect(r.pkt.readByte()).toBe(5);
    expect(r.pkt.readBoolean()).toBe(false);
    expect(r.pkt.offset).toBe(r.pkt.length);
    c.close();
  });

  it("1 GET_BACK_BY_PHONE / 3 DELETE_QUESTION / 4 DELETE_PWD_BY_PHONE: sempre recusa (sem dado de telefone)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const { c } = await loggedIn(server, { client: "6600" });
      for (const cmd of [1, 3, 4]) {
        vi.setSystemTime(new Date(Date.now() + 3100)); // cada sub-ação compartilha o cooldown de 3s de recuperação
        const m = c.mark();
        c.out(403, (x) => { x.writeByte(cmd); x.writeInt(0); x.writeString(""); });
        const r = await c.code(403, undefined, m);
        expect(r.pkt.readByte()).toBe(cmd);
        expect(r.pkt.readInt()).toBe(0);
        expect(r.pkt.readBoolean()).toBe(false);
        expect(r.pkt.offset).toBe(r.pkt.length);
      }
      c.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it("2 GET_BACK_BY_QUESTION: recusa sem pergunta cadastrada (conta nova)", async () => {
    const { c } = await loggedIn(server, { client: "41" });
    const m = c.mark();
    c.out(403, (x) => { x.writeByte(2); x.writeInt(0); x.writeString(""); x.writeString(""); });
    const r = await c.code(403, undefined, m);
    expect(r.pkt.readByte()).toBe(2);
    expect(r.pkt.readInt()).toBe(0);
    expect(r.pkt.readBoolean()).toBe(false); // sem pergunta -> recusa, nenhum campo extra
    expect(r.pkt.offset).toBe(r.pkt.length);
    c.close();
  });

  it("2 GET_BACK_BY_QUESTION: fluxo completo — abre com count, erra (decrementa), acerta (limpa a senha)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const { c, player: p } = await loggedIn(server, { client: "6600" });
      await setQuestion(c, "Pet favorito?", "gato", "Cidade natal?", "SP");
      expect(p().info.HasBagPassword).toBe(true);

      // step 0: tem pergunta, 5 tentativas
      let m = c.mark();
      c.out(403, (x) => { x.writeByte(2); x.writeInt(0); x.writeString(""); x.writeString(""); });
      let r = await c.code(403, undefined, m);
      expect(r.pkt.readByte()).toBe(2); expect(r.pkt.readInt()).toBe(0);
      expect(r.pkt.readBoolean()).toBe(true);
      expect(r.pkt.readInt()).toBe(5);
      expect(r.pkt.offset).toBe(r.pkt.length);

      vi.setSystemTime(new Date(Date.now() + 3100)); // passa o cooldown de 3s

      // step 1: resposta errada -> decrementa pra 4, não limpa a senha
      m = c.mark();
      c.out(403, (x) => { x.writeByte(2); x.writeInt(1); x.writeString("cachorro"); x.writeString("SP"); });
      r = await c.code(403, undefined, m);
      expect(r.pkt.readByte()).toBe(2); expect(r.pkt.readInt()).toBe(1);
      expect(r.pkt.readBoolean()).toBe(false);
      expect(r.pkt.readInt()).toBe(4);
      expect(r.pkt.offset).toBe(r.pkt.length);
      expect(p().info.HasBagPassword).toBe(true);

      vi.setSystemTime(new Date(Date.now() + 3100));

      // step 1: as 2 respostas certas -> limpa a senha, destrava, sem mandar count
      m = c.mark();
      c.out(403, (x) => { x.writeByte(2); x.writeInt(1); x.writeString("gato"); x.writeString("SP"); });
      r = await c.code(403, undefined, m);
      expect(r.pkt.readByte()).toBe(2); expect(r.pkt.readInt()).toBe(1);
      expect(r.pkt.readBoolean()).toBe(true);
      expect(r.pkt.offset).toBe(r.pkt.length);
      expect(p().info.HasBagPassword).toBe(false);
      expect(p().info.IsLocked).toBe(false);
      c.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it("2 GET_BACK_BY_QUESTION: esgota as tentativas (chão em 0, nunca negativo) e recusa até resetar", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const { c } = await loggedIn(server, { client: "41" });
      await setQuestion(c, "Q1?", "aaa", "Q2?", "bbb");
      for (let i = 0; i < 6; i++) { // 5 tentativas no orçamento + 1 extra já esgotada
        vi.setSystemTime(new Date(Date.now() + 3100));
        const m = c.mark();
        c.out(403, (x) => { x.writeByte(2); x.writeInt(1); x.writeString("errado"); x.writeString("errado"); });
        const r = await c.code(403, undefined, m);
        r.pkt.readByte(); r.pkt.readInt();
        expect(r.pkt.readBoolean()).toBe(false);
        expect(r.pkt.readInt()).toBe(Math.max(4 - i, 0)); // nunca passa de 0
      }
      c.close();
    } finally {
      vi.useRealTimers();
    }
  });
});
