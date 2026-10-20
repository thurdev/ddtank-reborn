/**
 * Aba no jogo: nenhuma tela própria — este arquivo é o MOTOR que liga o `app."ScheduledEvents"` (admin)
 * aos eventos do lobby (boss mundial, liga, elite, double exp/gold, reset semanal) e empresta pros outros
 * arquivos desta pasta os helpers de configuração (`paramsOf`/`isOpen`/`pool`/`num`/`arr`) e o acesso ao
 * estado compartilhado por jogador (`EventsRuntime`, um por `ServerContext`).
 * Pacotes: nenhum direto. `eventsOnLogin`/`eventsOnQuit` são o gancho do login/logout (ver `session/login.ts`).
 * C#: `EventScheduler`/`ActiveSystemHandler` equivalente não existe 1:1 — isto é a ponte TS nova pro
 * `app."ScheduledEvents"` (admin), cada `kind` mapeando pra uma feature destes arquivos.
 * Como testar: `apps/game/test/events.test.ts` (scheduler/weeklyReset), `activities.test.ts`.
 */
import { sql } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { EventData, claimOnce, dayKey, grantRewards, updateRecords, weekKey, type Reward } from "../../game/events.js";
import { EventScheduler, loadScheduledEvents, nextStart, type ActiveWindow, type ScheduledEvent } from "../../game/scheduler.js";
import * as Out from "../../packets/out.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { finishWorldBoss, rankList, worldBossOpen, type WorldBossState } from "./boss-mundial.js";
import { defaultEliteBracket, eliteStatusPkt, finishEliteChampion, startEliteChampion, type EliteBracketState } from "./liga-elite.js";
import { settleGuildWeek, settlePollWeek } from "../sociedade/index.js";

// ------------------------------------------------------------------ config de evento agendado (admin)
/** Formato comum de item de recompensa configurável pelo admin (bau da galinha, estrela da sorte, ativação do pintinho). */
export interface PoolItem { templateId: number; count: number; validDate?: number; isBind?: boolean; quality?: number; weight?: number }

function paramsOf(ctx: ServerContext, kind: string): Record<string, unknown> {
  return (eventsRuntime(ctx).scheduler.events.find((e) => e.kind === kind)?.params ?? {}) as Record<string, unknown>;
}
/** Se a janela admin pro `kind` existe e está habilitada (features sem janela ficam sempre abertas).
 *  ALL_OPEN=true (QA dev switch, cfg.ALL_OPEN) sempre responde aberto, inclusive se o admin desligou
 *  explicitamente (`enabled:false`) — chickenbox/luckystar/labyrinth usam este helper. */
function isOpen(ctx: ServerContext, kind: string): boolean {
  if (ctx.cfg.ALL_OPEN) return true;
  const ev = eventsRuntime(ctx).scheduler.events.find((e) => e.kind === kind);
  return !ev || ev.enabled !== false;
}
function pool(ctx: ServerContext, kind: string, fallback: PoolItem[]): PoolItem[] {
  const p = paramsOf(ctx, kind).pool;
  return Array.isArray(p) && p.length ? (p as PoolItem[]) : fallback;
}
function num(ctx: ServerContext, kind: string, key: string, fb: number): number {
  const v = paramsOf(ctx, kind)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fb; // 0 is a valid admin override (e.g. a free feature)
}
function arr(ctx: ServerContext, kind: string, key: string, fb: number[]): number[] {
  const v = paramsOf(ctx, kind)[key];
  return Array.isArray(v) && v.every((x) => typeof x === "number") ? (v as number[]) : fb;
}
export { paramsOf, isOpen, pool, num, arr };
/** Alias público: `session/login.ts` usa pra decidir se mostra o ícone do hall. */
export { isOpen as activityOpen };

// ------------------------------------------------------------------ runtime por ServerContext
export class EventsRuntime {
  data = new EventData();
  scheduler: EventScheduler;
  boss: WorldBossState = { window: null, name: "boss", resourceId: "0", pveId: 0, maxBlood: 0, blood: 0, players: new Map(), rank: new Map() };
  /** EliteGameController bitmask: 1 score 30-40, 2 champion 30-40, 4 score 41-50, 8 champion 41-50. 0 = closed. */
  eliteStatus = 0;
  /** m3-elite-brackets: motor de chaveamento real por trás dos bits 2|8 acima (liga-elite.ts). */
  elite: EliteBracketState = defaultEliteBracket();
  leagueOpen = false;
  log: string[] = [];
  /** ALL_OPEN: force-open world boss/league/elite exactly once (not every reload() — re-forcing would
   *  re-key the window and spuriously fire onEnd/onStart, e.g. re-paying world-boss rank rewards). */
  private allOpenForced = false;

