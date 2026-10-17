/**
 * Aba no jogo: sem tela própria — log do cliente, ecos sem lógica e pacotes obsoletos do original (01 §1).
 * Pacotes: 8 CLIENT_LOG, 225 ENTHRALL_SWITCH, 224 CID_CHECK (stub), e os no-ops obsoletos
 * (35 AC_ACTION, 24 SCENE_CHANNEL_CHANGE, 161 USER_LUCKYNUM, 206 CHANGE_COLOR_OVER_DUE,
 * 245 CADDY_GET_AWARDS, 279 SHOW_HIDE_TITLE, 30 LOTTERY_GET_ITEM, 213 USE_LOG).
 * Como testar: `apps/game/test/*` (via sessão). Manual: nenhuma tela.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** 8 CLIENT_LOG: só logado. */
export function clientLog(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  ctx.log.debug(`client log ${p.id}: ${pkt.readString().slice(0, 500)}`);
}

/** 225 ENTHRALL_SWITCH: eco vazio. */
export function enthrallSwitch(_ctx: ServerContext, p: GamePlayer): void {
  p.send(new GSPacket(225));
}

/**
 * 224 CID_CHECK — sistema chinês de verificação de identidade/anti-vício ("AAS"), nunca ligado nesta build
 * VN. O cliente manda `sendCIDCheck()` (sem corpo) ou `sendCIDInfo(nome, ID)` (bool false, str nome, str ID
 * — `vendor/DDTank41/Source Flash/src/ddt/manager/GameSocketOut.as:977`), disparado só por `ValidateFrame.as:86`.
 * O handler que trataria isso, `AASInfoSetHandle` (`vendor/DDTank41/Game.Server/Packets/Client/
 * AASInfoSetHandle.cs`), não tem `[PacketHandler(...)]` — confirmado morto, nunca registrado no dispatcher
 * original. Resposta real (`SendAASState`, código 224 também, 1 bool) só é mandada a partir de
 * `AntiAddictionMgr`/login (nunca em reação a este pacote). Stub: consome e não responde, igual ao 214.
 *
 * Como lê esse código (cada variável): o corpo varia por quem chama (vazio ou bool+2 strings) e nunca é lido
 * porque não há lógica nenhuma do lado original — descartamos o pacote inteiro sem parsear.
 */
export function cidCheck(): void {}

/** Pacotes obsoletos no original (01 §1): leitura 0, sem resposta. */
export const OBSOLETE_NOOPS: readonly [number, string][] = [
  [35, "AC_ACTION"], [24, "SCENE_CHANNEL_CHANGE"], [161, "USER_LUCKYNUM"], [206, "CHANGE_COLOR_OVER_DUE"],
  [245, "CADDY_GET_AWARDS"], [279, "SHOW_HIDE_TITLE"], [30, "LOTTERY_GET_ITEM"], [213, "USE_LOG"],
];
