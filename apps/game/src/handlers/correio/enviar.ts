/**
 * Aba no jogo: Correio › enviar carta (taxa de 100 Ouro, até 4 itens não travados, presente em Cupom ou
 * preço COD).
 * Pacotes: 116 SEND_MAIL.
 * C#: `UserSendMailHandler.cs`.
 * Como testar: `apps/game/test/mail.test.ts`. Manual: Correio → Escrever carta.
 */
import { GSPacket } from "@ddt/protocol";
import { findUserIdByNickName } from "../../db/characters.js";
import { saveItem } from "../../db/items.js";
import { sendMail } from "../../db/social.js";
import type { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

export async function sendMailPacket(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const reply = (ok: boolean) => {
    const o = new GSPacket(116, p.id);
    o.writeBoolean(ok);
    p.send(o);
  };
  const t = (k: string) => ctx.lang.t(k);
  if (p.info.Gold < 100) {
    p.sendMessage(0, t("UserSendMailHandler.GoldNotEnought"));
    return reply(false);
  }
  const nick = pkt.readString().trim();
  const title = pkt.readString();
  const content = pkt.readString();
  const isPay = pkt.readBoolean();
  const validDate = pkt.readInt();
  const money = pkt.readInt();
  const annex: { bag: number; place: number }[] = [];
  for (let i = 0; i < 4; i++) annex.push({ bag: pkt.readByte(), place: pkt.readInt() });
  if ((money !== 0 || annex.some((a) => a.place !== -1)) && p.info.HasBagPassword && p.info.IsLocked) {
    p.sendMessage(0, t("Bag.Locked"));
    return reply(false);
  }
  const target = ctx.world.getByNick(nick);
  const targetId = target?.id ?? (nick ? await findUserIdByNickName(ctx.db.db, nick) : null);
  if (!targetId || nick === p.info.NickName) {
    p.sendMessage(1, t("UserSendMailHandler.Failed2"));
    return reply(false);
  }
  const items: { item: ItemInfo; bag: number }[] = [];
  const mail: Record<string, unknown> = {
    SenderID: p.id, Sender: p.info.NickName, ReceiverID: targetId, Receiver: nick, IsExist: true, Gold: 0, Money: 0, Title: title, Content: content,
  };
  let remark = t("UserSendMailHandler.AnnexRemark");
  let n = 0;
  for (const a of annex) {
    if (a.place === -1) continue;
    const item = p.getInventory(a.bag)?.getItemAt(a.place) ?? null;
    if (!item || item.IsBinds || items.some((x) => x.item === item)) continue;
    items.push({ item, bag: a.bag });
  }
  if (isPay && (money <= 0 || !items.length)) return reply(false);
  // destaca os itens primeiro (UserID 0, fora da mochila, salvo já: ItemID conhecido) pra nada poder ser usado 2x
  for (const { item, bag } of items) {
    const inv = p.getInventory(bag)!;
    inv.takeOutItem(item);
    const i = inv.removed.indexOf(item);
    if (i >= 0) inv.removed.splice(i, 1);
    item.UserID = 0;
    item.BagType = -1;
    item.Place = -1;
    item.IsExist = true;
    await saveItem(ctx.db.db, item);
    n++;
    mail[`Annex${n}`] = String(item.ItemID);
    mail[`Annex${n}Name`] = item.template.Name ?? "";
    remark += `${n}、${item.template.Name}x${item.Count};`;
  }
  if (isPay) {
    mail.ValidDate = validDate === 1 ? 1 : 6;
    mail.Type = 101;
    mail.Money = money;
    remark += `${++n}、${t("UserSendMailHandler.PayMoney")}${money};`;
  } else {
    mail.Type = 1;
    if (money > 0 && p.info.Money >= money) {
      mail.Money = money;
      p.removeMoney(money);
      remark += `${++n}、${t("UserSendMailHandler.Money")}${money};`;
    }
  }
  mail.AnnexRemark = remark;
  await sendMail(ctx.db.db, mail as never);
  p.removeGold(100);
  await p.saveIntoDatabase(ctx.db.db);
  p.sendMessage(0, t("UserSendMailHandler.Success"));
  reply(true);
  target?.send(Out.mailResponse(targetId, 1));
  p.send(Out.mailResponse(p.id, 2));
}
