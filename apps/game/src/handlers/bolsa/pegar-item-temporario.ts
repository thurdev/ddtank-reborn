/**
 * Aba no jogo: Bolsa — recolher itens da "bolsa temporária" (ganhos em sala/evento) pras bolsas reais.
 * Pacote: 108 GAME_TAKE_TEMP (um item, `place`, ou todos com `-1`). O que não cabe vai por correio.
 * C#: `GameTakeTempItemsHandler.cs`. O branch `item.Template.BagType == eBageType.Card` do original é
 * código morto — o switch de `ItemTemplateInfo.BagType` (`ItemTemplateInfo.cs:11-31`) nunca retorna Card
 * pra nenhum CategoryID, então carta nunca passa por ali; todo item segue pelo `GetItemInventory` normal.
 * Como testar: sem teste dedicado hoje. Manual: terminar uma sala com item temporário → recolher na Bolsa.
 */
import type { ItemInfo } from "../../game/item.js";
import type { HandlerRegistry } from "../registry.js";
import { mailItems } from "./correio-excedente.js";

export function registerPegarItemTemporario(r: HandlerRegistry): void {
  /** GameTakeTempItemsHandler.cs (108 GAME_TAKE_TEMP): pick one (int place) or all (-1) TempBag items into their
   * real bags; overflow mails the whole remaining TempBag. The original's `item.Template.BagType == eBageType.Card`
   * branch is dead code — ItemTemplateInfo.BagType's switch (ItemTemplateInfo.cs:11-31) never returns Card for any
   * CategoryID, so cards never take that path; every item goes through the normal `GetItemInventory` add. */
  r.player(108, "GAME_TAKE_TEMP", async (ctx, p, pkt) => {
    const place = pkt.readInt();
    const take = async (it: ItemInfo): Promise<boolean> => {
      const inv = p.getItemInventory(it.template);
      if (inv?.addItem(it)) { p.tempBag.removeItem(it); return true; }
      return false;
    };
    if (place !== -1) {
      const it = p.tempBag.getItemAt(place);
      if (it) await take(it);
    } else {
      for (const it of p.tempBag.getItems()) if (!(await take(it))) break;
    }
    const left = p.tempBag.getItems();
    if (left.length) {
      await mailItems(ctx, p, left, "Mochila cheia! Itens devolvidos", 9);
      for (const it of left) p.tempBag.removeItem(it);
      p.sendMessage(1, ctx.lang.t("GameTakeTempItemsHandler.Msg")); // eMessageType.BIGBUGLE_NOTICE
    }
  });
}
