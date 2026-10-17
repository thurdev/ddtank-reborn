/**
 * Aba no jogo: ícone do hall "Atividades de novato" (noviceactivity) — presente liberado quando o jogador
 * atinge um nível (Grade) configurado; cada (tipo, condição) só pode ser resgatado uma vez.
 * Simplificação assumida: `NoviceActivityGetAward.cs` rastreia um contador de condição por `ActivityType`
 * (subir de nível / fortalecer / recarregar / subir VIP / força de luta...) via `PlayerExtra`, que este port
 * ainda não construiu; aqui a elegibilidade usa só o `Grade` atual do jogador contra `Event_Reward_Info.Condition`
 * (o gatilho "subir de nível", o único realmente usado pelo painel novato/newbie do cliente 4.1).
 * Pacotes: 258 NOVICEACTIVITY (inbound), 258/0 NOVICEACTIVITY_MESSAGE (outbound, `sendNoviceActivityOpen`
 * abaixo — nunca existiu um sender C# pra isso, ver design em `research/qa/feature-designs.md` §novato;
 * sem o pacote de abertura o ícone "Atividades de novato" (LIMITACTIVITY) nunca aparecia, mesmo com
 * `ALL_OPEN=true` — `NoviceActivityManager.checkTime()` do cliente só vira `true` depois de receber
 * `startDate`/`endDate` por esse pacote).
 * C#: `NoviceActivityGetAward.cs` (tabelas `Event_Reward_Info`/`Event_Reward_Goods`, admin-editáveis).
 * Como testar: `apps/game/test/all-open.test.ts` (258/0 ao logar). Manual: `docs/features/eventos.md`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { claimOnce, grantRewards, type Reward } from "../../game/events.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { eventsRuntime } from "./agendador.js";
import * as Out from "../../packets/out.js";

export async function noviceActivity(ctx: ServerContext, p: GamePlayer, activityType: number, subActivityType: number): Promise<void> {
  const rt = eventsRuntime(ctx);
  const condition = subActivityType <= 1 ? 1 : subActivityType;
  const goods = rt.data.eventGoods.filter((g) => g.ActivityType === activityType && g.SubActivityType === condition);
  if (!goods.length) return p.sendMessage(0, "Sem recompensa.");
  if (condition > p.info.Grade) return p.sendMessage(0, "Condições insuficientes! A operação falhou.");
  if (!(await claimOnce(ctx.db.db, p.id, "novice", `${activityType}:${condition}`))) return p.sendMessage(0, "Você já recebeu esta recompensa.");
  const rewards: Reward[] = goods.map((g) => ({ templateId: g.TemplateId, count: g.Count ?? 1, validDate: g.ValidDate ?? 0, isBind: g.IsBind ?? true }));
  const g = grantRewards(p, rewards, ctx.templates.findItem, ctx.now());
  if (g.overflow.length) await mailItems(ctx, p, g.overflow, "Presente de Abertura do Servidor", 51);
  p.sendMessage(0, "Presente do evento recebido com sucesso!");
}

export function noviceActivityHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  return noviceActivity(ctx, p, pkt.readInt(), pkt.readInt());
}

/** 10 abas fixas do painel novato/newbie (`NoviceActivityFrame`/`recordList`, sempre 10 no cliente).
 *  `session/login.ts` chama isto no login (gate `activityOpen(ctx,"novato")`, igual bau-da-galinha/
 *  estrela-da-sorte: aberto por padrão sem precisar configurar nada em `app."ScheduledEvents"`). */
const NOVICE_ACTIVITY_TABS = 10;

/** Manda as 10 linhas + a janela aberta (ver header do arquivo e `Out.noviceActivityRow`). `end` já vem
 *  com +1 dia de folga pro `endDate.date -= 1` que o cliente faz depois de ler. */
export function sendNoviceActivityOpen(p: GamePlayer, now: Date): void {
  const start = new Date(now.getTime() - 86_400_000); // ontem: checkTime() já aceita "agora" de cara
  const end = new Date(now.getTime() + 366 * 86_400_000); // +1 dia de folga (client subtrai 1 depois de ler)
  for (let i = 1; i <= NOVICE_ACTIVITY_TABS; i++) p.send(Out.noviceActivityRow(p.id, i, start, end));
}
