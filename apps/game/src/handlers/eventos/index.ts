/**
 * Aba no jogo: índice dos ícones do lobby + calendário (tudo que já foi `activities.ts`/`events.ts`).
 * Cada ícone/atividade tem o seu próprio arquivo, nomeado como o jogador vê na tela:
 *
 *   agendador.ts            — motor do `app."ScheduledEvents"` (sem tela própria): `EventsRuntime`,
 *                              helpers de config (`paramsOf`/`isOpen`/`pool`/`num`/`arr`), gancho de login.
 *   boss-mundial.ts          (ícone "Boss mundial")       — 102 WORLDBOSS_CMD
 *   liga-elite.ts            (ícones "Liga"/"Liga de elite") — 132 BATTLEGROUND, 162 ELITEGAME
 *   bau-da-galinha.ts        (ícone "Baú do Rei Galo")    — 87 NEWCHICKENBOX_SYS cmds 10-15 (despacha 31-34)
 *   estrela-da-sorte.ts      (ícone "Estrela da Sorte")   — 87 NEWCHICKENBOX_SYS cmds 31-34 (via bau-da-galinha)
 *   roleta.ts                (ícone "Roleta"/Caddy)       — 26/27/28/45/204/232, 97/165/211/215 "Pedra da
 *                              Sorte" (6600, fechada no original — ver roleta.ts)
 *   labirinto.ts             (ícone "Labirinto")          — 131 LABYRINTH
 *   novato.ts                (ícone "Atividades de novato") — 258 NOVICEACTIVITY
 *   ativacao-pintinho.ts     (ícone "Ativação do pintinho") — 84 ACTIVITY_PACKAGE
 *   recompensa-diaria.ts     (calendário › diária/caixa de tempo) — 13 DAILY_AWARD, 53 GET_TIME_BOX,
 *                              219 WEEKLY_CLICK_CNT, 103 DAILYRECORD
 *   presenca.ts               (calendário › presença/login acumulado) — 90 GET_SIGNAWARD, 338 (4.1) / 238
 *                              (6600, m3-accumulative-login) ACCUMULATIVELOGIN_AWARD
 *   primeira-recarga.ts       (VIP › primeira recarga)    — 259 FIRSTRECHARGE
 *   completar-conquista.ts    (ícone "Conquistas")        — 230 ACHIEVEMENT_FINISH
 *                              (distinto de `bolsa/conquistas.ts`, que é a FICHA/lista de conquistas — 203 LOOKUP_EFFORT)
 *   ../minigame-termas/        (minigame "Đại chiến Hút Gà", pasta própria) — 166 LITTLEGAME_COMMAND
 *                              (ver `docs/features/termas.md` §6; não confundir com `handlers/termas/`,
 *                              a sala de relaxar da Fonte Termal — mesmo menu, mundos diferentes)
 *   caminho-da-luz.ts         (ícone "Caminho da luz", design próprio) — 145 ACTIVITY_SYSTEM inteiro
 *                              (roteador único: sub 64-66 aqui, sub 7-13 despacha pra
 *                              `sociedade/semana-da-sociedade.ts`, sub 37-45 LanternRiddles sem handler)
 *
 * 104 CARD_LOTTERY / 105 LUCK_LOTTERY / 239 GOTO_CARD_LOTTERY / 11 ACTIVE_PULLDOWN: SAÍRAM de "morto" —
 * ver `progressao/loterias.ts` (design próprio, sem fonte C#). 37-45 LanternRiddles de 145 ACTIVITY_SYSTEM
 * continuam sem handler (fora do pedido desta sessão) e 128/130 (LeftGunHandler/LeftGunCompleteHandler,
 * comentados no próprio C#) continuam mortos.
 *
 * Pacotes: ver tabela acima.
 * C#: ver cabeçalho de cada arquivo listado.
 * Como testar: `apps/game/test/activities.test.ts`, `apps/game/test/events.test.ts`,
 * `apps/game/test/littlegame.test.ts` (166). Manual:
 * `docs/features/eventos.md`, `docs/features/labirinto.md`, `docs/features/boss-mundial.md`, `docs/features/vip.md`.
 */
import type { HandlerRegistry } from "../registry.js";
import { worldBossCmd } from "./boss-mundial.js";
import { battleGroundHandler, eliteGameHandler } from "./liga-elite.js";
import { newChickenBoxDispatch } from "./bau-da-galinha.js";
import { lotteryOpenBox, lotteryRandomSelect, lotteryFinish, caddyBadLuck, openAllCardBox, caddySellAll, luckStoneConfig, luckStoneRankLimit, caddyExchangeAll, caddyConvertedAll } from "./roleta.js";
import { labyrinthHandler } from "./labirinto.js";
import { noviceActivityHandler } from "./novato.js";
import { activityPackageHandler } from "./ativacao-pintinho.js";
import { dailyAwardHandler, timeBox, weeklyClickCnt, dailyRecordHandler } from "./recompensa-diaria.js";
import { signAwardHandler, accumulativeLoginHandler } from "./presenca.js";
import { firstRechargeHandler } from "./primeira-recarga.js";
import { achievementFinishHandler } from "./completar-conquista.js";
import { littleGameRouter } from "../minigame-termas/index.js";
import { activitySystemRouter } from "./caminho-da-luz.js";

