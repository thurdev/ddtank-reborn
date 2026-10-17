/**
 * Aba no jogo: nenhuma (desafio anti-bot que apareceria sobre a tela, nunca chega a aparecer aqui — ver nota).
 * Pacote: 200 CHECK_CODE.
 * C#: `CheckCodeHandler.cs:782` — verifica o texto digitado contra `PlayerInfo.CheckCode`.
 * O lado que EMITE o desafio (`ShowCheckCode`/`client.Player.PlayerCharacter.CheckCode`) nunca foi portado,
 * então `CheckCode` fica sempre vazio aqui — isso reproduz o próprio early-out do original (`return 1`
 * quando `CheckCode` é nulo/vazio) em vez de fingir sucesso.
 * Como testar: sem teste dedicado (nada pra testar enquanto o desafio nunca é emitido).
 * Manual: não aplicável — ver `research/qa/port-plan.md` bloco F pra portar o lado que falta.
 */
import type { HandlerRegistry } from "../registry.js";

export function registerCodigoVerificacao(r: HandlerRegistry): void {
  r.player(200, "CHECK_CODE", (_ctx, _p, pkt) => {
    pkt.readString();
  }, "partial");
}
