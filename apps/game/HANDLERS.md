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
| 44 | BUY_GOODS | partial | exact price types (GetItemPrice), required items, Beat, all bound, dress-on-buy, overflow mail (type 8). Guild shops 11-15 refused (Consortia_Equip_Control not ported); ShopID 20 daily limit per player only (no global stock 168). |
| 47 | UNCHAIN_EQUIP | implemented | |
| 49 | CHANGE_PLACE_GOODS | partial | same-bag move/equip/split/stack, cross-bag move/swap, anti-dupe disconnect. Store-bag captcha + temp_place restore and guild-bank capacity not ported. |
| 69 | SCENE_USERS_LIST | implemented | |
| 70 | GAME_INVITE | implemented | |
| 71 / 72 | S_BUGLE / B_BUGLE | implemented | item consumed, 2 s cooldown; fixed: no free big bugle without an item. |
| 73 | C_BUGLE | implemented | CBugleHandler: world bugle 11100, every online player (single process). |
| 74 | ITEM_EQUIP | implemented | online or DB; gem souls list empty; VIP/hidden-account checks dropped. |
| 91 | GAME_CMD | implemented (PvP) | `src/fight/ddt.ts` = @ddt/fight adapter: parses subs 2/7/9/12/15/16/17/32/40/54/84/96/143, serializes every engine event; rewards (GP + level-up, offer/money/gift, Win/Total) applied at GAME_OVER; VirtualPlayer seats played by `BotRunner`. Subs 98/130 TAKE_CARD after GAME_OVER (PVPGame.TakeCard: card drop `Drop_Condiction` type 1, auto pick on index 100 / at Stop) — without it the card board froze at "00". Sub 98 fake reply without game. `FIGHT_ENGINE=stub` restores the stub. |
| 94 | GAME_ROOM | partial | subs 0 create, 1 login (password, full, quick-join), 2 setup (no PvE price/labyrinth), 3 kick, 5 leave, 6 team, 7 start (Freedom -> fight; Match -> auto-match queue, alone for `BOT_FALLBACK_SEC` (25) -> bots from app."Bots" via `DbBotProvider`; PvE -> "noBattleServe"), 9 list, 10 place open/close (host), 11 pickup cancel, 12 pickup style, 15 ready. World-boss/dungeon specifics, captcha, viewer seat switching missing. |
| 86 | (host start shortcut) | implemented | |
| 127 | REClAIM_GOODS | implemented | removes whole stack (original), rejects count <= 0. |
| 112 / 113 / 114 / 116 / 118 | DELETE / GET_MAIL_ATTACHMENT / UPDATE / SEND / CANCEL mail | implemented | `src/handlers/mail.ts`. List = HTTP LoadUserMail.ashx (apps/api); 117 MAIL_RESPONSE triggers the reload. Annexes and gold/money are claimed with conditional UPDATEs (repeated packet = nothing); items that do not fit stay in the mail; sent items are detached (UserID 0) and saved before the mail row. COD paid by mail to the sender. |
| 176 / 177 / 179 / 181 | QUEST_ADD / REMOVE / FINISH / CHECK | partial | `src/game/quests.ts` (QuestInventory/BaseQuest/BaseCondition). The client asks for every acceptable quest (176) once it got the login 178. Conditions with triggers: 1 grade, 2 equipped, 4/22 kills, 5/23/31 games, 6/24 wins, 10 shop, 14/15 own/hand in item, 16 direct, 20 client, 30/34 4+ players, 39 new gear. Others (21 PvE mission — the first main quest 318 —, pets, farm, marriage, strengthen 9...) never progress until their modules exist. Rewards: Quest_Goods (selectable), gold/money/gift/offer/GP; buff and riches rewards not ported. |
| 160 | IM_CMD | implemented | 160 add, 161 remove, 165 state, 51 one-on-one; 208/45 stub. |
| 172 | SAVE_DB | implemented | throttled 30 s. |
| 225 | ENTHRALL_SWITCH | implemented | echo. |
| 300 | speed heartbeat | implemented | < 5 min − 15 s -> 20 min ban; no heartbeat 90 min -> 1 h ban (autosave watchdog). Thresholds configurable. |
| 24, 30, 35, 42, 64, 161, 206, 213, 245, 279 | obsolete no-ops | stub | no-ops in the original too. |

Fight boundary: `src/fight/types.ts` (`FightEngine.startPvp` / `FightGame`). Default engine: `DdtFightEngine` (`src/fight/ddt.ts`, tests `test/fight.test.ts`: 1v1 PvP and 1v1 vs bot played to GAME_OVER); `StubFightEngine` with `FIGHT_ENGINE=stub`; or pass `fight` to `new GameServer(cfg, { fight })`. Bots: `src/bots/bot.ts` (`VirtualPlayer` takes a
room seat); `src/bots/provider.ts` (`DbBotProvider`, app."Bots", built-in fallback list) fills a lone auto-match room after
`BOT_FALLBACK_SEC` (0 = off). Newbie guide: apps/api `USER_GUIDE_ENABLE=false` writes `USER_GUILD_ENABLE=false` into
config.xml — the 4.1 guide locked hall buildings behind weakless steps and needed trainer assets this pack lacks (stuck arrow,
room list "locked").

## Missing (to be filled by other agents)

| Area | Codes | Spec |
|---|---|---|
| Captcha / bag password | 200 CHECK_CODE, 25 BAG_LOCKED, 403 BAGLOCK_PWD | 01 §1, §14 |
| Items misc | 124 arrange, 60 hide, 77 overdue, 62 continue, 122 clear store, 79 store, 108 take temp, 232 caddy sell, 182 color, 252 change sex, 171/188 rename, 66 prop use, 183 card use, 165 luckstone | 01 §3 |
| Shop / boxes / lottery | 168 goods count, 54/55/75 fight props, 126, 46, 63 open box, 26/27/28 lottery, 204, 45, 215, 87 chicken box, 128/130 roulette, 92 VIP, 96 honor, 136 totem | 01 §4 |
| Enhancement | 59, 138, 58, 78, 61, 121, 125, 217, 120, 106, 133, 95, 209, 99, 222, 402 | 01 §5, 02 §4 |
| Auction | 192, 193, 194 | 01 §7 |
| Achievements / daily / events | 230, 13, 90, 103, 219, 53, 338, 258, 259, 84, 145, 131, 162, 132, 15 (+ quest conditions above) | 01 §8 |
| Guild / GvG | 129 (all subs), 129/22 tasks | 01 §9, 02 §8 |
| PvE start, missions | 94/2 PvE parts, 82, PvE game in `FightEngine` | 02 §11, combat spec |
| Marriage / church | 233–252, 213, 249 | 01 §11 |
| Hot spring | 187–212, 12, 191 | 01 §12 |
| Pets / farm | 68, 81 | 01 §13 |
| World boss / little game / academy / ring station | 102, 166, 141, 404 | 01 §14 |
| Social misc | 18 player card, 85, 203, 218, 221, 57, 189, 34, 265, 36, 71/72 cross-server, 73 C_BUGLE, 123 defy | 01 §2 |
| Player stats | full UpdatePlayerProperties (gems, cards, pets, suits, totem, titles, texp), FightPower formula | 02 §3 |
