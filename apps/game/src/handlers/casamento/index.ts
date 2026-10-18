/**
 * Aba no jogo: índice do Casamento/Igreja inteiro — 233-253, 213, 249, 167 (01 §11). Cada ação tem o seu
 * próprio arquivo, nomeado como o jogador vê na tela:
 *
 *   infra.ts            (sem tela própria, infra compartilhada) — sala da capela em memória, pacotes,
 *                                                                  `setMarried`, mail, busca de preço
 *   pedir-casamento.ts  (Casamento › pedir em casamento)  — 247 MARRY_APPLY, 250 MARRY_APPLY_REPLY
 *   divorcio.ts         (Casamento › divórcio)            — 248 DIVORCE_APPLY
 *   status.ts           (sem tela própria, consultas)     — 246 MARRY_STATUS, 85 MATE_ONLINE_TIME
 *   mural.ts            (Casamento › mural de pedidos)    — 236 MARRYINFO_ADD, 235 MARRYINFO_GET, 237
 *                                                            MARRYINFO_UPDATE, 234 MARRYPROP_GET
 *   capela.ts           (Casamento › Igreja/capela)       — 240 MARRY_SCENE_LOGIN, 241
 *                                                            MARRY_ROOM_CREATE, 242 MARRY_ROOM_LOGIN,
 *                                                            244 PLAYER_EXIT_MARRY_ROOM, 233
 *                                                            MARRY_SCENE_CHANGE, 251 SCENE_STATE, 253
 *                                                            MARRY_ROOM_INFO_UPDATE
 *   cerimonia.ts        (Casamento › dentro da sala)      — 249 MARRY_CMD (sub-roteador)
 *   stubs.ts            (sem tela própria, pacote morto)  — 167 CHURCH_MOVIE_OVER
 *
 * Pacotes: ver tabela acima. C#: `Packets/Client/Marry*.cs`, `DivorceApplyHandler.cs`,
 * `UserEnterMarrySceneHandler.cs`, `UserLeaveMarryRoom.cs`, `SceneMarryRooms/*`, procs
 * `SP_Insert_Marry_Notice`/`SP_Users_Marry`, `SP_MarryInfo_Add/_Update/_Delete`,
 * `SP_Insert_Marry_Room_Info`/`SP_Update_Marry_Room_Info`. Salas da capela são só em memória (como as
 * salas de PvP/PvE).
 *
 * Fixes vs o original:
 *  - 248 DIVORCE_APPLY cobrava `PRICE_DIVORCED(_DISCOUNT)` duas vezes (ver `divorcio.ts`).
 *  - 237 vs 253: o cliente manda edição do MURAL em 237 e edição da SALA da capela em 253, mas o
 *    original registrava o handler da sala (MarryRoomInfoUpdateHandler) no 237 — uma edição de mural do
 *    cliente era lida com o layout errado. Este port dá a cada um o seu próprio código: 237 = mural
 *    (`mural.ts`), 253 = sala (`capela.ts`).
 *  - 237 COLIDE entre as versões — 4.1 `MARRYINFO_UPDATE=237` (mural, acima) vs 6600 `PLAYER_DRESS=237`
 *    (figurino/dress room, feature 6600-only portada em `m3-figurino` — ver `handlers/bolsa/vestir-6600.ts`).
 *    O registro de 237 abaixo despacha por `p.clientKind`: "41" vai pro mural (`marryInfoUpdate`), "6600"
 *    vai pro figurino (`playerDress`) — nunca corrompe `Marry_Info` com o payload de dress.
 *    `research/6600/packets-m1.md` "M3 figurino" tem o detalhe completo (achado original em "M2 bolsa").
 *
 * Formatos de pacote confirmados contra o cliente Flash ao vivo (`Source Flash/src/ddt/manager/
 * ChurchManager.as`): 246/247/250/248/234/242/249(4) INVITE. As outras sub-respostas do 249 MARRY_CMD e
 * 253/237/236/235 são "melhor esforço" (nenhum leitor AS3 foi localizado nessa passada) — o dinheiro/
 * estado/banco é coberto por teste; a renderização exata desses pacotes no cliente não foi verificada.
 *
 * 167 CHURCH_MOVIE_OVER é fio morto nos dois lados do 4.1 base (ver `stubs.ts`).
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`. Manual: `docs/features/casamento.md` tem
 * o passo a passo de cada ação.
 */
import type { HandlerRegistry } from "../registry.js";
import type { SubRouter } from "../registry.js";
import { marryApply, marryApplyReply } from "./pedir-casamento.js";
import { divorceApply } from "./divorcio.js";
import { marryStatus, mateOnlineTime } from "./status.js";
import { marryInfoAdd, marryInfoGet, marryInfoUpdate, marryInfoDelete } from "./mural.js";
import { marrySceneLogin, marryRoomCreate, marryRoomLogin, playerExitMarryRoom, marrySceneChange, sceneState, marryRoomInfoUpdate } from "./capela.js";
import { marryCmdRouter } from "./cerimonia.js";
import { churchMovieOver } from "./stubs.js";
import { playerDress } from "../bolsa/vestir-6600.js";

export function registerCasamento(r: HandlerRegistry): SubRouter {
  const cmd = marryCmdRouter();
  r.player(249, "MARRY_CMD", cmd.handler, "partial");

  r.player(85, "MATE_ONLINE_TIME", mateOnlineTime);
  r.player(246, "MARRY_STATUS", marryStatus);
  r.player(247, "MARRY_APPLY", marryApply);
  r.player(250, "MARRY_APPLY_REPLY", marryApplyReply);
  r.player(248, "DIVORCE_APPLY", divorceApply);

  // ---- mural de pedidos (236 add / 235 get / 237 update / 234 delete) ----
  r.player(236, "MARRYINFO_ADD", marryInfoAdd);
  r.player(235, "MARRYINFO_GET", marryInfoGet);
  // 237 colide: MARRYINFO_UPDATE (4.1, mural) vs PLAYER_DRESS (6600, figurino) — ver nota acima e vestir-6600.ts.
  r.player(237, "MARRYINFO_UPDATE/PLAYER_DRESS", (ctx, p, pkt) => (p.clientKind === "6600" ? playerDress(ctx, p, pkt) : marryInfoUpdate(ctx, p, pkt)));
  r.player(234, "MARRYPROP_GET", marryInfoDelete);

  // ---- cenário/salas da igreja ----
  r.player(240, "MARRY_SCENE_LOGIN", marrySceneLogin);
  r.player(241, "MARRY_ROOM_CREATE", marryRoomCreate, "partial");
  r.player(242, "MARRY_ROOM_LOGIN", marryRoomLogin);
  r.player(244, "PLAYER_EXIT_MARRY_ROOM", playerExitMarryRoom);
  r.player(233, "MARRY_SCENE_CHANGE", marrySceneChange, "partial");
  r.player(251, "SCENE_STATE", sceneState, "partial");
  r.player(253, "MARRY_ROOM_INFO_UPDATE", marryRoomInfoUpdate, "partial");

  // 167 CHURCH_MOVIE_OVER: fio morto, ver stubs.ts.
  r.player(167, "CHURCH_MOVIE_OVER", churchMovieOver, "stub");

  return cmd;
}
