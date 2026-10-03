# 00 — Fight engine (BaseGame / PVPGame / PVEGame)

Porting spec for `apps/game` combat. Source of truth: `vendor/DDTank41` (`Game.Logic`, `Fighting.Server`, parts of `Game.Server`).
All paths below are relative to `vendor/DDTank41/` unless prefixed. Every formula cites `file:line`.

Related:
- [00a-tankcmd-table.md](00a-tankcmd-table.md) — generated table of every `eTankCmdType` sub-command (C→S reads, S→C writes).
- [01-pve.md](01-pve.md) — missions, scripting API. [02-bots.md](02-bots.md) — AI/bots.
- `research/protocol-excerpts/ddtank-physics.txt` — raw physics excerpts incl. the AS3 client side.

> The Flash client is fixed: it re-simulates every projectile from the `(x, y, vx, vy, ballId)` the server sends and plays the
> server-supplied `BombAction` timeline. Our server **must** produce bit-compatible integers (same float→int truncation, same
> 0.04 s step, same 1-bit terrain) or the client will draw shells landing in a different place than the server-computed damage.

---

## 1. Runtime model

### 1.1 Threads, ticks, actions

| Item | Value | Source |
|---|---|---|
| Game loop interval | 40 ms (`THREAD_INTERVAL = 40L`), single thread updates all games | `Game.Server/Games/GameMgr.cs:33`, `Fighting.Server/Games/GameMgr.cs:280` |
| Tick clock | `Stopwatch` ms (`TickHelper.GetTickCount()`) | `Game.Logic/TickHelper.cs:9` |
| Per-tick work | `BaseGame.Update(tick)`: if `m_passTick >= tick` skip (paused); `m_lifeTime++`; clone+clear action list; run every `IAction.Execute(game,tick)`; re-queue unfinished; **if there were no actions and `m_waitTimer < tick` → `CheckState(0)`** | `Game.Logic/BaseGame.cs:3174-3216` |
| `WaitTime(ms)` | `m_waitTimer = max(m_waitTimer, now+ms)` — blocks the state machine (not actions) | `BaseGame.cs:3239` |
| `Pause(ms)` | blocks everything (`m_passTick`) | `BaseGame.cs:3813` |
| `BaseAction(delay, finishDelay)` | executes once at `now+delay`, finishes `finishDelay` ms after executing | `Game.Logic/Actions/BaseAction.cs:11-28` |

Everything time-based in combat (movies, NPC moves, delayed damage, `CallFuction`) is an `IAction` with a delay in ms.
Port: keep one `ActionQueue` per game, drained every 40 ms; never use `setTimeout` per action (ordering matters: actions
queued in the same tick run in insertion order).

### 1.2 Class hierarchy (port 1:1 as TS classes)

```
AbstractGame (id, roomType, gameType, timeType, events GameStarted/GameStopped)     Game.Logic/AbstractGame.cs
 └ BaseGame  (map, players, turnQueue, livings, actions, wind, boxes, Send*)        Game.Logic/BaseGame.cs
    ├ PVPGame (red/blue teams, rewards)                                              Game.Logic/PVPGame.cs
    │  └ BattleGame (fight-server matched game, ProxyRoom red/blue)                  Fighting.Server/Games/BattleGame.cs
    └ PVEGame (PveInfo, missions/sessions, mission AI, cards)                        Game.Logic/PVEGame.cs
Physics (id, rect, x,y, isLiving, isMoving)                                          Game.Logic/Phy/Object/Physics.cs
 ├ BombObject → SimpleBomb (projectile)                                              Phy/Object/BombObject.cs, SimpleBomb.cs
 ├ PhysicalObj → Box, Ball, Layer, LayerTop, TransmissionGate, Board                 Phy/Object/*.cs
 └ Living (stats, effects, actions)                                                  Game.Logic/Living.cs
    ├ SimpleNpc (no turn of its own; acts in the "NPC phase")                        Phy/Object/SimpleNpc.cs
    └ TurnedLiving (delay, dander, petMP, psychic)                                   Phy/Object/TurnedLiving.cs
       ├ Player (IGamePlayer wrapper)                                                Phy/Object/Player.cs
       ├ SimpleBoss (own turn, children)                                             Phy/Object/SimpleBoss.cs
       └ SimpleWingBoss                                                               Phy/Object/SimpleWingBoss.cs
```

`IGamePlayer` (`Game.Logic/IGamePlayer.cs`) is the seam between combat and the lobby player (`Game.Server/GamePlayer.cs`
locally, `Fighting.Server/GameObjects/ProxyPlayer.cs` on the fight server, `Game.Server/RingStation/VirtualGamePlayer.cs`
for bots). Our port should define the same interface so bots can be plugged in (see 02-bots.md).

### 1.3 Where games run

- **Local games** (`Game.Server/Games/GameMgr.cs:140,167`): PvE (`StartPVEGame`) and non-matched PvP (`Freedom` rooms etc.).
- **Fight server** (`Fighting.Server`): `Match` room type (auto-match "Arena"/guild battles) — rooms are proxied
  (`Fighting.Server/Rooms/ProxyRoomMgr.cs`), matched every 5 s, then `GameMgr.StartBattleGame` (`Fighting.Server/Games/GameMgr.cs:198`).
  Note `StartMatchGame` always uses `timeType = 2` and a random map (`ProxyRoomMgr.cs:329-336`).
- Our port: one process, the "fight server" becomes an in-process matchmaker module. Keep the room/game separation.

---

## 2. Game lifecycle

### 2.1 States (`Game.Logic/eGameState.cs`)

`Inited(0) Prepared(1) Loading(2) GameStartMovie(3) GameStart(4) Playing(5) GameOverMovie(6) PrepareGameOver(7) GameOver(8) TryAgain(9) Stopped(10) SessionPrepared(11) ALLSessionStopped(12) Waiting(13)`

### 2.2 PvP state machine — `CheckPVPGameStateAction` (`Game.Logic/Actions/CheckPVPGameStateAction.cs:19-65`)

| State | Condition | Call | Effect |
|---|---|---|---|
| Inited | — | `PVPGame.Prepare()` `PVPGame.cs:637` | send `GAME_CREATE(101)`; → Prepared; CheckState |
| Prepared | — | `StartLoading()` `PVPGame.cs:842` | send `GAME_LOAD(103)` maxTime=60; send wind pictures (`WIND_PIC 241` ×11); add `WaitPlayerLoadingAction(61000)`; → Loading |
| Loading | `IsAllComplete()` (all `LoadingProcess >= 100`, `BaseGame.cs:1629`) | `StartGame()` `PVPGame.cs:771` | → Playing; `SYNC_LIFETIME(131)`; spawn players at random map points; send `START_GAME(99)`; viewers die; wind pics; `WaitTime(players*1000)` |
| Loading | 61 s timeout | `WaitPlayerLoadingAction` `Actions/WaitPlayerLoadingAction.cs:24` | kick every player with `LoadingProcess < 100` |
| Playing | current player not attacking | `TurnIndex >= 100 && RoomType==Match` → `GameOver()`; else `CanGameOver()` (one team fully dead, `PVPGame.cs:301`) → `GameOver()`; else `NextTurn()` | |
| GameOver | — | `Stop()` `PVPGame.cs:854` | auto-take remaining cards; clear players; `OnGameStopped` |

