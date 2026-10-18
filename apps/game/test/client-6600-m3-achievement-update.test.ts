/**
 * M3 `m3-achievement-update` (docs/plan/TASKS.md): 229 ACHIEVEMENT_UPDATE no cliente 6600 é, na verdade, o
 * código que `sendModifyInfo` usa pra EDITAR o próprio pedido do mural do casamento (`CivilRegisterFrame.as:
 * 274`) — o 4.1 manda a mesma ação em 237 MARRYINFO_UPDATE (já portado em `casamento/mural.ts`). O 6600
 * reaproveita o valor 229 porque 237 virou PLAYER_DRESS (figurino) nessa versão. 229 "de verdade" (push de
 * progresso de conquista) é só servidor->cliente (`eventos/completar-conquista.ts pushRecords`) — nenhum
 * cliente manda 229 pedindo progresso, então não há ambiguidade real de lado client->server.
 */
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

describe("229 ACHIEVEMENT_UPDATE == edição do mural do casamento (6600)", () => {
  it("229 (6600) edita o próprio pedido do mural, igual 237 faria no 4.1", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 20_000 });
    // 236 MARRYINFO_ADD: publica o pedido primeiro (sem isso MarryInfoID fica 0 e 229 não faz nada).
    c.out(236);
    await c.code(235);
    expect(p().info.MarryInfoID).toBeGreaterThan(0);

    const m = c.mark();
    c.out(229, (o) => { o.writeBoolean(true); o.writeUTF("Minha nova introdução"); });
    const r = await c.code(235, undefined, m);
    r.pkt.readInt(); // infoId
    expect(r.pkt.readBoolean()).toBe(true); // exists
    r.pkt.readInt(); // ID
    expect(r.pkt.readBoolean()).toBe(true); // IsPublishEquip
    expect(r.pkt.readString()).toBe("Minha nova introdução");

    const [row] = await server.ctx.db.db.select().from(player.Marry_Info).where(eq(player.Marry_Info.ID, p().info.MarryInfoID));
    expect(row?.IsPublishEquip).toBe(true);
    expect(row?.Introduction).toBe("Minha nova introdução");
    c.close();
  });

  it("4.1: 229 não faz nada (a ação de editar o mural usa 237, não 229, nesse cliente)", async () => {
    const { c, player: p } = await loggedIn(server, { client: "41", money: 20_000 });
    c.out(236);
    await c.code(235);
    const before = p().info.MarryInfoID;

    const m = c.mark();
    c.out(229, (o) => { o.writeBoolean(true); o.writeUTF("não devia aplicar"); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 235)).toBe(false);
    const [row] = await server.ctx.db.db.select().from(player.Marry_Info).where(eq(player.Marry_Info.ID, before));
    expect(row?.Introduction).toBe("");
    c.close();
  });
});
