/**
 * Aba no jogo: Correio › enviar carta (taxa de 100 Ouro, presente em Cupom ou preço COD).
 * Pacotes: 116 SEND_MAIL.
 * C#: `UserSendMailHandler.cs`. 4.1: até 4 itens não travados inteiros. 6600: **só 1 item** (anexo único),
 * mas com `Count` pra destacar parte de uma pilha — ver `handleAnnex6600`/detalhe abaixo.
 * Como testar: `apps/game/test/mail.test.ts`. Manual: Correio → Escrever carta.
 */
import { GSPacket } from "@ddt/protocol";
import { findUserIdByNickName } from "../../db/characters.js";
import { saveItem } from "../../db/items.js";
import { sendMail } from "../../db/social.js";
import { ItemInfo } from "../../game/item.js";
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
  const is6600 = p.clientKind === "6600";
  /**
   * `GameSocketOut.as:359 sendEmail` — 4.1 escreve `NUM_OF_WRITING_DIAMONDS=4` slots de [bagType:byte,
   * itemId:int] (2 campos). O 6600 (`email/manager/MailManager.as`, mesma constante =4) acrescenta um
   * 3º campo (`Count`, int) por slot — MAS `UserSendMailHandler.cs` (6600) só LÊ o 1º slot inteiro
   * (byte,int,int) e não faz loop nenhum: os outros 3 slots que o cliente ainda manda (Count extra
   * desloca os campos se a gente tentasse ler como 2 campos/slot) ficam sem ler, descartados — pacote já
   * é framed por tamanho (`GSPacket.parse`, zero-pad além do length), então não precisa consumir o resto.
   * Por isso aqui: 4.1 lê 4×(byte,int); 6600 lê só 1×(byte,int,int) e para.
   */
  const annex: { bag: number; place: number; count: number }[] = [];
  if (is6600) annex.push({ bag: pkt.readByte(), place: pkt.readInt(), count: pkt.readInt() });
  else for (let i = 0; i < 4; i++) annex.push({ bag: pkt.readByte(), place: pkt.readInt(), count: -1 });
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
  const mail: Record<string, unknown> = {
    SenderID: p.id, Sender: p.info.NickName, ReceiverID: targetId, Receiver: nick, IsExist: true, Gold: 0, Money: 0, Title: title, Content: content,
  };
  let remark = t("UserSendMailHandler.AnnexRemark");
  let n = 0;
  if (is6600) {
    // UserSendMailHandler.cs (6600): item travado = sem anexo, SEM erro (o bloco abaixo só roda
    // `if (!ıtemInfo.IsBinds)`, mesmo filtro silencioso da 4.1); item inexistente ou `count` inválido =
    // mensagem de erro E RETORNA SEM MANDAR O 116 DE VOLTA (`return 0;` sem `SendTCP`, replicado aqui).
    const a = annex[0]!;
    if (a.place !== -1) {
      const inv = p.getInventory(a.bag);
      const item = inv?.getItemAt(a.place) ?? null;
      if (!item) { p.sendMessage(0, t("UserSendMailHandler.Msg1")); return; }
      if (!item.IsBinds) {
        if (item.Count < a.count || a.count < 0) { p.sendMessage(0, t("UserSendMailHandler.Msg2")); return; }
        const leftover = item.Count - a.count;
        inv!.takeOutItem(item); // reaproveita a MESMA linha como anexo (igual ao padrão 4.1 abaixo), só com Count reduzido
        const ri = inv!.removed.indexOf(item);
        if (ri >= 0) inv!.removed.splice(ri, 1); // já vamos salvar com dono novo abaixo — não deixar saveIntoDatabase apagar de novo
        item.Count = a.count;
        item.UserID = 0; item.BagType = -1; item.Place = -1; item.IsExist = true;
        await saveItem(ctx.db.db, item);
        n = 1;
        mail.Annex1 = String(item.ItemID);
        mail.Annex1Name = item.template.Name ?? "";
        remark += `1、${item.template.Name}x${item.Count};`;
        if (leftover > 0) {
          // sobra da pilha volta pra bolsa como linha nova (ItemInfo.CloneFromTemplate + AddTemplate no C#).
          const back = ItemInfo.cloneFromTemplate(item.template, item);
          back.Count = leftover;
          inv!.addTemplate(back, leftover); // bolsa cheia: sobra perdida, igual ao AddTemplate original (sem fallback de correio aqui)
        }
      }
    }
    if (isPay && (money <= 0 || !mail.Annex1)) return; // UserSendMailHandler.cs 6600: `return 1;` sem SendTCP (sem reply)
  } else {
    const items: { item: ItemInfo; bag: number }[] = [];
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
