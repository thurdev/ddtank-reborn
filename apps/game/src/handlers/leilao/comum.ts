/**
 * Infra compartilhada por `colocar-a-venda.ts`, `lance-comprar.ts`, `cancelar.ts` e `expirar.ts` — sem tela
 * própria. Porta `Game.Server/Packets/Client/Auction{Add,Update,Delete}Handler.cs` e a metade de liquidação
 * das procedures `SP_Auction_Add/_Update/_Delete/_Scan`. Busca/filtro da lista continua em HTTP
 * (`Tank.Request/AuctionPageList.ashx`, 01 §7) — fora deste módulo.
 *
 * Taxa de listar é em Ouro (`needGold = max(1, preço * 0.03 * {1,3,6} pela duração)`); o preço do
 * lance/compra direta é sempre em Cupom — o original fixa `payType = 1` em `AuctionAddHandler`
 * independente do que o cliente mandou, então o ramo em Ouro de `AuctionUpdateHandler` é código morto
 * também aqui (mantido só pra bater o formato, nunca alcançado).
 *
 * Fixes vs. o original:
 *  - Toda mudança de estado (lance, compra, cancelar, expirar) é um único `UPDATE ... WHERE "IsExist" = true
 *    RETURNING`; só quem de fato virou a flag paga ou devolve, então um pacote repetido ou duas varreduras
 *    de expiração sobrepostas nunca pagam em dobro — mesmo padrão de UPDATE idempotente de `correio/`.
 *  - A taxa de liquidação é aplicada uma vez só (`Server_Config.Cess`, 10% default) sobre o pagamento do
 *    vendedor. O insert de carta do `SP_Auction_Update` original aplica a taxa de novo (`@NewPrice * 0.9`)
 *    sobre o `@NewPrice` já taxado — não reproduzido; aqui o vendedor recebe `preço - taxa` exatamente uma vez.
 *
 * Fix de fiação (o motivo real do Add/Update estarem "partial"): o `SocketManager` do cliente NÃO tem
 * nenhum case pra 192 AUCTION_ADD ou 194 AUCTION_DELETE de entrada — só 193 AUCTION_UPDATE (um ack
 * `{bool,int}`, `AuctionBrowseView`) e 195 AUCTION_REFRESH (o push real da "minhas vendas",
 * `AuctionHouseController.__updateAuction`, comprimido em zlib). `AbstractPacketLib.SendAuctionRefresh`
 * (:1769) é o que Add/Update/Delete de fato chamam; `auctionRefresh()` manda o 195 real além do ack 193
 * que o AUCTION_UPDATE de fato manda.
 */
import { and, eq } from "drizzle-orm";
import { PacketOut, compressPacket } from "@ddt/protocol";
import { player } from "@ddt/db";
import { sendMail } from "../../db/social.js";
import { ItemInfo } from "../../game/item.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

export const A = player.Auction;
export type AuctionRow = typeof A.$inferSelect;

/** GameProperties.CustomLimit: "sendattackmail|addaution|PresentGoods|PresentMoney|unknow" default "20|20|20|20|20". */
export function limitLevel(ctx: ServerContext, index: number): number {
  const parts = String(ctx.templates.serverConfig.get("CustomLimit") ?? "20|20|20|20|20").split("|");
  return Number(parts[index]) || 0;
}
/** GamePlayer.isPlayerWarrior (mesmo check de forja/bolsa). */
export function isWarrior(p: { extra: unknown }): boolean {
  return (p.extra as { coupleBossBoxNum?: number } | null)?.coupleBossBoxNum === 9;
}
export function cess(ctx: ServerContext): number {
  const v = Number(ctx.templates.serverConfig.get("Cess"));
  return Number.isFinite(v) && v >= 0 ? v : 0.1;
}
/** GameProperties.IsLimitCount/LimitCount (default false/10): GamePlayer.IsLimitCount — AuctionAddHandler.cs:65. */
export function overListingLimit(ctx: ServerContext, goodsCount: number): number | null {
  const on = String(ctx.templates.serverConfig.get("IsLimitCount") ?? "False").trim().toLowerCase() === "true";
  if (!on) return null;
  const limit = ctx.templates.cfgInt("LimitCount", 10);
  return goodsCount > limit ? limit : null;
}

