/**
 * Aba no jogo: índice da Academia inteira (mestre/aprendiz) — registra o roteador do pacote 141 ACADEMY.
 * Cada ação tem o seu próprio arquivo, nomeado como o jogador vê na tela:
 *
 *   relacao.ts          (sem tela própria, infra compartilhada) — string de relação, pedidos em memória,
 *                                                                  pacotes, mail, constantes
 *   pedir-relacao.ts    (Academia › pedir/recusar)    — sub 4 ACADEMY_FOR_APPRENTICE, sub 5
 *                                                        ACADEMY_FOR_MASTER, sub 8 MASTER_REFUSE, sub 9
 *                                                        APPRENTICE_REFUSE
 *   aceitar-relacao.ts  (Academia › aceitar pedido)   — sub 6 MASTER_CONFIRM, sub 7 APPRENTICE_CONFIRM
 *   expulsar.ts         (Academia › romper relação)   — sub 12 FIRE_MASTER, sub 13 FIRE_APPRENTICE
 *   premios-nivel.ts    (sem tela própria, dispara no level-up) — `updateAwardApp`, chamado por
 *                                                                  `session/login.ts` via `p.onGradeUp`
 *
 * Pacotes: 141 ACADEMY (sub-roteador por byte). `ACADEMY_REGISTER`(1)/`ACADEMY_REMOVE`(3) são ignorados
 * no original (a lista de clube é montada a partir de todo jogador elegível) — ficam como stub aqui.
 * C#: `AcademyHandler.cs` + `Managers/AcademyMgr.cs` + helpers de mestre/aprendiz em `PlayerInfo`
 * (`SqlDataProvider/Data/PlayerInfo.cs:2511-2563`). Pedidos ficam só em memória (1h,
 * `AcademyMgr.RemoveOldRequest`); a relação em si vai direto pra `Sys_Users_Detail`
 * (`PlayerBussiness.UpdateAcademyPlayer` / `SP_UsersAcademy_Update`).
 * Como testar: `apps/game/test/academy.test.ts`. Manual: `docs/features/academia.md` tem o passo a passo
 * de cada ação.
 */
import type { HandlerRegistry } from "../registry.js";
import { SubRouter } from "../registry.js";
import { academyForApprentice, academyForMaster, masterRefuse, apprenticeRefuse } from "./pedir-relacao.js";
import { masterConfirm, apprenticeConfirm } from "./aceitar-relacao.js";
import { fireMasterPacket, fireApprenticePacket } from "./expulsar.js";

export { updateAwardApp } from "./premios-nivel.js";
export { parseRel, writeRel, addRel, removeRel, checkCanApp, checkCanMaster } from "./relacao.js";

/** Roteador do pacote 141 ACADEMY: um `.on(subcode, nome, fn)` por ação. */
export function academyRouter(): SubRouter {
  return new SubRouter("byte", "ACADEMY")
    // o handler original ignora registro / remoção de registro (a lista de clube é montada a partir de
    // todo jogador elegível, não de uma inscrição)
    .on(1, "ACADEMY_REGISTER", () => {}, "stub")
    .on(3, "ACADEMY_REMOVE", () => {}, "stub")
    .on(4, "ACADEMY_FOR_APPRENTICE", academyForApprentice)
    .on(5, "ACADEMY_FOR_MASTER", academyForMaster)
    .on(6, "MASTER_CONFIRM", masterConfirm)
    .on(7, "APPRENTICE_CONFIRM", apprenticeConfirm)
    .on(8, "MASTER_REFUSE", masterRefuse)
    .on(9, "APPRENTICE_REFUSE", apprenticeRefuse)
    .on(12, "FIRE_MASTER", fireMasterPacket)
    .on(13, "FIRE_APPRENTICE", fireApprenticePacket);
}

export function registerAcademia(r: HandlerRegistry): SubRouter {
  const a = academyRouter();
  r.player(141, "ACADEMY", a.handler);
  return a;
}
