# 02 - Ruffle feasibility report (DDTank 4.1 client)

Date: 2026-10-01. Harness: `apps/client-harness` (see its README).
- Ruffle **nightly-2026-10-01** (0.7.0-nightly.2026.10.1), web self-hosted, wgpu-webgl renderer, headless Chromium (Playwright).
- Client: `vendor/DDTank41/Source Flash/FlashSV1`.
- Evidence: `research/client/evidence/` (console logs, request logs, WS capture) and the screenshots `research/client/ruffle-*.png`.

## 1. Verdict

**The boot works under Ruffle with zero client patches**, up to the point where the client opens the game socket. Checks:

| Step | Result |
|---|---|
| `Loading.swf` → `config.xml` → `md5.xml` → `LoginSelectList.ashx` | OK |
| `DDT_Loading.swf` (loading screen and mini-game render correctly) | OK |
| `2.png` core (4.5 MB) via `URLLoader` + **`Loader.loadBytes`** into `ApplicationDomain.currentDomain`, then `getDefinitionByName("ddt.DDT")` | **OK, no panic** |
| 16 UI modules (`ui/vietnam/swf/*.swf`, up to 2.3 MB each), `xml.png` (FZip + inflate), `language.txt` | OK |
| ~70 template XMLs (zlib, `ByteArray.uncompress`) parsed; progress reached 13/13, 100% (`ruffle-after-login.png`) | OK |
| `Login.ashx` (RSA blob built by AS3 `CrytoUtils`) | OK |
| With a successful stub reply, `Socket.connect("127.0.0.1", 9200)` is tunnelled by `socketProxy` to `ws://localhost:9300/ws`; one binary frame of 156 bytes (the LOGIN packet: header + 8 + RSA-128) arrived (`evidence/ws-probe.jsonl`) | OK |
| Character-creation path (`1.png` road7 header strip → `loadBytes`, `choicefigure.swf`, `3.png`, `firstTainer.swf`, `NickNameCheck.ashx` on typing) | OK (`USE_MD5=true` is required; with md5 off the screen stays blank) |
| Avatar, map and bomb images | 404. **There is no resource pack in the repo** (not a Ruffle issue) |

**Issue #18896 (`capacity overflow` in `Loader.loadBytes`) did not reproduce.** Every `loadBytes` call (`2.png`, `1.png`, `3.png`, all UI modules, `expression.swf`) succeeded on this nightly. We grepped for `panic`, `capacity overflow`, `RuntimeError` and `unreachable` across all console logs: 0 hits. This client never takes `ModuleLoader.decry()` (every module starts with `CWS`), which is the path most likely to produce odd lengths. Keep `decry` in mind if a future pack ships "encrypted" modules.

We could not test past the socket: the battle loop, rendering of real avatars/maps and audio need `apps/game` and a resource pack. The known risks from `research/02-client-runtime.md` (NetStream FLV music, frame-script timing in `GameCharacter.actionPlaying`, the Bomb `target` property, projectile trails) stay **unverified**.

## 2. What breaks or warns (observed)

