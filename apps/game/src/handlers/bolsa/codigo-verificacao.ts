/**
 * Aba no jogo: nenhuma própria — desafio anti-bot que aparece sobre a tela atual quando o servidor empurra
 * 200 CHECK_CODE (`game/anti-bot.ts` `showCheckCode`, gatilhos em `sociedade/criar.ts`,
 * `salas/iniciar-partida.ts`, `bolsa/mover.ts`; desligado por padrão, `Server_Config
 * AntiBotCheckCodeEnabled`).
 * Pacote: 200 CHECK_CODE (inbound = resposta digitada pelo jogador).
 * C#: `CheckCodeHandler.cs` — verifica o texto digitado contra `PlayerInfo.CheckCode`.
 * 41-captcha-anti-bot: lado que EMITE o desafio portado (`game/anti-bot.ts`
 * `isPassCheckCode`/`showCheckCode`); este handler agora valida de verdade via `handleCheckCodeAnswer`.
 * Como testar: `apps/game/test/anti-bot.test.ts`. Manual: `docs/features/anti-bot.md`.
 */
import { handleCheckCodeAnswer } from "../../game/anti-bot.js";
import type { HandlerRegistry } from "../registry.js";

export function registerCodigoVerificacao(r: HandlerRegistry): void {
  r.player(200, "CHECK_CODE", (ctx, p, pkt) => {
    const answer = pkt.readString();
    handleCheckCodeAnswer(ctx, p, answer);
  });
}
