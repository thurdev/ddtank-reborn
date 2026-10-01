/**
 * LOGIN (code 1): UserLoginHandler.cs + center ALLOW_USER_LOGIN round trip + GamePlayer.Login/LoadFromDatabase,
 * and logout (GamePlayer.Quit, GamePlayer.cs:3780).
 */
import { validateGameLogin } from "@ddt/auth";
import { findCharacterByUserName, loadMatchInfo, loadPlayerInfo, setOnlineState } from "../db/characters.js";
import { loadUserItems } from "../db/items.js";
import { loadFriends, loadProgress } from "../db/social.js";
import { GamePlayer } from "../game/player.js";
import { BagType } from "../game/item.js";
import * as Out from "../packets/out.js";
import { unixSeconds } from "../util/time.js";
import type { GameClient } from "./client.js";
import type { ServerContext, TicketValidator } from "./context.js";
import type { DbHandle } from "@ddt/db";

/** Default validator: packages/auth validateGameLogin (app."LoginSessions", GameKey = Login.ashx tempPwd). */
export function dbTicketValidator(db: DbHandle, allowAny = false): TicketValidator {
  return {
    async validate(user, pass) {
      if (allowAny) return true;
      return (await validateGameLogin(db, user, pass)) != null;
    },
  };
}

function kick(client: GameClient, msg: string): void {
  client.send(Out.kitoff(msg));
  client.disconnect(`kick: ${msg}`);
}

export async function handleLogin(ctx: ServerContext, client: GameClient): Promise<void> {
  const login = client.pendingLogin;
  client.pendingLogin = null;
  const t = (k: string) => ctx.lang.t(k);
  const user = login?.payload?.user;
  const pass = login?.payload?.password;
  if (!user || pass == null) return kick(client, t("UserLoginHandler.LoginError"));
  const key = user.toLowerCase();
  if (ctx.world.loggingIn.has(key)) return kick(client, t("UserLoginHandler.LoginError"));
  ctx.world.loggingIn.add(key);
  try {
    if (!(await ctx.tickets.validate(user, pass))) return kick(client, t("UserLoginHandler.OverTime"));
    const ch = await findCharacterByUserName(ctx.db.db, user);
    // isFirst (no character / nickname chosen yet) -> "Register"; the API creates it in Login.ashx/VisualizeRegister.
    if (!ch || !ch.NickName) return kick(client, t("UserLoginHandler.Register"));
    if (!ch.IsExist || ch.ForbidDate.getTime() > ctx.now().getTime()) return kick(client, t("UserLoginHandler.Forbid"));
    if (client.closed) return;
    // Single session (LoginMgr.Add / center TryLoginPlayer): the older connection is kicked with "LoginNext".
    const old = ctx.world.get(ch.UserID);
    if (old) {
      old.sink.send(Out.kitoff(t("Game.Server.LoginNext")));
      old.sink.disconnect("logged in elsewhere");
      await quitPlayer(ctx, old);
    }
    const player = await loadPlayer(ctx, client, ch.UserID);
    if (!player) return kick(client, t("UserLoginHandler.Forbid"));
    if (client.closed) {
      await quitPlayer(ctx, player);
      return;
    }
    ctx.log.info(`login ${user} (${player.id}) from ${client.remoteAddress} via ${client.transport.kind}`);
  } catch (err) {
    ctx.log.error("login failed", err);
    kick(client, t("UserLoginHandler.ServerError"));
  } finally {
    ctx.world.loggingIn.delete(key);
  }
}

