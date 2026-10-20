/**
 * LOGIN (code 1): UserLoginHandler.cs + center ALLOW_USER_LOGIN round trip + GamePlayer.Login/LoadFromDatabase,
 * and logout (GamePlayer.Quit, GamePlayer.cs:3780).
 */
import { updateAwardApp } from "../handlers/academia/index.js";
import { hotSpringOnQuit } from "../handlers/termas/index.js";
import { littleGameOnQuit } from "../handlers/minigame-termas/index.js";
import { initFightLabPermission } from "../game/fightlab.js";
import { eventsOnLogin, eventsRuntime } from "../handlers/eventos/agendador.js";
import { eventsOnQuit, worldBossOpen } from "../handlers/eventos/boss-mundial.js";
import { loadUserCardBag, loadUserPets, loadEatPets } from "../db/pets-cards.js";
import { loadAvatarCollection } from "../db/avatar-collection.js";
import { getSession, validateGameLogin } from "@ddt/auth";
import type { ClientKind } from "../game/player-info.js";
import { consortiaOnLogin } from "../handlers/sociedade/index.js";
import { activityOpen } from "../handlers/eventos/agendador.js";
import { sendNoviceActivityOpen } from "../handlers/eventos/novato.js";
import { bumpNoviceActivity, NoviceActiveType } from "../game/novice-activity.js";
import { applyOldPlayerLogin } from "../handlers/eventos/jogador-antigo.js";
import { sendGrowthPackageLoginState } from "../handlers/eventos/passe-classico.js";
import { loadMountData, saveMountData } from "../db/montaria.js";
import { parseMountSkills, parseMountPicCherish } from "../game/montaria.js";
import { findCharacterByUserName, loadMatchInfo, loadPlayerInfo, setOnlineState } from "../db/characters.js";
import { loadUserItems } from "../db/items.js";
import { loadFriends, loadProgress } from "../db/social.js";
import { inviteLoginPacket } from "../handlers/amigos/index.js";
import { decodeDressModelArr } from "../handlers/bolsa/vestir-6600.js";
import { GamePlayer } from "../game/player.js";
import { QuestInventory } from "../game/quests.js";
import { BagType } from "../game/item.js";
import { checkVipExpire } from "../game/vip.js";
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
    // M1 client detection (docs/plan/MIGRACAO-6600.md, research/6600/packets-m1.md): app.LoginSessions.Client
    // was written by Login.ashx from ReqCtx.client (which swf hit /request/ vs /request6600/). Looked up by
    // session row (not by validate()'s boolean) so allowAny/dev logins still pick up a real "6600" row when
    // one exists (tests insert it directly into LoginSessions).
    async clientKindFor(user) {
      const s = await getSession(db, user);
      return (s?.Client as ClientKind | undefined) ?? "41";
    },
  };
}

function kick(client: GameClient, msg: string): void {
  client.send(Out.kitoff(msg));
  client.disconnect(`kick: ${msg}`);
}

/** Espera um login em andamento da mesma conta terminar (burst é longo). */
function waitLoginFree(loggingIn: Set<string>, key: string, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  return new Promise((res) => {
    const tick = () => (loggingIn.has(key) ? (Date.now() > end ? res(false) : setTimeout(tick, 50)) : res(true));
    tick();
  });
}

