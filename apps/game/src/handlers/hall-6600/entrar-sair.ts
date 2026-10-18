/**
 * Aba no jogo: Hall (6600) › entrar/sair do salão andável — 262/0 PLAYERINFO (entrar, sem corpo) e 262/2
 * PLAYEREXIT (sair, 1 int: id — sempre o próprio `PlayerManager.Instance.Self.ID`).
 * C#: `Game.Server.NewHall.Handle.PlayerInfo`/`PlayerExit` (`[Attribute13(0)]`/`[Attribute13(2)]`),
 * `WorldMgr.NewHallRooms.PlayerInfo`/`RemovePlayer` (`NewHallRoom.cs`).
 * Cliente: `GameSocketOut.as sendOtherPlayerInfo()`/`sendPlayerExit(id)`; disparo em
 * `hall/player/HallPlayerView.as:124-136 sendPkg()` (toda entrada no hall) e
 * `ddt/manager/StateManager.as:265-268` (toda SAÍDA do estado `StateType.MAIN`, incluindo pra dentro de uma
 * sala — por isso o servidor não precisa remover o jogador do hall sozinho ao entrar numa partida).
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** 262/0 PLAYERINFO — sem corpo. */
export function newHallEnter(ctx: ServerContext, p: GamePlayer): void {
  ctx.newHall.playerInfo(p);
}

/**
 * 262/2 PLAYEREXIT.
 * Como lê esse código (cada variável):
 * - `id`: sempre o id de quem mandou (o cliente nunca pede pra remover outra pessoa) — o C# confia no
 *   valor do pacote sem checar contra `Player.PlayerId`; replicado igual (sistema cosmético, sem risco).
 */
export function newHallExit(ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  const id = pkt.readInt();
  ctx.newHall.removePlayer(id);
}
