# 02 — Bots and AI

Inventory of every AI/bot mechanism in DDTank41 (+ donor), then the design for our port.
Paths relative to `vendor/DDTank41/` unless noted. Engine details: [00-fight-engine.md](00-fight-engine.md); PvE scripts: [01-pve.md](01-pve.md).

## 1. Existing mechanisms

### 1.1 NPC / boss AI (PvE)
Per-living `ABrain` script (`Game.Logic/AI/ABrain.cs`) selected by `NPC_Info.Script`, instantiated in `SimpleNpc`/`SimpleBoss`
constructors (`Phy/Object/SimpleNpc.cs:35-49`, `SimpleBoss.cs:72-86`). Hooks and API: 01-pve.md §3.
Typical pattern (donor `AI/NPC/SimpleNpcAi.cs`): `OnStartAttacking` → target = `Game.FindNearestPlayer(Body.X, Body.Y)`;
if distance ≤ ~97 → `Body.Beat(...)`, else `MoveTo(± random(MoveMin..MoveMax))` with callback `MoveBeat`/`Jump`/`Fall`;
ranged NPCs use `Body.ShootPoint(target.X, target.Y, ballId, minTime, maxTime, bombCount, time, delay)`.
Bosses chain attacks with a state counter (`m_state`) and `CallFuction(cb, delayMs)` (donor `AI/NPC/FiveHardFirstBoss.cs`).
NPC "chat": `IsSay` set randomly by `PVEGame.ConfigLivingSayRule` (`PVEGame.cs:1323-1354`), lines from `NpcStatementsMgr`.

### 1.2 Server-side aim solver (used by NPCs and bots)
`Living.GetShootForceAndAngle(ref x, ref y, ballId, minTime, maxTime, bombCount, time, ref force, ref angle)` (`Game.Logic/Living.cs:1019-1060`):
```
if minTime >= maxTime → return (no change)
P = GetShootPoint()      // NPC: (X ∓ FireX, Y + FireY) by direction; player: (X ± (−rect.X + 30), Y + rect.Y − 20)   Living.cs:1062-1065
dx = x − P.x ; dy = y − P.y
af = map.airResistance · ball.DragIndex ; fy = map.gravity · ball.Weight · ball.Mass ; fx = map.wind · ball.Wind ; m = ball.Mass
for t = time; t <= 4; t += 0.6:
    vx = (dx − fx/m·t²/2)/t + (af/m)·dx·0.7          // ComputeVx  Living.cs:825-828
    vy = (dy − fy/m·t²/2)/t + (af/m)·dy·1.3          // ComputeVy  Living.cs:830-833
    if vy < 0 && vx·direction > 0 && |v| < 2000:  force = (int)|v| ; angle = (int)deg(atan(vy/vx)) (+180 if vx<0) ; break
x, y = P   // the shot then starts from the muzzle point
```
This is an analytic drag-free approximation with empirical 0.7/1.3 drag fudge — "time" is the flight time guess
(1.0 … 4.0 s). It is deliberately imprecise; NPC accuracy also comes from `time`. Called by `LivingShootAction`
(`Actions/LivingShootAction.cs`; for players only when `minTime==1001 && maxTime==10001`) and `BotShootAction`.
Client force cap: `Player.FORCE_MAX = 2000` (`Source Flash/src/game/model/Player.as:44`).

