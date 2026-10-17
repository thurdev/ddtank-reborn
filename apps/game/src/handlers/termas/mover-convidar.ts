/**
 * Aba no jogo: Termas › andar dentro da sala e convidar um amigo pra sala.
 * Pacotes: 191 HOTSPRING_CMD sub 1 TARGET_POINT, sub 4 HOTSPRING_ROOM_INVITE.
 * C#: `TankHandle/TargetPointCmd.cs` (move); INVITE não tem handler nenhum no C# original (o cliente 4.1
 * também não tem receptor) — aqui o convidado recebe um aviso em texto com o número da sala.
 * Fix vs o original: TARGET_POINT movia QUALQUER id de jogador que o cliente mandasse; agora o servidor
 * move só quem enviou o pacote e limita o destino à cena (posição autoritativa do servidor).
 * Como testar: `apps/game/test/hotspring.test.ts`. Manual: Termas → andar dentro da sala / convidar amigo.
 */
import { GSPacket, PacketOut } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { hotSpringMgr, sanitizePath, SCENE } from "./mgr.js";

/** 191/1 TARGET_POINT — andar dentro da sala (o servidor recalcula o caminho e só move o próprio jogador). */
export async function targetPoint(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const m = await hotSpringMgr(ctx);
  const s = m.st(p);
  if (!s.room) return;
  const path = sanitizePath(pkt.readString());
  pkt.readInt(); // client-named player id: ignored, only the sender moves
  let x = pkt.readInt();
  let y = pkt.readInt();
  pkt.readInt();
  const dir = pkt.readInt();
  if (path.length >= 2) { x = path[path.length - 2]!; y = path[path.length - 1]!; }
  s.x = Math.min(SCENE.maxX, Math.max(SCENE.minX, x));
  s.y = Math.min(SCENE.maxY, Math.max(SCENE.minY, y));
  s.dir = dir >= 1 && dir <= 8 ? dir : s.dir;
  const out = new PacketOut(191, p.id);
  out.writeByte(1);
  out.writeString(path.join(","));
  out.writeInt(p.id);
  out.writeInt(s.x);
  out.writeInt(s.y);
  s.room.send(out, p);
}

/** 191/4 HOTSPRING_ROOM_INVITE — avisa um amigo online que você está numa sala e o número dela. */
export async function hotSpringRoomInvite(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  const m = await hotSpringMgr(ctx);
  const r = m.st(p).room;
  const o = ctx.world.get(id);
  if (!r || !o) return p.sendMessage(0, ctx.lang.t("FriendAddHandler.Ofline"));
  o.sendMessage(0, `[${p.info.NickName}] convidou você para a Fonte Termal — sala ${r.info.roomNumber} (${r.info.roomName}).`);
  p.sendMessage(0, `Convite enviado para [${o.info.NickName}].`);
}
