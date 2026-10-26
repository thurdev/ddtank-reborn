/**
 * Aba no jogo: ícone do hall "Baú do Rei Galo" (newChickenBox) — board de 18 cartas, abre carta por Cupons
 * (TAKEOVERCARD) ou revela com Olho de Águia (USEEAGLEEYE), atualiza o board (FLUSHCHICKENVIEW, grátis
 * dentro da janela de 120min). Também é quem despacha pro arquivo-irmão `estrela-da-sorte.ts` (mesmo pacote
 * 87, cmds diferentes) porque o cliente manda os dois sub-sistemas no mesmo `ePackageType.NEWCHICKENBOX_SYS`.
 * Pool de recompensa não migrada do .bak (Items_Box's EventAwardItem nunca foi populada) — configurável via
 * `app."ScheduledEvents"` kind "chickenbox" (admin Events page), com default embutido.
 * Pacotes: 87 NEWCHICKENBOX_SYS (cmds 10 ENTERCHICKENVIEW, 11 USEEAGLEEYE, 12 AllITEMSHOW, 13 TAKEOVERCARD,
 *   14 FLUSHCHICKENVIEW, 15 CLICKSTARTBNT).
 * C#: `ChickenBoxHandler.cs`.
 *
 * 41-chickenbox-persistencia (2026-10-26): o board de 18 cartas e os contadores (canOpenCounts/
 * canEagleEyeCounts/isShowAll/lastFlushTime) agora persistem de verdade — antes ficavam só numa WeakMap em
 * memória (perdidos a cada restart do processo, desvio documentado em docs/MIGRATION-GAP.md/HANDLERS.md).
 * Mesmas tabelas do original: `player."New_ChickenBox_Data"` (`NewChickenBoxItemInfo.cs`,
 * `PlayerBussiness.cs:7905-8045` `GetSingleNewChickenBox`/`AddNewChickenBox`/`UpdateNewChickenBox`) guarda o
 * board; `player."Sys_Active_System_Data"` (mesma linha por UserID que `ativacao-pintinho.ts` usa pra
 * `ChickActiveData`, colunas próprias aqui) guarda os contadores — ambas já existiam no schema (`@ddt/db`),
 * só nunca tinham sido usadas por ninguém. `EnterChickenBox`/`LoadChickenBox` (`PlayerActives.cs:357-368`):
 * se não há linhas no banco pro UserID, cria um board novo (`PayFlushView`) — mesma regra aqui
 * (`loadOrCreateChickenState`). A Estrela da Sorte (`estrela-da-sorte.ts`) NÃO persiste o próprio board —
 * no original `PlayerActives.SetupLuckyStart`/`m_LuckyStartRewards` é só em memória, recriado a cada
 * `ENTER_GAME` (`ChickenBoxHandler.cs` case `ENTER_GAME` → `CreateLuckyStartAward()`); só as moedas
 * acumuladas (`LuckystarCoins`, mesma linha `Sys_Active_System_Data`) sobrevivem ao logout.
 * Como testar: `apps/game/test/activities.test.ts` (`drawDistinct`), `apps/game/test/chickenbox-persist.test.ts`
 * (41-chickenbox-persistencia). Manual: `docs/features/eventos.md`.
 */
import { eq } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import { player as P } from "@ddt/db";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { grantRewards } from "../../game/events.js";
import * as Out from "../../packets/out.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { arr, isOpen, num, pool, type PoolItem } from "./agendador.js";
import { luckyStarCmd } from "./estrela-da-sorte.js";

// ------------------------------------------------------------------ modelo de carta (compartilhado com a Estrela da Sorte)
/** `id`: linha de `New_ChickenBox_Data` (só o Baú da Galinha persiste board — ver header). `undefined`/`null`
 *  nas cartas da Estrela da Sorte (nunca gravadas). */
export interface Card { templateId: number; count: number; strengthenLevel: number; validDate: number; atk: number; def: number; agi: number; luck: number; position: number; isSelected: boolean; isSeeded: boolean; isBind: boolean; weight: number; id?: number }

function card(it: PoolItem, position: number): Card {
  return { templateId: it.templateId, count: it.count, strengthenLevel: 0, validDate: it.validDate ?? 0, atk: 0, def: 0, agi: 0, luck: 0, position, isSelected: false, isSeeded: false, isBind: it.isBind ?? true, weight: it.weight ?? 1000 };
}

/** Sorteia `count` cartas distintas (por templateId) do pool, sem reposição enquanto houver templates não usados. */
export function drawDistinct(rows: PoolItem[], count: number): Card[] {
  const out: Card[] = [];
  const used = new Set<number>();
  let guard = 0;
  while (out.length < count && guard++ < count * 50) {
    const r = rows[Math.floor(Math.random() * rows.length)];
    if (!r || used.has(r.templateId)) { if (used.size >= rows.length) break; continue; }
    used.add(r.templateId);
    out.push(card(r, out.length));
  }
  return out;
}

