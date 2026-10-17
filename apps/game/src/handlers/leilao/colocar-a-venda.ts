/**
 * Aba no jogo: Leilão › colocar item à venda.
 * Pacotes: 192 AUCTION_ADD.
 * C#: `AuctionAddHandler.cs`. Taxa de listagem é sempre em Ouro; preço/mínimo do lance em Cupom.
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`. Manual: Leilão → Vender → escolher item/preço/duração.
 */
import { saveItem } from "../../db/items.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { A, auctionRefresh, cloneForAuction, isWarrior, limitLevel, overListingLimit } from "./comum.js";

/** AuctionAddHandler.cs — lista um item. */
export async function add(ctx: ServerContext, p: GamePlayer, pkt: { readByte(): number; readInt(): number }): Promise<void> {
  const bagType = pkt.readByte();
  const place = pkt.readInt();
  pkt.readByte(); // payType do cliente é ignorado — forçado pra Cupom abaixo, igual ao original
  const price = pkt.readInt();
  const mouthful = pkt.readInt();
  const durationCode = pkt.readInt();
  const goodsCount = pkt.readInt();
  const fail = (key: string, ...args: unknown[]) => p.sendMessage(0, ctx.lang.t(key, ...args));

  if (isWarrior(p)) return p.sendMessage(0, "Esta conta não tem permissão para usar esta função.");
  if (p.info.HasBagPassword && p.info.IsLocked) return p.sendMessage(0, ctx.lang.t("Bag.Locked"));
  if (price < 0 || (mouthful !== 0 && mouthful < price)) return; // silencioso, igual ao original
  const needGold = Math.max(1, Math.trunc(price * 0.03 * (durationCode === 0 ? 1 : durationCode === 1 ? 3 : 6)));
  const inv = p.getInventory(bagType);
  const goods = inv?.getItemAt(place) ?? null;
  if (!goods) return fail("AuctionAddHandler.Msg13");
  if (goods.Count < goodsCount || goodsCount <= 0) return fail("AuctionAddHandler.Msg11");
  const overLimit = overListingLimit(ctx, goodsCount);
  if (overLimit !== null) return p.sendMessage(0, `O limite de ${overLimit} foi alcançado.`);
  const limit = limitLevel(ctx, 1);
  if (p.info.Grade < limit) return fail("AuctionAddHandler.Msg12", limit);
  if (needGold > p.info.Gold) return fail("AuctionAddHandler.Msg3");
  if (goods.IsBinds) return fail("AuctionAddHandler.Msg5");

  const now = ctx.now();
  const randMin = ctx.templates.cfgInt("BeginAuction", 0);
  const randMax = Math.max(randMin, ctx.templates.cfgInt("EndAuction", 0));
  const random = randMin + Math.floor(Math.random() * (randMax - randMin + 1));
  const validHours = durationCode === 0 ? 8 : durationCode === 1 ? 24 : 48;
  const listed = cloneForAuction(goods, goodsCount, now);
  await saveItem(ctx.db.db, listed);
  inv!.removeCountFromStack(goods, goodsCount);

  const [row] = await ctx.db.db.insert(A).values({
    Name: goods.template.Name ?? "", Category: goods.template.CategoryID ?? 0, AuctioneerID: p.id, AuctioneerName: p.info.NickName ?? "",
    ItemID: listed.ItemID, PayType: 1, Price: price, Rise: Math.max(1, Math.trunc(price / 10)), Mouthful: mouthful,
    BeginDate: now, ValidDate: validHours, BuyerID: 0, BuyerName: "", IsExist: true, TemplateID: goods.TemplateID, Random: random, goodsCount,
  }).returning();
  p.removeGold(needGold);
  p.send(auctionRefresh(row!, row!.AuctionID, true, listed, now));
  p.sendMessage(0, ctx.lang.t("AuctionAddHandler.Msg6"));
}
