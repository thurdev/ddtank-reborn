import { describe, expect, it } from "vitest";
import { ItemInfo, type ItemTemplate } from "../src/game/item.js";

const EQUIPMENT = { TemplateID: 7008, CategoryID: 7 } as ItemTemplate;
const localDate = (day: number, hour: number) => new Date(2026, 9, day, hour);

describe("ItemInfo.isValidLatentEnergy", () => {
  it("considera válido até o fim do dia informado", () => {
    const item = new ItemInfo(EQUIPMENT);
    item.latentEnergyEndTime = localDate(9, 23);

    expect(item.isValidLatentEnergy(localDate(9, 12))).toBe(true);
    expect(item.isValidLatentEnergy(localDate(10, 0))).toBe(false);
  });
});