# 01 — PvE (dungeons, missions, NPC/boss scripts)

Source: `vendor/DDTank41/Game.Logic` (engine) + `vendor/DDTank4.1/Source Server/Game.Server.Scripts/AI` (scripts).
Paths without prefix are relative to `vendor/DDTank41/`. Engine basics (turns, damage, packets): [00-fight-engine.md](00-fight-engine.md).
Generated appendices: [01a-script-inventory.md](01a-script-inventory.md) (which scripts exist where),
API usage table via `python docs/spec/combat/tools/script_api_usage.py vendor`.

## 0. Key finding

**DDTank41 contains no PvE script sources.** `Game.Logic/AI/{Game,Mission,Npc}` only hold the abstract bases and the
`Simple*` fallbacks (`SimplePVEGameControl`, `SimpleMissionControl`, `SimpleBrain` — do nothing). Scripts are C# files
compiled at boot by `ScriptMgr.CompileScripts` into `GameServerScripts.dll` (`Game.Server/GameServer.cs:985-996`,
`Road.Service/App.config:56-57`, `Fighting.Server/FightServer.cs:90-101`) from a `scripts` folder that is not in the repo.
If a class is missing, `ScriptMgr.CreateInstance` returns null and the engine silently falls back to the empty
`Simple*` AI (`PVEGame.cs:256-261`, `1653-1662`; `SimpleNpc.cs:35-40`) → the dungeon "works" but NPCs never act and the
mission never ends. All script logic must therefore come from the donor `DDTank4.1` (607 classes) or be written new.

Inventory ([01a-script-inventory.md](01a-script-inventory.md), from strings in `Database/Game34.bak`):

| | DB references (≈) | donor classes | referenced & present | referenced & missing (heuristic) |
|---|---|---|---|---|
| Game (`APVEGameControl`) | 52 | 73 | see appendix | 13 (e.g. `ACDragon`, `WorldSoccerGame`, `VampireEarl*`, `RunRunChickenNightmare*`) |
| Messions (`AMissionControl`) | 174 | 259 | | 70 (e.g. `TVH12001…`, `RRCNM74xx…`, `DCNM24xx…`, `GK127x`, `GT117x`) |
| NPC (`ABrain`) | 570 | 275 | | ≈263 (some are column-bleed artefacts; verify) |

Total: 398 referenced classes exist in the donor; ~346 referenced names have no donor implementation (activity
dungeons, Christmas, world-cup, couple boss, "Nightmare" difficulty, Time Vortex etc.). 209 donor classes are not
referenced by this DB (dungeons from other versions; can be enabled by inserting DB rows).
Exact numbers must be re-checked once the `.bak` is restored (owned by `packages/db`): query
`Pve_Info.{Simple,Normal,Hard,Terror,Epic}GameScript`, `Mission_Info.Script`, `NPC_Info.Script`.

API compatibility: every hook overridden by donor scripts exists in DDTank41's bases (DDTank41's `AMissionControl`/`ABrain`
are supersets). Members the donor scripts call that **DDTank41 lacks** (from `script_api_usage.py`):
`Game.Param5/Param6` (PVEGame ints), `GetTeamFightPower()`, `CreateGate()`, `JumpToSpeed()`, `ChangeMissionDelay()`,
`CreateTip()`, `SendQuizWindow()/SendCloseQuizWindow()`, `SendPassDrama()`, `SendLivingToTop()`, `TakeConsortiaBossAward()`
— all exist in the donor's own `Source Server/Game.Logic`; port them from there. Overload/argument differences are not
detected by the tool — compile-test each ported script.

---

## 1. How a dungeon is loaded (DB → script classes)

