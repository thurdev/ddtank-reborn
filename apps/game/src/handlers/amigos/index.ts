/**
 * Aba no jogo: índice de Amigos inteiro — lista de amigos, chat 1-a-1, convite de amigos e aniversário.
 * Cada ação tem o seu próprio arquivo, nomeado como o jogador vê na tela:
 *
 *   adicionar-amigo.ts  (Amigos › adicionar)              — 160 IM_CMD sub 160 FRIEND_ADD
 *   remover-amigo.ts    (Amigos › remover)                — 160 IM_CMD sub 161 FRIEND_REMOVE
 *   status-amigo.ts     (Amigos › status online/ausente)  — 160 IM_CMD sub 165 FRIEND_STATE
 *   chat-privado.ts     (Amigos › conversa 1-a-1)         — 160 IM_CMD sub 51 ONE_ON_ONE_TALK (+ subs
 *                                                            mortos 208/45)
 *   convidar-amigo.ts   (Amigos › convidar amigos)        — 107 INVITE_FRIEND (sub-roteador) + pacote de
 *                                                            login `inviteLoginPacket`
 *   aniversario.ts      (Amigos › aniversário)            — 223 FRIEND_BRITHDAY
 *   mural-social.ts     (sem tela própria, resquício SNS) — 40 SNS_MSG_RECEIVE
 *
 * Pacotes: ver tabela acima.
 * C#: o C# 4.1 base só define os enums desses pacotes (restos da era Facebook) — não tem lógica de
 * servidor nenhuma pra eles. Tudo aqui é implementação Reborn nova, espelhando o FORMATO que o cliente
 * Flash espera (`Source Flash/src/ddt/manager`: InviteFriendsManager.as, GameSocketOut.as, SNSFrame.as,
 * FriendBirthdayManager.as) com regras de negócio escritas do zero (tiers de convite, mensagens, etc.).
 * Como testar: `apps/game/test/handlers.test.ts`. Manual: `docs/features/amigos.md` tem o passo a passo
 * de cada ação.
 */
import type { HandlerRegistry } from "../registry.js";
import { SubRouter } from "../registry.js";
import { addFriendOrBlock } from "./adicionar-amigo.js";
import { removeFriend } from "./remover-amigo.js";
import { changeFriendState } from "./status-amigo.js";
import { oneOnOneTalk, addCustomFriends, onsEquip } from "./chat-privado.js";
import { inviteRouter } from "./convidar-amigo.js";
import { friendBirthday } from "./aniversario.js";
import { snsMsgReceive } from "./mural-social.js";

export { inviteLoginPacket } from "./convidar-amigo.js";

/**
 * Roteador do pacote 160 IM_CMD: pedido de amizade, remover amigo, mudar estado (online/ausente/
 * invisível), chat privado 1-a-1. Cada `.on(subcode, nome, fn)` é um sub-comando do mesmo pacote 160
 * (o 1º byte dentro dele escolhe qual).
 */
export function imRouter(): SubRouter {
  return new SubRouter("byte", "IM_CMD")
    .on(160, "FRIEND_ADD", addFriendOrBlock)
    .on(161, "FRIEND_REMOVE", removeFriend)
    .on(165, "FRIEND_STATE", changeFriendState)
    .on(51, "ONE_ON_ONE_TALK", oneOnOneTalk)
    .on(208, "ADD_CUSTOM_FRIENDS", addCustomFriends, "stub")
    .on(45, "ONS_EQUIP", onsEquip, "stub");
}

/**
 * Liga todos os pacotes de Amigos (160 IM_CMD, 107 INVITE_FRIEND, 223 FRIEND_BRITHDAY, 40 SNS_MSG_RECEIVE)
 * no dispatcher central do jogo (`r: HandlerRegistry`). Chamado 1x na inicialização do servidor
 * (ver `apps/game/src/handlers/index.ts`).
 *
 * @returns o SubRouter do IM_CMD — devolvido separado porque outro lugar do código (chat global)
 *   também precisa chamar esses mesmos handlers direto.
 */
export function registerAmigos(r: HandlerRegistry): SubRouter {
  const im = imRouter();
  r.player(160, "IM_CMD", im.handler);
  r.player(107, "INVITE_FRIEND", inviteRouter().handler);
  r.player(40, "SNS_MSG_RECEIVE", snsMsgReceive);
  r.player(223, "FRIEND_BRITHDAY", friendBirthday);
  return im;
}
