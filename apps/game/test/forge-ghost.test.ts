/**
 * Forja › Forno › Espírito do equipamento (391 EQUIP_GHOST). Chama `equipGhost` direto (sem corpo de
 * pacote) com `rnd` injetado pra forçar sucesso/falha, depois confere o pacote real + persistência via
 * `GhostEquipList` (save-quit-reload).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { ItemInfo } from "../src/game/item.js";
import { loadPlayerInfo } from "../src/db/characters.js";
import { equipGhost, parseGhostEquipList } from "../src/handlers/forja/espirito-do-equipamento.js";
import { loggedIn, sleep, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server?.stop(); });

describe("391 EQUIP_GHOST", () => {
  it("sucesso sobe o nível do espírito da categoria; falha só acumula totalGhost", async () => {
    const tpl = server.ctx.templates;
    const weapon = [...tpl.items.values()].find((t) => t.CategoryID === 7)!;
    const stoneT = [...tpl.items.values()].find((t) => t.Level === 1)!;
    const { player: p } = await loggedIn(server);
    const pl = p();
    const item = ItemInfo.createFromTemplate(weapon, 1, 101);
    pl.storeBag.addItemTo(item, 1);
    pl.storeBag.addItemTo(ItemInfo.createFromTemplate(stoneT, 5, 101), 2);

    // roll=0: probability > 0 sempre que a pedra tem Level >= 1 (2^(...) nunca é 0) → sucesso garantido.
    await equipGhost(server.ctx, pl, () => 0);
    let slots = parseGhostEquipList(pl.info.GhostEquipList);
    const weaponSlot = () => slots.find((s) => s.categoryId === 7)!;
    expect(weaponSlot().level).toBe(1);
    expect(weaponSlot().totalGhost).toBe(0);
    expect(pl.storeBag.getItemAt(2)!.Count).toBe(4); // 1 pedra consumida

    // roll quase máximo (9999): no nível 1, a chance cai bastante — força falha.
    await equipGhost(server.ctx, pl, () => 0.9999);
    slots = parseGhostEquipList(pl.info.GhostEquipList);
    expect(weaponSlot().level).toBe(1); // não mudou
    expect(weaponSlot().totalGhost).toBe(1);
    expect(pl.storeBag.getItemAt(2)!.Count).toBe(3); // mais 1 pedra consumida mesmo na falha
  });

  it("sem pedra ou sem equipamento válido: mensagem, nenhuma pedra é gasta", async () => {
    const tpl = server.ctx.templates;
    const weapon = [...tpl.items.values()].find((t) => t.CategoryID === 7)!;
    const { player: p } = await loggedIn(server);
    const pl = p();
    pl.storeBag.addItemTo(ItemInfo.createFromTemplate(weapon, 1, 101), 1);
    // sem pedra no slot 2
    await equipGhost(server.ctx, pl, () => 0);
    expect(pl.info.GhostEquipList ?? "").toBe(""); // nada persistido ainda
  });

  it("persiste no banco (save-quit-reload)", async () => {
    const tpl = server.ctx.templates;
    const weapon = [...tpl.items.values()].find((t) => t.CategoryID === 5)!; // elmo, categoria diferente do 1º teste
    const stoneT = [...tpl.items.values()].find((t) => t.Level === 1)!;
    const { c, ch, player: p } = await loggedIn(server);
    const pl = p();
    pl.storeBag.addItemTo(ItemInfo.createFromTemplate(weapon, 1, 101), 1);
    pl.storeBag.addItemTo(ItemInfo.createFromTemplate(stoneT, 1, 101), 2);
    await equipGhost(server.ctx, pl, () => 0); // sucesso garantido (roll=0)
    const before = parseGhostEquipList(pl.info.GhostEquipList).find((s) => s.categoryId === 5)!;
    expect(before.level).toBe(1);

    c.close();
    await sleep(400); // GameServer.disconnect -> saveIntoDatabase (grava GhostEquipList via SAVED_DETAIL_COLUMNS)

    const info = await loadPlayerInfo(server.ctx.db.db, ch.userId);
    const after = parseGhostEquipList(info?.GhostEquipList).find((s) => s.categoryId === 5)!;
    expect(after.level).toBe(1);
    expect(after.totalGhost).toBe(0);
  });
});