export async function handleLogin(ctx: ServerContext, client: GameClient): Promise<void> {
  const login = client.pendingLogin;
  client.pendingLogin = null;
  const t = (k: string) => ctx.lang.t(k);
  const user = login?.payload?.user;
  const pass = login?.payload?.password;
  if (!user || pass == null) return kick(client, t("UserLoginHandler.LoginError"));
  const key = user.toLowerCase();
  if (ctx.world.loggingIn.has(key)) {
    // Reconnect/2ª aba durante o burst: espera o 1º terminar em vez de chutar.
    // Quem chega por último vence (single session): o fluxo abaixo chuta a sessão velha.
    if (!(await waitLoginFree(ctx.world.loggingIn, key, 5000))) return kick(client, t("UserLoginHandler.LoginError"));
  }
  ctx.world.loggingIn.add(key);
  try {
    if (!(await ctx.tickets.validate(user, pass))) return kick(client, t("UserLoginHandler.OverTime"));
    const ch = await findCharacterByUserName(ctx.db.db, user);
    // isFirst (no character / nickname chosen yet) -> "Register"; the API creates it in Login.ashx/VisualizeRegister.
    if (!ch || !ch.NickName) return kick(client, t("UserLoginHandler.Register"));
    if (!ch.IsExist || ch.ForbidDate.getTime() > ctx.now().getTime()) return kick(client, t("UserLoginHandler.Forbid"));
    if (client.closed) return;
    // Single session (LoginMgr.Add / center TryLoginPlayer): the older connection is kicked with "LoginNext".
    // The new session only loads after the old one stopped handling packets and saved (no stale-DB item dupe).
    const old = ctx.world.get(ch.UserID);
    if (old) {
      old.sink.send(Out.kitoff(t("Game.Server.LoginNext")));
      old.sink.disconnect("logged in elsewhere");
      await Promise.race([old.sink.idle?.(), new Promise((r) => setTimeout(r, 5000))]);
      await quitPlayer(ctx, old);
    }
    // ch-bus: a sessão antiga pode estar logada em OUTRO canal/processo (mesmo Postgres) em vez deste — pede
    // pros outros canais derrubarem a sessão local deles também (mesmo "LoginNext" acima, só que via barramento;
    // sem REDIS_URL/NoopBus isto resolve na hora, comportamento idêntico a antes desta tarefa).
    await ctx.crossChannel.kick(ch.UserID).catch((e) => ctx.log.warn(`ch-bus kick: ${(e as Error).message}`));
    if (client.closed) return;
    const clientKind = (await ctx.tickets.clientKindFor?.(user)) ?? "41";
    const player = await loadPlayer(ctx, client, ch.UserID, clientKind);
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
async function loadPlayer(ctx: ServerContext, client: GameClient, userId: number, clientKind: ClientKind): Promise<GamePlayer | null> {
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
  p.clientKind = clientKind;
  if (!ctx.world.add(p)) return null; // WorldMgr.AddPlayer
  client.player = p; // before the burst: the client may answer while we are still sending
  await setOnlineState(db, userId, 1, ctx.cfg.SERVER_ID);
  p.friends = friends;
  p.quests = progress.quests.filter((q) => ctx.templates.quests.has(q.QuestID));
  p.gradeForGp = (gp) => ctx.templates.gradeForGp(gp);
  p.lang = (k, ...a) => ctx.lang.t(k, ...(a as never[]));
  p.questInv = new QuestInventory(p, ctx.templates, info.QuestSite ?? new Uint8Array(0));
  p.questInv.load(progress.quests);
  p.achievements = progress.achievements;
  p.records = progress.records;
  p.buffs = progress.buffs;
  p.extra = progress.extra;
  p.noviceProgress = new Map(progress.noviceProgress.map((r) => [r.ActivityType, r]));
  const now = ctx.now();
  // GamePlayer.cs:2969 UpdateLevel() runs on every login (login-time backfill, e.g. a character that reached
  // Grade before this tracking existed, or across a restart): same high-water-mark bump as every other
  // GRADE_UP_ACTIVE call site (addGP), see game/novice-activity.ts header.
  bumpNoviceActivity(p, NoviceActiveType.GRADE_UP, p.info.Grade, false, now);
  p.timeCheckHack = unixSeconds(now);
  info.State = 1;
  // GamePlayer.LoadFromDatabase (GamePlayer.cs:3004): empty fight-lab permission -> "1" + 49 x "0"
  if (!info.FightLabPermission) info.FightLabPermission = initFightLabPermission();
  p.onGradeUp = (old) => { if (p.info.masterID) void updateAwardApp(ctx, p, old).catch((e) => ctx.log.warn(`academy award: ${e}`)); };

  // --- LoadFromDatabase
  p.send(Out.inventorySlots(p.id, p.fightBag, [0, 1, 2], undefined, p.clientKind)); // GamePlayer.cs:2960
  // UpdateItemForUser (GamePlayer.cs:5310): bags in the original order; empty bags send nothing.
  for (const [bag, type] of [
    [p.equipBag, BagType.EquipBag],
    [p.propBag, BagType.PropBag],
    [p.consortiaBag, BagType.Consortia],
    [p.bankBag, BagType.BankBag],
    [p.storeBag, BagType.Store],
  ] as const) bag.loadItems(items.get(type) ?? []);
  // CardBag (equipped cards) and the equipped pet only feed the stats (no card/pet modules yet); farm: TODO.
  p.statTables = ctx.templates.stats;
  // CardInventory / PetInventory.LoadFromDatabase (GamePlayer.LoadFromDatabase); their CommitChanges sends 216 / 68 below
  const [cardRows, petRows, eatPets, avatarRows] = await Promise.all([loadUserCardBag(db, userId), loadUserPets(db, userId), loadEatPets(db, userId), loadAvatarCollection(db, userId)]);
  p.avatarCollect = avatarRows;
  p.cardBag.load(cardRows);
  p.petBag.load(petRows);
  p.petBag.eat = eatPets;
  p.cards = p.cardBag.equipped();
  p.pet = p.petBag.equipped();
  // m4-montaria (6600 only, `PlayerHorse.LoadFromDatabase` -> `CreateHorse` when no row exists yet):
  // 4.1 never gets a Mount_Data row (packet 260 isn't in its enum, same "4.1 inalterado" boundary as 237
  // PLAYER_DRESS/m3-figurino) — must happen before recalcStats() below, which reads p.mount for the level's
  // stat bonus (game/stats.ts).
  if (p.clientKind === "6600") {
    let mount = await loadMountData(db, userId);
    if (!mount) {
      const t0 = ctx.templates.mountTemplate(0);
      mount = await saveMountData(db, { ID: 0, UserID: userId, curUseHorse: 0, curLevel: t0?.Grade ?? 0, curExp: t0?.Experience ?? 0, curHasSkill: "", horsePicCherish: "" });
    }
    p.mount = mount;
    p.mountSkills = parseMountSkills(mount.curHasSkill);
    p.mountPicCherish = parseMountPicCherish(mount.horsePicCherish);
  }
  p.recalcStats(); // FightPower/attributes are part of the login packet
  // m3-figurino: PLAYER_DRESS presets (equipBag already loaded above, needed to validate itemId/templateId pairs).
  p.dressModels = decodeDressModelArr(p, p.extra?.DressModelArr);
  p.currentDressModel = p.extra?.CurentDressModel ?? 0;
  // QuestInventory.LoadFromDatabase -> 178. Sent even when empty: the client's TaskManager only answers with
  // QUEST_ADD (176) for the quests it can accept once its quest data is initialised.
  p.questInv.sendAll();
  // achievement records (228, snapshot types merged in), daily counters, world boss / league / elite state
  await eventsOnLogin(ctx, p).catch((e) => ctx.log.warn(`events login: ${e}`));
  if (p.achievements.length) p.send(Out.achievementData(p.id, p.achievements));

  // --- Login (GamePlayer.cs:3330-3406)
  if (info.BoxGetDate.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10)) {
    info.AlreadyGetBox = 0;
    info.BoxProgression = 0;
  }
  // m3-eventos-b: real "old player" eligibility from DB timestamps, BEFORE any packet that carries `isOld`
  // (loginSuccess below, plus sceneAddPlayer/roomPlayerAdd/addFriend elsewhere) bumps LastDate to `now`.
  applyOldPlayerLogin(ctx, p);
  p.send(Out.loginSuccess(p.view(), p.extra, now));
  p.send(Out.publicPlayer(info, match, p.clientKind, p.magicAttack, p.magicDefence));
  p.send(Out.weaklessGuild(info));
  p.send(Out.dateTime(now));
  p.send(Out.dailyAward(info.LastAward, now));
  p.showPP = true; // m_playerProp.ViewCurrent() is a no-op the first time, then m_showPP = true
  p.send(Out.userRanks(p.id));
  checkVipExpire(info, now); // GamePlayer.ChecVipkExpireDay
  p.send(Out.openVip(info));
  // after SendOpenVIP the original refreshes the pet bag (PetBag.UpdateEatPets); card bag 216 from CardInventory.LoadFromDatabase
  p.flushCards(true);
  p.flushPets(true);
  p.updatePlayerProperties();
  p.send(Out.enthrallLight());
  p.flushAvatarCollect();
  p.playerState = 1; // ePlayerState.Manual
  await consortiaOnLogin(ctx, p).catch((e) => ctx.log.warn(`consortia login: ${e}`)); // guild buffers + 129/26
  p.send(Out.bufferList(p.id, p.buffs));
  p.send(Out.achievementData(p.id, p.achievements));
  // first-recharge gift is a free claim here (no real payments): FIRST_RECHARGE_FREE=false restores the original check
  // 259 collides between 4.1 FIRSTRECHARGE and 6600 CONSUME_RANK (research/6600/packets-m1.md): 6600 gets the
  // "no active rank" shape instead, never the 4.1 layout at the same code.
  p.send(p.clientKind === "6600" ? Out.consumeRankClosed() : Out.firstRecharge(!!info.IsRecharged || process.env.FIRST_RECHARGE_FREE !== "false", !!info.IsGetAward));
  const ev = eventsRuntime(ctx);
  p.send(ev.boss.window ? worldBossOpen(ev, p) : Out.openWorldBoss(p.clientKind));
  if (!ev.leagueOpen) p.send(Out.leagueNotice(p.id, match.restCount, 0, 2));
  // 142 KING_BLESS_MAIN: 6600-only (GamePlayer.cs Login -> Out.SendKingBlessMain, no 4.1 equivalent code at
  // all). Without it KingBlessManager._endTime stays null forever -> TypeError #1009 in getRemainTimeTxt()
  // the first time the hall player-info panel reads it (research/6600/packets-m1.md).
  if (p.clientKind === "6600") p.send(Out.kingBlessClosed());
  // PLAYER_DRESS (237, m3-figurino): GamePlayer.cs:3644 AvatarBag.UpdateInfo() sends both at every login.
  if (p.clientKind === "6600") { p.send(Out.dressModelArr(p.id, p.dressModels)); p.send(Out.currentDressModel(p.id, p.currentDressModel)); }
  // Passe Clássico (84 ACTIVITY_PACKAGE sub-cmd 1, m4-passe-classico, 6600 only — dead client-side on 4.1,
  // SocketManager.as:1032-1035): GamePlayer.cs:3635-3639, only when Server_Config IsPromotePackageOpen is on.
  if (p.clientKind === "6600") await sendGrowthPackageLoginState(ctx, p);
  // 260 HORSE (m4-montaria, 6600 only): `Horse.UpdateHorsePacket()` (GamePlayer.cs:3646, unconditional) sends
  // 1 GET_ALL_DATA + 8 HORSE_PICCHERISH_INFO every login; 2 CHANGE_HORSE only `if (MountsType != 0)`
  // (GamePlayer.cs:3625-3628) — mirrored off `curUseHorse` (always kept equal to MountsType by every writer,
  // see game/montaria.ts header re: the MountsType column gap).
  if (p.clientKind === "6600" && p.mount) {
    p.send(Out.horseInitAllData(p.id, p.mount.curUseHorse, p.mount.curLevel, p.mount.curExp, [...p.mountSkills.values()]));
    p.send(Out.horsePicCherishInfo(p.id, [...p.mountPicCherish.entries()].map(([ID, Active]) => ({ ID, Active }))));
    if (p.mount.curUseHorse !== 0) p.send(Out.horseChange(p.id, p.mount.curUseHorse));
  }
  p.send(Out.guildMemberWeek(p.id));
  sendActivityIcons(ctx, p);
  p.send(Out.necklace(info));
  p.send(await inviteLoginPacket(ctx, p)); // 107/5 INVITE_FRIEND_LOGIN
  // WorldMgr.OnPlayerOnline: friends see the online state (160/165).
  // ChangePlayerState also notifies the members of the same guild (online list of the guild screen)
  for (const f of ctx.world.all()) if (f !== p && (f.friends.has(p.id) || (info.ConsortiaID !== 0 && f.info.ConsortiaID === info.ConsortiaID))) f.send(Out.friendState(p.id, 1, info.typeVIP, info.VIPLevel));
  // ch-bus: mesmo aviso pros amigos/sociedade que estão logados em OUTRO canal (a lista em si já é correta via
  // Postgres compartilhado, IMListLoad.ashx/ConsortiaUsersList.ashx; isto é só o ping imediato de quem já tem
  // a tela de amigos aberta agora).
  ctx.crossChannel.friendState(p.id, 1, info.typeVIP, info.VIPLevel, info.ConsortiaID);
  return p;
}

/** GamePlayer.Quit: leave room/lobby, State = 0, save, WorldMgr.RemovePlayer. Idempotent: concurrent callers share one quit. */
export function quitPlayer(ctx: ServerContext, p: GamePlayer): Promise<void> {
  return (p.quitting ??= doQuit(ctx, p));
}

async function doQuit(ctx: ServerContext, p: GamePlayer): Promise<void> {
  p.isActive = false;
  try {
    if (p.currentRoom) {
      const r = p.currentRoom;
      r.removePlayer(p);
      if (r.IsEmpty) r.stop();
      ctx.rooms.sendUpdateRoom();
    } else ctx.rooms.waitingRemove(p);
    // GamePlayer.Quit (GamePlayer.cs:4428): WorldMgr.NewHallRooms.RemovePlayer(PlayerId) — in practice the
    // 6600 client already sent 262/2 PLAYEREXIT on its way out of StateType.MAIN (StateManager.as:265-268),
    // so this only matters for a hard disconnect from inside the hall itself (no 4.1 client ever registers).
    ctx.newHall.removePlayer(p.id);
    // BaseConsBatRoom.RemovePlayer isn't called from the original's GamePlayer.Quit either — same "the client
    // already left the scene on its way out" reasoning as NewHallRoom above (153/5 DELETE_PLAYER sent on a
    // normal exit); only matters here for a hard disconnect from inside the consortia-battle arena.
    ctx.consBat.removePlayer(p);
    // WorldMgr.CollectionTaskRooms.RemovePlayer(PlayerId) (GamePlayer.cs:4429, m4-coleta) — same reasoning:
    // the client's own 261/4 QUIT on a normal exit already removed them (see collection-task.ts's note on
    // why that path trusts the sender's own id); only matters for a hard disconnect from inside the scene.
    ctx.collectionTask.removePlayer(p.id);
  } catch (err) {
    ctx.log.error("quit: room cleanup failed", err);
  }
  p.info.State = 0;
  eventsOnQuit(ctx, p);
  await hotSpringOnQuit(ctx, p).catch(() => {});
  littleGameOnQuit(ctx, p);
  try {
    await p.saveIntoDatabase(ctx.db.db);
  } catch (err) {
    ctx.log.error(`save on quit failed for ${p.id}`, err);
  } finally {
    ctx.world.remove(p);
  }
  for (const f of ctx.world.all()) if (f.friends.has(p.id) || (p.info.ConsortiaID !== 0 && f.info.ConsortiaID === p.info.ConsortiaID)) f.send(Out.friendState(p.id, 0, p.info.typeVIP, p.info.VIPLevel));
  // ch-bus: mesmo aviso de "ficou offline" pros amigos/sociedade logados em OUTRO canal.
  ctx.crossChannel.friendState(p.id, 0, p.info.typeVIP, p.info.VIPLevel, p.info.ConsortiaID);
}

/** Hall activity icons (PlayerActives.SendEvent :550 + the managers that toggle HallIconManager). Each follows its
 *  scheduler event (enabled flag); EVENTS_ALL_OPEN=true (or the broader ALL_OPEN=true, cfg.ALL_OPEN) opens every
 *  one of them (QA: every icon visible).
 *  Full enumeration of the ~60 `hallIcon.HallIconType` constants (which ones the 4.1 client can actually turn
 *  on, which have no activation path left in this client build at all) is in `research/qa/hall-icons.md`.
 *  Of those, only two were previously dark for a missing SERVER packet rather than a missing client module —
 *  both fixed here: littlegame note (packet 80, `Out.littleGameActived`) and novato/newbie tabs (packet
 *  258/0, `sendNoviceActivityOpen`) — see `research/qa/feature-designs.md`. */
function sendActivityIcons(ctx: ServerContext, p: GamePlayer): void {
  const all = ctx.cfg.ALL_OPEN || process.env.EVENTS_ALL_OPEN === "true";
  const on = (kind: string) => all || activityOpen(ctx, kind);
  // Caminho da luz / Semana da sociedade (design próprio, ver eventos/caminho-da-luz.ts e
  // sociedade/semana-da-sociedade.ts): diferente de `on()`, só abre com uma linha admin EXPLÍCITA
  // (`app."ScheduledEvents"` kind "lightroad"/"guildmemberweek") ou `EVENTS_ALL_OPEN=true` — sem linha
  // nenhuma fica fechado por padrão (ao contrário do resto de `isOpen`, que abre sem config; aqui isso
  // mandaria 2 pacotes 145 extras pra todo login sem o dono ter pedido).
  const explicit = (kind: string) => eventsRuntime(ctx).scheduler.events.some((e) => e.kind === kind && e.enabled !== false);
  const end = new Date(Date.now() + 7 * 864e5);
  const fmt = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
  if (on("chickenbox")) p.send(Out.chickenBoxOpen(p.id, [100, 200, 300, 500, 800], [50, 100, 150, 250, 400], 500, end));
  if (on("luckystar")) p.send(Out.luckStarOpen(p.id));
  if (all || explicit("lightroad")) p.send(Out.lightRoadOpen(p.id, true));
  if (all || explicit("guildmemberweek")) p.send(Out.guildMemberWeekOpen(p.id, fmt(new Date()), fmt(end)));
  if (all) p.send(Out.leftGunRouletteOpen(p.id, true, p.clientKind));
  // littlegamenote (termas/minigame-termas): real feature has no hour-based schedule yet (mgr.ts note), so
  // this is QA-only (ALL_OPEN) rather than routed through littleGameMgr(ctx) -- avoids spinning up the Bogu
  // world/timers for every login when the feature is untouched.
  if (all) p.send(Out.littleGameActived(p.id, true));
  // novato/newbie activity tabs (LIMITACTIVITY): default-open like chickenbox/luckystar above, not an
  // ALL_OPEN-only QA reveal -- the feature itself was always there (claim handler in novato.ts), it just
  // never sent the 258/0 packet the client needs to compute checkTime()==true.
  if (on("novato")) sendNoviceActivityOpen(p, ctx.now());
}
