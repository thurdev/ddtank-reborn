# 01 — Client → server packet handlers (Game.Server / "Road")

Source: `vendor/DDTank41/Game.Server/Packets/Client/*.cs` (163 `[PacketHandler]` classes) plus the
sub-command handlers they dispatch to (`Consortia/Handle`, `GameRoom/Handle`, `Pet/Handle`, `Farm/Handle`,
`SceneMarryRooms/TankHandle`, `HotSpringRooms/TankHandle`, `LittleGame/Handle`, `WorldBoss/Handle`,
`ConsortiaTask/Handle`, `RingStation/Handle`). Combat packets inside a running game (code 91 `GAME_CMD`
payloads) are owned by the combat spec (`docs/spec/combat/`).

Machine-generated companions (re-run the scripts in `tools/`, see `tools/README` section at the bottom):

| File | What |
|---|---|
| `tools/out/handlers-raw.md` / `.json` | every handler: code, class, file, ordered reads, Bussiness/Mgr/center calls, replies |
| `tools/out/client-sends.md` | **ground truth from the AS3 client**: every `new PackageOut(code)` with its write order (361 functions, 171 codes) |
| `tools/out/format-check.md` | heuristic diff client-writes vs server-reads + codes the client sends that the server drops |
| `tools/out/packetlib.md` | every `client.Out.SendXxx` server→client builder (128) with code + write order |
| `tools/out/enums.json` | all C# enums (ePackageType, sub-package enums, eRoomType, eGameType, eMailType…) |

## 0. Conventions

* **Types** (big-endian, `Game.Base/PacketIn.cs`): `Int`=int32, `Short`=int16, `Byte`=uint8, `Boolean`=1 byte (≠0),
  `String`=u16 byte length + UTF-8 (client `writeUTF`), `DateTime`= see protocol spec (`packages/protocol`),
  `Bytes`= rest-of-packet (or explicit length for `ReadBytes(n)`).
* Header (20 bytes): `0x71AB` magic, u16 length, u16 checksum, i16 code, i32 clientId, i32 param1, i32 param2.
  Client packets after login are XOR-encrypted with the 8-byte key sent in LOGIN (see 00-architecture §3).
* **Dispatch**: `PacketProcessor` keeps `IPacketHandler[512]`; codes ≥ 512 are logged and dropped; unknown codes
  are silently ignored. Registration is by reflection over `Assembly.GetTypes()`; **when two classes share a code
  the last one enumerated wins** (SDK-style project → file-name order). Effective winners: 119 → `ItemCompareHandler`,
  213 → `UseLogHandler`, 218 → `UserGetGiftHandler` (the other three are dead).
* Handlers run **synchronously on the socket receive thread** of that client (no global lock), except room actions
  which are queued to the `RoomMgr` thread (40 ms tick) — see 02-systems §Rooms.
* Before dispatch `GameClient.OnRecvPacket` overwrites `packet.ClientID` with the logged-in player id.
  Every handler except LOGIN dereferences `client.Player` without null check → a pre-login packet throws (caught &
  logged). Port: reject all codes except 1 (LOGIN), 4 (PING) and the Flash policy request until login completes.
* "Bag lock" = `PlayerCharacter.HasBagPassword && IsLocked` (second password, code 25) → handler replies
  `Bag.Locked` message and aborts. "MoneyDirect(x)" = check `Money+MoneyLock ≥ x`, **deducts** x, logs, sends
  `UpdateProperties`; returns false and sends insufficient-money notice otherwise (`GamePlayer.cs:3432`).
* Currencies: `Gold` (vàng, soft), `Money` (xu/coupons, paid; `MoneyLock` = bound part, spendable), `GiftToken`
  (lễ kim / bound points), `Medal` (item 11408 count), `Offer` (guild contribution), `Riches` (guild wealth, player
  side `RichesOffer`/`RichesRob`), `myHonor`, `LeagueMoney`, `petScore`, `Score` (little-game), `damageScores` (world boss).
* `eMessageType`: 0 Normal, 1 ERROR, 2 SYS_TIP_NOTICE, 3 SYS_NOTICE, 4 ALERT, 8 CONSORTIA_NOTICE, 12 CROSS_NOTICE
  (`SendMessage(type,msg)` builds code 3 SYS_MESSAGE). "msg" in the tables below = `client.Out.SendMessage`.
  Most user-visible strings are LanguageMgr keys (`Languages/Language-vn.txt`); many handlers hard-code Vietnamese.
* "→ center" = forwarded to Center.Server through `LoginServerConnector` (see 00-architecture §4).
* Notation in *Reads*: `int a, str b, bool c, byte d, [..]` = optional/conditional, `n×{…}` = repeated.

---

## 1. Session, login & misc infrastructure

