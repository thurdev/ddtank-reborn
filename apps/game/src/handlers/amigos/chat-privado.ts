/**
 * Aba no jogo: Amigos › chat privado 1-a-1 (balão de conversa). Inclui 2 subs mortos (sem uso real, só
 * respondidos pra não ficar "sem handler").
 * Pacotes: 160 IM_CMD sub 51 ONE_ON_ONE_TALK; subs 208 ADD_CUSTOM_FRIENDS e 45 ONS_EQUIP (stub, no-op).
 * C#: sem lógica no C# 4.1 original (só o enum do pacote).
 * Como testar: `apps/game/test/handlers.test.ts`. Manual: Amigos → clicar no amigo → escrever e enviar.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

/**
 * 160/51 ONE_ON_ONE_TALK — chat privado.
 * Como lê esse código (cada variável):
 * - target: ID do destinatário.
 * - msg: texto digitado.
 * - 3º valor do pacote (boolean) existe no cliente mas o servidor não usa pra nada (lido e descartado).
 * - o: destinatário online (`ctx.world.get(target)`); se não tiver, avisa o remetente que está offline.
 * Manda a mesma mensagem de volta pro remetente (eco, pro balão aparecer na tela de quem escreveu) e pro
 * destinatário, se ele estiver online.
 */
export function oneOnOneTalk(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const target = pkt.readInt();
  const msg = pkt.readString();
  pkt.readBoolean();
  const o = ctx.world.get(target);
  if (!o) return p.sendMessage(0, ctx.lang.t("FriendAddHandler.Ofline"));
  p.send(Out.oneOnOneTalk(target, p.info.NickName ?? "", msg, p.id, ctx.now()));
  o.send(Out.oneOnOneTalk(p.id, p.info.NickName ?? "", msg, target, ctx.now()));
}

/** 160/208 ADD_CUSTOM_FRIENDS — grupos customizados de amigos: nunca usado no Reborn, no-op. */
export function addCustomFriends(): void {}

/** 160/45 ONS_EQUIP — resquício de rede social (equipamento compartilhado): nunca usado no Reborn, no-op. */
export function onsEquip(): void {}
