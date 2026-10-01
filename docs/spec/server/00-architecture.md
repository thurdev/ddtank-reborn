# 00 — Lobby-side server architecture (Center / Game("Road") / Fighting)

Scope: `vendor/DDTank41` projects **Center.Server + Center.Service**, **Game.Server + Road.Service**, **Game.Base**,
**Bussiness**, **SqlDataProvider**. Fighting.Server/Game.Logic internals are in `docs/spec/combat/`; the HTTP side
(Tank.Request `.ashx`) is in `docs/spec/request/`. Every statement cites the C# file it comes from; line numbers
refer to the vendored tree.

## 1. Process topology

```
 Browser (Flash client)                       Website / Tank.Request (.ashx, IIS)
   │  HTTP: login.ashx, *.xml templates            │   CreateLogin → WCF CenterService.CreatePlayer(id,name,key)
   │  TCP 9500 (game protocol, XOR-encrypted)      │   ChargeMoney / MailNotice / KitoffUser / Reload (WCF)
   ▼                                               ▼
 ┌──────────────────────────┐  TCP 9202 (GSPacket, RSA login)  ┌──────────────────────────────┐
 │ Road.Service.exe          │◄───────────────────────────────►│ Center.Service.exe            │
 │  = Game.Server (lobby)    │                                   │  = Center.Server              │
 │  rooms, chat, shop, guild │   (one connector per center;      │  LoginMgr (who is online      │
 │  PvE & "Freedom" PvP run  │    OtherLoginServer = extra        │  where), ServerMgr, world     │
 │  IN-PROCESS (Game.Logic)  │    centers for cross-server chat)  │  boss / guild boss state,     │
 └──────────┬────────────────┘                                   │  macro drop, timers, WCF host │
            │ TCP 9208 (GSPacket, RSA login, key "1,7road")      │  net.tcp 2009 + http 2008     │
            ▼                                                    └──────────────────────────────┘
 ┌──────────────────────────┐
 │ Fighting.Service.exe      │  matchmaking + "Match" (auto-pair PvP / guild war / league) games
 │  = Fighting.Server        │  players are proxied: Road forwards their packets, Fight sends results back
 └──────────────────────────┘
 All three talk directly to SQL Server: Player DB (`conString`) + Game/template DB (`crosszoneString`).
```

* **Center.Service** (`Center.Service/Program.cs`, `Actions/ConsoleStart.cs`): console host for `CenterServer`.
  Console commands: `exit`, `notice&<text>`, `reload&<eReloadType>`, `shutdown`, `help`, `AAS&true|false`,
  `/<cmd>` → `Game.Base.CommandMgr`.
* **Road.Service** (`Road.Service/Actions/ConsoleStart.cs`): console host for `GameServer`. Commands: `exit`, `cp`
  (stats), `shutdown` (6-minute countdown, `GameServer.Shutdown`), `clear`, `<x>&reload` for ball, drop, map,
  mapserver, prop, item, shop, quest, npc, fusion, consortia, rate, fight, dailyaward, language, strengthen, itembox,
  pet, cfg, gp, eventlive, commands; `petskill`, `mission`, `pve`, `itembox`, `eventaward`, `goldequip`,
  `strengthen`, `nickname`, `senditem`, `resetquest`, `chargetouser`, `reloadall`.
* **Fighting.Service**: hosts `Fighting.Server` on 9208 (config `Fighting.Service/App.config`).
* A game server = one "line"/channel (`Server_List` row, `ServerID` config). Several game servers can share one
  center. `ZoneId`/`AreaID` identify the region for cross-zone features (bugle 73, crosszone rooms, Battle server id 2).

**TS port:** `apps/game` merges all three. Keep the *logical* boundaries as modules: `center` (online registry,
global broadcasts, world/guild boss state, timers), `lobby` (this spec), `fight` (combat spec). Inter-module calls
replace the TCP protocols in §4/§5, but the semantics (who broadcasts what) must be preserved because the Flash
client sees the results.

## 2. Ports & endpoints (defaults in shipped configs)

