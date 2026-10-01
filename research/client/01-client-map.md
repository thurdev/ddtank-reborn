# 01 - DDTank 4.1 client map

Date: 2026-10-01. Sources:
- `vendor/DDTank41/Source Flash/FlashSV1`: the compiled client, the only copy in the repo. `Tank.Flash/` and `Road.Flash/` are the ASP.NET website and the C# helper library. They contain **no SWFs**.
- `vendor/DDTank41/Source Flash/src`: AS3 source.
- Branch `remake/main` (diffs listed in section 9).
- The loaders were decompiled with JPEXS FFDec 26.3.0 (`vendor/_tools/ffdec`).

Paths below are relative to `vendor/DDTank41/` unless they start with `apps/` or `research/`.

## 1. SWF chain (boot order)

| # | File (in `FlashSV1/`) | Size | What it is | Has AS3 source? |
|---|---|---|---|---|
| 1 | `Loading.swf` | 184 KB, CWS v12 | Entry SWF the page embeds. Reads flashvars, loads `config.xml` and `md5.xml` (when `USE_MD5=true`), then calls `LoginSelectList.ashx` | No (decompile only) |
| 2a | `DDT_Loading.swf` | 1.0 MB, uncompressed FWS | Loaded by `Loading.swf` (via `loaderURL.replace("Loading.swf","DDT_Loading.swf")`) when the account already has a character. Contains the `pickgliss` loader framework, the zip/zlib libraries and the "whack-a-mole" loading screen. Its `NormalLuncher` loads the core | No |
| 2b | `1.png` | 200 KB | **Register launcher**: a SWF behind a 37-byte `road7` + md5 header. Loaded when `LoginSelectList` returns 0 roles (or 1 role with `IsFirst<=1`). Leads to `choicefigure.swf`, `3.png` and `firstTainer.swf` (the character creation and tutorial flow) | No |
| 3 | `2.png` | 4.5 MB, CWS v14 (plain SWF named `.png`) | **Game core**. Contains `ddt.DDT` and all 2,515 game classes. Loaded through `ModuleLoader` and `Loader.loadBytes` into `ApplicationDomain.currentDomain` | **Yes**: `Source Flash/src` matches the core 1:1 (2,515 ABC tags, 2,517 `.as` files; the only differences are the generated RSL sprite class name and 3 mx stubs) |
| 4 | `ui/vietnam/xml/xml.png` | 282 KB | A zip (FZip) of every UI layout XML | n/a |
| 5 | `ui/vietnam/swf/*.swf` | 114 files | UI asset modules, loaded on demand by `UIModuleLoader` (`ui/<LANGUAGE>/swf/<module>.swf`) | assets only |
| - | `3.png` | 212 KB, CWS | Used by the register and tutorial path | No |
| - | `Launcher.swf` | 1.3 MB | **Unused** standalone login UI. It hardcodes `http://127.0.0.1:8000/rest-auth/login/`, `/user/api/server-list/` and `/user/api/login2/getlinkflash/...` from a Django panel. Ignore it | No |
| - | `audio.swf`, `shape.swf`, `shapelite.swf`, `partical.xml`, `characterdefine.xml` | | Sound library, shapes, particles | n/a |

Module header format (`ModuleLoader.analyMd5`, `RegisterLuncher.analyMd5`): if the file starts with `road7` (`ComponentSetting.swf_head`), or the name appears in `md5.xml`, the client compares the 32-char md5 at offset 5 and loads the bytes from offset 37. If the payload does not start with `CWS`, `ModuleLoader.decry()` rotates it (`CWS` + bytes[21..] + ...). No module in this build uses `decry`. **`1.png` needs `USE_MD5=true`**: with md5 off, `RegisterLuncher` calls `loadBytes` on the raw road7 file and the screen stays blank (verified under Ruffle).

## 2. HTML embedding and flashvars