| Code | ePackageType | Handler (Packets/Client/…) | Reads | Behaviour | DB / managers | Replies |
|---|---|---|---|---|---|---|
| 1 | LOGIN | UserLoginHandler | int version, int clientType, bytes rsaBlob | Ignored if already logged in or clientType==69. RSA-decrypt (PKCS#1 v1.5, server key `PrivateKey` config). Plaintext: `[0..6]` unused (timestamp), `[7..14]` 8-byte XOR session key → `client.setKey`, `[15..]` UTF-8 `"user,pass"` (pass = one-time key issued by the website login). Rejects if `LoginMgr.ContainsUser(user)` (already logging). `BaseInterface.LoginGame` → WCF `CenterService.ValidateLoginAndGetID(name,pass)`; id −2 = forbidden; `isFirst` = never created a character → kick "Register". Creates `GamePlayer`, `LoginMgr.Add`, sends center pkt 3 `ALLOW_USER_LOGIN(id)`; on center reply (3,{id,true}) `GamePlayer.Login()` loads everything (02 §1). | Center WCF; later `SP_Users_SingleByUserID` etc. | Kick (code 2 KIT_USER) on every failure; on success the login burst (02 §1.4) |
| 4 | PING | PingTimeCallBackHandler | — | `Player.PingTime = now − PingStart` (server sends `SendPingTime` every PingCheckInterval). | — | — |
| 5 | SYS_DATE | SyncSystemDateHandler | — | Echo current server time. | — | 5 {date now} |
| 8 | CLIENT_LOG | ClientErrorLog | str text | Logged to FlashErrorLogger only. | — | — |
| 172 | SAVE_DB | SaveToDB | — | `Player.SaveIntoDatabase()` (client-triggerable full save; throttle in port). | all inventories | — |
| 200 | CHECK_CODE | CheckCodeHandler | str code | Captcha answer. Only if a code was issued. `"cheat"` → disconnect. Correct → CheckCount=0, CheckCode="baodeptrai" (sentinel), `resetPassCode`; wrong → CheckError++ and re-show (≥9 → disconnect). | — | 200 {byte 1, bool false} (reuses packet) |
| 300 | BAOLTFUNCTION (custom) | baoltfunction | int sub | Anti speed-hack heartbeat sent every 5 min by this client's `CheckSpeedManager.as`. sub 0: if `< 5min−15s` since last → ban 20 min (`ManageBussiness.ForbidPlayerByUserID`), world notice, disconnect; else store time, reply. **Also enforced in `SaveIntoDatabase`: no heartbeat for 90 min → 1 h ban** (GamePlayer.cs:4491). | ManageBussiness.ForbidPlayerByUserID | 300 {int 0} |
| 225 | ENTHRALL_SWITCH / REQUEST_UPDATE | ForSwitchHandler | — | Echo. | — | 225 {} |
| 141 *(no attribute)* | — | AASInfoSetHandle | bool cancel, [str name, str idNumber] | **Not registered (no attribute) → dead.** Chinese anti-addiction ID check; would `PlayerBussiness.AddAASInfo` and award item 11019. | SP_ASSInfo_Add | — |
| 35 | AC_ACTION | ACActionHandler | — | Obsolete no-op. | | |
| 64 | OPTION_UPDATE | OptionHandler | int | no-op | | |
| 24 | SCENE_CHANNEL_CHANGE | SceneChangeChannel | byte | no-op | | |
| 161 | USER_LUCKYNUM | UserLuckyNumHandler | bool, int | no-op | | |
| 206 | CHANGE_COLOR_OVER_DUE | ChangeColorShellTimeOverHandler | byte, int | no-op | | |
| 245 | CADDY_GET_AWARDS | RequestAwardsHandler | int, int | no-op | | |
| 279 | — | ShowHideTitleStateHandler | bool | no-op | | |
| 30 | PICC / LOTTERY_GET_ITEM | LotteryGetItem | byte, int | no-op (client actually sends int,int) | | |
| 213 | USE_LOG | UseLogHandler (wins over MarryInfoUpdateHandler) | int code | no-op | | |
| 218 | USER_GET_GIFTS | PlayerGiftHandler (dead, shadowed) | int | no-op | | |

## 2. Scene / lobby / chat / social

| Code | ePackageType | Handler | Reads | Behaviour | DB / managers | Replies |
|---|---|---|---|---|---|---|
| 16 | SCENE_LOGIN | UserEnterSceneHandler | int hall (1 = PvP lobby → `PlayerState=Manual`, 2 = PvE lobby → `Away`) | `RoomMgr.EnterWaitingRoom` (queued); removes from hot-spring scene. Waiting-room membership drives room-list pushes. | RoomMgr | room list / waiting room pkts |
| 21 | SCENE_REMOVE_USER | UserLeaveSceneHandler | — | PlayerState=Manual, `RoomMgr.ExitWaitingRoom`. | | |
| 19 | SCENE_CHAT | SceneChatHandler | byte channel, bool team, str (ignored), str text | Builds 19 {int zoneId, byte channel, bool team, str nick, str text[, int consortiaId if ch 3]}. In a running **Match** game and ch≠3 → forwarded to fight server (`SendChatMessage`). ch 3 guild (needs guild, not `IsBanChat`) → all guild members not blacklisting sender. ch 9 → marry-room scene (same `MarryMap`). ch 13 → hot-spring room. Other: in room → team (team flag) or whole room; in lobby → every player not in a room/marry/hotspring and not blacklisting; lobby cooldown **30 s** (`LastChatTime`), extra 1 s for ch 5, team flag in lobby → dropped. Hidden cheat words: `xoatrangbi` deletes EquipBag slot 78, `xoadaocu` deletes PropBag slot 47. GM `$ban$…/$mute/$unban/$kick` block exists but is behind `if(false)`. | ManageBussiness (dead branch) | 19 |
| 20 | SCENE_FACE | SceneSmileHandler | (opaque, forwarded) | Forwards the packet as-is (ClientID set) to room / marry scene / hot spring / waiting room. | | 20 (echo) |
| 69 | SCENE_USERS_LIST | SceneUsersListHandler | byte page, byte pageSize | Lists players not in game (`WorldMgr.GetAllPlayersNoGame`), wraps modulo. | | 69 {byte n, n×{int id, str nick, byte typeVIP, int vipLevel, bool sex, int grade, int cid, str cname, int offer, int win, int total, int escape, int repute, int fightPower}} |
| 37 | CHAT_PERSONAL | UserPrivateChatHandler | int targetId (0 → lookup by nick), str targetNick, str, str msg, bool autoReply | Whisper. Local target (unless blacklisted) or → center (cross-server). Echo to sender. | `SP_Users_SingleByNickName` (GetUserSingleByNickName) | 37 (clientId=sender) {int targetId, str targetNick, str senderNick, str msg, bool auto} |
| 36 | SYNCH_ACTION | UserSynchActionHandler | (opaque) | Re-sends packet as code 35 to the player in `packet.ClientID`… which was overwritten with the sender id, so it echoes to self. Not sent by this client. | | 35 |
| 71 | S_BUGLE | SmallBugleHandler | int, str, str msg | Needs PropBag item category 11 / Property1 4; consumes **before** the 2 s cooldown check. → center + all local players. `OnUsingItem`. | | 71 {int id, str nick, str msg} |
| 72 | B_BUGLE | BigBugleHandler | int templateId, [int, str,] str msg | 2 s cooldown. With item `templateId` in PropBag: 72 {int item.Property2, int id, str nick, str msg}; otherwise falls back to a cat-11/P4 item and writes 72 {int zoneId, int id, str nick, str msg, str zoneName} (cross-zone). Consumes 1, → center + all local. **Bug:** no item at all → `RemoveCountFromStack(null)` → free broadcast. | | 72 |
| 73 | C_BUGLE | CBugleHandler | int clientId, str, str msg | Cross-server bugle, template 11100 fixed. Sent to every `OtherLoginServer` connector + local players. | | 73 {int zoneId, int id, str nick, str msg, str zoneName} |
| 123 | DEFY_AFFICHE | DefyAfficheHandler | str text | Challenge announcement, costs 500 Money (no MoneyDirect, raw RemoveMoney). → center + all. `OnPlayerDispatches`. | | 123 {str} |
| 160 | IM_CMD | IMHandler | byte sub, … | **160 FRIEND_ADD**: str nick, int relation (0 friend, 1 blacklist) [client also sends 2 bools, ignored] → `AddFriends`; notifies target 160 {166, int targetId, str myNick, bool false} locally or via center; `SendAddFriend`. **161 FRIEND_REMOVE**: int id → `DeleteFriends`, `SendFriendRemove`. **165 FRIEND_STATE**: int state → center 160 {165, state, typeVIP, vipLevel, false} + `WorldMgr.ChangePlayerState`. **51 ONE_ON_ONE_TALK**: int targetId, str msg, bool → `sendOneOnOneTalk` to both (local only). 208 ADD_CUSTOM_FRIENDS / 45 ONS_EQUIP: not implemented. | SP_Users_Friends_Add, SP_Users_Friends_Delete, GetUserSingleByNickName | 160 subs |
| 70 | GAME_INVITE | GameInviteHandler | int targetId | Must be in a room; target online and not in a room. | | to target 70 {int inviterId, int roomId, int mapId, byte timeMode, byte roomType, byte hardLevel, byte levelLimits, str nick, bool isVip, int vipLevel, str roomName, str password, int sessionId (Dungeon: PVEGame.SessionId or 0, else −1), bool isOpenBoss} |
| 74 | ITEM_EQUIP | UserEquipListHandler | bool byId, then int id **or** str nick | View another player's equipment. Online: EquipBag slots 0–30 + gems; offline: `GetUserSingleByUserID/ByNickName`, `GetUserTexpInfoSingle`, `GetUserEuqip`, `GetSingleGemStones(num)` (bug: num=0 when by nick → offline-by-nick never works because GemStone list empty→ ok, but Texp null → "not exist"). Hard-coded hidden account `khanhlam`; VIP≥7 targets hidden from lower VIPs. | as listed | `SendUserEquip(info, items, gems)` |
| 18 | GET_PLAYER_CARD / SCENE_ADD_USER | GetPlayerCardHandler | int userId | Card book of a player (online CardBag 0..4 or DB). | GetUserSingleByUserID, GetUserCardEuqip | `SendUpdateCardData` |
| 85 | MATE_ONLINE_TIME | MateTimeHandler | int userId | Spouse last online time. | GetUserSingleByUserID | 85 {date LastDate or now} |
| 203 | LOOKUP_EFFORT | LookupEffortHandler | int userId | Achievements of a player (from DB). Bug: not-found path never sends. | GetUserAchievement, GetUserSingleByUserID | 203 (clientId=userId) {int achievementPoint, int n, n×int achId} |
| 218 | USER_GET_GIFTS | UserGetGiftHandler | int userId | Charm gifts received. | GetAllUserReceivedGifts, GetUserSingleByUserID | `SendGetUserGift(info, gifts)` |
| 221 | USER_SEND_GIFTS | UserSendGiftHandler | str nick, int shopId, int count (1..9999), int | Send charm gift: cost shop `AValue1×count` Money; `AddUserGift`, receiver `charmGP += Property2×count` (`UpdateUserCharmGP`), mail type 55; online receiver gets public-info update. | SP_Users_Gift_Add, SP_Users_UpdateCharmGP, SP_Mail_Send | 221 {bool true} |
| 57 | GOODS_PRESENT | UserPresentGoodsHandler | str, str, int | Disabled ("feature locked" msg). | | msg |
| 189 | USER_CHANGE_RANK | ReworkRankHandler | str honor | `UpdateHonor(text)` — sets displayed title string, **no ownership check**. | | public info |
| 34 | USER_RANK | ChangeDesignationHandler | bool showConsortia | `IsShowConsortia` flag. | | |
| 265 | NEWTITLE_CARD | NewTitleCardHandler | byte bag, int place | Title card: `NewTitleMgr.FindNewTitle(Property1)`, consume 1 → `Rank.AddNewRank(id, Property2 days)`, world notice via center. | Sys_User_Rank (via Rank.Save) | msg |
| 15 | USER_ANSWER | UserAnswerHandler | byte type, int step, [bool if type 1] | New-player tutorial steps: type 1 → `DropInventory.AnswerDrop(step)` rewards (items/gold/money/giftToken), optional `openFunction(step)`; type 2 → `openFunction(step)`; always `UpdateAnswerSite(step)`. | Drop tables | |

## 3. Inventory, bags & equipment

Bag ids (`eBageType`, SqlDataProvider/eBageType.cs): 0 EquipBag (slots 0–30 equipped, 31+ bag, avatars from 81),
1 PropBag, 2 TaskBag, 3 FightBag (in-battle props), 4 TempBag (battle loot), 5 CaddyBag (lottery), 11 Consortia (guild bank),
12 Store (enhancement workbench), 13 FarmBag, 14 Vegetable, 15 Card, 21 BeadBag, 32 FoodOld, 34 Food, 35 PetEgg,
41 MagicStone, 51 BankBag (see 02 §3). All moves persist via
`PlayerInventory.SaveToDatabase` → `SP_Users_Items_Add/Update`.

| Code | ePackageType | Handler | Reads | Behaviour | Replies |
|---|---|---|---|---|---|
| 49 | CHANGE_PLACE_GOODS | UserChangeItemPlaceHandler | byte bag, int place, byte toBag, int toPlace (−1 = auto), int count, bool allMove | Generic move/split/stack/equip/unequip. **count < 0 or > stack → disconnect** (anti-dupe). To Store bag requires captcha pass. Guild bank capacity = `StoreLevel×10`. Equipping from bag into slot < BeginSlot binds the item. Store/Bank/Consortia helpers swap or stack; remembers original equip slot in `TempProperties["temp_place_{ItemID}"]` so items return to their slot when leaving the workbench. Fires `OnNewGearEvent`. | inventory update pkts |
| 124 | CHANGE_PLACE_GOODS_ALL | ArrangeBagHandler | bool merge, int count, int bagType | Sort/compact bag; `merge` also stacks identical templates (`CanStackedTo`). Only if `count == items.Count`. | inventory update |
| 47 | UNCHAIN_EQUIP | UserUnchainItemHandler | int fromSlot | Unequip into first empty slot ≥ 31 (not during a game). | |
| 60 | ITEM_HIDE | UserHideItemHandler | bool hide, int slot (13→3, 15→4) | `HideEquip` (hat/glasses visibility bits in `Hide`). | public info |
| 42 | DELETE_GOODS | UserDeleteItemHandler | byte, int | Bag-lock check then **does nothing** (delete disabled). | |
| 77 | ITEM_OVERDUE | ItemOverdueHandler | byte bag, int place | Expired item (not in game): equipped slot < 30 → move to bag (avatars to ≥81) or mail (eMailType 9 ItemOverdue). | mail response |
| 62 | ITEM_CONTINUE | UserItemContineueHandler | int n, n×{byte bag, int place, int shopGoodsId, byte priceTier, bool} | Renew timed items. Allowed: equip slots < 31, PropBag, Consortia bag. Shop entry must match template (else logs "Cheat" and aborts the rest). Price via `ItemInfo.SetItemType`; new ValidDate = tier unit (+ remaining if still valid), bound. | msg |
| 122 | CLEAR_STORE_BAG | StoreClearItemHandler | — | `ClearStoreBag` (return workbench items to bags). | |
| 79 | ITEM_STORE | StoreItemHandler | byte bag, int place | Guild-bank deposit stub — does nothing after lookups. | |
| 108 | GAME_TAKE_TEMP | GameTakeTempItemsHandler | int place (−1 = all) | Take battle loot from TempBag (cards → CardBag); full → mail all ("Túi Đầy!"). | msg |
| 127 | REClAIM_GOODS | ItemReclaimHandler | byte bag, int place, int count | Sell to system: `ReclaimType` 1 gold, 2 giftToken, 3 forbidden; price = count×ReclaimValue; template 11408 → RemoveMedal(count). **Removes the whole stack** regardless of count. | msg |
| 232 | CADDY_SELL_ALL_GOODS | CaddyClearAllHandler | — | Sell every CaddyBag (lottery) item by ReclaimType. | msg |
| 182 | USE_COLOR_CARD | UserChangeItemColorHandler | int, int propSlot, int, int equipSlot, str color, str skin, int templateId | Dye equipment: consume color card from PropBag or auto-buy (shop `APrice1 == −1` → Money price). | msg |
| 252 | USE_CHANGE_SEX | ChangeSexHandler | byte bag, int slot | Item 11569: forces divorce notice if married (ApplyType 3, `SavePlayerMarryNotice`, center `UPDATE_PLAYER_MARRIED_STATE`), `ChangeSex`, consume. (Same code as MARRY_ROOM_STATE — this handler wins.) | msg |
| 171 | USE_REWORK_NAME | UseReworkNameHandler | byte bag, int place, str newNick | Rename card (`EquipType.CHANGE_NAME_CARD`); rejects `%!@#$^&*()?/>.<,:;'\|}]{[_~\`+=-"`. `RenameNick(user, old, new)` queues rename (applied by daily `Sp_Renames_Batch`). NRE if slot empty. | msg |
| 188 | USE_CONSORTIA_REWORK_NAME | UseConsortiaReworkNameHandler | int cid, byte bag, int place, str newName | Guild rename card (`CONSORTIA_CHANGE_NAME_CARD`), chairman only, no name validation. `RenameConsortia`. | msg |
| 66 | PROP_USE | PropUseHandler | int bag, int place, int n, n×int templateId, int payType, bool | Special props: 201316 chick-activation key (activates `UserChickActiveInfo`), 11963 random 1..999 GiftToken. | msg |
| 183 | CARD_USE | CardUseHandler | int bag, int place (−1 = quick-buy from shop), int n, n×int shopIds, int, bool ignoreBagLock | Use buff/VIP cards. Property1 23 = VIP card → `SetTypeVIP`, `VIPRenewal`, `OpenVIP/ContinuousVIP`, `SendOpenVIP`; Property1 21 = GP pill → `AddGP(P2×count)` (max level → Offer/100); else `BufferList.CreateBuffer(template, validDate).Start()`. Quick-buy only for money-priced entries (`APrice1==−1`). | SP_VIPRenewal_Single | msg, buff list |
| 165 | — | LuckStoneEnableHandler | — | `UpdateProperties`. | |
| 225 | — | (see §1) | | | |

## 4. Shop, currencies, boxes & lotteries

| Code | ePackageType | Handler | Reads | Behaviour | DB | Replies |
|---|---|---|---|---|---|---|
| 44 | BUY_GOODS | UserBuyItemHandler | int n (1..99), n×{int shopGoodsId, int tier (1/2/3 = A/B/C price), str color, bool dress, str skin, int place} [client appends int, ignored] | Main shop. `ShopMgr.GetShopItemInfoById` + `IsOnShop`; `ShopID 2` rejected; `ShopMgr.CanBuy(shopId, guildShopLevel, …, Riches)` (guild shop needs ShopLevel & personal Riches ≥ `Consortia_Equip_Control`); `ShopID 20` = limited free daily items (`WorldMgr.UpdateShopFreeCount`, 1/day). BuyType 0 → ValidDate = unit, else Count = unit. Price: `ItemInfo.SetItemType` → gold/money/offer/giftToken/petScore/score/damageScore + required-item list. Bag lock; all currencies checked then deducted; required items removed (`RemoveTemplateInShop`). **All bought items are forced IsBinds=true.** Equip-on-buy honours ring slots 9/10 and 7/8. Overflow → `AddGoods` + mail type 8 (5 annexes per mail). `OnPaid`, `AddLog`. | ShopMgr cache (table `Shop`), SP_Users_Items_Add, SP_Mail_Send | 44 {int 1, int 3} (always), msg, `SendShopGoodsCountUpdate` |
| 168 | GOODS_COUNT | GoodsCountHandler | — | Remaining stock of limited items. | WorldMgr cache | `SendShopGoodsCountUpdate(list)` |
| 54 | PROP_BUY | PropBuyHandler | int shopGoodsId | Buy in-battle prop into FightBag (3 slots) — template must be in `PropItemMgr.PropFightBag`, category 10. NRE if id unknown. | | inventory |
| 55 | PROP_SELL | PropSellHandler | int slot, int shopGoodsId | Remove FightBag item, refund **shop gold price** (client chooses shopGoodsId!). | | |
| 75 | EDICTUM_GET_SERVION | PropDeleteHandler | int place | Delete FightBag item. | | |
| 126 | BUY_QUICK_GOLDBOX | QuickBuyGoldBoxHandler | int count, bool | Shop goods 1123301: `MoneyDirect(count×AValue1)`, opens box template once and gives `gold×count`. | ItemBox | msg |
| 46 | BUY_GIFTBAG / UPDATE_COUPONS | BuyGiftBagHandler | — | Strengthen kit: 1950 Money; clears store bag (except slot 5), puts bound 11023 ×3 (slots 0–2), 11020 (3), 11018 (4). | | msg |
| 63 | ITEM_OPENUP | OpenUpArkHandler | byte bag, int slot, int count | Open box items (cat 11, Property1 6, NeedLevel). Each box → `ItemBoxMgr.CreateItemBox` → money, gold, giftToken, medal, honor, exp (max level → Offer exp/500), hardCurrency, leagueMoney, items. `IsTips` items → world notice. Non-stackables added one by one. | Items_Box cache | 63 {str boxName, byte n, n×{int tpl, int count, bool binds, int valid, int strLvl, int atk, int def, int agi, int luck}}, msg |
| 26 | LOTTERY_OPEN_BOX | LotteryOpenBoxHandler | byte bag, int slot, int boxTemplate | Treasure/caddy boxes. Busy if `Lottery != −1`. boxTemplate −1 + item 112019/190000 → "God of wealth" 18-slot lottery (`FindLotteryItemBoxByRand`) → 29. Else open box via ItemBoxMgr; boxes 112047/112100/112101 need keys 11456 ×4 (×2 with `Caddy_Good` pay buff), `AddBadLuckCaddy(1)`; result → CaddyBag. | | 29 {int lotteryId, 18×{int tpl, bool bind, byte count, byte valid}} / 245 {bool any, int n, n×{str name, int tpl, int 4, bool false}} |
| 27 | LOTTERY_RANDOM_SELECT | LotteryRandomSelectHandler | — | Draw from active 18-slot lottery: max 8 draws, draw k costs k keys (11444, or 190001 for 190000). | | 30 {bool true, int tpl, int quality, int strLvl, int atk, int def, int luck, int agi, bool binds, int valid, byte count} |
| 28 | LOTTERY_FINISH | LotteryFinishBoxHandler | — | Move CaddyBag + `LotteryAwardList` into bags (overflow mail), `ResetLottery`. | | |
| 204 | OPEN_ALL_CARDBOX | OpenAllCardBoxHandler | — | Every CaddyBag item → `CardBag.AddCard(Property5, rand 1..2)`. | | msg |
| 45 | CADDY_GET_BADLUCK | RequestBadLuckHandler | — | Caddy open ranking (`WorldMgr.CaddyRank`, refreshed on DB-save timer). | SP_Get_Rank_Caddy | 45 {str lastUpdate, int n, n×{int rank, int userId, int totalCaddyOpen, int 0, str nick}} |
| 215 | — | CaddyConvertedHandler | str title, str content | **Misnamed: guild mass-mail** — mails every member (type 59), costs guild 1000 riches. No duty check. (Not sent by this client; real one is consortia sub 29.) | SP_Consortia_Users_All, SP_Mail_Send, SP_Consortia_Riches_Remove | `SendConsortiaMail` |
| 87 | NEWCHICKENBOX_SYS | ChickenBoxHandler | int cmd, … | "New chicken box" card flip + Lucky Star. 13 TAKEOVERCARD (int pos): cost `openCardPrice[n]` Money → award; 11 USEEAGLEEYE (int pos): `eagleEyePrice[n]`; 14 FLUSHCHICKENVIEW: `flushPrice` (logic inverted: pays when free time); 12 ALLITEMSHOW; 15 CLICKSTARTBNT → {5 CANCLICKCARD, true}; 10 ENTERCHICKENVIEW; 31 ENTER_GAME (Lucky Star) 2500 Money; 33 START_TURN 7 s cooldown, consumes LUCKYSTAR item; 34 TURN_COMPLETE gives award. Prices: GameProperties NewChicken*. | Actives (Sys_User_Active?), WorldEventMgr | 87 subs |
| 128 | LEFT_GUN_ROULETTE_SOCKET | LeftGunHandler | int cmd (1) | Daily roulette: rand(55) buckets over `LeftRouterRateData` → `LeftRoutteRate`, `LeftRoutteCount--`. | | `SendLeftRouleteResult` |
| 130 | LEFT_GUN_ROULETTE_COMPLETTE | LeftGunCompleteHandler | — | World tip notice of won rate. | | |
| 92 | VIP_RENEWAL | OpenVipHandler | str nick, int days | Buy/renew VIP for self or another online player. Price from VIP card shop entry (A/B/C units or prorated). `MoneyDirect`; `VIPRenewal(nick, days, type, ref expire)`; self: max level 9 check (after charging!); `OpenVIP/ContinuousVIP`, `AddExpVip(money)`. Offline target: charged, DB renewed, "not exist" message. | SP_VIPRenewal_Single | `SendOpenVIP`, msg |
| 96 | HONOR_UP_COUNT | HonorUpHandler | byte type, bool | type 2: buy honor tier `TotemHonorMgr.FindTotemHonorTemplateInfo(MaxBuyHonor+1)` (NeedMoney → AddHonor, MaxBuyHonor+1). | TotemHonorTemplate | `SendUpdateUpCount` |
| 136 | TOTEM | OpenOneTotemHandler | — | Grade ≥ 20; next totem (min 10001) ≤ `TotemMgr.MaxTotem`; needs `myHonor ≥ ConsumeHonor`; `MoneyDirect(ConsumeExp)` **result ignored (stray `;`)** → totem granted without money. | Totem | `SendPlayerRefreshTotem` |

## 5. Enhancement (strengthen, compose, fusion, gems, holes, refinery…)

All use the **Store bag** (workbench) slots. See 02 §4 for formulas and tables.

| Code | ePackageType | Handler | Reads | Store-bag layout & behaviour | Replies |
|---|---|---|---|---|---|
| 59 | ITEM_STRENGTHEN | ItemStrengthenHandler | bool useGuildSmith | [5] item, [0..2] stones (cat 11, P1 2/35), [4] luck stone (cat 11 P1 3), [3] god stone (cat 11 P1 7, prevents downgrade). Success roll vs `RandomSafe.Next(10000)`; level++; weapon template upgrade via `Item_StrengthenGoodsInfo`; holes opened; ≥ +10 world notice. Failure without god stone: template Level 3 items drop one level if ≥ 5, others `Count--` (destroyed). Warriors (`isPlayerWarrior`) always succeed. | 59 {byte 0 ok / 1 fail, bool success} |
| 138 | ITEM_ADVANCE | ItemAdvanceHandler | bool consortia, bool multi | +12..+15 with exalt rock (`EquipType.EXALT_ROCK`) at [0], item at [1]: success if `StrengthenExp/oldLv > rand(RateAdvance)`, else StrengthenExp += rock P2 (min 10). | 138 {byte 0/1, int stoneExp}; world notice |
| 58 | ITEM_COMPOSE | ItemComposeHandler | bool useGuildSmith | [1] item, [2] compose stone, [0] luck. Cost `PRICE_COMPOSE_GOLD`. Rate `{0.8,0.5,0.3,0.1,0.05}[quality−1]×100` (+luck P2%, ×(1+0.1×SmithLevel)). Stone P3 = stat (1 atk, 2 def, 3 agi, 4 luck), P4 = value, only if higher. | 58 {byte 0 ok / 1 fail} |
| 78 | ITEM_FUSION | ItemFusionHandler | byte op (0 preview, 1 fuse) | [1..4] four identical items; `FusionMgr.Fusion/FusionPreview` (Item_Fusion table). Fuse costs 400 gold; inputs Count−1; result to [0]; ValidDate = min of inputs (cat 7/17 → 7 days, bound). | `SendFusionPreview(dict tpl→rate, isBind, minValid)`, `SendFusionResult(bool)` |
| 61 | ITEM_TRANSFER | ItemTransferHandler | bool moveHoles, bool moveHole5_6 | [0] old, [1] new (same category). 10000 gold (charged before validation). `StrengthenMgr.InheritTransferProperty` swaps strengthen/compose/holes; weapons re-templated via transfer table (levels 10–15) and GoldEquip. | 61 {byte 0} |
| 121 | ITEM_INLAY | ItemInlayHandle | int itemBag, int itemPlace, int hole (1..6), int gemBag, int gemPlace | Gem (P1 31) into hole whose type (`Template.Hole` = `"lvl,type|…"`) equals gem P2. Cost `InlayGoldPrice` (charged even on type mismatch). Holes 5/6 return the replaced gem. | 121 {int 0} or {byte 1}, `LogMgr.LogItemAdd` |
| 125 | ITEM_EMBED_BACKOUT | ItemEmbedBackOutHandler | int hole, int gemTemplateId | Remove gem from Store[0]; 500 Money (warriors free); needs free PropBag slot; returns bound gem; then `ClearStoreBag`. | 125 {int 0 ok / 1 fail} |
| 217 | OPEN_FIVE_SIX_HOLE | OpenFiveSixHoleHandler | int storeSlot, int hole (5/6), int drillTemplate | Drill hole 5/6 (items cat 7/1/5): 100 ms throttle; drill `isDrill(holeLevel)`; exp += rand(P7,P8); levels per `HoleLevelUpExpList`. | 217 {byte 0, bool leveled, int hole} |
| 120 | ITEM_TREND | ItemTrendHandle | int bag, int place, int bag2, int place2 (−1 = auto-buy 34101), int operation, [int, int] | Refinery "trend": `RefineryMgr.RefineryTrend(op, item)` → new template; consumes one trend item. | msg |
| 106 | WISHBEADEQUIP | WishBeadEquipHandler | int place, int bag, int templateId, int beadPlace, int beadBag, int beadId | Gold plating: beads 11560 weapon / 11561 cat 5 / 11562 cat 1; chance per ZoneId (1001: 5 %, 1002: 4 %, else 0.8 %); success → gold for 3 days (`GoldEquipTemplateLoad`). | 106 {int 0 ok,1 fail,5 invalid,6 already gold} |
| 133 | LATENT_ENERGY | LatentEnergyHandler | byte type, int bag, int place, [int itemBag, int itemPlace if type 1] | Potential: type 1 reroll with stone (P1 101): 4×rand(P2,P3) + 3×rand(P6,P7) → `latentEnergyNewStr` (7 days); type 2 accept. NRE if no item. | 133 {int place, str cur, str new, date end} |
| 95 | NECKLACE_STRENGTH | NecklaceStrengthHandler | byte type (2 = feed), int stonePlace, int count | Necklace exp with `NECKLACE_PTETROCHEM_STONE` (P2 exp each) capped at max exp; `necklaceExpAdd` from StrengthenMgr table. | `SendNecklaceStrength` |
| 209 | FIGHT_SPIRIT | FigSpiritUpGradeHandler | byte, int autoBuy, int goodsId, int type, int gemTemplate, int fightSpiritId, int equipPlace, int place, int count | Grade ≥ 30. Gem slots per equip place, `FigSpiritIdValue = "lvl,exp,place|×3"`; feed gem items (P2 exp; autoBuy==1 feeds as many as needed); levels from `FightSpiritTemplateMgr.Exps`, cap `FightSpiritMaxLevel`. | Sys_User_Gemstone (UpdateGemStoneInfo) | `SendPlayerFigSpiritUp` |
| 99 | TEXP | TexpHandler | int stat (0 hp,1 att,2 def,3 spd,4 luk), int templateId, int storePlace | Training exp items; daily limit grade×2 (VIP ≤ 2) or ×3, + `Train_Good` buff. | SP_UserTexp_Update | properties |
| 222 | EQUIP_RECYCLE_ITEM | EquipRetrieveHandler | — | Recycle 4 items in Store[1..4]: quality sum ∈ {8,12,15,20} → `DropInventory.RetrieveDrop`; result bound into Store[0]. NRE on empty slots. | |
| 402 | AVATAR_COLLECTION | AvatarCollectionHandler | byte sub; 3: int groupId, int templateId, int sex; 4: int avatarId, int days | Wardrobe collection: activate clothing (needs item equipped/owned, costs `ClothGroup.Cost` gold), half set → active 10 days; renew = stub. | ClothGroupTemplate, ClothPropertyTemplate | 402 {3,…} / {4, int id, int sex, date end} |

## 6. Mail

Mail rows: `User_Messages`; attachments are `Sys_Users_Goods` rows with `UserID=0`, referenced by `Annex1..5`.
Types (`eMailType`): 1 Common, 8 BuyItem, 9 ItemOverdue, 12 OpenUpArk, 14 Marry, 51 Manage, 55 GiftGuide,
59 Consortia, 101 Payment (COD). Center timer `ScanMail` expires mail.

| Code | ePackageType | Handler | Reads | Behaviour | Replies |
|---|---|---|---|---|---|
| 116 | SEND_MAIL | UserSendMailHandler | str nick, str title, str content, bool isCOD, int validDate, int money, 4×{byte bag, int place (−1 none)} | Requires Gold ≥ 100 (fee 100 gold), Money ≥ 0, `IsLimitMail`, not warrior; bag lock if attaching. Bound items skipped. COD: Type 101, ValidDate 1 or 6 days, `Money` = price, needs ≥ 1 annex. Normal: Type 1, money transferred (`RemoveMoneyNoviceActive`). Attached items `UserID=0` & removed from bag. | 116 {bool} (cloned), mail responses (117) |
| 113 | GET_MAIL_ATTACHMENT | MailGetAttachHandler | int mailId, byte which (0 all, 1–5 annex, 6 gold, 7 money) | COD (Type > 100): `MoneyDirect(mail.Money)` first, sender notified. Marks read, ValidDate 72 h. `UpdateMail(mail, oldMoney)`; items via `GetUserItemSingle` → `AddTemplate`; gold/money/giftToken credited. | 113 {int mailId, int n, n×int type}, msg |
| 112 | DELETE_MAIL | UserDeleteMailHandler | int mailId | Refuses while an annex item still belongs to the mail. `DeleteMail(user, id, out sender)`. NRE if not found. | 112 {int id, bool} |
| 114 | UPDATE_MAIL | UserUpdateMailHandler | int mailId | Mark read (ValidDate 72 h for Type < 100). | 114 {bool} |
| 118 | MAIL_CANCEL | MailPaymentCancelHandler | int mailId | Cancel/return COD mail (`CancelPaymentMail`). | echo 118 + bool |

## 7. Auction house

| Code | ePackageType | Handler | Reads | Behaviour | Replies |
|---|---|---|---|---|---|
| 192 | AUCTION_ADD | AuctionAddHandler | byte bag, int place, byte payType (forced 1 = Money), int price, int buyout (0 = none), int duration (0 = 8 h, 1 = 24 h, 2 = 48 h), int count | Not warrior, bag lock, not bound, grade ≥ `CustomLimit[1]`, `IsLimitCount`. Fee gold = price×0.03×(1/3/6), min 1. Splits stack (`AddGoods` clone), `AddAuction` (Rise = price/10, Random = rand(BeginAuction, EndAuction) minutes extra), removes item, re-adds remainder. | `SendAuctionRefresh(info, id, true, item)`, msg |
| 193 | AUCTION_UPDATE | AuctionUpdateHandler | int auctionId, int bid | Bid / buyout. Grade ≥ `CustomLimit[0]`. PayType 0 gold / 1 Money (`MoneyDirect`, i.e. paid immediately). Min = price (first bid) or price+rise; ≥ buyout → closes (`IsExist=false`). `UpdateAuction(info, Cess)` (proc refunds previous bidder & mails). | 193 {bool ok, int id}, refresh, mail responses |
| 194 | AUCTION_DELETE | AuctionDeleteHandler | int auctionId | Seller cancels (`DeleteAuction(id, user, ref msg)`; proc returns item by mail). | refresh + msg |
| — | AUCTION list | (HTTP) | | Browsing is `Tank.Request/AuctionPageList.ashx` (request spec). | |

## 8. Quests, achievements, daily/activity rewards

| Code | ePackageType | Handler | Reads | Behaviour | Replies |
|---|---|---|---|---|---|
| 176 | QUEST_ADD | QuestAddHandler | int n, n×int questId | `QuestInventory.AddQuest(QuestMgr.GetSingleQuest(id))` — level/prerequisite checks inside `AddQuest`. | quest update pkts |
| 177 | QUEST_REMOVE | QuestRemoveHandler | int questId | Abandon. | |
| 179 | QUEST_FINISH | QuestFinishHandler | int questId, int selectedRewardTemplate | 1 s throttle. `QuestInventory.Finish` (all conditions done, bags have space) → rewards (Quest_Goods; selectable ones must match), gold/GP/… | 179 {int id} |
| 181 | QUEST_CHECK | QuestCheckHandler | int questId, int conditionId, int value | **Sets a `ClientModifyCondition` (type 20) value from the client** (tutorial-style conditions). | |
| 230 | ACHIEVEMENT_FINISH | AchievementFinishHandler | int achievementId | If no `Sys_Users_Achievement` data row: add, send reward, `OnAchievementQuest`, save. **No condition check** (anti-cheat hole). | 230 {int id, int y, int m, int d} |
| 13 | DAILY_AWARD | DailyAwardHandler | int type | 0 daily login award (`AwardMgr.AddDailyAward` + `UpdatePlayerLastAward`); 2 daily egg (`LastGetEgg`) item 112059; 3 VIP daily box (`ItemBoxMgr.FindItemBoxTypeAndLv(2, vipLevel)`, `UpdateLastVIPPackTime`); 5 sign-in log (`DailyLogList`). Overflow → mail type 12. | msg (GM_NOTICE) |
| 90 | GET_SIGNAWARD | SignAwardHandler | int signCount | `AwardMgr.AddSignAwards(player, count)` (Daily_Award rows by count). | msg |
| 103 | DAILYRECORD | DailyRecordHandler | — | Returns and deletes `DailyRecord` rows (event log shown on login). | 103 {int n, n×{int type, str value}} |
| 219 | WEEKLY_CLICK_CNT | UserWeeklyClickHandler | — | Always true (compares DateTime.Now to a date). | 219 {bool} |
| 53 | GET_TIME_BOX | UserGetBoxHandler | int mode; mode 0: int minutes; else int boxType (0 time, 1 level) | Online-time / level boxes (`TimeBox_Award` via UserBoxMgr): time box when minutes since `BoxBeginTime` ≥ Condition; level box when grade ≥ Level. Rewards via ItemBoxMgr; overflow mail type 12. | 53 {bool, int BoxProgression} (type 0) |
| 338 | ACCUMULATIVELOGIN_AWARD | AccumulAtiveLoginAwardHandler | int selectedTemplate | Cumulative login days: day < 7 fixed list, day 7 = chosen item. Mailed. | 338 {int loginDays, int awardDays} |
| 258 | NOVICEACTIVITY | NoviceActivityGetAward | int activityType, int sub | Server-open events: bitmask progression (AwardGot×2+1 → sub 1..9), `ProduceBussiness.GetEventRewardInfoByType/GoodsByType`, condition ≤ progress → mail (type 51). 1.5 s throttle. | msg |
| 259 | FIRSTRECHARGE | FirstRechargeGetAwardHandler | int | First top-up reward (EventReward type 7 sub 1), once (`IsGetAward`). | `SendUpdateFirstRecharge`, msg |
| 84 | ACTIVITY_PACKAGE | ActivityPackageHandler | int cmd (2 = CHICKACTIVATION), int sub | Chick activation (code-key VIP-ish pack): 3 QUERY → status; 1 OPENKEY str code (14 chars) → `ActiveChickCode` (0 ok / 1 not exist / 2 used); 2 GETAWARD int awardType, int index → daily (≤7) / every-3-days (≤10) / weekly Saturday (11) / level awards (12, levels 5..60) from `ActivitySystemItem` (ActiveMgr.FindChickActivePakage). 60-day validity. | 84 {2, 3, isKeyOpened, 1, date, type, 11 flags, currentLvAward}, mail |
| 145 | ACTIVITY_SYSTEM | ActiveSystemHandler | byte | Builds a packet for sub 8 but never sends (no-op). | |
| 131 | LABYRINTH | LabyrinthHandler | int sub … | Warrior-family raid (labyrinth): 1 DOUBLE_REWARD (bool) uses item 11916; 2 REQUEST_UPDATE; 3 CLEAN_OUT (`WarriorFamRaidDDTPrice` giftToken, timed auto-clear); 4 SPEEDED_UP (Money per min); 5 STOP; 6 RESET; 9 TRY_AGAIN (bool,bool). | `SendLabyrinthUpdataInfo` |
| 162 | ELITEGAME | EliteGameHandler | byte sub, [int gameType] | Elite championship: 1 status, 2 open start-room if status 5 & grade ≥ 30, 3 my rank/score, 4 champion list. State pushed by center codes 904–912. | 162 subs |
| 132 | — | BattleGroundHandler | byte sub, [byte] | League (Chiến thần) info: 3 → rank / prestige; 5 → 8 battle stats. | 132 subs |

## 9. Consortia (guild) — code 129 `CONSORTIA_CMD`

`ConsortiaHandler` → `Player.Consortia.ProcessData` (global lock) → `ConsortiaLogicProcessor` reads
**int** sub (`ConsortiaPackageType`) → `Game.Server/Consortia/Handle/*.cs`. Reply is always 129 {byte sub, …}.
Most permission checks are inside the stored procs (duty `Right` bitmask, chairman) — see 02 §8.
"→ center 128.k" = `LoginServerConnector.SendConsortia*` which broadcasts code 128 {byte k, …} to every game
server (and the players of that guild).

| Sub | Name | Handler | Reads | Behaviour | Procs | Reply / broadcast |
|---|---|---|---|---|---|---|
| 0 | CONSORTIA_TRYIN | ConsortiaTryin | int cid (0 = cancel) | Apply to guild (must have none). | SP_ConsortiaApplyUser_Add | {0, int, bool, str} |
| 1 | CONSORTIA_CREATE | ConsortiaCreate | str name (≤ 12 bytes, Encoding.Default) | Needs Gold ≥ `Consortia_Level[1].NeedGold`, Grade ≥ 5, Money ≥ 500; takes both. | SP_Consortia_Add | {1, str, bool, int cid, str, str msg, int dutyLevel, str dutyName, int right}; → center 130 |
| 2 | CONSORTIA_DISBAND | ConsortiaDisband | — | Captcha required. Chairman deletes. | SP_Consortia_Delete | {2, [bool], int uid, str}; → center 128.2 |
| 3 | CONSORTIA_RENEGADE | ConsortiaRenegade | int userId (self = leave) | Leave or kick. | SP_ConsortiaUser_Delete | {3, int, bool, str}; → center 128.3 |
| 4 | CONSORTIA_TRYIN_PASS | ConsortiaTryinPass | int applyId | Accept applicant. | SP_ConsortiaApplyUser_Pass | {4, int, bool, str}; → center 128.1 |
| 5 | CONSORTIA_TRYIN_DEL | ConsortiaTryinDel | int applyId | Reject/cancel application. | SP_ConsortiaApplyUser_Delete | {5, int, bool, str} |
| 6 | CONSORTIA_RICHES_OFFER | ConsortiaRichesOffer | int money | Donate Money: riches = money/2 (`ConsortiaRichAdd(cid, ref riches, 5, nick)`); player `RichesOffer`/`RichesRob` += riches. | SP_Consortia_Riches_Add | {6, int, bool, str}; → center 128.9 |
| 7 | CONSORTIA_APPLY_STATE | ConsotiaApplyState | bool open | Open/close applications. | SP_Consortia_Apply_State | {7, bool, bool, str} |
| 9 | CONSORTIA_DUTY_DELETE | ConsortiaDutyDelete | int dutyId | | SP_ConsortiaDuty_Delete | {9, int, bool, str} |
| 10 | CONSORTIA_DUTY_UPDATE | ConsortiaDutyUpdate | int dutyId, byte op (2 = rename: str name ≤ 10 bytes, int right; 1/3/4 = move) | | SP_ConsortiaDuty_Update | → center 128.8 only (no direct reply) |
| 11 | CONSORTIA_INVITE | ConsortiaInviteAdd | str nick | | SP_ConsortiaInviteUser_Add | {11, str, bool, str}; → center 128.4 |
| 12 | CONSORTIA_INVITE_PASS | ConsortiaInvitePass | int inviteId | Accept invite. **Bug:** result fields are written into the incoming packet; reply only {12, int id}. | SP_ConsortiaInviteUser_Pass | → center 128.1 |
| 13 | CONSORTIA_INVITE_DELETE | ConsortiaInviteDelete | int inviteId | | SP_ConsortiaInviteUser_Delete | {13, int, bool, str} |
| 14 | CONSORTIA_DESCRIPTION_UPDATE | ConsortiaDescriptionUpdate | str (≤ 300 bytes) | | SP_ConsortiaDescription_Update | {14, str, bool, str} |
| 15 | CONSORTIA_PLACARD_UPDATE | ConsortiaPlacardUpdate | str (≤ 300 bytes) | | SP_ConsortiaPlacard_Update | {15, str, bool, str} |
| 16 | CONSORTIA_BANCHAT_UPDATE | ConsortiaIsBanChat | int userId, bool ban | | SP_ConsortiaIsBanChat_Update | {16, int, bool, bool, str}; → center 128.5 |
| 17 | CONSORTIA_USER_REMARK_UPDATE | ConsortiaUserRemark | int userId, str (≤ 100) | | SP_ConsortiaUserRemark_Update | {17, int, str, bool, str} |
| 18 | CONSORTIA_USER_GRADE_UPDATE | ConsortiaUserGradeUpdate | int userId, bool promote | | SP_ConsortiaUserGrade_Update | {18, int, bool, bool, str}; → center 128.8 (6/7) |
| 19 | CONSORTIA_CHAIRMAN_CHAHGE | ConsortiaChangeChairman | str nick | | SP_ConsortiaChangeChairman | {19, str, bool, str}; → center 128.8 (9 and 8) |
| 20 | CONSORTIA_CHAT | ConsortiaChat | byte, str, str (+ server appends int cid) | Guild chat (ban-chat check), local members + center. | | 129 echo |
| 21 | CONSORTIA_LEVEL_UP | ConsortiaLevelUp | byte what (1 guild, 2 store/bank, 3 shop, 4 smith, 5 skill/buff) | Level 1 costs player gold `Consortia_Level.NeedGold`; others riches inside procs. Thresholds broadcast SYS_NOTICE 10 {int 2, str}. | SP_Consortia_UpGrade / _Store_UpGrade / _Shop_UpGrade / _Smith_UpGrade / _Skill_UpGrade | {21, byte what, byte level, bool, str}; → center 128.6/12/10/11/13 |
| 22 | CONSORTIA_TASK_RELEASE | CConsortiaTask | (int sub → §9b) | Guild mission sub-protocol. | | |
| 23 | DONATE | Donate | int itemType, int amount | Unimplemented (logs). | | |
| 24 | CONSORTIA_EQUIP_CONTROL | ConsortiaEquipControl | 5×int riches (shop levels 1–5), int (smith), int (store) | Personal-riches thresholds to use guild shop/smith. | SP_Consortia_Equip_Control_Add ×7 | {24, bool, 7×int} |
| 25 | POLL_CANDIDATE | — | int | Client sends; no server handler. | | |
| 26 | SKILL_SOCKET | SkillSocket | bool, int buffId, int days, int payType (1 = riches, else medal) | Guild buff (`Consortia_Buff_Temp`): buff.level ≤ guild level; type-1 buffs paid from guild riches, others from player RichesOffer; medal alternative. `ConsortiaMgr.AddBuffConsortia` gives the buff (1440×days min) to all members. 2 s throttle; no guild → disconnect. | SP_Consortia_Riches_Remove, SP_User_Consortia_Buff_Add | msg |
| 28 | BUY_BADGE | BuyBadge | int badgeId | `Consortia_Badge_Config` cost from riches, 30 days; members' badge updated. | SP_ConsortiaBadge_Update, SP_ConsortiaRiches_Update | `sendBuyBadge` |
| 29 | CONSORTION_MAIL | ConsortiaMail | str title, str content | Needs riches ≥ 1000; mail all members (type 59); −1000 riches. | SP_Mail_Send, SP_ConsortiaRiches_Update | {29, bool} |
| 30/31 | CONSORTIA_BOSS_INFO / BOSS_OPEN_CLOSE | — | | No client→server handler in this build (boss state comes from center 180–188). | | |

### 9b. Consortia task (guild mission) — 129 sub 22, then **int** `ConsortiaTaskType`

| Sub | Name | Handler | Reads | Behaviour |
|---|---|---|---|---|
| 0 | RELEASE_TASK | ReleaseTask | int level | Cost `MissionRiches[guildLevel]` riches (`UpdateConsortiaRiches`); `ConsortiaTaskMgr.CreateTask` (Consortia_Task templates). → `SendTaskInfo` |
| 1 | RESET_TASK | ResetTask | bool | 500 Money → `ResetTask`. |
| 2 | SUMBIT_TASK | SumbitTask | — | `SendSumbitTask(true)`. |
| 3 | GET_TASKINFO | GetTaskInfo | — | `SendTaskInfo` (active task if not expired). |

## 10. Rooms & matchmaking — code 94 `GAME_ROOM`

`GameRoomHandler` → `Player.GameRoom.ProcessData` (global lock) → `GameRoomLogicProcessor` reads **int** sub
(`GameRoomPackageType`) → `Game.Server/GameRoom/Handle/*.cs`. Most actions enqueue an `IAction` on the
RoomMgr thread. Room semantics in 02 §11.

| Sub | Name | Handler | Reads | Behaviour |
|---|---|---|---|---|
| 0 | GAME_ROOM_CREATE | Create | byte roomType (`eRoomType`), byte timeType, str name, str password | Needs main weapon. World-boss rooms (14): boss open & alive, re-entry delay by fight power (45–600 s), grants WorldBossHP/AddDamage buffs. → `CreateRoomAction`: random free `BaseRoom`, Dungeon defaults (Normal, level limit by grade), league time → crosszone; `SendRoomCreate`, add host, waiting-room updates. |
| 1 | GAME_ROOM_LOGIN | Login | bool isInvite, int hallType, int roomSel; if roomSel == −1: int roomId, str password | Enter room (inline, not queued). roomId −1 = quick join of hallType (`FindRandomRoom`, Freshman excluded, dungeon level filter). Checks: weapon, room in use, playing (PvE only if invited & session prepared), full → viewer seat if `maxViewerCnt`, password, dungeon level limit. → `SendRoomLoginResult(bool)`, `SendRoomCreate`, `SendGameRoomSetupChange`. |
| 2 | GAME_ROOM_SETUP_CHANGE | SetupChange | int mapId, byte roomType, bool isOpenBoss, str password, str name, byte timeMode, byte hardLevel, int levelLimits, bool isCrosszone | Host only, not playing. Labyrinth map 0 → 401 + current floor. Dungeon "open boss" in zones 1001–1003 charges `PveInfo.GetPrice(hard)` with VIP discount (5→95 % … 12→12 %) — **MoneyDirect result ignored**. → `RoomSetupChangeAction`. |
| 3 | GAME_ROOM_KICK | Kick | byte place | Host only → `KickPlayerAction` (KickProtect buff blocks). |
| 5 | GAME_ROOM_REMOVEPLAYER | RemovePlayer | — | `ExitRoomAction`. |
| 6 | GAME_TEAM | GameChangeTeam | (byte, ignored) | Switch team (not Match). |
| 7 | GAME_START | GameStart | — | Host only. Every player needs a weapon; warrior accounts only in Freedom rooms; captcha if Match and avg level > 14; Dungeon/FightLab permission (`PvePermission`/`FightLabPermission` strings); map 13 consumes dungeon ticket (200619–200622, 201105 by hardness); pets lose hunger; → `StartGameAction`. |
| 9 | ROOMLIST_UPDATE | RoomListUpdate | int hall (1 PvP, 2 PvE), int, [int, int if (2, −2)] | `SendUpdateRoomList(rooms)` = 94 {9, int n, n×room}. |
| 10 | GAME_ROOM_UPDATE_PLACE | UpdatePlaces | byte pos, int place (−1 open, 0 closed), bool, int placeView | Host: open/close seat (seats 8–9 = viewers, Freedom only). Non-host in Freedom: move to/from viewer seat. |
| 11 | GAME_PICKUP_CANCEL | GamePickupCancel | — | Cancel matchmaking (`BattleServer.RemoveRoom` → fight server 65) or leave room if not searching. |
| 12 | GAME_PICKUP_STYLE | GamePickupStyle | int style (0 free, 1 guild) | Match room game type Free/Guild. → `SendRoomType`. |
| 15 | GAME_PLAYER_STATE_CHANGE | GamePlayerStateChange | byte state (0 not ready, 1 ready) | Needs weapon → `UpdatePlayerStateAction`. |

Related top-level codes:

| Code | ePackageType | Handler | Reads | Behaviour |
|---|---|---|---|---|
| 91 | GAME_CMD | GameDataHandler | byte sub, … (combat spec) | Sets `packet.Parameter1` = `TempGameId` (Match room = fight-server proxy) or `GamePlayerId`, then `CurrentRoom.ProcessData` → `BaseGame.ProcessData` (in-process PvE/Freedom) or `ProxyGame` (forwards to Fighting.Server as code 2). With no game and sub 98 → fake reply 91 {98, true, byte n ≤ 8, 0, 0, false}. |
| 82 | — | GameUserStartHandler | bool | PvE: host starts next mission (`StartGameMissionAction` → `Game.MissionStart`). |
| 86 | — | QuestOneKeyFinishHandler | — | Misnamed: host start shortcut (`RoomMgr.StartGame`). NRE when not in a room. |

## 11. Marriage & church — codes 233–252, 213, 249

| Code | ePackageType | Handler | Reads | Behaviour | Replies |
|---|---|---|---|---|---|
| 247 | MARRY_APPLY | MarryApplyHandler | int targetId, str proclamation, bool | Propose: not married, opposite sex, target unmarried; ring 11103 from PropBag or bought (shop AValue1 Money). `SavePlayerMarryNotice(ApplyType 1)`; center `UPDATE_PLAYER_MARRIED_STATE(target)` makes target reload notices. | `SendPlayerMarryApply`, msg |
| 250 | MARRY_APPLY_REPLY | MarryApplyReplyHandler | bool accept, int proposerId, int answerId | Reject → "good man card" 11105 mailed to proposer (type 14). Accept → `SavePlayerMarryNotice(ApplyType 2, result, answerId)` (proc marries both: SpouseID/SpouseName/IsMarried), `LoadMarryProp`, `DailyRecord` type 3. | `SendMarryApplyReply`, center 13 |
| 248 | DIVORCE_APPLY | DivorceApplyHandler | bool discount | Married, no chapel booked; `PRICE_DIVORCED` (or `_DISCOUNT`) via MoneyDirect **then RemoveMoney again (double charge)**; notice ApplyType 3. | `SendPlayerDivorceApply(true,true)` |
| 246 | MARRY_STATUS | MarryStatusHandler | int userId | | `SendPlayerMarryStatus(id, isMarried)` |
| 236 | MARRYINFO_ADD | MarryInfoAddHandler | bool publishEquip, str intro | Matchmaking board entry, 10000 gold. | `SendMarryInfoRefresh` |
| 235 | MARRYINFO_GET | MarryInfoGetHandler | int infoId | Only works if the requester has own entry (`MarryInfoID != 0`). | `SendMarryInfo` |
| 234 | MARRYPROP_GET | MarryInfoDeleteHandler | int infoId | Delete entry; replies with **auction** refresh packet (wrong). Not sent by client. | |
| 213 | (USE_LOG) | MarryInfoUpdateHandler (shadowed, dead) | bool, str | Would update board entry. | |
| 237 | MARRYINFO_UPDATE | MarryRoomInfoUpdateHandler | str name, bool changePwd, str pwd, str intro | **Format mismatch**: the client sends `MARRYINFO_UPDATE` = {bool, str} (board update, see client-sends), server parses chapel-room update → broken in original. Port: implement board update here and chapel update on 253 (client `sendModifyChurchDiscription`). | |
| 240 | MARRY_SCENE_LOGIN | UserEnterMarrySceneHandler | — | Enter church lobby scene; list chapels. | 240 {bool}, `SendMarryRoomInfo` × n |
| 241 | MARRY_ROOM_CREATE | MarryRoomCreateHandler | str name, str pwd, int mapIndex, int hours (2/3/4 → 700/900/1000 Money, else 1000 & 4 h), int maxCount, bool guestInvite, str intro | Married couple only, once. `MarryRoomMgr.CreateMarryRoom` (`SP_Insert_Marry_Room_Info`); `CountBussiness.InsertSystemPayCount`; DailyRecord type 4. | `SendMarryRoomInfo` to scene, `SendMarryRoomLogin(true)` |
| 242 | MARRY_ROOM_LOGIN | MarryRoomLoginHandler | int roomId (0 = own), str pwd, int marryMap | Forbidden list, `RoomState FREE`. Own room on another server → message with ServerID. | `SendMarryRoomLogin(bool)` |
| 244 | PLAYER_EXIT_MARRY_ROOM | UserLeaveMarryRoom | — | Leave chapel. | |
| 233 | MARRY_SCENE_CHANGE | MarrySceneChangeHandler | int map (1: 514,637; 2: 800,763) | Switch chapel map. | 244 to others, enter pkts |
| 251 | SCENE_STATE | MarryStateHandler | int state (0 re-sync chapel scene, 1 → waiting room) | | enter pkts |
| 249 | MARRY_CMD | MarryDataHandler → TankMarryLogicProcessor | **byte** `MarryCmdType`, … | see table below | |

Chapel commands (249, byte sub):

| Sub | Name | Reads | Behaviour |
|---|---|---|---|
| 1 | MOVE | int x, int y, (path…) | Position + echo to same map (FREE state). |
| 2 | HYMENEAL | int flag (1 = cancel) | Ceremony (groom & bride present): state Hymeneal for 170 s; first time each gets ring 9022 by mail (type 14) and `UpdatePlayerGotRingProp`; repeats cost `PRICE_PROPOSE` Money. Broadcast {…, int roomId, bool}. |
| 3 | CONTINUATION | int hours (2/3/4) | Extend booking, price `PRICE_MARRY_ROOM` split. |
| 4 | INVITE | int targetId | Couple or `GuestInvite`: target gets 249 {4, int inviterId, str nick, int roomId, str name, str pwd, int map}. |
| 5 | LARGESS | int amount | Gift Money: MoneyDirect, mails amount/2 to bride and groom. Grade ≥ `CustomLimit[3]`. |
| 6 | USEFIRECRACKERS | int, int templateId | Shop price gold (`APrice1 −2`) or Money (−1); echo effect. |
| 7 | KICK | int userId | Couple, FREE. |
| 8 | FORBID | int userId | Kick + ban from room. |
| 10 | POSITION | int x, int y | Silent position update. |
| 11 | GUNSALUTE | int, int templateId | Once per room; echo; center `MARRY_ROOM_INFO_TO_PLAYER` to couple. |
| 9/12 | HYMENEAL_STOP / MARRYROOMSENDGIFT | | Not implemented. |

## 12. Hot spring (spa) — 187–212, 12, 191

| Code | ePackageType | Handler | Reads | Behaviour | Replies |
|---|---|---|---|---|---|
| 187 | HOTSPRING_ENTER | HotSpringEnterHandler | — | Enter spa scene, list rooms (`HotSpringMgr`, `SP_Get_HotSpring_Room`). | `SendUpdateAllRoom` |
| 202 | HOTSPRING_ROOM_ENTER | HotSpringRoomEnterHandler | int roomId, str pwd (ignored) | 10000 gold entry fee. | `SendEnterHotSpringRoom` |
| 190 | HOTSPRING_ROOM_QUICK_ENTER | HotSpringRoomQuickEnterHandler | — | Random room, free. | `SendEnterHotSpringRoom` |
| 212 | HOTSPRING_ROOM_ENTER_CONFIRM | HotSpringEnterConfirmHandler | int roomId | Confirms room exists. | 212 {int roomId} |
| 201 | HOTSPRING_ROOM_ENTER_VIEW | HotSpringRoomEnterViewHandler | — | Player list of room. | 198 per player {int id, int grade, int hide, int repute, str nick, byte typeVIP, int vipLevel, bool sex, str style, str colors, str skin, int x, int y, int fightPower, int win, int total, int direction} |
| 169 | HOTSPRING_ROOM_PLAYER_REMOVE | HotSpringRoomPlayerRemoveHandler | — | Leave room. | 169 {str msg} |
| 12 | HOTSPRING_CMD_B | HotSpringRoomTimeAdded | byte 11 | Buy spa time: `SpaAddictionMoneyNeeded` Money → +`SpaPriRoomContinueTime` minutes. | 191 {byte 12} |
| 191 | HOTSPRING_CMD | HotSpringCmdDataHandler → TankHotSpringLogicProcessor | byte sub: **1 TARGET_POINT** str path, int playerId, int x, int y, int, int direction (moves *any* id the client names) → 191 {1, str, int, int, int} to others; **3 RENEWAL_FEE** int (stub) | | |
| 175 | HOTSPRING_ROOM_CREATE | — | | Client sends, no handler (private rooms unsupported). | |

## 13. Pets & farm — codes 68, 81

**68 PET** (`PetHandler`, grade ≥ 25) → `PetLogicProcessor` reads **byte** `PetPackageType`:

| Sub | Name | Handler | Reads | Behaviour |
|---|---|---|---|---|
| 1 | UPDATE_PET | UpdatePet | int userId | View pets (online or DB `GetUserPetSingles`, `GetAllEatPetsByID`) → `SendPetInfo` in chunks of 20. |
| 2 | ADD_PET | AddPet | int place, int bag | Hatch egg item: template = item Property5 → `PetMgr.CreatePet` → 68 {2, int tpl, true}; ≥ 5★ world notice. |
| 4 | FEED_PET | FeedPet | int itemPlace, int bag, int petPlace | Food P1 hunger / P2 exp, max hunger config; item 334100 restores "break" stats; level-ups via `PetMgr.GetLevel/GetGP`; consumes from StoreBag regardless of bag (bug). |
| 5 | REFRESH_PET | RefereshPet | bool pay | Refresh adopt list (free item `FreeRefereshID` or `AdoptRefereshCost` Money, +10 % petScore). → `SendRefreshPet`. |
| 6 | ADOPT_PET | AdoptPet | int index | Adopt from list into pet bag (`RemoveUserAdoptPet`). |
| 7 | EQUIP_PET_SKILL | EquipSkillPet | int place, int skillId, int slot | Slot 4 needs VIP 7. |
| 8 | RELEASE_PET | ReleasePet | int place | Release; mail item 12656 × `WashGetCount`. |
| 9 | RENAME_PET | RenamePet | int place, str name | `ChangeNameCost` Money. |
| 17 | FIGHT_PET | FightPet | int place, bool equip | Set battle pet. |
| 18 | REVER_PET | RevertPet | int place | `RecycleCost` Money: restore original (`BaseProp` JSON), give 334100 carrying GP/break stats, level 1. |
| 19 | (Farm BUY_PET_EXP_ITEM) | BuyPetExpItem | bool bound | Buy pet-exp item 334102 (price table by remaining count). → 68 {19, int remain}. |
| 20 | ADD_PET_EQUIP | AddPetEquip | int bag, int slot, int petPlace | Equip pet gear. |
| 21 | DEL_PET_EQUIP | DelPetEquip | int petPlace, int eqPlace | Unequip. |
| 22 | PET_RISINGSTAR | PetRisingStar | int tpl (11162), int count, int petPlace | Star up via `PetStarExp`. → 68 {22, bool}. |
| 23 | PET_EVOLUTION | PetEvolution | int tpl (11163), int count | Player-level pet evolution grade (`PetFightProperty`). → 68 {23, bool}. |
| 33 | EAT_PETS | EatPet | int armor (0 weapon/1 clothes/2 hat), int type (1 eat pets: int n, n×{int slot, int tpl}; 2 stones 201567: int count) | "Moe" gear levels (`PetMoeProperty`), must level evenly. NRE when no stone. → `SendEatPetsInfo`. |

**81 FARM** (`FarmHandler`) → `FarmLogicProcessor` reads **byte** `FarmPackageType` (grade ≥ 25):

| Sub | Name | Handler | Reads | Behaviour |
|---|---|---|---|---|
| 1 | ENTER_FARM | EnterFarm | int ownerId | Own farm (+ daily adopt-pet list) or friend's. |
| 2 | GROW_FIELD | GrowFields | byte, int seedTpl, int fieldId | Plant; consumes seed (FarmBag). |
| 4 | GAIN_FIELD | GainFields | int ownerId, int fieldId | Harvest own / steal friend's. |
| 6 | PAY_FIELD | PayField | int n, n×int fieldId, int months | Rent fields (week/month price). |
| 7 | KILLCROP_FIELD | KillCropField | int fieldId | Remove crop. |
| 8 | HELPER_PAY_FIELD | HelperPayField | int validity | Farm helper 100/300 Money (does not persist validity — bug). |
| 9 | HELPER_SWITCH_FIELD | HelperSwitchField | bool on, int seedId, int seedTime, int seedCount, int getCount, int payType (−1 Money, −2 giftToken), int price | **Price supplied by client.** |
| 16 | EXIT_FARM | ExitFarm | — | |
| 18 | FRAM_GROP_FASTFORWARD | FarmGropFastforward | bool useGiftToken, bool all, int fieldId | −30 min growth, `FastGrowNeedMoney × ripeNum`. |

## 14. World boss, little game, others

**102 WORLDBOSS_CMD** (`WorldBossHandler`) → `WorldBossLogicProcessor` reads **byte**:

| Sub | Name | Reads | Behaviour |
|---|---|---|---|
| 32 | ENTER_WORLDBOSSROOM | — | 102 {2 CANENTER, true, false, int 0, int 0}. |
| 34 | ADDPLAYERS | int x, int y | Join boss lobby room (`RoomMgr.WorldBossRoom`). |
| 33 | LEAVE_ROOM | — | Leave, clear one-match buffs. |
| 35 | MOVE | int x, int y, str path | 102 {6, int id, x, y, path} to all. |
| 36 | STAUTS | byte state | 102 {7, int id, byte, int x, int y} to all; state 3 leaves game. |
| 37 | REQUEST_REVIVE | int type (2 = refight), bool | `ReviveMoney`/`ReFightMoney` → 102 {11, int id}. |
| 38 | BUFF_BUY | — | Damage buff — **MoneyDirect + RemoveMoney (double charge)**. |

**166 LITTLEGAME_COMMAND** ("Hút Gà" bogu catching event) → reads **byte** `eLittleGamePackageInType`:

| Sub | Handler | Reads | Behaviour |
|---|---|---|---|
| 2 START_LOAD | EnterWorld | — | Grade ≥ 20, event open → join world. |
| 3 GAME_START | LoadCompleted | — | Send world objects. |
| 4 | LeaveWorld | — | |
| 32 MOVE | Move | int, int, int x, int y, int | Broadcast move. |
| 33 UPDATE_POS | PosSync | int, int | ignored |
| 64 ADD_OBJECT | ReportScore | int score, int boguKey | **Client-reported score → `AddScore`** (exchangeable in shop by Score). |
| 65 REMOVE_OBJECT | Click | int key, int x, int y, int px, int py | Start catching a bogu. |
| 66 INVOKE_OBJECT | CancelClick | int key | Stop catching. |

**404 RING_STATION** sub-handlers (`RingStation/Handle`: VIEWINFO 1, BUYCOUNTORTIME 2, ARMORY 3, NEWBATTLEFIELD 4,
CHALLENGE 5, FIGHTFLAG 6, SENDSIGNMSG 7, GETREWARD 8) exist but **no `[PacketHandler(404)]` is registered → unreachable**.
The arena bots (RingStation virtual players) are driven server-side (`RobotManager`, `RingStationMgr`, fight server code 88).

**Academy (master/apprentice) — 141** `AcademyHandler`, byte sub:

| Sub | Reads | Behaviour |
|---|---|---|
| 4 | int targetId, str msg | Ask target to be my master (`AcademyMgr.AddRequest` type 1) → target 141 {4, int id, str nick, str msg}. |
| 5 | int targetId, str msg | Ask target to be my apprentice (type 0) → 141 {5, …}. |
| 6 | int senderId | Accept "be my master" → `AddApprentice(me, sender)`, mail. |
| 7 | int senderId | Accept "be my apprentice" (master grade ≥ mine + `LEVEL_GAP`). |
| 8 / 9 | int senderId | Refuse (notice). |
| 12 | int masterId | Leave master: 10000 gold (taken before success), freeze `AcademyApprenticeFreezeHours`. |
| 13 | int apprenticeId | Expel apprentice: 20000 gold, freeze `AcademyMasterFreezeHours`. |
| (1 ACADEMY_REGISTER etc.) | | Client also sends register/list subs (1, …) that this handler ignores. |

Other: **403 BAGLOCK_PWD** `BaglockedHandle` byte cmd: only 5 CHECK_PHONE_BINDING → 403 {5, true}.
**25 BAG_LOCKED** `PassWordTwoHandle`: str pwd, str newPwd, int type, str q1, str a1, str q2, str a2 —
1 set, 2 unlock, 3 change (3 s throttle, attempts−1), 4 delete (by answers or pwd), 5 set questions;
`UpdatePasswordTwo`, `UpdatePasswordInfo`, `GetPasswordInfo` → 25 {int uid, int type, bool ok, bool addInfo,
str msg, int attemptsLeft, str q1, str q2}. (Bug: stores answer1 in `PasswordQuest2`; plaintext 2nd password.)

## 15. Dead / unreachable / dropped (port decisions)

* Registered but shadowed: `GetLinkGoodsHandler` (119), `MarryInfoUpdateHandler` (213), `PlayerGiftHandler` (218).
  Because `ItemCompareHandler` wins 119 and expects `int 2, int itemId` while the client sends
  `int type, str nick` (`sendGetLinkGoodsInfo`) chat-link previews do nothing. Port: implement 119 as
  GetLinkGoods with the client's format.
* No attribute: `AASInfoSetHandle`. Unreachable: RingStation 404 handlers, IChatCommand classes (no dispatcher).
* Client sends, server has no handler (silently dropped): 11 ACTIVE_PULLDOWN, 31 GOODS_EXCHANGE, 32 COLLECTINFO,
  40 SNS_MSG, 48 SELL_GOODS, 50 FIGHT_NPC, 89 QUESTION_REPLY, 104 CARD_LOTTERY, 105 LUCK_LOTTERY, 107 INVITE_FRIEND,
  110 ITEM_REFINERY (lianhua), 135, 167 CHURCH_MOVIE_OVER, 175 HOTSPRING_ROOM_CREATE, 205 USE_CHANGE_COLOR_SHELL,
  214 USER_RELOAD_GIFT, 223 FRIEND_BRITHDAY, 224 CID_CHECK, 239 GOTO_CARD_LOTTERY, 253 MARRY_ROOM_INFO_UPDATE,
  295, 308, 313, 391 (from `tools/out/format-check.md`; constant resolution is heuristic, verify before relying).
  Of these, **50 FIGHT_NPC** (single-player vs NPC), **48 SELL_GOODS** and **253** (chapel edit) are user-visible
  features worth implementing.
* Many handlers `NullReferenceException` on missing items/slots — the C# server just logs; the TS port must
  validate and reply with the same "failed" message instead of crashing the connection.

## Appendix — regenerating the tools output
```
cd docs/spec/server/tools
python extract_bussiness.py      # Bussiness methods -> procs/params/columns (out/bussiness-procs.*, procs-index.md)
python extract_bak_procs.py      # proc bodies/tables scraped from Database/*.bak (out/proc-tables.*)
python gen_03.py                 # regenerates ../03-bussiness-procs.md
python extract_handlers.py       # handlers + enums (out/handlers*.md/json, enums.json)
python extract_client_sends.py   # AS3 client PackageOut writes (out/client-sends.*)
python compare_formats.py        # client vs server format check (out/format-check.md)
python extract_packetlib.py      # server->client builders (out/packetlib.md)
python extract_managers.py       # managers -> procs (out/managers.md)
python extract_config.py         # config keys (out/config.md)
python scan_load_save.py         # player component persistence (out/player-persistence.md)
python compact_sources.py <dir> <src...>   # reading bundles (scratch use)
```
