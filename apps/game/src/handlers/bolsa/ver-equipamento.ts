/**
 * Aba no jogo: Bolsa — ver o equipamento de qualquer jogador (online ou não, por ID ou por nick).
 * Pacote: 74 ITEM_EQUIP.
 * C#: `UserEquipListHandler.cs`.
 * Como testar: sem teste dedicado hoje. Manual: clicar no avatar de outro jogador → ver equipamento.
 */
import { loadEquippedItems } from "../../db/items.js";
import { loadPlayerInfo, loadPlayerInfoByNick } from "../../db/characters.js";
import * as Out from "../../packets/out.js";
import type { HandlerRegistry } from "../registry.js";

export function registerVerEquipamento(r: HandlerRegistry): void {
  /** UserEquipListHandler.cs: view another player's equipment (online or from DB). */
  r.player(74, "ITEM_EQUIP", async (ctx, p, pkt) => {
    const byId = pkt.readBoolean();
    let id = 0;
    let nick = "";
    if (byId) id = pkt.readInt();
    else nick = pkt.readString();
    const online = byId ? ctx.world.get(id) : ctx.world.getByNick(nick);
    let info = online?.info ?? null;
    let items = online ? online.equipBag.getItems(0, 30) : null;
    if (!online) {
      info = byId ? await loadPlayerInfo(ctx.db.db, id) : await loadPlayerInfoByNick(ctx.db.db, nick);
      if (info) items = await loadEquippedItems(ctx.db.db, info.ID, ctx.templates.findItem);
    }
    if (!info || !items) return p.sendMessage(3, "Informações do jogador inválidas!");
    p.send(Out.userEquip(info, items, ctx.now()));
  });
}