/**
 * ItemInfo.CloneFromTemplate(goods.Template, goods) (vendor/DDTank41/SqlDataProvider/Data/ItemInfo.cs:812-860):
 * copia todo campo de stat que ela lista, destacado (UserID 0 / BagType -1 / Place -1 — a linha do leilão
 * nunca mora numa mochila), quantidade nova. `IsJudge`, `IsUsed` e os timers de equip de ouro/energia latente
 * também estão nessa lista de campos (faltava antes: o clone caía silenciosamente nos defaults do próprio
 * ItemInfo, que coincidem pra um item nunca "usado" mas estariam errados pra, digamos, uma peça de ouro no
 * meio da contagem ou uma Pedra ainda não julgada).
 */
export function cloneForAuction(src: ItemInfo, count: number, now: Date): ItemInfo {
  const it = ItemInfo.createFromTemplate(src.template, count, 30, now);
  it.StrengthenLevel = src.StrengthenLevel; it.StrengthenExp = src.StrengthenExp;
  it.AttackCompose = src.AttackCompose; it.DefendCompose = src.DefendCompose;
  it.LuckCompose = src.LuckCompose; it.AgilityCompose = src.AgilityCompose;
  it.Hole1 = src.Hole1; it.Hole2 = src.Hole2; it.Hole3 = src.Hole3; it.Hole4 = src.Hole4; it.Hole5 = src.Hole5; it.Hole6 = src.Hole6;
  it.Hole5Level = src.Hole5Level; it.Hole5Exp = src.Hole5Exp; it.Hole6Level = src.Hole6Level; it.Hole6Exp = src.Hole6Exp;
  it.Color = src.Color; it.Skin = src.Skin; it.isGold = src.isGold; it.goldValidDate = src.goldValidDate; it.ValidDate = src.ValidDate;
  it.IsJudge = src.IsJudge; it.IsUsed = src.IsUsed;
  it.goldBeginTime = src.goldBeginTime; it.latentEnergyEndTime = src.latentEnergyEndTime;
  it.latentEnergyCurStr = src.latentEnergyCurStr; it.latentEnergyNewStr = src.latentEnergyNewStr;
  it.BeginDate = now; it.UserID = 0; it.BagType = -1; it.Place = -1;
  return it;
}

/** Manda uma carta com um único item (ou só moeda) — mesmo formato do `mailTo` de academia, mantido local de propósito. */
export async function mailTo(ctx: ServerContext, toId: number, toNick: string, title: string, content: string, item?: ItemInfo, gold = 0, money = 0, type = 2): Promise<void> {
  const row: Record<string, unknown> = { Content: content, Title: title, Gold: gold, Money: money, Type: type, Receiver: toNick, ReceiverID: toId, Sender: "Casa de Leilões", SenderID: 0 };
  if (item) { row.Annex1 = String(item.ItemID); row.Annex1Name = item.template.Name ?? ""; }
  await sendMail(ctx.db.db, row as never);
  ctx.world.get(toId)?.send(Out.mailResponse(toId, 1));
}

/**
 * AbstractPacketLib.SendAuctionRefresh (:1769) — código 195 AUCTION_REFRESH, comprimido em zlib. Lido por
 * `AuctionHouseController.__updateAuction` (`vendor/DDTank41/Source Flash/src/auctionHouse/controller/
 * AuctionHouseController.as:266`, que faz `pkg.deCompress()` primeiro): int AuctionID, bool exists; se existe,
 * os campos de AuctionInfo, depois um bool "tem item" + os campos do item (mesmo bloco `userEquip` que
 * `out.ts` já usa pro 74 ITEM_EQUIP). `item` só é não-nulo no Add; Update/Delete sempre passam null, igual
 * ao `SendAuctionRefresh(auctionSingle, auctionID, ..., null)` em AuctionUpdateHandler.cs/AuctionDeleteHandler.cs.
 * O `now` escrito antes de Hole5Level reproduz a inconsistência do próprio original: o servidor escreve um
 * DateTime binário de 7 bytes ali (como o `WriteDateTime(DateTime.Now)` do C#) mas o cliente lê esse slot
 * com `readDateString()` (uma string UTF) em `DiscolorValidDate` — bug pré-existente cliente/servidor, não é
 * nosso pra corrigir.
 */