```
Room (Dungeon/Exploration/Boss/FightLab/Freshman/Labyrinth/…) start
  └ StartGameAction → GameMgr.StartPVEGame(roomId, players, copyId=room.MapId, roomType, gameType, timeMode, hardLevel, levelLimits, currentFloor)
        Game.Server/Rooms/StartGameAction.cs:71, Game.Server/Games/GameMgr.cs:140-165
     pveInfo = copyId ∉ {0,100000} ? PveInfoMgr.GetPveInfoById(copyId) : PveInfoMgr.GetPveInfoByType(roomType, levelLimits)   GameMgr.cs:144
     new PVEGame(..., pveInfo, hardLevel, currentFloor)                                                           PVEGame.cs:218-272
        script = pveInfo.{Simple|Normal|Hard|Terror|Epic}GameScript by hardLevel (Easy→Simple)                    PVEGame.cs:1179-1190
        m_gameAI = ScriptMgr.CreateInstance(script) as APVEGameControl ; m_gameAI.Game = this ; OnCreated()
            ── the game script calls Game.SetupMissions("4201,4202,4203") and sets Game.TotalMissionCount       (donor AI/Game/*.cs)
        SessionId = currentFloor − 1 (Labyrinth/continue) else 0
     game.Prepare()  → GAME_CREATE, m_gameAI.OnPrepated()  (scripts usually set SessionId = 0)                    PVEGame.cs:1541-1562
  SetupMissions(csv): Misssions[1..n] = MissionInfoMgr.GetMissionInfo(id)                                          PVEGame.cs:1964-1978
  PrepareNewSession(): SessionId++ ; m_missionInfo = Misssions[SessionId] ;
        m_missionAI = ScriptMgr.CreateInstance(MissionInfo.Script) as AMissionControl ; OnPrepareNewSession()   PVEGame.cs:1622-1680
  Mission script: Game.LoadResources(npcIds), Game.LoadNpcGameOverResources(ids), Game.SetMap(mapId),
        later Game.CreateNpc/CreateBoss(npcId,…) → NPC_Info row → NpcInfo.Script → ABrain instance per living      PVEGame.cs:344-363, SimpleNpc.cs:35
```

DB tables (Game DB; procs in `Bussiness`):

| Table / proc | Class | Key columns | Source |
|---|---|---|---|
| `Pve_Info` / `SP_PveInfos_All` | `PveInfo` | Id, Name, Type (eRoomType), LevelLimits, `{Simple,Normal,Hard,Terror,Epic}TemplateIds` (reward preview items), `{…}GameScript`, Pic, Description, Ordering, AdviceTips, BossFightNeedMoney, LastFloor | `Bussiness/PveBussiness.cs:10-46`, `SqlDataProvider/Data/PveInfo.cs` |
| `Mission_Info` / `SP_Mission_Info_All` | `MissionInfo` | ID, Name, TotalCount, TotalTurn, Script, Success, Failure, Description, IncrementDelay, Delay, Title, Param1, Param2, TryAgain, TryAgainCost | `Bussiness/ProduceBussiness.cs:1303-1340` |
| `NPC_Info` / `SP_NPC_Info_All` | `NpcInfo` | ID, Name, Level, Camp, Type, Blood, BaseDamage, BaseGuard, Attack, Defence, Agility, Lucky, Delay, Experience, Immunity, X,Y,Width,Height (body rect), FireX, FireY, MoveMin, MoveMax, speed, Range, Alert, ModelID, ResourcesPath, Script, DropId, DropRate, CurrentBallId, Preserve, Probability | `ProduceBussiness.cs:1350-1405`, `SqlDataProvider/Data/NpcInfo.cs` |
| NPC chat lines | `NpcStatementsMgr` | random statements | `Game.Logic/NpcStatementsMgr.cs` |
| Drops | `DropInventory.CopyDrop(missionId, session)` / `NPCDrop(dropId)` | `Drop_Condiction` + `Drop_Item` | `Game.Logic/DropInventory.cs` |

Room → PvE permissions: on dungeon win `SetPvePermission(pveId, nextHardLevel)` (`PVEGame.cs:2130-2137`); FightLab `SetFightLabPermission` (`PVEGame.cs:802-808`).

## 2. PvE lifecycle

`CheckPVEGameStateAction` (`Game.Logic/Actions/CheckPVEGameStateAction.cs:15-141`), only runs when the wait timer elapsed:

| State | Condition | Action | Script hooks called |
|---|---|---|---|
| Inited | | `Prepare()` → Prepared, `GAME_CREATE` | game `OnPrepated` |
| Prepared | | `PrepareNewSession()` → SessionPrepared | mission `OnPrepareNewSession` (load resources, `SetMap`) |
| SessionPrepared | `turnIndex==0` or all `Ready` | `SetupStyle()`, `StartLoading()`: → Loading, `GAME_MISSION_INFO(113)`, `GAME_LOAD(103)`, wind pics, 61 s load timeout | |
| Loading | all loaded | `StartGame()` (`PVEGame.cs:2009-2089`) → GameStart; spawn players; `START_GAME(99)`; `WaitTime(players·2500+1000)` | mission `OnPrepareStartGame` |
| GameStart | (FightLab: when ≤1 pending action → `PrepareFightingLivings`) | `PrepareNewGame()` → Playing; `WaitTime(players·1000)` | mission `OnPrepareNewGame` (spawn NPCs/bosses), `OnStartGame` |
| Playing | current living not attacking and ≤1 pending action | `CanGameOver()` (all players dead → lose; else **mission `CanGameOver()`**) ? (Labyrinth+gate → `GameOverMovie`; maps 1166/1207/1209/1216 → `PrepareGameOver`; else `GameOver`) : (`GameStateModify==Waiting` → `WaitingGameState`; else `NextTurn`) | `CanGameOver`, `OnWaitingGameState` |
| PrepareGameOver | `CanEndGame` | `GameOver()` else re-call | `OnPrepareGameOver` |
| GameOver | `HasNextSession()` (won and `Misssions[SessionId+1]` exists) | `PrepareNewSession()` (next floor) else `GameOverAllSession()` | |
| ALLSessionStopped | `WantTryAgain`: 0 → `Stop()`; 1 → `ShowDragonLairCard` + next session; 2 → `SessionId--` and retry same mission | | game `OnGameOverAllSession` |

