/**
 * Aba no jogo: "Coleta" (`collectiontask.swf`, `src/collectionTask/`) — cena compartilhada onde o jogador anda
 * até uma das 5 hotspots fixas (árvore vermelha/verde/amarela, 2 caixas de abelha) e clica repetidamente pra
 * completar a tarefa de coleta de uma missão ativa. m4-coleta (`docs/plan/TASKS.md`, `docs/plan/MIGRACAO-6600.md
 * §4`): nome bate exato com a referência DDClássico, risco baixo — mapeamento 1:1 do contrato AS3.
 *
 * Pacote: 261 COLLECTION_TASK, sub-ações (`CollectionTaskPackageType.cs`/`CollectionTaskEvent.as`, valores
 * idênticos nos dois lados): 1 ADD_ONE_PLAYER (srv→clt, nunca emitido — ver `game/collection-task.ts`), 2 WALK,
 * 3 COLLECT, 4 QUIT, 5 INIT_PLAYERS. C#: `Game.Server.CollectionTask.*` (sala global, `WorldMgr.
 * CollectionTaskRooms`) + `Game.Server.Quests.CollectionTaskCondition` (`CondictionType=64`, QUEST system —
 * ver `game/quests.ts onCollectionTaskCollect`). Cliente: `collectionTask/CollectionTaskManager.as` +
 * `ddt/manager/GameSocketOut.as:4330-4360`.
 *
 * Alcançável no cliente: sim — `hall/tasktrack/HallTaskTrackListCell.as:389-391` e
 * `quest/TaskMainFrame.as:953-956` (ambos `case 64: CollectionTaskManager.Instance.setUp()`), disparado pelo
 * botão "ir até o local" de qualquer missão ativa cuja PRIMEIRA condição seja `CondictionType===64`. Sem essa
 * missão ativa o jogador nunca vê o botão — não há ícone de hall pra esta tela (diferente de Resgate).
 *
 * Exploit evitado (server-authoritative progress): o pacote 261/3 COLLECT manda só um `collectedId` fixo
 * (11499/11495/11497/11783, hardcoded no cliente por hotspot — `CollectionTaskSceneMap.as:205-232`) — o
 * SERVIDOR decide quanto a progressão sobe (sempre +1, nunca o valor do pacote), igual ao original. O que o
 * original NÃO tem é qualquer limite de frequência: o cliente real só manda um COLLECT a cada ~117 frames de
 * animação (`ProgressSprite.as:40-51`, barra de progresso) mais o tempo de andar até a hotspot — mas nada
 * server-side impede um cliente malicioso de mandar COLLECT repetidamente sem esperar, terminando a missão
 * em <1s sem jogar o minigame. `COLLECT_COOLDOWN_MS` abaixo fecha essa brecha (zero efeito pra um cliente
 * real, que nunca consegue mandar mais rápido que a própria animação).
 *
 * Admin gate: `isOpen(ctx, "collection_task")` — feature nova pedida pelo dono (toda janela M4 configurável
 * via `app."ScheduledEvents"`); o original nunca teve esse interruptor (alcançabilidade 100% via missão).
 *
 * Sem migração: a progressão vive inteiramente em `QuestData.Condition1..4` (coluna já existente desde
 * sempre, mesmo mecanismo de toda outra condição de missão).
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { isOpen } from "./agendador.js";

/** ~117 frames (`ProgressSprite.as:43`) de barra de progresso antes do cliente real conseguir mandar outro
 *  COLLECT — um pouco abaixo do pior caso (24fps ≈ 4.9s) pra nunca rejeitar um clique legítimo por jitter de
 *  rede, mas alto o suficiente pra tornar inútil mandar o pacote em loop. */
const COLLECT_COOLDOWN_MS = 4000;
const lastCollectAt = new WeakMap<GamePlayer, number>();

export function collectionTask(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const sub = pkt.readByte();
  switch (sub) {
    case 5: // INIT_PLAYERS (sendCollectionSceneEnter) — entrar na cena.
      if (!isOpen(ctx, "collection_task")) return p.sendMessage(0, "A Coleta está fechada.");
      ctx.collectionTask.addPlayer(p);
      return;
    case 2: { // WALK (sendCollectionSceneMove) — endX, endY, path (UTF, nunca lido pelo C# original tampouco).
      const x = pkt.readInt();
      const y = pkt.readInt();
      ctx.collectionTask.playerMove(p.id, x, y);
      return;
    }
    case 3: { // COLLECT (sendCollectionComplete) — collectedId fixo por hotspot.
      const collectedId = pkt.readInt();
      const now = Date.now();
      if ((lastCollectAt.get(p) ?? 0) + COLLECT_COOLDOWN_MS > now) return;
      lastCollectAt.set(p, now);
      p.questInv?.onCollectionTaskCollect(collectedId);
      return;
    }
    case 4: // QUIT (sendLeaveCollectionScene) — ver `game/collection-task.ts removePlayer` pro porquê de usar
            // o próprio id do remetente em vez de ler um int do pacote (o cliente real nunca escreve um).
      ctx.collectionTask.removePlayer(p.id);
      return;
  }
}
