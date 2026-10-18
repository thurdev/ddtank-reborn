/**
 * Aba no jogo: "Curadoria"/auto-piloto de missão (`quest/TrusteeshipView.as`, botão que troca "Iniciar" por
 * "Cancelar" + barra de progresso) — paga energia espiritual pra deixar uma missão se completando sozinha ao
 * longo de `Quest.CollocationColdTime` minutos, em vez de jogar de verdade; "acelerar" paga Xu/minuto
 * restante pra terminar na hora (grátis se o jogador tem uma Bênção do Rei ativa — `quest/TrusteeshipView.
 * as:225-229`, `KingBlessManager.openType>0`).
 * M3 `m3-trusteeship` (docs/plan/TASKS.md). Sistema novo do 6600, sem equivalente 4.1.
 *
 * Pacote: 140 TRUSTEESHIP (`sendTrusteeshipStart/Cancel/SpeedUp/BuySpirit/UseSpiritItem`,
 * `ddt/manager/GameSocketOut.as:2971-3027`), sub-código = `TrusteeshipPackageType` (START=1, CANCEL=2,
 * SPEED_UP=3, BUY_SPIRIT=4, USE_SPIRIT_ITME=5). Confirmado chamado de verdade em `quest/TrusteeshipManager.
 * as`/`quest/TrusteeshipView.as`/`ddt/command/QuickUseFrame.as:127`.
 *
 * C#: NENHUM. `GameTrusteeshipCommand.cs` (Game.Logic, código de pacote DIFERENTE, 149 "usar item" dentro de
 * uma partida) é um stub puro (`packet.ReadBoolean(); return`) e não tem relação com este sistema; não existe
 * `[PacketHandler(140,...)]` nem entidade de banco em NENHUM vendor (grep confirmado) — implementado 100% a
 * partir do contrato do cliente, design Reborn.
 *
 * Preços/limites (`ServerConfigManager.instance.serverConfigInfo[...]` no cliente, `Server_Config` no
 * servidor — sem default documentado em nenhum vendor, escolhidos nesta tarefa, admin pode ajustar):
 *   QuestCollocationCount (máx. missões simultâneas em curadoria, default 3), QuestCollocationEnergyMaxCount
 *   (energia espiritual máxima, default 100), QuestCollocationEnergyBuyCost/Count (Xu por compra / quanto
 *   restaura, default 3000/20), QuestCollocationAdvanceMinuteCost (Xu por minuto restante pra acelerar,
 *   default 100). Custo/tempo por missão: `game.Quest.CollocationCost`/`CollocationColdTime` (colunas
 *   adicionadas nesta tarefa, migração 0020 — `QuestInfo.as:89-91`, atributos XML `@CollocationCost`/
 *   `@CollocationColdTime`, defaults 20/60).
 *
 * Servidor-autoritativo: `EndTime` é sempre `ctx.now() + CollocationColdTime minutos`, nunca lido do
 * cliente. Sem timer por-jogador (igual ao Labirinto, `handlers/eventos/labirinto.ts`) — o prazo é varrido
 * (`sweep`) a cada ação 140 deste jogador; uma missão que terminou enquanto o jogador não abriu o painel só
 * é entregue na próxima ação (gap documentado, mesma categoria do Labirinto).
 * Recompensa: reaproveita `QuestInventory.finish` (mesma lógica do 179 QUEST_FINISH manual) depois de forçar
 * as condições por-contador a 0 (`QuestInventory.forceCompleteConditions`, `game/quests.ts`) — sem duplicar a
 * lógica de prêmio.
 *
 * Como testar: `apps/game/test/client-6600-m3-trusteeship.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";
import { loadTrusteeship, upsertTrusteeship, deleteTrusteeship, type TrusteeshipRow, upsertExtra } from "../../db/juramento-do-rei.js";
import type { ExtraRow } from "../../db/social.js";

function cfg(ctx: ServerContext) {
  return {
    maxConcurrent: ctx.templates.cfgInt("QuestCollocationCount", 3),
    maxSpirit: ctx.templates.cfgInt("QuestCollocationEnergyMaxCount", 100),
    buyCost: ctx.templates.cfgInt("QuestCollocationEnergyBuyCost", 3000),
    buyAmount: ctx.templates.cfgInt("QuestCollocationEnergyBuyCount", 20),
    speedUpPerMin: ctx.templates.cfgInt("QuestCollocationAdvanceMinuteCost", 100),
  };
}

function spiritOf(p: GamePlayer): number {
  return p.extra?.TrusteeshipSpirit ?? 100;
}

async function setSpirit(ctx: ServerContext, p: GamePlayer, value: number): Promise<void> {
  p.extra = { ...(p.extra as ExtraRow ?? ({} as ExtraRow)), UserID: p.id, TrusteeshipSpirit: value };
  await upsertExtra(ctx.db.db, p.id, { TrusteeshipSpirit: value });
}

function canAfford(p: GamePlayer, v: number): boolean {
  return p.info.Money + p.info.MoneyLock >= v;
}

/** Entrega (via `QuestInventory.finish`) toda entrada cujo `EndTime` já passou (tempo do servidor) e remove
 *  do banco; devolve a lista do que ainda está rodando. */
