/**
 * Aba no jogo: índice da Sociedade (guilda) inteira — um roteador só (129 CONSORTIA_CMD, sub-código int)
 * pra todas as telas: criar/dissolver, pedir entrada/convidar, sair/expulsar, cargos, banco/riqueza/doar,
 * loja de habilidades, evoluir sede/loja/ferraria/bônus, missão do clã, mural, emblema, correio do clã,
 * chat do clã, votação e "Semana da sociedade". Cada ação tem o seu próprio arquivo, nomeado como o
 * jogador vê na tela:
 *
 *   comum.ts             (sem tela própria, infra de resposta/entrada compartilhada)
 *   criar.ts             (Sociedade › criar/dissolver)         — sub 1 CREATE, sub 2 DISBAND
 *   entrar-pedir.ts      (Sociedade › pedir entrada/pendentes)  — sub 0 TRYIN, sub 4 TRYIN_PASS,
 *                                                                 sub 5 TRYIN_DEL, sub 7 APPLY_STATE
 *   convite.ts           (Sociedade › convidar jogador)         — sub 11 INVITE, sub 12 INVITE_PASS,
 *                                                                 sub 13 INVITE_DELETE
 *   sair-expulsar.ts     (Sociedade › sair/expulsar membro)     — sub 3 RENEGADE
 *   cargos.ts            (Sociedade › cargos/patentes)          — sub 9 DUTY_DELETE, sub 10 DUTY_UPDATE,
 *                                                                 sub 16 BANCHAT_UPDATE, sub 18
 *                                                                 USER_GRADE_UPDATE, sub 19 CHAIRMAN_CHAHGE
 *   banco-riqueza.ts     (Sociedade › banco/doar riqueza/medalha) — sub 6 RICHES_OFFER, sub 23 DONATE
 *                                                                 (design próprio), sub 24 EQUIP_CONTROL
 *   evolucao.ts          (Sociedade › evoluir sede/loja/...)    — sub 21 LEVEL_UP
 *   loja-habilidades.ts  (Sociedade › loja de habilidades)      — sub 26 SKILL_SOCKET
 *   missoes.ts           (Sociedade › missão do clã)            — sub 22 TASK_RELEASE
 *   mural.ts             (Sociedade › mural/descrição/obs.)     — sub 14 DESCRIPTION_UPDATE,
 *                                                                 sub 15 PLACARD_UPDATE, sub 17 USER_REMARK_UPDATE
 *   emblema.ts           (Sociedade › emblema)                  — sub 28 BUY_BADGE
 *   correio-guilda.ts    (Sociedade › carta pra todo o clã)     — sub 29 CONSORTION_MAIL
 *   chat-guilda.ts       (Sociedade › chat do clã)              — sub 20 CONSORTIA_CHAT
 *   votacao.ts           (Sociedade › votar candidato, design próprio) — sub 25 POLL_CANDIDATE
 *   semana-da-sociedade.ts (ícone "Semana da sociedade", design próprio) — 145 ACTIVITY_SYSTEM sub 7-13
 *                                                                 (roteado por `eventos/index.ts`, não aqui)
 *   guerra-gvg.ts         (sem tela própria, hook de fim de PVP) — `consortiaGameOver`
 *   login.ts             (sem tela própria, hook de login)       — `consortiaOnLogin`
 *
 * Pacotes: ver tabela acima. C#: `Game.Server/Consortia/Handle/*.cs` (ver cabeçalho de cada arquivo).
 * Permissão/custo: `game/consortia.ts`; procedures: `db/consortia.ts`; estado em memória: `game/consortia-mgr.ts`.
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: `docs/features/sociedade.md`.
 */
import type { HandlerRegistry } from "../registry.js";
import { SubRouter } from "../registry.js";
import { createConsortia, disbandConsortia } from "./criar.js";
import { applyState, tryIn, tryInDel, tryInPass } from "./entrar-pedir.js";
import { inviteAdd, inviteDelete, invitePass } from "./convite.js";
import { renegade } from "./sair-expulsar.js";
import { banChatUpdate, chairmanChange, dutyDelete, dutyUpdate, userGradeUpdate } from "./cargos.js";
import { donate, equipControl, richesOffer } from "./banco-riqueza.js";
import { levelUp } from "./evolucao.js";
import { skillSocket } from "./loja-habilidades.js";
import { taskRelease } from "./missoes.js";
import { descriptionUpdate, placardUpdate, userRemarkUpdate } from "./mural.js";
import { buyBadge } from "./emblema.js";
import { guildMail } from "./correio-guilda.js";
import { guildChat } from "./chat-guilda.js";
import { pollCandidate } from "./votacao.js";

export { consortiaGameOver } from "./guerra-gvg.js";
export { consortiaOnLogin } from "./login.js";
export { settlePollWeek } from "./votacao.js";
export { settleGuildWeek, guildMemberWeekRouter } from "./semana-da-sociedade.js";

/** Roteador de 129 CONSORTIA_CMD (int sub-código) — espelha `ConsortiaLogicProcessor`. */
function consortiaRouter(): SubRouter {
  const r = new SubRouter("int", "CONSORTIA_CMD");
  r.on(0, "CONSORTIA_TRYIN", tryIn);
  r.on(1, "CONSORTIA_CREATE", createConsortia);
  r.on(2, "CONSORTIA_DISBAND", disbandConsortia);
  r.on(3, "CONSORTIA_RENEGADE", renegade);
  r.on(4, "CONSORTIA_TRYIN_PASS", tryInPass);
  r.on(5, "CONSORTIA_TRYIN_DEL", tryInDel);
  r.on(6, "CONSORTIA_RICHES_OFFER", richesOffer);
  r.on(7, "CONSORTIA_APPLY_STATE", applyState);
  r.on(9, "CONSORTIA_DUTY_DELETE", dutyDelete);
  r.on(10, "CONSORTIA_DUTY_UPDATE", dutyUpdate);
  r.on(11, "CONSORTIA_INVITE", inviteAdd);
  r.on(12, "CONSORTIA_INVITE_PASS", invitePass);
  r.on(13, "CONSORTIA_INVITE_DELETE", inviteDelete);
  r.on(14, "CONSORTIA_DESCRIPTION_UPDATE", descriptionUpdate);
  r.on(15, "CONSORTIA_PLACARD_UPDATE", placardUpdate);
  r.on(16, "CONSORTIA_BANCHAT_UPDATE", banChatUpdate);
  r.on(17, "CONSORTIA_USER_REMARK_UPDATE", userRemarkUpdate);
  r.on(18, "CONSORTIA_USER_GRADE_UPDATE", userGradeUpdate);
  r.on(19, "CONSORTIA_CHAIRMAN_CHAHGE", chairmanChange);
  r.on(20, "CONSORTIA_CHAT", guildChat);
  r.on(21, "CONSORTIA_LEVEL_UP", levelUp);
  r.on(22, "CONSORTIA_TASK_RELEASE", taskRelease);
  r.on(23, "DONATE", donate);
  r.on(24, "CONSORTIA_EQUIP_CONTROL", equipControl);
  r.on(25, "POLL_CANDIDATE", pollCandidate);
  r.on(26, "SKILL_SOCKET", skillSocket);
  r.on(28, "BUY_BADGE", buyBadge);
  r.on(29, "CONSORTION_MAIL", guildMail);
  return r;
}

export function registerSociedade(r: HandlerRegistry): void {
  r.player(129, "CONSORTIA_CMD", consortiaRouter().handler);
}
