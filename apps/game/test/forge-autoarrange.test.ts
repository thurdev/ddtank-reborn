import { describe, expect, it } from "vitest";
import { forgeAutoArrange, forgeTabFromBench } from "../src/handlers/forja/bancada.js";
import { PlayerInventory } from "../src/game/inventory.js";
import { ItemInfo, type ItemTemplate } from "../src/game/item.js";

// Pedra de fortalecer (CategoryID 11, Property1 2), sorte (11/3), arma (CategoryID 7).
const STONE = { TemplateID: 11020, MaxCount: 999, CategoryID: 11, Property1: 2 } as unknown as ItemTemplate;
const LUCK = { TemplateID: 11018, MaxCount: 999, CategoryID: 11, Property1: 3 } as unknown as ItemTemplate;
const WEAPON = { TemplateID: 7008, MaxCount: 1, CategoryID: 7, Property1: 0 } as unknown as ItemTemplate;
const bag = () => new PlayerInventory(12, 20, 0, true, false, { onSlotsChanged: () => {} });
const put = (store: PlayerInventory, slot: number, t: ItemTemplate, count: number) => {
  const it = new ItemInfo(t);
  it.Count = count;
  expect(store.addItemTo(it, slot)).toBe(true);
};
const counts = (store: PlayerInventory, slots: number[]) => slots.map((s) => store.getItemAt(s)?.Count ?? 0);

describe("forgeAutoArrange (Reborn: auto-split na Forja)", () => {
  it("fortalecer: arma no 5 + pilha de 10 pedras no slot 0 divide 4/3/3 nos slots 0-2", () => {
    const store = bag();
    put(store, 5, WEAPON, 1);
    put(store, 0, STONE, 10);
    expect(forgeTabFromBench(store)).toBe("strength");
    forgeAutoArrange(store);
    expect(counts(store, [0, 1, 2, 3, 4])).toEqual([4, 3, 3, 0, 0]);
  });

  it("fortalecer: nunca põe pedra nos slots 3 (símbolo) e 4 (sorte)", () => {
    const store = bag();
    put(store, 5, WEAPON, 1);
    put(store, 1, STONE, 5);
    forgeAutoArrange(store);
    expect(counts(store, [3, 4])).toEqual([0, 0]);
    expect(counts(store, [0, 1, 2]).reduce((a, b) => a + b)).toBe(5);
    expect(counts(store, [0, 1, 2]).every((n) => n >= 1)).toBe(true);
  });

  it("fortalecer detectado só pela pedra da sorte no slot 4", () => {
    const store = bag();
    put(store, 4, LUCK, 1);
    put(store, 2, STONE, 3);
    forgeAutoArrange(store);
    expect(counts(store, [0, 1, 2, 4])).toEqual([1, 1, 1, 1]);
  });

  it("ambíguo (só pedras no slot 1) = fusão: divide igual 1-4", () => {
    const store = bag();
    put(store, 1, STONE, 6);
    expect(forgeTabFromBench(store)).toBe("fusion");
    forgeAutoArrange(store);
    expect(counts(store, [1, 2, 3, 4])).toEqual([2, 2, 1, 1]);
  });

  it("começou como fusão e depois pôs a arma: pedras dos slots 3/4 voltam pra 0-2", () => {
    const store = bag();
    put(store, 1, STONE, 6);
    forgeAutoArrange(store); // 2/2/1/1 nos slots 1-4
    put(store, 5, WEAPON, 1);
    forgeAutoArrange(store);
    expect(counts(store, [3, 4])).toEqual([0, 0]);
    expect(counts(store, [0, 1, 2]).reduce((a, b) => a + b)).toBe(6);
    expect(counts(store, [0, 1, 2]).every((n) => n >= 1)).toBe(true);
  });
});
