/**
 * Aba no jogo: Consortia Battle › desafiar outro jogador na cena — 153/6 CHALLENGE, 1 int (id do alvo,
 * `sendConsBatChallenge`). Só cria a luta de verdade quando os DOIS lados estão livres (ver
 * `game/consortia-battle.ts ConsBatRoom.challenge` pro desvio corrigido); a luta em si é o motor de combate
 * real (`rooms/room-mgr.ts createConsortiaBattleRoom` → `FightEngine.startPvp`), não um resultado inventado.
 * C#: `ConsortiaBattleHander.cs` case 6.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer, RoomMember } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export function consBatChallenge(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const challengeId = pkt.readInt();
  if (!p.hasMainWeapon) {
    p.sendMessage(1, ctx.lang.t("Game.Server.SceneGames.NoEquip"));
    return;
  }
  ctx.consBat.challenge(p.id, challengeId, (a: RoomMember, b: RoomMember) => ctx.rooms.createConsortiaBattleRoom(a, b));
}
