/** 94 GAME_ROOM (GameRoomLogicProcessor reads an int sub -> GameRoom/Handle/*.cs), 91 GAME_CMD, 70 GAME_INVITE. */
import { GSPacket } from "@ddt/protocol";
import { RoomType } from "../rooms/room.js";
import { roomList } from "../packets/out.js";
import { SubRouter, type HandlerRegistry } from "./registry.js";

const NO_WEAPON = "Không mang vũ khí, không thể tham gia.";

export function roomRouter(): SubRouter {
  return new SubRouter("int", "GAME_ROOM")
    // Create.cs: byte roomType, byte timeType, str name, str password (world-boss rooms not ported).
    .on(0, "GAME_ROOM_CREATE", (ctx, p, pkt) => {
      const roomType = pkt.readByte();
      const timeType = pkt.readByte();
      const name = pkt.readString();
      const pwd = pkt.readString();
      if (!p.hasMainWeapon) return p.sendMessage(1, NO_WEAPON);
      ctx.rooms.createRoom(p, name, pwd, roomType, timeType);
    })
    // Login.cs: bool isInvite, int hallType, int roomSel; if roomSel == -1: int roomId, str password.
    .on(1, "GAME_ROOM_LOGIN", (ctx, p, pkt) => {
      pkt.readBoolean();
      const hall = pkt.readInt();
      const sel = pkt.readInt();
      let roomId = -1;
      let pwd = "";
      if (sel === -1) {
        roomId = pkt.readInt();
        pwd = pkt.readString();
      }
      ctx.rooms.enterRoom(p, roomId, pwd, hall);
    })
    // SetupChange.cs: int mapId, byte roomType, bool isOpenBoss, str password, str name, byte timeMode, byte hardLevel, int levelLimits, bool isCrosszone.
    .on(2, "GAME_ROOM_SETUP_CHANGE", (ctx, p, pkt) => {
      const room = p.currentRoom;
      if (!room || room.host !== p || room.IsPlaying) return;
      const mapId = pkt.readInt();
      const roomType = pkt.readByte();
      const isOpenBoss = pkt.readBoolean();
      const password = pkt.readString();
      const name = pkt.readString();
      const timeMode = pkt.readByte();
      const hardLevel = pkt.readByte();
      const levelLimits = pkt.readInt();
      const isCrosszone = pkt.readBoolean();
      ctx.rooms.setupChange(room, { mapId, roomType, password, name, timeMode, hardLevel, levelLimits, isCrosszone, isOpenBoss });
    }, "partial")
    .on(3, "GAME_ROOM_KICK", (ctx, p, pkt) => {
      if (p.currentRoom && p.currentRoom.host === p) ctx.rooms.kickPlayer(p.currentRoom, pkt.readByte());
    })
    .on(5, "GAME_ROOM_REMOVEPLAYER", (ctx, p) => {
      if (p.currentRoom) ctx.rooms.exitRoom(p.currentRoom, p);
    })
    .on(6, "GAME_TEAM", (ctx, p) => {
      if (p.currentRoom && p.currentRoom.RoomType !== RoomType.Match) ctx.rooms.switchTeam(p);
    })
    // GameStart.cs: host only; every member needs a weapon (captcha / PvE permission / tickets not ported).
    .on(7, "GAME_START", (ctx, p) => {
      const room = p.currentRoom;
      if (!room || room.host !== p) return;
      for (const m of room.getPlayers()) {
        if (!m.hasMainWeapon) {
          p.sendMessage(3, "Có thành viên hoặc khán giả không mang vũ khí, không thể bắt đầu!");
          room.IsPlaying = false;
          room.sendCancelPickUp();
          return;
        }
      }
      ctx.rooms.startGame(room);
    }, "partial")
    .on(9, "ROOMLIST_UPDATE", (ctx, p, pkt) => {
      const hall = pkt.readInt();
      const b = pkt.readInt();
      if (hall === 2 && b === -2) {
        pkt.readInt();
        pkt.readInt();
      }
      p.send(roomList(hall === 1 ? ctx.rooms.getAllMatchRooms() : hall === 2 ? ctx.rooms.getAllPveRooms() : []));
    })
    // UpdatePlaces.cs: byte pos, int place, bool isOpened, int placeView.
    .on(10, "GAME_ROOM_UPDATE_PLACE", (ctx, p, pkt) => {
      const room = p.currentRoom;
      if (!room) return;
      const pos = pkt.readByte();
      const place = pkt.readInt();
      const opened = pkt.readBoolean();
      const view = pkt.readInt();
      if (room.host === p) {
        if (room.RoomType !== RoomType.Freedom && pos >= 8) return;
        ctx.rooms.updateRoomPos(room, pos, opened, place, view);
      }
      // Non-host viewer switching (SwitchToView) not ported.
    }, "partial")
    .on(11, "GAME_PICKUP_CANCEL", (ctx, p) => ctx.rooms.cancelPickup(p))
    .on(12, "GAME_PICKUP_STYLE", (ctx, p, pkt) => {
      const style = pkt.readInt();
      const room = p.currentRoom;
      if (!room || room.RoomType !== RoomType.Match || room.host !== p) return;
      room.GameType = style === 1 ? 1 : 0;
      const out = new GSPacket(94);
      out.writeByte(12);
      out.writeByte(room.GameType);
      room.sendToAll(out);
    }, "partial")
    // GamePlayerStateChange.cs: byte state (0 not ready, 1 ready); needs a weapon.
    .on(15, "GAME_PLAYER_STATE_CHANGE", (ctx, p, pkt) => {
      if (!p.hasMainWeapon) return p.sendMessage(0, ctx.lang.t("Game.Server.SceneGames.NoEquip"));
      if (p.currentRoom) ctx.rooms.updatePlayerState(p, pkt.readByte());
    });
}


