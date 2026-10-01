# 01 – DDTank open-source server candidates (research, 2026-10-01)

Goal: pick the most complete open DDTank (7Road) private-server source on GitHub to port later
(C# servers + SQL Server DB + web request handlers to Node/TypeScript + Postgres).

Method: `gh search repos` (ddtank, "ddtank server", ddtank emulator, ddtank 4.1, ddtank 5.5, ddtank source,
gunny, gunny server, ddtank 3.0, "Road.Service", "Fighting.Server", "Center.Server", ddt server, mortaltank, 7road),
`gh search code` (ePackageType, GameServer…; GitHub's code index covers few files in these large repos, so it found
only GunnyII/BaseGunnyII, geniushuai/DDTank-3.0, pnkl1999/DDTank41, SkelletonX/DDTank4.1), a WebSearch, and recursive
tree listings via `gh api repos/<r>/git/trees/<branch>?recursive=1`. Stored-procedure counts come from a string scan
of the `.bak` files (approximate). Nothing in the cloned repos was built or run.

---

## 1. Candidate list

| Repo | Stars | Last push | Repo size | Game version / lineage | Verdict |
|---|---|---|---|---|---|
| [pnkl1999/DDTank41](https://github.com/pnkl1999/DDTank41) | 87 | 2024-07-13 | 365 MB (1.24 GB checkout) | 4.1, Vietnamese "Gun Đại Việt / Cyrus", 7Road build 10990 | **CLONED (base)** |
| [AloneInAbyss/ddtank-server-files-remake](https://github.com/AloneInAbyss/ddtank-server-files-remake) | 1 | 2026-09-07 | 375 MB | Copy of pnkl1999 plus patches and docs (PT-BR). Says it boots to the lobby | **fetched as remote `remake` inside vendor/DDTank41** |
| [SkelletonX/DDTank4.1](https://github.com/SkelletonX/DDTank4.1) | 75 | 2022-04-25 | 223 MB | 4.1, Brazilian. Decompiled. Has PvE scripts | **CLONED (donor)** |
| [tohru48/DDT-6600](https://github.com/tohru48/DDT-6600) | 7 | 2026-01-17 | 313 MB (0.93 GB checkout) | 6.5/6.6 ("Source6600"), Turkish. Heavily decompiled and obfuscated | **CLONED (reference, newer version)** |
| [zsj0613/DDTServer](https://github.com/zsj0613/DDTServer) | 12 | 2020-05-06 | 22 MB | Chinese rewrite: Center/Fighting/Game/Cross/CrossFight/Web.Server, NVelocity web | Server code only (1,547 .cs). No DB, no client. Useful as a second reference for the architecture |
| [geniushuai/DDTank-3.0](https://github.com/geniushuai/DDTank-3.0) | 48 | 2012-05-24 | 16 MB | 3.0 (Gunny VN) | Old. Has 1,688 .cs and a 1 MB `.MDF`. No real DB or client |
| [GunnyII/BaseGunnyII](https://github.com/GunnyII/BaseGunnyII) | 28 | 2013-05-19 | 6 MB | GunnyII (3.x) | Source only (1,200 .cs). No DB, no client |
| [Thisorp/gunny3.0](https://github.com/Thisorp/gunny3.0) | 2 | 2024-10-30 | 20 MB | Copy of 3.0 | Duplicate of geniushuai |
| [dk-khoado/Gunny-3.0](https://github.com/dk-khoado/Gunny-3.0) | 1 | 2023-03-22 | 517 MB | Gunny 3.0 IIS deployment (compiled servers, 5 `.bak`, Request source) | **Only public `Resource/` pack found** (image 413 MB, sound 105 MB, weapon 13 MB). Server is binaries only. Possible resource donor |
| [BrunoSzczuk/ddtank-5.5-mac-silicon](https://github.com/BrunoSzczuk/ddtank-5.5-mac-silicon) | 2 | 2026-05-17 | 62 KB | 5.5 / Mortaltank | Docker/Mono packaging only. Needs `Servidor5.5.rar` (not in the repo, binaries). Notes on Ruffle limits and the ports Center 2008/2009/9202, Fighting 9208, Road 9200 are useful |
| thanvietduc1997/ddtank41, khoa6430/ddtank-4.1, bachduyhoang/DDTank, herogamee/… | 0 | 2024–26 | ~365 MB | Copies or forks of pnkl1999 | Skip |
| Winter0507/DDTank41, ronildodev/ddtank4.1 | 0–1 | 2023 | 223 MB | Copies of SkelletonX | Skip |
| okaum/DDTank, windors/ddtank, Tziheng/DDTankAuto, HaiHai-17/*, khanghh/ddtank_client, tohru48/ddtank-re-toolkit … | – | – | – | Bots, launchers, aimbots, downloaders | Not servers |

Found nothing for "ddtank emulator", "ddtank 4.4", "ddtank 5.5" source, "ddtank resource" or "7road" server source.
A 5.5 source tree does not seem to exist publicly on GitHub, only binaries.

### Component matrix (cloned repos plus the closest alternatives)

| Component | pnkl1999/DDTank41 | SkelletonX/DDTank4.1 | tohru48/DDT-6600 | zsj0613/DDTServer | dk-khoado/Gunny-3.0 |
|---|---|---|---|---|---|
| Center server (src) | yes `Center.Server` + `Center.Service` | yes | yes, plus `Center.Crosszone.*` | yes | binaries only |
| Fighting server (src) | yes | yes | yes | yes | binaries only |
| Road/Game server (src) | yes `Game.Server` + `Road.Service` | yes `Game.Server` + `Road.Service` | yes `Game.Server` + `Game.Service` | yes | binaries only |
| PvE AI / mission scripts (src) | **NO** (only SimpleBrain/SimpleNpc. `GameServerScripts.dll` absent) | **yes** `Game.Server.Scripts` (616 files, 256 missions, 275 brains) | **yes** `Game.Server/Game.Server.Script` (807 files, 285 missions, 391 brains) | `DDTScripts` | compiled `GameServerScripts.pdb` |
| Web request (`Tank.Request`, .ashx) | yes, 102 + 19 ashx, source | yes, 3 overlapping copies (`Request/`, `Request/Tank.Request`, `Source Server/Tank.Request`) | yes, source in `Source/Tank.Request`. Deployed copy in `Request/` | yes `Web.Server` | yes, source |
| Login site | `Tank.Flash` (ASP.NET) + PHP launcher API | `Web/` (PHP + aspx) + `ClientWeb/` Electron | `WebSimple/` (ASP.NET) | `WebPath/` | yes |
| Admin panel | `GameAdmin` (AdminGunny, stale DB names) | – | – | – | `admingunny` + 14 SP .sql |
| DB | 3 `.bak`: Db_Membership 5 MB, Game34 21 MB, Player34 16 MB | 3 `.BAK`: Db_Membership 10 MB, Db_Tank 20 MB, Db_Tank41 37 MB | 3 `.bak`: Db_Count 8 MB, Db_Membership 8.5 MB, Db_Tank 35 MB | none | 5 `.bak` |
| Stored procs (approx., `.bak` scan) | Membership 76 / Game34 173 / Player34 317 | Membership 93 / Db_Tank 162 / Db_Tank41 300 | Count 204 / Membership 75 / Db_Tank 606 | – | – |
| Distinct SP names called from C# | 401 | 345 | 463 | – | – |
| `.sql` scripts | none (remake adds none) | 1 (`Db/Query/Reset all Server.sql`) | none | – | 14 SP scripts |
| Map/bomb physics data (`.map`/`.bomb`) | yes, in `Road.Service/bin/Debug/net48/{map,bomb}` and Fighting bin (1,186 map, 4,120 bomb) | **none** | yes, in Game/Fighting bin (846 / 3,056) | – | yes |
| Flash client compiled | `Source Flash/FlashSV1` (Loading.swf, DDT_Loading.swf, 114 ui swf, lang vietnam) | `Web/Flash` (77 ui swf, lang spain) + `ClientWeb/public` | `WebSimple/Flash_6600_v040` (344 ui swf, lang turkey) + `images/flash-01` | – | `gunny/` |
| Flash client AS3 source | yes, 2,517 .as / 445k LOC (`Source Flash/src`, `asconfig.json`) | yes, 2,599 .as / 399k LOC (`Source Flash/scripts`) | yes, 3,805 .as / 690k LOC (`Flash_Project/DDT660/src`) | – | – |
| Graphic `resource/` pack (SITE) | **missing** (SITE → `gunny.vcdn.vn`, dead) | **missing** (SITE → `ddt-a.akamaihd.net`) | **missing** (SITE → `ddttr-a.akamaihd.net`) | – | **present** (3.0) |
| README / build docs | none (Discord link only). The `remake` fork adds ~8 PT-BR docs: setup guide, combat, resource, modifications | short. VS2019, .NET 4.5.2, YouTube and wiki | short (Turkish): restore DB, edit app.config, IIS | none | IIS paths |
| .NET target | SDK-style csproj, **net472/net48** | old-style csproj, **v4.7.2** (+ v4.0 `SourceQuest4.5`) | SDK-style, **v4.8/net48** | old-style | – |
| Decompiler artifacts | low (96 files with decompiler headers, 47 with `smethod_`/`classN`) | high (1,229 / 260). Csproj says "exported from assembly … Decompiler\Road\Game.Server.dll" | very high (1,524 / 457). Files like `Class11.cs`, `Attribute0.cs` | low | – |

---

## 2. Cloned repos

All under `C:\Users\T\Documents\Projects\DDTank\vendor\`. Each is a shallow clone (`--depth 1`, `core.longpaths=true`) with no blob filter, because every repo is under 2 GB.

| Path | Upstream | Commit | Disk |
|---|---|---|---|
| `vendor\DDTank41` | pnkl1999/DDTank41 (`origin`) **plus remote `remake`** = AloneInAbyss/ddtank-server-files-remake (`remake/main`, fetched depth 1) | 7fcb552 (2024-07-14) | 1.6 GB |
| `vendor\DDTank4.1` | SkelletonX/DDTank4.1 | 09f8cdb (2022-04-25) | 335 MB |
| `vendor\DDT-6600` | tohru48/DDT-6600 | c621204 (2026-01-17) | 1.2 GB |

`remake/main` vs `origin/main`: 136 files changed (+6.2k/−0.85k lines). It adds `Launcher.Electron/` (Electron + Pepper Flash, flash-policy server), patched `Tank.Request/Login.ashx`, `LoginSelectList.ashx`, `ServerList.ashx`, `CreateLogin.aspx`, `devlogin.ashx`/`devchar.ashx`, patched `Tank.Flash/playgame.aspx` and `LoginGame.aspx`, `FlashSV1/config.xml` (SITE → `http://127.0.0.1/resource/`), a patched `Loading.swf` (local login), `Road.Service/App.config` changes, and the docs `DOCUMENTACAO*.md`, `GUIA-SUBIR-SERVIDOR.md`, `AGENTS.md`. To view them: `git -C vendor/DDTank41 show remake/main:GUIA-SUBIR-SERVIDOR.md`. To diff: `git -C vendor/DDTank41 diff HEAD remake/main --stat`.

---

## 3. Inventory: vendor\DDTank41 (pnkl1999, base)

15,125 files, 1.24 GB. Solution: `DDTank 3.0.sln` (plus `Request.sln`, `GameAdmin/AdminGunny.sln`, launcher slns).

```
DDTank41/
  Bussiness/          business layer (GameProperties, *Bussiness.cs → SPs), CenterService WCF client
  Center.Server/      login/center server lib (ePackageType, LoginMgr, ConsortiaMrg, WCF CenterService)
  Center.Service/     console exe host (App.config, Actions)
  Fighting.Server/    battle server lib (FightServer, Games, Rooms, Servers)
  Fighting.Service/   exe host; bin/Debug/net48/{map,bomb} physics data
  Game.Base/          sockets, GSPacketIn, BaseServer/BaseClient, ScriptMgr, commands
  Game.Logic/         combat: Phy, Actions, Effects, PetEffects, Spells, AI (stubs only), Cmd
  Game.Server/        Road game server lib (GameClient, Packets/Handlers, Rooms, Managers, Consortia, Farm, …)
  Road.Service/       exe host; App.config, battle.xml, Datas/, bin/Debug/net48/{map,bomb,Languages}
  Road.Flash/         small helper lib
  SqlDataProvider/    entity/info classes (BaseClass, DAL, Data)
  Tank.Data/          extra data lib (Tank, SqlDataProvider subns), net4.8
  Tank.Request/       ASP.NET .ashx XML endpoints used by Flash (102 + CelebList 19 + API 2)
  Tank.Flash/         ASP.NET login/play site (LoginGame.aspx, playgame.aspx, auth/*.ashx, config.xml)
  GameAdmin/          AdminGunny web admin (+ App_Data/ASPNETDB.MDF)
  Database/           Db_Membership.bak, Game34.bak, Player34.bak
  Source Flash/       FlashSV1/ (compiled client: Loading.swf, DDT_Loading.swf, ui/vietnam/{swf,xml}, config.xml) + src/ (AS3) + asconfig.json
  Source Launcher/    WinForms launchers (Gun321.Client obfuscated, ZGun, GunDaiViet) + api/ (PHP/Composer launcher API, 2,269 .php)
  libdll/, packages/  third-party DLLs (log4net 2.0.14, protobuf-net, zlib.net, Newtonsoft)
```

### C# projects (excluding bin/obj). 2,429 .cs, 253k LOC

| Project | Files | LOC | Target |
|---|---|---|---|
| Game.Server | 772 | 72,352 | net472 |
| Game.Logic | 672 | 59,091 | net472 |
| Bussiness | 76 | 24,935 | net472 |
| Tank.Data | 106 | 23,655 | v4.8 |
| SqlDataProvider | 383 | 23,528 | net472 |
| Source Launcher/Gun321.Client | 54 | 15,796 | net40 (obfuscated, ignore) |
| Tank.Request | 166 | 12,738 | v4.7.2 |
| GameAdmin (AdminGunny) | 68 | 6,548 | v4.6 |
| Game.Base | 41 | 4,180 | net472 |
| Center.Server | 19 | 3,499 | net472 |
| Fighting.Server | 14 | 2,949 | net472 |
| Road.Service (exe) | 10 | 1,204 | net48 |
| Tank.Flash | 28 | 1,141 | v4.6 |
| Road.Flash | 2 | 704 | v4.7.2 |
| Fighting.Service / Center.Service (exe) | 3 / 3 | 277 / 268 | net48 |

Protocol surface: 163 `[PacketHandler(...)]` handlers, 29 `[GameCommand]`. `ePackageType` is in `Center.Server/ePackageType.cs`, `Game.Logic/ePackageType.cs` and `Game.Logic/ePackageTypeLogic.cs`.

### DB
- `Database/Db_Membership.bak` (5.3 MB, ~76 procs, 9 views). Restore as `Db_Membership`.
- `Database/Game34.bak` (21 MB, ~173 procs, 9 functions). Static game data (templates, shop, quests, maps, drops). The code expects the name **`Project_Game34`**.
- `Database/Player34.bak` (16 MB, ~317 procs, 15 views). Player data. The code expects **`Project_Player34`**.
- No `.sql` scripts. The schema lives only inside the backups and must be restored to SQL Server to extract DDL. Tables can only be counted after a restore.
- 401 distinct SP names are referenced from C# (Bussiness/*). Data access is almost entirely through stored procedures.

### Config (IPs, ports, connection strings)
- `Road.Service/App.config`: conn `Data Source=KHANHDUY\SQLEXPRESS; Initial Catalog=Project_Player34 / Project_Game34`. `Port=9500` (game TCP), `LoginServerPort=9202`, `FightServerPort=9208`, IP 127.0.0.1, `ScriptCompilationTarget=.\GameServerScripts.dll`, plus rate keys.
- `Road.Service/battle.xml`: Fighting server address (127.0.0.1).
- `Center.Service/App.config`: `Port=9202` (+ WCF). Same DBs.
- `Fighting.Service/App.config`: `Port=9208`.
- `Tank.Request/Web.config`: Project_Game34/Player34, plus server-list IPs (23.101.24.135, 20.212.104.167).
- `Tank.Flash/Web.config`: Db_Membership.
- `GameAdmin/Web.config`: stale `.\GUNNY` / `Db_Tank`, `Db_Tank_All`.
- `bin/Release/net48/*.config` copies point to `10.1.0.4` / `dTaJjfKP` (author's production box).

### Client
- Compiled client: `Source Flash/FlashSV1/` holds `Loading.swf` (188 KB), `DDT_Loading.swf` (1 MB), `ui/vietnam/swf/*.swf` (114), `ui/vietnam/xml/*`, `language.txt`, `md5.xml`.
- Client config: `Source Flash/FlashSV1/config.xml` has `FLASHSITE=http://127.0.0.1/flash/`, **`SITE=http://gunny.vcdn.vn/`** (resource CDN, dead), `REQUEST_PATH=http://127.0.0.1/Request/`, `LOGIN_PATH=…/server_list.html`, `LANGUAGE=vietnam`. A second copy is at `Tank.Flash/config.xml`. The flashvars and the site URL are built in `Tank.Flash/playgame.aspx` / `LoginGame.aspx`.
- AS3 source: `Source Flash/src/` (2,517 .as, 445k LOC, packages `ddt`, `game`, `room`, `hall`, `com/pickgliss`, …).
- Resource pack (`/resource/` = item, character and map images, sounds): **not in the repo**. The remake author used a 3.6 pack locally (~1 GB, gitignored). Dungeon buildings render blank because of the 3.6 vs 4.1 mismatch.

---

## 4. Inventory: vendor\DDTank4.1 (SkelletonX)

8,621 files, 226 MB. Main solution: `Source Server/DDTank 4.1.sln` (plus per-project .sln files and `SourceQuest4.5/Solution.sln`).

```
DDTank4.1/
  Db/             Db_Membership_20200702.BAK, Db_Tank_20200702.BAK, Db_Tank41.BAK, Query/Reset all Server.sql
  Source Server/  AttRank, Bussiness, Center.Server, Center.Service, Fighting.Server, Fighting.Service,
                  Game.Base, Game.Logic, Game.Server, Game.Server.Scripts (AI: Game/Messions/NPC + Commands),
                  Road.Flash, Road.Service, SqlDataProvider, Tank.Request,
                  SourceQuest4.5/ (older v4.0 subtree + vendored log4net/Newtonsoft/protobuf-net/zlib/Ajax)
  Request/        deployed Tank.Request web (ashx; duplicated in Request/Tank.Request and Illegalcharacters/)
  Web/            PHP + aspx site, Flash/ (Loading.swf, DDT_Loading.swf, ui/spain), config.xml
  ClientWeb/      Electron 9 "PlusTank" launcher (express + Loading.swf)
  Source Flash/   scripts/ (AS3 source, 2,599 .as)
  Tools/          xml converter tool
```

C# (4,587 .cs, 520k LOC including vendored libraries). The game code alone:

| Project | Files | LOC |
|---|---|---|
| Game.Logic | 1,301 | 101,071 |
| Game.Server.Scripts (PvE AI/missions) | 616 | 97,686 |
| Game.Server | 610 | 59,336 |
| Request/Tank.Request | 301 | 23,306 |
| Bussiness | 71 | 21,633 |
| SqlDataProvider | 203 | 17,083 |
| Source Server/Tank.Request | 139 | 8,162 |
| Game.Base | 42 | 4,155 |
| Center.Server | 19 | 3,265 |
| Fighting.Server | 15 | 3,177 |
| Road.Service / Fighting.Service / Center.Service | 10 / 3 / 3 | 1,013 / 294 / 288 |

All target .NET Framework v4.7.2 with old-style csproj. The code is decompiled ("exported from assembly … Decompiler\Road\Game.Server.dll"). There are 164 `[PacketHandler]` handlers.

- DB: 3 BAKs (~93 / 162 / 300 procs). DB names: `Db_Tank41`, `Db_Tank`, `Db_Membership`, `Db_Count`. 345 SP names are referenced from C#.
- Config: `Source Server/Road.Service/App.config` has `Port=9200`, `LoginServerPort=9202`, `FightServerPort=9208`, `LoginCrosszoneServerPort=9203`, conn `SUELEN\SKELLETONX`. `Center.Service/App.config` has 9202. `Fighting.Service/app.config` has 9208. `Request/Web.config` has public IPs. `Web/web.config` and `Web/global.php` hold the DB connections.
- Client: `Web/Flash/` (Loading.swf 146 KB, DDT_Loading.swf 907 KB, 77 ui swf, lang `spain`). `Web/config.xml` has `SITE=http://ddt-a.akamaihd.net/` (dead CDN), `REQUEST_PATH=http://127.0.0.1/request/`.
- Missing: the `map/` and `bomb/` physics folders (0 .map/.bomb files) and the resource pack. The Release rar (`DDTank4.1.0.0.0.1.rar`, 145 MB) was not downloaded or inspected.

---

## 5. Inventory: vendor\DDT-6600 (tohru48)

13,875 files, 931 MB. Solution: `Source/Source6600.sln`.

```
DDT-6600/
  Db/             Db_Count.bak, Db_Membership.bak, Db_Tank.bak
  Source/         Bussiness, Center.Crosszone.Server/.Service, Center.Server/.Service, Fighting.Server/.Service,
                  Game.Base, Game.Logic, Game.Server (incl. Game.Server.Script: Game/Messions/NPC), Game.Service,
                  Road.Flash, SqlDataProvider, Tank.Request, packages
  Request/        deployed request web (ashx + Bin, AreaCelebList, CelebList, tool/)
  WebSimple/      ASP.NET site + Flash_6600_v040/ (client, ui/1 + ui/turkey) + images/flash-01 (alt client)
  Flash_Project/  DDT660/src (AS3 source 3,805 .as / 690k LOC)
```

C# 2,628 .cs, 275k LOC: Game.Server 1,630 files / 172k LOC (includes 807 script files), Game.Logic 32k, Bussiness 28k, SqlDataProvider 18k, Tank.Request 8k, Center.Server 4.3k, Fighting.Server 2.6k, Center.Crosszone.Server 2.4k. Csproj files are SDK-style, net48. The code is heavily obfuscated by decompilation (`Class11.cs`…`Class26.cs`, `Attribute0..16.cs`, `smethod_N`).

- DB: Db_Tank ~606 procs (the most complete content), Db_Count ~204 procs + 139 views, Db_Membership ~75. Also `Db_Remote` (cross-zone, no backup). 463 SP names are referenced from C#.
- Config: `Source/Game.Service/App.config` has `Port=9200`, `LoginServerPort=9802`, `FightServerPort=9208`, `LoginCrosszoneServerPort=9203`. Center.Service uses 9802, Center.Crosszone uses 9203, Fighting uses 9208. Conn `EMRULLAH-PC\ASUNA`. `Request/tool/Web.config` has a leaked public SQL host `192.99.18.199,1432`.
- Client: `WebSimple/Flash_6600_v040/` (Loading.swf 470 KB, DDT_Loading.swf 751 KB, 344 ui swf). `WebSimple/config.xml` has `FLASHSITE=http://127.0.0.1:6500/Flash_6600_v040/`, `SITE=http://ddttr-a.akamaihd.net/` (dead), `REQUEST_PATH=http://127.0.0.1:6500/Quest/`, `LANGUAGE=turkey`.
- Missing: the resource pack and `Db_Remote`.

---

## 6. RECOMMENDATION

**Base: `vendor\DDTank41` (pnkl1999/DDTank41), with the AloneInAbyss `remake` patches applied on top (remote `remake/main`).**

Why:
1. It is the most complete single package that is known to work. It has all three servers, Tank.Request, the login site, admin, 3 DB backups whose names match the code, the physics `map/` and `bomb/` data, a compiled 4.1 Flash client, and the full AS3 client source. The remake fork reports a local boot all the way to the lobby (2026-09-05) and documents every step.
2. It is the cleanest code. Its sources are mostly hand-maintained, not raw decompiler output (96 decompiler-header files, against 1,229 in SkelletonX and 1,524 in DDT-6600), and it uses SDK-style net472/net48 csproj files. That makes it the easiest to read and port, and to build with `dotnet build` and the .NET Framework targeting packs for differential testing.
3. It is the most popular and the most forked (87 stars, many forks), so the community knowledge about it is the most current.

**Donors:**
- **SkelletonX/DDTank4.1** fills the main code gap. It has the **PvE scripts** (`Game.Server.Scripts`: 256 missions, 275 NPC brains, commands) for the same 4.1 lineage. DDTank41 has none (no `GameServerScripts.dll`, no source), so dungeons and bosses cannot work there. Port these into the TS rewrite. They compile against the same `Game.Logic` API (`AMissionControl`, `ABrain`).
- **tohru48/DDT-6600** is a reference for newer systems (cross-zone center, ~606 procs in Db_Tank, 807 script files, 6.6 client source). Do not use it as the base, because of the obfuscation and the version mismatch with the 4.1 client.
- **dk-khoado/Gunny-3.0** (not cloned) is the only public `Resource/` pack (~530 MB, 3.0). To fetch only that part: `git clone --depth 1 --filter=blob:none --sparse https://github.com/dk-khoado/Gunny-3.0 && git sparse-checkout set inetpub/wwwroot/Resource`.

**Gaps (what's missing):**
1. **Graphic resource pack for 4.1** (`/resource/`: `image/equip`, `image/map`, sounds, weapons). It is not in any repo, and every client config points `SITE` to a dead CDN. Options: the 3.0 pack from dk-khoado (partial coverage), a 3.6 pack from forums or Discord (what the remake used), or check the SkelletonX release rar. This is the main blocker for a visually complete game.
2. **PvE AI/mission scripts** are missing from the base. Take them from SkelletonX.
3. **No SQL DDL scripts.** The schema exists only in `.bak` files. Restore them to a SQL Server 2019/2022 container and script out tables, procs (~566 in the base) and views before porting to Postgres. The ~400 SPs called from C# are the real porting surface.
4. No `.sql` seed or migrations, and no tests. The configs contain authors' hostnames, IPs and passwords, which must be scrubbed.
5. The client is Flash (AS3). It needs Flash Player 32 projector, Electron 11 + Pepper Flash (see `remake/main:Launcher.Electron`), or Ruffle. Ruffle cannot yet run the pickgliss `UIModuleLoader` (per the BrunoSzczuk notes). A new server must speak the existing binary TCP protocol (GSPacketIn, `ePackageType`, 163 handlers) and the XML-over-HTTP `Tank.Request` contract (~120 `.ashx`) exactly.
6. GameAdmin uses stale DB names (`Db_Tank`). The Launcher API needs a `Member_GMP` DB that is not included (it is optional).

**Suggested next steps:** restore the 3 `.bak` files into MSSQL in Docker and dump the DDL and procs to `research/`. Catalogue the `ePackageType` and handler list, and the `Tank.Request` endpoints with their XML shapes. Diff SkelletonX `Game.Logic` against the base to confirm the scripts are API-compatible.
