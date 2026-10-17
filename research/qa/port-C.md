# Port C — Eventos/Atividades

Status at start of this pass: `handlers/activities.ts` (608 lines) and `handlers/events.ts`
(706 lines) already existed from a prior session, fully implementing most of the block
(chicken box, lucky star, caddy/lottery, labyrinth, battleground/league stats, novice
activity, world boss, daily/sign/VIP/accumulative-login awards, achievements, elite game).
This pass closed the remaining gap (84 ACTIVITY_PACKAGE / chick activation, 166
LITTLEGAME_COMMAND), re-verified the codes documented as "dead in the original" by tracing
the AS3 call sites against the C# handler, and added tests.

## Per code

- **ACTIVITY_PACKAGE (84)** — was MISSING. FIXED: ported the one real sub-feature,
  `ChickActivationType.CHICKACTIVATION` ("Code Ga Hanh" / rooster-code activation) —
  `ActivityPackageHandler.cs:135-277`. Everything else in that handler (GROWTHPACKAGE,
  MagicHouse, Zodiac, AnotherDimension, LoginDevice, the lottery-ticket pool,
  PvePowerBuff, SignBuffFightPower) is commented-out in the original's own source —
  confirmed dead, not ported, documented in the module header. Implemented in
  `activities.ts`: `activityPackageHandler()` + `loadChickActive`/`saveChickActive`
  (persisted in `Sys_Active_System_Data.ChickActiveData`, same column as the original,
  CSV packed the same 7 fields, ISO timestamps instead of locale strings since nothing
  else reads it back) + `chickReplyPkt`/`chickStatusInts` (byte-for-byte 12-int status
  row both CHICKACTIVATION_LOGIN and _UPDATE share) + `mailChickAward` (rewards always
  go by mail, matching `WorldEventMgr.SendItemsToMails` — never into the bag).
  Reward rows (`ActivitySystemItemInfo` ActivityType 40) and the activation-code table
  (`PlayerBussiness.ActiveChickCode`) were never migrated from the .bak — same gap
  as chickenbox/luckystar's reward pools — so both are admin-configurable via
  `app."ScheduledEvents"` (kind `"chickactivation"`, `params.pools[quality]` /
  `params.codes`), with a built-in default code (`DDTANKREBORN01`) and small default
  reward pools so the feature works unconfigured. A code is consumed exactly once,
  globally, via `claimOnce`. Registered `partial` (reward pool defaults are placeholders,
  not the original's real item list, since that list no longer exists anywhere in this
  repo). Tests added in `activities.test.ts` (wrong code -> NotExit, default code opens
  once then a reuse gets IsUsed, GETAWARD before opening refuses NotActive, GETAWARD
  after opening mails the daily reward instead of bagging it).
  **Gap outside this block's files**: the hall icon's visibility gate
  (`ServerConfigManager.chickActivationIsOpen`, server-config key
  `ISCHICKENACTIVEKEYOPEN`) is served by `serverconfig.ashx`'s apps/api equivalent,
  which doesn't exist yet (only the admin-side `applyServerConfig` does, in
  `apps/api/src/routes/admin.ts`) — outside `handlers/activities.ts`/`events.ts`, not
  fixed here. The packet handler itself works regardless of how the icon is shown.

- **NEWCHICKENBOX_SYS all subs (87)** — DONE (`partial`, pre-existing). Covers
  ENTERCHICKENVIEW(10)/USEEAGLEEYE(11)/AllITEMSHOW(12)/TAKEOVERCARD(13)/
  FLUSHCHICKENVIEW(14)/CLICKSTARTBNT(15) and Lucky Star's ENTER_GAME(31)/CLOSE_GAME(32)/
  START_TURN(33)/TURN_COMPLETE(34). Reward pools configured via `ScheduledEvents` kind
  `"chickenbox"`/`"luckystar"` with built-in defaults (same pattern reused for 84 above).

- **LEFT_GUN_ROULETTE (137) + SOCKET(128)/COMPLETTE(130)** — DONE, pre-existing,
  verified this pass. 128/130 are real handlers in the original (`LeftGunHandler.cs`,
  `LeftGunCompleteHandler.cs` — NOT dead code, despite a stale note in this file's own
  header comment claiming otherwise; corrected) and are ported in `handlers/items.ts`
  (shared file, not touched here, confirmed working: weighted roll from
  `GameProperties.LeftRouterRateData`, persisted in `Sys_Users_Extra`, broadcasts the
  system-tip notice). 137's hall-icon OPEN packet (`Out.leftGunRouletteOpen`) is sent
  at login from `session/login.ts` (read-only file, not touched).

