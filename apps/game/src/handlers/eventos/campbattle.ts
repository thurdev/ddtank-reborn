/**
 * `m3-campbattle` (docs/plan/TASKS.md): Batalha de Acampamento (146 `CAMPBATTLE`, `campbattle.swf` no
 * cliente 6600 — `src/campbattle/*`: `CampBattleManager.as` (singleton + model), `view/CampBattleView.as`
 * (tela), `view/CampBattleMap.as` (mapa andável), `view/rank/*` (ranking). 10 sub-ações no cliente:
 * `CampbattleEnterFight`(5)/`CampbattleRoleMove`(2)/`changeMap`(9)/`outCampBatttle`(3)/`captureMap`(17)/
 * `requestPRankList`(21)/`requestCRankList`(20)/`enterPTPFight`(16)/`returnToPve`(6)/`resurrect`(18) —
 * números = `CampPackageType` (`ddt/data/socket/CampPackageType.as` == `Game.Server.Packets/
 * CampPackageType.cs`).
 *
 * Achado: **morto no servidor original — três elos independentes, cada um sozinho já bastaria**:
 *
 * 1. O ícone do hall (`HallIconType.CAMP`, grupo `WONDERFULPLAY`, mesmo grupo de RingStation/Liga/Battle)
 *    só aparece quando o cliente recebe `ACTION_ISOPEN=true` (sub 10, `CampBattleManager.
 *    __onActionIsOpenHander` → `addCampBtn` → `HallIconManager.updateSwitchHandler`). Quem manda esse
 *    sub-pacote é `SendCampBattleOpenClose(int, bool)` — existe só como assinatura em `IPacketLib`/
 *    `AbstractPacketLib` (`Game.Base.Packets/AbstractPacketLib.cs:316`, corpo real: `WriteByte(10)` +
 *    bool + 2 datas); a única implementação usada em produção, `ConsolePacketLib.
 *    SendCampBattleOpenClose` (`Game.Server.Packets.Server/ConsolePacketLib.cs:167`), é
 *    `throw new NotImplementedException();` — **igual** a `SendSevenDoubleOpenClose` 3 linhas abaixo no
 *    mesmo arquivo (categoria `148 SEVEN_DOUBLE`/`m3-seven-double`).
 * 2. Mesmo ignorando o ponto 1: **nenhum código em todo `vendor/DDT-6600/Source` chama
 *    `SendCampBattleOpenClose(` nem uma vez** (grep vazio) — nenhum `EventScheduler`/`ActiveSystemMgr`/
 *    comando de admin jamais abre o ícone. O jogador nunca vê o botão "Camp" no hall, em nenhuma
 *    circunstância.
 * 3. Mesmo ignorando os pontos 1-2 (ex.: um GM forçasse o ícone por outro meio): o clique
 *    (`CampBattleManager.onCampBtnHander`, gate nível≥30 + arma equipada) manda
 *    `GameInSocketOut.sendSingleRoomBegin(RoomManager.CAMP_BATTLE_ROOM)` — `RoomManager.
 *    CAMP_BATTLE_ROOM = 5` (`room/RoomManager.as:74`, confirmado único valor usado por TODOS os 6
 *    call-sites de `sendSingleRoomBegin(RoomManager.CAMP_BATTLE_ROOM)` no cliente, grep completo). O
 *    switch do handler server-side (`Game.Server.GameRoom.Handle/SingleRoomBegin.cs:23-97`,
 *    `[Attribute7(18)]`) não tem `case 5` — só existe um `case 17: RoomMgr.CampBattleRoom.AddPlayer(...)`
 *    que NADA no cliente envia (nenhum `sendSingleRoomBegin(17)` em lugar nenhum) — `case 5` cai no
 *    `default: Console.WriteLine(...); return true;`. Ou seja: mesmo com o ícone visível e o clique
 *    disparado, o servidor original descarta o pedido silenciosamente — nenhuma `RoomCreate`/cena
 *    jamais chega ao cliente, o jogador fica plantado no hall sem erro nem feedback.
 *
 * O resto do sistema (`BaseCampBattleRoom.cs` — sala global única com `AddPlayer`/`PlayerMove`/
 * `RemovePlayer`/`SendCampInitSecen` (cena hardcoded: 1 monstro fixo "Tà Linh Kate"/`Living225`
 * independente do `monsterCount=18` escrito)/`SendCampFightMonster` (sempre a MESMA boss mission 60018,
 * ignora o `id` que o cliente manda em `CampbattleEnterFight`)/`SendPerScoreRank` (placeholder fixo,
 * score=33)) e o `CampBattleHandler.cs` (`[PacketHandler(146)]`, só sub 2/3/5/6/21 têm `case`; 9 MAP_
 * CHANGE/16 PVP_TO_FIGHT/17 CAPTURE_MAP/18 RESURRECT/20 CAMP_SOCER_RANK caem no `default: Console.
 * WriteLine` mesmo DENTRO da cena) existem como classes reais no código-fonte, mas são 100% inalcançáveis
 * — nenhum jogador real jamais entrou nessa tela em produção, exatamente como `144 GROUP_PURCHASE`/
 * `148 SEVEN_DOUBLE`.
 *
 * Decisão (seguindo a instrução da tarefa): no-op puro, mesmo padrão de `sete-dobrado.ts`/
 * `compra-em-grupo.ts` — sem inventar uma batalha de acampamento (captura de mapa, PvP, ressurreição)
 * que nunca existiu em produção. Consome o sub-byte e os campos fixos das 5 sub-ações com corpo real no
 * cliente (2 ROLE_MOVE, 3 REMOVE_ROLE/outCampBatttle sem campos, 5 ENTER_MONSTER_FIGHT, 6 INIT_SECEN/
 * returnToPve sem campos, 17 CAPTURE_MAP, 16 PVP_TO_FIGHT, 18 RESURRECT, 21 PER_SCORE_RANK sem campos);
 * 9 MAP_CHANGE e 20 CAMP_SOCER_RANK também não têm campos. Sem resposta, sem efeito — igual ao servidor
 * original mesmo quando a cena está (hipoteticamente) ativa.
 * Como testar: `apps/game/test/client-6600-m3-campbattle.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export function campBattle(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const sub = pkt.readByte();
  switch (sub) {
    case 2: pkt.readInt(); pkt.readInt(); pkt.readInt(); pkt.readInt(); break; // ROLE_MOVE(x,y,zoneId,userId)
    case 5: pkt.readInt(); break; // ENTER_MONSTER_FIGHT(id) — CampbattleEnterFight
    case 16: pkt.readInt(); pkt.readInt(); break; // PVP_TO_FIGHT(zoneId,userId) — enterPTPFight
    case 17: pkt.readBoolean(); break; // CAPTURE_MAP(bool) — captureMap
    case 18: pkt.readBoolean(); pkt.readBoolean(); break; // RESURRECT(isCost,isBind) — resurrect
    case 3: // REMOVE_ROLE — outCampBatttle
    case 6: // INIT_SECEN — returnToPve
    case 9: // MAP_CHANGE — changeMap
    case 20: // CAMP_SOCER_RANK — requestCRankList
    case 21: // PER_SCORE_RANK — requestPRankList
    default: break; // sem campos fixos / sub desconhecida
  }
  ctx.log.debug(
    `146 CAMPBATTLE: noop sub=${sub} (player=${p.id}) — tela nunca abre no original (ACTION_ISOPEN nunca ` +
      "enviado + SINGLE_ROOM_BEGIN(5) sem case no switch)",
  );
}
