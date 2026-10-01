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
| 1 | LOGIN | implemented | RSA + setKey synchronous; ticket = `@ddt/auth validateGameLogin` (app."LoginSessions"); kicks: LoginError / OverTime / Register / Forbid / ServerError; single session ("Game.Server.LoginNext"). Burst order of GamePlayer.cs:2960-3406 (cards, pets, farm, marry, titles, events packets missing). |
| 4 | PING | implemented | ping timer every PING_INTERVAL_MIN. |
| 5 | SYS_DATE | implemented | |
| 8 | CLIENT_LOG | implemented | logged (debug). |
| 16 / 21 | SCENE_LOGIN / SCENE_REMOVE_USER | implemented | waiting room, 18/21 scene add/remove, room list. |
| 19 | SCENE_CHAT | partial | lobby (30 s cooldown), room/team, guild (ch 3). Chapel (9) / hot spring (13) dropped; Match game chat goes to room. |
| 20 | SCENE_FACE | implemented | |
| 37 | CHAT_PERSONAL | implemented | local players only (single process; cross-server center removed). |
| 44 | BUY_GOODS | partial | exact price types (GetItemPrice), required items, Beat, all bound, dress-on-buy, overflow mail (type 8). Guild shops 11-15 refused (Consortia_Equip_Control not ported); ShopID 20 daily limit per player only (no global stock 168). |
| 47 | UNCHAIN_EQUIP | implemented | |
| 49 | CHANGE_PLACE_GOODS | partial | same-bag move/equip/split/stack, cross-bag move/swap, anti-dupe disconnect. Store-bag captcha + temp_place restore and guild-bank capacity not ported. |
| 69 | SCENE_USERS_LIST | implemented | |
| 70 | GAME_INVITE | implemented | |
| 71 / 72 | S_BUGLE / B_BUGLE | implemented | item consumed, 2 s cooldown; fixed: no free big bugle without an item. |
| 74 | ITEM_EQUIP | implemented | online or DB; gem souls list empty; VIP/hidden-account checks dropped. |
| 91 | GAME_CMD | implemented (PvP) | `src/fight/ddt.ts` = @ddt/fight adapter: parses subs 2/7/9/12/15/16/17/32/40/54/84/96/143, serializes every engine event; rewards (GP/offer/money/gift, Win/Total) applied at GAME_OVER; VirtualPlayer seats played by `BotRunner`. Sub 98 fake reply without game. `FIGHT_ENGINE=stub` restores the stub. |
| 94 | GAME_ROOM | partial | subs 0 create, 1 login (password, full, quick-join), 2 setup (no PvE price/labyrinth), 3 kick, 5 leave, 6 team, 7 start (Freedom -> fight; Match -> auto-match queue; PvE -> "noBattleServe"), 9 list, 10 place open/close (host), 11 pickup cancel, 12 pickup style, 15 ready. World-boss/dungeon specifics, captcha, viewer seat switching missing. |
| 86 | (host start shortcut) | implemented | |
| 127 | REClAIM_GOODS | implemented | removes whole stack (original), rejects count <= 0. |
| 160 | IM_CMD | implemented | 160 add, 161 remove, 165 state, 51 one-on-one; 208/45 stub. |
| 172 | SAVE_DB | implemented | throttled 30 s. |
| 225 | ENTHRALL_SWITCH | implemented | echo. |
| 300 | speed heartbeat | implemented | < 5 min − 15 s -> 20 min ban; no heartbeat 90 min -> 1 h ban (autosave watchdog). Thresholds configurable. |
| 24, 30, 35, 42, 64, 161, 206, 213, 245, 279 | obsolete no-ops | stub | no-ops in the original too. |

Fight boundary: `src/fight/types.ts` (`FightEngine.startPvp` / `FightGame`). Default engine: `DdtFightEngine` (`src/fight/ddt.ts`, tests `test/fight.test.ts`: 1v1 PvP and 1v1 vs bot played to GAME_OVER); `StubFightEngine` with `FIGHT_ENGINE=stub`; or pass `fight` to `new GameServer(cfg, { fight })`. Bots: `src/bots/bot.ts` (`VirtualPlayer` takes a
room seat; `BotProvider` fills auto-match after 30 s when provided).

## Missing (to be filled by other agents)

| Area | Codes | Spec |
|---|---|---|
| Captcha / bag password | 200 CHECK_CODE, 25 BAG_LOCKED, 403 BAGLOCK_PWD | 01 §1, §14 |
| Items misc | 124 arrange, 60 hide, 77 overdue, 62 continue, 122 clear store, 79 store, 108 take temp, 232 caddy sell, 182 color, 252 change sex, 171/188 rename, 66 prop use, 183 card use, 165 luckstone | 01 §3 |
| Shop / boxes / lottery | 168 goods count, 54/55/75 fight props, 126, 46, 63 open box, 26/27/28 lottery, 204, 45, 215, 87 chicken box, 128/130 roulette, 92 VIP, 96 honor, 136 totem | 01 §4 |
| Enhancement | 59, 138, 58, 78, 61, 121, 125, 217, 120, 106, 133, 95, 209, 99, 222, 402 | 01 §5, 02 §4 |
| Mail | 116, 113, 112, 114, 118 | 01 §6 |
| Auction | 192, 193, 194 | 01 §7 |
| Quests / achievements / daily / events | 176, 177, 179, 181, 230, 13, 90, 103, 219, 53, 338, 258, 259, 84, 145, 131, 162, 132, 15 | 01 §8 |
| Guild / GvG | 129 (all subs), 129/22 tasks | 01 §9, 02 §8 |
| PvE start, missions | 94/2 PvE parts, 82, PvE game in `FightEngine` | 02 §11, combat spec |
| Marriage / church | 233–252, 213, 249 | 01 §11 |
| Hot spring | 187–212, 12, 191 | 01 §12 |
| Pets / farm | 68, 81 | 01 §13 |
| World boss / little game / academy / ring station | 102, 166, 141, 404 | 01 §14 |
| Social misc | 18 player card, 85, 203, 218, 221, 57, 189, 34, 265, 36, 71/72 cross-server, 73 C_BUGLE, 123 defy | 01 §2 |
| Player stats | full UpdatePlayerProperties (gems, cards, pets, suits, totem, titles, texp), FightPower formula | 02 §3 |
