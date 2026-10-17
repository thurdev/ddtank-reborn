/**
 * Aba no jogo: Sala › ficar pronto — clicar "Pronto"/"Não pronto" na sala de espera (precisa de arma equipada).
 * Pacote: 94 GAME_ROOM sub 15 GAME_PLAYER_STATE_CHANGE.
 * C#: `GamePlayerStateChange.cs` em `vendor/DDTank41/Game.Server/Rooms`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/salas-batalha.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** GamePlayerStateChange.cs: byte state (0 não pronto, 1 pronto); exige arma equipada. */
export function ficarPronto(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  if (!p.hasMainWeapon) return p.sendMessage(0, ctx.lang.t("Game.Server.SceneGames.NoEquip"));
  if (p.currentRoom) ctx.rooms.updatePlayerState(p, pkt.readByte());
}