Original page: `Tank.Flash/playgame.aspx` (+ `.cs`).
- `src = <FlashSite>Loading.swf?user=<urlenc>&key=<urlenc>&config=<FlashConfig>`, `FlashVars="editby=<..>"`, `allowScriptAccess=always`, `wmode=direct`, 1000x600, bgcolor `#000000`.
- `FlashSite` and `FlashConfig` come from `Tank.Flash/Web.config` (`FlashSite=http://127.0.0.1/flash/`, `FlashConfig=http://127.0.0.1/flash/config.xml`, `LoginOnUrl`, `FlashUrl=http://127.0.0.1/playgame.aspx`, `LoginKey`).
- Query-string parameters and FlashVars both end up in `loaderInfo.parameters`.

Parameters the client reads (decompiled `Loading.as` / `DDT_Loading.as` and `ddt/data/ConfigParaser.as:24`):

| Param | Used for | Default if absent |
|---|---|---|
| `user` | Account name. Sent to `LoginSelectList.ashx?username=`, packed into the `Login.ashx` RSA blob, and used in the socket LOGIN packet | `hwq1259` (Loading.swf) / `liang01` (DDT_Loading.swf). Debug leftovers |
| `key` | One-time login key (the "password" field). Goes into the RSA blob and `md5(key)` is sent as `key=` on requests | `123456` / `111111` |
| `config` | URL of `config.xml`. Used only if its length is > 1 | relative `config.xml` |
| `site` | `PathInfo.SITEII`. Sent as `site=` to `Login.ashx`; replaces `{site}` in `LOGIN_PATH`/`FILL_PATH` | `""` |
| `rid` | Referral id. Sent as `rid=` to `Login.ashx` | `""` |
| `enterCode` | Baidu enter code | - |
| `isGuest` | `ComponentSetting.ISGUEST` | - |
| `editby` | Passed by playgame.aspx, unused by the client | - |
| 7th `lunch()` arg (`"3"` FB, `"4"` desktop) | `NormalLuncher` passes `2`; there is no flashvar | - |

Example for our site or launcher (works in the FP32 projector and Ruffle):
`http://HOST/flash/Loading.swf?user=alice&key=3F2504E0-4F89-11D3-9A0C-0305E82C3301&config=http://HOST/flash/config.xml`

`remake/main` (`Tank.Flash/play-ddt.htm`) skips `Loading.swf`, embeds `DDT_Loadin2.swf` directly and defines JS stubs.

ExternalInterface names the client calls. The page should define them; all are optional:
`isSafeFlash, setFlashCall, IsDesktop, flashloaded, pageload, beforeloadflash, toLocation(url,msg), getLocationUrl, WindowReturn, ExternalLoadStart, ExitGameToLogin, closeWindow, game_pay, game_interruption, sandaFillHandler (FILL_JS_COMMAND), setFavorite, addToFavorite, AddFavorite, showInviteBox, setDailyTask, setDailyActivity, sendWeiboFeed, facebookSend, title_effect.tickerBegin/tickerStop, alert, console.log`.
Callbacks the client registers: `SetFlashLoadExternal, ExternalLoadStop, swfExitPrompt, sinaCallBack, SetIsDesktop, sendSwfNowUrl`.

## 3. `config.xml` (FlashSV1/config.xml): every URL, IP and port

