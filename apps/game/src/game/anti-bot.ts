/**
 * 200 CHECK_CODE: anti-bot captcha challenge. Emit side (`GamePlayer.ShowCheckCode`/`isPassCheckCode`,
 * `GamePlayer.cs:1070-1237`) — never ported before this task (`handlers/bolsa/codigo-verificacao.ts` only
 * had the validation early-out). Trigger: 4 independent counters, each capped at a FRESH random threshold
 * re-rolled on every `isPassCheckCode()` call (`count_random.Next(min,max)`, C# `Random.Next` is
 * max-EXCLUSIVE — ported as `randInt` below) — money gained, GP gained, guild disbands, workbench item
 * moves. Any counter past its roll, or a challenge already pending (`CheckCount != 0`), fails the gate.
 * Real call sites ported (`isPassCheckCode()`/`ShowCheckCode()` pairs in the original):
 *  - `ConsortiaDisband.cs:22-26` -> `handlers/sociedade/criar.ts` `disbandConsortia` (CountFunction++ on success).
 *  - `GameStart.cs:44-50` (ranked PvP, AvgLevel>14, RoomType.Match) -> `handlers/salas/iniciar-partida.ts` `iniciarPartida`.
 *  - `UserChangeItemPlaceHandler.cs:49-55` (move INTO the workbench/Store bag) -> `handlers/bolsa/mover.ts` `changeItemPlace` (CountFunction2++ on gate pass).
 * Server_Config `AntiBotCheckCodeEnabled` (0/1, default 0/OFF): `isPassCheckCode` always returns `true`
 * (challenge never triggers) while off, so the default server never shows this popup. Image/answer:
 * `generateCheckCode`/`renderCheckCodeImage` (game/check-code-image.ts) — a real 4-digit numeric code
 * (`Bussiness/CheckCode.GenerateCheckCode`) drawn as a real, valid PNG.
 * Validation + penalty (`CheckCodeHandler.cs`): `handleCheckCodeAnswer` below, wired from
 * `handlers/bolsa/codigo-verificacao.ts`. Deviation documented, NOT ported on purpose: the original also
 * disconnects a player with ANY pending challenge on its periodic autosave tick whenever `CheckDate+20min
 * > Now` (`GamePlayer.cs:4485-4489`) — since `CheckDate` is set to "now" the moment the challenge is shown,
 * that condition is true immediately and stays true for the next 20 minutes, i.e. it would kick almost
 * every challenged player before they can even answer. That reads as an inverted condition (should very
 * likely be `<= 0`, "more than 20 minutes unanswered"), not an intended penalty — replicating it would make
 * the whole feature actively hostile instead of just unobtrusive, so it's left out; a stale pending
 * challenge just gets silently replaced by a fresh one the next time any gated action is attempted.
 * Manual: `docs/features/login-conta.md` (seção "Código anti-bot"). Como testar: `apps/game/test/anti-bot.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "./player.js";
import type { ServerContext } from "../session/context.js";
import { generateCheckCode, renderCheckCodeImage } from "./check-code-image.js";

/** C# `Random.Next(minValue, maxValue)`: inclusive min, EXCLUSIVE max. */
function randInt(min: number, maxExclusive: number, rnd: () => number = Math.random): number {
  return min + Math.floor(rnd() * (maxExclusive - min));
}

export function antiBotEnabled(ctx: ServerContext): boolean {
  return ctx.templates.cfgInt("AntiBotCheckCodeEnabled", 0) !== 0;
}

/**
 * GamePlayer.isPassCheckCode (GamePlayer.cs:1198-1208): true while no challenge is pending AND every
 * counter is still under its (freshly re-rolled) random threshold. Always true while the feature is off.
 */
export function isPassCheckCode(ctx: ServerContext, p: GamePlayer, rnd: () => number = Math.random): boolean {
  if (!antiBotEnabled(ctx)) return true;
  const checkMoney = randInt(10, 15, rnd);
  const checkGp = randInt(30, 40, rnd);
  const checkFunction = randInt(7, 10, rnd);
  const checkFunction2 = randInt(40, 60, rnd);
  return p.info.CheckCount === 0 && p.countAddMoney < checkMoney && p.countAddGP < checkGp && p.countFunction < checkFunction && p.countFunction2 < checkFunction2;
}

/** GamePlayer.ShowCheckCode (GamePlayer.cs:1218-1237): generates a fresh code, sends the challenge (sub byte
 *  1 first-offense / 2 repeat offender, per CheckError). */
export function showCheckCode(p: GamePlayer, rnd: () => number = Math.random): void {
  p.info.CheckCount = 1;
  const code = generateCheckCode(rnd);
  p.checkCode = code;
  const pkt = new GSPacket(200);
  pkt.writeByte(p.info.CheckError < 1 ? 1 : 2);
  pkt.writeBoolean(true);
  pkt.writeByte(1);
  pkt.writeString("hi");
  pkt.write(renderCheckCodeImage(code, rnd));
  p.send(pkt);
}

/** GamePlayer.resetPassCode (GamePlayer.cs:1210-1216): zeroes the 4 trigger counters. */
function resetPassCode(p: GamePlayer): void {
  p.countAddMoney = 0;
  p.countAddGP = 0;
  p.countFunction = 0;
  p.countFunction2 = 0;
}

/**
 * CheckCodeHandler.cs: validates the typed answer against the pending code. Nothing pending (`checkCode`
 * still the "baodeptrai" sentinel) is the original's own early-out (`string.IsNullOrEmpty` — reproduced
 * here as "nothing to check against", same observable effect: no action, no penalty).
 */
export function handleCheckCodeAnswer(ctx: ServerContext, p: GamePlayer, answer: string): void {
  if (p.checkCode === "baodeptrai") return;
  if (answer === "cheat") {
    p.info.CheckCount++;
    p.sendMessage(0, ctx.lang.t("CheckCodeHandler.Msg3"));
    p.sink.disconnect("check-code: cheat string");
    return;
  }
  if (p.checkCode.toLowerCase() === answer.toLowerCase()) {
    p.info.CheckCount = 0;
    p.checkCode = "baodeptrai";
    resetPassCode(p);
    p.sendMessage(0, "Verificação concluída com sucesso, bom jogo!");
    const pkt = new GSPacket(200);
    pkt.writeByte(1);
    pkt.writeBoolean(false);
    p.send(pkt);
  } else if (p.info.CheckError < 9) {
    p.info.CheckCount++;
    p.sendMessage(3, "Código incorreto — errar demais pode te desconectar.");
    p.info.CheckError++;
    showCheckCode(p);
  } else {
    p.info.CheckCount++;
    p.sendMessage(0, "Código incorreto demais vezes, até logo!");
    p.sink.disconnect("check-code: too many wrong answers");
    return;
  }
}
