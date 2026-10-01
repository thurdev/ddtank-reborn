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

