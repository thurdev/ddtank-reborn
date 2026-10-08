/** 160 IM_CMD (IMHandler.cs) — friends add/remove/state, one-on-one talk.
 * 107 INVITE_FRIEND + 40 SNS_MSG_RECEIVE + 223 FRIEND_BRITHDAY — Reborn impl.
 * The 4.1 C# base only has the packet enums (Facebook-era stubs, no server logic):
 * AS3 shapes mirrored from vendor/DDTank41/Source Flash (InviteFriendsManager.as,
 * GameSocketOut.as, SNSFrame.as, FriendBirthdayManager.as). */
import { GSPacket } from "@ddt/protocol";
import { loadPlayerInfoByNick } from "../db/characters.js";
import { addFriend, addInvite, claimedInviteTiers, countInvites, deleteFriend, sendMail } from "../db/social.js";
import { claimOnce, grantRewards } from "../game/events.js";
import type { GamePlayer } from "../game/player.js";
import * as Out from "../packets/out.js";
import type { ServerContext } from "../session/context.js";
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
  r.player(107, "INVITE_FRIEND", inviteRouter().handler);
  registerAmigos(r);
  return im;
}

/** Invites needed per reward tier (Reborn rule — the original never defined server values). */
const INVITE_TIERS = [1, 3, 5, 10];
const INVITE_GOLD = [1000, 3000, 6000, 15000];

function inviteFlags(claimed: Set<number>): number[] {
  return [1, 2, 3, 4].map((t) => (claimed.has(t) ? 1 : 0));
}

function inviteRouter(): SubRouter {
  return new SubRouter("int", "INVITE_FRIEND")
    .on(2, "INVITE_FRIEND_OPENVIEW", async (ctx, p) => {
      // InviteFriendsManager.showInviteMainView: readInt, readInt, nowInviteNum.
      const out = new GSPacket(107, p.id);
      out.writeInt(2);
      out.writeInt(0);
      out.writeInt(0);
      out.writeInt(await countInvites(ctx.db.db, p.id));
      p.send(out);
    })
    .on(1, "INVITE_FRIEND_FRIENDREWARD", async (ctx, p, pkt) => {
      // inviteFriendOkClick(nick): client reads nothing back (case FRIENDREWARD: break).
      const nick = pkt.readString().trim();
      if (!nick || nick.length > 64) return;
      if (await addInvite(ctx.db.db, p.id, nick)) {
        // New invite: push the new count so the view lights the reward button.
        const out = new GSPacket(107, p.id);
        out.writeInt(3);
        out.writeInt(await countInvites(ctx.db.db, p.id));
        p.send(out);
      }
    })
    .on(4, "INVITE_FRIEND_GETREWARD", async (ctx, p, pkt) => {
      // gerRewrd: readInt(tier echo), readBoolean(granted), 4 claimed flags.
      const tier = pkt.readInt();
      const out = new GSPacket(107, p.id);
      out.writeInt(4);
      out.writeInt(tier);
      let granted = false;
      if (tier >= 1 && tier <= 4 && (await countInvites(ctx.db.db, p.id)) >= INVITE_TIERS[tier - 1]!) {
        if (await claimOnce(ctx.db.db, p.id, "invite", `tier:${tier}`)) {
          grantRewards(p, [{ templateId: -100, count: INVITE_GOLD[tier - 1]! }], ctx.templates.findItem, ctx.now());
          granted = true;
        }
      }
      out.writeBoolean(granted);
      for (const f of inviteFlags(await claimedInviteTiers(ctx.db.db, p.id))) out.writeInt(f);
      p.send(out);
    })
    .on(6, "INVITE_FRIEND_FBCLICK", (ctx, p) => {
      // fbclick: readDate (last FB share time) — Reborn has no Facebook: echo now.
      const out = new GSPacket(107, p.id);
      out.writeInt(6);
      out.writeDateTime(ctx.now(), true);
      p.send(out);
    });
}

/** 107/5 INVITE_FRIEND_LOGIN for the login burst (InviteFriendsManager.login reads).
 * Nunca derruba o login: qualquer erro de invite vira pacote zerado. */
export async function inviteLoginPacket(ctx: ServerContext, p: GamePlayer): Promise<GSPacket> {
  const out = new GSPacket(107, p.id);
  out.writeInt(5);
  out.writeString(String(p.id));
  try {
    out.writeInt(await countInvites(ctx.db.db, p.id));
    out.writeDateTime(ctx.now(), true);
    for (const f of inviteFlags(await claimedInviteTiers(ctx.db.db, p.id))) out.writeInt(f);
  } catch (e) {
    ctx.log.debug(`invite state fallback: ${e instanceof Error ? e.message : e}`);
    out.writeInt(0);
    out.writeDateTime(ctx.now(), true);
    for (const f of [0, 0, 0, 0]) out.writeInt(f);
  }
  out.writeInt(1); // serverID (OverSeasCommunController display only)
  return out;
}

function registerAmigos(r: HandlerRegistry): void {
  /** 40 SNS_MSG_RECEIVE: fire-and-forget by design — the SNS post itself goes over
   * HTTP (SNSFrame posts to the SNS path then shows "succeed"); the socket int is
   * only a notify the 4.1 server also ignored (no C# logic). No reply. */
  r.player(40, "SNS_MSG_RECEIVE", (ctx, _p, pkt) => {
    const typeId = pkt.readInt();
    ctx.log.debug(`sns notify type=${typeId}`);
  });

  /** 223 FRIEND_BRITHDAY: client uploads friends whose birthday is today/tomorrow
   * (FriendBirthdayManager.findFriendBirthday); server answers with a type-60 mail
   * (ReadingView opens the birthday view on MailType 60). No C# logic existed. */
  r.player(223, "FRIEND_BRITHDAY", async (ctx, p, pkt) => {
    const n = pkt.readInt();
    const names: string[] = [];
    for (let i = 0; i < n && i < 50; i++) {
      pkt.readInt(); // friend ID (client-side reference only)
      const nick = pkt.readString();
      try { pkt.readDateTime(); } catch { break; }
      if (nick) names.push(nick);
    }
    if (!names.length) return;
    await sendMail(ctx.db.db, {
      Content: names.join(", "), Title: "Aniversário de amigo!", Gold: 0, Money: 0,
      Type: 60, Receiver: p.info.NickName ?? "", ReceiverID: p.id, Sender: "DDTank", SenderID: 0,
    } as never);
    p.send(Out.mailResponse(p.id, 1));
  });
}
