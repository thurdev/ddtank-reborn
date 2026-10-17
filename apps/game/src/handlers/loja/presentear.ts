/**
 * Aba no jogo: Loja — presentear um item de charme pra um amigo (cobra Money, dá charmGP pro destinatário).
 * Pacote: 221 USER_SEND_GIFTS.
 * C#: `UserSendGiftHandler.cs:12`. Custo = `ShopItemInfo.AValue1 × count` Money; destinatário ganha
 * `ItemTemplate.Property2 × count` charmGP (`SP_Users_UpdateCharmGP`) + linha de log (`SP_Users_Gift_Add`)
 * + carta tipo 55 (`UserGiftSystem.MailTitle`). Destinatário online é atualizado em tempo real e avisado
 * via `117` (Gift).
 * Como testar: sem teste automatizado dedicado hoje. Manual: `docs/features/loja.md` tabela de ações.
 *
 * Como lê esse código (cada variável):
 * - nick/shopItemId/count: quem recebe, qual item da loja, quantos (lidos do pacote, nessa ordem).
 * - shop/t: linha Shop_Goods + ItemTemplate (Property2 = charme por unidade).
 * - online/info: jogador alvo (na memória se online, senão carrega do banco pelo nick).
 * - cost/charm: Money cobrado = AValue1×count; charme dado = Property2×count.
 */
import { loadPlayerInfoByNick, addCharmGP } from "../../db/characters.js";
import { sendMail, addUserGift } from "../../db/social.js";
import * as Out from "../../packets/out.js";
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";

export async function sendGift(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const nick = pkt.readString();
  const shopItemId = pkt.readInt();
  const count = pkt.readInt();
  pkt.readInt(); // unused — the original reads and discards it too
  if (nick === p.info.NickName || count <= 0 || count > 9999) return;
  const shop = ctx.templates.shop.get(shopItemId);
  if (!shop || shop.AValue1 <= 0) return;
  const t = ctx.templates.findItem(shop.TemplateID);
  if (!t) return;
  const online = ctx.world.getByNick(nick);
  const info = online?.info ?? (await loadPlayerInfoByNick(ctx.db.db, nick));
  if (!info) return p.sendMessage(0, ctx.lang.t("GoodsPresentHandler.NoUser"));
  const cost = shop.AValue1 * count;
  if (cost > p.info.Money + p.info.MoneyLock) return p.sendMessage(0, ctx.lang.t("GoodsPresentHandler.NoMoney"));
  p.removeMoney(cost);
  const charm = (t.Property2 ?? 0) * count;
  await addUserGift(ctx.db.db, p.id, info.ID, t.TemplateID, count);
  await addCharmGP(ctx.db.db, info.ID, charm);
  await sendMail(ctx.db.db, {
    SenderID: p.id, Sender: p.info.NickName ?? "", ReceiverID: info.ID, Receiver: info.NickName ?? "",
    Title: ctx.lang.t("UserGiftSystem.MailTitle"),
    Content: `${p.info.NickName ?? ""}${ctx.lang.t("GoodsPresentHandler.Content")}${t.Name ?? ""}]`,
    Type: 55, Gold: 0, Money: 0,
  });
  if (online) {
    online.info.charmGP += charm;
    online.updateProperties();
    online.send(Out.mailResponse(online.id, 4)); // eMailRespose.Gift
  }
  const reply = new GSPacket(221, p.id);
  reply.writeBoolean(true);
  p.send(reply);
  p.sendMessage(0, ctx.lang.t("GoodsPresentHandler.Success"));
}

export function registerPresentear(r: HandlerRegistry): void {
  r.player(221, "USER_SEND_GIFTS", (ctx, p, pkt) => sendGift(ctx, p, pkt));
}
