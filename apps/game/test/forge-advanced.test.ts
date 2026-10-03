/** Ferreiro extras (Varredura: Ferreiro to 100%): 217 OPEN_FIVE_SIX_HOLE (ItemInfo.isDrill) and 120 ITEM_TREND
 * (RefineryMgr.RefineryTrend, ported against the empty Item_Refinery table — see templates.ts `refineryTrend`). */
import { describe, expect, it } from "vitest";
import { ItemInfo, type ItemTemplate } from "../src/game/item.js";
import { Templates } from "../src/db/templates.js";

describe("ItemInfo.isDrill (ItemInfo.cs:1117)", () => {
  const tpl = (id: number) => ({ TemplateID: id } as ItemTemplate);
  it("each drill tier only matches its own hole level", () => {
    expect(new ItemInfo(tpl(11035)).isDrill(0)).toBe(true);
    expect(new ItemInfo(tpl(11035)).isDrill(1)).toBe(false);
    expect(new ItemInfo(tpl(11036)).isDrill(1)).toBe(true);
    expect(new ItemInfo(tpl(11026)).isDrill(2)).toBe(true);
    expect(new ItemInfo(tpl(11027)).isDrill(3)).toBe(true);
    expect(new ItemInfo(tpl(11034)).isDrill(4)).toBe(true);
    expect(new ItemInfo(tpl(99999)).isDrill(0)).toBe(false);
  });
});

describe("RefineryMgr.RefineryTrend (120 ITEM_TREND)", () => {
  it("is inert with an empty Item_Refinery table (0 rows in the source .bak, same as the original)", () => {
    const t = new Templates();
    expect(t.refineryTrend(1, 12345)).toBeNull();
  });
  it("walks the flattened (Material,Operate,Reward) list two slots past the first match", () => {
    const t = new Templates();
    t.refinery = [{ RefineryID: 1, Equip1: 0, Equip2: 0, Equip3: 0, Item1: 0, Item2: 0, Item3: 0, Item1Count: 0, Item2Count: 0, Item3Count: 0,
      Material1: 500, Operate1: 1, Reward1: 12345, Material2: 501, Operate2: 2, Reward2: 12346, Material3: null, Operate3: null, Reward3: null, Material4: null, Operate4: null, Reward4: null }];
    // list = [500,1,12345, 501,2,12346, ...]; the row's reward chain contains 12345, so it's searched.
    expect(t.refineryTrend(1, 12345)).toBe(501); // `1` first matches at index 1 (Operate1) -> list[1+2] = Material2
    expect(t.refineryTrend(501, 12345)).toBe(12346); // `501` matches at index 3 (Material2) -> list[3+2] = Reward2
    expect(t.refineryTrend(999, 12345)).toBeNull();
  });
});

describe("Templates.shopByTemplate (ShopMgr.FindShopbyTemplatID)", () => {
  it("lists every shop row selling a template", () => {
    const t = new Templates();
    t.shop.set(1, { ID: 1, ShopID: 1, TemplateID: 34101, BuyType: 0, IsBind: 0, Beat: 1, LimitCount: 0, AUnit: 7, APrice1: -1, AValue1: 500, APrice2: 0, AValue2: 0, APrice3: 0, AValue3: 0, BUnit: 0, BPrice1: 0, BValue1: 0, BPrice2: 0, BValue2: 0, BPrice3: 0, BValue3: 0, CUnit: 0, CPrice1: 0, CValue1: 0, CPrice2: 0, CValue2: 0, CPrice3: 0, CValue3: 0 });
    expect(t.shopByTemplate(34101)).toHaveLength(1);
    expect(t.shopByTemplate(99)).toHaveLength(0);
  });
});