/**
 * Tabela código → função → ícone do jogo. Cada linha é um pacote que o cliente manda; a ordem aqui não
 * importa pro jogo (o registro é por código), só ajuda a achar rápido o que responde a quê.
 */
export function registerEventos(r: HandlerRegistry): void {
  // Calendário — diária / caixa de tempo / presença / login acumulado / primeira recarga
  r.player(13, "DAILY_AWARD", (ctx, p, pkt) => dailyAwardHandler(ctx, p, pkt));
  r.player(53, "GET_TIME_BOX", (ctx, p, pkt) => timeBox(ctx, p, pkt));
  r.player(219, "WEEKLY_CLICK_CNT", (ctx, p) => weeklyClickCnt(ctx, p));
  r.player(103, "DAILYRECORD", (ctx, p) => dailyRecordHandler(ctx, p));
  r.player(90, "GET_SIGNAWARD", (ctx, p, pkt) => signAwardHandler(ctx, p, pkt));
  r.player(338, "ACCUMULATIVELOGIN_AWARD (41)", (ctx, p, pkt) => accumulativeLoginHandler(ctx, p, pkt));
  // 238 colide: ACCUMULATIVELOGIN_AWARD (6600) vs MARRYINFO_DELETE (4.1, nunca implementado) — ver presenca.ts.
  r.player(238, "ACCUMULATIVELOGIN_AWARD (6600)/MARRYINFO_DELETE", (ctx, p, pkt) => { if (p.clientKind === "6600") return accumulativeLoginHandler(ctx, p, pkt); });
  r.player(259, "FIRSTRECHARGE", (ctx, p, pkt) => firstRechargeHandler(ctx, p, pkt));

  // Conquistas
  r.player(230, "ACHIEVEMENT_FINISH", (ctx, p, pkt) => achievementFinishHandler(ctx, p, pkt));

  // Baú do Rei Galo + Estrela da Sorte (mesmo pacote 87, despachado por cmd)
  r.player(87, "NEWCHICKENBOX_SYS", (ctx, p, pkt) => newChickenBoxDispatch(ctx, p, pkt), "partial");

  // Roleta / Caddy
  r.player(26, "LOTTERY_OPEN_BOX", (ctx, p, pkt) => lotteryOpenBox(ctx, p, pkt));
  r.player(27, "LOTTERY_RANDOM_SELECT", (ctx, p) => lotteryRandomSelect(ctx, p));
  r.player(28, "LOTTERY_FINISH", (ctx, p) => lotteryFinish(ctx, p));
  r.player(45, "CADDY_GET_BADLUCK", (ctx, p) => caddyBadLuck(ctx, p));
  r.player(204, "OPEN_ALL_CARDBOX", (_ctx, p) => openAllCardBox(p));
  r.player(232, "CADDY_SELL_ALL_GOODS", (_ctx, p) => caddySellAll(p));

  // "Pedra da Sorte" (6600 only, m3-caddy-loteria) — fechada no original, ver roleta.ts.
  r.player(165, "LUCKSTONE_CONFIG", (ctx, p) => luckStoneConfig(ctx, p), "stub");
  r.player(97, "LUCKSTONE_RANK_LIMIT", (ctx, p, pkt) => luckStoneRankLimit(ctx, p, pkt), "stub");
  r.player(211, "CADDY_EXCHANGE_ALL", (ctx, p) => caddyExchangeAll(ctx, p), "stub");
  r.player(215, "CADDY_CONVERTED_ALL", (ctx, p, pkt) => caddyConvertedAll(ctx, p, pkt), "stub");

  // Labirinto
  r.player(131, "LABYRINTH", (ctx, p, pkt) => labyrinthHandler(ctx, p, pkt), "partial");

  // Liga / Liga de elite / Boss mundial
  r.player(132, "BATTLEGROUND", (ctx, p, pkt) => battleGroundHandler(ctx, p, pkt));
  r.player(162, "ELITEGAME", (ctx, p, pkt) => eliteGameHandler(ctx, p, pkt), "partial");
  r.player(102, "WORLDBOSS_CMD", (ctx, p, pkt) => worldBossCmd(ctx, p, pkt), "partial");

  // Atividades de novato / Ativação do pintinho
  r.player(258, "NOVICEACTIVITY", (ctx, p, pkt) => noviceActivityHandler(ctx, p, pkt), "partial");
  r.player(84, "ACTIVITY_PACKAGE", (ctx, p, pkt) => activityPackageHandler(ctx, p, pkt), "partial");

  // Minigame das Termas ("Đại chiến Hút Gà") — roteador próprio, ver handlers/minigame-termas/
  const littleGame = littleGameRouter();
  r.player(166, "LITTLEGAME_COMMAND", (ctx, p, pkt, client) => littleGame.handler(ctx, p, pkt, client));

  // Caminho da luz + Semana da sociedade (mesmo pacote 145, despachado pelo byte inicial)
  r.player(145, "ACTIVITY_SYSTEM", (ctx, p, pkt) => activitySystemRouter(ctx, p, pkt), "partial");
}
