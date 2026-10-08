import { describe, expect, it } from "vitest";
import { autoSplitFusionSlots } from "../src/handlers/forge.js";
import { PlayerInventory } from "../src/game/inventory.js";
import { ItemInfo, type ItemTemplate } from "../src/game/item.js";

const tpl = (id: number) => ({ TemplateID: id, MaxCount: 999 } as ItemTemplate);
const bag = () => new PlayerInventory(12, 20, 0, true, false, { onSlotsChanged: () => {} });
const put = (store: PlayerInventory, slot: number, id: number, count: number) => {
  const it = new ItemInfo(tpl(id));
  it.Count = count;
  expect(store.addItemTo(it, slot)).toBe(true);
};
const counts = (store: PlayerInventory) => [1, 2, 3, 4].map((s) => store.getItemAt(s)?.Count ?? 0);

describe("autoSplitFusionSlots (Reborn: pilha inteira num slot só)", () => {
  it("pilha de 6 vira 3/1/1/1 nos slots 1-4", () => {
    const store = bag();
    put(store, 1, 5001, 6);
    autoSplitFusionSlots(store);
    expect(counts(store)).toEqual([3, 1, 1, 1]);
  });
  it("pilha de 2 preenche só slots 1-2", () => {
    const store = bag();
    put(store, 1, 5001, 2);
    autoSplitFusionSlots(store);
    expect(counts(store)).toEqual([1, 1, 0, 0]);
  });
  it("4 avulsos não mexe", () => {
    const store = bag();
    put(store, 1, 5001, 1);
    put(store, 2, 5001, 1);
    put(store, 3, 5001, 1);
    put(store, 4, 5001, 1);
    autoSplitFusionSlots(store);
    expect(counts(store)).toEqual([1, 1, 1, 1]);
  });
  it("tipos mistos: só espalha o primeiro tipo, fusão continua barrando", () => {
    const store = bag();
    put(store, 1, 5001, 5);
    put(store, 2, 6001, 5);
    autoSplitFusionSlots(store);
    expect(store.getItemAt(2)?.TemplateID).toBe(6001);
    expect(store.getItemAt(2)?.Count).toBe(5);
    expect(counts(store)).toEqual([3, 5, 1, 1]);
  });
  it("item único avulso não mexe", () => {
    const store = bag();
    put(store, 1, 5001, 1);
    autoSplitFusionSlots(store);
    expect(counts(store)).toEqual([1, 0, 0, 0]);
  });
});