// ------------------------------------------------------------------ Sys_Active_System_Data: contadores compartilhados
/** Colunas do Baú da Galinha na mesma linha `Sys_Active_System_Data` (chave UserID) que `ativacao-pintinho.ts`
 *  usa pra `ChickActiveData` e `estrela-da-sorte.ts` usa pra `LuckystarCoins` — cada subsistema só lê/escreve
 *  as próprias colunas (`.set({...})` parcial do Drizzle nunca toca nas dos outros). */
export interface ChickenMisc { rowId: number | null; canOpenCounts: number; canEagleEyeCounts: number; isShowAll: boolean; lastFlushTime: Date }

/** `CreateActiveSystemInfo` (`PlayerActives.cs:559-574`): valores de uma linha nova (nunca tocada por nenhum
 *  subsistema ainda). Replicado aqui porque qualquer um dos três arquivos pode ser o primeiro a criar a
 *  linha pro UserID — cada INSERT grava a linha TODA com estes defaults, nunca só a própria coluna, pra não
 *  depender da ordem em que o jogador abre cada ícone. */
function freshMisc(now: Date): Omit<ChickenMisc, "rowId"> {
  return { canOpenCounts: 5, canEagleEyeCounts: 5, isShowAll: true, lastFlushTime: now };
}

export async function loadMisc(ctx: ServerContext, p: GamePlayer): Promise<ChickenMisc> {
  const [row] = await ctx.db.db.select().from(P.Sys_Active_System_Data).where(eq(P.Sys_Active_System_Data.UserID, p.id)).limit(1);
  if (!row) return { rowId: null, ...freshMisc(ctx.now()) };
  return { rowId: row.ID, canOpenCounts: row.canOpenCounts, canEagleEyeCounts: row.canEagleEyeCounts, isShowAll: row.isShowAll, lastFlushTime: row.lastFlushTime };
}

/** Grava só as colunas em `patch` (update) ou cria a linha com os defaults de `freshMisc` + `patch` por cima
 *  (insert) — `misc` é atualizado em memória nos dois casos pra quem chamou continuar usando o objeto. */
export async function saveMisc(ctx: ServerContext, p: GamePlayer, misc: ChickenMisc, patch: Partial<Omit<ChickenMisc, "rowId">>): Promise<void> {
  Object.assign(misc, patch);
  if (misc.rowId != null) {
    await ctx.db.db.update(P.Sys_Active_System_Data).set(patch).where(eq(P.Sys_Active_System_Data.ID, misc.rowId));
    return;
  }
  const values = { UserID: p.id, LuckystarCoins: 500, ...freshMisc(ctx.now()), ...patch };
  const [ins] = await ctx.db.db.insert(P.Sys_Active_System_Data).values(values).returning({ ID: P.Sys_Active_System_Data.ID });
  misc.rowId = ins!.ID;
}

// ------------------------------------------------------------------ board (18 cartas)
const DEFAULT_CHICKENBOX_POOL: PoolItem[] = [
  { templateId: 11107, count: 500 }, { templateId: 11107, count: 1000 }, { templateId: 11456, count: 5 },
  { templateId: 11408, count: 10 }, { templateId: 112059, count: 1 }, { templateId: 11023, count: 3 },
  { templateId: 11020, count: 3 }, { templateId: 11018, count: 2 }, { templateId: 11444, count: 3 },
];

interface ChickenState { rewards: Card[]; misc: ChickenMisc }
const chickenOf = new WeakMap<GamePlayer, ChickenState>();

/** `PayFlushView` (`PlayerActives.cs:489-501`): descarta o board atual, sorteia 18 cartas novas, grava tudo
 *  (`New_ChickenBox_Data` recriada do zero + contadores resetados na mesma linha `Sys_Active_System_Data`). */
async function payFlushView(ctx: ServerContext, p: GamePlayer, misc?: ChickenMisc): Promise<ChickenState> {
  const rows = pool(ctx, "chickenbox", DEFAULT_CHICKENBOX_POOL);
  const cards = drawDistinct(rows, 18);
  const db = ctx.db.db;
  await db.delete(P.New_ChickenBox_Data).where(eq(P.New_ChickenBox_Data.UserID, p.id));
  if (cards.length) {
    const inserted = await db.insert(P.New_ChickenBox_Data).values(cards.map((c) => ({
      UserID: p.id, TemplateID: c.templateId, Count: c.count, ValidDate: c.validDate, StrengthenLevel: c.strengthenLevel,
      AttackCompose: c.atk, DefendCompose: c.def, AgilityCompose: c.agi, LuckCompose: c.luck, Position: c.position,
      IsSelected: c.isSelected, IsSeeded: c.isSeeded, IsBinds: c.isBind,
    }))).returning({ ID: P.New_ChickenBox_Data.ID, Position: P.New_ChickenBox_Data.Position });
    for (const row of inserted) { const c = cards.find((x) => x.position === row.Position); if (c) c.id = row.ID; }
  }
  const m = misc ?? await loadMisc(ctx, p);
  await saveMisc(ctx, p, m, { canOpenCounts: 5, canEagleEyeCounts: 5, isShowAll: true, lastFlushTime: ctx.now() });
  const s: ChickenState = { rewards: cards, misc: m };
  chickenOf.set(p, s);
  return s;
}

