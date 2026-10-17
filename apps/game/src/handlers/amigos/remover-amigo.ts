/**
 * Aba no jogo: Amigos › remover amigo da lista.
 * Pacotes: 160 IM_CMD sub 161 FRIEND_REMOVE.
 * C#: sem lógica no C# 4.1 original (só o enum do pacote).
 * Como testar: `apps/game/test/handlers.test.ts`. Manual: Amigos → botão direito no amigo → Remover.
 */
import { GSPacket } from "@ddt/protocol";
import { deleteFriend } from "../../db/social.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

/** 160/161 FRIEND_REMOVE — id: ID numérico do amigo a remover da lista. */
export async function removeFriend(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  if (await deleteFriend(ctx.db.db, p.id, id)) {
    p.friends.delete(id);
    p.send(Out.friendRemove(id));
  }
}
