/**
 * Aba no jogo: ícone do hall "Ativação do pintinho" (ChickActivation / "Code Ga Hanh", "código do galo") —
 * resgata um código de 14 chars (ou usa o item 201316) pra abrir uma janela de 60 dias, dentro da qual dá
 * pra reivindicar até 4 tipos de prêmio: diário (qualquer um dos 7 ícones de dia da semana resgata o "de
 * hoje" uma vez), fim de semana (sex/sáb/dom), semanal (só sábado) e 10 marcos de nível.
 *
 * `ActivityPackageHandler.cs:20-282`: todo `case` exceto `ChickActivationType.CHICKACTIVATION` (=2, mesmo
 * valor nos enums C# e AS3) é código morto comentado no original (GROWTHPACKAGE, casa da magia, zodíaco,
 * pool de bilhete de loteria, PvePowerBuff) — nada disso foi portado. Recompensas sempre vão por CORREIO
 * (`WorldEventMgr.SendItemsToMails`), nunca pra bolsa, igual ao original. Estado vive em
 * `Sys_Active_System_Data.ChickActiveData` (CSV no original — mantido CSV, mesma coluna, mesmos 7 campos;
 * só timestamps ISO em vez de formatados por locale).
 *
 * Pool de recompensa (`ActivitySystemItemInfo` ActivityType 40) e tabela de código de ativação
 * (`PlayerBussiness.ActiveChickCode`) nunca foram migradas do .bak (nenhuma tabela existe neste port) —
 * mesma lacuna do bau-da-galinha/estrela-da-sorte, mesma solução: configurável via `app."ScheduledEvents"`
 * kind "chickactivation" (params.pools[quality] / params.codes), com default embutido. Um código é
 * consumido globalmente (não por jogador) exatamente uma vez via `claimOnce`.
 *
 * O ícone do hall em si (`ServerConfigManager.chickActivationIsOpen`, chave ISCHICKENACTIVEKEYOPEN) é
 * servido pelo equivalente apps/api de `serverconfig.ashx`, fora destes arquivos — ver research/qa/port-C.md.
 *
 * Pacotes: 84 ACTIVITY_PACKAGE (type 1 OPENKEY, 2 GETAWARD, 3 QUERY).
 * C#: `ActivityPackageHandler.cs`, `PropUseHandler.cs:31-43` (item 201316, ver `activateChickItem`).
 * Como testar: sem teste automatizado dedicado ainda. Manual: `docs/features/eventos.md`.
 */
import { eq } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import { player as P } from "@ddt/db";
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { PlayerInventory } from "../../game/inventory.js";
import type { ServerContext } from "../../session/context.js";
import { claimOnce } from "../../game/events.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { paramsOf, type PoolItem } from "./agendador.js";

export interface ChickActive { isKeyOpened: 0 | 1; keyOpenedType: number; keyOpenedTime: Date; everyDay: Date; weekly: Date; afterThreeDays: Date; currentLvAward: number }

const CHICK_DEFAULT_CODES = ["DDTANKREBORN01"];
const CHICK_GRADE_VAL = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
const CHICK_LEVEL_NEED = [5, 10, 25, 30, 40, 45, 48, 50, 55, 60];
const CHICK_QUALITY_ARR = [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10000, 10009, 10010];
/** Counts are kept small (<=10) on purpose: unlike chickenbox/luckystar above, ChickActivation always mails (never
 *  bags), and mailItems chunks 5 stacks per mail row — a big count of a small-MaxCount item would spam the inbox. */