async function sweep(ctx: ServerContext, p: GamePlayer): Promise<TrusteeshipRow[]> {
  const rows = await loadTrusteeship(ctx.db.db, p.id);
  const now = ctx.now();
  const remaining: TrusteeshipRow[] = [];
  for (const row of rows) {
    if (row.EndTime > now) { remaining.push(row); continue; }
    p.questInv?.forceCompleteConditions(row.QuestID);
    p.questInv?.finish(row.QuestID, 0);
    await deleteTrusteeship(ctx.db.db, p.id, row.QuestID);
  }
  return remaining;
}

function sendList(p: GamePlayer, active: TrusteeshipRow[]): void {
  p.send(Out.trusteeshipData(p.id, spiritOf(p), active.map((r) => ({ questId: r.QuestID, endTime: r.EndTime }))));
}

/** 140 TRUSTEESHIP: byte sub, resto depende do sub (ver `TrusteeshipPackageType`). */
export async function trusteeship(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const sub = pkt.readByte();
  let active = await sweep(ctx, p);

  switch (sub) {
    case 1: { // START
      const questId = pkt.readInt();
      if (active.some((a) => a.QuestID === questId)) return sendList(p, active);
      const c = cfg(ctx);
      if (active.length >= c.maxConcurrent) return p.sendMessage(0, "Número máximo de missões em curadoria já atingido.");
      const q = p.questInv?.list.get(questId);
      if (!q || q.data.IsComplete) return p.sendMessage(0, "Missão inválida para curadoria.");
      const cost = q.tpl.info.CollocationCost;
      const minutes = q.tpl.info.CollocationColdTime;
      if (spiritOf(p) < cost) return p.sendMessage(0, "Energia espiritual insuficiente para iniciar a curadoria.");
      await setSpirit(ctx, p, spiritOf(p) - cost);
      const endTime = new Date(ctx.now().getTime() + minutes * 60_000);
      await upsertTrusteeship(ctx.db.db, p.id, questId, endTime);
      active = [...active, { UserID: p.id, QuestID: questId, EndTime: endTime }];
      return sendList(p, active);
    }
    case 2: { // CANCEL
      const questId = pkt.readInt();
      await deleteTrusteeship(ctx.db.db, p.id, questId);
      return sendList(p, active.filter((a) => a.QuestID !== questId));
    }
    case 3: { // SPEED_UP
      const questId = pkt.readInt();
      pkt.readBoolean(); // isBand — ignorado (sem precedente C#: o pacote 142 análogo também só lê e descarta)
      const entry = active.find((a) => a.QuestID === questId);
      if (!entry) return sendList(p, active);
      const now = ctx.now();
      const freeViaKingBless = (p.extra?.KingBlessIndex ?? 0) > 0 && (p.extra?.KingBlessEnddate ?? now) > now;
      if (!freeViaKingBless) {
        const minutesLeft = Math.ceil(Math.max(0, entry.EndTime.getTime() - now.getTime()) / 60_000);
        const cost = minutesLeft * cfg(ctx).speedUpPerMin;
        if (!canAfford(p, cost)) return p.sendMessage(0, "Xu insuficiente para acelerar.");
        p.removeMoney(cost);
      }
      await upsertTrusteeship(ctx.db.db, p.id, questId, now);
      return sendList(p, await sweep(ctx, p));
    }
    case 4: { // BUY_SPIRIT
      pkt.readBoolean(); // isBand — ignorado, mesma simplificação acima
      const c = cfg(ctx);
      if (spiritOf(p) >= c.maxSpirit) return p.sendMessage(0, "Energia espiritual já está no máximo.");
      if (!canAfford(p, c.buyCost)) return p.sendMessage(0, "Xu insuficiente.");
      p.removeMoney(c.buyCost);
      await setSpirit(ctx, p, Math.min(c.maxSpirit, spiritOf(p) + c.buyAmount));
      return p.send(Out.trusteeshipSpirit(p.id, spiritOf(p)));
    }
    case 5: { // USE_SPIRIT_ITME — place, bagType, num (QuickUseFrame.as:127); item CategoryID==11 Property1==24
      const place = pkt.readInt();
      const bagType = pkt.readInt();
      const num = pkt.readInt();
      const inv = p.getInventory(bagType);
      const it = inv?.getItemAt(place);
      if (!it || it.template.CategoryID !== 11 || it.template.Property1 !== 24) return;
      const c = cfg(ctx);
      const room = c.maxSpirit - spiritOf(p);
      if (room <= 0) return p.sendMessage(0, "Energia espiritual já está no máximo.");
      const perUnit = it.template.Property2 || c.buyAmount;
      const n = Math.max(1, Math.min(Math.max(1, num), it.Count, Math.ceil(room / Math.max(1, perUnit))));
      inv!.removeCountFromStack(it, n);
      await setSpirit(ctx, p, Math.min(c.maxSpirit, spiritOf(p) + perUnit * n));
      return sendList(p, active);
    }
  }
}
