// Port of Tank.Request/ServerList.ashx.cs: Center's server list -> player."Server_List". The client adds 69 to Port
// (ddt/data/analyze/ServerListAnalyzer.as:44), so we advertise GAME_PORT - 69; IP = GAME_HOST (Ruffle socketProxy host).
// O cliente 6600 não soma 69 (vendor/DDT-6600/.../ServerListAnalyzer.as copia Port direto): pra ele vai GAME_PORT.
//
// ch-tabela (vários canais): cada linha de player."Server_List" é um canal (Canal 1, 2, 3…), editável pelo admin
// (resource "server-list"). IP/Port agora vêm da linha quando preenchidos (admin pode apontar um canal pra um host
// diferente); linha sem IP/Port (o canal "Reborn" seed, histórico) cai no fallback GAME_HOST/GAME_PORT de sempre —
// dev local sem configurar nada continua idêntico a antes desta tarefa. "Enabled = false" tira o canal da lista
// (`"State" <> -1` continua filtrando também, pela convenção antiga, por segurança/retrocompat).
// Online: só o canal local (ID = cfg.SERVER_ID, servido por ESTE apps/api/apps/game) pega a contagem em tempo real
// via GAME_INTERNAL_URL (/status do apps/game, mesma fonte de GET /api/public/status); os demais canais (rodando
// noutro processo, ch-processo ainda não implementado) mostram o "Online" gravado na própria linha.
import { sql } from "drizzle-orm";
import { q } from "../../lib/db.js";
import { el, result, type XEl } from "../../lib/flash-xml.js";
import { gameInternal } from "../../routes/public.js";
import { define, xml } from "../types.js";

export default define(
  "/ServerList.ashx",
  async ({ app, client }) => {
    const items: XEl[] = [];
    let total = 0;
    let ok = false;
    try {
      const rows = await q(
        app.h,
        sql`SELECT * FROM player."Server_List" WHERE "Enabled" = true AND "State" <> -1 ORDER BY "SortOrder", "ID"`,
      );
      // Canal local: consulta o status em tempo real do apps/game (fallback pro valor da linha se ele não responder).
      const local = await gameInternal<{ online?: number; players?: number }>(app, "/status");
      for (const s of rows) {
        const isLocal = Number(s.ID) === app.cfg.SERVER_ID;
        const online = isLocal && local ? Number(local.players ?? local.online ?? s.Online ?? 0) : Number(s.Online ?? 0);
        total += online;
        const rowIp = (s.IP as string | null) || "";
        const rowPort = Number(s.Port ?? 0);
        const port6600 = rowPort > 0 ? rowPort : app.cfg.GAME_PORT;
        const port41 = rowPort > 0 ? rowPort - 69 : app.cfg.GAME_PORT - 69;
        items.push(
          el("Item", [
            ["ID", s.ID as number],
            ["Name", (s.Name as string) ?? ""],
            ["IP", rowIp || app.cfg.GAME_HOST],
            ["Port", client === "6600" ? port6600 : port41],
            ["State", s.State as number],
            ["MustLevel", s.MustLevel as number],
            ["LowestLevel", s.LowestLevel as number],
            ["Online", online],
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