  constructor(private readonly ctx: ServerContext) {
    this.scheduler = new EventScheduler(() => ctx.now(), { onStart: (w) => this.onStart(w), onEnd: (w) => this.onEnd(w) });
  }

  async reload(): Promise<void> {
    await this.data.load(this.ctx.db.db);
    this.scheduler.setEvents(await loadScheduledEvents(this.ctx.db.db).catch(() => []));
    // QA dev switch (cfg.ALL_OPEN): force world boss / league / elite windows open indefinitely, same
    // mechanism as the admin "start now" button (scheduler.force -> ActiveWindow, real onStart/onEnd hooks
    // still run once, so the admin Eventos calendar shows them as active too). Only done once per process
    // (see allOpenForced) — never deletes the real schedule, and re-forcing on every reload() would re-key
    // the window and spuriously end+restart it (e.g. re-paying world-boss rank rewards).
    if (this.ctx.cfg.ALL_OPEN && !this.allOpenForced) {
      this.allOpenForced = true;
      for (const kind of ["worldboss", "league", "elite", "elite_champion"]) this.scheduler.force(kind, 36_500 * 24 * 60);
    }
    await this.scheduler.tick();
  }

  private note(s: string): void {
    this.log.unshift(`${this.ctx.now().toISOString()} ${s}`);
    this.log.length = Math.min(this.log.length, 50);
    this.ctx.log.info(`[events] ${s}`);
  }

  private broadcast(pkt: GSPacket | ((p: GamePlayer) => GSPacket)): void {
    for (const p of this.ctx.world.all()) p.send(typeof pkt === "function" ? pkt(p) : pkt);
  }

  async onStart(w: ActiveWindow): Promise<void> {
    const prm = w.ev.params;
    switch (w.ev.kind) {
      case "worldboss": {
        // ch-eventos: só o líder abre a janela de verdade — o HP/ranking compartilhado é autoridade dele
        // (handlers/eventos/boss-mundial.ts worldBossDamage/applyBossDamage, bus/leader.ts). Um canal seguidor
        // nunca entra aqui (espelha via `ch:boss:open`/`mirrorBossOpen` quando a mensagem do líder chegar,
        // bus/cross-channel.ts) — mesmo que o seguidor também tenha essa MESMA janela "aberta" no próprio
        // scheduler local (computada do mesmo app.ScheduledEvents+relógio, só pra bookkeeping de start/end).
        if (!this.ctx.leader.isLeader()) break;
        const b = this.boss;
        b.window = w;
        b.name = String(prm.name ?? "Dragão Divino");
        b.resourceId = String(prm.resourceId ?? "1");
        b.pveId = Number(prm.pveId ?? 1243);
        b.maxBlood = Number(prm.bossHp ?? 20_000_000);
        b.blood = b.maxBlood;
        b.players.clear();
        b.rank.clear();
        const notice = String(prm.notice ?? `Boss mundial ${b.name} apareceu! Entre pelo ícone no hall.`);
        this.broadcast((p) => worldBossOpen(this, p));
        this.broadcast(Out.message(1, notice));
        this.ctx.crossChannel.bossOpen({ name: b.name, resourceId: b.resourceId, pveId: b.pveId, maxBlood: b.maxBlood, blood: b.blood, startMs: w.start.getTime(), endMs: w.end.getTime(), key: w.key, notice });
        break;
      }
      case "league":
        this.leagueOpen = true;
        this.broadcast((p) => Out.leagueNotice(p.id, p.match.restCount ?? 0, Number(prm.maxCount ?? 10), 1));
        this.broadcast(Out.message(1, "O Deus da Guerra começou, entre logo na sala para lutar!"));
        break;
      case "elite":
        // m3-elite-brackets: só os bits de PONTUAÇÃO (1|4) — os bits de CAMPEÃO (2|8) são da janela
        // "elite_champion" abaixo; os dois se combinam sem se atropelar mesmo que as janelas se sobreponham
        // num mesmo tick do scheduler (&~5/&~10 em vez de sobrescrever o inteiro inteiro).
        this.eliteStatus = (this.eliteStatus & ~5) | (Number(prm.status ?? 5) & 5);
        this.broadcast(eliteStatusPkt(this.eliteStatus));
        break;
      case "elite_champion":
        await startEliteChampion(this.ctx, this);
        break;
      case "weekly_reset":
        await weeklyReset(this.ctx, w.key);
        break;
      case "double_exp":
      case "double_gold":
        this.broadcast(Out.message(1, `${w.ev.title || w.ev.kind}: x${Number(prm.rate ?? 2)} até ${w.end.toISOString().slice(11, 16)} UTC.`));
        break;
      case "consortia_battle":
        // m3-consortia-battle: 153/1 START_OR_CLOSE never has a real sender in the leaked 6600 server (no
        // `new GSPacketIn(153...WriteByte(1)` anywhere) — this is the admin-configurable window that makes
        // the hall entry button (ConsortiaBattleManager.instance.isOpen/isCanEnter) reachable at all. No
        // separate "announced but not enterable" phase like the AS3 reader supports: `canEnter` is always
        // true while the window is open (one-phase window, same simplification as every other scheduler kind).
        this.broadcast(Out.consBatOpenClose(true, w.start, w.end, true));
        break;
      case "rescue":
        // m4-resgate: 277/1 IS_OPEN has no sender at all in the leaked 6600 server (no C# source for 277
        // whatsoever — see game/rescue.ts header) — same "admin window makes the hall icon reachable" shape
        // as consortia_battle above.
        this.broadcast(Out.rescueOpenClose(true));
        break;
      case "catchbeast":
        // m4-catchbeast: real sender exists (GamePlayer.cs:3714-3716) but gated by a hardcoded 2014 date —
        // replaced by this admin window (task requirement), same substitution every M4 window made.
        this.broadcast(Out.catchBeastOpen(true));
        break;
    }
    this.note(`start ${w.ev.kind} #${w.ev.id} ${w.start.toISOString()} → ${w.end.toISOString()}`);
  }