| Node | Original value | Used by |
|---|---|---|
| `FLASHSITE` | `http://127.0.0.1/flash/` | Base for `2.png`, `md5.xml`, `ui/<lang>/...`, `audio.swf`, `bombs/N.swf`, `partical.xml`, `shape.swf`, `Catharine.swf` |
| `BACKUP_FLASHSITE` | same | Retry base when an md5 check fails |
| `USE_MD5` | `true` | Enables the `md5.xml` and road7 header check (keep `true`, see section 1) |
| `SITE` | `http://gunny.vcdn.vn/` (remake: `http://127.0.0.1/resource/`) | **Resource base**: `image/...`, `sound/*.flv`, `flash/characterDefine.xml`, `swf/blast.swf` |
| `REQUEST_PATH` | `http://127.0.0.1/Request/` | Base for every `.ashx` and template `.xml` |
| `FIRSTPAGE`, `REGISTER` | `http://127.0.0.1/` | Navigation links |
| `LOGIN_PATH` | `http://127.0.0.1/server_list.html` (`{user}`, `{site}`, `{nickName}`, `{uid}` placeholders) | Where the client navigates on login error or logout |
| `FILL_PATH` | `http://127.0.0.1/pay/` | Recharge page |
| `WEEKLYSITE` | `http://127.0.0.1/flash/` | `weekly/*` |
| `POLICY_FILES/file` | `http://127.0.0.1/flash/crossdomain.xml` (remake adds `xmlsocket://127.0.0.1:843` and `:9500`) | `Security.loadPolicyFile` (a no-op in Ruffle) |
| `COUNT_PATH` | `http://assayerhandler.7road.com/` | Statistics. Blank it |
| `PHP@site/@infoPath`, `OFFICIAL_SITE`, `GAME_FORUM`, `COMMUNITY_*`, `EXTERNAL_INTERFACE_360` | 7road, the9, kaixin, oasgames, 1360.cn | Dead third-party URLs. Blank or disable them (`STATISTIC`/`STATISTICS`=false, `EXTERNAL_INTERFACE_360 enable=false`) |
| `LANGUAGE` | `vietnam` | UI path `ui/vietnam/` |
| `TRAINER_PATH` | `tutorial.swf` | |
| `MUSIC_LIST`, `DUNGEON_OPEN`, `DISABLE_TASK_ID`, `SUIT`, `TOTEM`, `NECKLACE`, `PETS_EAT`, ... | flags | Feature toggles (`ConfigParaser.as`) |
| `<update><version from to>` | 1..17 | `LoaderSavingManager.Version`, sent as `lv=17` on every module request |

**The socket host and port are not in config.xml.** They come from `ServerList.ashx`: `<Result value="true"><Item ID Name IP Port State MustLevel LowestLevel Online Remark/></Result>`. The client does **`Port += 69`** (`ddt/data/analyze/ServerListAnalyzer.as:44`; the same in compiled `2.png`). The server writes `s.Port - 69` (`Tank.Request/ServerList.ashx.cs:47`). Then `ServerManager.connentCurrentServer()` calls `SocketManager.connect(IP, Port)` (`ddt/manager/ServerManager.as:119`, raw `flash.net.Socket` in `road7th/comm/ByteSocket.as:103`). For Ruffle, `socketProxy.host` must equal the `IP` string exactly, and `port` must equal the advertised port + 69.

## 4. HTTP requests the client makes

All of these go through `LoaderManager.creatLoader`, which **lowercases the whole URL** (`com/pickgliss/loader/LoaderManager.as:97`). That means the server must match paths case-insensitively. It also appends `lv=<version>` to module, byte and bitmap loaders, and `rnd=<TextLoaderKey>` to text loaders. Because of a client bug, the query is sometimes duplicated (`?rnd=0.1rnd=0%2E1`), so query parsing must be tolerant. Request loaders use GET with `URLVariables`. `RequestVairableCreater.creatWidthKey` adds `selfid=<playerId>&key=md5(<current password>)[&rnd]`.

**Measured boot sequence.** The full list, captured under Ruffle, is in `research/client/evidence/boot-requests.tsv` (102 unique paths) and is copied into `02-ruffle-report.md` section 3.

`.ashx` endpoints referenced in the source (`grep solveRequestPath` plus string literals; 57 in total). The ones marked * are hit during boot:
`LoginSelectList*`, `ServerList*`, `Login*`, `VisualizeRegister` (create character), `NickNameCheck` (register UI), `IMListLoad`, `UserApprenticeshipInfoList`, `ConsortiaList`, `ConsortiaUsersList`, `LoadUserMail`, `MailSenderList`, `AdvanceQuestionRead`, `ShopCheapItemList`, `VoteSubmit`, `VoteSubmitResult`, `ActivePullDown`, `AdvanceQuestion`, `AdvanceQuestionAppraisal`, `AdvanceQuestTime`, `AdvanceReply`, `ApprenticeshipClubList`, `AuctionPageList`, `CommitWeeklyUserRecord`, `ConsortiaApplyUsersList`, `ConsortiaCandidateList`, `ConsortiaDutyList`, `ConsortiaEquipControlList`, `ConsortiaEventList`, `ConsortiaInviteUsersList`, `ConsortiaNameCheck`, `DailyLogList`, `FarmGetUserFieldInfos`, `FarmGetUserFieldInfosSingle`, `GetWorldWealth`, `GMTipAllByIDs?ids=`, `GiftRecieveLog`, `GiftSendLog`, `IMRecentContactsList`, `LogClickTip`, `LogInviteFriends`, `LogTime`, `LuckStarActivityRank`, `MarryInfoPageList`, `QueryWealthDivineNum`, `RenameConsortiaName`, `RenameNick`, `SameCityIMLoad`, `SendActiveKeySystem`, `SendMailGameUrl`, `UserGetActiveState`, `UserRankDate`, `CreatShortCut?gameurl=`, `ddt_game/List_BI_Click`, `ChargeMoneyForTest`, `Casdfsdf` (dead).

