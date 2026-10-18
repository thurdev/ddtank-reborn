/**
 * Aba no jogo: Loja — comprar da loja principal (carrinho multi-linha em 1 pacote só).
 * Pacote: 44 BUY_GOODS. Cobra tudo junto (sem falha parcial) e veste se `dress=true`; sem espaço na
 * bolsa vai pro correio.
 * C#: sem handler explícito no 4.1 (porte segue `Bussiness.Managers.ShopMgr` + `ItemInfo.SetItemType`).
 * Como testar: sem teste automatizado dedicado hoje. Manual: `docs/features/loja.md` §3 tem o passo a passo.
 *
 * Como lê esse código (cada variável):
 * - totals (PriceTotals): soma do custo em 7 moedas (gold/money/offer/gifttoken/petScore/score/dmgScore).
 * - need: mapa templateID->qtd de ITENS exigidos como custo (ex. pedra de troca).
 * - buy: lista do que entregar [{item, dress, place}]; `place` = slot p/ anel/bracelete 7-10.
 * - goodsId/type: linha da Shop_Goods; type 1/2/3 = tripla de preço A/B/C (setItemType).
 * - unit: validade (BuyType 0, dias) ou quantidade (BuyType != 0) da unidade comprada.
 * - eMsg/msg: 0=ok, 1=erro (texto vai pro chat); reply 44 sempre [1,3] no fim.
 */
import { ItemInfo, templateBagType } from "../../game/item.js";
import { getEquipControl } from "../../db/consortia.js";
import { canBuyGuildShop, personalRiches } from "../../game/consortia.js";
import type { GamePlayer } from "../../game/player.js";
import type { PlayerInventory } from "../../game/inventory.js";
import { GSPacket } from "@ddt/protocol";
import type { HandlerRegistry } from "../registry.js";
import type { ServerContext } from "../../session/context.js";
import { bagLocked } from "../bolsa/senha-da-bolsa.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { toShopItemFromCheap, type ShopItemInfo } from "../../db/templates.js";
import { type PriceTotals, canBuyShop, setItemType } from "./preco.js";

/** UserBuyItemHandler.cs:22 (44 BUY_GOODS): carrinho multi-linha em 1 pacote.
 * Pacote 4.1: int count (1..99); por linha [goodsId, type A/B/C, color, dress, skin, place].
 * Pacote 6600 (`GameSocketOut.as:203 sendBuyGoods`, confirmado contra `UserBuyItemHandler.cs` 6600): por
 * linha o 6600 acrescenta +2 campos — [goodsType, goodsId, type, color, dress, skin, place, isBand] —
 * `goodsType` ANTES do goodsId (1 = loja normal, 2 = loja barata/desconto via `ShopMgr.GetShopItemDisCountById`
 * → `Shop_Cheap_Items`/`tpl.shopCheap`, ver `db/templates.ts` `toShopItemFromCheap`) e um bool `isBand` no
 * fim de cada linha que o C# 6600 lê e DESCARTA (`packet.ReadBoolean();` sem atribuição, linha 38) — quem
 * decide o vínculo é o servidor (`canBuyShop`/our hardcoded `IsBinds = true`), não o cliente; por isso só
 * precisamos consumir o byte pra não desalinhar o resto do pacote, sem usar o valor.
 */