| Observation | Impact | Fix |
|---|---|---|
| `Unknown device font` "Arial", "Verdana", "Times New Roman", "Microsoft YaHei", "ＭＳ Ｐゴシック", plus "Noto Sans" bold. Vietnamese glyphs drawn with a device font are lost: "Đang tải [Bản mẫu]" renders as "Đang ti[Bn mu]" | Garbled text wherever a device font is used | Ship TTFs whose **family names match** (for example Arimo or Liberation Sans as "Arial", plus a CJK fallback) via `fontSources` (and `deviceFontRenames` if present in the pinned build). The bold face needs its own matching file. Not a code patch |
| Stubs: `NetStream.bufferTime`/`soundTransform` | Background music uses `NetStream.play(SITE+"sound/<id>.flv")`. FLV audio is unreliable in Ruffle | **Patch 1** (section 4) |
| Stubs: `sendToURL`, `URLLoader.close`, `Security.loadPolicyFile`, weak-key `Dictionary`, `NativeMenuItem`, `describeTypeJSON` metadata, `scale9Grid`, `TextField.mouseWheelEnabled`, `Loader.load addChild timing` | Harmless at boot | none |
| `DefineBitsJPEG contains non-JPEG data with alpha` | Cosmetic warning | none |
| On a `Login.ashx` error the client navigates the **whole page** to `LOGIN_PATH` | Expected | Point `LOGIN_PATH` at the `apps/web` login page |
| `LoaderManager` lowercases every URL, and some queries are malformed (`?rnd=Xrnd=X`) | The server must resolve paths case-insensitively and parse queries leniently | apps/api + static hosting |
| `flash/characterDefine.xml` is requested from **SITE** (`/resource/flash/characterDefine.xml`), not FLASHSITE | 404 without a pack | Put FlashSV1's `characterdefine.xml` into the resource tree |

## 3. HTTP contract observed during boot (in order; the new API and static hosting must serve these)

Bases: `/flash/` = FLASHSITE (static client), `/request/` = REQUEST_PATH (apps/api), `/resource/` = SITE (resource pack).

Source column values:
- **stub**: a harness fixture. The real implementation must return the same XML shape (`01-client-map.md` section 5, `Tank.Request/*.ashx.cs`).
- **static xml**: a pre-built zlib file served from `Tank.Request`.
- **MISS**: 404 (no pack).

Paths are shown lowercased, as the client sends them.

