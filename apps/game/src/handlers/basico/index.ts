/**
 * Aba no jogo: índice da infra básica de sessão/lobby inteira (01 §1, §2) — login, ping/heartbeat, salvar,
 * opções, cena/lobby e os pacotes mortos/obsoletos. Cada ação tem o seu próprio arquivo:
 *
 *   login.ts     (tela de login)                    — 1 LOGIN (preLogin)
 *   ping.ts      (sem tela, ping/heartbeat)          — 4 PING (preLogin), 5 SYS_DATE, 300 BAOLTFUNCTION
 *   salvar.ts    (sem tela, save sob demanda)        — 172 SAVE_DB
 *   opcoes.ts    (Configurações › opções)            — 64 OPTION_UPDATE
 *   cena.ts      (Lobby › entrar/sair/lista online)  — 16 SCENE_LOGIN, 21 SCENE_REMOVE_USER, 69 SCENE_USERS_LIST
 *   diversos.ts  (sem tela, log/ecos/obsoletos)       — 8 CLIENT_LOG, 225 ENTHRALL_SWITCH, 224 CID_CHECK (noop fiel),
 *                                                        + 8 pacotes obsoletos (ver `OBSOLETE_NOOPS`)
 *
 * Pacotes: ver tabela acima. C#: `Game.Server/Packets/Client/*.cs` (ver cabeçalho de cada arquivo).
 * Como testar: `apps/game/test/*` (infra de sessão, pré-requisito de quase todo teste).
 * Manual: `docs/features/lobby.md`, `docs/features/login-conta.md`.
 */
import type { HandlerRegistry } from "../registry.js";
import { login } from "./login.js";
import { baoltfunction, ping, sysDate } from "./ping.js";
import { saveDb } from "./salvar.js";
import { optionUpdate } from "./opcoes.js";
import { sceneLogin, sceneRemoveUser, sceneUsersList } from "./cena.js";
import { cidCheck, clientLog, enthrallSwitch, OBSOLETE_NOOPS } from "./diversos.js";

export { checkMissingHeartbeat } from "./ping.js";

export function registerBasico(r: HandlerRegistry): void {
  r.register({ code: 1, name: "LOGIN", preLogin: true, status: "implemented", handle: (ctx, c) => login(ctx, c) });
  // 4 PING: PingTimeCallBackHandler — PingTime = agora - PingStart.
  r.register({ code: 4, name: "PING", preLogin: true, status: "implemented", handle: (ctx, c) => ping(ctx, c.player) });
  r.player(5, "SYS_DATE", sysDate);
  r.player(8, "CLIENT_LOG", clientLog);
  r.player(172, "SAVE_DB", saveDb);
  r.player(300, "BAOLTFUNCTION", baoltfunction);
  r.player(225, "ENTHRALL_SWITCH", enthrallSwitch);
  // 224 CID_CHECK: handler morto confirmado no C# original (ver diversos.ts) — noop é fiel, não pendência;
  // "implemented" (41-stubs-rates), não "stub".
  r.player(224, "CID_CHECK", cidCheck);
  r.player(16, "SCENE_LOGIN", sceneLogin);
  r.player(21, "SCENE_REMOVE_USER", sceneRemoveUser);
  r.player(69, "SCENE_USERS_LIST", sceneUsersList);
  r.player(64, "OPTION_UPDATE", (_ctx, p, pkt) => optionUpdate(p, pkt));
  for (const [code, name] of OBSOLETE_NOOPS) r.player(code, name, () => {});
}