/** GamePlayer.LoadFromDatabase (GamePlayer.cs:2937) + Login (GamePlayer.cs:3324): loads and sends the login burst. */
async function loadPlayer(ctx: ServerContext, client: GameClient, userId: number): Promise<GamePlayer | null> {
  const db = ctx.db.db;
  const info = await loadPlayerInfo(db, userId);
  if (!info) return null;
  const [match, items, friends, progress] = await Promise.all([
    loadMatchInfo(db, userId),
    loadUserItems(db, userId, ctx.templates.findItem),
    loadFriends(db, userId),
    loadProgress(db, userId),
  ]);
  const p = new GamePlayer(client, info, match, ctx.zoneId, ctx.zoneName, (g) => ctx.templates.levels.get(g) ?? 0);
  if (!ctx.world.add(p)) return null; // WorldMgr.AddPlayer
  client.player = p; // before the burst: the client may answer while we are still sending
  await setOnlineState(db, userId, 1);
  p.friends = friends;
  p.quests = progress.quests.filter((q) => ctx.templates.quests.has(q.QuestID));
  p.achievements = progress.achievements;
  p.records = progress.records;
  p.buffs = progress.buffs;
  p.extra = progress.extra;
  const now = ctx.now();
  p.timeCheckHack = unixSeconds(now);
  info.State = 1;

  // --- LoadFromDatabase
  p.send(Out.inventorySlots(p.id, p.fightBag, [0, 1, 2])); // GamePlayer.cs:2960
  // UpdateItemForUser (GamePlayer.cs:5310): bags in the original order; empty bags send nothing.
  for (const [bag, type] of [
    [p.equipBag, BagType.EquipBag],
    [p.propBag, BagType.PropBag],
    [p.consortiaBag, BagType.Consortia],
    [p.bankBag, BagType.BankBag],
    [p.storeBag, BagType.Store],
  ] as const) bag.loadItems(items.get(type) ?? []);
  // CardBag / pets / farm / avatar collection: TODO (HANDLERS.md).
  if (p.quests.length) p.send(Out.updateQuests(p.id, info.QuestSite.length ? info.QuestSite : new Uint8Array(200), p.quests));
  if (p.records.length) {
    p.send(Out.achievementRecords(228, p.id, p.records));
    p.send(Out.achievementRecords(229, p.id, p.records));
  }
  if (p.achievements.length) p.send(Out.achievementData(p.id, p.achievements));

  // --- Login (GamePlayer.cs:3330-3406)
  if (info.BoxGetDate.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10)) {
    info.AlreadyGetBox = 0;
    info.BoxProgression = 0;
  }
  p.send(Out.loginSuccess(p.view(), p.extra, now));
  p.send(Out.publicPlayer(info, match));
  p.send(Out.weaklessGuild(info));
  p.send(Out.dateTime(now));
  p.send(Out.dailyAward(info.LastAward, now));
  p.showPP = true; // m_playerProp.ViewCurrent() is a no-op the first time, then m_showPP = true
  p.send(Out.userRanks(p.id));
  p.send(Out.openVip(info));
  p.updatePlayerProperties();
  p.send(Out.enthrallLight());
  p.send(Out.avatarCollect());
  p.playerState = 1; // ePlayerState.Manual
  p.send(Out.bufferList(p.id, p.buffs));
  p.send(Out.achievementData(p.id, p.achievements));
  p.send(Out.firstRecharge(!!info.IsRecharged, !!info.IsGetAward));
  p.send(Out.openWorldBoss());
  p.send(Out.leagueNotice(p.id, match.restCount, 0, 2));
  p.send(Out.guildMemberWeek(p.id));
  p.send(Out.necklace(info));
  // WorldMgr.OnPlayerOnline: friends see the online state (160/165).
  for (const f of ctx.world.all()) if (f !== p && f.friends.has(p.id)) f.send(Out.friendState(p.id, 1, info.typeVIP, info.VIPLevel));
  return p;
}

/** GamePlayer.Quit: leave room/lobby, State = 0, save, WorldMgr.RemovePlayer. Idempotent. */
export async function quitPlayer(ctx: ServerContext, p: GamePlayer): Promise<void> {
  if (!p.isActive) return;
  p.isActive = false;
  try {
    if (p.currentRoom) {
      const r = p.currentRoom;
      r.removePlayer(p);
      if (r.IsEmpty) r.stop();
      ctx.rooms.sendUpdateRoom();
    } else ctx.rooms.waitingRemove(p);
  } catch (err) {
    ctx.log.error("quit: room cleanup failed", err);
  }
  p.info.State = 0;
  try {
    await p.saveIntoDatabase(ctx.db.db);
  } catch (err) {
    ctx.log.error(`save on quit failed for ${p.id}`, err);
  } finally {
    ctx.world.remove(p);
  }
  for (const f of ctx.world.all()) if (f.friends.has(p.id)) f.send(Out.friendState(p.id, 0, p.info.typeVIP, p.info.VIPLevel));
}
