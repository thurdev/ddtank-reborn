/**
 * `m3-misc-sweep` (docs/plan/TASKS.md): varredura dos códigos pequenos restantes do relatório
 * (`research/6600/coverage-m3.md`), cada um investigado contra o C# original antes de decidir
 * (mesma metodologia do `m3-group-purchase`/`compra-em-grupo.ts`). Nenhum destes tem tela própria
 * no sentido de abrir algo novo no hall — são todos "pedido pontual" sem resposta (ou resposta sem
 * conteúdo) no servidor 6600 original. Sem exceção, nenhum concede item/moeda/XP (zero superfície de
 * dupe), então todos entram como no-op puro: consome exatamente os campos que o cliente escreve
 * (`ddt/manager/GameSocketOut.as` / `GameInSocketOut.as`) e não responde (igual ao original).
 *
 * Achados por código (grep em `vendor/DDT-6600/Source/Game.Server/Game.Server.Packets.Client/*.cs`
 * por `[PacketHandler(code...)]` — vazio = nenhuma classe trata o código):
 *
 *   101 BATTLE_COMPANION_GIVE  — `sendBattleCompanionGive(id,bagType,place)` (GameSocketOut.as:3082).
 *       100% morto: nenhuma classe `[PacketHandler(101)]` em todo o vendor. Campo: 3 int.
 *   147 FIND_BACK_INCOME       — `sendWantStrongBack(type,findBackType,isBand=false)` (:3339).
 *       100% morto: nenhuma classe `[PacketHandler(147)]`. Campos: int, bool, bool.
 *   157 RECHARGE (getspree)    — `getspree(value)` escreve 5 int: sub=`RechargePackageType.REGET_SPREE`,
 *       rewardId, type, regetType, time (GameSocketOut.as:2926). 100% morto: nenhuma classe
 *       `[PacketHandler(157)]`; nenhum `SendTCP`/`GSPacketIn(157,...)` em lugar nenhum do servidor
 *       original tampouco (a mensagem de troco/"recarga" nunca foi fechada nessa build). Campos: 5 int.
 *   164 UPDATE_PLAYER_PROPERTY — `getPlayerPropertyAddition()` sem corpo (GameSocketOut.as:2655).
 *       100% morto: nenhuma classe `[PacketHandler(164)]`. Sem campos.
 *   327 FAST_AUCTION_SMALL_BUGLE — `ChatManager.sendFastAuctionBugle(id)` → `SocketManager.Instance.out.
 *       sendFastAuctionBugle(id)` (GameSocketOut.as:4577), 1 int, chamado de verdade por
 *       `AuctionSellView.as` (botão de anunciar leilão no megafone). Mesmo alcançável pelo cliente de
 *       verdade, 100% morto no servidor: nenhuma classe `[PacketHandler(327)]` (o único `*BugleHandler.cs`
 *       existente, `SmallBugleHandler.cs`, está registrado em `[PacketHandler(71)]`, não em 327 — o
 *       megafone "normal" 71/72 já está implementado, `basico`/chat; este 327 nunca ganhou handler
 *       próprio). Campo: 1 int (auctionId).
 *   360 GET_CSM_BOX            — `sendGetCSMTimeBox()` sem corpo (GameSocketOut.as:4744).
 *       100% morto: nenhuma classe `[PacketHandler(360)]`. Sem campos.
 *   207 REQUEST_FRIENDS_PAY    — `RequestPayHander.cs` EXISTE e está registrado (`[PacketHandler(207)]`),
 *       mas o corpo inteiro é `packet.ReadByte(); int id = client.Player.PlayerCharacter.ID; return 0;`
 *       — lê só o sub-byte, nunca olha pro resto do pacote (friendsID/goodsIds/auctionID/nome/msg, que
 *       variam por sub-ação: `requestUnWeddingPay`/`requestShopPay`/`requestAuctionPay`/`isAcceptPayShop`/
 *       `isAcceptPayAuc`/`sendForAuction`/`isAcceptPay`, todas em GameSocketOut.as) e NUNCA chama
 *       `client.Out.SendTCP` — ou seja, mesmo tratado, é um no-op funcional idêntico aos 100% mortos
 *       acima. Portado fiel: lê 1 byte (sub), descarta o resto sem parsear (igual ao original).
 *
 * Fora do escopo desta varredura (achados, não implementados aqui — ver docs/plan/TASKS.md):
 *   152 FIGHTFOOTBALLTIMETAKEOUT — `FightFootballTimeTakeoutHandler.cs` é uma feature REAL (minigame
 *       sazonal "futebol", `src/fightFootballTime/*` no cliente), mas depende de um pool de prêmios
 *       (`EventAwardMgr.GetFightFootballTimeAward(eEventType.FIGHT_FOOTBALL_TIME)`) e de campos em
 *       `GamePlayer` (`Card`/`takeoutCount`/`canTakeOut`/`CardsTakeOut`) que não existem nesta porta —
 *       sistema grande o bastante pra merecer tarefa própria (mesma categoria de 404 ringstation/146
 *       campbattle), não "pequeno" como o resto da lista. Registrado como stub fiel (lê o byte `place`,
 *       descarta) até essa tarefa existir.
 *   156 TRANSNATIONAL_BUYGOODS — `BuyTransnationalGoodsHandler.cs` é real (compra com pontos de
 *       `client.Player.Actives.Pyramid`, sistema "Guerra das Nações"/`room/transnational` no cliente —
 *       um room type de PvP inteiro, com seu próprio `TransnationalPackageType`), também não portado
 *       nesta base. Mesma categoria de 152 acima. Registrado como stub fiel (lê 1 int `id`, descarta).
 *
 * Como testar: `apps/game/test/client-6600-m3-misc-sweep.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** 101 BATTLE_COMPANION_GIVE — 3 int (id, bagType, place). Morto no original (sem PacketHandler). */
