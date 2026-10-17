/**
 * Aba no jogo: ícone do hall "Labirinto" — sobe andar por andar lutando contra NPC (31 andares reais, 1-30
 * pares/ímpares alternando onda/chefe + o "piso 0" inicial), pode dobrar prêmio com item, "limpar" (resgata
 * tudo de uma vez pagando Cupons de presente) ou acelerar/pular tempo pagando Xu, reiniciar do zero.
 * Pacotes: 131 LABYRINTH (sub 1 DOUBLE_REWARD, 2 REQUEST_UPDATE, 3 CLEAN_OUT, 4 SPEEDED_UP_CLEAN_OUT,
 *   5 STOP_CLEAN_OUT, 6 RESET_LABYRINTH, 9 TRY_AGAIN); 94 GAME_ROOM sub 0/2 (criar/configurar sala
 *   `RoomType.Labyrinth`=15) é quem liga a luta de verdade — ver `currentLabyrinthFloor`/`updateLabyrinthFloor`/
 *   `outLabyrinth` abaixo, chamados por `handlers/salas/configurar-sala.ts` e `server.ts`.
 * C#: `LabyrinthHandler.cs`, `GamePlayer.cs` (`UpdateLabyrinth`/`OutLabyrinth`/`LabyrinthTryAgainMoney`/
 *   `CreateExps`/`labyrinthGolds`), `Game.Server/GameRoom/Handle/SetupChange.cs` (mapId 401 fixo).
 * Como testar: `apps/game/test/activities.test.ts` (`labyrinthTryAgainMoney`), `apps/game/test/labirinto.test.ts`
 *   (sala real via FakeClient). Manual: `docs/features/labirinto.md`.
 *
 * Nota (luta real): o combate usa o motor PvE genérico (`packages/fight`, `@ddt/fight`'s `PveGame`), igual
 * masmorra normal (`docs/features/pve-masmorras.md`) — `room.MapId=401` (`game."Pve_Info".ID`, fixo, igual ao
 * C# `SetupChange.cs:28`) + `room.currentFloor` = andar salvo do jogador. O script do jogo
 * (`GameServerScript.AI.Game.Labyrinth`, portado de `vendor/DDT-6600 Game.Server.Script/Game/Labyrinth.cs`,
 * já transpilado em `packages/fight/src/pve/scripts/generated/Game/Labyrinth.ts`) registra as 30 missões
 * `GameServerScript.AI.Messions.Labyrinth40001..40030` (idem, `generated/Messions/`) — cada vitória de missão
 * dispara `onMissionOver` (ver `server.ts`) que chama `updateLabyrinthFloor` aqui; o fim da "escalada" (derrota
 * ou acabaram as missões) dispara `onLabyrinthFinished`/`outLabyrinth`. As linhas `game."NPC_Info"`
 * 40001-40050 (monstros reais, "Kiến Mê Cung" etc) já existiam no snapshot original — só faltavam
 * `game."Pve_Info"`/`"Mission_Info"` (seed `packages/db/drizzle/0011_labirinto_pve_seed.sql`).
 */
import { eq } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import { player as P } from "@ddt/db";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { isOpen, num } from "./agendador.js";

/** Pve_Info.ID fixo do Labirinto (SetupChange.cs:28: `mapId = 401` quando `roomType == eRoomType.Labyrinth`). */
export const LABYRINTH_PVE_ID = 401;
/** Mission_Info.Id do andar N = 40000+N (seed 0011); além do andar 30 não existe missão → fim da escalada. */
const LABYRINTH_MAX_FLOOR = 30;

