/**
 * Aba no jogo: Missões (sem tela própria) — progresso de condição controlada pelo próprio cliente, usado por
 * missões cujo contador o jogo Flash calcula localmente (ex. passos de tutorial) em vez do servidor.
 * Pacote: 181 QUEST_CHECK.
 * C#: `QuestCheckHandler.cs` em `vendor/DDTank41/Game.Server/Packets/Client`. Lógica em `game/quests.ts`.
 * Como testar: `apps/game/test/quests.test.ts`. Manual: `docs/features/missoes.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** QuestCheckHandler.cs: ClientModifyCondition (tipo 20) value. */
export function progressoMissao(_ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const id = pkt.readInt();
  const cond = pkt.readInt();
  const value = pkt.readInt();
  p.questInv?.clientModify(id, cond, value);
}