`PVEGame.NextTurn()` (`PVEGame.cs:1387-1493`), per turn:
1. clear dead, boxes, `ConfigLivingSayRule()` (every odd turn 0–3 random NPCs get `IsSay=true`, `PVEGame.cs:1323-1354`), `PrepareNewTurn` on all physicals (re-sends blood of NPCs with `isShowBlood`), `CreateBox`.
2. mission `OnNewTurnStarted()` (scripts spawn waves here).
3. `next = FindNextTurnedLiving()` (players + bosses). `turnIndex++`, `SendUpdateUiData` (`BARRIER_INFO 104`: `i32 turnIndex, i32 mission UpdateUIData(), i32 Param1, i32 Param3`, `PVEGame.cs:1944-1962`). Boss with `IsShowBloodBar` → `CHANGE_TARGET(73)`.
4. **NPC phase**: if there are living `SimpleNpc` with `Config.IsTurn` and `next.Delay >= PveGameDelay`: `MinusDelays(PveGameDelay)`; every NPC `PrepareSelfTurn` + `StartAttacking` (→ brain `OnBeginSelfTurn`, `OnStartAttacking`) simultaneously; `TURN` sent with the first NPC; all stop attacking; `PveGameDelay += MissionInfo.IncrementDelay`; CheckState. `PveGameDelay` starts at `MissionInfo.Delay` (`PVEGame.cs:1642`).
5. else normal turn for `next` (player or boss) exactly like PvP; wait timeout `(turnTime+20)·1000`.
6. mission `OnBeginNewTurn()`.

Remember `TurnedLiving.AddDelay` in PvE sets the delay to `IncrementDelay` instead of adding (`TurnedLiving.cs:134-137`).

Mission end packets: `GAME_MISSION_OVER(112)` (`PVEGame.cs:809-877`): `i32 bossCardCount, bool showLargeCard (+ str "show{n}.jpg", bool true), i32 n {i32 userId, i32 grade, i32 0, i32 min(gainGP,10000), bool isWin, i32 bossCardCount, i32 playerBossCards, bool false, bool false}, [if cards>0: i32 n {str resource}]`. `GAME_ALL_MISSION_OVER(115)` (`PVEGame.cs:944-1011`): `i32 n {i32 userId, i32 totalKill, i32 totalHurt, i32 totalScore, i32 totalCure, i32 0 ×8, i32 totalExp, bool isWin}, i32 nRes {str}`; then `WaitTime(16000|23000)` for cards.

## 3. Scripting API (what scripts call)

### 3.1 Hooks (override points)

| Base | Hook | Called from |
|---|---|---|
| `APVEGameControl` (`AI/APVEGameControl.cs`) | `OnCreated()`, `OnPrepated()`, `OnGameOverAllSession()`, `CalculateScoreGrade(score)`, `Dispose()` | `PVEGame.cs:263, 1555, 953` |
| `AMissionControl` (`AI/AMissionControl.cs`) | `OnPrepareNewSession`, `OnPrepareStartGame`, `OnPrepareNewGame`, `OnStartGame`, `OnStartMovie`, `OnNewTurnStarted`, `OnBeginNewTurn`, `CanGameOver(): bool`, `OnGameOver`, `OnGameOverMovie`, `OnPrepareGameOver`, `OnWaitingGameState`, `UpdateUIData(): int`, `CalculateScoreGrade(score)`, `OnShooted`, `OnDied`, `OnTakeDamage`, `OnMoving`, `OnMissionEvent(pkt)`, `OnGeneralCommand(pkt)`, `OnCalculatePoint(point, isDouble)`, `DoOther`, `GameOverAllSession`, `Dispose` | PVEGame state methods (§2) |
| `ABrain` (`AI/ABrain.cs`) — per NPC/boss, `Body` = living, `Game` = game | `OnCreated`, `OnBeginNewTurn`, `OnBeginSelfTurn`, `OnStartAttacking`, `OnStopAttacking`, `OnBeforeTakedBomb`, `OnAfterTakedBomb`, `OnAfterTakedFrozen`, `OnBeforeTakedDamage(src, ref dmg, ref crit)`, `OnAfterTakeDamage(src)`, `OnHeal(blood)`, `OnDie`, `Die`, `OnDieByBomb`, `OnDieNewMethod`, `OnDiedEvent`, `OnDiedSay`, `OnKillPlayerSay`, `OnShootedSay(delay?)`, `Dispose` | `SimpleNpc.cs`, `SimpleBoss.cs:286-440` |