export type LabyrinthRow = typeof P.Sys_Users_Labyrinth.$inferSelect;
async function loadLabyrinth(ctx: ServerContext, p: GamePlayer): Promise<LabyrinthRow> {
  const [row] = await ctx.db.db.select().from(P.Sys_Users_Labyrinth).where(eq(P.Sys_Users_Labyrinth.UserID, p.id)).limit(1);
  if (row) return row;
  const fresh: LabyrinthRow = { UserID: p.id, myProgress: 0, myRanking: 0, completeChallenge: true, isDoubleAward: false, currentFloor: 1, accumulateExp: 0, remainTime: 0, currentRemainTime: 0, cleanOutAllTime: 0, cleanOutGold: 50, tryAgainComplete: true, isInGame: false, isCleanOut: false, serverMultiplyingPower: false, LastDate: ctx.now(), ProcessAward: "-1" };
  await ctx.db.db.insert(P.Sys_Users_Labyrinth).values(fresh).onConflictDoNothing();
  return fresh;
}
async function saveLabyrinth(ctx: ServerContext, row: LabyrinthRow): Promise<void> {
  await ctx.db.db.update(P.Sys_Users_Labyrinth).set(row).where(eq(P.Sys_Users_Labyrinth.UserID, row.UserID));
}
function labyrinthUpdatePkt(id: number, l: LabyrinthRow): GSPacket {
  const p = new GSPacket(131, id);
  p.writeByte(2);
  p.writeInt(l.myProgress); p.writeInt(l.myRanking); p.writeBoolean(l.completeChallenge); p.writeBoolean(l.isDoubleAward);
  p.writeInt(l.currentFloor); p.writeInt(l.accumulateExp); p.writeInt(l.remainTime); p.writeInt(l.currentRemainTime);
  p.writeInt(l.cleanOutAllTime); p.writeInt(l.cleanOutGold); p.writeBoolean(l.tryAgainComplete); p.writeBoolean(l.isInGame);
  p.writeBoolean(l.isCleanOut);
  return p;
}
function initProcessAward(): string {
  return Array.from({ length: 99 }, (_, i) => String(i)).join("-");
}
/** Daily reset shared by every entry point (`LabyrinthHandler.cs` sub `REQUEST_UPDATE`/any sub, run once per row load). */
function rollDaily(ctx: ServerContext, l: LabyrinthRow): void {
  const today = ctx.now().toISOString().slice(0, 10);
  if (today !== l.LastDate.toISOString().slice(0, 10)) {
    l.completeChallenge = true; l.accumulateExp = 0; l.isInGame = false; l.currentFloor = 1; l.tryAgainComplete = true; l.LastDate = ctx.now(); l.ProcessAward = initProcessAward();
  }
}
export function labyrinthTryAgainMoney(ctx: ServerContext, l: LabyrinthRow): number {
  const big = num(ctx, "labyrinth", "priceBig", 5000);
  const small = num(ctx, "labyrinth", "priceSmall", 1000);
  for (let i = 0; i < l.myProgress; i += 2) if (l.currentFloor === i) return big;
  return small;
}
/** GamePlayer.CreateExps(): exp[i] = 660 + 690*i, i=0..98 (floor is 1-based; clipped to the 99-entry table). */
function floorExp(floor: number): number {
  const i = Math.min(Math.max(floor - 1, 0), 98);
  return 660 + 690 * i;
}
/** GamePlayer.labyrinthGolds: "itemCount|hardCurrency" per floor — only even floors (the "boss gate") pay a
 *  bonus; odd floors are "0|0". 40 entries in the original; our real floors stop at 30 either way. */
const LABYRINTH_GOLDS: readonly [items: number, hardCurrency: number][] = [
  [0, 0], [2, 2], [0, 0], [2, 2], [0, 0], [2, 3], [0, 0], [3, 3], [0, 0], [3, 4],
  [0, 0], [3, 4], [0, 0], [4, 5], [0, 0], [4, 5], [0, 0], [4, 6], [0, 0], [5, 6],
  [0, 0], [5, 7], [0, 0], [5, 7], [0, 0], [6, 8], [0, 0], [6, 8], [0, 0], [6, 10],
  [0, 0], [8, 10], [0, 0], [8, 11], [0, 0], [8, 11], [0, 0], [10, 12], [0, 0], [10, 12],
];
function floorGold(floor: number): [items: number, hardCurrency: number] {
  const i = Math.min(Math.max(floor - 1, 0), LABYRINTH_GOLDS.length - 1);
  return LABYRINTH_GOLDS[i]!;
}
/** "Clean out": collect every 2-floor checkpoint reward from currentFloor..myProgress at once (see header note). */
function settleCleanOut(ctx: ServerContext, p: GamePlayer, l: LabyrinthRow): { exp: number; hardCurrency: number } {
  let exp = 0, hardCurrency = 0;
  for (let f = l.currentFloor; f <= l.myProgress; f += 2) {
    let gained = 660 + 690 * Math.max(0, f - 1);
    let hc = 10 * Math.max(1, f);
    if (l.isDoubleAward) { gained *= 2; hc *= 2; }
    exp += gained; hardCurrency += hc;
  }
  l.accumulateExp += exp;
  l.currentFloor = l.myProgress;
  l.remainTime = 0; l.currentRemainTime = 0; l.cleanOutAllTime = 0; l.isCleanOut = false; l.isInGame = false;
  if (exp) { p.addGP(exp, false); }
  if (hardCurrency) p.addHardCurrency(hardCurrency);
  return { exp, hardCurrency };
}

