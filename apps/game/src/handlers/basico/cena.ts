/**
 * Aba no jogo: Lobby › entrar/saber da cena, lista de jogadores online na sala de espera.
 * Pacotes: 16 SCENE_LOGIN, 21 SCENE_REMOVE_USER, 69 SCENE_USERS_LIST.
 * C#: `UserEnterSceneHandler.cs`, `UserLeaveSceneHandler.cs`, `SceneUsersListHandler.cs`.
 * Como testar: `apps/game/test/*` (sala de espera). Manual: Lobby.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { chapelBrowsers } from "../casamento/infra.js";

/** 16 SCENE_LOGIN: UserEnterSceneHandler (hall 1 -> Manual, 2 -> Away), entra na sala de espera. */
export function sceneLogin(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const hall = pkt.readInt();
  if (hall === 1) p.playerState = 1;
  else if (hall === 2) p.playerState = 2;
  p.updateProperties();
  ctx.rooms.enterWaitingRoom(p);
}

/**
 * 21 SCENE_REMOVE_USER: UserLeaveSceneHandler. Mesmo código numérico que `ddt.manager.ChurchManager.
 * sendExitMarryRoom` manda ao sair da LISTA da capela (m3-partial-sweep) — `chapelBrowsers.delete` é
 * sempre seguro (no-op pra quem nunca mandou 240 MARRY_SCENE_LOGIN).
 */
export function sceneRemoveUser(ctx: ServerContext, p: GamePlayer): void {
  p.playerState = 1;
  ctx.rooms.exitWaitingRoom(p);
  chapelBrowsers(ctx).delete(p);
}

/** 69 SCENE_USERS_LIST: SceneUsersListHandler (page, pageSize; roda em módulo). */
export function sceneUsersList(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const page = pkt.readByte();
  const size = pkt.readByte();
  const all = ctx.world.allNoGame();
  const n = all.length;
  const count = Math.min(n, size);
  const out = new GSPacket(69, p.id);
  out.writeByte(count);
  for (let i = page * size; i < page * size + count; i++) {
    const c = all[i % n]!.info;
    out.writeInt(c.ID); out.writeString(c.NickName ?? ""); out.writeByte(c.typeVIP); out.writeInt(c.VIPLevel); out.writeBoolean(c.Sex);
    out.writeInt(c.Grade); out.writeInt(c.ConsortiaID); out.writeString(c.ConsortiaName ?? ""); out.writeInt(c.Offer); out.writeInt(c.Win);
    out.writeInt(c.Total); out.writeInt(c.Escape); out.writeInt(c.Repute); out.writeInt(c.FightPower);
  }
  p.send(out);
}
