# 00 — Tank.Request HTTP endpoints (.ashx)

Port target: `apps/api` (Fastify) must serve these URLs **byte-compatibly** (same path, params, XML element/attribute
names, compression) because the Flash client (`vendor/DDTank41/Source Flash`) is fixed.
Source: `vendor/DDTank41/Tank.Request` (ASP.NET WebForms, .NET 4.x). Paths below are relative to `vendor/DDTank41/`.

- Full per-endpoint detail (params, procs, XML attributes, client callers, **real sample output** for every endpoint
  that has a shipped snapshot): [00a-endpoint-catalog.md](00a-endpoint-catalog.md).
- Generator: `python docs/spec/request/tools/extract_endpoints.py vendor/DDTank41` (`--json out.json` for machine use,
  e.g. to scaffold Fastify routes). Re-run after any vendor update. The summary table at the end of this file is
  produced by the same tool (`build_endpoints_md.py` concatenates this header + the table).

## 1. Conventions

| Topic | Rule | Source |
|---|---|---|
| Base URL | client calls `REQUEST_PATH + name`; `REQUEST_PATH` comes from `config.xml` (`<REQUEST_PATH value="http://host/Request/"/>`) | `Source Flash/src/ddt/manager/PathManager.as:126-129`, `Tank.Flash/config.xml:10` |
| Case | client literals differ in case from server files (`TemplateAllList.xml` vs built `TemplateAlllist.xml`, `BombConfig.xml` vs `bombconfig.xml`); IIS is case-insensitive → **our router and static file lookup must be case-insensitive** | `TemplateAllList.ashx.cs`, `StartupResourceLoader.as` |
| Params | `context.Request["x"]` = query string **or** form (GET and POST both accepted); values often `HttpUtility.UrlDecode`d again | all handlers |
| Root element | `<Result value="true|false" message="Success!|Fail!|…" [total=".."] [date="yyyy-MM-dd"] [lastUpdateTime=".."]>` with children (`Item`, `Info`, …); attributes `value`/`message` are appended **after** children were added, but as attributes they serialize on the root tag | e.g. `BallList.ashx.cs` |
| Serialization | `XElement.ToString(check:false)` = `XmlWriter` with `OmitXmlDeclaration=true, Indent=true, CheckCharacters=false` → no `<?xml?>`, 2-space indent, CRLF newlines, booleans `true/false` lowercase, `DateTime` as `XAttribute` default (`yyyy-MM-ddTHH:mm:ss[.fffffff]`), doubles invariant culture | `Bussiness/XmlExtends.cs:9-20` |
| Encoding | UTF-8 (no BOM in compressed files; `StreamWriter` default = UTF-8 **without** BOM for plain builds) | `Tank.Request/csFunction.cs` `CreateCompressXml` |
| Compression | `StaticFunction.Compress` = zlib (RFC 1950, `ZOutputStream(ms, 9)` → header `78 DA`, Adler-32 trailer) of the UTF-8 XML. Node: `zlib.deflateSync(buf, {level: 9})` produces the same framing | `Tank.Request/StaticFunction.cs:27-55` |
| Which responses are compressed | decided by the **client loader type**: `COMPRESS_TEXT_LOADER(5)` / `COMPRESS_REQUEST_LOADER(7)` inflate (`com/pickgliss/loader/CompressTextLoader.as:31`); `TEXT_LOADER` / `REQUEST_LOADER(6)` do **not**. The catalog lists the loader type per endpoint | `com/pickgliss/loader/BaseLoader.as:33-37` |
| Content-Type | `text/plain` (dynamic handlers); static files served by IIS as `text/xml` — client ignores it | |

### 1.1 Three handler families

1. **Static template builders (55 endpoints)** — e.g. `BallList.ashx`: admin-only; query DB, build XML, write it to the
   web root as `<File>.xml` (zlib, sometimes also a plain `<File>_out.xml`), respond with text
   `Build:<File>.xml,Success!` (or `IP is not valid!`). **The client never calls these `.ashx`; it downloads the
   generated `<File>.xml`** (mostly at boot). `CreateAllXml.ashx` calls ~30 builders at once
   (`Tank.Request/CreateAllXml.ashx.cs:25-59`); `CelebList/CreateAllCeleb.ashx` rebuilds all ranking files
   (rankings are the `CelebBy*.xml` files built by `csFunction.BuildCelebUsers/BuildCelebConsortia` with
   `SP_CustomPage(V_Sys_Users_Detail | V_Consortia)` page 1, size 50, order codes `PlayerBussiness.cs:2072-2110`).
   Port: generate these files from Postgres at boot and on admin "publish" (and on a cron for Celeb lists, the original
   used an external scheduler hitting the URLs), serve from memory with ETag; keep the `.ashx` builder URLs as admin
   endpoints (protected by admin auth, not IP).
