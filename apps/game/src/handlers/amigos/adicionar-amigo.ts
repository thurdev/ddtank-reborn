/**
 * Aba no jogo: Amigos › adicionar amigo (pedido de amizade ou bloquear jogador).
 * Pacotes: 160 IM_CMD sub 160 FRIEND_ADD.
 * C#: sem lógica no C# 4.1 original (só o enum do pacote); formato espelha `InviteFriendsManager.as`/
 * `GameSocketOut.as` do cliente Flash. Regra de negócio é toda Reborn.
 * Como testar: `apps/game/test/handlers.test.ts` (fluxo de amizade). Manual: Amigos → digitar nick → Adicionar.
 */
import { GSPacket } from "@ddt/protocol";
import { loadPlayerInfoByNick } from "../../db/characters.js";
import { addFriend } from "../../db/social.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

/**
 * 160/160 FRIEND_ADD — pedir amizade (relation 0) ou bloquear (relation 1).
 * Como lê esse código (cada variável):
 * - nick: nome do outro jogador (digitado no cliente).
 * - relation: 0 = pedido de amizade, 1 = bloquear; qualquer outro valor é ignorado.
 * - online: `GamePlayer` já conectado agora (busca em memória); se não tiver online, busca no banco por
 *   nick (`loadPlayerInfoByNick`) só pra achar o ID/estado dele.
 * - info: dados básicos do alvo (ID, NickName, State = status online, typeVIP/VIPLevel).
 */
export async function addFriendOrBlock(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const nick = pkt.readString();
  const relation = pkt.readInt();
  if (relation < 0 || relation > 1) return;
  const online = ctx.world.getByNick(nick);
  const info = online?.info ?? (await loadPlayerInfoByNick(ctx.db.db, nick));
  if (!info) return p.sendMessage(1, ctx.lang.t("FriendAddHandler.Success") + nick);
  if (p.friends.get(info.ID) === relation) return p.sendMessage(0, ctx.lang.t("FriendAddHandler.Falied"));
  if (!(await addFriend(ctx.db.db, p.id, info.ID, relation))) return;
  p.friends.set(info.ID, relation);
  // Se não é bloqueio e o alvo está online, avisa o outro lado (subcode 166) que agora é amigo dele,
  // pra UI dele atualizar sem precisar reabrir a lista.
  if (relation !== 1 && info.State !== 0 && online) {
    const n = new GSPacket(160, p.id);
    n.writeByte(166);
    n.writeInt(info.ID);
    n.writeString(p.info.NickName ?? "");
    n.writeBoolean(false);
    online.send(n);
  }
  p.send(Out.addFriend(info, relation, true, p.clientKind));
  p.sendMessage(0, ctx.lang.t("FriendAddHandler.Success2"));
}
