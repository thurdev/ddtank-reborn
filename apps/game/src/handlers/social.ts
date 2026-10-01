/** 160 IM_CMD (IMHandler.cs) — friends add/remove/state, one-on-one talk. */
import { GSPacket } from "@ddt/protocol";
import { loadPlayerInfoByNick } from "../db/characters.js";
import { addFriend, deleteFriend } from "../db/social.js";
import * as Out from "../packets/out.js";
import { SubRouter, type HandlerRegistry } from "./registry.js";

export function imRouter(): SubRouter {
  return new SubRouter("byte", "IM_CMD")
    .on(160, "FRIEND_ADD", async (ctx, p, pkt) => {
      const nick = pkt.readString();
      const relation = pkt.readInt();
      if (relation < 0 || relation > 1) return;
      const online = ctx.world.getByNick(nick);
      const info = online?.info ?? (await loadPlayerInfoByNick(ctx.db.db, nick));
      if (!info) return p.sendMessage(1, ctx.lang.t("FriendAddHandler.Success") + nick);
      if (p.friends.get(info.ID) === relation) return p.sendMessage(0, ctx.lang.t("FriendAddHandler.Falied"));
      if (!(await addFriend(ctx.db.db, p.id, info.ID, relation))) return;
      p.friends.set(info.ID, relation);
      if (relation !== 1 && info.State !== 0 && online) {
        const n = new GSPacket(160, p.id);
        n.writeByte(166);
        n.writeInt(info.ID);
        n.writeString(p.info.NickName ?? "");
        n.writeBoolean(false);
        online.send(n);
      }
      p.send(Out.addFriend(info, relation, true));
      p.sendMessage(0, ctx.lang.t("FriendAddHandler.Success2"));
    })
    .on(161, "FRIEND_REMOVE", async (ctx, p, pkt) => {
      const id = pkt.readInt();
      if (await deleteFriend(ctx.db.db, p.id, id)) {
        p.friends.delete(id);
        p.send(Out.friendRemove(id));
      }
    })
    .on(165, "FRIEND_STATE", (ctx, p, pkt) => {
      const state = pkt.readInt();
      // center 160/165 broadcast -> WorldMgr.ChangePlayerState: every friend online gets the new state.
      for (const o of ctx.world.all()) if (o !== p && o.friends.has(p.id)) o.send(Out.friendState(p.id, state, p.info.typeVIP, p.info.VIPLevel));
    })
    .on(51, "ONE_ON_ONE_TALK", (ctx, p, pkt) => {
      const target = pkt.readInt();
      const msg = pkt.readString();
      pkt.readBoolean();
      const o = ctx.world.get(target);
      if (!o) return p.sendMessage(0, ctx.lang.t("FriendAddHandler.Ofline"));
      p.send(Out.oneOnOneTalk(target, p.info.NickName ?? "", msg, p.id, ctx.now()));
      o.send(Out.oneOnOneTalk(p.id, p.info.NickName ?? "", msg, target, ctx.now()));
    })
    .on(208, "ADD_CUSTOM_FRIENDS", () => {}, "stub")
    .on(45, "ONS_EQUIP", () => {}, "stub");
}

export function registerSocial(r: HandlerRegistry): SubRouter {
  const im = imRouter();
  r.player(160, "IM_CMD", im.handler);
  return im;
}