/** `EnterChickenBox`/`LoadChickenBox` (`PlayerActives.cs:357-368`): carrega o board salvo; se não existe
 *  linha nenhuma pro UserID (primeira vez, ou banco zerado), cria um board novo (`PayFlushView`). */
async function loadOrCreateChickenState(ctx: ServerContext, p: GamePlayer): Promise<ChickenState> {
  const cached = chickenOf.get(p);
  if (cached) return cached;
  const dbRows = await ctx.db.db.select().from(P.New_ChickenBox_Data).where(eq(P.New_ChickenBox_Data.UserID, p.id));
  const misc = await loadMisc(ctx, p);
  if (!dbRows.length) return payFlushView(ctx, p, misc);
  const rewards: Card[] = dbRows.map((r) => ({
    templateId: r.TemplateID, count: r.Count, strengthenLevel: r.StrengthenLevel, validDate: r.ValidDate,
    atk: r.AttackCompose, def: r.DefendCompose, agi: r.AgilityCompose, luck: r.LuckCompose, position: r.Position,
    isSelected: r.IsSelected, isSeeded: r.IsSeeded, isBind: r.IsBinds, weight: 1000, id: r.ID,
  }));
  const s: ChickenState = { rewards, misc };
  chickenOf.set(p, s);
  return s;
}
const FREE_FLUSH_MIN = 120;
function isFreeFlushTime(misc: ChickenMisc, now: Date): boolean {
  return now.getTime() - misc.lastFlushTime.getTime() < FREE_FLUSH_MIN * 60_000;
}

function chickenListPkt(ctx: ServerContext, s: ChickenState): GSPacket {
  const p = new GSPacket(87);
  p.writeInt(3); Out.wd(p, s.misc.lastFlushTime); p.writeInt(FREE_FLUSH_MIN); p.writeInt(0); p.writeInt(0); p.writeInt(0);
  p.writeBoolean(s.misc.isShowAll); p.writeInt(s.rewards.length);
  for (const c of s.rewards) { p.writeInt(c.templateId); p.writeInt(c.strengthenLevel); p.writeInt(c.count); p.writeInt(c.validDate); p.writeInt(c.atk); p.writeInt(c.def); p.writeInt(c.agi); p.writeInt(c.luck); p.writeInt(c.position); p.writeBoolean(c.isSelected); p.writeBoolean(c.isSeeded); p.writeBoolean(c.isBind); }
  return p;
}

