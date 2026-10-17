/**
 * Aba no jogo: chat privado 1-a-1 (sussurro) pela caixa de chat normal (diferente do chat de amigos
 * `amigos/chat-privado.ts`, que é o pacote 160/51).
 * Pacotes: 37 CHAT_PERSONAL.
 * C#: `UserPrivateChatHandler.cs` — ecoado pro próprio remetente também.
 * Como testar: `apps/game/test/chat-bots.test.ts`. Manual: clicar no nick de alguém → sussurrar.
 */
import { GSPacket } from "@ddt/protocol";
import { findUserIdByNickName } from "../../db/characters.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export async function chatPersonal(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  let targetId = pkt.readInt();
  const nick = pkt.readString();
  pkt.readString();
  const msg = pkt.readString();
  const auto = pkt.readBoolean();
  if (targetId === 0) targetId = ctx.world.getByNick(nick)?.id ?? (await findUserIdByNickName(ctx.db.db, nick)) ?? 0;
  if (targetId === 0) return p.sendMessage(1, ctx.lang.t("UserPrivateChatHandler.NoUser"));
  const out = new GSPacket(37, p.id);
  out.writeInt(targetId);
  out.writeString(nick);
  out.writeString(p.info.NickName ?? "");
  out.writeString(msg);
  out.writeBoolean(auto);
  const target = ctx.world.get(targetId);
  if (target) {
    if (target.isBlackFriend(p.id)) return;
    target.send(out);
  }
  p.send(out);
}