2. **Dynamic list/query handlers** — e.g. `ConsortiaList.ashx?page=&size=&order=&consortiaID=&name=&level=&openApply=`:
   respond directly with XML (plain or zlib per family above). Paging through the generic `SP_CustomPage`
   (`@QueryStr` table/view, `@QueryWhere` **string-concatenated SQL**, `@PageSize`, `@PageCurrent`, `@FdShow`,
   `@FdOrder`, `@FdKey`, `@TotalRow OUTPUT`; `Bussiness/BaseBussiness.cs:22-40`) → port as parameterized Drizzle
   queries (never build SQL from strings; `csFunction.ConvertSql` is the only "sanitizer", `csFunction.cs`).
3. **Actions / auth** — `Login.ashx` (RSA blob `p`), `RenameNick.ashx`, `RenameConsortiaName.ashx`, `AccountRegister.ashx`,
   `VisualizeRegister.ashx`, `ActivePullDown.ashx`, `ChargeTest.ashx`, `SentReward.ashx`, `API/Login.ashx`,
   `API/Register.ashx`, transit pages (`PayTransit`, `FavoriteTransit`, `ExitGameTransit`).

### 1.2 Authentication patterns

| Pattern | Endpoints | Notes |
|---|---|---|
| Admin IP (`AppSettings["AdminIP"]`, `|`-separated, **empty = everybody**) | all builders | `csFunction.ValidAdminIP` (`csFunction.cs`). Replace with admin session/JWT. |
| RSA `p` | `Login.ashx`, `RenameNick.ashx`, `RenameConsortiaName.ashx` | `p` = base64 RSA (key `StaticFunction.RsaCryptor`, shared with the client's embedded public key); plaintext from byte 7 = `name,pwd,newPwd,nickname` (`Login.ashx.cs`). **The password check is disabled** (`if(true)` instead of `PlayerManager.Login`) — any `name` logs in. Our port must verify the web-session login key (see `research/protocol-excerpts/ddtank41-login-flow.txt`). |
| `key` + `selfid` | `dailyloglist`, `GiftRecieveLog`, `giftsendlog*`, `FarmGetUserFieldInfos`, `luckstaractivityrank`, `ActivePullDown` | `key` = per-login key issued by the game server; validate against session store |
| none | most list/query endpoints (trust `selfid`/`userID`/`ID` params) | information disclosure (e.g. `LoadUserItems.ashx?ID=`, `LoadUserMail.ashx?selfid=` returns anybody's mail). Port: bind to the authenticated session where the client sends the key; otherwise accept but scope to public data |
| shared secret | `ChargeTest.ashx` (`chargekey` vs AppSettings), `SentReward.ashx` (`content` signed) | payment/GM — admin only in our port |

## 2. Boot sequence (client `StartupResourceLoader`)

`Source Flash/src/ddt/loader/StartupResourceLoader.as:440-498` queues (in order; ★ = static built file):
ActiveList★, TemplateAllList★ (`TemplateAlllist.xml`, items), LoadItemsCategory★, ShopItemList★, card rule files★
(CardUpdateCondition, CardUpdateInfo, CardInfoList, CardBuffList), consortia skill list, `ServerList.ashx`,
`LoginSelectList.ashx`, QuestList★, AchievementList★, LoadAllQuestions★, LoadUserBox★, LoadBoxTemp★, DailyAwardList★,
moving notifications, shop sort, LoadMapsItems★, LoadPVEItems★, MapServerList★, LevelList★ (exp), weapon ball config
(`BombConfig.xml`★), BallList★, texp exp, ConsortiaBadgeConfig★, DailyLeagueAward★, DailyLeagueLevel★, wish info,
ServerConfig★, novice/recharge, PetTemplateInfo★, Petskillinfo★, PetConfigInfo★, PetLevelInfo★, LoadPetMoeProperty★,
store equip config, ItemStrengthenGoodsInfo★, pet evolution / rising star, Suit templates★, LoginAwardItemTemplate★,
NewTitleInfo★, ActivitySystemItems★, avatar collection, TotemInfo★, TotemHonorTemplate★, fine suit.
After entering the lobby (`:370-384`): BallList, friend list (`IMListLoad.ashx`), academy list
(`UserApprenticeshipInfoList.ashx`), own consortia (`ConsortiaList.ashx`, `ConsortiaUsersList.ashx`), calendar,
mail (`LoadUserMail.ashx`, `MailSenderList.ashx`), consortia level-up info, feedback, `shopcheapitemlist.ashx`.
(Mapping of loader functions to files above is from function names; the generated `boot` column is authoritative.) Everything else is on demand (rankings, auction, marriage list, farm, etc.).
**Boot blocker**: if any boot file is missing/invalid the client stays on the loading bar → priority 1 for `apps/api`.

## 3. Gaps and gotchas

1. **Static-only files (no builder in DDTank41)** — shipped as snapshots in `Tank.Request/*.xml` and requested by the
   client: `CardBuffList.xml, CardInfoList.xml, CelebByAchievementPoint{,Day,Week}List.xml, CelebByDayGiftGp.xml,
   CelebByGiftGpList.xml, CelebByWeekGiftGp.xml, CelebByWeekLeagueScore.xml, ClothGroupTemplateInfo.xml,
   ClothPropertyTemplateInfo.xml, ConsortiaBadgeConfig.xml, ExerciseInfoList.xml, FightLabDropItemList.xml,
   FightSpiritTemplateList.xml, FoodComposeList.xml, GoldEquipTemplateLoad.xml, ItemStrengthenData.xml,
   ItemStrengthenGoodsInfo.xml, LevelList.xml, LoadAllQuestions.xml, LoadPetStarExp.xml, LoadStrengthExp.xml,
   PetConfigInfo.xml, PetExpItemPrice.xml, PetLevelInfo.xml, SetsBuildTemp.xml, TotemInfo.xml, WarriorFamRankList.xml`.
   Port: import them once into DB tables via a converter (decompress → parse attributes → seed), then generate like
   the others; until then serve the snapshot bytes verbatim from `packages/game-data/assets/request/`.
2. **Requested by the client but no handler and no file** (feature broken in DDTank41 too):
   `AdvanceQuestion.ashx, AdvanceQuestionAppraisal.ashx, AdvanceReply.ashx, ChargeMoneyForTest.ashx,
   CommitWeeklyUserRecord.ashx (donor DDTank4.1/Request has it), ConsortiaCandidateList.ashx (DDT-6600),
   GetWorldWealth.ashx, LogClickTip.ashx (DDT-6600), LogInviteFriends.ashx, QueryWealthDivineNum.ashx,
   SameCityIMLoad.ashx, SendActiveKeySystem.ashx, SendMailGameUrl.ashx, UserGetActiveState.ashx, VoteSubmit.ashx
   (DDT-6600), VoteSubmitResult.ashx, ItemStrengthenPlusData.xml, levelReward.xml, VipSettingList.xml,
   User_LotteryRank.xml, vote.xml, weekly/weeklyInfo.xml, AreaCelebBy*.xml (cross-server rankings, 18 files),
   CelebByConsortia{,Day,Week}GiftGp.xml`. Port: return `<Result value="false" message="Not supported"/>` (or an
   empty valid list) so the UI degrades gracefully; implement from DDT-6600 where available.
3. **Compression mismatch**: `AdvanceQuestionRead, AdvanceQuestTime, AuctionPageList, IMListLoad, IMRecentContactsList,
   MarryInfoPageList` write zlib but the client loads them with plain `REQUEST_LOADER` → in DDTank41 these screens
   receive binary garbage. Port: **follow the client** (plain XML) — verify each in Ruffle.
4. `ServerList.ashx` advertises `Port = s.Port − 69` for each server from Center (`Tank.Request/ServerList.ashx.cs`) —
   keep the convention or store the client-facing port explicitly.
5. Builders write into the web root on every call (race conditions, no auth if `AdminIP` empty) — do not port that.
6. `FireCommand`-style backdoors don't exist here, but `Login.ashx` bypass (§1.2) and SQL string building are critical
   security bugs; `.aspx` admin/test pages (`ChargeMoney.aspx, ChargeToUser.aspx, KitoffUser.aspx, SendItemTest.aspx,
   SentRewardTest.aspx, SystemNotice.aspx, NoticeServerUpdate.aspx, ExperienceRate.aspx, CreateLogin.aspx,
   LoginTest.aspx, UserNameCheck.aspx, ValidateCode.aspx, AASGetState/AASUpdateState.aspx, click.aspx,
   SubmitTest.aspx`) are out of scope for the client API and become authenticated admin REST endpoints.

## 4. Port design (apps/api)

- `routes/request/*.ts`, one file per endpoint family; route table generated from the tool's JSON
  (`url`, `params`, `output`, `loader`) so every URL exists from day one (unimplemented → `Result value=false`).
- `lib/flash-xml.ts`: `resultXml(children, {value, message, ...attrs})` reproducing XmlWriter output (attribute order
  = insertion order, `&quot;` escaping for `"` inside attributes, indent 2, CRLF), `sendZlib(reply, xml)`.
- Golden tests: for every endpoint with a sample in the catalog, seed DB from the snapshot and assert our output
  decompresses to the same XML (modulo dates).
- Static template cache: `TemplateService.rebuild(name)` → bytes in memory + optional disk mirror; invalidated by
  admin edits (`apps/admin`) and published to clients through the same URLs.

## 5. All endpoints (summary)

Columns: mode (`build→X.xml` static builder | `zlib` direct compressed | `xml` direct plain | `other` text/redirect),
auth, params, stored procedures (resolved through `Bussiness/*.cs`; `SP_CustomPage(T)` = generic pager on table/view
`T`), whether the client references it, and whether it is part of the boot queue. Details & samples: [00a](00a-endpoint-catalog.md).

Endpoints: 123; static-build: 55; referenced by client: 84; boot: 39

| # | URL | mode | auth | params | procs | client | boot |
|---|---|---|---|---|---|---|---|
| 1 | `/AccountRegister.ashx` | xml | user/password | username, password | SP_Account_Register | — |  |
| 2 | `/achievementlist.ashx` | build→achievementlist_out.xml,achievementlist.xml | admin-IP |  | SP_Achievement_All, SP_Achievement_Condition_All, SP_Achievement_Reward_All | yes | **boot** |
| 3 | `/ActiveList.ashx` | build→ActiveList.xml | admin-IP |  | SP_Active_All | yes |  |
| 4 | `/ActivePullDown.ashx` | xml | RSA | selfid, activeID, key, activeKey | SP_Active_PullDown | yes |  |
| 5 | `/activitysystemitems.ashx` | build→activitysystemitems_out.xml,activitysystemitems.xml | admin-IP |  | SP_ActivitySystemItem_All | yes | **boot** |
| 6 | `/AdvanceQuestionRead.ashx` | zlib | none | useid |  | yes | **boot** |
| 7 | `/AdvanceQuestTime.ashx` | zlib | none | useid |  | yes |  |
| 8 | `/API/Login.ashx` | other | key | username, password |  | yes |  |
| 9 | `/API/Register.ashx` | other | key | username, password, email, phone |  | — |  |
| 10 | `/ApprenticeshipClubList.ashx` | xml | none | page, selfid, isReturnSelf, name, appshipStateType, requestType | SP_CustomPage(V_Sys_Users_Detail), SP_Users_SingleByNickName | yes |  |
| 11 | `/AuctionPageList.ashx` | zlib | none | page, name, type, pay, userID, buyID, order, sort … | Auction, SP_Users_Items_Single | yes |  |
| 12 | `/BallList.ashx` | build→BallList.xml | admin-IP |  | SP_Ball_All | yes | **boot** |
| 13 | `/bombconfig.ashx` | build→bombconfig.xml | admin-IP |  | [SP_Ball_Config_All] | yes | **boot** |
| 14 | `/CardUpdateCondition.ashx` | build→CardUpdateCondition.xml | none |  | SP_Get_CardUpdateCondiction | yes | **boot** |
| 15 | `/CardUpdateInfo.ashx` | build→CardUpdateInfo.xml | none |  | SP_Get_CardUpdateInfo | yes | **boot** |
| 16 | `/CelebList/CelebByConsortiaDayHonor.ashx` | build→CelebByConsortiaDayHonor.xml | admin-IP |  | SP_CustomPage(V_Consortia) | — |  |
| 17 | `/CelebList/CelebByConsortiaDayRiches.ashx` | build→CelebByConsortiaDayRiches.xml | admin-IP |  | SP_CustomPage(V_Consortia) | yes |  |
| 18 | `/CelebList/celebbyconsortiafightpower.ashx` | build→celebbyconsortiafightpower.xml | admin-IP |  | SP_CustomPage(V_Consortia) | yes |  |
| 19 | `/CelebList/CelebByConsortiaHonor.ashx` | build→CelebByConsortiaHonor.xml | admin-IP |  | SP_CustomPage(V_Consortia) | — |  |
| 20 | `/CelebList/CelebByConsortiaLevel.ashx` | build→CelebByConsortiaLevel.xml | admin-IP |  | SP_CustomPage(V_Consortia) | yes |  |
| 21 | `/CelebList/CelebByConsortiaRiches.ashx` | build→CelebByConsortiaRiches.xml | admin-IP |  | SP_CustomPage(V_Consortia) | yes |  |
| 22 | `/CelebList/CelebByConsortiaWeekHonor.ashx` | build→CelebByConsortiaWeekHonor.xml | admin-IP |  | SP_CustomPage(V_Consortia) | — |  |
| 23 | `/CelebList/CelebByConsortiaWeekRiches.ashx` | build→CelebByConsortiaWeekRiches.xml | admin-IP |  | SP_CustomPage(V_Consortia) | yes |  |
| 24 | `/CelebList/CelebByDayBestEquip.ashx` | build→CelebForBestEquip.xml | admin-IP |  | SP_Users_BestEquip | — |  |
| 25 | `/CelebList/CelebByDayFightPowerList.ashx` | build→CelebByDayFightPowerList.xml | admin-IP |  | SP_CustomPage(V_Sys_Users_Detail) | yes |  |
| 26 | `/CelebList/CelebByDayGPList.ashx` | build→CelebByDayGPList.xml | admin-IP |  | SP_CustomPage(V_Sys_Users_Detail) | yes |  |
| 27 | `/CelebList/CelebByDayOfferList.ashx` | build→CelebByDayOfferList.xml,CelebByDayOfferList.xml | admin-IP |  | SP_CustomPage(V_Sys_Users_Detail) | — |  |
| 28 | `/CelebList/CelebByGpList.ashx` | build→CelebByGPList.xml,CelebByGpList.xml | admin-IP |  | SP_CustomPage(V_Sys_Users_Detail) | yes |  |
| 29 | `/CelebList/CelebByOfferList.ashx` | build→CelebByOfferList.xml,CelebByOfferList.xml | admin-IP |  | SP_CustomPage(V_Sys_Users_Detail) | — |  |
| 30 | `/CelebList/CelebByWeekGPList.ashx` | build→CelebByWeekGPList.xml,CelebByWeekGPList.xml | admin-IP |  | SP_CustomPage(V_Sys_Users_Detail) | yes |  |
| 31 | `/CelebList/celebbyweekleaguescore.ashx` | other | none |  |  | — |  |
| 32 | `/CelebList/CelebByWeekOfferList.ashx` | build→CelebByWeekOfferList.xml,CelebByWeekOfferList.xml | admin-IP |  | SP_CustomPage(V_Sys_Users_Detail) | — |  |
| 33 | `/CelebList/CreateAllCeleb.ashx` | other | admin-IP |  |  | — |  |
| 34 | `/CelebList/UserRankDate.ashx` | xml | none | userID, ConsortiaID | SP_Sys_Users_Rank_Date | yes |  |
| 35 | `/ChargeTest.ashx` | other | key | chargeID, userName, money, payWay, needMoney, nickname, chargekey | SP_Charge_Money_Add, SP_Charge_Money_UserId_Add | — |  |
| 36 | `/CheckRegistration.ashx` | zlib | none |  |  | — |  |
| 37 | `/ConsortiaAllyList.ashx` | xml | none | page, size, order, consortiaID, state, name | SP_Consortia_AllyByState, SP_Consortia_Ally_Neutral, SP_CustomPage(Consortia) | — |  |
| 38 | `/ConsortiaApplyAllyList.ashx` | xml | none | page, size, order, consortiaID, applyID, state | SP_CustomPage(V_Consortia_Apply_Ally) | — |  |
| 39 | `/ConsortiaApplyUsersList.ashx` | xml | none | page, size, order, consortiaID, applyID, userID | SP_CustomPage(V_Consortia_Apply_Users) | yes |  |
| 40 | `/consortiabuffertemp.ashx` | build→consortiabuffertemp_out.xml,consortiabuffertemp.xml | admin-IP |  | SP_Consortia_Buff_Temp_All | yes |  |
| 41 | `/ConsortiaDutyList.ashx` | xml | none | page, size, order, consortiaID, dutyID | SP_CustomPage(Consortia_Duty) | yes |  |
| 42 | `/ConsortiaEquipControl.ashx` | xml | none | consortiaID | SP_Consortia_Equip_Control_Single | — |  |
| 43 | `/ConsortiaEquipControlList.ashx` | xml | none | page, size, order, consortiaID, level, type | SP_CustomPage(Consortia_Equip_Control) | yes |  |
| 44 | `/ConsortiaEventList.ashx` | xml | none | page, size, order, consortiaID | SP_CustomPage(Consortia_Event) | yes |  |
| 45 | `/ConsortiaIMList.ashx` | xml | none | id | SP_Consortia_Single, SP_CustomPage(V_Consortia_Users) | — |  |
| 46 | `/ConsortiaInviteUsersList.ashx` | xml | none | page, size, order, userID, inviteID | SP_CustomPage(V_Consortia_Invite) | yes |  |
| 47 | `/ConsortiaLevelList.ashx` | build→ConsortiaLevelList.xml | none |  | SP_Consortia_Level_All | yes |  |
| 48 | `/ConsortiaList.ashx` | zlib | none | page, size, order, consortiaID, name, level, openApply | SP_CustomPage(V_Consortia) | yes | **boot** |
| 49 | `/ConsortiaNameCheck.ashx` | xml | none | NickName | SP_Consortia_CheckByName | yes |  |
| 50 | `/ConsortiaUsersList.ashx` | xml | none | page, size, order, consortiaID, userID, state | SP_CustomPage(V_Consortia_Users) | yes | **boot** |
| 51 | `/CreateAllXml.ashx` | other | admin-IP |  |  | — |  |
| 52 | `/CreatShortCut.ashx` | other | none | gameurl |  | yes |  |
| 53 | `/DailyAwardList.ashx` | build→DailyAwardList.xml | none |  | SP_Daily_Award_All | yes | **boot** |
| 54 | `/DailyLeagueAwardList.ashx` | build→dailyleagueaward_out.xml,dailyleagueaward.xml | admin-IP |  | SP_Daily_League_Award_All | yes | **boot** |
| 55 | `/DailyLeagueLevelList.ashx` | build→dailyleaguelevel_out.xml,dailyleaguelevel.xml | admin-IP |  | SP_FairBattleReward_All | yes | **boot** |
| 56 | `/dailyloglist.ashx` | zlib | key | key, selfid | SP_DailyLogList_Single, SP_DailyLogList_Update | yes |  |
| 57 | `/elitematchplayerlist.ashx` | build→elitematchplayerlist.xml | admin-IP |  |  | yes |  |
| 58 | `/eventrewarditemlist.ashx` | build→eventrewarditemlist_out.xml,eventrewarditemlist.xml | admin-IP |  | SP_Get_EventRewardGoods, SP_Get_EventRewardInfo | yes | **boot** |
| 59 | `/ExitGameTransit.ashx` | other | none | username, site |  | — |  |
| 60 | `/FarmGetUserFieldInfos.ashx` | xml | key | selfid, key | SP_Get_SingleFields, SP_Users_Friends | yes |  |
| 61 | `/FarmGetUserFieldInfosSingle.ashx` | xml | none | friendID |  | yes |  |
| 62 | `/FavoriteTransit.ashx` | other | none | username, site |  | — |  |
| 63 | `/fightlabdropitemlist.ashx` | build→fightlabdropitemlist_out.xml | admin-IP |  | SP_Drop_Item_All | — |  |
| 64 | `/GetSID.ashx` | other | none |  |  | — |  |
| 65 | `/GiftRecieveLog.ashx` | zlib | key | key, selfid, userID | SP_Users_Gift_Single | yes |  |
| 66 | `/giftsendlog.ashx` | zlib | key | key, selfid, userID | SP_Users_Gift_Single | yes |  |
| 67 | `/giftsendlog1.ashx` | zlib | key | key, selfid, userID | SP_Users_Gift_Single | — |  |
| 68 | `/gmtipallbyids.ashx` | xml | none | ids | SP_Edictum_All | yes |  |
| 69 | `/IMFriendsBbs.ashx` | xml | none | Uid | SP_Users_FriendsBbs | — |  |
| 70 | `/IMFriendsGood.ashx` | xml | none | UserName | SP_Users_Friends_Good | — |  |
| 71 | `/IMListLoad.ashx` | zlib | none | id | SP_Users_Friends | yes | **boot** |
| 72 | `/IMRecentContactsList.ashx` | zlib | none | useid |  | yes |  |
| 73 | `/ItemStrengthenList.ashx` | build→ItemStrengthenList.xml | none |  | SP_Item_Strengthen_All | yes |  |
| 74 | `/KeyGenerator.ashx` | other | none |  |  | — |  |
| 75 | `/LoadBoxTemp.ashx` | build→LoadBoxTemp.xml | admin-IP |  | SP_ItemsBox_All | yes | **boot** |
| 76 | `/LoadItemsCategory.ashx` | build→LoadItemsCategory.xml | none |  | SP_Items_Category_All | yes | **boot** |
| 77 | `/LoadMapsItems.ashx` | build→LoadMapsItems.xml | admin-IP |  | SP_Maps_All | yes | **boot** |
| 78 | `/loadpetfightproperty.ashx` | build→loadpetfightproperty_out.xml,loadpetfightproperty.xml | admin-IP |  | SP_PetFightProperty_All | yes | **boot** |
| 79 | `/loadpetmoeproperty.ashx` | build→loadpetmoeproperty_out.xml,loadpetmoeproperty.xml | admin-IP |  | SP_Pet_Moe_Property_All | yes | **boot** |
| 80 | `/LoadPVEItems.ashx` | build→LoadPVEItems.xml | admin-IP |  | SP_PveInfos_All | yes | **boot** |
| 81 | `/LoadUserBox.ashx` | build→LoadUserBox.xml | admin-IP |  | SP_TimeBox_Award_All | yes | **boot** |
| 82 | `/LoadUserEquip.ashx` | xml | none | ID | SP_Users_Items_Equip, SP_Users_SingleByUserID | — |  |
| 83 | `/LoadUserItems.ashx` | xml | none | ID | SP_Users_Items_All | — |  |
| 84 | `/LoadUserMail.ashx` | zlib | none | selfid | SP_Mail_BySenderID, SP_Mail_ByUserID, SP_Users_Items_Single | yes |  |
| 85 | `/LoadUsersSort.ashx` | xml | none | page, size, order, state | SP_CustomPage(V_Sys_Users_Detail) | — |  |
| 86 | `/Login.ashx` | xml | RSA | p, site |  | yes |  |
| 87 | `/LoginAwardItemTemplate.ashx` | build→loginawarditemtemplate.xml | admin-IP |  | SP_AccumulAtiveLoginAward_All | yes | **boot** |
| 88 | `/LoginSelectList.ashx` | xml | user/password | username, password | SP_Users_LoginList | yes | **boot** |
| 89 | `/LogTime.ashx` | other | none | page, size, order, consortiaID, state, name | SP_Consortia_AllyByState, SP_Consortia_Ally_Neutral, SP_CustomPage(Consortia) | yes |  |
| 90 | `/luckstaractivityrank.ashx` | xml | key | selfid, key | SP_Luckstar_Activity_Rank_All | yes |  |
| 91 | `/MailSenderList.ashx` | zlib | none | selfID | SP_Mail_BySenderID | yes |  |
| 92 | `/MapServerList.ashx` | build→MapServerList.xml | none |  | SP_Maps_Server_All | yes | **boot** |
| 93 | `/MapWeekList.ashx` | xml | none |  |  | — |  |
| 94 | `/MarryInfoPageList.ashx` | zlib | none | page, name, sex, size | V_Sys_Marry_Info | yes |  |
| 95 | `/newtitle.ashx` | build→newtitleinfo.xml | admin-IP |  | SP_New_Title_All | yes | **boot** |
| 96 | `/NickNameCheck.ashx` | xml | none | NickName | SP_Users_SingleByNickName | yes |  |
| 97 | `/NPCInfoList.ashx` | build→NPCInfoList.xml | none |  | SP_NPC_Info_All | — |  |
| 98 | `/PayTransit.ashx` | other | none | username, site |  | — |  |
| 99 | `/petskillelementinfo.ashx` | build→petskillelementinfo.xml | none |  | SP_PetSkillElementInfo_All | yes |  |
| 100 | `/petskillinfo.ashx` | build→petskillinfo.xml | none |  | SP_PetSkillInfo_All | yes | **boot** |
| 101 | `/petskilltemplateinfo.ashx` | build→petskilltemplateinfo.xml | none |  | SP_PetSkillTemplateInfo_All | — |  |
| 102 | `/pettemplateinfo.ashx` | build→pettemplateinfo.xml | none |  | SP_PetTemplateInfo_All | yes | **boot** |
| 103 | `/QuestList.ashx` | build→QuestList.xml | admin-IP |  | SP_Quest_All, SP_Quest_Condiction_All, SP_Quest_Goods_All | yes | **boot** |
| 104 | `/RenameConsortiaName.ashx` | xml | RSA | p, site |  | yes |  |
| 105 | `/RenameNick.ashx` | xml | RSA | p, site, nickname, newNickname | SP_Users_RenameByCard, SP_Users_RenameNick | yes |  |
| 106 | `/runetemplatelist.ashx` | other | admin-IP |  |  | — |  |
| 107 | `/SentReward.ashx` | other | none | content | SP_Admin_SendAllItem, SP_Admin_SendUserItem, SP_Users_SingleByUserName | — |  |
| 108 | `/serverconfig.ashx` | build→ServerConfig.xml | admin-IP |  | SP_Server_Config | yes | **boot** |
| 109 | `/ServerList.ashx` | xml | none |  |  | yes | **boot** |
| 110 | `/shopcheapitemlist.ashx` | xml | none |  | SP_Shop_All | yes | **boot** |
| 111 | `/shopcheapitemlist2.ashx` | xml | none |  | SP_Shop_All | — |  |
| 112 | `/ShopGoodsShowList.ashx` | build→ShopGoodsShowList.xml | admin-IP |  | SP_ShopGoodsShowList_All | yes | **boot** |
| 113 | `/ShopItemList.ashx` | build→ShopItemList.xml | admin-IP |  | SP_Shop_All | yes | **boot** |
| 114 | `/suitpartequipinfolist.ashx` | build→suitpartequipinfolist.xml | admin-IP |  | SP_Suit_TemplateID | yes | **boot** |
| 115 | `/suittemplateinfolist.ashx` | build→suittemplateinfolist.xml | admin-IP |  | SP_Suit_TemplateInfo | yes | **boot** |
| 116 | `/TemplateAllList.ashx` | build→TemplateAlllist1.xml,TemplateAlllist.xml | admin-IP |  | SP_Items_All | yes | **boot** |
| 117 | `/totemhonortemplate.ashx` | build→totemhonortemplate.xml | admin-IP |  | SP_TotemHonorTemplate_All | yes | **boot** |
| 118 | `/UserApprenticeshipInfoList.ashx` | xml | none | selfid, RelationshipID | SP_Users_SingleByUserID | yes | **boot** |
| 119 | `/UserGoodsInfo.ashx` | xml | none | ID | SP_Users_Items_Single | — |  |
| 120 | `/UserQuestList.ashx` | zlib | none | ID | SP_QuestData_All | — |  |
| 121 | `/UserRankDate.ashx` | xml | none | userID, ConsortiaID | SP_Sys_Users_Rank_Date | yes |  |
| 122 | `/VisualizeItemLoad.ashx` | xml | none | sex |  | — |  |
| 123 | `/VisualizeRegister.ashx` | xml | none |  | SP_Users_RegisterNotValidate | yes | **boot** |