const DEFAULT_CHICKACTIVE_POOL: Record<string, PoolItem[]> = {
  "1": [{ templateId: 11456, count: 1 }],
  "2": [{ templateId: 11456, count: 2 }, { templateId: 11408, count: 2 }],
  "3": [{ templateId: 11408, count: 5 }],
  "101": [{ templateId: 11456, count: 2 }],
  "102": [{ templateId: 11456, count: 4 }, { templateId: 11408, count: 4 }],
  "103": [{ templateId: 11408, count: 10 }],
  "10001": [{ templateId: 112059, count: 1 }], "10002": [{ templateId: 112059, count: 2 }], "10003": [{ templateId: 112059, count: 3 }],
  "10004": [{ templateId: 11408, count: 3 }], "10005": [{ templateId: 11408, count: 5 }],
  "10006": [{ templateId: 11456, count: 2 }], "10007": [{ templateId: 11456, count: 3 }], "10000": [{ templateId: 11456, count: 5 }],
  "10009": [{ templateId: 112059, count: 2 }], "10010": [{ templateId: 112059, count: 5 }],
};
function chickPool(ctx: ServerContext, quality: number): PoolItem[] {
  const pools = paramsOf(ctx, "chickactivation").pools as Record<string, PoolItem[]> | undefined;
  const key = String(quality);
  const configured = pools?.[key];
  return Array.isArray(configured) && configured.length ? configured : (DEFAULT_CHICKACTIVE_POOL[key] ?? []);
}
function chickCodes(ctx: ServerContext): string[] {
  const codes = paramsOf(ctx, "chickactivation").codes;
  return Array.isArray(codes) && codes.every((c) => typeof c === "string") ? (codes as string[]) : CHICK_DEFAULT_CODES;
}

function defaultChickActive(now: Date): ChickActive {
  return { isKeyOpened: 0, keyOpenedType: 0, keyOpenedTime: now, everyDay: new Date(now.getTime() - 86_400_000), weekly: new Date(now.getTime() - 7 * 86_400_000), afterThreeDays: new Date(now.getTime() - 86_400_000), currentLvAward: 0 };
}
function packChickActive(c: ChickActive): string {
  return [c.isKeyOpened, c.keyOpenedType, c.keyOpenedTime.toISOString(), c.everyDay.toISOString(), c.weekly.toISOString(), c.afterThreeDays.toISOString(), c.currentLvAward].join(",");
}
function unpackChickActive(s: string, now: Date): ChickActive {
  const parts = s === "0" ? [] : s.split(",");
  if (parts.length < 7) return defaultChickActive(now);
  const d = (x: string) => { const t = new Date(x); return Number.isNaN(t.getTime()) ? now : t; };
  return { isKeyOpened: Number(parts[0]) ? 1 : 0, keyOpenedType: Number(parts[1]) || 0, keyOpenedTime: d(parts[2]!), everyDay: d(parts[3]!), weekly: d(parts[4]!), afterThreeDays: d(parts[5]!), currentLvAward: Number(parts[6]) || 0 };
}
async function loadChickActive(ctx: ServerContext, p: GamePlayer): Promise<{ id: number | null; data: ChickActive }> {
  const [row] = await ctx.db.db.select().from(P.Sys_Active_System_Data).where(eq(P.Sys_Active_System_Data.UserID, p.id)).limit(1);
  if (!row) return { id: null, data: defaultChickActive(ctx.now()) };
  return { id: row.ID, data: unpackChickActive(row.ChickActiveData, ctx.now()) };
}
async function saveChickActive(ctx: ServerContext, p: GamePlayer, id: number | null, data: ChickActive): Promise<void> {
  const packed = packChickActive(data);
  if (id != null) await ctx.db.db.update(P.Sys_Active_System_Data).set({ ChickActiveData: packed }).where(eq(P.Sys_Active_System_Data.ID, id));
  else await ctx.db.db.insert(P.Sys_Active_System_Data).values({ UserID: p.id, ChickActiveData: packed });
}

const onThreeDay = (d: Date): boolean => [0, 5, 6].includes(d.getUTCDay()); // Fri/Sat/Sun
function startOfWeekSaturday(d: Date): Date {
  const dow = d.getUTCDay();
  let diff = dow - 6; if (diff < 0) diff += 7;
  const r = new Date(d.getTime() - diff * 86_400_000);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}
const sameUtcDay = (a: Date, b: Date): boolean => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

/** The 12-int status row both CHICKACTIVATION_LOGIN (query reply) and _UPDATE (post-claim reply) share:
 *  Mon..Sun daily-claim flags, the weekend flag written 3x (one per UI slot, same gate), the weekly flag, then
 *  CurrentLvAward. 0 = claimable now, 1 = locked (already claimed today / wrong day of week). */
