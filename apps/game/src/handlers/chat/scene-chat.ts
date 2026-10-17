/**
 * Aba no jogo: chat da cena (geral, clã, termas, sala/time, sussurro de área) — balão de texto/canal
 * principal do jogo.
 * Pacotes: 19 SCENE_CHAT.
 * C#: `SceneChatHandler.cs` (o bloqueio de GM $ban/$mute fica atrás de `if(false)` no original — não portado).
 * Como testar: `apps/game/test/chat-bots.test.ts`. Manual: qualquer tela → caixa de chat.
 */
import { GSPacket } from "@ddt/protocol";
import { hotSpringMgr } from "../termas/index.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** 19 SCENE_CHAT: byte channel, bool team, str (ignorada), str text. Canal 3 = clã, 9 = capela (não portado),
 *  13 = termas; os demais seguem sala → time/todos, ou lobby com cooldown. */
export async function sceneChat(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const channel = pkt.readByte();
  const team = pkt.readBoolean();
  pkt.readString();
  const text = pkt.readString();
  const out = new GSPacket(19, p.id);
  out.writeInt(p.zoneId);
  out.writeByte(channel);
  out.writeBoolean(team);
  out.writeString(p.info.NickName ?? "");
  out.writeString(text);
  if (channel === 3) {
    if (p.info.ConsortiaID === 0) return;
    if (p.info.IsBanChat) return p.sendMessage(3, ctx.lang.t("ConsortiaChatHandler.IsBanChat"));
    out.writeInt(p.info.ConsortiaID);
    for (const o of ctx.world.all()) if (o.info.ConsortiaID === p.info.ConsortiaID && !o.isBlackFriend(p.id)) o.send(out);
    return;
  }
  if (channel === 13) {
    // HotSpringRoom.SendToAll(packet, self, isChat: true) — quem bloqueou o remetente não recebe
    const room = (await hotSpringMgr(ctx)).st(p).room;
    if (room) for (const o of room.players) if (!o.isBlackFriend(p.id)) o.send(out);
    return;
  }
  if (channel === 9) return; // cena da capela não portada
  const room = p.currentRoom;
  if (room) {
    if (team) room.sendToTeam(out, p.roomTeam);
    else room.sendToAll(out);
    return;
  }
  const now = Date.now();
  if (p.lastChatTime + ctx.cfg.CHAT_COOLDOWN_SEC * 1000 > now) return p.sendMessage(3, ctx.lang.t("SceneChatHandler.Fast"));
  if (p.lastChatTime + 1000 > now && channel === 5) return;
  if (team) return;
  p.lastChatTime = now;
  for (const o of ctx.world.all()) if (!o.currentRoom && !o.isBlackFriend(p.id)) o.send(out);
}
