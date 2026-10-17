import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { player as schema } from "@ddt/db";
import { eq } from "drizzle-orm";
import type { GameServer } from "../src/server.js";
import { ItemInfo } from "../src/game/item.js";
import * as itemDb from "../src/db/items.js";
import * as socialDb from "../src/db/social.js";
import * as petDb from "../src/db/pets-cards.js";
import { createPet, emptyPetTables, type PetTemplate } from "../src/game/pets.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => { server = await startServer(); });
afterEach(() => { vi.restoreAllMocks(); });
afterAll(async () => { await server?.stop(); });

describe("autosave/logout: concorrência e recuperação de erro", () => {
  it("três gravações simultâneas inserem o item novo uma única vez", async () => {
    const { player } = await loggedIn(server);
    const p = player();
    const item = ItemInfo.createFromTemplate(server.ctx.templates.findItem(11024)!, 5, 101);
    p.propBag.addItemTo(item, 0);
    await Promise.all([p.saveIntoDatabase(server.ctx.db.db), p.saveIntoDatabase(server.ctx.db.db), p.saveIntoDatabase(server.ctx.db.db)]);
    const rows = await itemDb.loadUserItems(server.ctx.db.db, p.id, server.ctx.templates.findItem);
    expect(rows.get(1)?.filter((r) => r.TemplateID === 11024).map((r) => r.Count)).toEqual([5]);
  });
  it("retenta remoção de item após falha no UPDATE, sem ressuscitar o item no login", async () => {
    const { player } = await loggedIn(server);
    const p = player();
    const item = ItemInfo.createFromTemplate(server.ctx.templates.findItem(11024)!, 1, 101);
    p.propBag.addItemTo(item, 0);
    await p.saveIntoDatabase(server.ctx.db.db);
    p.propBag.removeItem(item);
    const real = itemDb.saveItem;
    const spy = vi.spyOn(itemDb, "saveItem").mockImplementation((db, current) => current === item ? Promise.reject(new Error("item offline")) : real(db, current));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(p.saveIntoDatabase(server.ctx.db.db)).rejects.toThrow("item offline");
    expect(p.propBag.removed).toContain(item);
    spy.mockRestore();
    await p.saveIntoDatabase(server.ctx.db.db);
    expect(p.propBag.removed).not.toContain(item);
    const [row] = await server.ctx.db.db.select().from(schema.Sys_Users_Goods).where(eq(schema.Sys_Users_Goods.ItemID, item.ItemID));
    expect(row?.IsExist).toBe(false);
  });
  it("missões continuam pendentes até a gravação bem-sucedida", async () => {
    const { player } = await loggedIn(server);
    const p = player();
    p.questInv!.add(6);
    expect(p.questInv!.list.has(6)).toBe(true);
    const spy = vi.spyOn(socialDb, "saveQuests").mockRejectedValueOnce(new Error("quest offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(p.saveIntoDatabase(server.ctx.db.db)).rejects.toThrow("quest offline");
    spy.mockRestore();
    await p.saveIntoDatabase(server.ctx.db.db);
    const rows = await server.ctx.db.db.select().from(schema.QuestData).where(eq(schema.QuestData.UserID, p.id));
    expect(rows.some((row) => row.QuestID === 6 && row.IsExist)).toBe(true);
  });
  it("retenta a liberação de mascote após falha, sem perdê-la da fila", async () => {
    const { player } = await loggedIn(server);
    const p = player();
    const template = { TemplateID: 100101, Name: "Teste", KindID: 1, StarLevel: 1, RareLevel: 1, HighBlood: 15000, HighAttack: 340, HighDefence: 400, HighAgility: 300, HighLuck: 300, HighBloodGrow: 2200, HighAttackGrow: 340, HighDefenceGrow: 400, HighAgilityGrow: 300, HighLuckGrow: 300 } as PetTemplate;
    const pet = createPet(emptyPetTables(), template, p.id, 0, 25, 0, () => 0.5);
    p.petBag.addPetTo(pet, 0);
    await p.saveIntoDatabase(server.ctx.db.db);
    p.petBag.removePet(pet);
    const spy = vi.spyOn(petDb, "savePets").mockRejectedValueOnce(new Error("pet offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(p.saveIntoDatabase(server.ctx.db.db)).rejects.toThrow("pet offline");
    expect(p.petBag.removed).toContain(pet);
    spy.mockRestore();
    await p.saveIntoDatabase(server.ctx.db.db);
    expect(p.petBag.removed).not.toContain(pet);
    expect(await petDb.loadUserPets(server.ctx.db.db, p.id)).toEqual([]);
  });
});
