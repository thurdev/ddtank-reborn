# 02 — Lobby systems (behaviour, tables, procs)

Per-system detail for the TS port. Packet formats are in `01-packet-handlers.md`; proc parameters/columns in
`03-bussiness-procs.md`; architecture/timers in `00-architecture.md`. Table names come from the procs
(`tools/out/proc-tables.md`, scraped from `Database/*.bak`). Two databases: **Player DB** (`Db_Tank`/
`Project_Player34`) and **Game DB** (templates, `Project_Game34`). Note the confusing legacy names:
**`Shop_Goods` = item templates**, **`Shop` = shop listings**, **`Sys_Users_Detail` = characters**,
**`Sys_Users_Goods` = item instances**, **`User_Messages` = mail**.

Generated helper: `tools/out/player-persistence.md` (each player component's load/save procs).

---

## 1. Login, authentication & player load

### 1.1 Website ticket (Tank.Request side, summarised)
1. Website authenticates the account (membership DB `Db_Membership`: `Mem_Users`, `Mem_UserInfo`) and calls
   `BaseInterface.CreateLogin(name, key, zoneId, …)` (`Bussiness/Interface/BaseInterface.cs:155`):
   `PlayerBussiness.LoginGame` (`SP_Users_LoginWeb`) → if no character row: `ActivePlayer` (`SP_Users_Active`,
   default gold/money from `DefaultGold`/`DefaultMoney`) and `CenterService.ActivePlayer`; if forbidden
   (`IsExist=false` or `ForbidDate > now`) → error `ManageBussiness.Forbid1`;
   else **`CenterService.CreatePlayer(id, name, key, isFirst)`** — the center keeps `{id, name, password=key}` in
   `LoginMgr` with state NotLogin. `isFirst` = nickname not chosen yet (client then shows "create character").
2. The Flash client receives the key via the page (`flashvars`) and opens TCP to the game server.

### 1.2 Game login (code 1)
`UserLoginHandler` (01 §1): RSA-decrypt → session XOR key + `"user,key"` → `CenterService.ValidateLoginAndGetID`
(name & key must match the stored ticket) → `GamePlayer` created → center **3 ALLOW_USER_LOGIN** →
center `TryLoginPlayer` (kicks a session on another server) → **3 {id, allow}** → `GamePlayer.Login()`.
Kicks use code 2 KIT_USER with a message. Duplicate login on the same server: center **5 USER_ONLINE** makes the
older session kick itself (`LoginServerConnector.HandleUserOnline`).

### 1.3 `GamePlayer.LoadFromDatabase` (GamePlayer.cs:2937)
* `SP_Users_SingleByUserID` → `PlayerInfo` (137 columns of `Sys_Users_Detail`; null → kick "Forbid").
* `PlayerBattle` (`SP_GetSingleUserMatchInfo` → `Sys_User_Match_Info`, league/prestige), `UpdateLeagueGrade`.
* Training exp `SP_Get_UserTexp_By_ID` (`Sys_Users_Texp`), daily count reset.
* Inventories (constructed in the `GamePlayer` ctor, each `LoadFromDatabase` → `SP_Users_BagByType(userId, bagType)`):
  EquipBag(0), PropBag(1), Consortia bank(11), Store(12), FarmBag(13), BankBag(51), Caddy(5), Bead…;
  CardInventory (`SP_GetSingleUserCard`), PetInventory (`SP_Get_UserPet_By_ID`, adopt list, eat-pets),
  BufferList (`SP_User_Buff_All`, guild buffs `SP_User_Consortia_Buff_All`), QuestInventory (`SP_QuestData_All`),
  AchievementInventory (`SP_Users_Record_All`, `SP_Achievement_Data_All`), PlayerExtra (`SP_GetSingleUsersExtra`,
  `SP_Get_User_EventProcess`), PlayerActives (`SP_GetSingleActiveSystem`, `SP_GetSingleNewChickenBox`),
  PlayerFarm (`SP_Get_SingleFarm`, `SP_Get_SingleFields`), PlayerRank (`SP_GetSingleUserRank`),
  AvatarCollection (`SP_Get_AvatarCollect`), suit kill (`SP_Suit_Manager_GET`).
* Friends `SP_Users_Friends_All` (FriendID → Relation 0 friend / 1 blacklist).
* Gems (grade > 19) `SP_GetSingleGemStone` (`Sys_User_Gemstone`: FigSpiritId, FigSpiritIdValue, EquipPlace), medals (count of item 11408), repute.
* **New day** (`PlayerInfo.CheckNewDay`): quests restart & reload, `OnPlayerLogin`, reset Score, battle counters,
  hot-spring minutes = 60, free mail count, roulette count = `LeftRouterMaxDay`, novice daily events (Monday: weekly),
  `MaxBuyHonor`, farm props, accumulative login, daily VIP exp.
* PvE permission strings (`PvePermission`, `FightLabPermission` char arrays per map/hardness).
* Clears Store & Caddy bags (items return to bags), VIP next-level days, totem cap, then **saves immediately**
  (`SP_Users_Update`, `SP_UserTexp_Update`, `SP_UpdateUserMatch`), `State = 1` (online).

### 1.4 Login burst (`GamePlayer.Login`, GamePlayer.cs:3324) — order matters for the client
`WorldMgr.AddPlayer` → load → reset time box if new day → **`SendLoginSuccess`** (code 1: zone, stats, gold, money,
medal, hide, …) → little-game active notice → `SendUpdatePublicPlayer` → weakless-guild progress →
consortia/pet processors → `SendDateTime` → `SendDailyAward` → marry notices → properties view → `Rank.SendUserRanks`
→ honor/title → farm lands → `SendOpenVIP` → `EquipBag.UpdatePlayerProperties` → eat-pets → sub-processors →
`Actives.SendEvent` → enthrall light → avatar collection → edict version → state Manual → buff list →
achievements → fight-spirit init (grade ≥ 30) → account limit check → first-recharge status → `ChargeToUser`
(credit pending top-ups) → consortia task registration → world-boss state → left roulette (if before
`LeftRouterEndDate`) → online-time timer → league notice → guild-member-week → necklace. Then the center gets
5 USER_ONLINE and friends/guild are notified (`WorldMgr.OnPlayerOnline`).

### 1.5 Save / logout
* `SaveIntoDatabase` (every `DBAutosaveInterval` min, on SAVE_DB, on many handlers): dirty `PlayerInfo`
  (`SP_Users_Update`, 86 params), labyrinth, gems, then every inventory/component `SaveToDatabase` (dirty items only:
  `SP_Users_Items_Add`/`_Update`). Also the anti-cheat checks of §16.
* `SavePlayerInfo` (`UpdatePlayer` subset). `Quit()` (disconnect): leave rooms/scenes, save, `State=0`,
  `WorldMgr.RemovePlayer`, center 4 USER_OFFLINE.

## 2. Player state model (what the TS `Player` needs)
`PlayerInfo` (SqlDataProvider/Data/PlayerInfo.cs) mirrors `Sys_Users_Detail`: identity (ID, UserName, NickName,
Sex, Grade, GP), currencies (Gold, Money, MoneyLock, GiftToken, Offer, Riches/RichesOffer/RichesRob, myHonor,
medal, petScore, Score, damageScores, LeagueMoney, hardCurrency), look (Style, Colors, Skin, Hide), guild fields
(ConsortiaID/Name/Level, DutyLevel/Name, Right, ShopLevel, SmithLevel, StoreLevel, SkillLevel, IsBanChat,
badgeID), stats (Attack/Defence/Agility/Luck, FightPower, Win/Total/Escape, Repute, AchievementPoint),
marriage (IsMarried, SpouseID/SpouseName, MarryInfoID, IsCreatedMarryRoom, SelfMarryRoomID, IsGotRing),
academy (masterID, apprenticeshipState, masterOrApprentices, freezesDate), VIP (typeVIP, VIPLevel, VIPExp,
VIPExpireDay, VIPLastDate, CanTakeVipReward), security (PasswordTwo, IsLocked, HasBagPassword, CheckCode,
CheckCount, CheckError, CheckDate), daily (NewDay, LastAward, LastGetEgg, BoxProgression, GetBoxLevel,
AlreadyGetBox, BoxGetDate, accumulativeLoginDays/AwardDays, LastVIPPackTime), totem/necklace/evolution
fields, PvE permissions, `State` (online flag). In-memory only: current room/scene, temp props, captcha counters.

## 3. Inventory, bags & equipment
* **Bags** (`eBageType`): 0 EquipBag — slots 0–30 are equipment (fixed slot per category, rings 9/10, 7/8 …),
  31–80 bag, 81+ avatar/fashion overflow; 1 PropBag; 2 TaskBag; 3 FightBag (3 battle props); 4 TempBag (battle
  loot); 5 CaddyBag (lottery results); 11 Consortia (guild bank, capacity `StoreLevel × 10`); 12 Store (workbench);
  13 FarmBag; 15 Card; 21 BeadBag; 34 Food; 35 PetEgg; 41 MagicStone; 51 BankBag.
* Item instance = `Sys_Users_Goods` row (`ItemInfo`): ItemID, UserID (0 = attached to mail/auction), BagType,
  Place, TemplateID, Count, IsBinds, IsUsed, BeginDate, ValidDate (days, 0 = permanent), Color, Skin,
  StrengthenLevel/Exp/Times, Attack/Defend/Agility/LuckCompose, Hole1..6 (gem template ids), Hole5/6 Level/Exp,
  IsJudge, RefineryLevel, goldBeginTime/goldValidDate (gold plating), latentEnergy cur/new/end, IsExist.
* Templates: `Shop_Goods` (Game DB, `SP_Items_All`) → `ItemTemplateInfo` (CategoryID, NeedSex, NeedLevel,
  Property1..8, MaxCount, CanStrengthen/Compose/Equip/Delete, Quality, Level, ReclaimType/Value, BagType, Hole,
  FusionType, …). Category ids that handlers branch on: 7 = main weapon (strengthen re-templating, gold plating,
  transfer), 1 and 5 (hole 5/6 drilling, wish beads 11562/11561), 10 = in-battle props, 11 = materials/consumables
  (Property1: 2/35 strengthen stone, 3 luck stone, 4 bugle, 6 openable box, 7 god stone), gems have Property1 31,
  potential stones Property1 101, 26 = card template, 7/17 fusion results get 7-day validity. Full category list is
  data (`Shop_Goods.CategoryID`); see the combat/request specs for the rest.
* Equip → `EquipBag.UpdatePlayerProperties` recomputes Attack/Defence/Agility/Luck/HP/FightPower from items,
  strengthen, compose, gems, cards, totem, necklace, pets, titles, avatar collection, buffs; result pushed with
  `SendUpdatePublicPlayer` / properties packet.
* Expiry: items with ValidDate past `BeginDate` become invalid (`IsValidItem`); client asks ITEM_OVERDUE (77) to
  unequip/mail. Moves are validated only by `count` range (01 §3) — port must also validate bag/slot ranges.

## 4. Enhancement systems
Workbench = Store bag. Shared rules: bound if any input bound; bag lock; results logged (`LogMgr.LogItemAdd`).
| System | Handler | Tables | Formula / notes |
|---|---|---|---|
| Strengthen +1..+12 | 59 | `Item_Strengthen` (`SP_Item_Strengthen_All`: needed rate per level), `Item_StrengthenGoodsInfo` (weapon template per level), `Item_Refinery_Strengthen` | rate = Σ`StrengthenMgr.RateItems[stone.Level−1]` ×100 / `GetNeedRate(item)`; + guild smith `rate×0.1×SmithLevel`; + VIP `VIPStrengthenEx[vip]×rate`; success if `floor(total×100) > rand(10000)`. Fail without god stone: Level-3 templates −1 level (if ≥5), else **item destroyed** (Count−1). |
| Exalt +12..+15 | 138 | same + `RateAdvance` | success if `StrengthenExp / oldLevel > rand(RateAdvance)`; fail adds exp. |
| Compose (stat stones) | 58 | stones' Property3/4 | rate by stone quality {80,50,30,10,5}% (+luck%, ×smith), gold `PRICE_COMPOSE_GOLD`. |
| Fusion | 78 | `Item_Fusion` (`SP_Fusion_All`) | 4 identical items (+ optional extra items) → `FusionMgr.Fusion` weighted result; 400 gold. |
| Transfer (inherit) | 61 | `StrengthenMgr.FindTransferInfo` | 10000 gold; swaps strengthen/compose/holes; weapon re-templating 10–15. |
| Gems inlay/remove | 121 / 125 | template `Hole` string | inlay `InlayGoldPrice` gold, remove 500 Money. |
| Holes 5/6 drilling | 217 | `HoleLevelUpExpList` | drill exp rand(P7,P8). |
| Refinery trend | 120 | `Item_Refinery` (`SP_Item_Refinery_All`) | `RefineryMgr.RefineryTrend(op, item)`. |
| Gold plating | 106 | `GoldEquipTemplateLoad` | chance per zone, 3-day gold version. |
| Potential | 133 | stone properties | 7 random attrs, 7-day pending reroll. |
| Necklace | 95 | `StrengThenExp`? (`StrengthenMgr` necklace table) | exp feeding. |
| Fight spirit (gem souls) | 209 | `FightSpiritTemplate`, `Sys_User_Gemstone` | 3 soul slots per equip place. |
| Recycle | 222 | drop tables (`DropInventory.RetrieveDrop`) | quality-sum lottery. |
| Wardrobe | 402 | `ClothGroup`, `ClothProperty`, `Sys_User_AvatarCollect` | collection bonuses. |
| Cards | 216/196/183/204 | `Card_Info`, `Card_Group`, `Card_Buff`, `CardUpdateCondition`, `CardUpdateInfo`, `Sys_Users_Card` | 5 equip slots (0–4), card book ≥5; upgrade by duplicate count + random exp; reset rerolls 4 stats. |

## 5. Shop & economy
* Shop listing `Shop` (`SP_Shop_All`): `ShopItemInfo` ID (goods id the client sends), ShopID (2 forbidden, 20
  limited free daily, guild shops need `ShopLevel`), TemplateID, BuyType (0 = timed, else stack count),
  GroupID, Label, IsVouch, IsCheap, IsContinue, **Beat** (price multiplier), and per tier A/B/C: `xUnit`
  (days or count) + three (price type, value) pairs `xPrice1..3/xValue1..3`. Price types
  (`SqlDataProvider/Data/ItemInfo.cs:1023 GetItemPrice`): **−1 Money, −2 Gold, −3 Offer, −4 GiftToken,
  −6 Score (little-game), −8 petScore, −9 damageScore, > 0 = required item template (value = count)**; each value
  is multiplied by `Beat`. (`ShopMgr.SetItemType` is a second decoder used by props that also handles
  medal/hardCurrency/leagueMoney/honor.) IsBind, LimitCount, StartDate/EndDate (`IsOnShop`). `ShopGoodsShowList` (`SP_ShopGoodsShowList_All`) = which goods appear per tab.
* Limited stock: `WorldMgr` shop free count (`ShopFreeCountInfo`) per goods id, decremented on buy, reset by
  `ScanShopFreeVaildDate` on the save timer; pushed with `SendShopGoodsCountUpdate` (168).
* Purchases: always bound in this build (`item.IsBinds = true`). Overflow to mail (type 8).
* Money top-up: website writes `Charge_Money` rows and calls `CenterService.ChargeMoney` → center 9 → game
  `ChargeToUser` (`SP_Charge_Money…` via `PlayerBussiness.ChargeToUser`) credits Money + mail + `OnMoneyCharge`
  (first-recharge / novice events). Also run on login.
* Sell-back: `ReclaimType/ReclaimValue` (127, 232). Boxes: `SP_ItemsBox_All` (`ItemBoxInfo` columns: ID = box
  template, TemplateId, IsSelect, IsBind, ItemValid, ItemCount, StrengthenLevel, Attack/Defend/Agility/LuckCompose,
  Random (weight), IsTips (world notice), IsLogs; special TemplateIds stand for gold/money/giftToken/medal/exp/honor
  — see `ItemBoxMgr.CreateItemBox`).
* Rates: `Rate` table (`SP_Rate`: ServerID, Type (`eRateType`), Rate, BeginDay, EndDay, BeginTime, EndTime) —
  `RateMgr.GetRate(type)` returns the active multiplier (Experience, Offer, Riches, …) used by GP/offer/riches gain.

## 6. Mail
Table `User_Messages` (ID, SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR,
IfDelS, IsDelete, Annex1..5 (+Name), Gold, Money, GiftToken, IsExist, Type, ValidDate, AnnexRemark, Remark).
Procs: `SP_Mail_Send`, `SP_Mail_Update`, `SP_Mail_Delete`, `SP_Mail_PaymentCancel`, `SP_Mail_Scan` (center
timer: expire, return COD/annexes), list via HTTP (`Tank.Request` mail list). Notifications: code 117
MAIL_RESPONSE {int userId, int type (`eMailRespose` 1 Receiver, 2 Send, 3 both, 4 Gift)} routed through center if
the user is on another server. System mails (rewards) are created with `SenderID` 0 and annex items inserted
with `UserID=0` first (`AddGoods`), then `SendMail` with Annex = ItemID.

## 7. Friends, chat & announcements
* Friends: friends table (FriendID, Relation 0/1, Remark, IsExist) — `SP_Users_Friends_All/_Add/_Delete`,
  ids cached in `GamePlayer.Friends`; blacklist filters chat/whisper/guild chat. Online state propagation:
  160/165 via center → `WorldMgr.ChangePlayerState`; friend list & profiles via HTTP.
* Chat channels (`SceneChatHandler`): 0..2 lobby/room (room/team), 3 guild, 5 (lobby, extra 1 s limit), 9 chapel,
  13 hot spring; whisper 37; one-on-one IM 160/51; bugles: small 71 (server-wide), big 72 (all servers via center),
  cross-zone 73 (other centers), challenge board 123 (500 Money). Cooldowns: lobby 30 s, bugles 2 s.
  `IsBanChat` only for guild chat. No word filter server-side (client filters).
* System notices: center random `SystemNotice.xml` every `SystemNoticeInterval`; `WorldMgr.SendSysNotice` builds 10
  {int type, str msg, …} for strengthen/fusion/box/pet broadcasts; edicts (`Edictum` table) via `SendEdictumVersion`.

## 8. Consortia (guilds)
* Tables (Player DB): `Consortia` (ID, name, chairman, Level, Riches, Honor, Repute, MaxCount, Count, Store/Shop/
  Smith/SkillLevel, BuildDate, Description, Placard, IsExist, OpenApply, BadgeID/BuyTime/ValidDate, boss fields),
  `Consortia_Users` (+ view `V_Consortia_Users`: DutyID, Offer, RichesOffer, RichesRob, Remark, IsBanChat, …),
  `Consortia_Duty` (DutyID, Level 1–5…, DutyName, Right bitmask), `Consortia_Apply_Users`, `Consortia_Invite_Users`,
  `Consortia_Ally` / `Consortia_Apply_Ally` (alliance state), `Consortia_Equip_Control` (riches thresholds),
  `Consortia_Event` (history log), `Consortia_Task_Info`, user guild buffs. Cached columns of `Consortia`
  (`SP_Consortia_All`): ConsortiaID, ConsortiaName, Honor, Level, Riches, MaxCount, BuildDate, IsExist, DeductDate,
  StoreLevel, SmithLevel, ShopLevel, SkillLevel. Game DB: `Consortia_Level` (Level, Count, NeedGold, NeedItem,
  Reward, Riches, StoreRiches, SmithRiches, ShopRiches, BufferRiches, Deduct),
  `Consortia_Buff_Temp`, `Consortia_Badge_Config`, `Consortia_Boss_Config`, `Consortia_Task` templates.
* All mutations go through procs that enforce rights and return `@Result` codes mapped to
  `ConsortiaBussiness.*.MsgN` texts — port the checks (see `ConsortiaBussiness.cs` per method). Changes are
  propagated to all game servers via center 128/130 so every online member's `PlayerInfo` guild fields update.
* Economy: riches from donations (money/2), guild war wins, guild boss awards, missions; spent on upgrades,
  buffs (`SKILL_SOCKET`), badge, mass mail (1000), missions (`MissionRiches`).
* Building levels: guild Level (member cap), **Store** = bank size ×10, **Shop** = guild shop tiers (needs
  personal riches ≥ `Consortia_Equip_Control` Type 1 Level n), **Smith** = +10 %/level strengthen/compose bonus
  (Type 2 threshold), **Skill/Buffer** = buff tiers.
* **Guild war (GvG)**: a Match room whose members are all in the same guild becomes `GameStyle 1 / eGameType.Guild`
  (`BaseRoom.UpdateGameStyle`), matched on the fight server against another guild room. Result (fight → 42):
  `ConsortiaMgr.ConsortiaFight(win, lose, players, …)`: `SP_Consortia_Fight` (riches transfer, `Riches_Rate`),
  `ConsortiaRichAdd(win)`; winners `+ (playerCount/2 + 10) × Offer_Rate` offer and `RichesRob += riches`, losers
  `+ round(playerCount/2 × 0.5) × rate − 10`; chat line via center 158. Free (non-guild) match: winners' guild gets
  1 riches, members +3 offer, losers −3.
* **Guild boss**: state lives in the center (`ConsortiaBossMgr`), game servers mirror (codes 180–188); opened via
  guild UI (consortia subs 30/31 — client side), killed in a PvE game (`eRoomType.ConsortiaBoss` 17); awards
  riches every ~6 min scan. **Guild battle/camp (ConsBatPackageType)**: enum exists, no handler — not implemented.
* Guild missions: `ConsortiaTaskMgr` (9b), conditions in `ConsortiaTask/Conditions`.

## 9. Quests & achievements
* Templates (Game DB): `Quest` (columns read: ID, QuestID, Title, Detail, Objective, NeedMinLevel, NeedMaxLevel,
  PreQuestID, NextQuestID, IsOther, CanRepeat, RepeatInterval, RepeatMax, RewardGP, RewardGold, RewardGiftToken,
  RewardOffer, RewardRiches, RewardBuffID, RewardBuffDate, RewardMoney, Rands, RandDouble, TimeMode, StartDate,
  EndDate, MapID, AutoEquip, RewardMedal, Rank, StarLev, NotMustCount), `Quest_Condiction` (QuestID, CondictionID, CondictionTitle,
  CondictionType, Para1, Para2, isOpitional), `Quest_Goods` (QuestID, RewardItemID, IsSelect, RewardItemValid,
  RewardItemCount, IsCount (×RandDouble), StrengthenLevel, composes, IsBind).
* Player data: `QuestData` (`SP_QuestData_All/_Add`: UserId, QuestID, Condition1..4, IsComplete, CompletedDate,
  IsExist, RepeatFinish, RandDobule).
* Condition types (`Quests/BaseCondition.cs:55`, `CondictionType` → class): 1 OwnGrade, 2 ItemMounting (equip),
  3 UsingItem, 4 GameKillByRoom, 5 GameFightByRoom, 6 GameOverByRoom, 7 GameCopyOver (dungeon), 8 GameCopyPass,
  9 ItemStrengthen, 10 Shop (buy), 11 ItemFusion, 12 ItemMelt, 13 GameMonster, 14 OwnProperty, 15 TurnProperty,
  16 DirectFinish, 17 OwnMarry, 18 OwnConsortia, 19 ItemCompose, 20 ClientModify (client sets value, 181),
  21 GameMissionOver, 22 GameKillByGame, 23 GameFightByGame, 24 GameOverByGame, 25 ItemInsert (gem), 26 Marry,
  27 EnterSpa, 28 FightWifeHusband, 29 Achievement, 30/34 GameFight2v2, 31 GameFightByGame, 32 SharePersonalStatus,
  33 SendGiftForFriend, 35/40 AcademyEvent, 36 GameFightApprenticeship, 37 GameFightMasterApprenticeship, 38 Cash,
  39 NewGear, 42 AccountInfo, 43 LoginMissionPurple, 44 SetPasswordTwo, 45 FightWithPet, 46 CombiePetFeed,
  47 FriendFarm, 48 AdoptPet, 49 CropPrimary, 50 UpLevelPet, 51 SeedFoodPet, 52 UserSkillPet, 54 UserTotemGemstone;
  else Unknown. Each subscribes to `GamePlayer` events (`OnGameOver`, `OnItemStrengthen`, `OnPaid`, …) and updates
  its counter; `QuestInventory` pushes progress (QUEST_UPDATE 178).
* Finish (179): bag space in Equip/Prop/Farm bags; rewards bound; daily quests reset per `RepeatInterval` on new day.
* Achievements: Game DB `Achievement`, `Achievement_Condition`, `Achievement_Reward` (`AchievementMgr`);
  player `Sys_Users_Record` (counters per record type — see `Game.Server/Achievement/*Condition.cs`, ~80 kinds)
  and `Achievement_Data`. Completion is **requested by the client** (230) without server verification — port should
  verify counters.

## 10. Daily, activity & event systems
| System | Where configured | Server pieces |
|---|---|---|
| Daily login award | Game DB `Daily_Award` (`SP_Daily_Award_All`: ID, Type, TemplateID, Count, ValidDate, IsBinds, Sex, Remark, CountRemark, GetWay, AwardDays) | 13 type 0, `AwardMgr.AddDailyAward`; center `DailyAwardState` toggles |
| Sign-in (calendar) | `Daily_Award` by sign count; `DailyLogList` (Player DB) | 13 type 5, 90 |
| VIP daily box | `Items_Box` type 2 by VIP level | 13 type 3 |
| Time/level boxes | `TimeBox_Award` | 53 |
| Accumulative login | `Login_Award_Item_Template` (`SP_AccumulAtiveLoginAward_All`) | 338 |
| Novice / server-open events | `EventReward*` (`GetEventRewardInfoByType/GoodsByType`), `Sys_User_EventProcess` | 258, `PlayerExtra` conditions (`NoviceActiveType`: grade up, strengthen weapon, use money, recharge, VIP up, fight power; weekly variants) |
| First recharge | EventReward type 7 | 259 |
| Activities list (web "events" panel) | `Active`, `Active_Award`, `Active_Convert_Item` (Game DB), player `Active` rows (`SP_Active_Add/_Delete`, `ActiveMgr.UpdateCurrentServerActive`) | HTTP lists; code 11 ACTIVE_PULLDOWN has no handler |
| Activity packs (chick activation) | `ActivitySystemItem` | 84, 66 (key 201316) |
| Event live (in-game triggers) | `Event_Live`, `Event_LiveGoods` (`EventLiveMgr`) | `Game.Server/Event/*Condition` (login, level up, game over/kill, strengthen, fusion, charge, …), loaded per player if StartDate<now<EndDate |
| Sub-activities | `SubActive`, `SubActiveCondition` | `SubActiveMgr` |
| Communal activity | `CommunalActive`, `CommunalActiveAward`, `CommunalActiveExp` | `CommunalActiveMgr` |
| Event awards | `EventAwardItem` | `EventAwardMgr` (dice/lucky star/search goods/bogu by `eEventType`) |
| Lucky Star | `LuckyStart_Topten_Award`, `LuckStar*` properties | 87 subs 31–34, center 90/4 record |
| New chicken box | `NewChicken*` properties, `Sys_User_NewChickenBox` | 87 |
| Treasure/caddy lottery | `Items_Box` (lottery ids 112019, 190000), keys 11444/190001/11456 | 26, 27, 28, 45 |
| Left roulette | `LeftRouter*` properties, `UsersExtra` | 128, 130 |
| Labyrinth (warrior family raid) | `WarriorFamRaid*`, `Sys_User_Labyrinth` | 131, room type 15 |
| Little game "Hút Gà" | `LittleGame*` properties, map file | 166, timer |
| World boss | `WorldBossStart/End/ID1/ID2`, NPC templates 30004/1243 | 102, room type 14 — **scheduler commented out** (`GameServer.cs:316`) |
| League (Chiến thần) | `TimeForLeague`, `Daily_League_Award` (mgr disabled) | 132, fight server; open flag `ActiveSystemMgr.IsLeagueOpen` (scan commented out) |
| Elite championship | center 904–912 | 162 |
| Academy (master/apprentice) | `Academy*` properties | 141, `AcademyMgr` |
| Gold time / double exp | `GoldTimes`, `GoldTimeStart/End`, `TimeX2`, `DoubleEvent` | rate multipliers (combat) |

## 11. Rooms, matchmaking & hand-off to combat
* `RoomMgr` owns `BaseRoom[MaxRoomCount]` (ids 1..N, reused), a `BaseWaitingRoom` (players in the lobby; receives
  room add/update/remove pushes) and the `BaseWorldBossRoom`. All mutations are `IAction`s executed on the RoomMgr
  thread (Create, Enter, Exit, Kick, UpdatePlayerState, UpdateRoomPos, RoomSetupChange, SwitchTeam, StartGame,
  StartGameMission, StartProxyGame, StopProxyGame, CancelPickup, Enter/ExitWaitingRoom). Empty rooms are stopped
  every 400 ms.
* `BaseRoom` (`Rooms/BaseRoom.cs`): 10 seats — 0–7 players (Freedom: even = team 1, odd = team 2), 8–9 viewers
  (team 99). `m_placesState` −1 open / 0 closed / playerId; `m_playerState` 0 not ready, 1 ready, 2 host.
  `UpdateRoom`: Freedom → 8 seats, other types → **2 seats** (host opens more). Host leaves → next player becomes
  host. `CanStart`: Freedom needs ≥1 ready per team; others need all players & viewers ready.
* Room types (`eRoomType`): 0 Match (auto-match PvP, fight server), 1 Freedom (custom PvP, in-process), 4 Dungeon,
  5 FightLab, 10 Freshman (tutorial), 11 Academy, 12/13 elite, 14 WordBossFight, 15 Labyrinth, 17 ConsortiaBoss,
  18 AcademyDungeon, 19 ConsortiaBattle, 20 CampBattle, 21 ActivityDungeon, 23 SpecialActivityDungeon, 40 Christmas…
  Game types (`eGameType`): 0 Free, 1 Guild, 7 Dungeon, 8 FightLab, 10 Freshman, 14 WordBoss, 26 RingStation….
* **StartGameAction** (`Rooms/StartGameAction.cs`):
  * Freedom → `GameMgr.StartPVPGame(roomId, red, blue, mapId, …)` **in-process**.
  * PvE types (Dungeon, FightLab, Freshman, AcademyDungeon, WorldBoss, Labyrinth, ConsortiaBoss, Activity…,
    Christmas) and Academy → `GameMgr.StartPVEGame(…, hardLevel, levelLimits, floor)` in-process; time mode from
    hardness (Simple 3, Normal 2, Hard/Terror 1).
  * Match → avg level; non-crosszone free match assigns `PickUpNpcId = RingStationConfiguration.NextRoomId()`
    (fallback opponent = arena bot); `BattleMgr.AddRoom(room)` → fight server 64 with full player snapshots;
    room `IsPlaying`, `SendStartPickUp` (searching UI). Fight server later sends 66 StartGame → `ProxyGame`
    (`Battle/ProxyGame.cs`) attached to the room; in-game packets are relayed (91 → fight 2; fight 32/67 → clients);
    results come back as fight→game reward packets (35, 38–52, 74–76, 84–86); 68 StopGame / 65 removes.
    Cancel (11) → fight 65 → 65 back → `CancelPickupAction`.
  * Failure → messages + `SendCancelPickUp`.
* Room list (94/9) filters: hall 1 = Match/Freedom rooms, hall 2 = Dungeon/Academy/Boss rooms.
* Invites (70), quick join (`FindRandomRoom`), viewer seats, password, dungeon level limits (`eLevelLimits` by
  grade ≤10, ≤20, else), PvE permission per map/hardness (`IsPvePermission`), dungeon tickets for map 13.

## 12. Marriage & church
Tables: `Marry_Apply` (notices/proposals: UserID, ApplyUserID, ApplyUserName, ApplyType 1 propose, 2 answer,
3 divorce, ApplyResult, LoveProclamation), `Marry_Info` (matchmaking board), `Marry_Room_Info` (chapels: ID, Name,
Pwd, MapIndex, AvailTime, MaxCount, GuestInvite, PlayerID, GroomID/Name, BrideID/Name, BeginTime, BreakTime,
IsHymeneal, IsGunsaluteUsed, RoomIntroduction, ServerID). Procs: `SP_Insert_Marry_Notice` (does the actual
marry/divorce on the user rows), `SP_MarryInfo_*`, `SP_Insert_Marry_Room_Info`, `SP_Get_Marry_Room_Info`,
`SP_Dispose_Marry_Room_Info`, `SP_Update_Marry_Room_Info(_Sever_Stop)`, `SP_Update_GotRing_Prop`.
Flow: propose (247, ring 11103) → target gets notice (center 13 → `LoadMarryMessage`) → answer (250) → married;
book chapel (241, 2–4 h) → guests enter (242) → ceremony (249/2, rings 9022) → expiry timer disposes
(`MarryRoomMgr.CheckRoomStatus`); divorce (248). Prices: `PRICE_DIVORCED(_DISCOUNT)`, `PRICE_PROPOSE`,
`PRICE_MARRY_ROOM` (GameProperties aliases of `DivorcedMoney`, `HymenealMoney`, `MarryRoomCreateMoney`).
Marriage gives couple bonuses in battle (`GPSpouseTeam`) and quest conditions.

## 13. Auction house
Table `Auction` (AuctionID, AuctioneerID/Name, BuyerID/Name, ItemID, TemplateID, Name, Category, goodsCount,
Price, Rise, Mouthful (buyout), PayType, BeginDate, ValidDate (hours), Random (extra minutes), IsExist).
Procs `SP_Auction_Add/_Update/_Delete/_Single/_Scan`. Listing/search is HTTP (`AuctionPageList.ashx`).
Flow: list (192, fee 3/9/18 % of price in gold) → bids (193; refunds/notices handled inside `SP_Auction_Update`,
buyout closes) → seller cancel (194) → center `ScanAuction(ref ids, Cess)` every `ScanAuctionInterval` settles
expired auctions inside `SP_Auction_Scan` (tax `Cess` = 0.1 passed in; mails to seller/buyer) and the center sends
117 to each returned user id. The settlement arithmetic is in the proc body (not recovered from the .bak) —
restore `Player34.bak` to port it exactly.

## 14. Ranking / celebrities / VIP
* Rankings are **precomputed tables** refreshed hourly by `RankMgr` (`PlayerBussiness.UpdateRank` → 
  `SP_Sys_Update_Users_List/DayList/WeekList`, `SP_Sys_Update_OfferList`, `SP_Sys_Update_Consortia_List/DayList/
  WeekList/FightPower/Honor`, `SP_Sys_Update_Users_Rank_Date`); the client reads them over HTTP (celeb lists in
  `Tank.Request`). Also `Sys_User_Rank` = earned titles (`PlayerRank`), league match ranks (`Sys_User_Match_Info`),
  caddy rank (45), world-boss rank (center), arena rank (RingStation).
* VIP: `typeVIP` (by purchased days), `VIPLevel` 1–9 driven by `VIPExp` (+= Money spent on VIP, thresholds
  `VIPExpForEachLv`), `VIPExpireDay`; perks used across handlers: strengthen bonus (`VIPStrengthenEx`), daily VIP box,
  texp limit, pet skill slot 4 (VIP 7), dungeon boss discount (VIP 5–12), profile privacy (VIP ≥ 7), extra pet slots.
  Purchase: 92 (self/gift) or VIP cards (183, Property1 23). `SP_VIPRenewal_Single`.

## 15. Pets, farm, hot spring, academy, cards (lobby side)
* Pets: Game DB `PetTemplateInfo`, `PetLevel`, `PetConfig` (MaxHunger, AdoptRefereshCost, FreeRefereshID,
  ChangeNameCost, RecycleCost…), `PetSkill*`, `PetExpItemPrice`, `PetFightProperty` (evolution), `PetStarExp`,
  `Pet_Moe_Property`; Player DB `Sys_Users_Pet` (`SP_UserPet_Update`, `SP_User_Add_Pet`), `AdoptPetList`,
  `Sys_Eat_Pets`. Battle use via the equipped pet snapshot (combat spec).
* Farm: `Sys_User_Farm`, `Sys_User_Fields` (seed, plant time, ripe), farm helper (auto plant/harvest), stealing
  from friends, pet food from harvest.
* Hot spring: rooms from `HotSpring_Room` (public rooms only), daily free minutes 60 (`MinHotSpring`), exp ticks
  (`HotSpringExp`) by `PlayerExtra` hot-spring timer, entry 10000 gold.
* Academy: in-memory requests (`AcademyMgr`), persisted on `Sys_Users_Detail` (`SP_UsersAcademy_Update`);
  apprentice level rewards `AcademyApprenticeAward` / `AcademyMasterAward` (level|template boxes), completion awards.

## 16. Anti-cheat & validation present in the C# server
| Check | Where | Port note |
|---|---|---|
| Item move count range → disconnect | 49 | keep; also validate slots/bags |
| Captcha ("CheckCode") after random thresholds of money/GP/function counters | `isPassCheckCode` (GamePlayer.cs:1198), shown for Store-bag moves, guild disband, Match start (avg lvl > 14); 20-min check in save | keep (client UI exists) |
| Speed-hack heartbeat 300 every 5 min (< 4m45s → 20 min ban) and missing heartbeat for 90 min → 1 h ban | baoltfunction, `SaveIntoDatabase` | required by this client build; make thresholds configurable |
| Accounts per HWID/IP (`CountHWIDLimit`, `CountIPLimit`) → `BlockReceiveMoney` | `WorldMgr.IsAccountLimit` | HWID set by the desktop launcher |
| "Warrior" accounts (`UsersExtra.coupleBossBoxNum == 9`): no trading/auction/mail, only Freedom rooms, free gem removal, guaranteed strengthen | many handlers | tournament accounts — keep as a flag |
| Action throttles (`LastChatTime`, `LastOpenCard`, `LastRequestTime`, `LastDrillUpTime`, `LastOpenHole`, `WaitingProcessor`) | various | keep |
| Bag lock (second password) | 25 + most economy handlers | keep |
| Stream framing strict, ≥512 code drop, RSA login | Game.Base | keep |
| **Missing**: client-driven quest values (181), achievement completion (230), little-game score (64), hot-spring move of other players, farm helper price, free card (216/1), totem without money (136), prop sell refund (55), bugle without item (72), title spoof (189), SAVE_DB spam | | add server-side validation |
