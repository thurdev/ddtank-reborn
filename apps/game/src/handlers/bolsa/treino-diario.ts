/**
 * Aba na bolsa nova (6600): "Sist. Treino" — 155 EVERYDAY_ACTIVEPOINT. Sub-byte (`ActivityPackageType`,
 * vendor/DDT-6600/Source/Game.Server/Game.Server.Packets/ActivityPackageType.cs):
 *   1 EVERYDAYACTIVEPOINT_DATA   (`enterDayActivity()`, sem params)      -> servidor responde sub 1 com o estado do dia
 *   5 REUSEMONEYPOINT_COMPLETE   (`addSpeed(type,id)`)                   -> servidor responde sub 3 USEMONEYPOINT_COMPLETE
 *   6 REGETACTIVEPOINT_REWARD    (`sendGetGoods(type)`)                  -> servidor responde sub 4 GETACTIVEPOINT_REWARD
 *   8 GET_EXPBLESSED_DATA        (`sendExpBlessedData()`, sem params)    -> servidor responde sub 8 (mesmo sub)
 * (2 EVERYDAYACTIVEPOINT_CHANGE, 7 ADD_ACTIVITY_DATA_CHANGE são push-only do servidor, não implementados aqui —
 * sem hook de progresso ao vivo nesta tarefa, ver nota abaixo.)
 *
 * C#: `EverydayActivePointHandler.cs` (155, decompilado por completo) é um stub — só trata o sub 8
 * (`client.Player.Out.SendExpBlessedData` -> `AbstractPacketLib.cs:2552` byte 8 + int 0 fixo); todo o resto só
 * faz `Console.WriteLine("ActivityPackageType." + b)` e NÃO responde nada (nem sub 1 "enterDayActivity" tem
 * handler real nesse binário — bug/conteúdo cortado do build original). As tabelas
 * `Every_Day_Active_Point_Template`/`Every_Day_Active_Reward_Template` têm 0 linhas na origem (nunca
 * configuradas nesse servidor). Como não há contraparte C# pra copiar, o motor de pontos/ação/recompensa
 * abaixo segue o CONTRATO DE PACOTE do AS3 (única fonte confiável: `GameSocketOut.as`
 * addSpeed/sendGetGoods/enterDayActivity/sendExpBlessedData + `dayActivity/DayActivityManager.as`
 * dayActivity/initActivityList/addSpeedResp/changGoodsBtn, linha a linha) — com as tabelas vazias o resultado
 * visível é uma lista sem atividades (sem exploit, sem diferença de comportamento do original quebrado); o
 * admin popula depois.
 *
 * Tiers de recompensa 1-4 com limiares fixos 30/60/80/100 (`DayActivityManager.as:240-255 isHasActivityAward`,
 * hardcoded no cliente, não vem de tabela) — claim único por tier por dia via `claimOnce` (kind "everydayActive").
 * `sessionArr`/"find back" (recuperação de contas antigas, `WantStrongManager`) não são escritos (count3/count4
 * sempre 0) — fora do escopo desta tarefa, sem efeito visível hoje (sem dados de regresso de jogador antigo).
 *
 * Como testar: apps/game/test/client-6600-m3-everyday-active.test.ts.
 */
import { and, eq } from "drizzle-orm";
import { app } from "@ddt/db";
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";
import { claimOnce, dayKey, hasClaim, type EveryDayActivePointRow } from "../../game/events.js";
import { eventsRuntime, give } from "../eventos/agendador.js";

/** DayActivityManager.as:240-255 isHasActivityAward — limiares fixos no cliente, não em tabela. */
const TIERS = [1, 2, 3, 4] as const;
const TIER_THRESHOLD: Record<number, number> = { 1: 30, 2: 60, 3: 80, 4: 100 };

function activeTemplates(ctx: ServerContext, p: GamePlayer): EveryDayActivePointRow[] {
  const grade = p.info.Grade;
  return eventsRuntime(ctx).data.everyDayActivePoint.filter((t) => grade >= t.MinLevel && grade <= t.MaxLevel);
}

async function loadProgress(ctx: ServerContext, p: GamePlayer, day: string): Promise<Map<number, number>> {
  const rows = await ctx.db.db
    .select()
    .from(app.EveryDayActiveProgress)
    .where(and(eq(app.EveryDayActiveProgress.UserID, p.id), eq(app.EveryDayActiveProgress.Day, day)));
  return new Map(rows.map((r) => [r.ActivityID, r.Count]));
}

async function setProgress(ctx: ServerContext, p: GamePlayer, day: string, activityId: number, count: number): Promise<void> {
  await ctx.db.db
    .insert(app.EveryDayActiveProgress)
    .values({ UserID: p.id, Day: day, ActivityID: activityId, Count: count })
    .onConflictDoUpdate({ target: [app.EveryDayActiveProgress.UserID, app.EveryDayActiveProgress.Day, app.EveryDayActiveProgress.ActivityID], set: { Count: count } });
}

