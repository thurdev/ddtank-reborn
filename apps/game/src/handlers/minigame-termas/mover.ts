/**
 * Aba no jogo: Especial › Đại chiến Hút Gà — andar pelo mapa (o cliente faz o A* visualmente; o servidor
 * só guarda e retransmite a posição final).
 * Pacotes: 166 LITTLEGAME_COMMAND sub 32 MOVE, sub 33 POS_SYNC.
 * C#: `LittleGame/Handle/Move.cs`, `PosSync.cs` (no original os dois só leem os ints e nunca os usam de
 * verdade pra anti-cheat — `PosSync` é um no-op puro, mantido assim aqui).
 * Como testar: `apps/game/test/littlegame.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { littleGameMgr } from "./mgr.js";

/** sub 32 MOVE: cliente manda (x,y) atuais + (dx,dy) destino + clock; o servidor só guarda o destino
 *  (`Move.cs`: lê 5 ints, usa só o 3º/4º) e retransmite pra todo mundo, exceto quem mandou. */
export function move(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  pkt.readInt(); pkt.readInt(); // (x,y) atuais do cliente: ignorados, igual ao original
  const dx = pkt.readInt();
  const dy = pkt.readInt();
  pkt.readInt(); // clock: ignorado
  const m = littleGameMgr(ctx);
  const s = m.st(p);
  s.x = dx; s.y = dy;
  m.broadcastMove(p);
}

/** sub 33 POS_SYNC: no-op (`PosSync.cs` lê os 2 ints e não faz nada com eles). */
export function posSync(_ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  pkt.readInt(); pkt.readInt();
}
