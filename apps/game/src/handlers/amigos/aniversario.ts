/**
 * Aba no jogo: Amigos › aniversário (o cliente sobe a lista de amigos que fazem aniversário hoje/amanhã;
 * o servidor manda 1 mail de presente de volta).
 * Pacotes: 223 FRIEND_BRITHDAY.
 * C#: sem lógica no C# 4.1 original (só o enum do pacote); formato espelha
 * `FriendBirthdayManager.findFriendBirthday`. `ReadingView` abre a tela de aniversário no MailType 60.
 * Como testar: `apps/game/test/handlers.test.ts`. Manual: Amigos → ícone de aniversário.
 */
import { GSPacket } from "@ddt/protocol";
import { sendMail } from "../../db/social.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

/**
 * 223 FRIEND_BRITHDAY — cliente sobe os amigos com aniversário hoje/amanhã; servidor manda 1 mail
 * (MailType 60) juntando os nomes.
 */
export async function friendBirthday(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const n = pkt.readInt();
  const names: string[] = [];
  for (let i = 0; i < n && i < 50; i++) {
    pkt.readInt(); // friend ID (client-side reference only)
    const nick = pkt.readString();
    try { pkt.readDateTime(); } catch { break; }
    if (nick) names.push(nick);
  }
  if (!names.length) return;
  await sendMail(ctx.db.db, {
    Content: names.join(", "), Title: "Aniversário de amigo!", Gold: 0, Money: 0,
    Type: 60, Receiver: p.info.NickName ?? "", ReceiverID: p.id, Sender: "DDTank", SenderID: 0,
  } as never);
  p.send(Out.mailResponse(p.id, 1));
}
