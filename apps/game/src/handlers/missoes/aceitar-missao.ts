/**
 * Aba no jogo: Missões › aceitar — o cliente manda de uma vez toda missão que pode ser aceita
 * (`TaskManager.requestCanAcceptTask`), e o servidor confere e adiciona cada uma.
 * Pacote: 176 QUEST_ADD.
 * C#: `QuestAddHandler.cs` em `vendor/DDTank41/Game.Server/Packets/Client`. Lógica em `game/quests.ts`.
 * Como testar: `apps/game/test/quests.test.ts`. Manual: `docs/features/missoes.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** QuestAddHandler.cs: int n, n x int questId. */
export function aceitarMissoes(_ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const n = pkt.readInt();
  if (n < 0 || n > 500) return;
  const ids: number[] = [];
  for (let i = 0; i < n; i++) ids.push(pkt.readInt());
  for (const id of ids) p.questInv?.add(id);
}