export function battleCompanionGive(_ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  pkt.readInt(); pkt.readInt(); pkt.readInt();
}

/** 147 FIND_BACK_INCOME — int type, bool findBackType, bool isBand. Morto no original. */
export function findBackIncome(_ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  pkt.readInt(); pkt.readBoolean(); pkt.readBoolean();
}

/** 157 RECHARGE (getspree) — 5 int (sub, rewardId, type, regetType, time). Morto no original. */
export function rechargeGetSpree(_ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  pkt.readInt(); pkt.readInt(); pkt.readInt(); pkt.readInt(); pkt.readInt();
}

/** 164 UPDATE_PLAYER_PROPERTY — sem corpo. Morto no original. */
export function updatePlayerProperty(): void {}

/** 327 FAST_AUCTION_SMALL_BUGLE — 1 int (auctionId). Alcançável pelo cliente, morto no servidor original. */
export function fastAuctionSmallBugle(_ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  pkt.readInt();
}

/** 360 GET_CSM_BOX — sem corpo. Morto no original. */
export function getCsmBox(): void {}

/**
 * 207 REQUEST_FRIENDS_PAY — `RequestPayHander.cs` original só lê o sub-byte e nunca responde nem usa o
 * resto do pacote (friendsID/goodsIds/auctionID/nome/msg variam por sub-ação); portado fiel: idem.
 */
export function requestFriendsPay(_ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  pkt.readByte();
}

/**
 * 152 FIGHTFOOTBALLTIMETAKEOUT — feature real no original, mas depende de um subsistema não portado
 * (ver cabeçalho do arquivo). Stub fiel: lê o `place` (byte) e descarta.
 */
export function fightFootballTimeTakeout(_ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  pkt.readByte();
}

/**
 * 156 TRANSNATIONAL_BUYGOODS — feature real no original, mas depende de um room type não portado
 * (ver cabeçalho do arquivo). Stub fiel: lê o `id` (int) e descarta.
 */
export function transnationalBuyGoods(_ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  pkt.readInt();
}
