/**
 * Aba no jogo: Consortia Battle › saída manual da cena — 153/5 DELETE_PLAYER (`sendConsBatExit`, sem corpo:
 * o cliente sempre pede a remoção de si mesmo, como no 262/2 PLAYEREXIT do NEW_HALL).
 * C#: `ConsortiaBattleHander.cs` case 5 (`consBatRoom.RemovePlayer(client.Player)`).
 */
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export function consBatExit(ctx: ServerContext, p: GamePlayer): void {
  ctx.consBat.removePlayer(p);
}
