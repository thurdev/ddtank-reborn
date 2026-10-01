// Port of Tank.Request/ServerList.ashx.cs: Center's server list -> player."Server_List". The client adds 69 to Port
// (ddt/data/analyze/ServerListAnalyzer.as:44), so we advertise GAME_PORT - 69; IP = GAME_HOST (Ruffle socketProxy host).
import { sql } from "drizzle-orm";
import { q } from "../../lib/db.js";
import { el, result, type XEl } from "../../lib/flash-xml.js";
import { define, xml } from "../types.js";

export default define(
  "/ServerList.ashx",
  async ({ app }) => {
    const items: XEl[] = [];
    let total = 0;
    let ok = false;
    try {
      const rows = await q(app.h, sql`SELECT * FROM player."Server_List" WHERE "State" <> -1 ORDER BY "ID"`);
      for (const s of rows) {
        total += Number(s.Online ?? 0);
        items.push(
          el("Item", [
            ["ID", s.ID as number],
            ["Name", (s.Name as string) ?? ""],
            ["IP", app.cfg.GAME_HOST],
            ["Port", app.cfg.GAME_PORT - 69],
            ["State", s.State as number],
            ["MustLevel", s.MustLevel as number],
            ["LowestLevel", s.LowestLevel as number],
            ["Online", s.Online as number],
            ["Remark", ""],
          ]),
        );
      }
      ok = true;
    } catch (e) {
      app.log.warn(`ServerList: ${(e as Error).message}`);
    }
    return xml(result(ok, ok ? "Success!" : "Fail!", items, [["total", total]]));
  },
  "Tank.Request/ServerList.ashx.cs",
);