export async function labyrinthHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const sub = pkt.readInt();
  if (!isOpen(ctx, "labyrinth")) return p.sendMessage(0, "O Labirinto está fechado.");
  const l = await loadLabyrinth(ctx, p);
  rollDaily(ctx, l);
  switch (sub) {
    case 1: { // DOUBLE_REWARD
      const on = pkt.readBoolean();
      const item = p.propBag.getItemByTemplateID(0, 11916);
      if (!item) break;
      if (on && !l.isDoubleAward && p.propBag.removeTemplate(11916, 1)) l.isDoubleAward = true;
      break;
    }
    case 2: { // REQUEST_UPDATE
      let left = 0;
      for (let i = l.currentFloor; i <= l.myProgress; i++) left += 2;
      l.remainTime = left * 60; l.currentRemainTime = l.remainTime; l.cleanOutAllTime = l.remainTime;
      break;
    }
    case 3: { // CLEAN_OUT
      const price = num(ctx, "labyrinth", "cleanOutGiftToken", 100);
      if (p.info.GiftToken < price) { p.sendMessage(0, "Cupons de presente insuficientes."); l.isCleanOut = false; break; }
      p.removeGiftToken(price);
      l.isCleanOut = true;
      const r = settleCleanOut(ctx, p, l);
      if (r.exp || r.hardCurrency) p.sendMessage(0, `Labirinto: +${r.exp} exp, +${r.hardCurrency} moedas.`);
      break;
    }
    case 4: { // SPEEDED_UP_CLEAN_OUT
      if (!l.isCleanOut) { p.sendMessage(0, "O Labirinto ainda não foi limpo."); break; }
      const mins = Math.abs(Math.floor(l.currentRemainTime / 60));
      const price = num(ctx, "labyrinth", "pricePerMin", 10) * mins;
      if (p.info.Money < price) break;
      p.removeMoney(price);
      settleCleanOut(ctx, p, l);
      break;
    }
    case 5: // STOP_CLEAN_OUT
      l.isCleanOut = false;
      break;
    case 6: // RESET_LABYRINTH
      if (l.tryAgainComplete) { l.currentFloor = 1; l.accumulateExp = 0; l.tryAgainComplete = false; l.ProcessAward = initProcessAward(); p.sendMessage(0, "O Labirinto foi reiniciado."); }
      else p.sendMessage(0, "Ainda não é possível atualizar.");
      break;
    case 9: { // TRY_AGAIN
      const again = pkt.readBoolean(); pkt.readBoolean();
      if (again) {
        const price = labyrinthTryAgainMoney(ctx, l);
        if (p.info.Money >= price) { p.removeMoney(price); l.completeChallenge = true; l.isInGame = true; p.sendMessage(0, "Continuar o Labirinto."); }
      } else p.sendMessage(0, "Labirinto pausado.");
      break;
    }
    default:
      return;
  }
  await saveLabyrinth(ctx, l);
  p.send(labyrinthUpdatePkt(p.id, l));
}

/**
 * Entry point for `handlers/salas/configurar-sala.ts` (`GAME_ROOM_SETUP_CHANGE`, `mapId==0 && roomType==15`,
 * `SetupChange.cs:26-29`): resolves the floor the room should fight (`Player.Labyrinth.currentFloor`) and marks
 * the run as started (`isInGame=true`; original sets this on `TRY_AGAIN`/the clean-out timer — this is the
 * missing "fresh start" trigger now that the room really fights). Caller still owns the `isOpen` gate via
 * `criar-sala.ts` (checked again here in case the event closed between create and setup-change).
 */