- **GUILDMEMBERWEEK_SYSTEM / LIGHTROAD_SYSTEM / ACTIVITY_SYSTEM (145, same wire code,
  3 client-side aliases)** — confirmed DEAD in the original server, re-verified this
  pass by tracing every AS3 call site: `GameSocketOut.as` `sendLightRoadStarEnter`/
  `sendGuildMemberWeekStarEnter`/`sendGuildMemberWeekStarClose` all write byte
  `ENTER_GAME`/`CLOSE` to packet 145, but `ActiveSystemHandler.cs` (the only
  `[PacketHandler]` registered on that opcode) only matches `byte == 8`
  (GuildMemberWeek's `PLAYERTOP10`) — and even then builds the reply packet and never
  calls `SendTCP`, so it's a no-op either way. No real gameplay was ever wired
  server-side for either feature in 4.1. Left unregistered (matches the original
  exactly: no server response to any sub-byte). The hall icons still open a real
  window client-side, populated from the OPEN packets already sent at login
  (`Out.lightRoadOpen`/`Out.guildMemberWeekOpen`, pre-existing, wired in
  `session/login.ts` under `EVENTS_ALL_OPEN`) — decorative countdown/chrome only,
  faithful to the original's own incomplete feature.

- **WORLDBOSS_CMD (102)** — DONE (`partial`, pre-existing). `worldBossCmd()` in
  `events.ts` covers EnterRoom(32)/AddPlayer(34)/LeaveRoom(33)/Move(35)/Status(36)/
  RequestRevive(37)/BuyBuff(38); `worldBossDamage`/`finishWorldBoss` handle the fight
  + ranking-reward payout (admin-configurable `rankAwards`, claimed once per window).

- **LITTLEGAME_COMMAND (166)** — BLOCKED this pass; registered as a no-op `stub`
  (`littleGameStub()`), matching this repo's existing convention for scoped-out
  features (`items.ts`'s `USE_CONSORTIA_REWORK_NAME`/`USE_CHANGE_COLOR_SHELL`).
  `LittleGameHandler.cs` forwards every packet to `client.Player.LittleGame`, a full
  real-time server simulation under `Game.Server/LittleGame/**` (~30 C# files: AStar
  pathing, a tick-based `Bogu` creature spawner/mover, per-type click-to-catch
  scoring, its own packet queue/scheduler) — the hot spring's fishing/catching
  mini-game. No client-visible shortcut exists; this is its own subsystem, not a
  single handler. Out of this block's budget. Follow-up: a dedicated
  `handlers/event-littlegame.ts` (naming already reserved per `AGENTS.md`), owned by
  whichever block picks it up next — nothing in this pass blocks it, no shared file
  was touched beyond the one `r.player(166, ...)` registration line. Packet 80
  (`LITTLEGAME_ACTIVED`, the hall-icon open/close boolean) is likewise not sent
  anywhere yet, so the icon stays hidden by default — honest (closed) rather than a
  fake "open" window that does nothing.

- **NOVICEACTIVITY (258)** — DONE (`partial`, pre-existing). Simplified to a
  Grade-gate against `Event_Reward_Info.Condition` (documented in the module header
  as a deliberate simplification vs. the original's per-ActivityType PlayerExtra
  condition counters, which this port hasn't built).

## Checks run

- `npx tsc --noEmit -p apps/game` — clean.
- `npx vitest run` (apps/game, full suite) — green before and after this pass's
  changes (12/12 in `activities.test.ts` including the 3 new ChickActivation cases).
- No migration needed: `Sys_Active_System_Data` (incl. `ChickActiveData`) already
  existed in `packages/db/src/schema/player.ts`.

## Files touched

- `apps/game/src/handlers/activities.ts` — added ACTIVITY_PACKAGE/ChickActivation
  (84) + LITTLEGAME_COMMAND (166) stub + 2 registry lines.
- `apps/game/test/activities.test.ts` — added 3 ChickActivation tests.
- No changes to shared files (`packets/out.ts`, `handlers/index.ts` already had the
  registration for `activities.ts`; `db/templates.ts` untouched — no new loader needed).