export function auctionRefresh(info: AuctionRow | null, auctionId: number, isExist: boolean, item: ItemInfo | null, now: Date): PacketOut {
  const p = new PacketOut(195);
  p.writeInt(auctionId);
  p.writeBoolean(isExist);
  if (isExist && info) {
    p.writeInt(info.AuctioneerID); p.writeString(info.AuctioneerName); Out.wd(p, info.BeginDate);
    p.writeInt(info.BuyerID); p.writeString(info.BuyerName); p.writeInt(info.ItemID);
    p.writeInt(info.Mouthful); p.writeInt(info.PayType); p.writeInt(info.Price); p.writeInt(info.Rise); p.writeInt(info.ValidDate);
    p.writeBoolean(item != null);
    if (item) {
      p.writeInt(item.Count); p.writeInt(item.TemplateID);
      p.writeInt(item.AttackCompose); p.writeInt(item.DefendCompose); p.writeInt(item.AgilityCompose); p.writeInt(item.LuckCompose);
      p.writeInt(item.StrengthenLevel); p.writeBoolean(item.IsBinds); p.writeBoolean(item.IsJudge);
      Out.wd(p, item.BeginDate); p.writeInt(item.ValidDate); p.writeString(item.Color ?? ""); p.writeString(item.Skin ?? "");
      p.writeBoolean(item.IsUsed);
      p.writeInt(item.Hole1); p.writeInt(item.Hole2); p.writeInt(item.Hole3); p.writeInt(item.Hole4); p.writeInt(item.Hole5); p.writeInt(item.Hole6);
      p.writeString(item.Pic ?? ""); p.writeInt(item.RefineryLevel);
      Out.wd(p, now); // slot DiscolorValidDate (ver nota acima)
      p.writeByte(item.Hole5Level); p.writeInt(item.Hole5Exp); p.writeByte(item.Hole6Level); p.writeInt(item.Hole6Exp);
    }
  }
  compressPacket(p);
  return p;
}

export async function itemById(ctx: ServerContext, itemId: number): Promise<ItemInfo | null> {
  const rows = await ctx.db.db.select().from(player.Sys_Users_Goods).where(eq(player.Sys_Users_Goods.ItemID, itemId)).limit(1);
  const r = rows[0];
  if (!r) return null;
  const t = ctx.templates.findItem(r.TemplateID);
  return t ? ItemInfo.fromRow(r, t) : null;
}

/** Liquida um leilão fechado (compra direta ou expiração achada pelo `expirar.ts`): manda o item pro comprador
 *  (ou de volta pro vendedor se não vendeu) e o pagamento (já taxado) pro vendedor. `row` já deve ser o estado
 *  pós-update (IsExist=false). */
export async function settle(ctx: ServerContext, row: AuctionRow): Promise<void> {
  const it = await itemById(ctx, row.ItemID);
  if (row.BuyerID === 0) {
    await mailTo(ctx, row.AuctioneerID, row.AuctioneerName, ctx.lang.t("SP_Auction_Scan.Msg1", row.Name), ctx.lang.t("SP_Auction_Scan.Msg2", row.Name), it ?? undefined, 0, 0, 3);
    return;
  }
  const net = Math.round(row.Price - cess(ctx) * row.Price);
  await mailTo(ctx, row.BuyerID, row.BuyerName, ctx.lang.t("SP_Auction_Scan.Msg3", row.Name), ctx.lang.t("SP_Auction_Scan.Msg4", row.AuctioneerName, row.Name, String(row.Price)), it ?? undefined, 0, 0, 4);
  if (row.AuctioneerID !== row.BuyerID) await mailTo(ctx, row.AuctioneerID, row.AuctioneerName, ctx.lang.t("SP_Auction_Scan.Msg5", row.Name), ctx.lang.t("SP_Auction_Scan.Msg6", row.Name, row.BuyerName, String(row.Price)), undefined, 0, net, 2);
}
