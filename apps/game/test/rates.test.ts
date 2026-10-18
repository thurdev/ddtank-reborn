/**
 * admin-config: "Taxa de EXP"/"Taxa de ouro" (apps/admin/src/pages/ServerConfig.tsx `expRate`/`goldRate`,
 * `app."Settings"` key "server-config") used to be purely cosmetic — apps/game never read them. Now
 * `Templates.load()` caches them as `templates.rates` (db/templates.ts) and server.ts multiplies them into the
 * fight engine's `expRate`/`giveItems` gold hooks, alongside (not instead of) the scheduled "double_exp"/
 * "double_gold" event rate. This test covers the cache in isolation — the multiplication at the two call
 * sites is a one-line read of the same field, exercised indirectly by every fight test that already passes.
 */
import { afterEach, describe, expect, it } from "vitest";
import { app } from "@ddt/db";
import { Templates } from "../src/db/templates.js";
import { sharedDb } from "./helpers.js";

afterEach(async () => {
  const h = await sharedDb();
  await h.db.delete(app.Settings);
});

describe("Templates.rates (server-config expRate/goldRate)", () => {
  it("defaults to {exp:1, gold:1} with no server-config row", async () => {
    const h = await sharedDb();
    const t = await new Templates().load(h.db, 4, "pt-BR");
    expect(t.rates).toEqual({ exp: 1, gold: 1 });
  });

  it("reads expRate/goldRate from the saved server-config setting", async () => {
    const h = await sharedDb();
    await h.db.insert(app.Settings).values({ key: "server-config", value: { expRate: 2.5, goldRate: 3 } });
    const t = await new Templates().load(h.db, 4, "pt-BR");
    expect(t.rates).toEqual({ exp: 2.5, gold: 3 });
  });

  it("falls back to 1 for missing/zero/negative values (never a silent 0x or negative multiplier)", async () => {
    const h = await sharedDb();
    await h.db.insert(app.Settings).values({ key: "server-config", value: { expRate: 0, goldRate: -2 } });
    const t = await new Templates().load(h.db, 4, "pt-BR");
    expect(t.rates).toEqual({ exp: 1, gold: 1 });
  });
});
