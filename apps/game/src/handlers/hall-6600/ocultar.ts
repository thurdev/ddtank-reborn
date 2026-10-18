/**
 * Aba no jogo: Hall (6600) › ícone do olho (barra inferior) — ficar invisível/visível pro resto do salão.
 * 262/7 PLAYERHID (1 bool: novo estado) e 262/8 PLAYERSHOW (sem corpo, sempre força visível).
 * C#: `Game.Server.NewHall.Handle.PlayerHideID`/`PlayerShow` (`[Attribute13(7)]`/`[Attribute13(8)]`),
 * `WorldMgr.NewHallRooms.HidePlayerInfo` (`NewHallRoom.cs:24-31`).
 * Cliente: `ddt/view/DailyButtunBar.as:122-131 __onEyeClick` (alterna e manda `sendNewHallPlayerHid`).
 * `PLAYERSHOW` (sub8) não tem disparo de UI direto — só aparece referenciado por `sendLoadOtherPlayer()`,
 * chamado uma única vez por `newOpenGuide/NewOpenGuideManager.as:168` (cutscene de graduação pra sala
 * principal aos grade>=10), não todo login.
 *
 * GAP conhecido (não introduzido por esta tarefa, confirmado contra `GamePlayer.cs:1937`
 * `bool_3 = true;` no construtor, sem coluna de banco): `HideAllFriend` começa `true` em TODO login —
 * ou seja, por padrão nenhum jogador vê nem é visto por ninguém no hall até clicar o olho (um clique manda
 * `true`, igual ao default — sem efeito visível; só o 2º clique manda `false` e revela de fato). O ícone
 * do cliente mesmo assim nasce mostrando "visível" (`_hideFlag:Boolean = false`, `DailyButtunBar.as:40`) —
 * desincronizado do servidor. Replicado tal qual (`docs/plan/TASKS.md` exige bater com o C# original); ver
 * research/6600/packets-m1.md "M2 newhall" pra decisão futura do dono sobre inverter esse default.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** 262/7 PLAYERHID. */
export function newHallHide(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  p.hideAllFriend = pkt.readBoolean();
  ctx.newHall.hidePlayerInfo(p);
}

/** 262/8 PLAYERSHOW — sem corpo. */
export function newHallShow(ctx: ServerContext, p: GamePlayer): void {
  p.hideAllFriend = false;
  ctx.newHall.hidePlayerInfo(p);
}
