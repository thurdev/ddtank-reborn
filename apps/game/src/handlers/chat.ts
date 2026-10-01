/** Chat: 19 SCENE_CHAT, 37 CHAT_PERSONAL, 71 S_BUGLE, 72 B_BUGLE, 20 SCENE_FACE (01 §2). */
import { GSPacket } from "@ddt/protocol";
import { findUserIdByNickName } from "../db/characters.js";
import type { HandlerRegistry } from "./registry.js";

export function registerChat(r: HandlerRegistry): void {
  /** SceneChatHandler.cs:14 (GM $ban/$mute block is behind if(false) in the original — not ported). */
  r.player(19, "SCENE_CHAT", (ctx, p, pkt) => {
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
    if (channel === 9 || channel === 13) return; // chapel / hot spring scenes not ported
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
  });

  /** UserPrivateChatHandler.cs:11 — whisper; echoed to the sender. */
  r.player(37, "CHAT_PERSONAL", async (ctx, p, pkt) => {
    let targetId = pkt.readInt();
    const nick = pkt.readString();
    pkt.readString();
    const msg = pkt.readString();
    const auto = pkt.readBoolean();
    if (targetId === 0) targetId = ctx.world.getByNick(nick)?.id ?? (await findUserIdByNickName(ctx.db.db, nick)) ?? 0;
    if (targetId === 0) return p.sendMessage(1, ctx.lang.t("UserPrivateChatHandler.NoUser"));
    const out = new GSPacket(37, p.id);
    out.writeInt(targetId);
    out.writeString(nick);
    out.writeString(p.info.NickName ?? "");
    out.writeString(msg);
    out.writeBoolean(auto);
    const target = ctx.world.get(targetId);
    if (target) {
      if (target.isBlackFriend(p.id)) return;
      target.send(out);
    }
    p.send(out);
  });

  /** SmallBugleHandler.cs:12 — needs a PropBag item category 11 / Property1 4 (consumed before the 2 s check). */
  r.player(71, "S_BUGLE", (ctx, p, pkt) => {
    const item = p.propBag.getItemByCategoryID(0, 11, 4);
    if (!item) return;
    p.propBag.removeCountFromStack(item, 1);
    pkt.readInt();
    pkt.readString();
    const msg = pkt.readString();
    if (p.lastChatTime + 2000 > Date.now()) return p.sendMessage(3, ctx.lang.t("SmallBugleHandler.Msg"));
    p.lastChatTime = Date.now();
    for (const o of ctx.world.all()) {
      const out = new GSPacket(71, o.id);
      out.writeInt(p.id);
      out.writeString(p.info.NickName ?? "");
      out.writeString(msg);
      o.send(out);
    }
  });

  /** BigBugleHandler.cs:12 — fixed: no free broadcast when the player has no bugle (original bug, 01 §2). */
  r.player(72, "B_BUGLE", (ctx, p, pkt) => {
    const tpl = pkt.readInt();
    const byTpl = p.propBag.getItemByTemplateID(0, tpl);
    if (p.lastChatTime + 2000 > Date.now()) return p.sendMessage(3, ctx.lang.t("BigBugleHandler.Msg"));
    let build: (id: number) => GSPacket;
    if (byTpl) {
      pkt.readInt();
      pkt.readString();
      const msg = pkt.readString();
      p.propBag.removeCountFromStack(byTpl, 1);
      build = (id) => {
        const o = new GSPacket(72, id);
        o.writeInt(byTpl.template.Property2); o.writeInt(p.id); o.writeString(p.info.NickName ?? ""); o.writeString(msg);
        return o;
      };
    } else {
      pkt.readString();
      const msg = pkt.readString();
      const any = p.propBag.getItemByCategoryID(0, 11, 4);
      if (!any) return;
      p.propBag.removeCountFromStack(any, 1);
      build = (id) => {
        const o = new GSPacket(72, id);
        o.writeInt(p.zoneId); o.writeInt(p.id); o.writeString(p.info.NickName ?? ""); o.writeString(msg); o.writeString(p.zoneName);
        return o;
      };
    }
    p.lastChatTime = Date.now();
    for (const o of ctx.world.all()) o.send(build(o.id));
  });

  /** SceneSmileHandler: forwards the packet as-is (ClientID = sender) to the room or the lobby. */
  r.player(20, "SCENE_FACE", (ctx, p, pkt) => {
    const out = GSPacket.parse(pkt.toBytes());
    out.clientId = p.id;
    out.offset = out.length;
    if (p.currentRoom) p.currentRoom.sendToAll(out);
    else for (const o of ctx.rooms.waiting.values()) o.send(out);
  });
}
