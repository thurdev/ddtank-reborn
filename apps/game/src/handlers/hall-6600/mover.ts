/**
 * Aba no jogo: Hall (6600) › andar pelo salão — 262/3 PLAYERMOVE (2 ints: x, y finais do caminho) e 262/4
 * ADDPLAYE (1 int: id de um jogador desconhecido visto andando, pedindo os dados dele).
 * C#: `Game.Server.NewHall.Handle.PlayerMove`/`PlayerAdd` (`[Attribute13(3)]`/`[Attribute13(4)]`),
 * `WorldMgr.NewHallRooms.PlayerMove`/`AddPlayerInfo` (`NewHallRoom.cs`).
 * Cliente: `GameSocketOut.as sendPlayerPos(x,y)`/`sendAddNewPlayer(id)`;
 * `hall/player/HallPlayerView.as sendMyPosition()` (só manda o PONTO FINAL do caminho, não a lista de
 * waypoints — quem recalcula o caminho é o mesh do lado de quem recebe, `__onFriendPlayerMove`,
 * `searchPath`) e `__onFriendPlayerMove:366` (id desconhecido, ainda não carregado nem em
 * `_unLoadPlayerDic` -> pede os dados).
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** 262/3 PLAYERMOVE. */
export function newHallMove(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const x = pkt.readInt();
  const y = pkt.readInt();
  ctx.newHall.playerMove(p.id, x, y);
}

/** 262/4 ADDPLAYE. */
export function newHallAddPlayer(ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  const id = pkt.readInt();
  ctx.newHall.addPlayerInfo(id);
}