Static template XML under `REQUEST_PATH` (zlib-compressed unless noted; `CreateAllXml.ashx` generates them, and copies already exist in `Tank.Request/*.xml`):
`TemplateAllList, ShopItemList, ShopGoodsShowList, LoadItemsCategory, QuestList, AchievementList, LoadAllQuestions, LoadUserBox, LoadBoxTemp, DailyAwardList, LoadMapsItems, LoadPVEItems, MapServerList, LevelList, BombConfig, BallList, ExerciseInfoList, ConsortiaBadgeConfig, ConsortiaBufferTemp, ConsortiaLevelList, DailyLeagueAward, DailyLeagueLevel, GoldEquipTemplateLoad, EventRewardItemList, LoadPetMoeProperty, LoadPetFightProperty, LoadPetStarExp, ItemStrengthenGoodsInfo, ItemStrengthenData, ItemStrengthenList, ItemStrengthenPlusData, SuitTemplateInfoList, SuitPartEquipInfoList, LoginAwardItemTemplate, ActivitySystemItems, ClothPropertyTemplateInfo, ClothGroupTemplateInfo, TotemInfo, SetsBuildTemp, CardInfoList, CardUpdateCondition, CardUpdateInfo, CardBuffList, ActiveList, FightSpiritTemplateList, FightLabDropItemList, FoodComposeList, VipSettingList, EliteMatchPlayerList, WarriorFamRankList, User_LotteryRank, vote.xml`. The following are plain text, not zlib: `ServerConfig, PetTemplateInfo, Petskillinfo, PetConfigInfo, PetLevelInfo, PetSkillElementInfo, LoadStrengthExp, NewTitleInfo, TotemHonorTemplate`. There is also `CelebList/*` (ranking lists).

Files under `FLASHSITE`: `md5.xml, config.xml, DDT_Loading.swf, 1.png, 2.png, 3.png, ui/vietnam/xml/xml.png, ui/vietnam/xml/<module>.xml` (fallback when the zip is missing), `ui/vietnam/swf/<module>.swf, ui/vietnam/language.txt, levelReward.xml, movingNotification.txt, zhanCode.txt, ui/vietnam/img/trainer/*.jpg, ui/vietnam/Map02.swf, ui/vietnam/morn/ui/*.ui, audio.swf, shape.swf, partical.xml, bombs/<id>.swf, Catharine.swf, weekly/*`.

