/**
 * Aba no jogo: emoji/balão de carinha acima do personagem.
 * Pacotes: 20 SCENE_FACE.
 * C#: `SceneSmileHandler` — repassa o pacote como veio (ClientID = remetente) pra sala ou lobby.
 * Como testar: `apps/game/test/chat-bots.test.ts`. Manual: clicar no ícone de emoji na cena.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export function sceneFace(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const out = GSPacket.parse(pkt.toBytes());
  out.clientId = p.id;
  out.offset = out.length;
  if (p.currentRoom) p.currentRoom.sendToAll(out);
  else for (const o of ctx.rooms.waiting.values()) o.send(out);
}