| # | Path | Status | Source |
|---|---|---|---|
| 1 | /index.html | 200 | public |
| 2 | /flash/loading.swf | 200 | flash |
| 3 | /flash/config.xml | 200 | stub |
| 4 | /flash/md5.xml | 200 | flash |
| 5 | /request/loginselectlist.ashx | 200 | stub |
| 6 | /flash/ddt_loading.swf | 200 | flash |
| 7 | /flash/ui/vietnam/xml/xml.png | 200 | flash |
| 8 | /flash/2.png | 200 | flash |
| 9 | /flash/ui/vietnam/levelreward.xml | 200 | flash |
| 10 | /resource/flash/characterdefine.xml | 404 | MISS |
| 11 | /request/fightspirittemplatelist.xml | 200 | static xml (Tank.Request) |
| 12 | /flash/ui/vietnam/language.txt | 200 | flash |
| 13 | /flash/ui/vietnam/zhancode.txt | 200 | flash |
| 14 | /flash/ui/vietnam/swf/expression.swf | 200 | flash |
| 15 | /flash/ui/vietnam/swf/roadcomponent.swf | 200 | flash |
| 16 | /flash/ui/vietnam/swf/coreiconandtip.swf | 200 | flash |
| 17 | /flash/ui/vietnam/swf/corescalebitmap.swf | 200 | flash |
| 18 | /flash/ui/vietnam/swf/corei.swf | 200 | flash |
| 19 | /flash/ui/vietnam/swf/coreii.swf | 200 | flash |
| 20 | /flash/ui/vietnam/swf/chat.swf | 200 | flash |
| 21 | /flash/ui/vietnam/swf/playertip.swf | 200 | flash |
| 22 | /flash/ui/vietnam/swf/levelicon.swf | 200 | flash |
| 23 | /flash/ui/vietnam/swf/enthrall.swf | 200 | flash |
| 24 | /flash/ui/vietnam/swf/hall.swf | 200 | flash |
| 25 | /flash/ui/vietnam/swf/toolbar.swf | 200 | flash |
| 26 | /flash/ui/vietnam/swf/quest.swf | 200 | flash |
| 27 | /flash/ui/vietnam/swf/awardsystem.swf | 200 | flash |
| 28 | /request/activelist.xml | 200 | static xml (Tank.Request) |
| 29 | /flash/ui/vietnam/swf/academycommon.swf | 200 | flash |
| 30 | /request/templatealllist.xml | 200 | static xml (Tank.Request) |
| 31 | /flash/ui/vietnam/swf/ddtcorescalebitmap.swf | 200 | flash |
| 32 | /flash/ui/vietnam/swf/ddthallicon.swf | 200 | flash |
| 33 | /flash/ui/vietnam/swf/wonderfulactivity.swf | 200 | flash |
| 34 | /request/loaditemscategory.xml | 200 | static xml (Tank.Request) |
| 35 | /request/shopitemlist.xml | 200 | static xml (Tank.Request) |
| 36 | /request/cardupdatecondition.xml | 200 | static xml (Tank.Request) |
| 37 | /request/cardupdateinfo.xml | 200 | static xml (Tank.Request) |
| 38 | /request/cardinfolist.xml | 200 | static xml (Tank.Request) |
| 39 | /request/cardbufflist.xml | 200 | static xml (Tank.Request) |
| 40 | /request/consortiabuffertemp.xml | 200 | static xml (Tank.Request) |
| 41 | /request/serverlist.ashx | 200 | stub |
| 42 | /request/questlist.xml | 200 | static xml (Tank.Request) |
| 43 | /request/achievementlist.xml | 200 | static xml (Tank.Request) |
| 44 | /request/loadallquestions.xml | 200 | static xml (Tank.Request) |
| 45 | /request/loaduserbox.xml | 200 | static xml (Tank.Request) |
| 46 | /request/loadboxtemp.xml | 200 | static xml (Tank.Request) |
| 47 | /request/dailyawardlist.xml | 200 | static xml (Tank.Request) |
| 48 | /flash/ui/vietnam/movingnotification.txt | 200 | flash |
| 49 | /request/shopgoodsshowlist.xml | 200 | static xml (Tank.Request) |
| 50 | /request/loadmapsitems.xml | 200 | static xml (Tank.Request) |
| 51 | /request/loadpveitems.xml | 200 | static xml (Tank.Request) |
| 52 | /request/mapserverlist.xml | 200 | static xml (Tank.Request) |
| 53 | /request/levellist.xml | 200 | static xml (Tank.Request) |
| 54 | /request/bombconfig.xml | 200 | static xml (Tank.Request) |
| 55 | /request/balllist.xml | 200 | static xml (Tank.Request) |
| 56 | /request/exerciseinfolist.xml | 200 | static xml (Tank.Request) |
| 57 | /request/consortiabadgeconfig.xml | 200 | static xml (Tank.Request) |
| 58 | /request/dailyleagueaward.xml | 200 | static xml (Tank.Request) |
| 59 | /request/dailyleaguelevel.xml | 200 | static xml (Tank.Request) |
| 60 | /request/goldequiptemplateload.xml | 200 | static xml (Tank.Request) |
| 61 | /request/serverconfig.xml | 200 | static xml (Tank.Request) |
| 62 | /request/eventrewarditemlist.xml | 200 | static xml (Tank.Request) |
| 63 | /request/pettemplateinfo.xml | 200 | static xml (Tank.Request) |
| 64 | /request/petskillinfo.xml | 200 | static xml (Tank.Request) |
| 65 | /request/petconfiginfo.xml | 200 | static xml (Tank.Request) |
| 66 | /request/petlevelinfo.xml | 200 | static xml (Tank.Request) |
| 67 | /request/loadpetmoeproperty.xml | 200 | static xml (Tank.Request) |
| 68 | /request/loadstrengthexp.xml | 200 | static xml (Tank.Request) |
| 69 | /request/itemstrengthengoodsinfo.xml | 200 | static xml (Tank.Request) |
| 70 | /request/loadpetfightproperty.xml | 200 | static xml (Tank.Request) |
| 71 | /request/loadpetstarexp.xml | 200 | static xml (Tank.Request) |
| 72 | /request/suittemplateinfolist.xml | 200 | static xml (Tank.Request) |
| 73 | /request/suitpartequipinfolist.xml | 200 | static xml (Tank.Request) |
| 74 | /request/loginawarditemtemplate.xml | 200 | static xml (Tank.Request) |
| 75 | /request/newtitleinfo.xml | 200 | static xml (Tank.Request) |
| 76 | /request/activitysystemitems.xml | 200 | static xml (Tank.Request) |
| 77 | /request/clothpropertytemplateinfo.xml | 200 | static xml (Tank.Request) |
| 78 | /request/clothgrouptemplateinfo.xml | 200 | static xml (Tank.Request) |
| 79 | /request/toteminfo.xml | 200 | static xml (Tank.Request) |
| 80 | /request/totemhonortemplate.xml | 200 | static xml (Tank.Request) |
| 81 | /request/setsbuildtemp.xml | 200 | static xml (Tank.Request) |
| 82 | /request/fightlabdropitemlist.xml | 200 | static xml (Tank.Request) |
| 83 | /request/login.ashx | 200 | stub |
| 84 | /resource/image/equip/f/suits/default/1/show.png | 404 | MISS |
| 85 | /resource/image/equip/m/glass/default/1/show.png | 404 | MISS |
| 86 | /resource/image/equip/m/glass/default/2/show.png | 404 | MISS |
| 87 | /resource/image/equip/m/head/default/1/show.png | 404 | MISS |
| 88 | /resource/image/equip/m/head/default/2/show.png | 404 | MISS |
| 89 | /resource/image/equip/m/eff/default/1/show.png | 404 | MISS |
| 90 | /resource/image/equip/m/eff/default/2/show.png | 404 | MISS |
| 91 | /flash/ui/vietnam/swf/trainer.swf | 200 | flash |
| 92 | /resource/image/equip/m/cloth/default/1/show.png | 404 | MISS |
| 93 | /resource/image/equip/m/cloth/default/2/show.png | 404 | MISS |
| 94 | /resource/image/equip/m/cloth/default/3/show.png | 404 | MISS |
| 95 | /resource/image/equip/m/hair/default/1/b/show.png | 404 | MISS |
| 96 | /resource/image/equip/m/hair/default/2/b/show.png | 404 | MISS |
| 97 | /resource/image/equip/m/face/default/1/show.png | 404 | MISS |
| 98 | /resource/image/equip/m/face/default/2/show.png | 404 | MISS |
| 99 | /resource/image/equip/m/face/default/3/show.png | 404 | MISS |
| 100 | /resource/image/arm//1/0/show.png | 404 | MISS |
| 101 | /resource/image/equip/wing/default/wings.swf | 404 | MISS |
| 102 | /flash/ui/vietnam/swf/trainerui.swf | 200 | flash |