export function registerRooms(r: HandlerRegistry): SubRouter {
  const rr = roomRouter();
  r.player(94, "GAME_ROOM", rr.handler);
  // 91 GAME_CMD (GameDataHandler): forwarded to the fight module; with no game and sub 98 -> fake reply.
  r.player(91, "GAME_CMD", (_ctx, p, pkt) => {
    const game = p.currentRoom?.game;
    if (game) return game.processData(p, pkt);
    const off = pkt.offset;
    if (pkt.readByte() === 98) {
      const out = new GSPacket(91, p.id);
      out.writeByte(98); out.writeBoolean(true); out.writeByte(0); out.writeByte(0); out.writeByte(0); out.writeBoolean(false);
      p.send(out);
    }
    pkt.offset = off;
  }, "partial");
  // 70 GAME_INVITE (GameInviteHandler): target online and not in a room.
  r.player(70, "GAME_INVITE", (ctx, p, pkt) => {
    const room = p.currentRoom;
    const target = ctx.world.get(pkt.readInt());
    if (!room || !target || target.currentRoom) return;
    const o = new GSPacket(70, p.id);
    o.writeInt(p.id); o.writeInt(room.RoomId); o.writeInt(room.MapId); o.writeByte(room.TimeMode); o.writeByte(room.RoomType);
    o.writeByte(room.HardLevel); o.writeByte(room.LevelLimits); o.writeString(p.info.NickName ?? ""); o.writeBoolean(p.info.typeVIP > 0);
    o.writeInt(p.info.VIPLevel); o.writeString(room.Name); o.writeString(room.Password); o.writeInt(-1); o.writeBoolean(room.isOpenBoss);
    target.send(o);
  });
  // 82 / 86 host start shortcuts.
  r.player(86, "QUEST_ONE_KEY_FINISH(start)", (ctx, p) => {
    if (p.currentRoom && p.currentRoom.host === p) ctx.rooms.startGame(p.currentRoom);
  });
  return rr;
}
