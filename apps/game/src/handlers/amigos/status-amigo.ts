/**
 * Aba no jogo: Amigos › mudar status (online/ausente/invisível), avisa quem te tem como amigo.
 * Pacotes: 160 IM_CMD sub 165 FRIEND_STATE.
 * C#: espelha `WorldMgr.ChangePlayerState`.
 * Como testar: `apps/game/test/handlers.test.ts`. Manual: Amigos → trocar status no menu do jogador.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

/**
 * 160/165 FRIEND_STATE — jogador mudou status (online/ausente/invisível: `state`).
 * Avisa TODOS os jogadores online que têm `p` na lista de amigos deles (`o.friends.has(p.id)`),
 * não só quem `p` adicionou.
 */
export function changeFriendState(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const state = pkt.readInt();
  for (const o of ctx.world.all()) if (o !== p && o.friends.has(p.id)) o.send(Out.friendState(p.id, state, p.info.typeVIP, p.info.VIPLevel));
}