async function chickenBoxCmd(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, cmd: number): Promise<void> {
  const openPrice = arr(ctx, "chickenbox", "openCardPrice", [100, 200, 300, 500, 800]);
  const eyePrice = arr(ctx, "chickenbox", "eagleEyePrice", [50, 100, 150, 250, 400]);
  switch (cmd) {
    case 13: { // TAKEOVERCARD
      const pos = pkt.readInt();
      const s = await loadOrCreateChickenState(ctx, p);
      if (s.misc.canOpenCounts <= 0) return p.sendMessage(0, "Você usou todas as aberturas de cartas.");
      const c = s.rewards.find((x) => x.position === pos && !x.isSelected);
      if (!c) return p.sendMessage(0, "Carta não encontrada.");
      const price = openPrice[Math.min(s.misc.canOpenCounts, openPrice.length) - 1] ?? openPrice[openPrice.length - 1]!;
      if (p.info.Money < price) return p.sendMessage(0, "Cupons insuficientes.");
      p.removeMoney(price);
      c.isSelected = true; c.isBind = true;
      if (c.id != null) await ctx.db.db.update(P.New_ChickenBox_Data).set({ IsSelected: true, IsBinds: true }).where(eq(P.New_ChickenBox_Data.ID, c.id));
      const out = new GSPacket(87);
      out.writeInt(13); out.writeInt(c.templateId); out.writeInt(c.strengthenLevel); out.writeInt(c.count); out.writeInt(c.validDate);
      out.writeInt(c.atk); out.writeInt(c.def); out.writeInt(c.agi); out.writeInt(c.luck); out.writeInt(c.position);
      out.writeBoolean(c.isSelected); out.writeBoolean(c.isSeeded); out.writeBoolean(c.isBind); out.writeInt(0);
      p.send(out);
      const tpl = ctx.templates.findItem(c.templateId);
      if (tpl) { const g = grantRewards(p, [{ templateId: c.templateId, count: c.count, isBind: true }], ctx.templates.findItem, ctx.now()); if (g.overflow.length) void mailItems(ctx, p, g.overflow, "Carta", 8); p.sendMessage(0, `Você recebeu ${tpl.Name ?? c.templateId} x${c.count}.`); }
      await saveMisc(ctx, p, s.misc, { canOpenCounts: s.misc.canOpenCounts - 1 });
      if (s.misc.canOpenCounts === 0) { const sp = new GSPacket(87); sp.writeInt(12); p.send(sp); }
      return;
    }
    case 11: { // USEEAGLEEYE
      const pos = pkt.readInt();
      const s = await loadOrCreateChickenState(ctx, p);
      if (s.misc.canEagleEyeCounts <= 0) return p.sendMessage(0, "Você usou todas as revelações de cartas.");
      const c = s.rewards.find((x) => x.position === pos && !x.isSeeded);
      if (!c) return p.sendMessage(0, "Carta não encontrada.");
      const price = eyePrice[Math.min(s.misc.canEagleEyeCounts, eyePrice.length) - 1] ?? eyePrice[eyePrice.length - 1]!;
      if (p.info.Money < price) return p.sendMessage(0, "Cupons insuficientes.");
      p.removeMoney(price);
      c.isSeeded = true;
      if (c.id != null) await ctx.db.db.update(P.New_ChickenBox_Data).set({ IsSeeded: true }).where(eq(P.New_ChickenBox_Data.ID, c.id));
      const out = new GSPacket(87);
      out.writeInt(11); out.writeInt(c.templateId); out.writeInt(c.strengthenLevel); out.writeInt(c.count); out.writeInt(c.validDate);
      out.writeInt(c.atk); out.writeInt(c.def); out.writeInt(c.agi); out.writeInt(c.luck); out.writeInt(c.position);
      out.writeBoolean(c.isSelected); out.writeBoolean(c.isSeeded); out.writeBoolean(c.isBind); out.writeInt(0);
      p.send(out);
      await saveMisc(ctx, p, s.misc, { canEagleEyeCounts: s.misc.canEagleEyeCounts - 1 });
      return;
    }
    case 14: { // FLUSHCHICKENVIEW
      const s = await loadOrCreateChickenState(ctx, p);
      const free = isFreeFlushTime(s.misc, ctx.now());
      const price = num(ctx, "chickenbox", "flushPrice", 500);
      if (!free) { if (p.info.Money < price) return p.sendMessage(0, "Cupons insuficientes."); p.removeMoney(price); }
      const ns = await payFlushView(ctx, p, s.misc);
      p.send(chickenListPkt(ctx, ns));
      return p.sendMessage(0, free ? "Atualização grátis." : "Atualizado com sucesso.");
    }
    case 12: // AllITEMSHOW
      return p.send(chickenListPkt(ctx, await loadOrCreateChickenState(ctx, p)));
    case 15: { // CLICKSTARTBNT
      const s = await loadOrCreateChickenState(ctx, p);
      for (let i = s.rewards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const a = s.rewards[i]!.position; s.rewards[i]!.position = s.rewards[j]!.position; s.rewards[j]!.position = a; }
      await saveMisc(ctx, p, s.misc, { isShowAll: false });
      await Promise.all(s.rewards.filter((c) => c.id != null).map((c) => ctx.db.db.update(P.New_ChickenBox_Data).set({ Position: c.position }).where(eq(P.New_ChickenBox_Data.ID, c.id!))));
      const out = new GSPacket(87);
      out.writeInt(5); out.writeBoolean(true);
      return p.send(out);
    }
    case 10: // ENTERCHICKENVIEW
      return p.send(chickenListPkt(ctx, await loadOrCreateChickenState(ctx, p)));
  }
}

/** Ponto de entrada do pacote 87: lê o cmd uma vez e despacha pro baú da galinha (10-15) ou pra estrela da
 *  sorte (31-34), cada um com seu próprio portão `isOpen` — exatamente como o `ChickenBoxHandler.cs` original. */
export async function newChickenBoxDispatch(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const cmd = pkt.readInt();
  if ([10, 11, 12, 13, 14, 15].includes(cmd)) {
    if (!isOpen(ctx, "chickenbox")) return p.sendMessage(0, "O Baú do Rei Galo está fechado.");
    return chickenBoxCmd(ctx, p, pkt, cmd);
  }
  if ([31, 32, 33, 34].includes(cmd)) {
    if (!isOpen(ctx, "luckystar")) return p.sendMessage(0, "A Estrela da Sorte está fechada.");
    return luckyStarCmd(ctx, p, pkt, cmd);
  }
}
