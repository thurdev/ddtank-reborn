/**
 * Aba no jogo: calendário › presença mensal (assinatura de presença + prêmio por dias acumulados) e login
 * acumulado (7 dias seguidos). `signIn` é chamado pelo sub-tipo 5 de 13 DAILY_AWARD (ver `recompensa-diaria.ts`);
 * aqui moram o registro do dia marcado, o resgate por marco de dias do mês (90) e o resgate por dias de
 * login consecutivos (338).
 * Pacotes: 90 GET_SIGNAWARD, 338 ACCUMULATIVELOGIN_AWARD (4.1) / 238 (6600, m3-accumulative-login) — 13/5
 *   marca o dia, sem pacote de resposta próprio.
 * C#: `SignAwardHandler.cs`, `AccumulAtiveLoginAwardHandler.cs`.
 * Como testar: `apps/game/test/client-6600-m3-accumulative-login.test.ts`. Manual: `docs/features/eventos.md`.
 *
 * m3-accumulative-login (2026-10-18): `ACCUMULATIVELOGIN_AWARD` colide de VALOR entre as versões — 4.1
 * `= 338` (`Game.Server/Packets/ePackageType.cs:248`), 6600 `= 238` (`ePackageType.as:592`, onde 238 é
 * `MARRYINFO_DELETE` no 4.1 — não implementado nos dois lados, sem risco de corromper outra feature).
 * `AccumulAtiveLoginAwardHandler.cs` (6600) é idêntico em lógica ao que já estava aqui (mesmo loop dia a
 * dia, mesmo formato de resposta); o bug era só o código de saída fixo em 338, que nunca chegava num
 * cliente 6600 porque ele manda 238. Ver `handlers/eventos/index.ts` pro registro dos dois códigos.
 */
import { eq } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import { player as P } from "@ddt/db";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { claimOnce, dayKey, monthKey, type Reward } from "../../game/events.js";
import { eventsRuntime, give } from "./agendador.js";

/** 13 type 5 (DailyAwardHandler case 5): marks today in DailyLogList; the original accepted any number of signs per day. */
export async function signIn(ctx: ServerContext, p: GamePlayer): Promise<boolean> {
  const db = ctx.db.db;
  const now = ctx.now();
  if (!(await claimOnce(db, p.id, "sign", dayKey(now)))) return false;
  const [row] = await db.select().from(P.DailyLogList).where(eq(P.DailyLogList.UserID, p.id)).limit(1);
  const sameMonth = row && row.LastDate && monthKey(row.LastDate) === monthKey(now);
  const days = sameMonth && row.DayLog ? row.DayLog.split(",") : [];
  const d = now.getUTCDate();
  while (days.length < d) days.push("False");
  days[d - 1] = "True";
  const signed = days.filter((x) => x === "True").length;
  const values = { DayLog: days.join(","), UserAwardLog: signed, LastDate: now };
  if (row) await db.update(P.DailyLogList).set(values).where(eq(P.DailyLogList.ID, row.ID));
  else await db.insert(P.DailyLogList).values({ UserID: p.id, ...values });
  return true;
}

/** 90 GET_SIGNAWARD (AwardMgr.AddSignAwards): tier must exist and be reached this month; once per month+tier. */
export async function signAward(ctx: ServerContext, p: GamePlayer, count: number): Promise<boolean> {
  const rt = eventsRuntime(ctx);
  const db = ctx.db.db;
  const now = ctx.now();
  if (!rt.data.signTiers().includes(count)) return false;
  const [row] = await db.select().from(P.DailyLogList).where(eq(P.DailyLogList.UserID, p.id)).limit(1);
  const signed = row && row.LastDate && monthKey(row.LastDate) === monthKey(now) ? (row.DayLog ?? "").split(",").filter((x) => x === "True").length : 0;
  if (signed < count) return false;
  if (!(await claimOnce(db, p.id, "signaward", `${monthKey(now)}:${count}`))) return false;
  const rewards: Reward[] = rt.data.dailyAward.filter((d) => d.AwardDays === count && (d.Type === 1 || d.Type === 7) && (d.Sex === 0 || d.Sex === (p.info.Sex ? 1 : 2)))
    .map((d) => (d.Type === 7 ? { templateId: -1100, count: d.Count } : { templateId: d.TemplateID, count: d.Count, validDate: d.ValidDate, isBind: d.IsBinds }));
  const s = await give(ctx, p, rewards, "Prêmio de presença");
  p.sendMessage(0, `Presente de presença diária recebido com sucesso! ${s}`);
  return true;
}

export function signAwardHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  void signAward(ctx, p, pkt.readInt());
}

/** 338 (4.1) / 238 (6600) ACCUMULATIVELOGIN_AWARD: days 1..6 fixed lists, day 7 the selected template
 *  (Login_Award_Item_Template Type = day). Reply code mirrors the request code (AccumulAtiveLoginAwardHandler.cs
 *  always answers on the SAME code it was called on — 338 for 4.1, 238 for 6600, never cross-wired). */
export async function accumulativeLogin(ctx: ServerContext, p: GamePlayer, selected: number): Promise<void> {
  const rt = eventsRuntime(ctx);
  const c = p.info;
  for (let day = (c.accumulativeAwardDays ?? 0) + 1; day <= (c.accumulativeLoginDays ?? 0); day++) {
    const rows = rt.data.loginAward.filter((r) => r.Type === day && (day < 7 || r.RewardItemID === selected));
    if (!rows.length) break;
    if (!(await claimOnce(ctx.db.db, p.id, "accaward", String(day)))) { c.accumulativeAwardDays = day; continue; }
    const s = await give(ctx, p, rows.map((r) => ({ templateId: r.RewardItemID, count: r.RewardItemCount, validDate: r.RewardItemValid, isBind: r.IsBind, strengthenLevel: r.StrengthenLevel })), `Presente de ${day} dia(s) de login`);
    c.accumulativeAwardDays = day;
    p.sendMessage(0, `Presente de ${day} dia(s) de login: ${s}`);
  }
  const out = new GSPacket(p.clientKind === "6600" ? 238 : 338, p.id);
  out.writeInt(c.accumulativeLoginDays ?? 0);
  out.writeInt(c.accumulativeAwardDays ?? 0);
  p.send(out);
}

export function accumulativeLoginHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  return accumulativeLogin(ctx, p, pkt.readInt());
}
