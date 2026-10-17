/**
 * Mecanismo compartilhado (sem tela própria): manda item excedente pro correio quando a bolsa de destino
 * não tem espaço — usado por praticamente toda ação que tenta colocar item numa bolsa (comprar, abrir caixa,
 * limpar bancada da Forja, recompensa de evento, bolsa temporária cheia...).
 * C#: `UserBuyItemHandler.cs:239-325` (carta de 5 anexos, tipo 8 BuyItem por padrão).
 * Como testar: indireto, via qualquer handler que a chama (ver grep por `mailItems` no repo) +
 * `apps/game/test/*` de correio/compra. Manual: deixar a bolsa cheia e comprar/abrir algo — o item vai pro Correio.
 */
import { sendMail } from "../../db/social.js";
import { saveItem } from "../../db/items.js";
import type { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";

/** Sends overflow items by mail (5 annexes per mail, default type 8 BuyItem) — UserBuyItemHandler.cs:239-325.
 *
 * Como lê esse código (cada variável):
 * - chunk: fatia de até 5 itens (carta só tem Annex1..5). Vem do `slice` do array.
 * - mail: linhas da carta (Annex1..5 = IDs dos itens, viram UserID 0 = "no correio").
 * - remark: texto da carta ("1、nome×qtd;..."). `it` = cada ItemInfo excedente.
 */
export async function mailItems(ctx: ServerContext, p: GamePlayer, items: ItemInfo[], title?: string, type = 8): Promise<void> {
  for (let i = 0; i < items.length; i += 5) {
    const chunk = items.slice(i, i + 5);
    const mail: Record<string, unknown> = {};
    let remark = ctx.lang.t("GoodsPresentHandler.AnnexRemark");
    for (const [k, it] of chunk.entries()) {
      it.UserID = 0;
      it.BagType = -1;
      it.Place = -1;
      await saveItem(ctx.db.db, it);
      mail[`Annex${k + 1}`] = String(it.ItemID);
      mail[`Annex${k + 1}Name`] = it.template.Name ?? "";
      remark += `${k + 1}、${it.template.Name}x${it.Count};`;
    }
    const content = title ?? `${ctx.lang.t("UserBuyItemHandler.Title")}${chunk[0]!.template.Name ?? ""}]`;
    await sendMail(ctx.db.db, {
      ...mail, AnnexRemark: remark, Content: content, Title: content, Gold: 0, Money: 0, Type: type,
      Receiver: p.info.NickName, ReceiverID: p.id, Sender: p.info.NickName, SenderID: p.id,
    });
  }
  if (items.length) p.send(Out.mailResponse(p.id, 1)); // 117: the client reloads LoadUserMail.ashx
}
