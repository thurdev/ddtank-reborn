/**
 * Aba no jogo: Missões (sem tela própria) — passos de pergunta/resposta do tutorial ("trainer") e do progresso
 * da "weakless guild" (sequência de passos que destrava o resto do tutorial).
 * Pacote: 15 USER_ANSWER.
 * C#: `UserAnswerHandler.cs` em `vendor/DDTank41/Game.Server/Packets/Client` + `GamePlayer.UpdateAnswerSite`/
 * `UpdateWeaklessGuildProgress` (`Game.Server/GamePlayer.cs:5136,5469-5485`) + `PlayerInfo.CheckLevelFunction`
 * (`:2351-2390`, só a parte gatilhada por nível/sinalizador, a versão simplificada aqui).
 * Como testar: `apps/game/test/activities.test.ts`. Manual: `docs/features/missoes.md`.
 */
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { grantRewards, type Reward } from "../../game/events.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import * as Out from "../../packets/out.js";

/**
 * GamePlayer.PlayerCharacter.openFunction(Step) (SqlDataProvider/Data/PlayerInfo.cs:2452-2463): seta o bit
 * `(step-1) % 8` do byte `(step-1) / 8` no bitmap de progresso da weakless guild. O original só toca no array
 * quando ele já não está vazio (personagem novo começa com string/array vazio e `openFunction` é um no-op
 * silencioso até outra coisa preencher) — mesma trava aqui.
 */
function openFunction(p: GamePlayer, step: number): void {
  const arr = p.info.weaklessGuildProgress;
  if (!arr.length || step <= 0) return;
  const index = Math.floor((step - 1) / 8);
  if (index >= arr.length) return;
  arr[index] = (arr[index] ?? 0) | (1 << ((step - 1) % 8));
  p.info.WeaklessGuildProgressStr = Buffer.from(arr).toString("base64");
}

/**
 * GamePlayer.UpdateAnswerSite (Game.Server/GamePlayer.cs:5136) + UpdateWeaklessGuildProgress (:5469-5485) +
 * PlayerInfo.CheckLevelFunction (:2351-2390, só os passos travados por grade — a parte simplificada, ver nota
 * acima).
 * Como lê esse código (cada variável):
 * - `p`: jogador (`GamePlayer`). Vem da conexão autenticada; contém `info` (`PlayerInfo`, linha salva no banco).
 * - `id`: id do passo do tutorial (`Step` no cliente AS3) que acabou de disparar `syncStep`/`syncWeakStep`.
 */
function updateAnswerSite(p: GamePlayer, id: number): void {
  if (p.info.AnswerSite < id) p.info.AnswerSite = id;
  if (p.info.Grade === 1) openFunction(p, 2); // Step.GAIN_ADDONE
  if (p.info.IsOldPlayer) openFunction(p, 950); // Step.OLD_PLAYER
  p.send(Out.weaklessGuild(p.info));
}

/**
 * 15 USER_ANSWER (UserAnswerHandler.cs): byte sub (1 = resposta com recompensa opcional + flag "abrir", 2 = só
 * marca um passo de tutorial como aberto), int id (id do `Step`, também a chave da condição de drop
 * `eDropType.Answer` quando sub === 1), e, quando sub === 1, um bool `flag` no final (abre o passo também
 * depois da recompensa). Sempre termina chamando `UpdateAnswerSite`.
 */
export function perguntaResposta(ctx: ServerContext, p: GamePlayer, sub: number, id: number, flag: boolean): void {
  if (sub === 1) {
    const dropId = ctx.templates.findDropCondition(10, String(id), "0"); // eDropType.Answer = 10
    const d = dropId ? ctx.templates.dropOne(dropId) : null;
    if (d) {
      const reward: Reward = { templateId: d.templateId, count: d.count, isBind: d.isBind, validDate: d.validDate };
      const g = grantRewards(p, [reward], ctx.templates.findItem, ctx.now());
      if (g.overflow.length) void mailItems(ctx, p, g.overflow, "Recompensa", 8);
    }
    if (flag) openFunction(p, id);
  } else if (sub === 2) {
    openFunction(p, id);
  }
  updateAnswerSite(p, id);
}