`GameOver()` sets `WaitTime(20000)` (`PVPGame.cs:559`) → the 20 s card-flip window before `Stop`.

### 2.3 PvE state machine — `CheckPVEGameStateAction` (`Game.Logic/Actions/CheckPVEGameStateAction.cs:15-141`)

Additionally gated by `game.GetWaitTimer() >= tick` (line 17). Full table in [01-pve.md §2](01-pve.md#2-pve-lifecycle).

### 2.4 Loading packets

- `GAME_CREATE(101)` — `BaseGame.SendCreateGame` `BaseGame.cs:2037-2144`: `i32 roomType, i32 gameType, i32 timeType, i32 n` then per player:
  `i32 zoneId, str zoneName, i32 userId, str nick, bool false(isViewer), u8 typeVIP, i32 VIPLevel, bool sex, i32 hide, str style, str colors, str skin, i32 grade, i32 repute,`
  `i32 mainWeaponTemplateId` (+ if ≠0: `i32 refineryLevel, str weaponName, date MinValue`), `i32 secondWeaponTemplateId, i32 nimbus, bool isShowConsortia, i32 consortiaId, str consortiaName, i32 badgeId, i32 consortiaLevel, i32 consortiaRepute, i32 win, i32 total, i32 fightPower, i32 apprenticeshipState, i32 masterId, str masterOrApprentices, i32 achievementPoint, str honor, i32 offer, bool dailyLeagueFirst, i32 dailyLeagueLastScore, bool isMarried` (+ if married `i32 spouseId, str spouseName`), `i32 0 ×6, i32 team, i32 livingId, i32 maxBlood, i32 hasPet` (+ pet block: `i32 place, i32 templateId, i32 petId, str name, i32 userId, i32 level, i32 skillCount, {i32 skillPlace?, i32 skillId}`).
- `GAME_LOAD(103)` — `BaseGame.SendStartLoading` `BaseGame.cs:2916-2946`: `i32 maxTime, i32 mapId, i32 nFiles {i32 type, str path, str className}`, then pet-skill resources (`i32 0` for special PvE, else list of `{str pic, str effectPic}`).
- C→S `LOAD(16)` `i32 progress` → server rebroadcasts progress (`Cmd/LoadCommand.cs`).
- `START_GAME(99)` — `PVPGame.cs:786-829` (PvE: `PVEGame.cs:2025-2072`): `i32 n` then per player `i32 id, i32 x, i32 y, i32 direction, i32 blood, i32 maxBlood, i32 team, i32 weaponRefineryLevel, i32 50 (powerRatio), i32 dander, i32 nBuffs {i32 type, i32 value}, i32 0, bool isFrost, bool isHide, bool isNoHole, bool false, i32 0`, then `date now`.

Spawn points: `Map_Info.PosX`/`PosX1` = `"x,y|x,y|…"` for team 1 / team 2; `GetMapRandomPos` randomly swaps the two lists (`MapMgr.cs:88-114`); each player takes a random unused point (`BaseGame.GetPlayerPoint` `BaseGame.cs:1541`). PvE never swaps (`MapMgr.cs:116`) and sets direction `x<600 ? 1 : -1` (`PVEGame.cs:2043`).

---

## 3. Turn system

### 3.1 Delay ("turn points") — lowest delay acts next

| Quantity | Formula | Source |
|---|---|---|
| Base turn delay (players) | `GetTurnDelay() = (int)(1600 − 1200·Agility/(Agility+1200) + Attack/10)` | `Phy/Object/TurnedLiving.cs:161-164` |
| Initial delay | player: `GetTurnDelay()`; NPC/boss: `(int)Agility` | `TurnedLiving.cs:119-130` |
| Start of own turn (player) | `AddDelay(GetTurnDelay())` (+ healstone use) | `Phy/Object/Player.cs:2624-2642` |
| Aim time (C→S `FIRE_TAG 96` with `bool true, u8 speedTime`) | `AddDelay(min(speedTime, timeType) * 20)`; `TotalShootCount++` | `Player.cs:2169-2175`, `Cmd/FireTagCommand.cs` |
| After last shot of the turn | `AddDelay(ball.Delay + weapon.Property8)` (gold weapon: `GoldEquip.Property8`); `AddDander(20)`; `AddPetMP(10)` | `Player.cs:2490-2495` |
| Skip (`SKIPNEXT 12`) | `AddDelay(100)`, `AddDander(20)`, `AddPetMP(10)` | `Player.cs:2546-2558` |
| Prop use | `delay += item.Property5`, `energy -= item.Property4` | `Player.cs:2770-2810` |
| Second weapon | `delay += template.Property5`, `energy -= Property4` | `Player.cs:2812-2849` |
| Frozen / BlockTurn at own turn | player: `AddDelay(GetTurnDelay())`; boss: `AddDelay(NpcInfo.Delay)` (turn is lost) | `TurnedLiving.cs:144-159` |
| **PvE override** | `AddDelay(v)` in a PVEGame ignores `v` and sets `delay = MissionInfo.IncrementDelay` | `TurnedLiving.cs:132-142` |

Next living (`BaseGame.FindNextTurnedLiving` `BaseGame.cs:491-513`): take a **random** element of the turn queue, then
scan for strictly lower `Delay` (ties keep the random pick); `TurnNum++`. Then `MinusDelays(current.Delay)` subtracts
the winner's delay from everybody (`BaseGame.cs:1773`; PvE also decrements `PveGameDelay`, `PVEGame.cs:1300`).

### 3.2 `PVPGame.NextTurn()` (`PVPGame.cs:590-635`)

1. `ClearWaitTimer`, `ClearDiedPhysicals` (remove dead livings/turn entries/physicals), `CheckBox` (remove picked boxes), `turnIndex++`.
2. `CreateBox()` (`BaseGame.cs:692-764`): if last turn dealt damage, 1–2 drop boxes (`DropInventory.BoxDrop`) at random points recorded along shell paths (`AddTempPoint` every 0.4 s of flight, `SimpleBomb.cs:563`), capped at `players+2`; dead players spawn "ghost boxes" (type 2/3) on a circle (`CreateGhostPoints` `BaseGame.cs:685`).
3. `PrepareNewTurn()` on every physical (resets per-turn modifiers, energy, shootCount=1, ballCount=1, ball back to main ball… `Player.cs:2105-2147`, `Living.cs:1570-1586`).
4. Pick next living; if `VaneOpen` (player grade ≥ 9 or bot) → new wind `GetNextWind()` (not sent here; sent in `TURN`).
5. `MinusDelays`, `PrepareSelfTurn()` (effects tick, healstone, pet CDs, `SendRoundOneEnd`).
6. If not frozen and alive: `StartAttacking()`, send `TURN(6)`, add `WaitLivingAttackingAction(turnIndex, (timeType+20)*1000 ms)` — hard timeout that force-stops the turn (`Actions/WaitLivingAttackingAction.cs:19-27`).

`TURN(6)` payload (`BaseGame.SendGameNextTurn` `BaseGame.cs:2190-2238`), header `Parameter1 = livingId`:
`bool wind>0, u8 vane1, u8 vane2, u8 vane3, bool isHide, i32 turnTime, i32 nBoxes {i32 id, i32 x, i32 y, i32 type}, i32 nPlayers {i32 id, bool isLiving, i32 x, i32 y, i32 blood, bool isNoHole, i32 energy, i32 psychic, i32 dander, i32 petMaxMP, i32 petMP, i32 shootCount, i32 flyCount}, i32 turnIndex`.

### 3.3 Turn time and wind

- `timeType` → turn seconds `getTurnTime()`: `1→8, 2→10, 3→12, 4→16, 5→21, 6→31, else 10` (`BaseGame.cs:1566-1578`). `GetTurnWaitTime()` returns `timeType` itself (used as cap for aim time, `BaseGame.cs:1594`).
- Wind (`BaseGame.GetNextWind` `BaseGame.cs:1463-1488`): `FrozenWind` → 0 (any player grade ≤ 9 in PvP, `PVPGame.cs:102`). Otherwise random walk toward a hidden target `m_nextWind ∈ [-40,40)`: `w10=(int)(wind*10)`; if `w10 > target` → `w10 − rand(0..10)` else `w10 + rand(0..10)`; retarget when crossed. Result `/10` (range ≈ −5.0…+5.0).
- `UpdateWind` ignored when `m_confineWind` (`BaseGame.cs:3218`). Vane (`VANE 38`, `BaseGame.cs:2396`): `i32 wind*10, bool >0, u8 GetVane(.,1), u8 GetVane(.,2), u8 GetVane(.,3)`; digits encode tens/units of `|wind*10|` (`WindMgr.GetWindID` `WindMgr.cs:179-252`; pos 2 always 0). Wind digit PNGs are rendered server-side with GDI (`WindMgr.CreateVane` `WindMgr.cs:85-132`) and sent as `WIND_PIC 241 {u8 id, bytes png}` — port: pre-render 11 PNGs once at build time.

### 3.4 Energy / movement

- Energy per turn `= (int)Agility/30 + 240` (+ guild buff) (`Player.cs:2112`, `2283`); each moved pixel in X costs 1 energy (`Player.SetXY` `Player.cs:2380-2412`).
- C→S `MOVESTART(9)`: `bool recording, u8 type, i32 x, i32 y, u8 dir, bool isLiving, i16 turnIndex` (`Cmd/MoveStartCommand.cs`). Server trusts the client's x/y (!), rebroadcasts `MOVESTART` to others, then `SetXY` + `StartMoving()` (drop to ground; if no ground → die, `Player.cs:2678-2702`); if the server-computed Y differs by >1 or life state differs it sends a correction `type=3`. **Port note:** add a server-side sanity check (max |Δx| ≤ energy, walkable path via `FindNextWalkPoint`) — the original is exploitable.
- Walking step (NPC/server-side): `STEP_X=3, STEP_Y=7` (map 1164: 1/3) (`Living.cs:530-552`), `Map.FindNextWalkPoint` (`Map.cs:148-165`): step x by `dir*stepX`, search ground downward from `y−stepY−1`, reject if |Δy| > stepY.
- Ghost (dead player) moves toward `GHOST_TARGET(54) {i32 x, i32 y}`, ≤160 px/turn (`Player.StartGhostMoving` `Player.cs:2665-2676`).

---

## 4. GAME_CMD sub-commands

All combat traffic is packet code **91 (0x5B, `ePackageTypeLogic.GAME_CMD`)**; first body byte = `eTankCmdType`
(`Game.Logic/eTankCmdType.cs`). Header (`Game.Base/Packets/GSPacketIn.cs:160-176`): `u16 0x71AB(29099), u16 len, u16 checksum, u16 code, i32 clientId, i32 param1, i32 param2` (20 bytes). For combat, **`param1` = living id of the actor**.
C→S dispatch: `BaseGame.ProcessData` → `ProcessPacketAction` → `CommandMgr` handler by code (`Actions/ProcessPacketAction.cs`, `Cmd/CommandMgr.cs`). Unregistered codes are logged and dropped.

The **complete, generated table is [00a-tankcmd-table.md](00a-tankcmd-table.md)**. Hand-verified core set:

| Code | Name | Dir | Payload (in order) | Handler / emitter |
|---|---|---|---|---|
| 2 | FIRE | C→S | `i32 x, i32 y, i32 force, i32 angle` (x,y = muzzle point computed by client) | `Cmd/FireCommand.cs:19-62` → `Player.Shoot` |
| 2 | FIRE | S→C | `i32 wind*10, bool wind>0, u8 vane1, u8 vane2, u8 vane3, i32 bombCount`, per bomb: `i32 bombCount, i32 shootCount, bool digMap, i32 bombId, i32 x, i32 y, i32 vx, i32 vy, i32 ballTemplateId, str flyingPartical, i32 radii*1000/4, i32 (int)power*1000, i32 nActions {i32 timeMs, i32 type, i32 p1, i32 p2, i32 p3, i32 p4}`; then pet block: `i32 nPetActions {i32 p1, i32 p2, i32 p4, i32 p3}, i32 1` or `i32 0, i32 0` | `Living.ShootImp` `Living.cs:1761-1870` |
| 6 | TURN | S→C | see §3.2 | `BaseGame.cs:2190` |
| 7 | DIRECTION | C→S / S→C | `i32 direction (1 / -1)` | `Cmd/DirectionCommand.cs`, `BaseGame.cs:2607` |
| 9 | MOVESTART | C→S / S→C | C→S see §3.4; S→C `bool true, u8 type, i32 x, i32 y, u8 dir, bool isLiving` (+ if type 2: `i32 n {i32 x, i32 y}` boxes) | `BaseGame.cs:2811` |
| 11 | HEALTH | S→C | `u8 type, i32 blood, i32 delta` (type 1=damage, 6=death/boss, 0=heal…) | `BaseGame.cs:2340-2351` |
| 12 | SKIPNEXT | C→S | `u8 spendTime` | `Cmd/SkipNextCommandP.cs` |
| 14 | DANDER | S→C | `i32 dander` | `BaseGame.cs:2318` |
| 15 | STUNT | C→S | (none) — use special ball if dander ≥ 200 | `Cmd/StuntCommand.cs` → `Player.UseSpecialSkill` `Player.cs:2851` |
| 16 | LOAD | C→S | `i32 progress 0..100` | `Cmd/LoadCommand.cs` |
| 17 | SUICIDE | C→S | (none) | `Cmd/SuicideCommand.cs` |
| 20 | CHANGE_BALL | S→C | `bool special, i32 ballId` | `BaseGame.cs:2306` |
| 23 | GENERAL_COMMAND | C→S | mission-specific, forwarded to `AMissionControl.OnGeneralCommand(packet)` | `Cmd/MissionEventCommand.cs` |
| 32 | PROP | C→S | `u8 bag (1=fight bag,2=props), i32 place, i32 templateId` | `Cmd/PropUseCommand.cs` |
| 32 | PROP | S→C | `u8 type, i32 place, i32 templateId, i32 userLivingId, bool templateId==10017` | `BaseGame.cs:2859` |
| 40 | AIRPLANE | C→S | (none) — fly (sets ball 3) | `Cmd/FlyCommand.cs` → `Player.UseFlySkill` `Player.cs:2758` |
| 49 | PICK | C→S | `i32 boxId` | `Cmd/PickCommand.cs` |
| 54 | GHOST_TARGET | C→S | `i32 x, i32 y` | `Cmd/SetGhostTargetCommand.cs` |
| 64 | ADD_LIVING | S→C | `u8 livingType, i32 id, str name, str modelId, str actionStr, i32 x, i32 y, i32 blood, i32 maxBlood, i32 team, u8 direction, u8 isBottom, bool showBlood, bool showSmallMapPoint, i32 0, i32 0, bool frost, bool hide, bool noHole, bool false, i32 …` | `BaseGame.cs:1935` |
| 84 | USE_DEPUTY_WEAPON | C→S / S→C | C→S none; S→C `i32 remainingUses` | `Cmd/SecondWeaponCommand.cs`, `BaseGame.cs:3026` |
| 96 | FIRE_TAG | C→S (rebroadcast) | `bool hasTime, u8 speedTime` | `Cmd/FireTagCommand.cs` |
| 98 | TAKE_CARD | C→S / S→C | C→S `u8 index`; S→C `bool isAuto, u8 index, i32 templateId, i32 count, bool false` | `Cmd/TakeCardCommand.cs`, `BaseGame.cs:2293` |
| 99 | START_GAME | S→C | §2.4 | |
| 100 | GAME_OVER | S→C | §8.1 | `PVPGame.cs:375-552` |
| 101 / 103 | GAME_CREATE / GAME_LOAD | S→C | §2.4 | |
| 131 | SYNC_LIFETIME | S→C | `i32 lifeTime (ticks)` | `BaseGame.cs:2955` |
| 143 | BOT_COMMAND | C→S | (none) — server plays the turn for this player (bot) | `Cmd/BotCommand.cs` (02-bots.md) |
| 144 | PET_SKILL | C→S | `i32 skillId, i32 type` | `Cmd/PetKillCommand.cs` |
| 149 | GAME_TRUSTEESHIP | C→S | `bool state` → replies `i32 n {i32 id, bool false}` (auto-play is **not** implemented) | `Cmd/GameTrusteeshipCommand.cs` |

Dead/no-op handlers worth knowing: `MOVESTOP(10)`, `WANNA_LEADER(97)` are empty; `MissionStartCommand` has **no `[GameCommand]` attribute** so it is never registered (`Cmd/MissionStartCommand.cs:6`).

### 4.1 `BombAction` timeline (inside FIRE)

`BombAction(time s, type, p1..p4)`, serialized as `TimeInt = round(time*1000)` (`Phy/Actions/BombAction.cs`). Types (`Phy/Actions/ActionType.cs`):

| type | name | p1 | p2 | p3 | p4 | emitted at |
|---|---|---|---|---|---|---|
| -1 | NULLSHOOT | | | | | pet miss `SimpleBomb.cs:354` |
| 1 | PICK | physicalId | | | | `SimpleBomb.cs:428` |
| 2 | BOMB | x | y | digMap 0/1 | | `SimpleBomb.cs:115` |
| 3 | START_MOVE | livingId | x | y | isLiving | `SimpleBomb.cs:338` |
| 4 | FLY_OUT | | | | | `SimpleBomb.cs:434` |
| 5 | KILL_PLAYER | livingId | damage+crit | 1 normal / 2 crit | bloodAfter | `SimpleBomb.cs:286` |
| 6 | TRANSLATE | x | y | | | fly ball `SimpleBomb.cs:178` |
| 7 | FORZEN | livingId (-1 = failed) | | | | `SimpleBomb.cs:123,147` |
| 8 | CHANGE_SPEED | vx | vy | | | homing ball `SimpleBomb.cs:586` |
| 9 | UNFORZEN | livingId | | | | |
| 10 | DANDER | livingId | dander | | | `SimpleBomb.cs:315` |
| 11 | CURE | livingId | bloodAfter | healed | | `SimpleBomb.cs:212,229` |
| 13 | UNANGLE | livingId | | | | |
| 14 | DO_ACTION | livingId | | | actionIndex | |
| 20 | PET | livingId | dmg | dander | blood | pet hit |

---

## 5. Physics

### 5.1 Projectile integration (exact)

`EulerVector.ComputeOneEulerStep(m, af, f, dt)` (`Phy/Maths/EulerVector.cs:31-36`), per axis, **float32**:
```
a  = (f − af·v) / m
v += a·dt
x += v·dt
```
Bomb forces, recomputed when the map/wind is set (`BombObject.UpdateAGW` `Phy/Object/BombObject.cs:165-173`):
```
arf = map.airResistance(MapInfo.DragIndex) · ball.DragIndex      // drag coefficient (both axes)
gf  = map.gravity(MapInfo.Weight)         · ball.Weight · ball.Mass // y-axis force
wf  = map.wind                             · ball.Wind               // x-axis force (wind is the float -5.0..5.0)
x-axis: ComputeOneEulerStep(mass, arf, wf, dt);  y-axis: ComputeOneEulerStep(mass, arf, gf, dt)    (BombObject.cs:59-64)
```
Step loop (`SimpleBomb.StartMoving` `SimpleBomb.cs:550-596`) — the **whole flight is simulated synchronously at shot time**:
```
dt = 0.04 s;  lifeTime += 0.04 each step
next = (int)x0, (int)y0 after step  → MoveTo(next)
every 0.4 s of lifetime (round(lifeTime*100) % 40 == 0) and y>0: game.AddTempPoint(next)   // box spawn candidates
controlled ball (prop 10010 "shoot straight"/ControlBall) when vy>0: nearest enemy within 150 px →
   velocity := normalize(target − pos)·1000, forces := 0 (straight line), emit CHANGE_SPEED   (SimpleBomb.cs:567-588)
```
Initial velocity (`Living.ShootImp` `Living.cs:1782-1802`) for bomb `i` of `bombCount`:
```
(k, dAngle) = i==1 ? (0.9, −5°) : i==2 ? (1.1, +5°) : (1.0, 0)
vx = (int)(force·k·cos((angle+dAngle)·π/180));  vy = (int)(force·k·sin((angle+dAngle)·π/180))
```
(angle is in screen space: y grows downward; the client sends angle already mirrored for direction.)
Shot wait: `LastLifeTimeShoot = (int)((maxLifeTime + 2 + bombCount/3) * 1000) + PetEffects.Delay + SpecialSkillDelay`; `game.WaitTime(that)` (`Living.cs:1867-1868`).

Swept collision (`BombObject.MoveTo` `BombObject.cs:93-144`): walk the segment along the major axis in **steps of 3 px** (`i = 1; i <= len; i += 3`); at each point offset the bomb rect `(-3,-3,6,6)` and test, in order:
1. `map.FindPhysicalObjects(rect, this)` (any living/physical whose `Bound` or `Bound1` intersects) → `CollideObjects` → each `physics.CollidedByObject(bomb)` (a Living calls `bomb.Bomb()`, `Living.cs:812`; boxes are picked: `PICK` action);
2. `!map.IsRectangleEmpty(rect)` (terrain: only the 4 corners are tested, `Tile.IsRectangleEmptyQuick` `Tile.cs:322`) → `CollideGround` → `Bomb()`;
3. `map.IsOutMap(x,y)` (`x < 0 || x > width || y > height`; flying above the top is allowed, `Map.cs:280`) → `FLY_OUT`, bomb dies.

Bodies: Physics default rect `(-5,-5,10,10)` (`Physics.cs:110`); Player `(-15,-20,30,30)` (`Player.cs:417`); NPC rect/damage-rect from `NpcInfo.X/Y/Width/Height`, mirrored when direction = 1 (`SimpleNpc.Reset`, `Living.ReSetRectWithDir` `Living.cs:1705`).

### 5.2 Explosion (`SimpleBomb.BombImp` `SimpleBomb.cs:89-415`)

1. Victims = livings with `BoundDistance(point) < ball.Radii` (`Map.FindHitByHitPiont` `Map.cs:480`; `BoundDistance` samples the bound rectangle edges every 10 px and returns the min distance, `Living.cs:778-795`).
2. If any victim has `IsNoHole`/`NoHoleTurn`, terrain is not dug (unless the ball is "special").
3. `if digMap: map.Dig(x, y, shapeTile, null)` then `BOMB` action.
4. By `BombType` (`BallMgr.GetBallType` `BallMgr.cs:45-72`: 1/56/99 FROZEN, 3 FLY, 5/59/64/97/98/120/10009 CURE, 110/117 WORLDCUP, 128/129 CATCHINSECT, else Normal):
   - **FROZEN**: `IceFronzeEffect(2)` on players/NPCs (boss-owned: 100 turns) (`SimpleBomb.cs:118-165`).
   - **FLY** (teleport): if `y>10 && lifeTime>0.04`, back off 5 px along −velocity if inside terrain, move owner there, `TRANSLATE` + `START_MOVE` (`SimpleBomb.cs:166-182`).
   - **CURE**: heal = `SecondWeapon.Property7 · 1.1^StrengthenLevel · (≥2 players in radius ? 0.4 : 1.0)` + guild bonus + pet bonus (`SimpleBomb.cs:222-224`); ball 10009 (pet) heals `AddBloodPercent% of MaxBlood × round(lifeTime)` and damages enemies by the same.
   - **Normal**: damage pipeline §6 per enemy victim; then everyone alive in the radius falls (`StartMoving(delay, 12)` + `START_MOVE`).
5. Pet follow-up hit (first shot only, radius 80): `MakePetDamage · PetBaseAtt / 300` (`SimpleBomb.cs:347-401`).

### 5.3 Terrain (maps)

- Data files: `map/{MapId}/fore.map` (diggable) and `map/{MapId}/dead.map` (indestructible) loaded at boot (`MapMgr.LoadMap` `MapMgr.cs:241-263`). Present in `Fighting.Service/bin/Debug/net48/map/` (505 maps) and `Road.Service/bin/.../map/`.
- Format (`Tile(string file)` `Phy/Maps/Tile.cs:89-104`): `i32 LE width, i32 LE height`, then `(width/8 + 1) * height` bytes, row-major, **MSB-first** 1 bit per pixel (`bit = 7 − x%8`), 1 = solid. Verified: `map/1001/fore.map` = 2000×1425 → 8 + 251·1425 = 357 683 bytes. Bitmaps are built from PNG alpha `A > 100 → solid` (`Tile.cs:66-87`) — use this to regenerate from the client's foreground SWF/PNG if a map file is missing.
- `Map.IsEmpty(x,y)`: empty iff empty in fore **and** dead (`Map.cs:78-89`); out-of-bounds is empty.
- Bound = fore (or dead) tile size (`Map.cs:56-63`). Map `gravity = MapInfo.Weight`, `airResistance = MapInfo.DragIndex` (`Map.cs:37-39`), wind per game.
- Map is **cloned per game** (`MapMgr.CloneMap` → `Tile.Clone` copies the byte array).

### 5.4 Digging (crater shapes)

- Crater shape per ball: `bomb/{BallId}.bomb`, same tile format, loaded only if `Ball.HasTunnel` (`BallMgr.cs:115-136`; 2060 files shipped).
- `Tile.Dig(cx, cy, surface, border)` (`Tile.cs:108-125`): only if the tile is diggable; clears (AND-NOT) every bit set in `surface` placed at `(cx − w/2, cy − h/2)`; `Add(border)` is a no-op (commented out) — **craters only remove**. `Remove` (`Tile.cs:181-287`) is a byte-aligned shifted mask; port as straightforward per-pixel clear (result is identical).
- Dig happens on both fore and dead layers, but dead is `digable:false` so it never changes.

### 5.5 Map selection

`MapMgr.GetMapIndex(index, roomType, serverId)` (`MapMgr.cs:60-86`): explicit map if valid; else random from `Server_Map.OpenMap` (CSV) for this server whose `Map.Type & roomType != 0` (Type bits: Normal 1, PairUp 2, Arena 4, Duplicate 8 — `eMapType.cs`); fallback any open map.

---

## 6. Damage

### 6.1 Shell damage — `SimpleBomb.MakeDamage(target)` (`SimpleBomb.cs:478-548`)

```
if target is NPC/boss and (!Config.CanTakeDamage || Config.HaveShield) → 0
baseDamage = owner.BaseDamage                     // Player: GamePlayer.GetBaseAttack() + DameAddPlus + guild (Player.cs:2242-2254)
baseGuard  = target.BaseGuard                     // Player: GetBaseDefence() + GuardAddPlus
defence    = target.Defence ; attack = owner.Attack
if target.AddArmor && target has deputy weapon: baseGuard += H; defence += H,   H = getHertAddition(deputy)   (Living.cs:998-1007:
     H = round(P7·1.1^strengthen − P7) + P7,  P7 = template.Property7)
if owner.IgnoreArmor || target.Config.CancelGuard: baseGuard = defence = 0
DR1 = 0.95·(baseGuard − 3·owner.Grade) / (500 + baseGuard − 3·owner.Grade)
DR2 = (defence − owner.Lucky ≥ 0) ? 0.95·(defence − Lucky)/(600 + defence − Lucky) : 0
DR3 = owner.FightBuffers.WorldBossAddDamage · (1 − (baseGuard/200 + defence·0.003))
dmg = (DR3 + baseDamage·(1 + attack·0.001)·(1 − (DR1 + DR2 − DR1·DR2))) · owner.CurrentDamagePlus · owner.CurrentShootMinus
d   = target.Distance(bombPoint)          // min distance to target damage rect edges, sampled every 10 px (Living.cs:921-936)
if d < radius: dmg *= 1 − d/radius/4  ;  return dmg<0 ? 1 : (int)dmg       else 0
```
Melee/NPC `Living.MakeDamage(target)` is the same without DR3 and distance falloff (`Living.cs:1103-1131`).
Pet damage `SimpleBomb.MakePetDamage` differs only in DR2 when negative: `0.357 + defend·1e-5` (`SimpleBomb.cs:462`).

### 6.2 Critical — `Living.MakeCriticalDamage` (`Living.cs:722-737`)
```
if Lucky·45/(800+Lucky) + PetEffects.CritRate ≥ rand(0..99):
    crit = (int)((0.5 + Lucky·0.00015)·baseDamage) · (100 − target.ReduceCritGems − target.PetReduceCrit) / 100 + guildCritBonus
else crit = 0
```
Sent as `KILL_PLAYER p3 = 2` when crit > 0.

### 6.3 Applying — `Living.TakeDamage` (`Living.cs:2117-2188`) and `Player.TakeDamage` (`Player.cs:2733-2756`)
- Player: friendly fire / self-damage can never kill: clamp to `blood − 1` (`Player.cs:2735-2739`).
- `OnBeforeTakedDamage` hooks (effects: guard, reduce damage, avoid, reflect…), then `total = max(0, dmg+crit)`; players subtract `ReduceDamePlus%` (equipment/suit) (`Living.cs:2132-2138`).
- Frozen livings take **no** damage (`!IsFrost` guard, line 2124) — the hit only breaks ice (`UNFORZEN`). Any damage stops Ice/Hide/NoHole effects (`Living.cs:2184-2186`).
- `Config.KeepLife` floors blood at 1. On death → `LivingDieByBombAction` + `Die()`.
- Victim player gains dander `(dmg·2/5 + 5)/2` (`Player.cs:2743`); "save life" paid buff heals when < 30% (`Player.cs:2744-2753`).
- Attacker `OnAfterKillingLiving` (`Living.cs:1283-1305`): if enemy: `CurrentIsHitTarget = true`, `TotalHurt += total`, `TotalKill++` if dead, `game.TotalHurt += total`. Player vs player kill also steals offer (`Player.CalculatePlayerOffer` `Player.cs:1883-1899`: Guild match 10, free 1 (3 if both in guilds), +TotalHurt/2000).

### 6.4 Stats source (player)
`Player.Reset()` `Player.cs:2205-2333`: `BaseDamage = GetBaseAttack()`, `BaseGuard = GetBaseDefence()` (weapon/armour `Property7` scaled by strengthen `round(P7·1.1^lvl − P7) + P7`, gems in holes, cards, rank — `Game.Server/GamePlayer.cs:2436-2620,2732`), `Attack/Defence/Agility/Lucky` from `PlayerCharacter` + `*AddPlus` + `StrengthEnchance` + %-buff + guild buff + pet evolution; `MaxBlood = hp + HpAddPlus + pet + world-boss buffs (+ guild %)`.

---

## 7. Player actions, props, skills, effects

### 7.1 Shoot (`Player.Shoot` `Player.cs:2414-2544`)
- Requires `shootCount > 0`. Ball id: current ball; if first ball of turn and not special: prop 20002 → `CommonMultiBall`, 20008 → `CommonAddWound` (`BallConfig`).
- `m_isBombOrIgnoreArmor`: 1 (prop 10020 "armor piercer") → `IgnoreArmor` for this shot; 2 (prop 10022 "atom bomb") → ball 4.
- CURE ball forces `ballCount = shootCount = 1`.
- After last shot: stop attacking, add delay/dander/petMP (§3.1), **fire drop** `DropInventory.FireDrop(roomType)` (gold/money/items into temp bag) (`Player.cs:2497-2535`).
- Grade ≤ 15 in a game with `FreeFatal` → `FatalEffect(0, 15112004)` (`Player.cs:2416`).
- **FireCommand aimbot backdoor**: usernames in `FireCommand.aimUsers` (empty list) get server-side auto-aim (`Cmd/FireCommand.cs:11-55`). Do **not** port.

Weapon → balls: `BallConfig` table (`Game.Logic/BallConfigMgr.cs`, `SqlDataProvider/Data/BallConfigInfo.cs`): `TemplateID → Common, Special, CommonAddWound, CommonMultiBall`. Gold weapons use `GoldEquip.TemplateID`; `ChangeSpecialBall>0` uses config 70396 (`Player.cs:2361-2378`).

### 7.2 Props (C→S `PROP 32`, `Cmd/PropUseCommand.cs`)
Validation: game Playing, not sealed; bag 2 only templates 10001–10022; bag 1 only 10001–10008; `CheckCanUseItem` stacking rules (`Player.cs:605-655`: e.g. max 2× of 10001/10002, 10003 excludes 10001+10002 combo…); `CanUseItem` (energy ≥ Property4, attacking or dead teammate of current player, not locked; special ball allows only `AllowedItems`).
Effect dispatched by `ItemTemplate.Property1` → `SpellMgr` handler (`Spells/SpellMgr.cs:17-21`, `eSpellType.cs`):

| Property1 | Spell | Effect | Source |
|---|---|---|---|
| 1 | ADD_LIFE | Property2=0: heal self Property3 (+guild); 1: heal whole team | `Spells/NormalSpell/AddLifeSpell.cs` |
| 2 | FROST | ball 1 | `FrostSpell.cs` |
| 3 | HIDE | `HideEffect(Property3)` self/team | `HideSpell.cs` |
| 5 | CARRY | ball 3 (fly) | `CarrySpell.cs` |
| 6 | BECKON | no-op | `BeckonSpell.cs` |
| 7 | VANE | invert wind and broadcast | `VaneSpell.cs` |
| 8 | BREACHDEFENCE | `IgnoreArmor = true` | `FightingSpell/BreachDefenceSpell.cs` |
| 9 | NOHOLE | `NoHoleEffect(Property3)` | `NoHoleSpell.cs` |
| 10 | ABOMB | ball 4 (atom) | `ABombSpell.cs` |
| 11 | ATTACKUP | `AddDander(Property2)` | `AttackUpSpell.cs` |
| 12 | SHOOTSTRAIGHT | `ControlBall = true` (homing) | `ShootStraightSpell.cs` |
| 13 | ADDWOUND | `CurrentDamagePlus += Property2/100` | `AddWoudSpell.cs` |
| 14 | ADDATTACK | `ShootCount += Property2`; `CurrentShootMinus *= (Property2==2 ? 0.6 : 0.9)`; disabled for balls 1/3/5 with 10001/10002 | `AddAttackSpell.cs` |
| 15 | ADDBALL | `BallCount = Property2`, `CurrentDamagePlus *= 0.5` | `AddBallSpell.cs` |
| 30 | SEAL | `SealEffect(Property3)` | `SealSpell.cs` |

Dead teammates can use props (`place == -1` costs `psychic` (Property7) and adds delay to the *current* living, `Player.cs:2795-2799`).

### 7.3 Special skill / fly / second weapon / pet
- STUNT: dander ≥ 200 (max 200, `TurnedLiving.cs:174-181`) → ball `Special`, `ballCount = ball.Amount`, dander 0; then `CurrentShootMinus *= ball.Power` (`Cmd/StuntCommand.cs`, `Player.cs:2851-2863`).
- Fly: `UseFlySkill` → ball 3 (FLY), announces prop 10016 (`Player.cs:2758-2766`). Props 10001–10003 disable fly for the turn.
- Second weapon (`Player.UseSecondWeapon` `Player.cs:2812-2849`): `Property3 == 31` → shield `AddGuardEquipEffect(H, 1, isArmor)`; else switch to deputy weapon ball (healing gun). Uses per game `StrengthenLevel+1`.
- Pet skills: `PET_SKILL(144)`; `PetMP` (start 10, max 100, +10 per turn end), cooldowns, `Pet*` effects in `Game.Logic/PetEffects/**` (≈400 effect types, `ePetEffectType.cs`). Port later as data-driven effects.

### 7.4 Effects / buffs
`AbstractEffect(type)` attaches to `Living.EffectList` and subscribes to living events (BeginSelfTurn, BeforeTakeDamage…) (`Effects/AbstractEffect.cs`). Types: `eEffectType.cs` (49 kinds). Equipment/gem effects are created from `ItemTemplate.Property3` switch (`Player.InitBuffer` `Player.cs:680-767`: 1 AddAttack, 2 AddDefence, 3 AddAgility, 4 AddLucky, 5 AddDamage, 6 ReduceDamage, 7 AddBlood, 8 Fatal, 9 IceFronzeEquip, 10 NoHoleEquip, 11 AtomBomb, 12 ArmorPiercer, 13 AvoidDamage, 14 MakeCritical, 15 AssimilateDamage, 16 AssimilateBlood, 17 SealEquip, 18 AddTurnEquip, 19 AddDander, 20 ReflexDamage, 21 ReduceStrength, 22 ContinueReduceBlood, 23 LockDirection, 24 AddBomb, 25 ContinueReduceDamage, 26 RecoverBlood) — `(Property4, Property5)` = (probability %, value). Example: `IceFronzeEffect(count)` sets `IsFrost`, decrements each own turn, stops at < 0 (`Effects/IceFronzeEffect.cs`). Card buffs: `CardEffect/**`, `CardBuffMgr.cs`. Paid fight buffs: `FightBufferInfo.cs`, `Player.InitFightBuffer` `Player.cs:1422`.

**Ported** (`packages/fight/src/game/effects.ts` + `equipEffects.ts`/`cardEffects.ts`/`petEffects.ts`, not `apps/game`
— the effect layer is pure-engine like everything else in `@ddt/fight`): `Living.hooks` (`HookBus`) is the event-bus
above; `Living.effectList`/`cardEffectList`/`petEffectList` (`EffectListOf<E>`) are the generic `EffectList.cs`/
`CardEffectList.cs`/`PetEffectList.cs`. All 26 `Property3` kinds, all 30 `CardEffect/Effects/*.cs` classes (wired by
`CardID` 1..15 exactly like `Player.InitCardBuffer`, `Player.cs:1534-1850`), and one worked pet-skill-element example
(`CE1067`) are ported with unit tests (`test/effects.test.ts`); the ~250 remaining pet `AE####`/`PE####`/`CE####`
ids are a documented, bounded follow-up (see `petEffects.ts`'s file header). Guild-skill fight buffs
(`FightBufferInfo.cs`/`Consortion*Buffer.cs`) are *not* re-implemented as `AbstractEffect`s — in the original they're
resolved to flat stat deltas before the fight (`GamePlayer.FightBuffers`), so this port takes the same shortcut:
`PlayerSpec.guildBuffs`, applied once in `Player.reset()`. Not wired into `apps/game` yet: the adapter needs (a) the
exact gem-vs-attribute-gem `ItemTemplate` predicate for `GamePlayer.EquipEffect` (apps/game's `stats.ts` only
confirms the *attribute*-gem shape), and (b) `CardBuff`/`CardGroup`/`Pet_Skill_Element` rows in `packages/db`, none
of which exist yet — wiring either without them would either guess the predicate or silently no-op, so it's left as
a tracked gap (docs/BACKLOG.md) rather than risk the live adapter.

### 7.5 Death
`Living.Die()` (`Living.cs:897-919`): blood 0 → `HEALTH type 6`; stop attacking; `Physics.Die()`; `OnDied` / `OnDie` events; `CheckState(0)`. `Player.Die` lifts y by 70 (ghost) (`Player.cs:671-678`). Falling out of map (`StartMoving` finds no ground) kills. `SimpleNpc.Die` rolls NPC drop `DropInventory.NPCDrop(NpcInfo.DropId)` for the current player (`SimpleNpc.cs` `GetDropItemInfo`). PvE kill counters: `PVEGame.living_Died` (`PVEGame.cs:1238-1246`).

---

## 8. Game over, rewards, ranking

### 8.1 PvP (`PVPGame.GameOver` `PVPGame.cs:329-561`)
- Winner: first living player's team; if none, the current player's team.
- Per player, if `RoomType == Match` **or** |opponent avg level − grade| < 5: `offer = CalculateOffer`, `gp = CalculateExperience`.
- `CalculateExperience` (`PVPGame.cs:202-249`, Match only; others 0):
  ```
  avgLevel = opponent team avg grade; teamCount = opponent team size
  if TotalHurt == 0: return (avgLevel − grade ≥ 5 && game.TotalHurt > 0) ? 201 (+reward 200 msg) : 1
  isWin = 2 if won else 0; shoot = max(TotalShootCount,1, TotalHitTargetCount)
  maxHurt = opponentCount · opponentAvgLevel · 300 ; hurt = min(TotalHurt, maxHurt)
  gp = ceil((isWin + hurt·0.001 + TotalKill·0.5 + (int)(hits/shoot)·2) · avgLevel · (0.9 + (teamCount−1)·0.3))
  +200 if avgLevel − grade ≥ 5 ; couple bonus GainCoupleGP ; ×2 if DoubleEvent ; cap 12000 ; min 1
  ```
  (note `hits/shoot` is **integer** division → 0 unless 100% hit rate.)
- `CalculateOffer` (`PVPGame.cs:563-588`, Match only): `GainOffer (kill steals) + (Guild ? (win ? oppCount : oppCount·0.5) : 0) − KilledPunishmentOffer`, ×2 DoubleEvent.
- Match extra rewards if `TotalHurt > 0` (`PVPGame.cs:420-513`): money (`AddMoney`), gift token, extra exp drawn uniformly from config ranges, ×`GameProperties.TimeX2` in 3 "golden hour" windows (`GameProperties.GoldTimeStart/End`, `|`-separated), Guild games add +30..35 money / +50..55 exp / gift×2. Config (`Fighting.Service/App.config:6-32` for fight-server games; `Road.Service/App.config:14-30` for local): e.g. fight server `MONEY_*_WIN 500..700`, `EXP_*_WIN 200..250`, `GIFT_*_WIN 100..150`; lose `400..500 / 100..150 / 50..100`. League prestige `AddPrestige` (grade ≥ 20, §8.3).
- VIP: +10 gp, +1 offer. Then `AddGP` (applies server exp rate, anti-addiction, `GPAddPlus`; max level converts gp/100 → offer, `Game.Server/GamePlayer.cs:1357-1396`), `AddOffer`.
- `CanTakeOut` (card flips) = 1 if anybody on the team did damage.
- `GAME_OVER(100)` payload per player (`PVPGame.cs:522-549`): `i32 id, bool win, i32 grade, i32 gp(total), i32 totalKill, i32 gpGained(num4), i32 hitCount, i32 psychic, i32 vipBonus(10|0), i32 0, i32 spouseGP, i32 serverGP, i32 apprenticeOnlineGP, i32 apprenticeTeamGP, i32 0, i32 reward, i32 0, i32 serverGP, i32 GainGP, i32 offer, i32 0, i32 isVip, i32 0, i32 0, i32 0, i32 serverGP, i32 GainOffer, i32 canTakeOut`; after loop `i32 riches` (guild wealth). Preceded by `i32 PlayerCount`.
- Then `IGamePlayer.OnGameOver` (`Game.Server/GamePlayer.cs:5603-5631`): Match: `Win++` if won, `Total++`; quest/achievement events; `ClearFightBuffOneMatch`. Game log `OnGameOverLog` → `SP_Log_Fight`-style insert (Bussiness).
- Leaving mid-game: `−grade·12` GP; Match/Guild −15 offer, Match/Free −5 offer (`PVPGame.cs:647-683`).
- Cards: 9 slots (`Cards = new int[9]`, Dungeon 21); `TakeCard` → `DropInventory.CardDrop(roomType)` into temp bag (`PVPGame.cs:157-200`).

### 8.2 PvE — see [01-pve.md §5](01-pve.md#5-rewards).

### 8.3 Ranking / league score
- `PlayerBattle.AddPrestige(isWin)` (`Game.Server/GameUtils/PlayerBattle.cs:65-…`): base points from `FairBattleReward` row matching `totalPrestige` (`PrestigeForWin/Lose`), randomized by weekly/daily win ratio buckets (0–50%: win +1, lose +5..9; 50–75: +5..7 / +3; 75–100: +9..13 / +1..2); daily cap `fairBattleDayPrestige = 2000` (`PlayerBattle.cs:25`).
- Celeb/ranking lists (`Tank.Request/CelebList/*.ashx`) are computed by SQL procs from `Sys_Users_Detail` (Win/Total/GP/FightPower/Offer/Honor) — see [request/00-endpoints.md](../request/00-endpoints.md).

---

## 9. Special game types (eRoomType / eGameType)

`eRoomType` (`Game.Logic/eRoomType.cs`): Match 0, Freedom 1, Exploration 2, Boss 3, Dungeon 4, FightLab 5, Freshman 10, Academy 11, EliteGameScore 12, EliteGameChampion 13, WordBossFight 14, Labyrinth 15, ConsortiaBoss 17, FightGround 18, ConsortiaBattle 19, CoupleBoss 20, ActivityDungeon 21, TransnationalFight 22, SpecialActivityDungeon 23, CatchBeast 26, Encounter 27, FightFootballTime 30, Christmas 40.
`eGameType` (`Game.Logic/eGameType.cs`): Free 0, Guild 1, Training 2, Boss 3, ALL 4, Exploration 5, Dungeon 7, FightLab 8, Freshman 10, EliteGameScore 12, EliteGameChampion 13, WordBoss 14, Labyrinth 15, Encounter 16, ConsortiaBoss 17, ConsortiaBattle 19, BattleGame 20, CampBattle 23/24, RingStation 26, FightFootballTime 30, SevenDouble 31.
`IsSpecialPVE()` (no healstone, no paid buffs): FightLab, Freshman, Match, Freedom (`BaseGame.cs:3164-3172` — misnamed but used as "no consumables").

---

## 10. Port checklist (apps/game/src/combat)

1. `phys/tile.ts` (bitset, `isEmpty`, `dig`), `phys/map.ts` (two layers, find-ground, walk), loader for `.map/.bomb` files → **copy the binaries from `Fighting.Service/bin/Debug/net48/{map,bomb}` into `packages/game-data/assets`**.
2. `phys/euler.ts` using `Math.fround` on every op (C# `float`) and `Math.trunc` for `(int)` casts; golden tests: record `(x,y,vx,vy,ball,map,wind)` → landing point/time from a C# harness or from the client replay.
3. `Living/TurnedLiving/Player/SimpleNpc/SimpleBoss` classes with the event hooks listed in `ABrain` (01-pve.md §3).
4. `ActionQueue` + 40 ms loop; state machines exactly as §2.
5. Damage/crit/delay formulas as pure functions with unit tests citing the lines above.
6. Generated packet codecs from [00a-tankcmd-table.md](00a-tankcmd-table.md) (verify each before use).
7. Drop/reward tables come from DB (`Drop_Condiction`, `Drop_Item`, `Ball`, `BallConfig`, `Map`, `Server_Map`) — owned by `packages/db`.