### 1.3 PvP "AutoBot" / VirtualPlayer (arena match filler) — the only real PvP bot
Flow for `RoomType Match` rooms:
1. Game server, on start of a Match room with `GameStyle==0`, not cross-zone, with a host: `room.PickUpNpcId = RingStationConfiguration.NextRoomId()` (`Game.Server/Rooms/StartGameAction.cs:74-80`) and sends the room to the fight server (`FightServerConnector` `:644` writes `PickUpNpcId`; fight server reads `npcId, pickUpWithNPC, isBot, …` in `Fighting.Server/ServerClient.cs:199-207`).
2. Fight server matchmaker every 5 s (`PICK_UP_INTERVAL`, `Fighting.Server/Rooms/ProxyRoomMgr.cs:19,82-86`): after **4 failed pick-ups (~20 s)** for a non-guild Match room with `NpcId > 0`, it sets `startWithNpc` and asks the game server to create bots: `SendBeginFightNpc(selfId, roomType, gameType, npcId, playerCount)` (`ProxyRoomMgr.cs:214-219`).
3. Game server `HandleFightNPC` → `RingStationMgr.CreateAutoBot(player, roomType, gameType, npcId, playerCount)` (`Game.Server/Battle/FightServerConnector.cs:428-445`).
4. `CreateAutoBot` (`Game.Server/RingStation/RingStationMgr.cs:1003-1047`) builds `playerCount` `VirtualGamePlayer`s in a `BaseRoomRingStation{IsAutoBot=true}` and registers that room on the fight server through a dedicated loopback connection (`RingStationBattleServer`, `RingStationMgr.cs:55-110`, uses battle server #4):
   - **Name**: `GameProperties.VirtualName` CSV (default `"Doreamon,Nobita,Xuneo,Xuka"`, `Bussiness/GameProperties.cs:134`) random pick + `npcId` + index → e.g. `Nobita12345670`.
   - **Level/stats mirror the human** (the room host): `GP, Grade, Agility, FightPower` equal; `Attack, Defence, BaseAttack, BaseDefence ×4/8`; `Luck ×2/8`; `hp, BaseBlood ×2/8`; weapon strengthen = host main weapon's.
   - **Look**: random entry of `m_vplayers` built in `SetupVirtualPlayer` (`RingStationMgr.cs:728-949`) from hard-coded template arrays (weapon 7008; heads 1142/1214; glasses 2104/2204; hair 3158/3244; effect 4101/4201; cloth 5104/5207; face 6101/6202; wing 15001) → style string `"{head}|{pic},{glass}|…,{weapon}|…,,{wing}|…,,,,,,,,,"`, `Colors=",,,,,,,,,,,,,,,"`, `Hide=1111111111`.
   - Variants: `GetAutoBot` (exact copy of player stats, `:1049-1099`), `CreateBaseAutoBot` (fixed grade 5 newbie bot, `:1101-1142`), `CreateRingStationChallenge` (RingStation/"arena ladder" opponent from `UserRingStationInfo`, `:957-1001`).
5. Matchmaker then pairs the waiting human room with the bot room having the same `NpcId` (`ProxyRoomMgr.cs:220-243`; `StartWithNpcUnsafe` `:348-360`). After 3 failures it gives up `startWithNpc`. Bot rooms that stay idle are reaped (`PickUpCount < -1`, `ClearAutoBotRooms` `:303-325`).
6. In game, `VirtualGamePlayer` (`Game.Server/RingStation/VirtualGamePlayer.cs`) is a client stub: it receives GAME_CMD packets from the fight server; on `TURN` where `pkg.Parameter1 == GamePlayerId` it calls `FindTarget()` which just sends **`BOT_COMMAND (143)`** (`VirtualGamePlayer.cs:215-218, 383-391`). Loading: `SendLoadingComplete(100)` immediately for bot rooms (`RingStation/Actions/PlayerLoadingAction.cs:16`). Old client-side aiming code (ComputeVx loop with `af=2, f=7000, m=10`, prop usage, stunt) is commented out (`VirtualGamePlayer.cs:290-380`).
7. Fight-server handler `BotCommand` (`Game.Logic/Cmd/BotCommand.cs:16-276`) plays the turn **server-side**:
   - target = random living enemy; 1/3 chance to chat a taunt indexed by the target's `TotalShootCount` (two hard-coded Vietnamese lists, lines 32-57).
   - face target (`ChangeDirection(±1, 500)`).
   - Distance > 60 px: 1/3 → single shot at target (½ exact, ½ `target.X + rand(1..2)·rand(-10..19)`); else if target is 200–800 px to the left: 50% single shot ±(1..4)·(−10..19) px, 50% props **10001+10003+10004** with 3 shots; else if > 900 px and `TurnNum ≥ 2`: props 10016 (fly) + 10010, aim 300 px in front of target, 100 px above; else props 10001+10004+10004, 3 shots.
   - Distance ≤ 60: 1/4 (turn ≥ 2) fly away 600 px with 10016+10010; else shot at target ±.
   - Flight-time guess by |Δx|: <200 → 1.0 s, <400 → 1.5, <700 → 2.0, <1000 → 2.5, <1100 → 3.0, else 3.5; (≤60 px fly-away → 4.0).
   - Props are used via `CallFuction(UseItem, 1000/1500/2000 ms)`; shots `ShootPoint(d, e, CurrentBall.ID, 1001, 10001, boomcount, time, 3000)` at 2500 ms (the 1001/10001 magic makes `LivingShootAction` run the aim solver for a Player); `StopAttacking` at 3000 ms; rebroadcasts `BOT_COMMAND` so clients know.
   - The bot never uses STUNT, pet skills or healing; accuracy error only from the solver approximation and the random X offsets.
8. Results: the bot is a normal `Player` in `PVPGame` — the human gets normal Match rewards (exp, prestige…) for beating it.

### 1.4 Lobby robots (fake online players / rooms) — disabled
`Game.Server/Managers/RobotManager.cs` + `GameObjects/RobotGamePlayer.cs` + `RobotWaiting/{Robot,RobotRoom,Equip}.cs`: creates `RobotGamePlayer` (`IsAutoBot = true`, negative ids from −1 000 000) with random English names (hard-coded list), level 1–14, random GP, equips (`EquipBot`), adds them to `WorldMgr` and the waiting room, and can create fake waiting rooms ("DDTank NEWGUN", types 0/4). Both loops use `countBot = 0` / `countRoom = 0` (`RobotManager.cs:1043, 1117`) → **inactive**. `GameServer.cs:1389` still calls `RobotManager.Init()`.

### 1.5 Other
- `GAME_TRUSTEESHIP (149)` "auto-play when AFK" exists in the protocol but the handler only echoes `false` (`Cmd/GameTrusteeshipCommand.cs`).
- `FireCommand.aimUsers` auto-aim backdoor for listed usernames (empty) (`Cmd/FireCommand.cs:11-55`) — remove.
- `Living.AutoBoot` flag forces `VaneOpen` (wind) for bot players (`Player.cs:433-440`).
- `NpcPlayerInfo` (`SqlDataProvider/Data/NpcPlayerInfo.cs`: Grade, MainWeapon, Hat, Cloth, …, Win, Total, strengthen/compose per slot) is defined but unused — a leftover "NPC player" profile model; good template for our bot profile table.
- `eGameType.matchNpc` (`eGameType.cs:22`) unused.
- Donor `DDTank4.1` has the same RingStation/ProxyRoom bot code (`Source Server/Game.Server/Server/RingStation/*`, `Fighting.Server/Rooms/ProxyRoomMgr.cs`); nothing new.

## 2. Design for our port

### 2.1 Goals
1. Fill PvP Match queue after a configurable wait (keeps the 20 s behaviour by default) — "arena bot".
2. Explicit "vs bot" mode from a normal Freedom room: host adds bot slots (client-compatible: bots appear as normal players in the room list).
3. PvE helpers (optional): bots joining dungeons as teammates.
4. Admin-editable bot profiles: name, level, look/equipment, stats scaling, difficulty, chat lines.
5. Fair and deterministic (seeded RNG); never cheat on information the human couldn't see except wind (which is visible anyway).

### 2.2 Architecture
- `BotPlayer implements IGamePlayer` living entirely server-side (no socket). It owns a fake `PlayerInfo` built from a profile; `SendTCP` is a no-op except a small inbox that triggers `onTurn()` when a `TURN` with its living id arrives (mirrors `VirtualGamePlayer.NextTurn`).
- `BotController.onTurn(game, player)` runs as a game `IAction` sequence (same as `BotCommand`): think delay → optional move → props → aim → fire → stop. All through the same public methods humans use (`Player.UseItem`, `Player.Shoot`, `SetXY`), so damage/delay rules are identical.
- Matchmaker (`apps/game/src/match/`): after `bot_settings.match_fill_after_ms` (default 20000 = 4×5 s) with no opponent, spawn `n = room.playerCount` bots from profiles whose level band contains the room avg level; flag the game `has_bots` (stats/achievements can exclude it).

### 2.3 Aiming: exact simulation + difficulty error
Replace the analytic solver for bots (keep the C# solver for NPC `ShootPoint` to stay faithful to scripts):
```
solve(target, ball, map, wind):
  for angle in candidateAngles(direction)            // 0..90 mirrored by direction, step 1°; prefer 30–70° lobs, also 0–20° flat for close range
     binary-search force ∈ [0, 2000] using simulateShot(muzzle, angle, force) (the real SimpleBomb integrator, dt 0.04, swept 3 px,
         terrain + bodies) → landing point/hit target; objective = distance(impact, target damage rect); obstacle hits rejected
  pick min objective (tie → shortest flight time); returns {angle, force, expectedImpact, flightTime}
```
Cost: ~90 angles × ~12 force iterations × ≤ 100 steps = ~1e5 steps → < 5 ms in Node; cache per (map version, wind, from, to).
Difficulty model (profile field `difficulty` 0–100, plus per-skill overrides):

| Param | Easy (20) | Normal (50) | Hard (80) | Expert (100) |
|---|---|---|---|---|
| force error σ (abs, units of force) | 120 | 60 | 25 | 0 |
| angle error σ (deg) | 4 | 2 | 1 | 0 |
| wind misread (fraction of wind ignored) | 0.5 | 0.25 | 0.1 | 0 |
| target choice | random | nearest | lowest HP | lowest HP / best splash |
| props per turn (energy permitting) | 0–1 | 1–2 | 2–3 (e.g. 10001+10004) | optimal |
| uses STUNT at dander 200 | 30% | 70% | 100% | 100% |
| moves for better line / dodges holes | no | sometimes | yes | yes |
| think time before fire (ms) | 3000–6000 | 2000–4000 | 1500–3000 | 1000–2000 |

Error is applied as `force += N(0,σf)`, `angle += N(0,σa)`, `wind' = wind·(1−misread)` before solving; clamp force ≤ 2000. Turn must finish before `turnTime` (`BaseGame.getTurnTime`), so total scheduled delays ≤ turnTime − 2 s. Use `FIRE_TAG(96)` semantics (`PrepareShoot(seconds)`) so delay accounting equals a human taking that long.

### 2.4 DB tables (packages/db, Drizzle; editable in apps/admin)

```
bot_profile
  id serial pk, name varchar(32) not null            -- shown nickname (unique per active game; suffix if clash)
  name_pool_id int null → bot_name_pool              -- if set, pick a random name from the pool instead
  enabled bool default true, weight int default 1    -- selection weight
  level_min int, level_max int                       -- eligible host/room avg level band (1..60)
  grade_mode enum('fixed','mirror') , grade int null  -- fixed level or copy room avg
  sex bool, style varchar(512) null, colors varchar(256) null, skin varchar(32) null, hide int default 1111111111
  weapon_template_id int, weapon_strengthen int default 0, second_weapon_template_id int null
  equip jsonb  -- [{slot, templateId, strengthen, compose}]  (see NpcPlayerInfo fields)
  stat_mode enum('fixed','mirror_scaled')
  attack int, defence int, agility int, luck int, hp int, base_attack int, base_defence int   -- used when fixed
  scale_attack numeric default 0.5, scale_defence numeric 0.5, scale_luck numeric 0.25, scale_hp numeric 0.25  -- mirror_scaled (C# defaults)
  difficulty smallint default 50, aim_force_sigma int null, aim_angle_sigma numeric null, wind_misread numeric null
  allowed_props int[] default '{10001,10003,10004,10008,10010,10016}', use_stunt_pct smallint
  chat_profile_id int null → bot_chat_profile, chat_pct smallint default 33
  modes text[] default '{match_fill,vs_bot}'          -- where it can be used
  created_at, updated_at, updated_by
bot_name_pool(id, name varchar(64), names text[])
bot_chat_profile(id, name, on_turn text[], on_hit text[], on_miss text[], on_kill text[], on_die text[], locale varchar(8) default 'pt-BR')
bot_settings (singleton): match_fill_enabled bool, match_fill_after_ms int default 20000, max_bot_games int, exclude_from_rank bool default false,
                          rewards_multiplier numeric default 1.0
bot_game_log(id, game_id, bot_profile_id, human_user_ids int[], won bool, shots int, hits int, created_at)   -- tuning/analytics
```
Admin panel: CRUD profiles with live preview of the avatar (style string → Ruffle avatar or static compositing), a "test aim" tool (pick map/wind/positions, show solved trajectory), name pools, chat lines (PT-BR default), global settings.
Seed: one profile per original behaviour (`mirror_scaled` with the C# 4/8, 2/8 factors and the 8 hard-coded look items), names from `GameProperties.VirtualName`.

### 2.5 Identity & protocol compatibility
- Bot ids: negative user ids (as `RobotManager`, from −1 000 000) so they never collide with `Sys_Users_Detail.UserID`; never persisted to player tables; `IsAutoBot=true` in `PlayerInfo`.
- Bots appear in `GAME_CREATE`/`START_GAME` like players (all fields filled from profile; `ZoneId/ZoneName` = server's).
- Card flips/rewards for bots are skipped; humans get normal rewards × `rewards_multiplier`.
- Optional: send `BOT_COMMAND(143)` broadcast at bot turn start like the original (client tolerates it).
