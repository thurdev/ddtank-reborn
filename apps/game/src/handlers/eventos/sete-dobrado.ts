/**
 * `m3-seven-double` (docs/plan/TASKS.md): minijogo "Sete Dobrado" (148 `SEVEN_DOUBLE`,
 * `sendSevenDoubleCallCar`/`StartGame`/`CancelGame`/`Ready`/`Move`/`UseSkill`/`CanEnter`/
 * `EnterOrLeaveScene`, `src/sevenDouble/*` no cliente 6600 — carrinho/corrida de "duplo" com apostas,
 * UI completa: `SevenDoubleManager.as`, `SevenDoubleFrame`/`SevenDoubleMainView`/`SevenDoubleMapView`
 * etc.).
 *
 * Achado: **morto no servidor original, confirmado pela mesma trilha do `m3-group-purchase`**. A tela
 * só abre quando o cliente recebe o sub-pacote `START_OR_END = 1` (`SevenDoubleManager.pkgHandler` →
 * `openOrCloseHandler`, que lê `_isStart` e só então chama `this.open()`/libera o ícone — enquanto
 * `_isStart` fica false, a `SevenDoubleFrame` nunca é carregada e nenhuma outra sub-ação consegue ser
 * disparada pelo jogador). O envio desse sub-pacote (`SendSevenDoubleOpenClose(int, bool)`) existe só
 * como assinatura em `IPacketLib`/`AbstractPacketLib` — a única implementação real,
 * `ConsolePacketLib.SendSevenDoubleOpenClose`, é `throw new NotImplementedException();`
 * (`Game.Server.Packets.Server/ConsolePacketLib.cs:172`) — e **nenhum código em todo o
 * `vendor/DDT-6600/Source` chama esse método** (grep vazio por `SendSevenDoubleOpenClose(`). Ou seja: a
 * tela nunca abre pra nenhum jogador, em nenhuma circunstância, no servidor 6600 original — mesma
 * categoria exata do `144 GROUP_PURCHASE` (ícone cujo gatilho de abertura nunca é enviado).
 *
 * O `SevenDoubleHandler.cs` (`[PacketHandler(148)]`) que TRATA as sub-ações existe e responde algo pras
 * sub-ações 3 CALL (eco do valor), 6 START_GAME (eco vazio), 9 READY (manda `ALL_READY` com +20 min),
 * 35 IS_CAN_ENTER (sempre `true`) — mas como a tela nunca abre, o jogador nunca consegue clicar em nada
 * que dispare essas sub-ações em primeiro lugar (sem contar que nem usam `RoomMgr.SevenDoubleRoom`/
 * `BaseSevenDoubleRoom`, que ficam alocados no boot do servidor mas nunca são atribuídos a nenhum
 * `GamePlayer.CurrentSevenDoubleRoom` em lugar nenhum — o "motor" de sala/monstros existe como classe
 * morta, nunca instanciado pra valer). 7 CANCEL_GAME/17 MOVE/21 USE_SKILL/38 ENTER_OR_LEAVE_SCENE nem
 * têm handler real (caem no `default: Console.WriteLine`, sem resposta).
 *
 * Decisão: no-op puro, mesmo padrão de `compra-em-grupo.ts` — sem inventar uma corrida/aposta que nunca
 * existiu em produção. Consome o sub-byte e os campos simples que a sub-ação mais usada (CALL) escreve;
 * o resto não tem corpo fixo e nunca é lido pelo original também.
 * Como testar: `apps/game/test/client-6600-m3-misc-sweep.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export function sevenDouble(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const sub = pkt.readByte();
  switch (sub) {
    case 3: pkt.readInt(); pkt.readBoolean(); break; // CALL(val, isBand) — nunca alcançável (tela não abre)
    case 9: break; // READY — sem campos extras
    case 35: break; // IS_CAN_ENTER — sem campos extras
    default: break; // CANCEL_GAME/MOVE/USE_SKILL/ENTER_OR_LEAVE_SCENE — sem corpo fixo no original
  }
  ctx.log.debug(`148 SEVEN_DOUBLE: noop sub=${sub} (player=${p.id}) — tela nunca abre no original (START_OR_END nunca enviado)`);
}