Hook popularity in donor scripts: `OnBeginNewTurn` 528, `OnCreated` 350, `CalculateScoreGrade` 326, `OnStartAttacking` 275, `OnBeginSelfTurn` 267, `OnStopAttacking` 261, `OnPrepareNewSession` 259, `OnStartGame` 254, `UpdateUIData` 253, `CanGameOver` 253, `OnNewTurnStarted` 251, `OnGameOver` 251 …

### 3.2 Game (PVEGame/BaseGame) members used by scripts

Counts = uses in donor scripts. Full table: `script_api_usage.py`.

| Group | Members (C# signature, file:line) |
|---|---|
| Setup | `SetupMissions(string csv)` 93 `PVEGame.cs:1964`; `TotalMissionCount` 79; `SessionId` 58; `SetMap(int mapId)` 258 `BaseGame.cs:3037`; `LoadResources(int[] npcIds)` 252 `PVEGame.cs:1280`; `LoadNpcGameOverResources(int[] ids)` 251 `PVEGame.cs:1260`; `AddLoadingFile(int type, string path, string className)` 782 `BaseGame.cs:352`; `SendLoadResource(List<LoadingFileInfo>)` 77 `PVEGame.cs:1824`; `IsBossWar` 50; `BossCardCount` 39; `MissionInfo` 202 (`.TotalCount`, `.TotalTurn`, `.IncrementDelay`…); `TotalTurn`/`TotalCount` 79/30; `Param1..4` (+`Param5/6` donor-only); `WantTryAgain`; `HandLevel`; `MapPos`; `MapHistoryIds` |
| Spawning | `CreateNpc(npcId, x, y, type[, direction][, action][, LivingConfig])` 467 `PVEGame.cs:324-363`; `CreateBoss(npcId, x, y, direction, type[, action][, config])` 319 `PVEGame.cs:632-665`; `CreateWingBoss` `:667`; `BaseLivingConfig()` 128 `:304`; `CreatePhysicalObj(x,y,name,model,defaultAction,scale,rotation[,typeEffect])` 111 `:683`; `Createlayer(x,y,name,model,action,scale,rotation[,canPenetrate])` 395 `:699`; `Createlayerboss` 21; `CreateLayerTop` 3; `CreateBall(x,y,action)` 72 `:714`; `CreateBox()` 474 (drop boxes) `BaseGame.cs:692`; `CreateTransmissionGate` `:1158`; `RemovePhysicalObj(obj, send)` 410 `BaseGame.cs:1905`; `RemoveLiving(id)` 59; `ClearAllChild()`; `AddLiving` |
| Queries | `GetAllFightPlayers()` 260, `GetAllLivingPlayers()` 104, `GetAllPlayers()` 17, `FindRandomPlayer()` 216, `FindNearestPlayer(x,y)` 58, `FindFarPlayer(x,y)`, `FindPlayer(id)`, `FindPlayerWithId`, `FindlivingbyDir(npc)` 147 `BaseGame.cs:949`, `GetLivedLivings()` 144, `GetLivedNpcs(npcId)`, `FindAllNpc()`, `FindAllNpcLiving()`, `GetNPCLivingWithID(id)`, `FindLivingTurnBossWithID(id)`, `FindAllTurnBossLiving()`, `FindAppointDeGreeNpc(degree)`, `FindNearestAdverseNpc(x,y,camp)`, `FindPhysicalObjByName(name)` 44, `FindBombPlayerX(area)`, `GetFrostPlayerRadom()`, `GetDiedBossCount()`, `GetHighDelayTurn()`, `FindTurnNpcRank()`, `CurrentLiving`/`CurrentPlayer`/`CurrentTurnLiving`, `TurnIndex` 233, `TurnQueue`, `TotalKillCount` 174, `PlayerCount`, `Random` 1142 (`System.Random` — port as seeded RNG with `Next(max)`/`Next(min,max)`), `Map` (`.Info.ID`, `.Bound`) |
| Flow | `IsWin` 571 (scripts set it in `CanGameOver`/`OnGameOver`), `PveGameDelay` 74, `WaitTime(ms)`, `GetWaitTimerLeft()`, `AddAction(IAction)` 180, `CanEnterGate`, `CanShowBigBox`, `IsPassDrama`, `ConFineWind`, `ParamLiving` |
| Camera / UI | `SendObjectFocus(Physics, type, delay, finishTime)` 147 `PVEGame.cs:1874`; `SendFreeFocus(x,y,type,delay,finish)` 36; `SendGameFocus(...)` 16; `SendGameObjectFocus(type,name,delay,finish)` 12; `SendHideBlood(living, hide)` 37; `SendLivingActionMapping(living|obj, source, value)` 121; `SendMissionInfo()` 23; `SendUpdateUiData()` 13; `SendPlayersPicture(living,type,state)`; `SendPlayBackgroundSound(bool)`; `SendPlaySound(str)`; `SendSyncLifeTime()` |

### 3.3 Living (Body / SimpleNpc / SimpleBoss / Player) members

| Group | Members |
|---|---|
| Movement | `MoveTo(x, y, action, delay[, callback][, speed])` 353 (8 overloads `Living.cs:1173-1273`), `JumpTo(x,y,action,delay,type[,speed,cb,value])` 73 `:1082`, `FallFrom(x,y,action,delay,type,speed[,cb])` 22 `:938`, `FlyTo`, `BoltMove(x,y,delay)` 9, `SetXY`, `ChangeDirection(dir|living, delay)` 255 `:835`, `FindDirection(living)`, `Direction` 295, `X`/`Y` |
| Attack | `ShootPoint(x, y, ballId, minTime, maxTime, bombCount, time, delay[, cb])` 119 `:1910` (uses aim solver §4 of 02-bots), `Beat(target, action, dmg, crit, delay[, livingCount, attackEffect])` 130 `:739` (melee within `MaxBeatDis`), `BeatDirect(target, action, delay, count, effect)` 31, `RangeAttacking(fx, tx, action, delay, …)` 412 `:2235-2258` (hit every enemy with fx<X<tx), `CurrentDamagePlus`/`CurrentShootMinus` 631/231 (per-turn multipliers), `MaxBeatDis`, `FireX/FireY`, `Shoot`/`ShootImp` |
| Animation / talk | `PlayMovie(action, delay, movieTime[, cb])` 878 `:1560`, `Say(msg, type, delay[, finish])` 526 `:1650`, `CallFuction(LivingCallBack, delay)` 497 `:797` (delayed callback — the scripting "timer"), `SetRelateDemagemRect(x,y,w,h)` 21, `SetRect` 112, `SetOffsetY` 15, `IsSay` 36 |
| State | `Blood`/`MaxBlood`, `AddBlood(v)` 29, `Die([delay])` 38, `IsLiving` 99, `Config` (`LivingConfig`: CanTakeDamage, HaveShield, IsTurn, IsFly, IsHelper, KeepLife, isShowBlood, IsShowBloodBar, CanFrost, DamageForzen, CancelGuard, BallCanDamage, FriendlyBoss … `Game.Logic/LivingConfig.cs`), `State`, `DoAction`, `SyncAtTime`, `Properties1/2`, `Degree`, `BlockTurn`, `EffectList`, `Seal(target,type,delay)`, `AddEffect(effect, delay)`, `NpcInfo` |
| Boss only | `CreateChild(id, x, y, disToSecond, maxCount[, dir])`, `CreateBoss(...)`, `FindChildLivings()`, `RemoveAllChild()`, `RandomSay(msgs,type,delay,finish)`, `FindMostHatefulPlayer()` (`SimpleBoss.cs:121-285`) |

## 4. TypeScript scripting interface

> **Implemented (2026-10)** in `packages/fight/src/pve/` with one deliberate change: scripts keep the **C# PascalCase
> member names** (`this.Game.CreateNpc`, `this.Body.MoveTo`) instead of the camelCase API sketched below, so the donor
> classes transpile mechanically (`scripts/transpile-pve.ts`). Built-in scripts live in
> `packages/fight/src/pve/scripts/{generated,manual}` (not apps/game). Overloads are resolved by argument type at
> runtime; `ref` parameters become `{ v }` objects. Guide: `docs/guides/pve.md`.

### 4.0 Original proposal

Goals: (a) 1:1 mechanical port of the C# donor scripts (keep method names, argument order, ms delays), (b) later
admin-authored scripts stored in DB and hot-reloaded, (c) deterministic & sandboxed.

```ts
// packages/game-data/src/pve/script-api.ts  (types only; implemented in apps/game/src/combat/pve)
export type LivingCallBack = () => void;
export interface Point { x: number; y: number }

export interface LivingApi {
  readonly id: number; readonly x: number; readonly y: number; readonly isLiving: boolean;
  direction: 1 | -1; blood: number; readonly maxBlood: number;
  currentDamagePlus: number; currentShootMinus: number; maxBeatDis: number;
  config: LivingConfig; isSay: boolean; state: number; properties1: number; properties2: unknown;
  moveTo(x: number, y: number, action: string, delay: number, cb?: LivingCallBack, speed?: number): boolean;
  jumpTo(x: number, y: number, action: string, delay: number, type: number, speed?: number, cb?: LivingCallBack): boolean;
  fallFrom(x: number, y: number, action: string | null, delay: number, type: number, speed: number, cb?: LivingCallBack): boolean;
  changeDirection(dirOrTarget: 1 | -1 | LivingApi, delay: number): void;
  shootPoint(x: number, y: number, ballId: number, minTime: number, maxTime: number, bombCount: number, time: number, delay: number, cb?: LivingCallBack): boolean;
  beat(target: LivingApi, action: string, damage: number, crit: number, delay: number, livingCount?: number, attackEffect?: number): boolean;
  beatDirect(target: LivingApi, action: string, delay: number, livingCount: number, attackEffect: number): void;
  rangeAttacking(fx: number, tx: number, action: string, delay: number, opts?: { removeFrost?: boolean; directDamage?: boolean; players?: PlayerApi[] }): boolean;
  playMovie(action: string, delay: number, movieTime: number, cb?: LivingCallBack): void;
  say(msg: string, type: number, delay: number, finishTime?: number): void;
  callFunction(cb: LivingCallBack, delay: number): void;          // C# CallFuction (typo kept as alias)
  addBlood(v: number): number; die(delay?: number): void;
  setRelateDamageRect(x: number, y: number, w: number, h: number): void; setRect(x: number, y: number, w: number, h: number): void;
  addEffect(effect: EffectSpec, delay: number): void; seal(target: LivingApi, type: number, delay: number): void;
}
export interface NpcApi extends LivingApi { readonly npcInfo: Readonly<NpcInfo> }
export interface BossApi extends NpcApi {
  createChild(npcId: number, x: number, y: number, disToSecond: number, maxCount: number, direction?: number): void;
  findChildLivings(): NpcApi[]; removeAllChild(): void; randomSay(msgs: string[], type: number, delay: number, finish: number): void;
}
export interface PlayerApi extends LivingApi { readonly userId: number; readonly nickName: string; readonly grade: number; readonly delay: number }

export interface PveGameApi {
  readonly random: { next(max: number): number; next(min: number, max: number): number };
  readonly turnIndex: number; readonly playerCount: number; readonly missionInfo: Readonly<MissionInfo>;
  readonly currentLiving: LivingApi | null; readonly currentPlayer: PlayerApi | null; readonly map: { id: number; width: number; height: number };
  sessionId: number; totalMissionCount: number; isWin: boolean; pveGameDelay: number; bossCardCount: number;
  totalKillCount: number; param1: number; param2: number; param3: number; param4: number; param5: number; param6: number;
  canEnterGate: boolean; canShowBigBox: boolean; isBossWar: string; wantTryAgain: number;
  setupMissions(csv: string): void; setMap(mapId: number): boolean;
  loadResources(npcIds: number[]): void; loadNpcGameOverResources(npcIds: number[]): void;
  addLoadingFile(type: number, path: string, className: string): void;
  createNpc(npcId: number, x: number, y: number, type: number, direction?: number, action?: string, config?: Partial<LivingConfig>): NpcApi;
  createBoss(npcId: number, x: number, y: number, direction: number, type: number, action?: string, config?: Partial<LivingConfig>): BossApi;
  baseLivingConfig(): LivingConfig;
  createPhysicalObj(x: number, y: number, name: string, model: string, action: string, scale: number, rotation: number, typeEffect?: number): PhysObjApi;
  createLayer(x: number, y: number, name: string, model: string, action: string, scale: number, rotation: number, canPenetrate?: boolean): PhysObjApi;
  createBall(x: number, y: number, action: string): PhysObjApi; createBox(): void;
  removePhysicalObj(o: PhysObjApi, send: boolean): void; removeLiving(id: number): void;
  getAllFightPlayers(): PlayerApi[]; getAllLivingPlayers(): PlayerApi[]; findRandomPlayer(): PlayerApi | null;
  findNearestPlayer(x: number, y: number): PlayerApi | null; findFarPlayer(x: number, y: number): PlayerApi | null;
  findLivingByDir(npc: LivingApi): number; getLivedLivings(): LivingApi[]; getLivedNpcs(npcId: number): NpcApi[];
  getNpcLivingWithId(id: number): NpcApi[]; findPhysicalObjByName(name: string): PhysObjApi[];
  waitTime(ms: number): void; getWaitTimerLeft(): number; addAction(fn: () => void, delay: number): void;
  sendObjectFocus(o: LivingApi | PhysObjApi, type: number, delay: number, finish: number): void;
  sendFreeFocus(x: number, y: number, type: number, delay: number, finish: number): void;
  sendHideBlood(l: LivingApi, hide: number): void; sendLivingActionMapping(l: LivingApi | PhysObjApi, source: string, value: string): void;
  sendMissionInfo(): void; sendUpdateUiData(): void; sendPlaySound(s: string): void; sendPlayBackgroundSound(play: boolean): void;
}

export abstract class GameScript   { game!: PveGameApi; onCreated(){} onPrepared(){} onGameOverAllSession(){} calculateScoreGrade(_s: number){ return 0 } dispose(){} }
export abstract class MissionScript { game!: PveGameApi; onPrepareNewSession(){} onPrepareStartGame(){} onPrepareNewGame(){} onStartGame(){}
  onNewTurnStarted(){} onBeginNewTurn(){} canGameOver(){ return true } onGameOver(){} onGameOverMovie(){} onPrepareGameOver(){}
  onWaitingGameState(){} updateUIData(){ return 0 } calculateScoreGrade(_s: number){ return 0 } onShooted(){} onDied(){}
  onTakeDamage(){} onMoving(){} onMissionEvent(_p: PacketReader){} onGeneralCommand(_p: PacketReader){} onCalculatePoint(_p: number, _d: boolean){} doOther(){} dispose(){} }
export abstract class BrainScript<B extends LivingApi = NpcApi> { body!: B; game!: PveGameApi; onCreated(){} onBeginNewTurn(){} onBeginSelfTurn(){}
  onStartAttacking(){} onStopAttacking(){} onBeforeTakedBomb(){} onAfterTakedBomb(){} onAfterTakedFrozen(){}
  onBeforeTakedDamage(_src: LivingApi, _dmg: { damage: number; critical: number }){} onAfterTakeDamage(_src: LivingApi){} onHeal(_b: number){}
  onDie(){} die(){} onDieByBomb(){} onDieNewMethod(){} onDiedEvent(){} onDiedSay(){} onKillPlayerSay(){} onShootedSay(_delay?: number){} dispose(){} }
```

Registry & loading:
- Scripts are referenced by their **original C# full name** (`GameServerScript.AI.Messions.CHM1271`) so DB rows need no migration: `registerScript('GameServerScript.AI.Messions.CHM1271', CHM1271)`.
- Built-in scripts live in `apps/game/src/combat/pve/scripts/{game,missions,npc}/<ClassName>.ts` (one file per C# file; class names unchanged; code ported mechanically: `Body.X` → `this.body.x`, `ref int` params → mutable object, `List<T>` → arrays, `Game.Random.Next` → `this.game.random.next`).
- Missing script → log error **and** fall back to a generic brain (`SimpleNpcAi` port: walk to nearest player, `Beat` if within range, else `ShootPoint` with `NpcInfo.CurrentBallId`) instead of the C# do-nothing fallback, so dungeons with missing donor scripts stay playable.
- Admin-authored scripts (phase 2): table `pve_script(id, full_name unique, kind enum(game,mission,brain), source_ts text, compiled_js text, version, enabled, updated_by, updated_at)`; compiled with esbuild in the admin API, executed in `node:vm` contexts (or `isolated-vm`) exposing only the API above; per-call CPU budget (e.g. 50 ms) → on timeout the living skips its turn. DB scripts override built-ins with the same `full_name`.
- Determinism: one seeded RNG per game (log seed for replays); no wall-clock access in scripts (use `waitTime`/`callFunction`).

## 5. Rewards

| What | Formula | Source |
|---|---|---|
| Mission EXP | `if TotalKillCount==0 → 1`; `gap = |grade − TotalNpcGrade/TotalKillCount|`; `gap ≥ 7 → 1`; `share = 0.4·kills/TotalKillCount + 0.4·hurt/TotalHurt + (alive ? 0.4 : 0)`; `levelK = gap∈[3,4] ? 0.7 : gap∈[5,6] ? 0.4 : 1`; `teamK = (0.9 + (beginPlayers−1)·0.4)/playerCount`; `exp = (int)(TotalNpcExperience · share · levelK · teamK)` (0→1); + guild % buff; displayed capped at 10000 | `PVEGame.cs:365-402, 838-862` |
| Kill counters | only kills made during a player's turn, `Config.CanCountKill` | `PVEGame.cs:1238-1246` |
| Score | `(200 − turnIndex)·5 + kills·5 + (int)(blood/maxBlood)·10` (int cast → 0 unless full HP), lose −400; graded by script `CalculateScoreGrade` | `PVEGame.cs:414-422` |
| Boss cards | `BossCardCount = 1`, 0 if lost or last session, 2 if won and not last (non-trainer) | `PVEGame.cs:791-801` |
| Card flip | `DropInventory.CopyDrop(missionId, 1)` → items/gold/money/gifttoken into temp bag; Dungeon: `CanTakeOut` cards each; final "all missions" flip `CanTakeOut = 2` for Dungeon win, 1 otherwise, 0 lose; auto-flip at `Stop` | `PVEGame.cs:2166-2252, 962-978, 2112-2129` |
| Big box (Labyrinth) | `CopyDrop(missionId, SessionId)` | `PVEGame.cs:1495-1515` |
| NPC drops | per kill `NPCDrop(NpcInfo.DropId)` | `SimpleNpc.cs` `GetDropItemInfo` |
| Leaving | `−grade·12` GP | `PVEGame.cs:1687` |

## 6. Special PvE modes

| Mode | Notes / source |
|---|---|
| Dungeon (roomType 4) | multi-mission via `SetupMissions`; 21 card slots; `UpdateBarrier(SessionId, "show{n}.jpg")` (`PVEGame.cs:1663-1670`) |
| Exploration (2) / Boss (3) | `PveInfoMgr.GetPveInfoByType(roomType, levelLimits)` picks the PveInfo by level band (`PveInfoMgr.cs:79`) |
| FightLab (5) | training missions (`FightLab*` scripts), `SetFightLabPermission` |
| Freshman (10) | tutorial (`NewTrainingGame*`), `isTrainer()` → no 2nd boss card |
| Labyrinth (15) | floors = sessions, `currentFloor`, transmission gate (`EnterNextFloor`, `TransmissionGateCommand 137`), `OutLabyrinth`, `UpdateLabyrinth` awards (`PVEGame.cs:1013-1156`) |
| Try again | `GAME_MISSION_TRY_AGAIN(119)` → `WantTryAgain` 2 retries the session, cost `MissionInfo.TryAgainCost` (`Cmd/TryAgainCommand.cs`) |
| World boss (14 WordBossFight) | schedule/HP/rank on Center (`Center.Server/WorldMgr.cs:144-220`: `SetupWorldBoss(pveId)`, `MAX_BLOOD`, `UpdateRank(damage, honor, nick)`); scene handlers on Game server (`Game.Server/WorldBoss/Handle/*`: EnterRoom, Move, BuyBuff, RequestRevive, Status, LeaveRoom); fight = normal PVEGame whose players carry `WorldbossBood`/`AllWorldDameBoss` (`PVEGame.cs:229-230`) and world-boss buffs (`FightBuffers.WorldBossAddDamage/HP`, `Game.Server/Buffer/WorldBoss*Buffer.cs`) |
| Consortia boss (17) | `Center.Server/ConsortiaBossMgr.cs`, script `ConsortiaScorpionBoss`, `TakeConsortiaBossAward` (donor-only API) |
| Others in enums | CoupleBoss 20, ActivityDungeon 21, SpecialActivityDungeon 23, CatchBeast 26 (balls 128/129), Christmas 40, FightFootballTime 30 (balls 110/117, no death), CampBattle — scripts mostly **missing** in donor (see appendix); schedule as phase-3 content |

## 7. Port plan

1. Engine hooks exactly as §2 (call sites + try/catch per hook: a script exception must never kill the game loop — the C# code wraps every call).
2. Port the generic brains first (`SimpleNpcAi`, `SimpleBomblingNpc`, `SimpleCaptainAi`, …) and one complete dungeon end-to-end (e.g. donor `AntCaveSimpleGame` + its missions/NPCs) as golden test.
3. Bulk-port donor scripts with a codemod (C#→TS AST transform: Roslyn dump → TS), then hand-fix; track status per class in the admin panel ("ported / tested / missing").
4. For the ~346 missing references: either remap the DB rows to an existing donor script with similar behaviour or author new TS scripts.
