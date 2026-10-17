/**
 * Aba no jogo: Loja — pacote-presente (BUY_GIFTBAG), preço fixo em Money por 5 itens vinculados fixos,
 * sempre colocados nos slots 0-4 da StoreBag.
 * Pacote: 46 BUY_GIFTBAG.
 * C#: `BuyGiftBagHandler.cs:231`. `ClearStoreBagWithOutPlace(5)` no original move tudo mais que estiver na
 * StoreBag (todo slot exceto o 5) pra PropBag/EquipBag primeiro (excedente vai por correio); a StoreBag
 * normalmente é só uma área de montagem, então isso raramente faz algo na prática, mas evita colidir com
 * os 5 itens novos.
 * Como testar: sem teste automatizado dedicado hoje. Manual: `docs/features/loja.md`.
 *
 * Como lê esse código (cada variável):
 * - cost: 650×3 Money fixo (BuyGiftBagHandler.cs:235 — não lê nada do pacote).
 * - BUNDLE: os 5 itens fixos (templateId, place) que sempre acabam nos slots 0-4 do StoreBag.
 */
import { ItemInfo, BagType, templateBagType } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";
import { mailItems } from "../bolsa/correio-excedente.js";

/**
 * GamePlayer.ClearStoreBagWithOutPlace (GamePlayer.cs:5765): empties every StoreBag slot except `place`, moving
 * each item back into PropBag (or EquipBag, slot >= 31, for equips) when there's room; whatever doesn't fit gets
 * mailed (eMailType.StoreCanel) and force-cleared.
 */
async function clearStoreBagWithoutPlace(ctx: ServerContext, p: GamePlayer, place: number): Promise<void> {
  const overflow: ItemInfo[] = [];
  for (let i = 0; i < p.storeBag.capacity; i++) {
    if (i === place) continue;
    const it = p.storeBag.getItemAt(i);
    if (!it) continue;
    const toProp = templateBagType(it.template) === BagType.PropBag;
    const target = toProp ? p.propBag : p.equipBag;
    const slot = toProp ? target.findFirstEmptySlot() : target.findFirstEmptySlot(31);
    if (slot !== -1 && target.addItemTo(it, slot)) p.storeBag.takeOutItem(it);
    else overflow.push(it);
  }
  if (overflow.length) {
    const places = overflow.map((it) => it.Place);
    await mailItems(ctx, p, overflow, ctx.lang.t("GamePlayer.ClearStoreBagWithOutPlace.Title"), 13 /* eMailType.StoreCanel */);
    for (const pl of places) p.storeBag.removeItemAt(pl);
  }
  await p.saveIntoDatabase(ctx.db.db);
}

export function registerPacotePresente(r: HandlerRegistry): void {
  r.player(46, "BUY_GIFTBAG", async (ctx, p) => {
    const cost = 650 * 3;
    if (p.info.Money < cost) return p.sendMessage(0, ctx.lang.t("BuyGiftBagHandler.Fail"));
    p.removeMoney(cost);
    await clearStoreBagWithoutPlace(ctx, p, 5);
    const BUNDLE: [number, number][] = [[11023, 0], [11023, 1], [11023, 2], [11020, 3], [11018, 4]];
    for (const [templateId, place] of BUNDLE) {
      const t = ctx.templates.findItem(templateId);
      if (!t) continue;
      const item = ItemInfo.createFromTemplate(t, 1, 101, ctx.now());
      item.ValidDate = 0;
      item.IsBinds = true;
      p.storeBag.addItemTo(item, place);
    }
    p.sendMessage(0, ctx.lang.t("BuyGiftBagHandler.Success"));
  });
}
