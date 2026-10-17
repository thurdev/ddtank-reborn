/**
 * Aba no jogo: cartaz de desafio ("challenge poster") — broadcast pago pra todo jogador online.
 * Pacotes: 123 DEFY_AFFICHE.
 * C#: `DefyAfficheHandler.cs` — 500 Cupom, originalmente retransmitido pelo Center/login server; aqui é
 * um broadcast local (processo único), equivalente.
 * Como testar: `apps/game/test/chat-bots.test.ts`. Manual: Bolsa → usar cartaz de desafio.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export function defyAffiche(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const str = pkt.readString();
  const cost = 500;
  if (p.info.Money + p.info.MoneyLock < cost) return p.sendMessage(3, ctx.lang.t("UserBuyItemHandler.Money"));
  p.removeMoney(cost);
  p.lastChatTime = Date.now();
  for (const o of ctx.world.all()) {
    const out = new GSPacket(123, o.id);
    out.writeString(str);
    o.send(out);
  }
}