  async onEnd(w: ActiveWindow): Promise<void> {
    switch (w.ev.kind) {
      case "worldboss": {
        // ch-eventos: só o líder fecha/paga de verdade (uma vez só, ver finishWorldBoss); um seguidor nunca
        // chegou a abrir localmente (break acima no onStart), então não tem nada seu pra fechar — o
        // `ch:boss:close`/`mirrorBossClose` (bus/cross-channel.ts) é quem limpa o espelho dele quando a
        // mensagem do líder chegar.
        if (!this.ctx.leader.isLeader()) break;
        const rankTop = rankList(this).slice(0, 10);
        await finishWorldBoss(this.ctx, this, w);
        this.ctx.crossChannel.bossClose(rankTop);
        break;
      }
      case "league":
        this.leagueOpen = false;
        this.broadcast((p) => Out.leagueNotice(p.id, p.match.restCount ?? 0, 0, 2));
        break;
      case "elite":
        this.eliteStatus &= ~5; // só os bits de pontuação — ver nota em onStart
        this.broadcast(eliteStatusPkt(this.eliteStatus));
        break;
      case "elite_champion":
        await finishEliteChampion(this.ctx, this, w);
        break;
      case "consortia_battle":
        this.broadcast(Out.consBatOpenClose(false));
        break;
      case "rescue":
        this.broadcast(Out.rescueOpenClose(false));
        break;
      case "catchbeast":
        this.broadcast(Out.catchBeastOpen(false));
        break;
    }
    this.note(`end ${w.ev.kind} #${w.ev.id}`);
  }

  status(): Record<string, unknown> {
    return {
      ...this.scheduler.status(),
      worldBoss: this.boss.window ? { name: this.boss.name, blood: this.boss.blood, maxBlood: this.boss.maxBlood, players: this.boss.players.size, ranking: rankListStatus(this) } : null,
      eliteStatus: this.eliteStatus,
      leagueOpen: this.leagueOpen,
      log: this.log.slice(0, 20),
    };
  }

  /**
   * Lista próximos eventos de app.ScheduledEvents com nextStart calculado (só leitura).
   * Como lê esse código (cada variável):
   * - `limit`: máximo de linhas retornadas.
   * - `agora`: instante atual (ctx.now()).
   * - `linhas`: projeção de scheduler.events via listUpcomingEvents.
   */
  upcoming(limit = 20): UpcomingRow[] {
    const agora = this.ctx.now();
    const linhas = listUpcomingEvents(this.scheduler.events, agora, limit);
    return linhas;
  }
}

/** Usado só por `status()` acima — ranking do boss mundial sem depender de `boss-mundial.ts` pra tipos de saída. */
function rankListStatus(rt: EventsRuntime): { id: number; nick: string; damage: number }[] {
  return [...rt.boss.rank.entries()].map(([id, r]) => ({ id, nick: r.nick, damage: r.damage })).sort((a, b) => b.damage - a.damage);
}

