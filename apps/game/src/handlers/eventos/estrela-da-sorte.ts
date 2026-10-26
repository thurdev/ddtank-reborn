/**
 * Aba no jogo: ícone do hall "Estrela da Sorte" (luckStar) — paga 2500 Cupons pra entrar, gira a roleta de
 * 14 cartas gastando 1 item Estrela da Sorte por giro (cooldown 7s), ganha a carta sorteada (pode cair moeda,
 * que acumula e reseta o pool quando sai pela 1a vez). Mesmo pacote 87 do Baú da Galinha
 * (`bau-da-galinha.ts` é quem lê o cmd e despacha pra cá).
 * Pool de recompensa configurável via `app."ScheduledEvents"` kind "luckystar" (admin Events page).
 * Pacotes: 87 NEWCHICKENBOX_SYS (cmds 31 ENTER_GAME, 32 CLOSE_GAME, 33 START_TURN, 34 TURN_COMPLETE).
 * C#: `ChickenBoxHandler.cs` (mesma classe do Baú da Galinha), `PlayerActives.GetAward`.
 *
 * 41-chickenbox-persistencia (2026-10-26): o board de 14 cartas em si NÃO persiste — igual ao original
 * (`PlayerActives.SetupLuckyStart`/`m_LuckyStartRewards` é só em memória, recriado do zero a cada
 * `ENTER_GAME`/`CreateLuckyStartAward`, `PlayerActives.cs:755-766`). Só as moedas acumuladas persistem de
 * verdade agora (`m_activeInfo.LuckystarCoins`, `PlayerActives.cs:917-943`) — mesma linha `UserID` de
 * `player."Sys_Active_System_Data"` que `ativacao-pintinho.ts` usa (`ChickActiveData`) e
 * `bau-da-galinha.ts` usa (contadores do Baú), coluna própria aqui. Antes ficava só numa WeakMap em
 * memória (perdida a cada reconexão/restart).
 * Como testar: `apps/game/test/activities.test.ts` (`luckyDraw`), `apps/game/test/chickenbox-persist.test.ts`
 * (41-chickenbox-persistencia). Manual: `docs/features/eventos.md`.
 */
import { eq } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import { player as P } from "@ddt/db";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { grantRewards } from "../../game/events.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { pool, type PoolItem } from "./agendador.js";
import { drawDistinct, type Card } from "./bau-da-galinha.js";

const DEFAULT_LUCKYSTAR_POOL: PoolItem[] = [
  { templateId: 11107, count: 300, weight: 30 }, { templateId: 11107, count: 800, weight: 15 },
  { templateId: 11456, count: 3, weight: 20 }, { templateId: 11408, count: 5, weight: 20 },
  { templateId: 11023, count: 2, weight: 15 }, { templateId: 11444, count: 2, weight: 15 },
];

/** `rowId`: linha `Sys_Active_System_Data` por UserID (compartilhada com `ativacao-pintinho.ts`/
 *  `bau-da-galinha.ts`, cada um só na própria coluna) — só pra persistir `coins` (ver header). */
interface LuckyState { rewards: Card[]; award: Card | null; lastTurn: number; coins: number; rowId: number | null }
const luckyOf = new WeakMap<GamePlayer, LuckyState>();

const COIN_TEMPLATE = 201193;
const LUCKYSTAR_ITEM = 201192;
const DEFAULT_COINS = 500;
const FLUSH_COINS = 15;

/** `CreateLuckyStartAward` (`PlayerActives.cs:755-766`): só recria o BOARD — nunca toca `LuckystarCoins`.
 *  `coins`/`rowId` vêm de `loadCoins` (chamado pelo `ENTER_GAME` abaixo), carregados 1x e mantidos no
 *  objeto em memória pro resto da sessão (igual ao original: `m_activeInfo` fica residente no `GamePlayer`
 *  até o próximo save). */
function setupLucky(ctx: ServerContext, p: GamePlayer, coins: number, rowId: number | null): LuckyState {
  const rows = pool(ctx, "luckystar", DEFAULT_LUCKYSTAR_POOL);
  const rewards = drawDistinct(rows, 14);
  if (rewards.length) rewards[0] = { templateId: COIN_TEMPLATE, count: 1, strengthenLevel: 0, validDate: 0, atk: 0, def: 0, agi: 0, luck: 0, position: 0, isSelected: false, isSeeded: false, isBind: true, weight: 1000 };
  for (let i = rewards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rewards[i], rewards[j]] = [rewards[j]!, rewards[i]!]; }
  const s: LuckyState = { rewards, award: null, lastTurn: 0, coins, rowId };
  luckyOf.set(p, s);
  return s;
}

/** Lê `LuckystarCoins` da linha `Sys_Active_System_Data` do jogador (500 = `CreateActiveSystemInfo` default
 *  se a linha ainda não existe). Exportado só pra `test/chickenbox-persist.test.ts` verificar o round-trip
 *  sem precisar montar um item 201192 real na bolsa. */
export async function loadCoins(ctx: ServerContext, p: GamePlayer): Promise<{ coins: number; rowId: number | null }> {
  const [row] = await ctx.db.db.select({ ID: P.Sys_Active_System_Data.ID, LuckystarCoins: P.Sys_Active_System_Data.LuckystarCoins }).from(P.Sys_Active_System_Data).where(eq(P.Sys_Active_System_Data.UserID, p.id)).limit(1);
  if (!row) return { coins: DEFAULT_COINS, rowId: null };
  return { coins: row.LuckystarCoins, rowId: row.ID };
}

