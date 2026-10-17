/**
 * Aba no jogo: tela de login — só a entrada do pacote; a lógica de verdade mora em `session/login.ts`.
 * Pacotes: 1 LOGIN.
 * C#: `UserLoginHandler.cs`.
 * Como testar: `apps/game/test/*` (login é pré-requisito de quase todo teste). Manual: tela de login.
 */
import type { GameClient } from "../../session/client.js";
import { handleLogin } from "../../session/login.js";
import type { ServerContext } from "../../session/context.js";

/** 1 LOGIN — único pacote aceito antes do login completar junto com 4 PING (preLogin). */
export function login(ctx: ServerContext, c: GameClient): void | Promise<void> {
  return handleLogin(ctx, c);
}