export async function buyGoods(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const tpl = ctx.templates;
  const is6600 = p.clientKind === "6600";
  const totals: PriceTotals = { gold: 0, money: 0, offer: 0, gifttoken: 0, petScore: 0, score: 0, dmgScore: 0 };
  const need = new Map<number, number>();
  const buy: { item: ItemInfo; dress: boolean; place: number }[] = [];
  const count = pkt.readInt();
  if (count <= 0 || count > 99) return p.sendMessage(0, "Erro do sistema. O problema foi enviado ao administrador.");
  for (let i = 0; i < count; i++) {
    const goodsType = is6600 ? pkt.readInt() : 1;
    const goodsId = pkt.readInt();
    const type = pkt.readInt();
    const color = pkt.readString();
    const dress = pkt.readBoolean();
    const skin = pkt.readString();
    const place = pkt.readInt();
    if (is6600) pkt.readBoolean(); // isBand: descartado (ver comentário acima)
    let shop: ShopItemInfo | undefined;
    if (goodsType === 2) {
      // ShopMgr.GetShopItemDisCountById: só a loja barata 6600; IsOnShop ali vira EndDate > now (sem `showList`).
      const cheap = tpl.shopCheap.get(goodsId);
      if (cheap && cheap.EndDate.getTime() > ctx.now().getTime()) shop = toShopItemFromCheap(cheap);
    } else {
      const s = tpl.shop.get(goodsId);
      shop = s && tpl.isOnShop(s.ID) ? s : undefined;
    }
    if (!shop) continue;
    let guildOk = false;
    if (shop.ShopID >= 11 && shop.ShopID <= 15 && p.info.ConsortiaID) {
      const th = await getEquipControl(ctx.db.db, p.info.ConsortiaID, shop.ShopID - 10, 1);
      guildOk = canBuyGuildShop(shop.ShopID, p.info.ConsortiaID, p.info.ShopLevel, personalRiches(p.info), th);
    }
    const can = canBuyShop(shop.ShopID, guildOk);
    if (shop.ShopID === 2 || !can.ok) return p.sendMessage(1, ctx.lang.t("UserBuyItemHandler.FailByPermission"));
    const t = tpl.findItem(shop.TemplateID);
    if (!t) continue;
    if (shop.ShopID === 20) {
      // Limited free daily goods (WorldMgr.UpdateShopFreeCount): one per day.
      const last = p.info.ShopFinallyGottenTime;
      if (last && last.toISOString().slice(0, 10) === ctx.now().toISOString().slice(0, 10)) return p.sendMessage(1, ctx.lang.t("UserBuyItemHandler.FailByPermission2"));
      p.info.ShopFinallyGottenTime = ctx.now();
      need.set(-9999, 1);
    }
    const item = ItemInfo.createFromTemplate(t, 1, 102, ctx.now());
    const unit = type === 1 ? shop.AUnit : type === 2 ? shop.BUnit : type === 3 ? shop.CUnit : null;
    if (unit !== null) {
      if (shop.BuyType === 0) item.ValidDate = unit;
      else item.Count = unit;
    }
    item.Color = color ?? "";
    item.Skin = skin ?? "";
    item.IsBinds = true; // UserBuyItemHandler.cs:117 — every purchase is bound in this build
    buy.push({ item, dress, place });
    const req = setItemType(shop, type, totals);
    for (let j = 0; j < req.length; j += 2) need.set(req[j]!, (need.get(req[j]!) ?? 0) + req[j + 1]!);
  }
  if (buy.length === 0) return;
  if (bagLocked(ctx, p)) return;
  for (const [k, v] of need) if (k !== -9999 && p.getTemplateCount(k, tpl.findItem) < v) return p.sendMessage(1, ctx.lang.t("UserBuyItemHandler.NoBuyItem"));
  const { gold, money, offer, gifttoken, petScore, score, dmgScore } = totals;
  const anyCost = gold > 0 || money > 0 || offer > 0 || gifttoken > 0 || petScore > 0 || score > 0 || dmgScore > 0 || need.size > 0;
  if (!(gold >= 0 && money >= 0 && offer >= 0 && gifttoken >= 0 && petScore >= 0 && score >= 0 && dmgScore >= 0 && anyCost)) {
    return p.sendMessage(0, "Erro do sistema. O problema foi enviado ao administrador.");
  }
  const c = p.info;
  let eMsg = 0;
  let msg = "UserBuyItemHandler.Success";
  if (gold <= c.Gold && money <= c.Money + c.MoneyLock && offer <= c.Offer && gifttoken <= c.GiftToken && petScore <= c.petScore && score <= c.Score && dmgScore <= c.damageScores) {
    p.beginChanges();
    p.removeMoney(money); p.removeGold(gold); p.removeOffer(offer); p.removeGiftToken(gifttoken);
    p.removePetScore(petScore); p.removeScore(score); p.removeDamageScores(dmgScore);
    for (const [k, v] of need) if (k !== -9999) p.removeTemplateInShop(k, v, tpl.findItem);
    p.commitChanges();
    p.questInv?.onPaid(money, gold, offer, gifttoken, buy.map((b) => b.item.TemplateID)); // GamePlayer.OnPaid -> ShopCondition
    const overflow: ItemInfo[] = [];
    for (const b of buy) {
      const bagType = templateBagType(b.item.template);
      const inv = p.getInventory(bagType);
      if (inv && inv.addTemplate(b.item, b.item.Count)) {
        if (!b.dress || !b.item.canEquip()) continue;
        let slot = p.equipBag.findItemEquipSlot(b.item.template);
        if ((slot === 9 || slot === 10) && (b.place === 9 || b.place === 10)) slot = b.place;
        else if ((slot === 7 || slot === 8) && (b.place === 7 || b.place === 8)) slot = b.place;
        const placed = (inv as PlayerInventory).lastAdded[0];
        if (placed && inv === p.equipBag) p.equipBag.moveItem(placed.Place, slot, 0);
        msg = "UserBuyItemHandler.Save";
      } else overflow.push(b.item);
    }
    if (overflow.length) {
      await mailItems(ctx, p, overflow);
      eMsg = 1;
      msg = "UserBuyItemHandler.Mail";
    }
  } else {
    if (money > c.Money && money > 0) msg = "UserBuyItemHandler.NoMoney";
    if (gold > c.Gold) msg = "UserBuyItemHandler.NoGold";
    if (offer > c.Offer) msg = "UserBuyItemHandler.NoOffer";
    if (gifttoken > c.GiftToken) msg = "UserBuyItemHandler.GiftToken";
    if (petScore > c.petScore) msg = "UserBuyItemHandler.petScore";
    if (score > c.Score || dmgScore > c.damageScores) msg = "UserBuyItemHandler.boguScore";
    eMsg = 1;
  }
  p.sendMessage(eMsg, ctx.lang.t(msg));
  const reply = new GSPacket(44, p.id);
  reply.writeInt(1);
  reply.writeInt(3);
  p.send(reply);
}

export function registerComprar(r: HandlerRegistry): void {
  r.player(44, "BUY_GOODS", (ctx, p, pkt) => buyGoods(ctx, p, pkt));
}
