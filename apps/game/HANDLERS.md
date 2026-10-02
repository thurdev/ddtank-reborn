# apps/game — packet handler status

Spec: `docs/spec/server/01-packet-handlers.md` (codes, reads, behaviour) and `02-systems.md`. Registry:
`src/handlers/index.ts` (`HandlerRegistry`, `SubRouter`). New handlers: add a `register*` function, cite the C# file
you mirror, add a test in `test/` using `loggedIn()` / `FakeClient` from `test/helpers.ts`, update this table.

Status: **implemented** = behaviour of the C# handler ported (bugs noted); **partial** = main path works, listed parts
missing; **stub** = registered no-op (same as the original or not yet ported); **missing** = not registered (packet
dropped, like an unknown code in the original).

Run: `pnpm --filter game dev` (tsx watch, reads `apps/game/.env`, see `.env.example`). Tests: `pnpm --filter game test`.

## Implemented / partial

| Code | Name | Status | Notes |
|---|---|---|---|
| 1 | LOGIN | implemented | RSA + setKey synchronous; ticket = `@ddt/auth validateGameLogin` (app."LoginSessions"); kicks: LoginError / OverTime / Register / Forbid / ServerError; single session ("Game.Server.LoginNext"): the new login waits until the old connection drained its packet queue and saved (shared `quitPlayer` promise) before loading, so no stale-DB dupe; apps/web shows a "disconnected" screen via the client's `game_interruption` ExternalInterface call. 178 quests always sent. Burst order of GamePlayer.cs:2960-3406 (cards, pets, farm, marry, titles, events packets missing). |
| 4 | PING | implemented | ping timer every PING_INTERVAL_MIN. |
| 5 | SYS_DATE | implemented | |
| 8 | CLIENT_LOG | implemented | logged (debug). |
| 16 / 21 | SCENE_LOGIN / SCENE_REMOVE_USER | implemented | waiting room, 18/21 scene add/remove, room list. |
| 19 | SCENE_CHAT | partial | lobby (`CHAT_COOLDOWN_SEC`, default 3 s; original 30 s), room/team, guild (ch 3). Chapel (9) / hot spring (13) dropped; Match game chat goes to room. |
| 20 | SCENE_FACE | implemented | |
| 37 | CHAT_PERSONAL | implemented | local players only (single process; cross-server center removed). |
| 44 | BUY_GOODS | partial | Fixed: 38 UPDATE_PRIVATE_INFO lacked petScore (client reads it when IsOpenPetScore), so balances never refreshed in the client. exact price types (GetItemPrice), required items, Beat, all bound, dress-on-buy, overflow mail (type 8). Guild shops 11-15 refused (Consortia_Equip_Control not ported); ShopID 20 daily limit per player only (no global stock 168). |
| 47 | UNCHAIN_EQUIP | implemented | |
| 49 | CHANGE_PLACE_GOODS | partial | same-bag move/equip/split/stack, cross-bag move/swap, anti-dupe disconnect. Store-bag captcha + temp_place restore and guild-bank capacity not ported. |
| 69 | SCENE_USERS_LIST | implemented | |
| 70 | GAME_INVITE | implemented | |
| 71 / 72 | S_BUGLE / B_BUGLE | implemented | item consumed, 2 s cooldown; fixed: no free big bugle without an item. |
| 73 | C_BUGLE | implemented | CBugleHandler: world bugle 11100, every online player (single process). |
| 74 | ITEM_EQUIP | implemented | online or DB; gem souls list empty; VIP/hidden-account checks dropped. |
| 91 | GAME_CMD | implemented (PvP + PvE) | `src/fight/ddt.ts` = @ddt/fight adapter: parses subs 2/7/9/12/15/16/17/32/40/54/84/96/143, serializes every engine event; rewards (GP + level-up, offer/money/gift, Win/Total) applied at GAME_OVER; VirtualPlayer seats played by `BotRunner`. Subs 98/130 TAKE_CARD after GAME_OVER (PVPGame.TakeCard: card drop `Drop_Condiction` type 1, auto pick on index 100 / at Stop) — without it the card board froze at "00". Sub 98 fake reply without game. `FIGHT_ENGINE=stub` restores the stub. **PvE** (`DdtFightEngine.startPve` → `@ddt/fight` `PveGame`): subs 116 MissionPrepare, 98/130 TakeCard, 133 PassDrama, 119 TryAgain (gives up, like the donor), 23 MissionEvent, 25/99 dropped; S→C 113 mission info, 103 load + NPC files, 64 add living, 48 add physical, 55-61 NPC move/fall/jump/beat/say/movie/range, 62 focus, 66, 53, 73, 80, 104, 112 mission over (AddGP, quest cond. 21), 115 all missions over, 98 card, 89 show cards (dungeon). |
| 94 | GAME_ROOM | partial | subs 0 create, 1 login (password, full, quick-join), 2 setup (no PvE price/labyrinth), 3 kick, 5 leave, 6 team, 7 start (Freedom -> fight; Match -> auto-match queue, alone for `BOT_FALLBACK_SEC` (25) -> bots from app."Bots" via `DbBotProvider`; PvE (Dungeon/Freshman/FightLab/Boss/...) -> `RoomMgr.launchPve` → `startPve`, ResetRoom on dungeon end); setup change: freshman/quest packet (enterUserGuide) has no isOpenBoss bool, 9 list, 10 place open/close (host), 11 pickup cancel, 12 pickup style, 15 ready. World-boss/dungeon specifics, captcha, viewer seat switching missing. |
| — | Attributes / FightPower | implemented | `src/game/stats.ts` (`computeStats`, tests `test/formulas.test.ts`): PlayerEquipInventory.UpdatePlayerProperties + GamePlayer.GetBaseAttack/Defence/UpdateFightPower — items, compose, strengthen (Property7·1.1^lvl), attribute gems, potential, gold plating, training (ExerciseInfo), cards (Sys_Users_Card + CardUpdateInfo), equipped pet (+Pet_Fight_Property), suits, totem, second weapon. Computed before the login burst; sent in 67/login/ranking (FightPower column saved). |
| 86 | (host start shortcut) | implemented | |
| 127 | REClAIM_GOODS | implemented | removes whole stack (original), rejects count <= 0. |
| 112 / 113 / 114 / 116 / 118 | DELETE / GET_MAIL_ATTACHMENT / UPDATE / SEND / CANCEL mail | implemented | `src/handlers/mail.ts`. List = HTTP LoadUserMail.ashx (apps/api); 117 MAIL_RESPONSE triggers the reload. Annexes and gold/money are claimed with conditional UPDATEs (repeated packet = nothing); items that do not fit stay in the mail; sent items are detached (UserID 0) and saved before the mail row. COD paid by mail to the sender. |
| 176 / 177 / 179 / 181 | QUEST_ADD / REMOVE / FINISH / CHECK | partial | `src/game/quests.ts` (QuestInventory/BaseQuest/BaseCondition). The client asks for every acceptable quest (176) once it got the login 178. Conditions with triggers: 1 grade, 2 equipped, 4/22 kills, 5/23/31 games, 6/24 wins, 10 shop, 14/15 own/hand in item, 16 direct, 20 client, 30/34 4+ players, 39 new gear. 21 GameMissionOver (PvE win in ≤ Para2 turns — first main quest 318) implemented. Others (pets, farm, marriage, strengthen 9...) never progress until their modules exist. Rewards: Quest_Goods (selectable), gold/money/gift/offer/GP; buff and riches rewards not ported. |
| 160 | IM_CMD | implemented | 160 add, 161 remove, 165 state, 51 one-on-one; 208/45 stub. |
| 172 | SAVE_DB | implemented | throttled 30 s. |
| 225 | ENTHRALL_SWITCH | implemented | echo. |
| 300 | speed heartbeat | implemented | < 5 min − 15 s -> 20 min ban; no heartbeat 90 min -> 1 h ban (autosave watchdog). Thresholds configurable. |
| 59 | ITEM_STRENGTHEN | partial | `src/handlers/forge.ts`. Rate = Σ RateItems[stone.Level−1]·100/GetNeedRate (Item_Strengthen Rock/Rock1/2/3 by category) + luck + VIP 30 %, floor(·100) > rand(10000); weapon re-templating (Item_Strengthen_Goods), OpenHole, fail: Level-3 templates −1 level from +5, others destroyed, god stone protects. **Deviation**: consumes 1 unit per used stone slot (C# ClearBag destroyed whole stacks). Guild smith bonus not ported (consortia). Quest cond. 9. |
| 58 | ITEM_COMPOSE | partial | rate {80,50,30,10,5}% by stone quality (+luck%, +1 % without), PRICE_COMPOSE_GOLD (Server_Config, default 1600); port requires a compose stone (cat 11 P1 1). Guild smith not ported. Quest cond. 19. |
| 78 / 76 | ITEM_FUSION / preview | implemented | FusionMgr (Item_Fusion key = sorted FusionTypes), 400 gold, result to Store[0], previous Store[0] back to bag/mail, cat 7/17 → 7 days bound. Quest cond. 11. |
| 121 | ITEM_INLAY | implemented | InlayGoldPrice (2000), hole type = gem Property2; holes 5/6 return the old gem; port: the hole must be open. |
| 125 | ITEM_EMBED_BACKOUT | implemented | 500 Money, gem back bound to PropBag (or mail), then ClearStoreBag. |
| 122 | CLEAR_STORE_BAG | implemented | GamePlayer.ClearStoreBag (rest by mail type 9). |
| 63 | ITEM_OPENUP | implemented | `src/handlers/use.ts`. ItemBoxMgr.CreateItemBox (Shop_Goods_Box: all IsSelect + 1 weighted random), currencies −100 gold, −200 money, −300 medal, −800 honor, −900 hardCurrency, −1100 giftToken, 11107 exp; box consumed before granting (no dupe); reply 63 list. |
| 183 | CARD_USE | partial | buff cards (BufferList.CreateBuffer, same type extends), GP pill (P1 21), quick-buy with money; VIP card (P1 23) not ported. GP multiplier buff (type 13) applied in `GamePlayer.addGP`. Buffs saved to User_Buff. |
| 124 | CHANGE_PLACE_GOODS_ALL | implemented | ArrangeBagHandler: compact + optional merge, only when count matches. |
| 60 | ITEM_HIDE | implemented | Hide digit (1 shown / 2 hidden), 13→3, 15→4. |
| 42 | DELETE_GOODS | stub | disabled in the original. |
| 24, 30, 35, 64, 161, 206, 213, 245, 279 | obsolete no-ops | stub | no-ops in the original too. |

Fight boundary: `src/fight/types.ts` (`FightEngine.startPvp` / `FightGame`). Default engine: `DdtFightEngine` (`src/fight/ddt.ts`, tests `test/fight.test.ts`: 1v1 PvP and 1v1 vs bot played to GAME_OVER); `StubFightEngine` with `FIGHT_ENGINE=stub`; or pass `fight` to `new GameServer(cfg, { fight })`. Bots: `src/bots/bot.ts` (`VirtualPlayer` takes a
room seat); `src/bots/provider.ts` (`DbBotProvider`, app."Bots", built-in fallback list) fills a lone auto-match room after
`BOT_FALLBACK_SEC` (0 = off). Newbie guide: apps/api `USER_GUIDE_ENABLE=false` writes `USER_GUILD_ENABLE=false` into
config.xml — the 4.1 guide locked hall buildings behind weakless steps and needed trainer assets this pack lacks (stuck arrow,
room list "locked").

## Missing (to be filled by other agents)

| Area | Codes | Spec |
|---|---|---|
| Captcha / bag password | 200 CHECK_CODE, 25 BAG_LOCKED, 403 BAGLOCK_PWD | 01 §1, §14 |
| Items misc | 77 overdue, 62 continue, 122 clear store, 79 store, 108 take temp, 232 caddy sell, 182 color, 252 change sex, 171/188 rename, 66 prop use, 165 luckstone, 119 item link (C# reply format does not match the client) | 01 §3 |
| Shop / boxes / lottery | 168 goods count, 54/55/75 fight props, 126, 46, 26/27/28 lottery, 204, 45, 215, 87 chicken box, 128/130 roulette, 92 VIP, 96 honor, 136 totem | 01 §4 |
| Enhancement | 138, 61, 217, 120, 106, 133, 95, 209, 99, 222, 402 | 01 §5, 02 §4 |
| Auction | 192, 193, 194 | 01 §7 |
| Achievements / daily / events | 230, 13, 90, 103, 219, 53, 338, 258, 259, 84, 145, 131, 162, 132, 15 (+ quest conditions above) | 01 §8 |
| Guild / GvG | 129 (all subs), 129/22 tasks | 01 §9, 02 §8 |
| PvE extras | 82, Labyrinth floors/gates, world boss, try-again payment, boss-box | 02 §11, combat spec |
| Marriage / church | 233–252, 213, 249 | 01 §11 |
| Hot spring | 187–212, 12, 191 | 01 §12 |
| Pets / farm | 68, 81 | 01 §13 |
| World boss / little game / academy / ring station | 102, 166, 141, 404 | 01 §14 |
| Social misc | 18 player card, 85, 203, 218, 221, 57, 189, 34, 265, 36, 71/72 cross-server, 73 C_BUGLE, 123 defy | 01 §2 |
| Player stats | titles/rank, avatar collection, gem souls (Sys_User_Gemstone), pet equipment/moe in FightPower (rest ported in `src/game/stats.ts`) | 02 §3 |
