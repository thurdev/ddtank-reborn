/**
 * Aba no jogo: Consortia Battle (arena de guerra de guildas) › pedir elenco / andar.
 * 153/3 ADD_PLAYER ("me dá a lista", `sendConsBatRequestPlayerInfo`, sem corpo — reaproveita o mesmo sub-byte
 * da resposta em lista, ver packets/out.ts `consBatPlayerList`) e 153/4 PLAYER_MOVE (2 ints + UTF do caminho
 * final, `sendConsBatMove`).
 * C#: `ConsortiaBattleHander.cs` case 3 (`consBatRoom.SendUpdateRoom(client.Player)`) e case 4
 * (builds+broadcasts the move packet inline, then `consBatRoom.PlayerMove`).
 */
import type { GSPacket } from "@ddt/protocol";
import * as Out from "../../packets/out.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** 153/3 ADD_PLAYER request. */
export function consBatRequestRoster(ctx: ServerContext, p: GamePlayer): void {
  ctx.consBat.sendRoster(p);
}

/**
 * 153/4 PLAYER_MOVE.
 * Como lê esse código (cada variável):
 * - `endX`/`endY`: ponto final do caminho (o cliente recalcula o traçado localmente, como no 262 NEW_HALL).
 * - `path`: string do caminho completo, só repassada ao broadcast (o servidor não valida nem recalcula).
 */
export function consBatMove(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const endX = pkt.readInt();
  const endY = pkt.readInt();
  const path = pkt.readString();
  ctx.consBat.playerMove(p.id, endX, endY);
  ctx.consBat.broadcastMove(Out.consBatPlayerMove(p.id, endX, endY, path));
}
