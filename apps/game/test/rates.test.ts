/**
 * admin-config: "Taxa de EXP"/"Taxa de ouro"/"Taxa de drop"/"Taxa de mérito" (apps/admin/src/pages/
 * ServerConfig.tsx `expRate`/`goldRate`/`dropRate`/`offerRate`, `app."Settings"` key "server-config") used to
 * be purely cosmetic for the last two — apps/game only ever read `expRate`/`goldRate`. Now `Templates.load()`
 * caches all four as `templates.rates` (db/templates.ts) and:
 *  - `exp`/`gold` multiply into the fight engine's `expRate`/`giveItems` gold hooks (server.ts), alongside
 *    (not instead of) the scheduled "double_exp"/"double_gold" event rate — unchanged, covered already below.
 *  - `drop` (41-stubs-rates) multiplies into `fight/ddt.ts:startPve`'s `scalePveDrop` calls, alongside the
 *    per-instance `PveBalance.reward` multiplier — no original equivalent (Reborn-only knob).
 *  - `offer` (41-stubs-rates) is `eRateType.Offer_Rate` (`ConsortiaMgr.cs:81`), fed into
 *    `fightRewards`/`consortiaGameOver` (handlers/sociedade/guerra-gvg.ts) in place of the hardcoded `1`.
 * This test covers the cache + the pure `fightRewards`/`scalePveDrop` math in isolation — the multiplication
 * at the call sites themselves is a one-line read of the same field, exercised indirectly by every fight/
 * consortia test that already passes.
 */
import { afterEach, describe, expect, it } from "vitest";
import { app } from "@ddt/db";
import { Templates } from "../src/db/templates.js";
import { fightRewards } from "../src/game/consortia.js";
import { scalePveDrop } from "../src/fight/ddt.js";
import { sharedDb } from "./helpers.js";

afterEach(async () => {
  const h = await sharedDb();
  await h.db.delete(app.Settings);
});

describe("Templates.rates (server-config expRate/goldRate/dropRate/offerRate)", () => {
  it("defaults to {exp:1, gold:1, drop:1, offer:1} with no server-config row", async () => {
    const h = await sharedDb();
    const t = await new Templates().load(h.db, 4, "pt-BR");
    expect(t.rates).toEqual({ exp: 1, gold: 1, drop: 1, offer: 1 });
  });

  it("reads expRate/goldRate/dropRate/offerRate from the saved server-config setting", async () => {
    const h = await sharedDb();
    await h.db.insert(app.Settings).values({ key: "server-config", value: { expRate: 2.5, goldRate: 3, dropRate: 1.5, offerRate: 2 } });
    const t = await new Templates().load(h.db, 4, "pt-BR");
    expect(t.rates).toEqual({ exp: 2.5, gold: 3, drop: 1.5, offer: 2 });
  });

  it("falls back to 1 for missing/zero/negative values (never a silent 0x or negative multiplier)", async () => {
    const h = await sharedDb();
    await h.db.insert(app.Settings).values({ key: "server-config", value: { expRate: 0, goldRate: -2, dropRate: 0, offerRate: -1 } });
    const t = await new Templates().load(h.db, 4, "pt-BR");
    expect(t.rates).toEqual({ exp: 1, gold: 1, drop: 1, offer: 1 });
  });
});

describe("41-stubs-rates: dropRate (scalePveDrop) + offerRate (fightRewards)", () => {
  it("scalePveDrop composes with the per-instance PveBalance.reward multiplier (min 1 per item)", () => {
    const items = [{ templateId: 1, count: 4, isBind: false, validDate: 0 }, { templateId: 2, count: 1, isBind: false, validDate: 0 }];
    // bal.reward=1 (neutral instance) * dropRate=2 -> doubles every count.
    expect(scalePveDrop(items, 1 * 2)).toEqual([{ ...items[0], count: 8 }, { ...items[1], count: 2 }]);
    // bal.reward=0.5 (an instance that halves rewards) * dropRate=0.1 -> rounds down to 0, floored to 1.
    expect(scalePveDrop(items, 0.5 * 0.1)).toEqual([{ ...items[0], count: 1 }, { ...items[1], count: 1 }]);
    expect(scalePveDrop(null, 2)).toBeNull();
    expect(scalePveDrop(items, 1)).toBe(items); // mult===1: no-op, same reference
  });

  it("fightRewards truncates offerRate to int before multiplying the guild-war merit reward (ConsortiaMgr.cs:81)", () => {
    const base = { gameType: 1, roomType: 0, playerCount: 10, totalHurt: 0, richesRate: 1, winLevel: 3, loseLevel: 3 };
    const r1 = fightRewards({ ...base, offerRate: 1 })!;
    const r2 = fightRewards({ ...base, offerRate: 2 })!;
    const r1_9 = fightRewards({ ...base, offerRate: 1.9 })!; // trunc(1.9) = 1, same as offerRate: 1 — faithful to the (int) cast
    expect(r2.winOffer).toBe(r1.winOffer * 2);
    expect(r2.loseOfferAdd).toBe(r1.loseOfferAdd * 2);
    expect(r1_9).toEqual(r1);
    // offerRate <= 0 (admin never saves that, but Templates.rates.offer always falls back to >=1 anyway) still
    // falls back to rate 1 inside fightRewards itself (`Math.trunc(i.offerRate) || 1`).
    expect(fightRewards({ ...base, offerRate: 0 })).toEqual(r1);
  });
});
