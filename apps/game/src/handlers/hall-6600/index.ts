/**
 * Aba no jogo: índice do Hall (6600) andável inteiro — pacote `262 NEW_HALL` (sub-roteador por byte,
 * `ddt/data/socket/NewHallPackageType.as`/`Game.Server.Packets.NewHallPackageType.cs`). 6600-exclusivo: o
 * código 262 não existe no enum da 4.1 (ver `packets/out.ts`), então nenhum destes handlers roda pra um
 * `clientKind==="41"` — guardado aqui mesmo (defensivo; a 4.1 nunca manda este código na prática).
 *
 *   entrar-sair.ts  (sem tela própria, ciclo de vida) — sub 0 PLAYERINFO (entrar no hall),
 *                     sub 2 PLAYEREXIT (saída, toda vez que o cliente deixa `StateType.MAIN`)
 *   mover.ts        (andar clicando no chão/prédio)   — sub 3 PLAYERMOVE, sub 4 ADDPLAYE
 *   visual.ts       (trocar roupa/montaria/bichinho)  — sub 5 MODIFYDRESS, sub 9 UPDATEPETS
 *   ocultar.ts      (ícone do olho, barra inferior)   — sub 7 PLAYERHID, sub 8 PLAYERSHOW
 *
 * sub 1 OTHERPLAYERINFO é só servidor->cliente (nunca chega como request). sub 6 PLAYERONLINE, sub 10
 * UPDATEPLAYERTITLE e sub 99 NEWHALL_BATTLE existem no enum AS3 mas NUNCA tiveram handler nem writer no C#
 * original (confirmado: nenhum `[Attribute13(6|10|99)]`, nenhum `new GSPacketIn(262)` com esses sub-bytes
 * em lugar nenhum do `vendor/DDT-6600/Source`) — protocolo morto nos dois lados, não implementado aqui
 * (mesmo padrão "gap do original, não desta tarefa" dos Rounds anteriores). Um sub desconhecido cai no log
 * de debug do `SubRouter` (equivalente ao "LoadCommandHandler not found" + catch do C#, `NewHallLogicProcessor.cs:33-41`).
 *
 * Estado em memória: `game/new-hall.ts` `NewHallRoom` (`ctx.newHall`), um registro global único — igual ao
 * `WorldMgr.NewHallRooms` estático do C# original.
 * Como testar: `apps/game/test/client-6600-hall.test.ts`. Ver `research/6600/packets-m1.md` "M2 newhall".
 */
import { SubRouter, type HandlerRegistry } from "../registry.js";
import { newHallEnter, newHallExit } from "./entrar-sair.js";
import { newHallMove, newHallAddPlayer } from "./mover.js";
import { newHallModifyDress, newHallUpdatePets } from "./visual.js";
import { newHallHide, newHallShow } from "./ocultar.js";

export function registerHall6600(r: HandlerRegistry): void {
  const sub = new SubRouter("byte", "NEW_HALL")
    .on(0, "PLAYERINFO", (ctx, p) => newHallEnter(ctx, p))
    .on(2, "PLAYEREXIT", (ctx, p, pkt) => newHallExit(ctx, p, pkt))
    .on(3, "PLAYERMOVE", (ctx, p, pkt) => newHallMove(ctx, p, pkt))
    .on(4, "ADDPLAYE", (ctx, p, pkt) => newHallAddPlayer(ctx, p, pkt))
    .on(5, "MODIFYDRESS", (ctx, p) => newHallModifyDress(ctx, p))
    .on(7, "PLAYERHID", (ctx, p, pkt) => newHallHide(ctx, p, pkt))
    .on(8, "PLAYERSHOW", (ctx, p) => newHallShow(ctx, p))
    .on(9, "UPDATEPETS", (ctx, p, pkt) => newHallUpdatePets(ctx, p, pkt));
  // 262 não existe na 4.1 (nunca colide) — ainda assim só despacha pro roteador quando o remetente é 6600,
  // por simetria defensiva com os outros códigos colididos (259/237/121, research/6600/packets-m1.md).
  r.player(262, "NEW_HALL", (ctx, p, pkt, client) => {
    if (p.clientKind !== "6600") return;
    return sub.handler(ctx, p, pkt, client);
  });
}