/** Linha de GET /events/upcoming (espelho de app.ScheduledEvents + nextStart). */
export interface UpcomingRow {
  id: number;
  kind: string;
  title: string;
  nextStart: Date | null;
  durationMin: number;
}

/**
 * Projeta eventos agendados para próximos inícios (só leitura, sem tick/mutação).
 * Como lê esse código (cada variável):
 * - `events`: linhas de app.ScheduledEvents já carregadas em scheduler.events.
 * - `now`: instante atual para nextStart(ev, now).
 * - `limit`: teto de linhas (1..100).
 * - `linhas`: eventos com próxima data válida, ordenados por nextStart.
 */
export function listUpcomingEvents(events: ScheduledEvent[], now: Date, limit = 20): UpcomingRow[] {
  const teto = Math.max(1, Math.min(100, Math.floor(limit) || 20));
  const linhas: UpcomingRow[] = [];
  for (const ev of events) {
    if (!ev.enabled) continue;
    const prox = nextStart(ev, now);
    if (!prox) continue;
    linhas.push({ id: ev.id, kind: ev.kind, title: ev.title, nextStart: prox, durationMin: ev.durationMin });
  }
  linhas.sort((a, b) => (a.nextStart?.getTime() ?? 0) - (b.nextStart?.getTime() ?? 0));
  return linhas.slice(0, teto);
}

const runtimes = new WeakMap<ServerContext, EventsRuntime>();
export function eventsRuntime(ctx: ServerContext): EventsRuntime {
  let r = runtimes.get(ctx);
  if (!r) runtimes.set(ctx, (r = new EventsRuntime(ctx)));
  return r;
}

/**
 * Weekly reset (once per window, claim UserID 0): last-week columns take this week's counters, counters go to 0
 * (Consortia week riches/honor, player week GP/offer/league score, match weekly score/games/wins). Online players get
 * the same change in memory so the autosave does not write the old values back.
 */
export async function weeklyReset(ctx: ServerContext, key: string): Promise<boolean> {
  const db = ctx.db.db;
  if (!(await claimOnce(db, 0, "weekly_reset", key.slice(0, 64)))) return false;
  // Last* are snapshots (SP_Sys_Update_Users_WeekList / _Consortia_WeekList); apps/api rank.ts computes Add* = now − snapshot.
  await db.execute(sql`UPDATE player."Consortia" SET "LastWeekRiches" = "LastWeekRiches" + "AddWeekRiches", "AddWeekRiches" = 0, "LastWeekHonor" = "Honor", "AddWeekHonor" = 0`);
  await db.execute(sql`UPDATE player."Sys_Users_Detail" SET "LastWeekGP" = "GP", "AddWeekGP" = 0, "LastWeekOffer" = "Offer", "AddWeekOffer" = 0, "AddWeekLeagueScore" = 0`);
  await db.execute(sql`UPDATE player."Sys_User_Match_Info" SET "weeklyScore" = 0, "weeklyGameCount" = 0, "WeeklyWinCount" = 0`);
  for (const p of ctx.world.all()) {
    const c = p.info as unknown as Record<string, number>;
    c.LastWeekGP = c.GP ?? 0; c.AddWeekGP = 0; c.LastWeekOffer = c.Offer ?? 0; c.AddWeekOffer = 0; c.AddWeekLeagueScore = 0;
    const m = p.match as unknown as Record<string, number>;
    m.weeklyScore = 0; m.weeklyGameCount = 0; m.WeeklyWinCount = 0;
  }
  // Semana da Sociedade + votar candidato (design próprio, sem fonte C#): a semana que acabou de terminar
  // ainda é a chave corrente 1s antes do reset (weekKey não girou ainda nesse instante).
  const endedWeek = weekKey(new Date(ctx.now().getTime() - 1000));
  await settleGuildWeek(ctx, endedWeek).catch((e) => ctx.log.warn(`settleGuildWeek: ${e}`));
  await settlePollWeek(ctx, endedWeek).catch((e) => ctx.log.warn(`settlePollWeek: ${e}`));
  return true;
}

// ------------------------------------------------------------------ gancho de login/logout
/** BoxBeginTime (GamePlayer.Login): quando o jogador entrou, pra medir elapsed da caixa do tempo (53). */
export const boxBegin = new WeakMap<GamePlayer, number>();
const throttle = new WeakMap<GamePlayer, number>();
/** Debounce compartilhado: o original (`DailyAwardHandler`/`FirstRechargeGetAward`) usa o mesmo relógio por
 *  jogador pros dois pacotes — clicar DAILY_AWARD também "esfria" um FIRSTRECHARGE imediato, e vice-versa. */