Row 1 is the harness page itself. The full log with every query string is `evidence/boot-requests-full.jsonl`. Query details that matter:
- `LoginSelectList.ashx?username=<user>&rnd=`
- `ServerList.ashx?rnd=`
- `Login.ashx?selfid=NaN&rid=&site=&p=<RSA b64>&key=<md5(key)>&v=5498628`, all **GET**
- `FightLabDropItemList.xml?selfid=&key=`. Template files can carry `key=`; ignore it.

**Character-creation path** (`FIXTURE_VARIANT=register`, `evidence/ruffle-console-register.log`):
- Requests in order: `/flash/md5.xml`, `/flash/1.png?<rnd>`, `/flash/ui/vietnam/swf/choicefigure.swf`, `/flash/3.png?rn=`, `/request/serverlist.ashx`, `/flash/ui/vietnam/swf/firstTainer.swf`, then `/request/NickNameCheck.ashx?NickName=<name>`, and `VisualizeRegister.ashx` on submit (from source).
- Preloaded tutorial assets: `image/map/2010/{back.jpg,dead.png}`, `image/bomb/bullet/bullet121.swf`, `image/bomb/blastOut/blastOut121.swf`, `image/bomb/crater/121/{crater,craterBrink}.png`, `image/game/living/living001.swf`.

