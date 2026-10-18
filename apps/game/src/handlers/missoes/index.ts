/**
 * Aba no jogo: índice das Missões inteiras (`TaskMainFrame`) + os pacotes avulsos de PvE/tutorial que vivem
 * ao lado (perguntas do trainer, troca de itens de calendário, pacotes mortos). Cada ação tem o seu próprio
 * arquivo, nomeado como o jogador vê na tela:
 *
 *   aceitar-missao.ts     (Missões › aceitar)        — 176 QUEST_ADD
 *   abandonar-missao.ts   (Missões › abandonar)       — 177 QUEST_REMOVE
 *   entregar-missao.ts    (Missões › concluir)        — 179 QUEST_FINISH
 *   progresso-missao.ts   (sem tela própria)          — 181 QUEST_CHECK (progresso calculado pelo cliente)
 *   perguntas-respostas.ts (tutorial/trainer)          — 15  USER_ANSWER
 *   troca-de-itens.ts      (evento de calendário)      — 31  GOODS_EXCHANGE
 *   stubs.ts                (sem tela própria)          — 50 FIGHT_NPC, 32 COLLECTINFO, 89 QUESTION_REPLY
 *                                                          (nunca disparados pelo cliente/servidor reais)
 *   curadoria.ts            ("curadoria"/auto-piloto, 6600 only) — 140 TRUSTEESHIP
 *
 * Campo de treino/trainer e lutar com NPC de verdade (sala PvE) usam o pipeline de sala — ver
 * `handlers/salas/` e `docs/features/pve-masmorras.md`.
 *
 * Pacotes: ver tabela acima.
 * C#: ver cabeçalho de cada arquivo listado.
 * Como testar: `apps/game/test/quests.test.ts`, `apps/game/test/activities.test.ts`. Manual:
 * `docs/features/missoes.md` tem o passo a passo de cada ação.
 */
import type { GSPacket } from "@ddt/protocol";
import type { HandlerRegistry } from "../registry.js";
import { aceitarMissoes } from "./aceitar-missao.js";
import { abandonarMissao } from "./abandonar-missao.js";
import { entregarMissao } from "./entregar-missao.js";
import { progressoMissao } from "./progresso-missao.js";
import { perguntaResposta } from "./perguntas-respostas.js";
import { trocarItens } from "./troca-de-itens.js";
import { registerMissoesStubs } from "./stubs.js";
import { trusteeship } from "./curadoria.js";

export function registerMissoes(r: HandlerRegistry): void {
  r.player(176, "QUEST_ADD", (ctx, p, pkt) => aceitarMissoes(ctx, p, pkt));
  r.player(177, "QUEST_REMOVE", (ctx, p, pkt) => abandonarMissao(ctx, p, pkt));
  r.player(179, "QUEST_FINISH", (ctx, p, pkt) => entregarMissao(ctx, p, pkt));
  r.player(181, "QUEST_CHECK", (ctx, p, pkt) => progressoMissao(ctx, p, pkt));

  r.player(15, "USER_ANSWER", (ctx, p, pkt: GSPacket) => {
    const sub = pkt.readByte();
    const id = pkt.readInt();
    const flag = sub === 1 ? pkt.readBoolean() : false;
    perguntaResposta(ctx, p, sub, id, flag);
  });

  r.player(31, "GOODS_EXCHANGE", (ctx, p, pkt: GSPacket) => {
    const activeId = pkt.readInt();
    const count = pkt.readInt();
    if (count <= 0 || count > Math.floor((pkt.length - pkt.offset) / 12) || pkt.length - pkt.offset !== count * 12) return;
    const offered: { templateId: number; place: number; bagType: number }[] = [];
    for (let i = 0; i < count; i++) offered.push({ templateId: pkt.readInt(), place: pkt.readInt(), bagType: pkt.readInt() });
    return trocarItens(ctx, p, activeId, offered);
  }, "partial");

  registerMissoesStubs(r);

  r.player(140, "TRUSTEESHIP", (ctx, p, pkt) => trusteeship(ctx, p, pkt));
}
