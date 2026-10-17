/**
 * Aba no jogo: Termas › sala privada (alugar, renovar, editar, remover jogador, continuar/saír).
 * Pacotes: 175 HOTSPRING_ROOM_CREATE; 191 HOTSPRING_CMD sub 3 RENEWAL_FEE, sub 6 EDIT,
 * sub 9 ADMIN_REMOVE_PLAYER, sub 10 PLAYER_CONTINUE.
 *
 * **Feature nova, sem C# de referência**: o cliente Flash manda esses 5 pacotes completos
 * (`GameSocketOut.sendHotSpringRoomCreate/Edit/RenewalFee/AdminRemovePlayer/PlayerContinue`,
 * `HotSpringRoomListController`/`HotSpringRoomController`), mas o C# 4.1 original NUNCA implementou
 * nenhum deles (`Game.Server/HotSpringRooms/TankHandle/` só tem `TargetPointCmd` e um `RenewalFeeCmd` que
 * lê o int e não faz nada). `vendor/DDT-6600` tem o mesmo cliente e também não tem servidor pra isso. Ou
 * seja: é uma funcionalidade nova do Reborn, construída pra bater com o que o cliente de fato manda:
 * - 175 criar: jogador (sem sala própria, não está em sala nenhuma) paga `HotSpringRoomCreateGold`
 *   (padrão 20000) ouro por `HotSpringRoomInitialMinutes` minutos (padrão 60) de aluguel.
 * - A sala conta o tempo próprio (`effectiveTime`) a cada minuto, esteja ou não ocupada; ao zerar, todo
 *   mundo é expulso, a linha é apagada e o pacote 174 HOTSPRING_ROOM_REMOVE é mandado pra cena.
 * - 191/3 RENEWAL_FEE: o DONO, dentro da própria sala, paga `HotSpringRoomRenewalGold` (padrão 3000)
 *   por mais `HotSpringRoomRenewalMinutes` (padrão 30).
 * - 191/6 EDIT: o DONO troca nome/senha/descrição da própria sala.
 * - 191/9 ADMIN_REMOVE_PLAYER: o DONO expulsa um jogador específico da própria sala.
 * - 191/10 PLAYER_CONTINUE: o cliente só manda um bool de confirmação ("ainda estou aqui"); `false` sai
 *   da sala (mesmo efeito do 169 HOTSPRING_ROOM_PLAYER_REMOVE).
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: Termas → criar sala privada
 * → pagar ouro → editar/renovar/expulsar de dentro da sala.
 */
import { GSPacket, PacketOut } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { hotSpringMgr } from "./mgr.js";

/** 175 HOTSPRING_ROOM_CREATE: UTF nome, UTF senha, UTF introdução, int maxCount. */
export async function hotSpringRoomCreate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const roomName = pkt.readString();
  const roomPassword = pkt.readString();
  const roomIntroduction = pkt.readString();
  const maxCount = pkt.readInt();
  const m = await hotSpringMgr(ctx);
  const reply = new PacketOut(175);
  if (m.st(p).room) { reply.writeBoolean(false); p.send(reply); return; }
  const room = await m.createPrivateRoom(p, roomName, roomPassword, roomIntroduction, maxCount);
  if (!room) { reply.writeBoolean(false); p.send(reply); return; }
  const i = room.info;
  reply.writeBoolean(true);
  reply.writeInt(i.roomID); reply.writeString(i.roomName); reply.writeString(i.roomPassword ?? "");
  reply.writeInt(i.effectiveTime); reply.writeInt(room.count); reply.writeInt(i.playerID); reply.writeString(i.playerName);
  Out.wd(reply, i.startTime); reply.writeString(i.roomIntroduction); reply.writeInt(i.roomType); reply.writeInt(i.maxCount);
  p.send(reply);
}

/** 191/3 HOTSPRING_ROOM_RENEWAL_FEE — o dono paga ouro pra ganhar mais minutos de aluguel. */
export async function hotSpringRoomRenewalFee(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  pkt.readInt(); // client sends its current roomID (HotSpringManager.roomCurrently) — redundant, we use the player's actual room
  const m = await hotSpringMgr(ctx);
  const room = m.st(p).room;
  if (room) await m.renewRoom(p, room);
}

/** 191/6 HOTSPRING_ROOM_EDIT — o dono troca nome/senha/descrição da própria sala. */
export async function hotSpringRoomEdit(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const roomName = pkt.readString();
  const roomPassword = pkt.readString();
  const roomIntroduction = pkt.readString();
  const m = await hotSpringMgr(ctx);
  const room = m.st(p).room;
  if (room) await m.editRoom(p, room, roomName, roomPassword, roomIntroduction);
}

/** 191/9 HOTSPRING_ROOM_ADMIN_REMOVE_PLAYER — o dono expulsa um jogador específico. */
export async function hotSpringRoomAdminRemovePlayer(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const targetId = pkt.readInt();
  const m = await hotSpringMgr(ctx);
  const room = m.st(p).room;
  if (room) m.adminRemovePlayer(p, room, targetId);
}

/** 191/10 HOTSPRING_ROOM_PLAYER_CONTINUE — ack de "ainda estou aqui"; `false` sai da sala. */
export async function hotSpringRoomPlayerContinue(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const wantsToStay = pkt.readBoolean();
  if (wantsToStay) return p.sendMessage(0, "Você optou por continuar na sala.");
  const m = await hotSpringMgr(ctx);
  if (m.remove(p)) p.sendMessage(0, "Você saiu da sala.");
}
