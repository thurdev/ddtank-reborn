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
 *                              `sociedade/semana-da-sociedade.ts`, sub 32-36 despacha pra
 *                              `captura-nian.ts` (m4-catchbeast), sub 37-45 LanternRiddles sem handler)
 *   captura-nian.ts            (tela "Capturar Nian", m4-catchbeast) — 145 ACTIVITY_SYSTEM sub 32-36
 *                              (`CatchBeastPackageType`; REAL lógica C# existe — ver `game/catchbeast.ts`)
 *   jogador-antigo.ts         (botão "Jogador antigo" no hall, m3-eventos-b) — 149 OLDPLAYER_REGRESS (11
 *                              sub-ações; C# original é um no-op total) + `applyOldPlayerLogin` (gancho de
 *                              login que alimenta `IsOldPlayer`/`isOld`, usado também por `packets/out.ts`
 *                              fora desta pasta: 1 LOGIN, 18 SCENE_ADD_USER, 94/4, 160/160)
 *   atividade-maravilhosa.ts (ícone "GM Activity"/campanhas, m3-eventos-b) — 159 WONDERFUL_ACTIVITY, 405
 *                              WONDERFUL_ACTIVITY_INIT (stubs do C# original portados byte a byte), 373
 *                              WONDERFUL_GETREWARD (sem handler no original, no-op)
 *   compra-em-grupo.ts        (ícone "Compra em Grupo", m3-eventos-b) — 144 GROUP_PURCHASE (sem handler nem
 *                              sender no C# original — feature nunca ligada em produção, no-op)
 *   sete-dobrado.ts           (minijogo "Sete Dobrado", m3-seven-double) — 148 SEVEN_DOUBLE (tela nunca
 *                              abre no original — START_OR_END nunca enviado, mesma categoria do
 *                              compra-em-grupo.ts acima — no-op)
 *   launcher-login.ts         (sem tela, m3-launcher-login) — 208 LAUNCHER_LOGIN (`sendDeskTopLogin`,
 *                              flag de cliente puro via ExternalInterface; descartado também no
 *                              servidor original — no-op, nunca dar recompensa por um flag de cliente)
 *   sweep-diversos.ts         (sem tela, m3-misc-sweep) — 101 BATTLE_COMPANION_GIVE, 147 FIND_BACK_INCOME,
 *                              157 RECHARGE, 164 UPDATE_PLAYER_PROPERTY, 207 REQUEST_FRIENDS_PAY, 327
 *                              FAST_AUCTION_SMALL_BUGLE, 360 GET_CSM_BOX (100% mortos ou no-op funcional
 *                              no original) + 152 FIGHTFOOTBALLTIMETAKEOUT/156 TRANSNATIONAL_BUYGOODS
 *                              (reais no original, dependem de subsistema não portado — stub documentado)
 *   dados.ts                  (ícone "Sistema de Dados", 6600 only) — 134 DICE_SYSTEM
 *   campbattle.ts              (ícone "Camp", 6600 only, m3-campbattle) — 146 CAMPBATTLE (10 sub-ações;
 *                              morto no original: ACTION_ISOPEN nunca enviado [SendCampBattleOpenClose é
 *                              NotImplementedException + zero call-sites] E o clique no ícone usa
 *                              SINGLE_ROOM_BEGIN(5), que não tem `case` no switch do servidor original —
 *                              mesma categoria de 148/144 acima, no-op)
 *   coleta.ts                  (tela "Coleta", 6600 only, m4-coleta) — 261 COLLECTION_TASK (sala global em
 *                              `game/collection-task.ts` + condição de missão 64 em `game/quests.ts`)
 *   resgate.ts                 (tela "Resgate", 6600 only, m4-resgate) — 277 RESCUE (sem C# original nenhum;
 *                              luta real via `RoomMgr.createRescueRoom` → `FightEngine.startPve`, ver
 *                              `game/rescue.ts`)
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
import { noviceActivityHandler, magicStoneNoOp } from "./novato.js";
import { activityPackageHandler } from "./ativacao-pintinho.js";
import { dailyAwardHandler, timeBox, weeklyClickCnt, dailyRecordHandler } from "./recompensa-diaria.js";
import { signAwardHandler, accumulativeLoginHandler } from "./presenca.js";
import { firstRechargeHandler } from "./primeira-recarga.js";
import { achievementFinishHandler } from "./completar-conquista.js";
import { littleGameRouter } from "../minigame-termas/index.js";
import { activitySystemRouter } from "./caminho-da-luz.js";
import { oldPlayerRegressHandler } from "./jogador-antigo.js";
import { wonderfulActivity, wonderfulActivityInit, wonderfulActivityGetReward } from "./atividade-maravilhosa.js";
import { groupPurchase } from "./compra-em-grupo.js";
import { sevenDouble } from "./sete-dobrado.js";
import { launcherLogin } from "./launcher-login.js";
import {
  battleCompanionGive, findBackIncome, rechargeGetSpree, updatePlayerProperty, requestFriendsPay,
  fastAuctionSmallBugle, getCsmBox, fightFootballTimeTakeout, transnationalBuyGoods,
} from "./sweep-diversos.js";
import { diceSystem } from "./dados.js";
import { campBattle } from "./campbattle.js";
import { collectionTask } from "./coleta.js";
import { resgate } from "./resgate.js";

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
  // m3-partial-sweep (2026-10-19): a sala PvE real do Labirinto (migração 0011 + packages/fight scripts)
  // chegou via merge de outra tarefa (concorrente) depois do status "partial" ter sido lido — `myProgress`
  // avança de verdade agora (updateLabyrinthFloor/outLabyrinth acima), gap que motivaria um split próprio
  // já foi fechado por outro agente. Flipped partial -> implemented (status stale, não trabalho desta tarefa).
  r.player(131, "LABYRINTH", (ctx, p, pkt) => labyrinthHandler(ctx, p, pkt));

  // Liga / Liga de elite / Boss mundial
  r.player(132, "BATTLEGROUND", (ctx, p, pkt) => battleGroundHandler(ctx, p, pkt));
  r.player(162, "ELITEGAME", (ctx, p, pkt) => eliteGameHandler(ctx, p, pkt));
  r.player(102, "WORLDBOSS_CMD", (ctx, p, pkt) => worldBossCmd(ctx, p, pkt), "partial");

  // Atividades de novato / Ativação do pintinho — 258 colide com MAGIC_STONE no 6600, ver nota em
  // novato.ts (m3-partial-sweep): sem o guard por clientKind, um pacote 6600 real seria lido como
  // noviceActivityHandler (2 ints) e podia casar por acidente com uma recompensa de novato indevida.
  r.player(258, "NOVICEACTIVITY/MAGIC_STONE(6600)", (ctx, p, pkt) => { if (p.clientKind === "6600") return magicStoneNoOp(ctx, p, pkt); return noviceActivityHandler(ctx, p, pkt); }, "partial");
  r.player(84, "ACTIVITY_PACKAGE", (ctx, p, pkt) => activityPackageHandler(ctx, p, pkt), "partial");

  // Minigame das Termas ("Đại chiến Hút Gà") — roteador próprio, ver handlers/minigame-termas/
  const littleGame = littleGameRouter();
  r.player(166, "LITTLEGAME_COMMAND", (ctx, p, pkt, client) => littleGame.handler(ctx, p, pkt, client));

  // Caminho da luz + Semana da sociedade (mesmo pacote 145, despachado pelo byte inicial)
  r.player(145, "ACTIVITY_SYSTEM", (ctx, p, pkt) => activitySystemRouter(ctx, p, pkt), "partial");

  // Jogador antigo (m3-eventos-b) — C# original é um no-op total, portado do contrato AS3.
  // m3-partial-sweep (2026-10-19): todas as 11 sub-ações já tratadas honestamente (0-6 reais, 7-10 no-op
  // IGUAL ao `OldPlayerRegressHandler.cs` original, que nunca fez nada pra NENHUMA sub-ação) — nada
  // reachable faltando. Flipped partial -> implemented (status estava stale desde m3-oldplayer-regress).
  r.player(149, "OLDPLAYER_REGRESS", (ctx, p, pkt) => oldPlayerRegressHandler(ctx, p, pkt));

  // GM Activity / campanhas (m3-eventos-b) — 159/405 stubs do original portados byte a byte; 373 sem
  // handler no original (no-op). Ver atividade-maravilhosa.ts.
  r.player(159, "WONDERFUL_ACTIVITY", (_ctx, p, pkt) => wonderfulActivity(p, pkt), "stub");
  r.player(405, "WONDERFUL_ACTIVITY_INIT", (_ctx, p, pkt) => wonderfulActivityInit(p, pkt), "stub");
  r.player(373, "WONDERFUL_GETREWARD", (ctx, p, pkt) => wonderfulActivityGetReward(ctx, p, pkt), "stub");

  // Compra em Grupo (m3-eventos-b) — sem handler nem sender no C# original, feature nunca ligada em
  // produção (ver compra-em-grupo.ts). No-op, mesma categoria de 211/215 em roleta.ts.
  r.player(144, "GROUP_PURCHASE", (ctx, p, pkt) => groupPurchase(ctx, p, pkt), "stub");

  // Sete Dobrado (m3-seven-double) — tela nunca abre no original (START_OR_END nunca enviado), mesma
  // categoria de 144 acima. Ver sete-dobrado.ts.
  r.player(148, "SEVEN_DOUBLE", (ctx, p, pkt) => sevenDouble(ctx, p, pkt), "stub");

  // Launcher desktop (m3-launcher-login) — flag de cliente puro, descartado também no original. Ver
  // launcher-login.ts. (208 colide com CARDS_SOUL no enum 6600 — CARDS_SOUL nunca é enviado por nenhum
  // código do servidor original tampouco, sem conflito prático de dispatch.)
  r.player(208, "LAUNCHER_LOGIN", (ctx, p, pkt) => launcherLogin(ctx, p, pkt), "stub");

  // Varredura m3-misc-sweep (códigos pequenos restantes do relatório) — ver sweep-diversos.ts pro
  // achado de cada um (100% morto / no-op funcional / depende de subsistema não portado).
  r.player(101, "BATTLE_COMPANION_GIVE", (ctx, p, pkt) => battleCompanionGive(ctx, p, pkt), "stub");
  r.player(147, "FIND_BACK_INCOME", (ctx, p, pkt) => findBackIncome(ctx, p, pkt), "stub");
  r.player(152, "FIGHTFOOTBALLTIMETAKEOUT", (ctx, p, pkt) => fightFootballTimeTakeout(ctx, p, pkt), "stub");
  r.player(156, "TRANSNATIONAL_BUYGOODS", (ctx, p, pkt) => transnationalBuyGoods(ctx, p, pkt), "stub");
  r.player(157, "RECHARGE", (ctx, p, pkt) => rechargeGetSpree(ctx, p, pkt), "stub");
  r.player(164, "UPDATE_PLAYER_PROPERTY", () => updatePlayerProperty(), "stub");
  r.player(207, "REQUEST_FRIENDS_PAY", (ctx, p, pkt) => requestFriendsPay(ctx, p, pkt), "stub");
  r.player(327, "FAST_AUCTION_SMALL_BUGLE", (ctx, p, pkt) => fastAuctionSmallBugle(ctx, p, pkt), "stub");
  r.player(360, "GET_CSM_BOX", () => getCsmBox(), "stub");
  // Sistema de Dados (6600 only)
  r.player(134, "DICE_SYSTEM", (ctx, p, pkt) => diceSystem(ctx, p, pkt));

  // Batalha de Acampamento (6600 only, m3-campbattle) — morto no original (ícone nunca abre + clique sem
  // case no switch de SINGLE_ROOM_BEGIN), mesma categoria de 144/148 acima. Ver campbattle.ts.
  r.player(146, "CAMPBATTLE", (ctx, p, pkt) => campBattle(ctx, p, pkt), "stub");

  // Coleta (6600 only, m4-coleta) — sala global + condição de missão 64. Ver coleta.ts.
  r.player(261, "COLLECTION_TASK", (ctx, p, pkt) => collectionTask(ctx, p, pkt));

  // Resgate (6600 only, m4-resgate) — sem C# original nenhum, desenhado do contrato AS3. Ver resgate.ts.
  r.player(277, "RESCUE", (ctx, p, pkt) => resgate(ctx, p, pkt));
}
