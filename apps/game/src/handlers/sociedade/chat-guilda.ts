/**
 * Aba no jogo: Sociedade › chat do clã (aba "Clã" do chat, canal 3).
 * Pacotes: 129 CONSORTIA_CMD sub 20 CONSORTIA_CHAT.
 * C#: `ConsortiaChat.cs` — o cliente manda esse chat pelo canal 19 (SCENE_CHAT) canal 3 também; o C#
 * ecoava o pacote de entrada, cujo sub (int) não batia com o sub (byte) que o cliente lê na resposta —
 * reconstruído aqui como `{20, byte tipo, str remetente, str msg}`.
 * Como testar: `apps/game/test/consortia.test.ts`, `apps/game/test/chat-bots.test.ts`. Manual: Sociedade → Chat.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { GM_NOTICE, reply } from "./comum.js";

/** 20 CONSORTIA_CHAT (ConsortiaChat.cs) — ecoa a mensagem pra todo membro do clã que estiver online. */
export function guildChat(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  if (p.info.ConsortiaID === 0) return;
  if (p.info.IsBanChat) return p.sendMessage(GM_NOTICE, ctx.lang.t("ConsortiaChatHandler.IsBanChat"));
  const type = pkt.readByte();
  pkt.readString();
  const text = pkt.readString();
  const out = reply(20, p.id);
  out.writeByte(type); out.writeString(p.info.NickName ?? ""); out.writeString(text);
  for (const o of ctx.world.all()) if (o.info.ConsortiaID === p.info.ConsortiaID) o.send(out);
}