export async function currentLabyrinthFloor(ctx: ServerContext, p: GamePlayer): Promise<number> {
  if (!isOpen(ctx, "labyrinth")) { p.sendMessage(0, "O Labirinto está fechado."); return 1; }
  const l = await loadLabyrinth(ctx, p);
  rollDaily(ctx, l);
  l.isInGame = true;
  await saveLabyrinth(ctx, l);
  return l.currentFloor;
}

/**
 * `onMissionOver` hook (`server.ts`, `g.roomType === RoomType.Labyrinth && g.isWin`) — one call per floor won
 * inside the PvE room's auto-climb (`PveGame.hasNextSession`). Port of `GamePlayer.UpdateLabyrinth(floor,
 * missionId, bigAward)` (GamePlayer.cs:4382-4435); `bigAward` is always true here because the only path that
 * actually reaches `UpdateLabyrinth` for Labyrinth in the original is the gate-triggered `ShowBigBox`
 * (PVEGame.cs:1495-1515), fired on every floor's `CreateGate(true)` — the separate `GameOverMovie` call
 * (`bigAward:false`) is always shadowed by it (see `docs/features/labirinto.md`). Item drop (`CopyDrop(2,
 * 40002)`) isn't ported — same simplification `settleCleanOut` above already makes (no `Drop_Condiction` row
 * for it either); only the exp + hard-currency side of the reward is granted.
 */
export async function updateLabyrinthFloor(ctx: ServerContext, p: GamePlayer, missionId: number): Promise<void> {
  const floor = missionId - 40000;
  if (floor < 1 || floor > LABYRINTH_MAX_FLOOR) return; // not a Labyrinth floor (defensive)
  const l = await loadLabyrinth(ctx, p);
  let exp = floorExp(floor);
  let [, hardCurrency] = floorGold(floor);
  // GamePlayer.cs:4396-4399: each floor win spends one more scroll to keep the double running; out of scrolls
  // turns it off instead of failing the floor.
  if (l.isDoubleAward && !p.propBag.removeTemplate(11916, 1)) l.isDoubleAward = false;
  if (l.isDoubleAward) { exp *= 2; hardCurrency *= 2; }
  l.accumulateExp += exp;
  const next = floor + 1;
  if (next > l.myProgress) l.myProgress = next;
  if (next > l.currentFloor) l.currentFloor = next;
  if (exp) p.addGP(exp, false);
  if (hardCurrency) p.addHardCurrency(hardCurrency);
  await saveLabyrinth(ctx, l);
  p.send(labyrinthUpdatePkt(p.id, l));
  p.sendMessage(0, `Labirinto andar ${floor}: +${exp} exp${hardCurrency ? `, +${hardCurrency} moedas` : ""}.`);
}

/**
 * `onLabyrinthFinished` hook (`room-mgr.ts` → `server.ts`) — fires once when the room's auto-climb truly stops
 * (a floor lost, or no mission left past `LABYRINTH_MAX_FLOOR`). Port of `GamePlayer.OutLabyrinth(isWin)` +
 * `ResetLabyrinth()` (GamePlayer.cs:4315-4352): on a loss past floor 1, nudges the client's "tentar de novo"
 * prompt (same packet/price as the `131 LABYRINTH` sub 9 reply); either way the run-scoped fields reset so the
 * next `createUserGuide` starts a fresh attempt from the saved `currentFloor`.
 */
export async function outLabyrinth(ctx: ServerContext, p: GamePlayer, isWin: boolean): Promise<void> {
  const l = await loadLabyrinth(ctx, p);
  if (!isWin && l.currentFloor > 1) {
    const again = new GSPacket(131, p.id);
    again.writeByte(9);
    again.writeInt(labyrinthTryAgainMoney(ctx, l));
    p.send(again);
  }
  l.isInGame = false;
  l.completeChallenge = false;
  l.ProcessAward = initProcessAward();
  await saveLabyrinth(ctx, l);
  p.send(labyrinthUpdatePkt(p.id, l));
}