function chickStatusInts(c: ChickActive, now: Date): number[] {
  const dailyOpen = !sameUtcDay(c.everyDay, now);
  const day = (dow: number) => (dailyOpen && now.getUTCDay() === dow ? 0 : 1);
  const weekend = !sameUtcDay(c.afterThreeDays, now) && onThreeDay(now) ? 0 : 1;
  const weekly = c.weekly.getTime() < startOfWeekSaturday(now).getTime() && now.getUTCDay() === 6 ? 0 : 1;
  return [day(1), day(2), day(3), day(4), day(5), day(6), day(0), weekend, weekend, weekend, weekly, c.currentLvAward];
}
function chickReplyPkt(p: GamePlayer, type: number, c: ChickActive, now: Date): GSPacket {
  const out = new GSPacket(84, p.id);
  out.writeInt(2); // ChickActivationType.CHICKACTIVATION (same value in both C# and AS3 enums)
  out.writeInt(type); // 1 CHICKACTIVATION_LOGIN (query reply) / 2 CHICKACTIVATION_UPDATE (post-claim reply)
  out.writeInt(c.isKeyOpened);
  out.writeInt(1); // the original always writes a literal 1 here (an unused "keyIndex" slot the client reads and ignores)
  out.writeDateTime(c.keyOpenedTime);
  out.writeInt(c.keyOpenedType);
  for (const n of chickStatusInts(c, now)) out.writeInt(n);
  return out;
}

/** `PropUseHandler.cs:31-43`: o item 201316 ativa o mesmo cadastro consultado pelo pacote 84.
 * `data` contém o estado persistido; apenas a primeira ativação consome uma unidade da pilha.
 */
export async function activateChickItem(ctx: ServerContext, p: GamePlayer, inv: PlayerInventory, prop: ItemInfo): Promise<void> {
  const { id, data } = await loadChickActive(ctx, p);
  if (data.isKeyOpened || inv.getItemAt(prop.Place) !== prop || prop.Count < 1 || prop.TemplateID !== 201316) {
    p.sendMessage(0, ctx.lang.t("PropUseHandler.ChickActivation.Fail"));
    return;
  }
  const now = ctx.now();
  data.isKeyOpened = 1;
  data.keyOpenedType = p.info.Grade > 15 ? 2 : 1;
  data.keyOpenedTime = now;
  data.everyDay = new Date(now.getTime() - 86_400_000);
  data.afterThreeDays = new Date(now.getTime() - 86_400_000);
  data.weekly = new Date(startOfWeekSaturday(now).getTime() - 7 * 86_400_000);
  await saveChickActive(ctx, p, id, data);
  inv.removeCountFromStack(prop, 1);
  p.send(chickReplyPkt(p, 2, data, now));
  p.sendMessage(0, ctx.lang.t("PropUseHandler.ChickActivation.Success"));
}

/** Builds mail-only items for one reward quality (ActivitySystemItemInfo rows never go to the bag in the original). */
async function mailChickAward(ctx: ServerContext, p: GamePlayer, quality: number, title: string): Promise<boolean> {
  const rows = chickPool(ctx, quality);
  if (!rows.length) return false;
  const now = ctx.now();
  const items: ItemInfo[] = [];
  for (const row of rows) {
    const t = ctx.templates.findItem(row.templateId);
    if (!t) continue;
    const max = Math.max(1, t.MaxCount || 1);
    for (let left = row.count; left > 0; left -= max) {
      const it = ItemInfo.createFromTemplate(t, Math.min(max, left), 113, now);
      it.ValidDate = row.validDate ?? 0;
      it.IsBinds = row.isBind ?? true;
      items.push(it);
    }
  }
  if (!items.length) return false;
  await mailItems(ctx, p, items, title, 8);
  return true;
}