/** Grava `coins` de volta (update se a linha já existe; senão cria com os defaults de `CreateActiveSystemInfo`
 *  — mesmo motivo de `bau-da-galinha.ts`'s `saveMisc`: qualquer um dos 3 arquivos pode criar a linha 1º).
 *  Toma/retorna um `{coins, rowId}` solto (não o `LuckyState` inteiro) pra ficar testável sem montar board. */
export async function saveCoins(ctx: ServerContext, p: GamePlayer, cr: { coins: number; rowId: number | null }): Promise<{ coins: number; rowId: number | null }> {
  if (cr.rowId != null) {
    await ctx.db.db.update(P.Sys_Active_System_Data).set({ LuckystarCoins: cr.coins }).where(eq(P.Sys_Active_System_Data.ID, cr.rowId));
    return cr;
  }
  const [ins] = await ctx.db.db.insert(P.Sys_Active_System_Data).values({ UserID: p.id, canOpenCounts: 5, canEagleEyeCounts: 5, isShowAll: true, lastFlushTime: ctx.now(), LuckystarCoins: cr.coins }).returning({ ID: P.Sys_Active_System_Data.ID });
  return { coins: cr.coins, rowId: ins!.ID };
}

/** PlayerActives.GetAward: weighted pick by `.weight`; if the coin slot wins and rand(100)>3, re-roll excluding coin. */
export function luckyDraw(s: LuckyState): Card {
  const pick = (rows: Card[]): Card => {
    const total = rows.reduce((a, c) => a + c.weight, 0);
    let r = Math.random() * total;
    for (const c of rows) { if (r < c.weight) return c; r -= c.weight; }
    return rows[rows.length - 1]!;
  };
  let award = pick(s.rewards);
  if (award.templateId === COIN_TEMPLATE && Math.random() * 100 > 3) {
    const rest = s.rewards.filter((c) => c.templateId !== COIN_TEMPLATE);
    if (rest.length) award = pick(rest);
  }
  return award;
}

function sendLuckyAllGoods(p: GamePlayer, s: LuckyState): void {
  const out = new GSPacket(87);
  out.writeInt(30); out.writeInt(s.coins); out.writeInt(s.rewards.length);
  for (const c of s.rewards) { out.writeInt(c.templateId); out.writeInt(c.strengthenLevel); out.writeInt(c.count); out.writeInt(c.validDate); out.writeInt(c.atk); out.writeInt(c.def); out.writeInt(c.agi); out.writeInt(c.luck); out.writeBoolean(c.isBind); }
  p.send(out);
}

/** Chamado por `bau-da-galinha.ts`'s `newChickenBoxDispatch` para os cmds 31-34 (gate "luckystar" já conferido ali). */
export async function luckyStarCmd(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, cmd: number): Promise<void> {
  switch (cmd) {
    case 31: { // ENTER_GAME (Lucky Star)
      const money = 2500;
      if (p.info.Money < money) return p.sendMessage(0, `São necessários ${money} Cupons para usar esta função!`);
      p.removeMoney(money);
      p.sendMessage(0, `${money} Cupons descontados ao abrir a função!`);
      const { coins, rowId } = await loadCoins(ctx, p);
      const s = setupLucky(ctx, p, coins, rowId);
      sendLuckyAllGoods(p, s);
      return;
    }
    case 32: // CLOSE_GAME
      return;
    case 33: { // START_TURN (7s cooldown, consumes LUCKYSTAR_ITEM)
      const s = luckyOf.get(p);
      if (!s) return p.sendMessage(0, "Você ainda não entrou na Estrela da Sorte.");
      if (ctx.now().getTime() - s.lastTurn < 7000) return p.sendMessage(0, "Aguarde.");
      const it = p.propBag.getItemByTemplateID(0, LUCKYSTAR_ITEM);
      if (!it || it.Count <= 0) return p.sendMessage(0, `${ctx.templates.findItem(LUCKYSTAR_ITEM)?.Name ?? "Estrela da Sorte"} insuficiente.`);
      p.propBag.removeTemplate(LUCKYSTAR_ITEM, 1);
      for (let i = s.rewards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s.rewards[i], s.rewards[j]] = [s.rewards[j]!, s.rewards[i]!]; }
      s.lastTurn = ctx.now().getTime();
      s.award = luckyDraw(s);
      s.coins += FLUSH_COINS;
      const out = new GSPacket(87);
      out.writeInt(34); out.writeInt(s.coins); out.writeInt(s.award.templateId); out.writeInt(s.award.strengthenLevel);
      out.writeInt(s.award.count); out.writeInt(s.award.validDate); out.writeInt(s.award.atk); out.writeInt(s.award.def);
      out.writeInt(s.award.agi); out.writeInt(s.award.luck); out.writeBoolean(s.award.isBind);
      p.send(out);
      if (s.award.templateId === COIN_TEMPLATE) { p.addMoney(s.coins); s.coins = DEFAULT_COINS; }
      s.rowId = (await saveCoins(ctx, p, { coins: s.coins, rowId: s.rowId })).rowId;
      return;
    }
    case 34: { // TURN_COMPLETE
      const s = luckyOf.get(p);
      if (!s?.award) return;
      if (s.award.templateId !== COIN_TEMPLATE) {
        const g = grantRewards(p, [{ templateId: s.award.templateId, count: s.award.count, isBind: s.award.isBind }], ctx.templates.findItem, ctx.now());
        if (g.overflow.length) void mailItems(ctx, p, g.overflow, "Lucky Star", 8);
      }
      return;
    }
  }
}
