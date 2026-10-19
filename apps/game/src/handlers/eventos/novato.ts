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

/**
 * Colisão de enum confirmada no m3-partial-sweep (2026-10-19): 258 é `NOVICEACTIVITY` na 4.1
 * (`Game.Server/Packets/ePackageType.cs` 4.1:12) mas `MAGIC_STONE` no 6600 (`ePackageType.cs` 6600:291,
 * `ddt/data/socket/ePackageType.as` 6600:598) — board de exploração de Relíquias (`magicstone.swf`), 8
 * sub-ações (`MagicStoneType` em `GameSocketOut.as:4479-4556`: EXPLORE/SCORE/CONVERT/MOVE_PLACE/LOCK/
 * LEVEL_UP/SORT_BAG/UPDATE_REMAIN_COUNT, cada uma com um byte de sub-código próprio + campos variáveis).
 * Sem o guard por `clientKind`, um 6600 real que abrisse essa tela teria seu pacote lido como se fosse
 * `noviceActivityHandler` (2 ints) — risco real, não só de misparse: os 2 ints mal-lidos cairiam em
 * `activityType`/`subActivityType` de `noviceActivity`, podendo casar por acidente com uma linha de
 * `Event_Reward_Info` e disparar um resgate indevido (bypass de `claimOnce` por código errado, não por
 * dado forjado — mesma categoria de risco que `01 §13` cobre pra outros pacotes).
 * A feature de verdade (bag de Relíquias separada, board de exploração) é trabalho de subsistema — fora
 * do escopo desta varredura, já tracked em `docs/plan/TASKS.md` `m4-vestir-encanto-reliquias` ("Relíquias
 * de verdade... hoje o dano mágico usa a EquipBag normal"). Aqui só a FRAMING seguro: lê o sub-byte +
 * os campos certos de cada sub-ação (pra não deixar lixo no meio do stream mesmo sob o protocolo
 * framed-by-length) e não responde nada — nenhum item/moeda/XP concedido, mesma categoria de
 * `211 CADDY_EXCHANGE_ALL` (m3-caddy-loteria).
 */
export function magicStoneNoOp(_ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  const sub = pkt.readByte(); // magicStone/data/MagicStoneType.as — valores NÃO sequenciais, ver abaixo
  switch (sub) {
    case 1: // EXPLORE_MAGIC_STONE: int type, bool isBind, int count
      pkt.readInt(); pkt.readBoolean(); pkt.readInt();
      break;
    case 2: { // LEVEL_UP: int len, len×int
      const len = pkt.readInt();
      for (let i = 0; i < len; i++) pkt.readInt();
      break;
    }
    case 3: // MOVE_PLACE: int sourcePlace, int targetPlace
      pkt.readInt(); pkt.readInt();
      break;
    case 4: // MAGIC_STONE_SCORE: sem campos
      break;
    case 5: // CONVERT_SCORE: int goodsId, bool bind, int count
      pkt.readInt(); pkt.readBoolean(); pkt.readInt();
      break;
    case 6: // LOCK_MAGIC_STONE: int place
      pkt.readInt();
      break;
    case 9: { // SORT_BAG: int len, len×(int,int)
      const len = pkt.readInt();
      for (let i = 0; i < len; i++) { pkt.readInt(); pkt.readInt(); }
      break;
    }
    case 16: // UPDATE_REMAIN_COUNT: sem campos
      break;
    default:
      break; // 7 UPDATE_BAG/8 LEVEL_UP_COMPLETE: sem sender AS3 encontrado (nunca mandados pelo cliente) + sub desconhecido — não tenta ler mais nada (evita estourar o pacote)
  }
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