export async function activityPackageHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const cmd = pkt.readInt();
  if (cmd !== 2) return; // ChickActivationType.CHICKACTIVATION=2 is the only live case; see header note
  const type = pkt.readInt();
  const now = ctx.now();
  const t = (k: string, fb: string, ...args: unknown[]) => { const v = ctx.lang.t(k, ...args); return v === k ? fb : v; };
  if (type === 3) { // CHICKACTIVATION_QUERY
    const { data } = await loadChickActive(ctx, p);
    p.send(chickReplyPkt(p, 1, data, now));
    return;
  }
  if (type === 1) { // CHICKACTIVATION_OPENKEY
    const code = pkt.readString();
    const { id, data } = await loadChickActive(ctx, p);
    if (code.length !== 14 || data.isKeyOpened !== 0) return; // original silently ignores malformed/already-open attempts
    if (!chickCodes(ctx).includes(code)) return void p.sendMessage(0, t("ActivityPackageHandler.ChickActivation.NotExit", "Código não encontrado."));
    if (!(await claimOnce(ctx.db.db, 0, "chickcode", code))) return void p.sendMessage(0, t("ActivityPackageHandler.ChickActivation.IsUsed", "Este código já foi utilizado."));
    data.isKeyOpened = 1;
    data.keyOpenedType = p.info.Grade > 15 ? 2 : 1;
    data.keyOpenedTime = now;
    data.everyDay = new Date(now.getTime() - 86_400_000);
    data.afterThreeDays = new Date(now.getTime() - 86_400_000);
    data.weekly = new Date(startOfWeekSaturday(now).getTime() - 7 * 86_400_000);
    await saveChickActive(ctx, p, id, data);
    p.send(chickReplyPkt(p, 2, data, now));
    p.sendMessage(0, t("ActivityPackageHandler.ChickActivation.Success", "Código ativado com sucesso!"));
    return;
  }
  if (type === 2) { // CHICKACTIVATION_GETAWARD
    const awardType = pkt.readInt();
    const awardIndex = pkt.readInt();
    const { id, data } = await loadChickActive(ctx, p);
    const keyValid = data.isKeyOpened === 1 && data.keyOpenedTime.getTime() + 60 * 86_400_000 >= now.getTime();
    if (!keyValid) return void p.sendMessage(0, t("ActivityPackageHandler.ChickActivation.NotActive", "Você ainda não ativou o código."));
    let quality = 0, title = "", msg = "";
    if (awardType <= 7 && !sameUtcDay(data.everyDay, now)) {
      data.everyDay = now; quality = data.keyOpenedType === 2 ? 101 : 1;
      title = t("ActivityPackageHandler.ChickActivation.DaylyAward.Title", "Presente diário");
      msg = t("ActivityPackageHandler.ChickActivation.DaylyAward.Msg", "Presente diário recebido! Confira seu correio.");
    } else if (awardType <= 10 && !sameUtcDay(data.afterThreeDays, now) && onThreeDay(now)) {
      data.afterThreeDays = now; quality = data.keyOpenedType === 2 ? 102 : 2;
      title = t("ActivityPackageHandler.ChickActivation.WeekenAward.Title", "Presente de fim de semana");
      msg = t("ActivityPackageHandler.ChickActivation.WeekenAward.Msg", "Presente de fim de semana recebido! Confira seu correio.");
    } else if (awardType === 11 && data.weekly.getTime() < startOfWeekSaturday(now).getTime() && now.getUTCDay() === 6) {
      data.weekly = startOfWeekSaturday(now); quality = data.keyOpenedType === 2 ? 103 : 3;
      title = t("ActivityPackageHandler.ChickActivation.WeeklyAward.Title", "Presente semanal");
      msg = t("ActivityPackageHandler.ChickActivation.WeeklyAward.Msg", "Presente semanal recebido! Confira seu correio.");
    } else if (awardType === 12 && awardIndex >= 1 && awardIndex <= 10 && data.keyOpenedType === 1
      && CHICK_GRADE_VAL[awardIndex - 1]! > data.currentLvAward && p.info.Grade >= CHICK_LEVEL_NEED[awardIndex - 1]!) {
      data.currentLvAward += CHICK_GRADE_VAL[awardIndex - 1]!;
      quality = CHICK_QUALITY_ARR[awardIndex - 1]!;
      const lvl = CHICK_LEVEL_NEED[awardIndex - 1];
      title = t("ActivityPackageHandler.ChickActivation.LevelAward.Title", `Presente de nível ${lvl}`, lvl);
      msg = t("ActivityPackageHandler.ChickActivation.LevelAward.Msg", `Presente de nível ${lvl} recebido! Confira seu correio.`, lvl);
    } else {
      p.sendMessage(0, t("ActivityPackageHandler.ChickActivation.NotFoundAward", "Nenhuma recompensa disponível."));
      return;
    }
    if (!(await mailChickAward(ctx, p, quality, title))) {
      p.sendMessage(0, t("ActivityPackageHandler.ChickActivation.NotFoundAward", "Nenhuma recompensa disponível."));
      return;
    }
    await saveChickActive(ctx, p, id, data);
    p.send(chickReplyPkt(p, 2, data, now));
    p.sendMessage(0, msg);
    return;
  }
}
