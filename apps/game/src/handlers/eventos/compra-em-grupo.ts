/**
 * Aba no jogo (6600): "Compra em Grupo" (`grouppurchase.swf`, `groupPurchase/`) — desconto em grupo tipo
 * "compra coletiva" (quanto mais gente comprar o mesmo item, maior o desconto pra todos).
 * Pacote: 144 `GROUP_PURCHASE` (`sendGroupPurchaseRefreshData`/`RefreshRankData`/`Buy`,
 *   `GroupPurchasePackageType`: 1 START_OR_END (servidor→cliente, abre/fecha a campanha), 2 REFRESH_DATA,
 *   3 REFRESH_RANK_DATA, 4 BUY — `ddt/manager/GameSocketOut.as`).
 * C#: NENHUMA classe `[PacketHandler(144)]`/`[PacketHandler(ePackageType.GROUP_PURCHASE)]` existe em
 *   `Game.Server.Packets.Client` (grep vazio) — e mais: nenhum código do servidor decompilado chama
 *   `AbstractPacketLib`/qualquer `GSPacketIn(144,...)` pra abrir a campanha (sub 1 START_OR_END) também.
 *
 * Achado (m3-eventos-b, confirmando a dúvida já registrada em docs/plan/TASKS.md): esta é uma feature
 * 100% inacabada no servidor original, não só o `.ashx` companheiro (`teambuyactiveawardinfo.cs`, já
 * portado no `m3-ashx`, sempre `value=false`). A cadeia completa do cliente só habilita o ícone do hall
 * (`HallIconManager.updateSwitchHandler(HallIconType.GROUPPURCHASE, true)`) dentro do handler de START_OR_END
 * (`GroupPurchaseManager.as openOrClose`) — e como NENHUM código do servidor jamais envia esse sub-pacote, o
 * ícone nunca aparece, então o jogador nunca consegue abrir a tela pra disparar `REFRESH_DATA`/
 * `REFRESH_RANK_DATA`/`BUY` em primeiro lugar (confirmado também: `HallIconType.GROUPPURCHASE` nunca é
 * ligado em nenhum "check default icon" do cliente). Portar uma economia de desconto em grupo aqui seria
 * inventar uma feature que nunca existiu em produção — em vez disso, registrado como no-op puro (lê e
 * descarta, sem resposta), igual ao padrão já usado pra `211 CADDY_EXCHANGE_ALL`/`215 CADDY_CONVERTED_ALL`
 * em `roleta.ts` (dead wire, cliente real mas servidor nunca funcional).
 * Como testar: `apps/game/test/client-6600-m3-wonderful-activity.test.ts` (cobre os 3 no-ops desta rodada).
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export function groupPurchase(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const sub = pkt.readByte();
  switch (sub) {
    case 4: pkt.readInt(); pkt.readBoolean(); break; // BUY(num, isBand) — descartado
    default: break; // 2 REFRESH_DATA / 3 REFRESH_RANK_DATA — sem campos extras
  }
  ctx.log.debug(`144 GROUP_PURCHASE: noop sub=${sub} (player=${p.id})`);
}