/** Soma de `ActivePoint` das atividades já 100% concluídas hoje (binário — ver OverList/NoOverList no AS3). */
function sumActivityValue(templates: EveryDayActivePointRow[], progress: Map<number, number>): number {
  let total = 0;
  for (const t of templates) if ((progress.get(t.ID) ?? 0) >= t.Count) total += t.ActivePoint;
  return total;
}

// ------------------------------------------------------------------ 1 EVERYDAYACTIVEPOINT_DATA (enterDayActivity)
async function sendDayActivityData(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const day = dayKey(ctx.now());
  const templates = activeTemplates(ctx, p);
  const progress = await loadProgress(ctx, p, day);
  const value = sumActivityValue(templates, progress);
  const out = new GSPacket(155, p.id);
  out.writeByte(1);
  out.writeInt(templates.length);
  for (const t of templates) { out.writeInt(t.ID); out.writeInt(Math.min(progress.get(t.ID) ?? 0, t.Count)); }
  out.writeInt(TIERS.length);
  for (const tier of TIERS) {
    const claimed = await hasClaim(ctx.db.db, p.id, "everydayActive", `${day}:${tier}`);
    out.writeInt(tier); out.writeInt(claimed ? 1 : 0);
  }
  out.writeInt(0); // sessionArr — sem hook de progresso ao vivo nesta tarefa
  out.writeInt(value);
  out.writeInt(0); // findBackDic (regresso de jogador antigo) — fora do escopo
  const done = templates.filter((t) => (progress.get(t.ID) ?? 0) >= t.Count).map((t) => t.ID);
  out.writeString(done.join("|"));
  p.send(out);
}

// ------------------------------------------------------------------ 5 REUSEMONEYPOINT_COMPLETE (addSpeed)
async function addSpeed(ctx: ServerContext, p: GamePlayer, type: number, id: number): Promise<void> {
  const day = dayKey(ctx.now());
  const templates = activeTemplates(ctx, p);
  const t = templates.find((x) => x.ID === id && x.ActivityType === type);
  const progress = await loadProgress(ctx, p, day);
  const current = progress.get(id) ?? 0;
  let ok = false;
  if (t && current < t.Count) {
    const cost = t.MoneyPoint;
    const c = p.info;
    if (cost <= 0 || cost <= c.Money + c.MoneyLock) {
      if (cost > 0) p.removeMoney(cost);
      await setProgress(ctx, p, day, id, t.Count);
      progress.set(id, t.Count);
      ok = true;
    }
  }
  const value = sumActivityValue(templates, progress);
  const out = new GSPacket(155, p.id);
  out.writeByte(3);
  out.writeInt(id);
  out.writeBoolean(ok);
  out.writeInt(value);
  out.writeInt(id);
  p.send(out);
}

// ------------------------------------------------------------------ 6 REGETACTIVEPOINT_REWARD (sendGetGoods)
async function getActivePointReward(ctx: ServerContext, p: GamePlayer, tier: number): Promise<void> {
  const day = dayKey(ctx.now());
  let ok = false;
  if (TIER_THRESHOLD[tier] != null) {
    const templates = activeTemplates(ctx, p);
    const progress = await loadProgress(ctx, p, day);
    const value = sumActivityValue(templates, progress);
    if (value >= TIER_THRESHOLD[tier] && (await claimOnce(ctx.db.db, p.id, "everydayActive", `${day}:${tier}`))) {
      const rows = eventsRuntime(ctx).data.everyDayActiveReward.get(tier) ?? [];
      const rewards = rows.map((r) => ({ templateId: r.RewardItemID, count: r.RewardItemCount, validDate: r.RewardItemValid, isBind: r.IsBind, strengthenLevel: r.StrengthenLevel }));
      if (rewards.length) await give(ctx, p, rewards, "Sist. Treino");
      ok = true;
    }
  }
  const out = new GSPacket(155, p.id);
  out.writeByte(4);
  out.writeInt(tier);
  out.writeBoolean(ok);
  p.send(out);
}

// ------------------------------------------------------------------ 8 GET_EXPBLESSED_DATA
/** EverydayActivePointHandler.cs:14-17 + AbstractPacketLib.cs:2552-2558 (SendExpBlessedData): sempre 0, sem lógica. */
function sendExpBlessedData(p: GamePlayer): void {
  const out = new GSPacket(155, p.id);
  out.writeByte(8);
  out.writeInt(0);
  p.send(out);
}

export function registerTreinoDiario(r: HandlerRegistry): void {
  r.player(155, "EVERYDAY_ACTIVEPOINT", (ctx, p, pkt) => {
    const sub = pkt.readByte();
    switch (sub) {
      case 1: return sendDayActivityData(ctx, p);
      case 5: { const type = pkt.readInt(); const id = pkt.readInt(); return addSpeed(ctx, p, type, id); }
      case 6: { const tier = pkt.readInt(); return getActivePointReward(ctx, p, tier); }
      case 8: return sendExpBlessedData(p);
      default: return; // demais subs (2/3/4/7, push-only do servidor) — sem handler de entrada, igual ao original
    }
  });
}
