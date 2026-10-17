/**
 * Aba no jogo: sem tela própria — resquício de rede social (post no "mural" via HTTP, não via socket).
 * Pacotes: 40 SNS_MSG_RECEIVE (stub, só loga).
 * C#: sem lógica no C# 4.1 original.
 * Como testar: não testado diretamente (fire-and-forget, sem efeito observável).
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/**
 * 40 SNS_MSG_RECEIVE: fire-and-forget by design — the SNS post itself goes over HTTP (SNSFrame posts to
 * the SNS path then shows "succeed"); the socket int is only a notify the 4.1 server also ignored (no C#
 * logic). No reply.
 */
export function snsMsgReceive(ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  const typeId = pkt.readInt();
  ctx.log.debug(`sns notify type=${typeId}`);
}
