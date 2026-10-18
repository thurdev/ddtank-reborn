/**
 * Aba no jogo: Consortia Battle › confirmar entrada — 153/21 CONFIRM_ENTER (`sendConsBatConfirmEnter`, sem
 * corpo), enviado pelo cliente logo depois que o estado realmente virou `CONSORTIA_BATTLE_SCENE` (resposta ao
 * `isJump=true` de 153/2 ENTER_SELF_INFO). Resposta: o mesmo elenco de 153/3 ADD_PLAYER.
 * C#: `ConsortiaBattleHander.cs` case 21 (`consBatRoom.SendConfirmEnterRoom(client.Player)`).
 */
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export function consBatConfirmEnter(ctx: ServerContext, p: GamePlayer): void {
  ctx.consBat.sendRoster(p);
}
