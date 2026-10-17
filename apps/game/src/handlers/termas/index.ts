/**
 * Aba no jogo: índice das Termas (fonte termal) inteiro. Cada ação tem o seu próprio arquivo, nomeado
 * como o jogador vê na tela:
 *
 *   mgr.ts              (sem tela própria, infra compartilhada) — `HotSpringMgr`/`SpaRoom`, estado por
 *                                                                  jogador, tick de experiência, timer de
 *                                                                  aluguel da sala privada
 *   entrar.ts           (Termas › entrar)                  — 187 HOTSPRING_ENTER, 202
 *                                                             HOTSPRING_ROOM_ENTER, 190
 *                                                             HOTSPRING_ROOM_QUICK_ENTER, 212
 *                                                             HOTSPRING_ROOM_ENTER_CONFIRM, 201
 *                                                             HOTSPRING_ROOM_ENTER_VIEW, 169
 *                                                             HOTSPRING_ROOM_PLAYER_REMOVE
 *   mover-convidar.ts   (Termas › andar na sala / convidar) — 191 HOTSPRING_CMD sub 1 TARGET_POINT,
 *                                                              sub 4 HOTSPRING_ROOM_INVITE
 *   salas-privadas.ts   (Termas › sala privada)            — 175 HOTSPRING_ROOM_CREATE; 191 HOTSPRING_CMD
 *                                                             sub 3 RENEWAL_FEE, sub 6 EDIT, sub 9
 *                                                             ADMIN_REMOVE_PLAYER, sub 10
 *                                                             PLAYER_CONTINUE
 *   cupom-tempo.ts      (Termas › comprar minutos c/ Cupom) — 12 HOTSPRING_CMD_B sub 11
 *
 * Pacotes: ver tabela acima. C#: `Managers/HotSpringMgr.cs`, `HotSpringRooms/HotSpringRoom.cs`,
 * `Packets/Client/HotSpring*.cs`, `TankHandle/TargetPointCmd.cs`, `GameUtils/PlayerExtra.HotSpringCheck`.
 * As salas privadas (175 + os 4 subs do 191 listados acima) não têm handler C# nenhum no original — são
 * feature nova do Reborn, ver cabeçalho de `salas-privadas.ts`.
 * Como testar: `apps/game/test/hotspring.test.ts`, `apps/game/test/farm-compose-hotspring-rooms.test.ts`.
 * Manual: `docs/features/termas.md` tem o passo a passo de cada ação.
 */
import type { HandlerRegistry } from "../registry.js";
import { SubRouter } from "../registry.js";
import { hotSpringEnter, hotSpringRoomEnter, hotSpringRoomQuickEnter, hotSpringRoomEnterConfirm, hotSpringRoomEnterView, hotSpringRoomPlayerRemove } from "./entrar.js";
import { targetPoint, hotSpringRoomInvite } from "./mover-convidar.js";
import { hotSpringRoomCreate, hotSpringRoomRenewalFee, hotSpringRoomEdit, hotSpringRoomAdminRemovePlayer, hotSpringRoomPlayerContinue } from "./salas-privadas.js";
import { hotSpringCmdB } from "./cupom-tempo.js";
import { hotSpringMgr } from "./mgr.js";

export { hotSpringMgr, sanitizePath, hotSpringOnQuit } from "./mgr.js";

/** Roteador do pacote 191 HOTSPRING_CMD: um `.on(subcode, nome, fn)` por ação dentro da sala. */
export function hotSpringCmdRouter(): SubRouter {
  return new SubRouter("byte", "HOTSPRING_CMD")
    .on(1, "TARGET_POINT", targetPoint)
    .on(3, "HOTSPRING_ROOM_RENEWAL_FEE", hotSpringRoomRenewalFee)
    .on(4, "HOTSPRING_ROOM_INVITE", hotSpringRoomInvite)
    .on(6, "HOTSPRING_ROOM_EDIT", hotSpringRoomEdit)
    .on(9, "HOTSPRING_ROOM_ADMIN_REMOVE_PLAYER", hotSpringRoomAdminRemovePlayer)
    .on(10, "HOTSPRING_ROOM_PLAYER_CONTINUE", hotSpringRoomPlayerContinue);
}

export function registerTermas(r: HandlerRegistry): SubRouter {
  r.player(187, "HOTSPRING_ENTER", hotSpringEnter);
  r.player(202, "HOTSPRING_ROOM_ENTER", hotSpringRoomEnter);
  r.player(190, "HOTSPRING_ROOM_QUICK_ENTER", hotSpringRoomQuickEnter);
  r.player(212, "HOTSPRING_ROOM_ENTER_CONFIRM", hotSpringRoomEnterConfirm);
  r.player(201, "HOTSPRING_ROOM_ENTER_VIEW", hotSpringRoomEnterView);
  r.player(169, "HOTSPRING_ROOM_PLAYER_REMOVE", hotSpringRoomPlayerRemove);
  r.player(12, "HOTSPRING_CMD_B", hotSpringCmdB);
  r.player(175, "HOTSPRING_ROOM_CREATE", hotSpringRoomCreate);
  const cmd = hotSpringCmdRouter();
  r.player(191, "HOTSPRING_CMD", async (ctx, p, pkt, client) => {
    const m = await hotSpringMgr(ctx);
    if (!m.st(p).room) return;
    await cmd.handler(ctx, p, pkt, client);
  });
  return cmd;
}
