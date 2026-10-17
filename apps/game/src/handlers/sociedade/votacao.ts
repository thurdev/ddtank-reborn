/**
 * Aba no jogo: Sociedade › votar candidato — pacote enviado pelo cliente, mas sem handler no C# original.
 * Pacotes: 129 CONSORTIA_CMD sub 25 POLL_CANDIDATE.
 * C#: nenhuma classe `[ConsortiaHandleAttbute]` registrada pra esse sub — confirmado stub, sem comportamento
 * real pra espelhar nem fonte externa (não é `ActiveSystemHandler`/`LightRoadPackageType`, é específico de
 * `ConsortiaPackageType.POLL_CANDIDATE`, e nenhum fork pesquisado em `research/qa/feature-sources.md`
 * registra esse sub-código).
 *
 * Design novo (regra própria, sem fonte C#; detalhe completo em `research/qa/feature-designs.md`): votação
 * semanal de "Membro da semana" — cada membro vota em 1 colega do mesmo clã (`weekKey()`, pode trocar o voto
 * durante a semana), apurado no reset semanal (`app."ScheduledEvents"` kind "weekly_reset", mesmo gancho que
 * já existia pra ranking de Riqueza/Honra — ver `eventos/agendador.ts` `weeklyReset`): quem tiver mais votos
 * ganha um pequeno prêmio (`sociedade.pollReward`, admin) e um aviso no chat do clã. Formato do pacote é
 * próprio (o cliente nunca definiu um — sem `GameSocketOut.sendXxx` pra esse sub em nenhum fork): `int
 * targetUserId`. Resposta `GSPacket(129){byte 25, boolean ok, string msg}`.
 * Como testar: `apps/game/test/consortia.test.ts` (bloco "25 POLL_CANDIDATE").
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { castVote, consortiaWithVotes, voteTally } from "../../db/guild-week.js";
import { consortiaMgr, ConsortiaMgr } from "../../game/consortia-mgr.js";
import { weekKey } from "../../game/events.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { reply } from "./comum.js";

/** 25 POLL_CANDIDATE: `int targetUserId` — vota (ou troca o voto) no candidato a "Membro da semana". */
export async function pollCandidate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const targetId = pkt.readInt();
  const out = reply(25);
  if (p.info.ConsortiaID === 0) { out.writeBoolean(false); out.writeString("Você não está em uma sociedade."); return p.send(out); }
  if (targetId === p.id) { out.writeBoolean(false); out.writeString("Você não pode votar em você mesmo."); return p.send(out); }
  const target = await Db.getMember(ctx.db.db, p.info.ConsortiaID, targetId);
  if (!target) { out.writeBoolean(false); out.writeString("Esse jogador não é membro da sua sociedade."); return p.send(out); }
  const week = weekKey(ctx.now());
  await castVote(ctx.db.db, p.info.ConsortiaID, week, p.id, targetId);
  out.writeBoolean(true); out.writeString(`Voto registrado em ${target.UserName}!`);
  p.send(out);
}

/**
 * Apuração de fim de semana (chamado por `eventos/agendador.ts` `weeklyReset` pra toda sociedade com voto
 * na semana `week`): quem tiver mais votos ganha o prêmio + aviso no chat do clã. Sem fonte C# — regra
 * própria, `research/qa/feature-designs.md`.
 */
export async function settlePollWeek(ctx: ServerContext, week: string): Promise<void> {
  const db = ctx.db.db;
  const m = await consortiaMgr(ctx);
  for (const cid of await consortiaWithVotes(db, week)) {
    const tally = await voteTally(db, cid, week);
    const winner = tally[0];
    if (!winner || winner.Votes <= 0) continue;
    const winnerPlayer = ctx.world.get(winner.TargetID);
    const name = winnerPlayer?.info.NickName ?? (await Db.getMember(db, cid, winner.TargetID))?.UserName ?? `#${winner.TargetID}`;
    const msg = m.t("Consortia.Poll.Winner", "{0} foi eleito Membro da Semana com {1} votos!", name, winner.Votes);
    for (const o of m.online(cid)) o.send(ConsortiaMgr.taskChat(msg));
    if (winnerPlayer) { winnerPlayer.addGold(500); winnerPlayer.sendMessage(0, msg); }
  }
}
