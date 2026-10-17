/**
 * Aba no jogo: Missões › abandonar — botão "Abandonar" na janela de missões.
 * Pacote: 177 QUEST_REMOVE.
 * C#: `QuestRemoveHandler.cs` em `vendor/DDTank41/Game.Server/Packets/Client`. Lógica em `game/quests.ts`.
 * Como testar: `apps/game/test/quests.test.ts`. Manual: `docs/features/missoes.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export function abandonarMissao(_ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  p.questInv?.remove(pkt.readInt());
}