**After the socket LOGIN succeeds** (from source, not yet observed because there is no server), `StartupResourceLoader.startLoadRelatedInfo` requests:
- `IMListLoad`, `UserApprenticeshipInfoList`, `ConsortiaList`, `ConsortiaUsersList`
- `LoadUserMail` (inbox and sent), `AdvanceQuestionRead`, `ShopCheapItemList`
- `BallList.xml`, the calendar and active-event requests, `VoteSubmit`

## 4. AS3 patches needed or recommended

Paths are in `vendor/DDTank41/Source Flash/src`, compiled into `FlashSV1/2.png`. None is required to **boot**. Apply them in a copy, never in `vendor/`.

1. **Music: replace FLV NetStream with MP3 `Sound`.**
   - Files: `ddt/manager/SoundManager.as` (`_nc.connect(null)` ~L62, `_ns.play(SITE_MAIN+"sound/"+id+".flv")` ~L395), `CharacterSoundManager.as` (L61, L274, L295), `ddt/manager/PathManager.as:62` (`solveFlvSound`).
   - Convert `sound/*.flv` to `.mp3` offline.
2. **RSA public key** (our own key pair): `ddt/DDT.as:224-225`. The binary patch procedure is in `01-client-map.md` section 5. The launcher path needs this too.
3. **`ExternalInterface` guards** for Ruffle desktop and the projector: `ddt/manager/LeavePageManager.as` and `exitPrompt/`. Add a `fscommand("quit")` fallback.
4. **Battle timing.** These are expected from the other DDTank-on-Ruffle forks; verify them once a server exists.
   - `game/objects/GameCharacter.as` `actionPlaying`: bound the "firing" wait.
   - The bomb `target` property (`game/objects/*Bomb*.as`).
   - The projectile trail emitter in `par/`: only create it when `changedPartical` is non-empty.
5. **Optional**:
   - `ddt/data/analyze/ServerListAnalyzer.as:44` (`Port += 69`): not necessary to change, because the API simply advertises `port-69`.
   - Hardcoded VI strings (for example `login/LoginStateView.as` "Alerta：", "Đồng ý"): change for PT-BR.
6. **Loaders without source** (`Loading.swf`, `DDT_Loading.swf`, `1.png`): no patch is needed. They contain dead debug `createLogin()` code that points at `test64.ddt.7road-inc.com` and `192.168.0.10:728`. Use FFDec `-replace` if they ever need a change.

## 5. Ruffle config that worked

The full config is in `apps/client-harness/public/index.html`:
- `publicPath:/ruffle/`, `polyfills:false`, `autoplay:on`, `unmuteOverlay:hidden`, `splashScreen:false`, `scale:exactFit`
- `allowScriptAccess:true`, `allowNetworking:all`, `upgradeToHttps:false` (dev over http), `openUrlMode:allow`, `maxExecutionDuration:30`
- `socketProxy: [{host:"127.0.0.1", port:9200, proxyUrl:"ws://localhost:9300/ws"}, {host:"localhost", ...}]`
- `fontSources` (Noto Sans) and `defaultFonts`
- Flashvars: `user`, `key`, `config` (absolute URL), `site`

Everything is same-origin, so there is no CORS.

## 6. Recommendation

- **Keep the launcher (FP32 projector) as Phase 1.** It runs the original bytes. It needs the policy server (843 or in-band), `crossdomain.xml`, and the same HTTP contract.
- **Ruffle web is a realistic second target.** The module loader that stalled for other forks does **not** stall here. The remaining work is fonts, music (patch 1) and gameplay QA once `apps/game` and a resource pack exist.
- Re-run the harness after every Ruffle bump: `start` + `ws-probe` + `FIXTURE_VARIANT=socket`, then check that the WS frame arrives.
