/**
 * Aba no jogo: Missões › concluir/entregar — botão "Concluir" quando todas as condições da missão já foram
 * cumpridas; entrega a recompensa.
 * Pacote: 179 QUEST_FINISH.
 * C#: `QuestFinishHandler.cs` em `vendor/DDTank41/Game.Server/Packets/Client`. Lógica em `game/quests.ts`.
 * Como testar: `apps/game/test/quests.test.ts`. Manual: `docs/features/missoes.md`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** Throttle de 1s por jogador (igual ao `LastDrillUpTime` do C#) — evita spam do clique de concluir. */
const lastFinish = new WeakMap<object, number>();

/**
 * QuestFinishHandler.cs: throttle de 1s, responde `179 {int id}` em caso de sucesso. Salva imediatamente no
 * banco (igual ao resgate de anexo de correio / pagamento de sociedade) em vez de esperar o ciclo de autosave:
 * a recompensa move gold/itens/GP, mesma classe de risco de duplicação em caso de crash daquelas outras ações.
 */
export async function entregarMissao(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  const selected = pkt.readInt();
  const now = Date.now();
  if ((lastFinish.get(p) ?? 0) + 1000 > now) return;
  lastFinish.set(p, now);
  if (p.questInv?.finish(id, selected)) {
    const out = new GSPacket(179, p.id);
    out.writeInt(id);
    p.send(out);
    await p.saveIntoDatabase(ctx.db.db);
  }
}