Patterns under `SITE`, the resource pack (`ddt/manager/PathManager.as`; full function list in that file):
- Equipment (`solveGoodsPath`): `image/equip/{m|f}/{TYPE}/{pic}/{1|2|3}[/{A|B}]/{show|icon_N}.png` (TYPE from `EquipType.TYPES`: head, glass, hair, eff, cloth, face, suits ...), plus `image/equip/{armlet|ring|necklace}/{pic}/...`, `image/arm/{pic}/1/{0|1}/show.png` (weapons), `image/equip/wing/{pic}/wings.swf`, `image/equip/offhand/{pic}/icon.png`, `image/equip/recover/...`, `image/prop/{pic}/{icon}.png`, `image/unfrightprop/{pic}/icon.png`, `image/task/`, `image/specialprop/chatBall/`, `image/gift/`, `image/card/{pic}/icon.jpg`, `image/cardbox/`, `image/farm/Crops|Fertilizer/`, `image/petequip/{cloth|arm|hat}/`, `image/equip/sinplelight/{x}.swf`, `image/equip/circlelight/{x}.swf`.
- Avatars and scenes: `image/virtual/{M|F}/{hair|eff|face|cloth|clothF}/{pic}/{n}.png`, `image/world/...`, `image/tilemap/{id}/map.bin`.
- Battle: `image/map/{id}/{fore|back|dead|small|icon|samll_map|samll_map_s|show1.jpg}.{png|jpg}`, `image/bomb/bullet/bullet{N}.swf`, `image/bomb/blastOut/blastOut{N}.swf`, `image/bomb/crater/{N}/crater.png`, `craterBrink.png`, `image/bomb/partical.xml`, `image/bome/shape.swf` (sic), `image/skill/{id}.swf`, `image/game/living/{x}.swf`, `image/game/pet/`, `image/gameasset/`, `image/skilleffect/`, `image/buff/`.
- Misc: `image/tool/{x}.png`, `image/effort/{x}/icon.png`, `image/consortiaicon/`, `image/consortiamap/`, `image/church/scene/`, `image/pet/`, `image/petskill/`, `image/badge/{id}/icon.png`, `image/leagueRank/`, `image/worldboss/buff/`, `swf/blast.swf`, `sound/{id}.flv` (background music via NetStream), `flash/characterDefine.xml`.

**The resource pack is not in the repo.** `remake/main:DOCUMENTACAO-RESOURCE.md` says the author used a 3.6 pack (~1.04 GB, 35,879 files, `image/` 900 MB, `sound/` 144 MB) published as `/resource/`. We must source a 4.1-era `Resource` pack (RaGEZONE, Discord), or the client renders without characters, maps or weapons.

## 5. Login key and ticket flow (original)

