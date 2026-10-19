/**
 * Aba no jogo: "Sistema de Dados" (`dice.swf`, `src/Dice/`) — tabuleiro de 19 casas (posição 0-18), rola um
 * dado (grátis 3x/dia ou pagando Xu por tipo de dado) pra andar e ganhar o item da casa em que parar; cada
 * rolagem também soma "pontos da sorte" que sobem de nível (recompensa extra por nível) e "atualizar" paga
 * Xu pra sortear um tabuleiro novo.
 * M3 `m3-dice-system` (docs/plan/TASKS.md).
 *
 * Pacote: 134 DICE_SYSTEM — `sendRequestEnterDiceSystem` (sub 10, `Dice/DiceManager.as:66`),
 * `sendStartDiceInfo` (sub 11, `Dice/View/DiceSystemPanel.as:208`), `sendDiceRefreshData` (sub 12,
 * `Dice/View/DiceToolBar.as:217`) — todos `ddt/manager/GameInSocketOut.as:485-506`, confirmados chamados.
 *
 * C#: `DiceHandler.cs` (único handler real desta tarefa com lógica de verdade no C#; os outros 3 sistemas
 * são stubs). Preços/pontos espelhados exatamente: `GameProperties.DiceRefreshPrice`=40000,
 * `CommonDicePrice`=30000, `DoubleDicePrice`=40000, `BigDicePrice`=50000, `SmallDicePrice`=60000 (todos via
 * `Server_Config`/`cfgInt`, mesma chave — admin pode sobrescrever); `IntegralPoint`=[100,300,700,1500,3100],
 * `MAX_LEVEL`=5. O board de recompensa (`EventAwardMgr.GetDiceAward(eEventType.DICE)`) usa a tabela genérica
 * `Event_Reward_Goods` filtrada por tipo — "0 linhas na origem" pro tipo DICE (mesma situação do Baú da
 * Galinha/Estrela da Sorte, `research/6600/packets-m1.md`) — por isso o board aqui é admin-configurável via
 * `app."ScheduledEvents"` kind "dice" (`pool`/`isOpen`, `agendador.ts`), com default embutido; diferente dos
 * outros dois, o nível (`game."Dice_Level_Award"`) TEM dados reais seedados (5 linhas, uma por nível).
 * **Desvio documentado**: o original sempre monta 19 casas distintas; com o pool padrão (poucos templates
 * reais confirmados no seed de teste) o board pode sair menor — o índice de leitura usa `% board.length` em
 * vez de 19 fixo, mesma categoria de ajuste que `drawDistinct` já faz (guarda contra template insuficiente).
 * `IsDiceOpen()` do original é uma janela FIXA de 2013 (claramente um evento de Natal específico, não um elemento
 * reconfigurável) — não reproduzida; usa o mesmo gate `isOpen(ctx,"dice")` dos outros ícones (sempre aberto
 * por padrão, admin pode fechar via `ScheduledEvents`).
 * Bug do original replicado de propósito (cosmético, não quebra nada): ao ultrapassar o nível 4 (0-indexed),
 * `LuckIntegralLevel` é re-grampeado pra 3 mesmo já tendo ganhado o prêmio do nível 5 (`DiceHandler.
 * method_0:107-111`) — a UI mostra "nível 3" pra sempre depois disso, idêntico ao servidor real.
 * Não portado (bônus colateral, não o efeito principal): `PlayerCharacter.luckyNum++` a cada level-up.
 *
 * Como testar: `apps/game/test/client-6600-m3-dice-system.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";
import { grantRewards } from "../../game/events.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { isOpen, pool, type PoolItem } from "./agendador.js";
import { drawDistinct } from "./bau-da-galinha.js";
import { loadDiceData, loadDiceLevelAward, newDiceData, saveDiceData, type DiceDataRow } from "../../db/dados.js";

const MAX_LEVEL = 5;
const INTEGRAL_POINT = [100, 300, 700, 1500, 3100];

const DEFAULT_DICE_POOL: PoolItem[] = [
  { templateId: 11107, count: 500 }, { templateId: 11456, count: 2 }, { templateId: 11408, count: 5 },
  { templateId: 112059, count: 1 }, { templateId: 11023, count: 2 }, { templateId: 11020, count: 2 },
  { templateId: 11018, count: 1 }, { templateId: 11444, count: 2 },
];

interface DiceCell { templateId: number; strengthenLevel: number; count: number; validDate: number; isBind: boolean }

function encodeBoard(cells: DiceCell[]): string {
  return cells.map((c) => `${c.templateId},${c.strengthenLevel},${c.count},${c.validDate},${c.isBind}`).join("|");
}
function decodeBoard(s: string): DiceCell[] {
  if (!s) return [];
  return s.split("|").map((part) => {
    const [t, sl, c, vd, b] = part.split(",");
    return { templateId: Number(t), strengthenLevel: Number(sl), count: Number(c), validDate: Number(vd), isBind: b === "true" };
  });
}
function createBoard(ctx: ServerContext): DiceCell[] {
  const rows = pool(ctx, "dice", DEFAULT_DICE_POOL);
  return drawDistinct(rows, 19).map((c) => ({ templateId: c.templateId, strengthenLevel: c.strengthenLevel, count: c.count, validDate: c.validDate, isBind: c.isBind }));
}

const cache = new WeakMap<GamePlayer, DiceDataRow>();

async function getOrCreate(ctx: ServerContext, p: GamePlayer): Promise<{ row: DiceDataRow; board: DiceCell[] }> {
  let row = cache.get(p) ?? (await loadDiceData(ctx.db.db, p.id)) ?? newDiceData(p.id);
  let board = decodeBoard(row.AwardArray);
  if (board.length < 1) {
    board = createBoard(ctx);
    row = await saveDiceData(ctx.db.db, { ...row, AwardArray: encodeBoard(board) });
  }
  cache.set(p, row);
  return { row, board };
}

function sendData(p: GamePlayer, row: DiceDataRow, board: DiceCell[]): void {
  p.send(Out.diceReceiveData(p.id, row.UserFirstCell, row.CurrentPosition, row.LuckIntegralLevel, row.LuckIntegral, row.FreeCount, board));
}

const DICE_KINDS: Record<number, { range: [number, number]; priceKey: string; priceDefault: number }> = {
  1: { range: [2, 12], priceKey: "DoubleDicePrice", priceDefault: 40_000 },
  2: { range: [4, 6], priceKey: "BigDicePrice", priceDefault: 50_000 },
  3: { range: [1, 3], priceKey: "SmallDicePrice", priceDefault: 60_000 },
};
const DEFAULT_DICE_KIND = { range: [1, 6] as [number, number], priceKey: "CommonDicePrice", priceDefault: 30_000 };
function rollDice(ctx: ServerContext, diceType: number): { value: number; price: number } {
  const kind = DICE_KINDS[diceType] ?? DEFAULT_DICE_KIND;
  const [lo, hi] = kind.range;
  const price = ctx.templates.cfgInt(kind.priceKey, kind.priceDefault);
  const value = lo + Math.floor(Math.random() * (hi - lo + 1));
  return { value, price };
}

/** 134 DICE_SYSTEM: byte sub (10 enter/11 roll/12 refresh). */
export async function diceSystem(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const sub = pkt.readByte();
  if (!isOpen(ctx, "dice")) return p.sendMessage(0, "Sistema de Dados fechado.");

  if (sub === 10) {
    const { row, board } = await getOrCreate(ctx, p);
    return sendData(p, row, board);
  }

  if (sub === 11) {
    const { row, board } = await getOrCreate(ctx, p);
    if (row.LuckIntegral >= INTEGRAL_POINT[MAX_LEVEL - 1]!) return p.sendMessage(0, "Você já atingiu o nível máximo de sorte.");
    const diceType = pkt.readInt();
    pkt.readInt(); // posição — lida e descartada, igual ao DiceHandler.cs original (servidor é autoritativo)
    const { value: rollValue, price } = rollDice(ctx, diceType);
    if (row.FreeCount > 0) {
      row.FreeCount--;
    } else if (p.info.Money + p.info.MoneyLock >= price) {
      p.removeMoney(price);
    } else {
      return p.sendMessage(0, "Moedas insuficientes para rolar o dado.");
    }
    const oldPosition = row.CurrentPosition;
    let newPosition = oldPosition + rollValue;
    if (newPosition > 18) newPosition -= 19;
    const cell = board[newPosition % board.length]!;
    const g = grantRewards(p, [{ templateId: cell.templateId, count: cell.count, validDate: cell.validDate, isBind: cell.isBind, strengthenLevel: cell.strengthenLevel }], ctx.templates.findItem, ctx.now());
    if (g.overflow.length) void mailItems(ctx, p, g.overflow, "Dados", 8);
    const rewardName = ctx.templates.findItem(cell.templateId)?.Name ?? "Item";

    const luckGain = 2 + Math.floor(Math.random() * 11); // threadSafeRandom_0.Next(2,13)
    let luckIntegral = row.LuckIntegral + luckGain;
    let level = row.LuckIntegralLevel;
    if (level + 1 < MAX_LEVEL && luckIntegral >= INTEGRAL_POINT[level + 1]!) {
      level++;
      const awards = await loadDiceLevelAward(ctx.db.db, level + 1);
      if (awards.length) {
        const g2 = grantRewards(p, awards.map((a) => ({ templateId: a.TemplateID, count: a.Count, validDate: a.ValidDate, isBind: a.IsBinds, strengthenLevel: a.StrengthenLevel })), ctx.templates.findItem, ctx.now());
        if (g2.overflow.length) void mailItems(ctx, p, g2.overflow, "Dados - nível", 8);
      }
    }
    if (level > 3) { level = 3; luckIntegral = INTEGRAL_POINT[MAX_LEVEL - 1]!; } // bug original replicado, ver cabeçalho

    const saved = await saveDiceData(ctx.db.db, { ...row, CurrentPosition: newPosition, LuckIntegral: luckIntegral, LuckIntegralLevel: level });
    cache.set(p, saved);
    return p.send(Out.diceRollResult(p.id, oldPosition, rollValue, luckIntegral, level, saved.FreeCount, rewardName));
  }

  if (sub === 12) {
    const { row } = await getOrCreate(ctx, p);
    const price = ctx.templates.cfgInt("DiceRefreshPrice", 40_000);
    if (!(p.info.Money + p.info.MoneyLock >= price)) return p.sendMessage(0, "Moedas insuficientes para atualizar o tabuleiro.");
    p.removeMoney(price);
    const board = createBoard(ctx);
    const saved = await saveDiceData(ctx.db.db, { ...row, AwardArray: encodeBoard(board) });
    cache.set(p, saved);
    return sendData(p, saved, board);
  }
}