export function throttled(p: GamePlayer, ms: number): boolean {
  const now = Date.now();
  if ((throttle.get(p) ?? 0) + ms > now) return true;
  throttle.set(p, now);
  return false;
}

/** Item/currency rewards; overflow by mail type 12 (OpenUpArk) like the original. */
export async function give(ctx: ServerContext, p: GamePlayer, rewards: Reward[], title: string): Promise<string> {
  const g = grantRewards(p, rewards, ctx.templates.findItem, ctx.now());
  if (g.overflow.length) await mailItems(ctx, p, g.overflow, title, 12);
  return g.summary.join(", ");
}

/** Event part of the login burst (GamePlayer.Login :365-447): records 228, box reset, first recharge, world boss, league, elite, accumulative login. */
export async function eventsOnLogin(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const rt = eventsRuntime(ctx);
  const now = ctx.now();
  const c = p.info;
  // GamePlayer.Login: BoxBeginTime = now (the BoxGetDate daily reset is done by the login burst)
  boxBegin.set(p, now.getTime());
  // AccumulativeUpdate once per day (max 7)
  if ((c.accumulativeLoginDays ?? 0) < 7 && (await claimOnce(ctx.db.db, p.id, "acclogin", dayKey(now)))) c.accumulativeLoginDays = (c.accumulativeLoginDays ?? 0) + 1;
  updateRecords(p);
  // EffortManager.updateWholeProgress dereferences progressEfforts[CondictionType] for EVERY achievement condition
  // (null -> exception, nothing completes): the original created one record row per type, so send them all.
  const types = new Set<number>();
  for (const l of rt.data.achConds.values()) for (const cnd of l) types.add(cnd.CondictionType);
  const all = [...p.records];
  for (const t of types) if (!all.some((r) => r.RecordID === t)) all.push({ UserID: p.id, RecordID: t, Total: 0 });
  p.send(Out.achievementRecords(228, p.id, all));
  pushEventIcons(ctx, p);
}

/**
 * 41-hot-update: estado ATUAL dos ícones/janelas de evento pra UM jogador — mundo boss, liga, elite, batalha
 * da sociedade, resgate, captura de monstro. Extraído de `eventsOnLogin` (mesma lógica de "quem loga com a
 * janela já aberta precisa do pacote, porque o broadcast do `onStart` só alcançou quem já estava online na
 * hora") pra ser reaproveitado também pelo "Aplicar agora" do admin (`admin/hot-update.ts applyHotUpdate`):
 * empurra de novo o estado atual pra quem JÁ está online, cobrindo o caso de o admin habilitar/mudar uma
 * janela cujo horário já estava em curso (reload() só dispara onStart/onEnd em TRANSIÇÃO — EventScheduler.tick,
 * game/scheduler.ts — então um reload no meio de uma janela já aberta não repete o broadcast por conta própria).
 * Boss mundial FICA DE FORA daqui de propósito: `session/login.ts:230` já manda `worldBossOpen`/`openWorldBoss`
 * (aberto/fechado) incondicionalmente logo depois de chamar `eventsOnLogin` — incluir aqui duplicaria o
 * pacote no login. `admin/hot-update.ts applyHotUpdate` reenvia o boss separadamente, só quando há janela.
 */
export function pushEventIcons(ctx: ServerContext, p: GamePlayer): void {
  const rt = eventsRuntime(ctx);
  if (rt.leagueOpen) p.send(Out.leagueNotice(p.id, p.match.restCount ?? 0, Number(rt.scheduler.isOpen("league")?.ev.params.maxCount ?? 10), 1));
  if (rt.eliteStatus) p.send(eliteStatusPkt(rt.eliteStatus));
  // m3-consortia-battle: a player who logs in while the window is already open still needs 153/1 to light
  // up the hall entry button (same reasoning as league/elite above — the broadcast at onStart only reaches
  // whoever was already online).
  const consBatWindow = rt.scheduler.isOpen("consortia_battle");
  if (consBatWindow) p.send(Out.consBatOpenClose(true, consBatWindow.start, consBatWindow.end, true));
  // m4-resgate: same reasoning — a player logging in while the window is already open still needs 277/1 to
  // light up the hall icon (the broadcast at onStart only reaches whoever was already online).
  if (rt.scheduler.isOpen("rescue")) p.send(Out.rescueOpenClose(true));
  // m4-catchbeast: same reasoning — see this function's header + game/catchbeast.ts for the real-sender
  // citation this admin window replaces.
  if (rt.scheduler.isOpen("catchbeast")) p.send(Out.catchBeastOpen(true));
}
