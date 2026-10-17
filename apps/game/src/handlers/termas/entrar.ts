/**
 * Aba no jogo: Termas › entrar na fonte termal (lista de salas, entrar numa específica, entrada rápida,
 * ver quem está na sala, sair).
 * Pacotes: 187 HOTSPRING_ENTER, 202 HOTSPRING_ROOM_ENTER, 190 HOTSPRING_ROOM_QUICK_ENTER,
 * 212 HOTSPRING_ROOM_ENTER_CONFIRM, 201 HOTSPRING_ROOM_ENTER_VIEW, 169 HOTSPRING_ROOM_PLAYER_REMOVE.
 * C#: `Packets/Client/HotSpring*.cs` (HotSpringEnterHandler, HotSpringRoomEnterHandler,
 * HotSpringRoomQuickEnterHandler, HotSpringEnterConfirmHandler, HotSpringRoomEnterViewHandler,
 * HotSpringRoomPlayerRemoveHandler).
 * Fix vs o original: 202 cobrava os 10000 ouro só depois do `AddPlayer` ter sucesso, sem devolver se
 * `RemoveGold` falhasse; aqui o ouro é checado e cobrado antes de entrar. O dono da sala privada nunca
 * paga pra entrar na própria sala.
 * Como testar: `apps/game/test/hotspring.test.ts`. Manual: Termas → lista de salas → entrar.
 */
import { GSPacket, PacketOut } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { hotSpringMgr } from "./mgr.js";

/** 187 HOTSPRING_ENTER: entra na cena, recebe a lista de salas. */
export async function hotSpringEnter(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const m = await hotSpringMgr(ctx);
  m.scene.add(p);
  p.send(m.roomList([...m.rooms.values()]));
}

/** 202 HOTSPRING_ROOM_ENTER: int roomId, str pwd; 10000 ouro (grátis se for a sua própria sala privada). */
export async function hotSpringRoomEnter(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  pkt.readString();
  const m = await hotSpringMgr(ctx);
  if (m.st(p).room) return;
  const room = m.rooms.get(id);
  if (!room) return p.sendMessage(0, ctx.lang.t("SpaRoomLoginHandler.Failed4"));
  const isOwnRoom = room.isPrivate && room.info.playerID === p.id; // the owner doesn't pay to enter their own rented room
  const need = isOwnRoom ? 0 : 10000;
  if (p.info.Gold < need) return p.sendMessage(0, ctx.lang.t("HotSpringRoomEnterDataHandler.NotEmoughtGold"));
  if (!m.add(p, room)) return;
  if (need > 0) p.removeGold(need);
  p.send(m.enterPacket(p, room));
}

/** 190 HOTSPRING_ROOM_QUICK_ENTER: sala aleatória não cheia, grátis (fixed: o original indexava
 * Next(0, 4) numa lista que podia ser mais curta). */
export async function hotSpringRoomQuickEnter(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const m = await hotSpringMgr(ctx);
  if (m.st(p).room) return p.sendMessage(0, ctx.lang.t("SpaRoomLoginHandler.Failed"));
  const free = [...m.rooms.values()].filter((r) => r.count < r.info.maxCount);
  const room = free[Math.floor(Math.random() * Math.min(4, free.length))];
  if (!room) return p.sendMessage(0, ctx.lang.t("SpaRoomLoginHandler.Failed4"));
  if (m.add(p, room)) p.send(m.enterPacket(p, room));
}

/** 212 HOTSPRING_ROOM_ENTER_CONFIRM: eco de confirmação (o cliente abre a animação de entrada). */
export async function hotSpringRoomEnterConfirm(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  const m = await hotSpringMgr(ctx);
  if (m.st(p).room) return;
  if (!m.rooms.has(id)) return p.sendMessage(0, ctx.lang.t("SpaRoomLoginHandler.Failed4"));
  const pk = new PacketOut(212);
  pk.writeInt(id);
  p.send(pk);
}

/** 201 HOTSPRING_ROOM_ENTER_VIEW: manda todo jogador da sala como pacote 198. */
export async function hotSpringRoomEnterView(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const m = await hotSpringMgr(ctx);
  const room = m.st(p).room;
  if (!room) return;
  for (const o of room.players) p.send(m.playerInfo(o));
}

/** 169 HOTSPRING_ROOM_PLAYER_REMOVE: sair da sala atual. */
export async function hotSpringRoomPlayerRemove(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const m = await hotSpringMgr(ctx);
  if (!m.remove(p)) return;
  const pk = new PacketOut(169);
  pk.writeString("Você saiu das Termas!");
  p.send(pk);
}