| What | Where configured | Default |
|---|---|---|
| Center TCP listener (game servers connect) | Center `IP`, `Port` | 127.0.0.1:9202 |
| Center WCF service (website/admin call it) | Center.Service App.config `system.serviceModel` | `net.tcp://127.0.0.1:2009/`, `http://127.0.0.1:2008/CenterService/` (+ mex) |
| Game TCP listener (Flash client) | Road `IP`, `Port` (bind address; clients get the address from `Server_List.IP/Port` via serverlist.xml) | 127.0.0.1:9500 |
| Flash socket policy | same port as game: first byte `<` (0x3C) answered with the XML policy (`GameClient.cs:141`) | 9500 (port 843 is **not** served by the C# server; the TS server should serve both) |
| Fight server | Road `battle.xml` (`<server id ip port key>`) — **not** `FightServerIp/Port` keys (unused) | id 4, 127.0.0.1:9208, key `1,7road` |
| PassPort SOAP (unused at runtime) | Road App.config client endpoint `PassPortSoap` | `http://127.0.0.1/admingunny/Flash_Port/PassPort.asmx` |

## 3. Client transport (summary — full codec in `packages/protocol`)

* Frame = 20-byte header (`Game.Base/Packets/GSPacketIn.cs`): `u16 0x71AB`, `u16 length` (incl. header),
  `u16 checksum` (`(119 + Σ bytes[6..len)) & 0x7F7F`), `i16 code`, `i32 clientId`, `i32 param1`, `i32 param2`,
  then body. Max 8192 bytes. Big-endian.
* Encryption (`StreamProcessor.cs`): both directions start with key `AE BF 56 78 AB CD EF F1`; after LOGIN the
  8-byte key from the RSA blob replaces it. Stream cipher per byte: `k[i%8] = (k[i%8] + c[i−1]) ^ i`;
  `p[i] = (c[i] − c[i−1]) ^ k[i%8]` (i>0), `p[0] = c[0] ^ k[0]`; key evolves per packet (see protocol spec).
  Game↔center and game↔fight links are **not** XOR-encrypted (`Encryted=false`), only RSA-authenticated.
* Strict framing: on a bad header the connection is dropped if `Strict` (client connections: true).

## 4. Center ⇄ Game protocol (TCP 9202)

Handshake (`ServerClient.OnConnect`, `LoginServerConnector.HandleRSAKey`):
1. Center → Game **0 RSAKey** {bytes modulus(128), bytes exponent}.
2. Game → Center **1 LOGIN** {bytes RSA(`"<serverId>,<serverName>"`)}; center accepts only if `ServerMgr` has that id
   with State 1 (not already connected), sets State 2 (online), then pushes **8 UPDATE_CONFIG_STATE** and world event.
3. Game → Center **240 IP_PORT** {bytes ipv4(4), int port} (center ignores it).

Game → Center (`Center.Server/ServerClient.cs:472` OnRecvPacket):

| Code | Name | Payload | Center action |
|---|---|---|---|
| 3 | ALLOW_USER_LOGIN (request) | int userId | `LoginMgr.TryLoginPlayer(id, this)`: player must have been registered by the website (`CreatePlayer`) and not be on another server; if on another server in Play state → kick there (2). Reply **3 {int id, bool allow}**. |
| 4 | USER_OFFLINE | int n, n×{int id, int consortiaId} | `PlayerLoginOut`; rebroadcast to all servers. |
| 5 | USER_ONLINE | int n, n×{int id, int consortiaId} | `PlayerLogined` (state Play); broadcast to other servers. |
| 6 | USER_STATE (query) | int id | reply 6 (clientId=id) {bool online}. (No game-side handler for the reply.) |
| 10 | SYS_NOTICE / item strengthen notice | opaque | broadcast to other servers. |
| 11 | SYS_CMD reload result | int type, int serverId, bool ok | console log. |
| 12 | PING | int onlineCount | `Info.Online`, `Info.State = GetState(online,total)` (2 normal, 4 >50 %, 5 full). Sent every PingCheckInterval. |
| 13 | UPDATE_PLAYER_MARRIED_STATE | int userId | forwarded to that player's server. |
| 14 | MARRY_ROOM_INFO_TO_PLAYER | int userId, … | forwarded to that player's server. |
| 15 | SHUTDOWN | int serverId, bool stopping | log. |
| 19 | SCENE_CHAT | byte channel, … | only channel 3 (guild) → broadcast to other servers. |
| 37 | CHAT_PERSONAL | whisper | broadcast to **all** servers (each delivers to the nick if local). |
| 72, 73 | B_BUGLE / C_BUGLE | | broadcast to other servers. |
| 81 | WORLD_BOSS_RANK | int damage, int honor, str nick | `WorldMgr.UpdateRank` → 81 top-10 to all. |
| 82 | WORLD_BOSS_FIGHTOVER | — | → 82 to all. |
| 83 | WORLD_BOSS_ROOMCLOSE | — | → 83 {byte 0} to all. |
| 84 | WORLD_BOSS_UPDATEBLOOD | int damage | `ReduceBlood` → 79 {long max, long current} to all. |
| 85 | WORLDBOSS_PRIVATE_INFO | str nick | → 85 {str, int damage, int honor} to all. |
| 86 | WORLD_BOSS_VIEW_RANK | — | → 81 to all. |
| 117 | MAIL_RESPONSE | int userId, … | forwarded to that player's server. |
| 128 | CONSORTIA_RESPONSE | byte sub, … | broadcast to **all** servers (incl. sender). Subs 1 user pass, 2 delete, 3 user delete, 4 invite, 5 ban chat, 6 upgrade, 7 ally, 8 duty, 9 riches offer, 10 shop up, 11 smith up, 12 store up, 13 skill up — see `LoginServerConnector.Send*` for layouts. |
| 130 | CONSORTIA_CREATE | int cid, int offer, str name | broadcast to all. |
| 156 | CONSORTIA_OFFER | int cid, int offer, int riches | parsed, nothing else. |
| 158 | CONSORTIA_FIGHT | int cid, int riches, str msg | broadcast to all (guild war result chat line). |
| 160 | IM_CMD | byte 165/166, … | broadcast to other servers (friend state / friend-added notice). |
| 178 | MACRO_DROP | int n, n×{int templateId, int count} | `MacroDropMgr.DropNotice` (decrement global drop quotas). |
| 180–186 | CONSORTIA_BOSS_* | add / rank / extend / create / reload / blood | `ConsortiaBossMgr`; re-broadcast 180 {…, byte subcode}. |
| 123, 165, 166 … | others | | ignored |

Center → Game (`Game.Server/LoginServerConnector.cs:38` AsynProcessPacket, run on the thread pool):

| Code | Name | Payload | Game action |
|---|---|---|---|
| 0 | RSAKey | modulus, exponent | handshake (above). |
| 2 | KITOFF_USER | int userId, str msg | `SendKitoff(msg)` + disconnect; if not online send 4 back. |
| 3 | ALLOW_USER_LOGIN | int userId, bool allow | allow → `LoginMgr.LoginClient(id)` → `GamePlayer.Login()`; success → 5 USER_ONLINE + `WorldMgr.OnPlayerOnline`, failure → disconnect + 4 USER_OFFLINE. |
| 4 | USER_OFFLINE | int n, n×{id, cid} | release pending login (resend 3), `WorldMgr.OnPlayerOffline` (friend/guild state). |
| 5 | USER_ONLINE | int n, n×{id, cid} | if that player is also here → kick "LoginNext" (logged in elsewhere). |
| 7 | UPDATE_ASS | bool | anti-addiction on/off → `SendAASControl` to all. |
| 8 | UPDATE_CONFIG_STATE | bool AAS, bool dailyAward | `AwardMgr.DailyAwardState`, AAS. |
| 9 | CHARGE_MONEY | clientId=userId, str chargeId | `player.ChargeToUser()` (credits pending `Charge_Money` rows). |
| 10 | SYS_NOTICE | int type, str msg | resend to every local player. |
| 13 | UPDATE_PLAYER_MARRIED_STATE | int userId | reload marry props/notices, clear marry quests. |
| 14 | MARRY_ROOM_INFO_TO_PLAYER | int userId, … | resend to that player as code 252. |
| 15 | SHUTDOWN | — | `GameServer.Shutdown()` (6-min countdown). |
| 19 | SCENE_CHAT (guild) | | to local members of the guild. |
| 37 | CHAT_PERSONAL | int, str toNick, str fromNick, str msg, bool auto | deliver if `toNick` online here and not blacklisting. |
| 38 | SYS_MESS | int 1, int userId, str | error message to a player. |
| 72, 73 | bugles | | to all local players. |
| 117 | MAIL_RESPONSE | int userId, … | forward to that player ("you have mail"). |
| 128 | CONSORTIA_RESPONSE | byte sub, … | update local caches/players of that guild (`HandleConsortia*`). |
| 130 | CONSORTIA_CREATE | int cid, … | `ConsortiaMgr.AddConsortia(cid)`. |
| 158 | CONSORTIA_FIGHT | int cid, int, str msg | chat line to guild members. |
| 160 | IM_CMD | byte 165 state / 166 response | friend online state / "X added you". |
| 177 | Rate | int serverId | `RateMgr.ReLoad()`. |
| 178 | MACRO_DROP | int n, n×{int tpl, int count, int max} | `MacroDropMgr.UpdateDropInfo`. |
| 180 | CONSORTIA_BOSS_INFO | full boss state + rank + byte subcode | update local cache, notify guild members (open/close/die/extend). |
| 185 | CONSORTIA_BOSS_AWARD | int n, n×cid | `ConsortiaBossMgr.SendConsortiaAward` (riches). |
| 79–85 (eChatServerPacket WORLD_BOSS_*) | world boss | | `RoomMgr.WorldBossRoom.*`. |
| 904–912 | elite game | status / rank / start / round / players / reload | `ExerciseMgr` elite championship state. |
| **11** | **SYS_CMD reload** | int eReloadType | **Not dispatched** (`HandleReload` exists but no `case 11`) → center `reload` and WCF `Reload()` do nothing on game servers. Bug. |

Timers in the center (`CenterServer.InitGlobalTimers`):

| Timer | Period | Action |
|---|---|---|
| SaveTimerProc | `SaveInterval` min | `ServerMgr.SaveToDatabase` (`SP_Service_Update` online counts). |
| SystemNoticeTimerProc | `SystemNoticeInterval` min | random line of `Languages/SystemNotice.xml` → 10 SYS_NOTICE to all servers. |
| LoginLapseTimerProc | `LoginLapseInterval` min | remove website-registered players that never logged in. **Bug:** compares ticks with `interval×10×1000` (= ms, not minutes) → expires at the next tick. |
| SaveRecordProc | `SaveRecordInterval` min | `LogMgr.Save` (registration/online statistics). |
| ScanAuctionProc | `ScanAuctionInterval` min | `PlayerBussiness.ScanAuction(ref ids, Cess)` (`SP_Auction_Scan`) → 117 to all for each affected user. |
| ScanMailProc | `ScanMailInterval` min | `SP_Mail_Scan` (expire mail/COD returns) → 117. |
| ScanConsortiaProc | `ScanConsortiaInterval` min | `SP_Consortia_Scan` (auto-disband/maintenance) → 128 {2, cid} per deleted guild. |
| ScanWorldEventProc | 60 s | `SendUpdateWorldEvent` (body commented out: league open/close). |
| ScanConsortiabossProc | 60 s | `ConsortiaBossMgr.UpdateTime` (close expired bosses, daily reset); every 6th tick 185 award list. |
| MacroDropMgr | 5 min (`System.Timers`) | every 12 ticks (1 h) reset quotas from `macrodrop/macroDrop.ini` (`[n] TemplateId, Time, Count`); sync 178 to all servers once all have reported. |

WCF `ICenterService` (`Center.Server/CenterService.cs`), used by Tank.Request/GameAdmin:
`GetServerList`, `ChargeMoney(userId, chargeId)` (→ 9), `SystemNotice(msg)`, `KitoffUser(id,msg)`,
`ReLoadServerList`, `MailNotice(id)` (→ 117), `ActivePlayer(bool)` (stats), `CreatePlayer(id,name,password,isFirst)`
(**login ticket**: stores `name/password` in `LoginMgr`), `ValidateLoginAndGetID(name,password[,zoneId])`
(used by the game server LOGIN), `AASUpdateState`, `AASGetState`, `ExperienceRateUpdate(serverId)` (→ 177),
`NoticeServerUpdate(serverId,type)` (→ 11), `UpdateConfigState(type,state)` (persists to Center.Service.exe.config
and → 8), `GetConfigState`, `Reload(type)`. Note the client contract (`Bussiness/CenterService/ICenterService.cs`)
sends an extra `zoneId` argument the server contract lacks (works because WCF ignores unknown elements).

## 5. Game ⇄ Fighting protocol (TCP 9208)

`Game.Server/Battle/*`. Handshake: fight sends 0 RSAKey; game replies 1 {RSA(`key` from battle.xml)}.
Only rooms of type **Match** (eRoomType 0) go to the fight server; Freedom PvP and all PvE run in-process.

Game → Fight (`FightServerConnector`):

| Code | Purpose | Payload |
|---|---|---|
| 1 | login | RSA(key) |
| 2 | forward a client game packet | clientId = gameId; nested full GSPacket (header+body) |
| 3 | fight notice | clientId = gameId, param1 = player.GameId |
| 19 | in-game chat | clientId = gameId; int gamePlayerId, bool team, str msg |
| 36 | prop-use result | clientId = gameId, param1 = playerId, param2 = templateId; bool ok |
| 64 | **AddRoom** (start matchmaking) | int roomId, int roomType, int gameType, int guildId, int pickUpNpcId, bool startWithNpc, bool false, bool isCrosszone, int n, n×**player snapshot** (id, userName, isViewer, zoneId, zoneName, currentEnemyId, nick, sex, hide, style, colors, skin, offer, gp, grade, repute, cid, cname, consortiaLevel, consortiaRepute, showConsortia, badgeId, honor, achievementPoint, weaklessGuildProgress, moneyPlus, fightPower, nimbus, apprenticeshipState, masterId, masterOrApprentices, atk, def, agi, luck, hp, double baseAtk, baseDef, baseAgi, baseBlood, weapon {tpl, strLvl, goldTpl[, date, valid]}, bool canUseProp, secondWeapon {tpl, strLvl}, healstone {tpl, count}, double gpRate, offerRate, gpApprenticeOnline, gpApprenticeTeam, gpSpouseTeam, int serverId, buffs[{type, exist, begin, valid, value}], equipEffects[int], fightBuffs[{type, value}], byte typeVIP, int vipLevel, date vipExpire, bool dailyLeagueFirst, int dailyLeagueLastScore, pet{…}?, cardBuffs[int]) — `FightServerConnector.SendAddRoom` |
| 65 | RemoveRoom (cancel) | param1 = roomId |
| 77 | consortia ally reply | clientId = gameId; int state, int richesRate |
| 83 | player disconnected | clientId = gameId, param1 = playerId |

Fight → Game (`FightServerConnector.AsynProcessPacket`): 0 RSA key; 19 chat to player; **32 send-to-player**
(nested packet relayed to client); 33 update GamePlayerId/TempGameId (param1 player, param2 id); 34 disconnect player;
35 OnGameOver(bool win, int gameClass, bool …, …); 36 use prop (Parameter1/2 = bag/place, int tpl, bool); 38 AddGold;
39 AddGP; 40 OnKillingLiving; 41 OnMissionOver; 42 ConsortiaFight (guild war result → `ConsortiaMgr.ConsortiaFight`);
43 SendConsortiaFight (chat → center 158); 44 RemoveGold; 45 RemoveMoney; 48 AddTemplate (loot item);
49 RemoveGP; 50 RemoveOffer; 51 AddOffer; 52 AddRobRiches; **65 room removed** (cancel pickup / stop proxy);
**66 StartGame** (param1 roomId, param2 gameId; int roomType, int gameType, int timeType → `ProxyGame`);
**67 send-to-room** (nested packet to every room member, param1/2 = except player/gameId); **68 StopGame**;
73 remove healstone; 74 AddMoney (param2 = 1 → bound); 75 AddGiftToken; 76 AddMedal; 77 find consortia ally;
84 AddLeagueMoney; 85 AddPrestige(bool, roomType); 86 UpdateRestCount (league); 88 FightNPC → `RingStationMgr.CreateAutoBot`
(arena bot opponents when no human match found); 89 AddActiveMoney. Details & combat-side semantics: combat spec.

`BattleMgr` (`Battle/BattleMgr.cs`) reads `battle.xml`, connects all, `AddRoom` uses the first active server
(`FindActiveServer(isCrosszone)` prefers id 2 for crosszone). Auto-reconnect up to 3 retries per 3 min.
**Bug:** `RemoveServer` does `Disconnected += …` instead of `-=` (handler leak/duplicate reconnects).

## 6. Startup sequence

Center (`CenterServer.Start`, Center.Server/CenterServer.cs:897):
`GameProperties.Refresh` (Server_Config) → compile scripts → register script events → **edition check**
(`GameProperties.EDITION == "2612558"`, else abort) → listen 9202 → open WCF host → `ServerMgr.Start`
(`SP_Service_List`, all servers State 1) → `MacroDropMgr.Init` → `LanguageMgr.Setup` → `WorldMgr.Start`
(load SystemNotice.xml) → global timers → `NewTitleMgr.Init` → `WorldEventMgr.Init` → `MacroDropMgr.Start` → accept.

Game (`GameServer.Start`, Game.Server/GameServer.cs:1149) — order matters (later managers use earlier caches):
1. `GameProperties.Refresh()`; recompile scripts (failure ignored); `ConsortiaLevelMgr.Init`; script events;
   edition check `"2612558"`.
2. Listen `IP:Port`; allocate packet buffers (`MaxClientCount×3` × 8 KiB); `LogMgr.Setup`.
3. `WorldMgr.Init` (RSA private key from config `PrivateKey`, marry & hot-spring scenes from `SP_Service_Single`,
   edicts `SP_Edictum_All`, caddy rank).
4. Template caches: MapMgr, ItemMgr, ItemBoxMgr, BallMgr, ExerciseMgr, LevelMgr, BallConfigMgr, FusionMgr,
   UserBoxMgr, AwardMgr, AchievementMgr, NPCInfoMgr, MissionInfoMgr, PveInfoMgr, DropMgr, FightRateMgr,
   RefineryMgr, StrengthenMgr, PropItemMgr, ShopMgr, QuestMgr (see §8 for tables).
5. `RoomMgr.Setup(MaxRoomCount from Server_List.Room)`; `GameMgr.Setup(serverId, BOX_APPEAR_CONDITION)`;
   ConsortiaMgr, ConsortiaExtraMgr, LanguageMgr, RateMgr, WindMgr, CardMgr, CardBuffMgr, FairBattleRewardMgr,
   PetMgr, MacroDropMgr, MarryRoomMgr, RankMgr, CommunalActiveMgr, QQTipsMgr, SubActiveMgr, EventAwardMgr,
   EventLiveMgr, AcademyMgr, `BattleMgr.Setup` (battle.xml).
6. `InitGlobalTimer`, `LogMgr.Setup(1, …)`, `ScriptEvent.Loaded` (→ `PacketProcessor` registers handlers).
7. **Connect to center** (`InitLoginServer`; failure aborts), other centers (`OtherLoginServer` = `"id:ip:port|…"`).
8. HotSpringMgr, PetMoePropertyMgr, RingStationMgr ("AutoBot"), RobotManager, LittleGameWorldMgr, TaskMgr,
   AccumulActiveLoginMgr, NewTitleMgr, ConsortiaTaskMgr, ActiveMgr, WorldEventMgr, ActiveSystemMgr,
   FightSpiritTemplateMgr, ClothGroupTemplateInfoMgr, ClothPropertyTemplateInfoMgr, TotemMgr, TotemHonorMgr.
9. Start `RoomMgr` thread, `GameMgr` thread, `BattleMgr` connections, `MacroDropMgr` timer; accept clients.

Center disconnect → game stops itself and retries `Start()` up to 4 times (`loginServer_Disconnected`).
Shutdown (`Stop`): marry rooms break-time update, stop rooms/games/world, ring station, disconnect center, timers.

## 7. Configuration

Full generated tables: `tools/out/config.md` (every `[ConfigProperty]`, every `AppSettings[...]` read, shipped
values). Summary:

**Database / shared (all three App.config):** `conString` (player DB, e.g. `Project_Player34`), `crosszoneString`
(game/template DB, e.g. `Project_Game34`), `LanguagePath` (`Languages\Language-vn.txt`), `ServerID`, `AreaID`,
`GameType`, `LogPath`, `TxtRecord`, `CountRecord`, `ScriptCompilationTarget`, `ScriptAssemblies`, `LogConfigFile`.

**Center (`CenterServerConfig`)**: `IP` (127.0.0.1), `Port` (9202), `LoginLapseInterval` (1 min),
`SaveInterval` (1), `SaveRecordInterval` (1), `ScanAuctionInterval` (60), `ScanMailInterval` (shipped 120),
`ScanConsortiaInterval` (shipped 1), `SystemNoticeInterval` (2), plus `AAS` (false), `DailyAwardState` (true),
`SystemNoticePath`, `HelpStr`. WCF endpoints in `system.serviceModel`.

**Game (`GameServerConfig`)**: `IP`, `Port` (9500), `ServerID` (row in `Server_List`; `Name`, `Room`=MaxRoomCount,
`Total`=MaxPlayerCount, `ZoneId`, `ZoneName` are loaded from DB, overriding config), `LoginServerIp/Port`,
`OtherLoginServer`, `PingCheckInterval` (min; shipped 3), `DBAutosaveInterval` (min; shipped 10),
`SaveRecordInterval`, `MaxClientCount` (8000), `PrivateKey` (RSA XML — client has the public half),
`InterName` (`sevenroad` → `SRInterface`), `AppID`, `SubID`, `Edition` (10990, unused; the checked edition is the DB one),
`DoubleEvent`, `Xu_Rate`, `IsSqlConfig`, `OpenPacketHandler` (debug), `ServerName(Short)`.
Keys present but **not read by Game.Server**: `GP_RATE`, `MONEY/EXP/GIFT_MIN/MAX_RATE_WIN/LOSE`, `Gold_Rate`,
`Gift_Rate`, `LeagueMoney_Win/Lose`, `MustStrengthenGold/ComposeGold/FusionGold`, `BoxAppearCondition`,
`CheckRewardItem`, `CheckCount`, `HymenealMoney`, `DivorcedMoney`, `MarryRoomCreateMoney`, `FastLimit`,
`FightServerIp/Port` (the fight server and Game.Logic read the rate keys — combat spec).

**DB-backed game properties (`Bussiness/GameProperties.cs`, table `Server_Config` key/value via
`SP_Server_Config_Single` / `SP_Server_Config_Update`; missing keys are inserted with the default):** 83 keys incl.
`Edition`, `BeginAuction`/`EndAuction`, `Cess` (auction tax 0.1), `CustomLimit` (`"20|20|20|20|20"` = min grade for
send-mail/auction-add/present-goods/present-money/marry-largess), `BoxAppearCondition`, `LimitCount/Mail/Money` &
`IsLimit*`, `NewChicken*` prices, `PetExp`, `DivorcedMoney`, `DivorcedDiscountMoney`, `MarryRoomCreateMoney`,
`HymenealMoney`, `SpaPriRoomContinueTime`, `SpaPubRoomLoginPay`, `VIPExpForEachLv`, `VirtualName`, `TimeForLeague`,
`GoldTimes`, `Academy*`, `LeftRouter*`, `EliteGameBlockWeapon`, `InlayGoldPrice`, `FastGrow*`, `LittleGame*`,
`DebugMode`, `VIPStrengthenEx`, `MissionRiches`, `Event*Date`, `WorldBossStart/End/ID1/ID2`, `GoldTimeStart/End`,
`CountHWIDLimit`, `CountIPLimit`, `LuckStar*`, `FightSpirit*`, `PRICE_COMPOSE_GOLD`, `RateAdvance`, `TimeX2`,
`HoleLevelUpExpList`, `WarriorFamRaid*`, `WishBeadLimitLv`… (complete list with defaults in `tools/out/config.md`).
`GameProperties.Refresh()` runs at boot; `eReloadType.server` would refresh but is not dispatched (see §4).

Other files read at runtime: `battle.xml` (Road), `macrodrop/macroDrop.ini` (center & game), `Languages/*.txt`,
`Languages/SystemNotice.xml` (center), `logconfig.xml` (log4net), compiled `scripts/` folder (ScriptMgr).

**Rates** (`RateMgr`, table `Rate` via `SP_Rate`, reloaded by center 177): `eRateType` multipliers (Experience,
Offer, Riches, …) with optional time windows; used by GP/offer/riches awards. `FightRateMgr` (`SP_Fight_Rate`).

## 8. Managers: responsibilities and boot caches

Generated table with every manager → Bussiness method → proc: `tools/out/managers.md`. Condensed:

| Manager (file) | Responsibility | Loaded from (proc → table) |
|---|---|---|
| WorldMgr (Game.Server/Managers/WorldMgr.cs) | online player registry `m_players`, nick lookup, scenes (marry, hot spring), RSA decryptor, edicts (`SP_Edictum_All`), caddy rank (`SP_Get_Rank_Caddy`), shop free-count stock, system notices (`SendSysNotice` builds 10) | Server_List, Edictum |
| LoginMgr (Game) | pending logins (`userName → client`), `ContainsUser`, `LoginClient(id)` | — |
| RoomMgr (Rooms/RoomMgr.cs) | fixed array of `BaseRoom[MaxRoomCount]`, waiting room, world-boss room; single thread executing queued `IAction`s every 40 ms, clears empty rooms every 400 ms | — |
| GameMgr (Games/GameMgr.cs) | in-process `BaseGame`s (PvE, Freedom PvP) on its own thread; `SynDate<0` → restart (checked every minute) | (Game.Logic caches) |
| BattleMgr (Battle) | fight-server connections & room hand-off | battle.xml |
| ConsortiaMgr | guild cache (`SP_Consortia_All`), boss config (`SP_Consortia_Boss_Config_All`), allies (`SP_ConsortiaAlly_All`), guild war settlement, guild buffs | Consortia, Consortia_Boss_Config, Consortia_Ally |
| ConsortiaExtraMgr / ConsortiaLevelMgr (Bussiness) | levels, buff templates, badges | Consortia_Level, Consortia_Buff_Temp, Consortia_Badge_Config |
| ConsortiaTaskMgr | guild missions, scan every 60 s (expire/reward riches) | Consortia_Task, Consortia_Task_Info |
| ConsortiaBossMgr (Game & Center) | guild boss state mirror; award riches | (center memory) |
| ItemMgr (Bussiness) | item templates (`SP_Items_All` — note: the item-template table is literally named **`Shop_Goods`**), time-box awards | Shop_Goods, TimeBox_Award |
| ItemBoxMgr | box contents & random draws (`SP_ItemsBox_All`) | Items_Box |
| ShopMgr | shop goods (`SP_Shop_All`), show lists (`SP_ShopGoodsShowList_All`), guild-shop permission (`SP_Consortia_Equip_Control_Single`) | Shop (shop listings), ShopGoodsShowList |
| QuestMgr | quests, conditions, rewards (`SP_Quest_All`, `SP_Quest_Condiction_All`, `SP_Quest_Goods_All`) + achievements | Quest, Quest_Condiction, Quest_Goods |
| AchievementMgr | achievements & rewards | Achievement, Achievement_Condition, Achievement_Reward |
| AwardMgr | daily login/sign awards (`SP_Daily_Award_All`), search-goods | Daily_Award, SearchGoodsTemp |
| UserBoxMgr | online-time / level boxes (`SP_TimeBox_Award_All`) | TimeBox_Award |
| StrengthenMgr | strengthen rates, refinery strengthen, weapon upgrade paths, necklace exp | Item_Strengthen, Item_Refinery_Strengthen, Item_StrengthenGoodsInfo, StrengThenExp |
| FusionMgr / RefineryMgr | fusion recipes (`SP_Fusion_All`), refinery (`SP_Item_Refinery_All`) | Item_Fusion, Item_Refinery |
| GoldEquipMgr | gold-plating mapping (`SP_GoldEquipTemplateLoad_All`) | GoldEquipTemplateLoad |
| CardMgr / CardBuffMgr | card upgrade conditions/info, card buffs/groups | CardUpdateCondition, CardUpdateInfo, Card_Info, Card_Buff, Card_Group |
| PetMgr / PetMoePropertyMgr | pet templates, levels, skills, star/evolution, moe gear | Pet* tables |
| LevelMgr | level → GP table (`SP_Level_All`) | Level |
| RateMgr / FightRateMgr | rates | Rate, Fight_Rate |
| DropMgr / MacroDropMgr | drop tables; global drop quotas | Drop_Condiction, Drop_Item, macroDrop.ini |
| MapMgr, BallMgr, BallConfigMgr, NPCInfoMgr, MissionInfoMgr, PveInfoMgr, WindMgr, PropItemMgr, ExerciseMgr (Game.Logic) | combat data (combat spec) | Maps, Maps_Server, Ball, Ball_Config, NPC_Info, Mission_Info, Pve_Info, Items(category), Exercise |
| ActiveMgr / ActiveSystemMgr | activities list (`SP_Active_All`), convert items, awards, `ActivitySystemItem` packs; league open flag | Active, Active_Convert_Item, Active_Award, ActivitySystemItem |
| EventAwardMgr / EventLiveMgr / SubActiveMgr / CommunalActiveMgr / AccumulActiveLoginMgr / WorldEventMgr / DailyLeagueAwardMgr | event systems (02 §10) | EventAwardItem, Event_Live, Event_LiveGoods, SubActive, SubActiveCondition, CommunalActive*, Login_Award_Item_Template, LuckyStart_Topten_Award, Daily_League_Award |
| NewTitleMgr, TotemMgr, TotemHonorMgr, FightSpiritTemplateMgr, ClothGroup/ClothPropertyTemplateInfoMgr, QQTipsMgr, FairBattleRewardMgr | titles, totems, honor shop, fight spirit, wardrobe, tips, fair-battle rewards | New_Title, Totem, TotemHonorTemplate, FightSpiritTemplate, ClothGroup, ClothProperty, QQtipsMessages, FairBattleReward |
| MarryRoomMgr | chapels (`SP_Get_Marry_Room_Info`, dispose expired) | Marry_Room_Info |
| HotSpringMgr | spa rooms (`SP_Get_HotSpring_Room`) | HotSpring_Room |
| RankMgr | hourly `UpdateRank` (10 `SP_Sys_Update_*` procs) + league/rank-date caches | Sys_User_Match_Info, Sys_Users_Rank_Date |
| AcademyMgr | master/apprentice requests (memory), awards (`AcademyMasterAward` etc.) | Sys_Users_Detail columns |
| LittleGameWorldMgr | "Hút Gà" event world (map file, bogus, scan/spawn 60 s) | GameProperties LittleGame* |
| RingStationMgr / RobotManager | arena ranking & bot opponents | RingStation tables, Sys_Users_Detail |
| CommandsMgr | GM rights (`SP_GetAllCommands`) | Commands |
| AntiAddictionMgr | AAS (Chinese anti-addiction) on/off, `SP_ASSInfo_Single` | AASInfo |
| LanguageMgr | `Languages/Language-*.txt` key=value strings | file |
| LogMgr (Game & Center) | buffered statistics / item logs → `ItemRecordBussiness.LogServerDb` | Db_Count tables |

## 9. Game-server timers & threads

| Timer / thread | Period | Action (file) |
|---|---|---|
| m_saveDbTimer | `DBAutosaveInterval` min | for each player `SavePlayerInfo` + `SaveIntoDatabase` (+ speed-hack check, see 02 §16), `WorldMgr.IsAccountLimit`, `UpdateCaddyRank`, `ScanShopFreeVaildDate`, `AcademyMgr.RemoveOldRequest`; then `GameServerEvent.WorldSave` |
| m_pingCheckTimer | `PingCheckInterval` min | send ping (`SendPingTime`) to logged players; disconnect sockets with no player and no traffic for the interval; send center 12 PING |
| m_buffScanTimer | 60 s | `BufferList.Update()` for every player (expire buffs); PvE engine watchdog (`GameMgr.SynDate < 0` → restart GameMgr) |
| m_LittleGameScanTimer | 60 s (aligned to minute) | open/close "Hút Gà" at `LittleGameStartHourse` for `LittleGameTimeSpendingHours`, notices at :55 |
| m_renameInterval | 24 h | `Sp_Renames_Batch` (apply queued nick/guild renames) |
| m_saveRecordTimer | — | **never created** (only `.Change` if non-null) → statistics never saved by timer |
| WorldBossScan1/2, WeekScan, LeagueScan | — | **commented out** → world boss / weekly novice reset / league open never happen automatically |
| RankMgr | 1 h | rank rebuild |
| ConsortiaTaskMgr | 30 s then 60 s | guild missions |
| LittleGameWorldMgr | 60 s scan + 60 s spawn | event world |
| RingStationMgr | 60 s | arena status |
| MacroDropMgr (game) | 5 s | report local drop counts (178) |
| MarryRoom | per room | booking expiry, ceremony timer |
| PlayerExtra | per player | online-time ping, hot-spring minutes |
| PlayerActives | per player | labyrinth clean-out |
| RoomMgr thread | 40 ms loop | room actions |
| GameMgr thread | game ticks | in-process games (combat spec) |

## 10. Concurrency model (port notes)

* C#: one receive callback per socket (handlers for one client are serialized), shared state guarded by ad-hoc locks;
  room changes funneled through the single RoomMgr thread; sub-system processors (`ConsortiaProcessor`,
  `GameRoomProcessor`, `PetProcessor`, `FarmProcessor`, `WorldBossProcessor`, `LittleGameProcessor`) each hold a
  **static global lock** (all players serialized per subsystem).
* Node port: a single event loop already serializes; keep per-room ordering by processing room actions in a queue
  per room (or a global microtask queue mirroring RoomMgr's 40 ms batch), and make every DB-mutating handler `await`
  its transaction before replying, preserving reply order per client.
