/**
 * M3 `m3-accumulative-login` (docs/plan/TASKS.md): 238 ACCUMULATIVELOGIN_AWARD no cliente 6600 (era 338 na
 * 4.1 — `ePackageType.as` 6600:592 vs 4.1 `Game.Server/Packets/ePackageType.cs:248`). A lógica
 * (`handlers/eventos/presenca.ts accumulativeLogin`) já existia e já estava correta — o bug era o pacote de
 * resposta e o registro ficarem hardcoded em 338, que um cliente 6600 nunca envia (ele manda 238). 238 no 4.1
 * é `MARRYINFO_DELETE` (nunca implementado nos dois lados) — sem risco de corromper outra feature.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

describe("238 (6600) / 338 (4.1) ACCUMULATIVELOGIN_AWARD", () => {
  it("6600 manda 238 e recebe a resposta no MESMO código 238 (não 338)", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    p().info.accumulativeLoginDays = 2;
    p().info.accumulativeAwardDays = 0;

    const m = c.mark();
    c.out(238, (o) => o.writeInt(0)); // ID do template selecionado (só importa no dia 7)
    const r = await c.code(238, undefined, m);
    expect(r.pkt.readInt()).toBe(2); // accumulativeLoginDays
    // accumulativeAwardDays: avança até onde há recompensa configurada (pode ficar em 0 se loginAward não tem linhas no teste)
    r.pkt.readInt();
    expect(c.received.slice(m).some((r2) => r2.code === 338)).toBe(false); // nunca no código errado
    c.close();
  });

  it("4.1 continua respondendo em 338, não 238", async () => {
    const { c, player: p } = await loggedIn(server, { client: "41" });
    p().info.accumulativeLoginDays = 1;
    p().info.accumulativeAwardDays = 0;

    const m = c.mark();
    c.out(338, (o) => o.writeInt(0));
    const r = await c.code(338, undefined, m);
    expect(r.pkt.readInt()).toBe(1);
    expect(c.received.slice(m).some((r2) => r2.code === 238)).toBe(false);
    c.close();
  });

  it("4.1 mandando 238 (MARRYINFO_DELETE, não implementado) não aciona o login acumulado", async () => {
    const { c, player: p } = await loggedIn(server, { client: "41" });
    p().info.accumulativeLoginDays = 3;
    p().info.accumulativeAwardDays = 0;

    const m = c.mark();
    c.out(238, (o) => o.writeInt(0));
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 238)).toBe(false);
    expect(p().info.accumulativeAwardDays).toBe(0);
    c.close();
  });
});