1. **Website** (`Tank.Flash/LoginGame.aspx.cs`): after the site login, generates `password = Guid.NewGuid()` and `time = unix`, then computes `v = md5(name + password + time + LoginKey)` with `LoginKey` from `Web.config`. It calls `Request/CreateLogin.aspx?content=urlenc(name|password|srv|login|time|v)`. On reply `"0"` it redirects to `playgame.aspx?user=<name>&key=<PASSWORD.ToUpper()>`.
2. **CreateLogin.aspx** (`Tank.Request/CreateLogin.aspx.cs`): `BaseInterface.UnEncryptLogin` checks the md5 and time, then calls `PlayerManager.Add(name.ToLower(), password.ToLower())`. This is an in-memory dictionary with a timeout.
3. **Client** calls `Login.ashx` (`login/LoginStateView.as:56-81`). The plaintext is `[year:u16][month:u8][day:u8][hour:u8][min:u8][sec:u8]` (UTC) + UTF8 `"<user>,<key>,<6 random a-z tempPwd>,<nickname>"`. It is RSA-encrypted (`CrytoUtils.rsaEncry4`, PKCS#1 v1.5, base64) and sent as `GET Login.ashx?selfid=NaN&key=md5(key)&p=<b64>&v=<Version.Build=5498628>&site=&rid=`.
4. **Login.ashx** (`Tank.Request/Login.ashx.cs:39-75`): RSA-decrypts with `privateKey` (`Tank.Request/Web.config:17`), skips the 7 date bytes and splits on `,` into 4 fields. **The `PlayerManager.Login(name,pwd)` check is commented out (`if(true)`)**, so anyone can log in as anyone. Our rewrite must enforce it. It then calls `inter.CreateLogin(name, tempPwd, ...)`, which stores `tempPwd` as the session password, and returns `<Result value="true"><Item ...PlayerInfo.../></Result>`. The client then sets `Account.Password = tempPwd` (`ddt/data/analyze/LoginAnalyzer.as`).
5. **Socket login** (`ddt/manager/GameSocketOut.as:49-77`): `PackageOut(LOGIN)`: `int Version.Build`, `int desktopType`, then RSA (`rsaEncry5`) of `[7 date bytes][8 random key bytes]"<user>,<tempPwd>"`. Afterwards the client switches its packet cipher to those 8 random bytes (`_socket.setKey`). The game server validates `tempPwd`.

### RSA public key (hardcoded)
- Source: `Source Flash/src/ddt/DDT.as:224-229` (`setup()`): modulus base64 `zRSdzFcnZjOCxDMkWUbu...87nMNLc=` (172 chars, 1024-bit), exponent `AQAB`. `CrytoUtils.generateRsaKey(mod, exp)`. There are no other copies; `rsaEncry4` is also used by `ActiveSubContent`, `CalendarManager`, `RoleRenameFrame` and `ConsortiaRenameFrame`, all with `Account.Key`.
- Compiled: the same string appears exactly once, in `FlashSV1/2.png` (ABC of `ddt.DDT`, after zlib decompression). It does not appear in `Loading.swf` or `DDT_Loading.swf`.
- The **matching private key is already in the repo**: `Tank.Request/Web.config:17` `privateKey=<RSAKeyValue>` (also in `Road.Service/App.config` for the game server). We could reuse it as-is in dev. **For production, replace the pair.** Everyone with this repo has the private key.

### Patching in our own key (two options)
- **A. Binary patch, simplest, no toolchain.** Generate a 1024-bit RSA key with e=65537. Its modulus base64 is also exactly 172 chars when the top bit is set, which is always the case for a 1024-bit key. Then:
  1. `ffdec-cli -decompress 2.png 2.fws` (gives the FWS SWF).
  2. Replace the 172-byte ASCII string. The string is the same length, so the ABC constant pool and tag lengths do not change.
  3. `ffdec-cli -compress 2.fws 2.png` (zlib CWS).
  4. If `md5.xml` lists `2.png`, update it. It does not today: only `1.png` is listed, and `1.png` has no key.

  This can be scripted in Node: inflate the bytes after the 8-byte header, `buf.indexOf(oldMod)`, write, deflate, fix the header file length.
- **B. FFDec AS3 edit.** `ffdec-cli -replace 2.png 2.new.png ddt.DDT DDT.as` with an edited `DDT.as` taken from `-export script`. Or use the GUI: open `2.png` > scripts > `ddt.DDT` > Edit ActionScript > change `_loc1_` > Save. FFDec's AS3 compiler handles single-class edits; `playerglobal.swc` is bundled in `ffdec/flashlib`. Use this for logic patches (the Ruffle fixes); use A for the key.
- **C. Recompile from source** (section 7) and edit `DDT.as` directly.

Server side: load the private key from env (`RSA_PRIVATE_KEY_XML` / PEM), never from code.

## 6. Language and text

- UI strings: `FlashSV1/ui/vietnam/language.txt` (258 KB, UTF-8 BOM, `key:value` per line). Loaded by `LanguageMgr` from `PathManager.getLanguagePath()`. A PT-BR translation means a new `ui/<lang>/` folder plus `LANGUAGE` in config.xml. **Some strings are hardcoded in AS3** (for example `LoginStateView.as`: `"Alerta："`, `"Đồng ý"`; Chinese comments and strings elsewhere). Grep before claiming full localisation.
- Other text: `movingnotification.txt` (scroll notices), `levelreward.xml`, `zhancode.txt` (word filter), the UI layout XML in `xml/xml.png` (zip) and `xml/*.xml`. Fonts referenced are `Arial`, `Arial Unicode MS`, `Verdana`, `宋体`, `Microsoft YaHei`, `Times New Roman` and `ＭＳ Ｐゴシック`, all device fonts.
- Server-side names (items, quests, maps) come from the template XML (`TemplateAllList.xml` etc.). That means DB data, which is Vietnamese today.

## 7. Toolchain to rebuild the AS3 source

Project files: `Source Flash/.actionScriptProperties` (Flash Builder 4.x, `mainApplicationPath="Source Flash.as"` which does not exist, `-locale en_US`, strict), `.flexLibProperties` (a **library project**: include all classes) and `asconfig.json` (VS Code AS3&MXML: `type: lib`, output `bin/Source Flash.swc`). There is **no application project for `2.png`**. The source is a decompiled, re-buildable dump: no `[Embed]`, but mx stubs are present. `2.png` header: SWF v14 (FP 11.1+), FileAttributes 0x19 (AS3, use-network, metadata), `EnableDebugger2` with password `NO-PASSWORD`, ProductInfo = Flex SDK (compiled with mxmlc), white background, 1 frame, ScriptLimits 1000/60. Each class sits in its own DoABC2 tag, which is the FFDec/"Flash Pro" style output.

Recompile plan (not installed yet):
- **Apache Flex SDK 4.16.1** (`https://archive.apache.org/dist/flex/4.16.1/binaries/apache-flex-sdk-4.16.1-bin.zip`, 72 MB zip, ~250 MB unpacked, Java 8+; the Java 21 present here works for mxmlc/compc). `playerglobal.swc` 32.0 is required: `https://fpdownload.macromedia.com/get/flashplayer/updaters/32/playerglobal32_0.swc` (472 KB) at `frameworks/libs/player/32.0/playerglobal.swc`, or the copy bundled in FFDec.
- Or **Harman AIR SDK 51.4.1.1** (latest per airsdk.harman.com, ~600 MB-1 GB unpacked; ships `mxmlc-cli.jar`/`compc`, use `-target-player=14`).
- Build the core as an application whose document class is a stub Sprite that references `ddt.DDT` (`NormalLuncher` uses `ClassUtils.CreatInstance("ddt.DDT")` and `getDefinitionByName("ddt.loader.StartupResourceLoader")`, so every class must be linked in):
  `mxmlc -source-path=src -include-sources=src -static-link-runtime-shared-libraries -target-player=11.1 -swf-version=14 -default-size 1000 600 -default-frame-rate 25 -locale en_US -output 2.png src/CoreStub.as`
  (or `compc -include-sources src -output core.swc`, then mxmlc with `-include-libraries core.swc`). Expect a round of decompiler-artifact fixes (labels, `§§` locals; none found by grep, so the dump looks clean).
- Never modify `vendor/`: copy `Source Flash/src` into a new `apps/client-src` (or similar) owned by whichever task patches the client.

**JPEXS FFDec instead of recompiling**: viable and much cheaper for small patches (the key, `Port+69`, the Ruffle fixes). Installed at `vendor/_tools/ffdec` (26.3.0 portable zip, 19 MB zip / 24 MB unpacked, Java 21 detected: `openjdk 21.0.12`). Useful CLI: `-export script <out> <swf>`, `-selectclass a.B,c.D`, `-replace <in> <out> <class> <file.as>`, `-decompress`, `-compress`, `-dumpSWF`, `-header`. The loaders (`Loading.swf`, `DDT_Loading.swf`, `1.png`) have no source, so FFDec is the only way to patch them.

## 8. Item and skin images

The client builds every image URL from `SITE` (section 4). Equipment needs `{pic}` from `TemplateAllList.xml` (`Pic` attribute), sex (`m`/`f`), the category name from `EquipType.TYPES`, and the colour or layer index `1|2|3`. Example 404s from a boot with no pack: `image/equip/m/cloth/default/1/show.png`, `image/equip/m/hair/default/1/b/show.png`, `image/arm//1/0/show.png` (empty pic means the default weapon is missing from our fixture), `image/equip/wing/default/wings.swf`, `image/map/2010/back.jpg`, `image/game/living/living001.swf`. UI icons that live inside `ui/vietnam/swf/*.swf` are present.

## 9. `remake/main` differences relevant to the client

- `FlashSV1/config.xml`: `SITE=http://127.0.0.1/resource/`, `USE_MD5=false`, `LOGIN_PATH=/index.htm`, policy files `xmlsocket://127.0.0.1:843` and `:9500`, statistics and 360 disabled.
- `md5.xml`: only `1.png` with md5 `2e6381d7...`. **The remake's `1.png` is the same file**, so that md5 would fail the header check; this is probably why they bypass `Loading.swf`.
- `Loading.swf` was patched (201 KB, `.bak-pre-local-login` kept) and `DDT_Loadin2.swf` was added. `Tank.Flash/play-ddt.htm` embeds it directly; `devlogin.ashx` and `local-create-login/CreateLogin.aspx` handle local logins.
- It also adds `Launcher.Electron/` (old-Electron Flash launcher) and the docs `DOCUMENTACAO-LAUNCHER.md` and `DOCUMENTACAO-RESOURCE.md`.
