# Port D — Social (marriage, hot spring, farm, friends, academy)

## Pass 2 (this session) — FARM poultry/gift-packs/compose-food + HOTSPRING private rooms

Owner's instruction: the three "out of scope" FARM subs and the four HOTSPRING stub
subs from pass 1 are not acceptable as gaps — they must become real, playable
features, even though (as confirmed below) **none of them has a single line of C#
server code to port from**. Investigated every claim first (see "Investigation"),
then implemented all of it as new, from-scratch logic, documented as such in each
file's module header (not presented as a port of something that was never there).

### Investigation (what's actually in the C# and the client)

- **"Poultry"**: `UserFarmInfo.PoultryState` exists as a DB-shaped field
  (`GameUtils/PlayerFarmInventory.cs:304`, always set to 0, never read anywhere else)
  but grepping the entire `Source Flash/src` tree (case-insensitive) for "poultry"
  returns **zero matches** — no AS3 class, no UI, no packet ever touches it. It is
  not a feature the 4.1 client exposes at all, unlike 167 CHURCH_MOVIE_OVER (which
  the client at least calls); there is nothing to build here, and nothing to fake.
  Left untouched; noted in `farm.ts`'s header for the next person who goes looking.
- **FARM sub-registration**: `Game.Server/Farm/Handle/FarmHandleMgr.cs` registers
  handlers by reflection-scanning for `[FarmHandleAttbute(code)]`. The actual
  registered set is 1/2/4/6/7/8/9/16/18 (`EnterFarm/GrowFields/GainFields/PayField/
  KillCropField/HelperPayField/HelperSwitchField/ExitFarm/FarmGropFastforward`).
  3 (ACCELERATE_FIELD), 5 (COMPOSE_FOOD) and 20 (FARM_GIFTPACKS) are **not**
  registered — `FarmLogicProcessor.OnGameData` falls through to its
  "LoadCommandHandler not found" log for all three. The 4.1 client still sends them
  (`GameSocketOut.doMature/sendCompose/giftPacks`, called from `FarmFieldBlock`'s
  drag-drop, `FarmComposePnl`, `FarmPlayer`'s gift icon) — real, reachable UI with no
  server-side counterpart ever written, in either `vendor/DDTank41` or `vendor/DDT-6600`.
- **19 BUY_PET_EXP_ITEM**: declared in `FarmPackageType.as` but
  `GameSocketOut.sendBuyPetExpItem` actually wraps it in `ePackageType.PET`, not
  `ePackageType.FARM` — it is a PET packet, not a FARM one, despite living in that
  enum. Not touched here; flagged for whoever owns `handlers/pets.ts` (block F).
- **HOTSPRING private rooms**: `Game.Server/HotSpringRooms/TankHandle/` has exactly
  two concrete handlers: `TargetPointCmd` (1, already ported in pass 1) and
  `RenewalFeeCmd` (3 — reads the int and does nothing, `return false`). There is no
  handler class at all for EDIT(6)/ADMIN_REMOVE_PLAYER(9)/PLAYER_CONTINUE(10), and no
  `PacketHandler` for the top-level 175 HOTSPRING_ROOM_CREATE packet either. The 4.1
  client fully wires all five (`GameSocketOut.sendHotSpringRoomCreate/Edit/
  RenewalFee/AdminRemovePlayer/PlayerContinue`, `HotSpringRoomListController`,
  `HotSpringRoomController`, `RoomMenuView`). `vendor/DDT-6600` has the identical
  client wire and, again, no server source for any of it.

### What was built (new features, documented as such, not cited to C# file:line)

- **`farm.ts`** — three new subs inside the existing `81 FARM` switch:
  - `ACCELERATE_FIELD (3)` "doMature": drag a MANURE item (CategoryID 33,
    `Property1` = minutes) onto a seeded, unripe field — consumes 1 fertilizer,
    adds `Property1` minutes to `AccelerateTime`. Replies in the batch shape
    `FarmModelController.__onDoMature` actually reads (`int count`, then per entry
    `bool ok [+ fieldId, gainCount, accelerateTime]`), always with count 0 or 1.
  - `COMPOSE_FOOD (5)` "sendCompose": craft `count` of a pet-food template
    (CategoryID 34) from a small `COMPOSE_RECIPES` table inlined in `farm.ts`,
    copied verbatim from the real `apps/api/assets/request/foodcomposelist.xml`
    (12 rows: 3 foods × 4 vegetables × 10 each — decompress with
    `zlib.inflateSync` to read the asset directly).
    `SqlDataProvider.Data.FoodComposeListInfo` is the C# POCO this list was meant
    to hydrate, but nothing in the server ever read it from anywhere, so there is
    no DB table to port — a migration for 12 constant, non-admin-editable rows
    would be pure overhead, so they're a literal in the file instead. No reply is
    read by the client (`handFarmPkg`'s switch has no COMPOSE_FOOD case) — same
    "chat message + give-or-mail" communication GAIN_FIELD already uses for a full
    bag.
  - `FARM_GIFTPACKS (20)` "giftPacks": click the gift icon over the farm's owner
    (self or a visited friend) for a once-per-day small money gift. No reply read
    by the client either. Tracked in the **visitor's own**
    `Sys_User_Farm.FriendCrop` column — a real column the C# ported but never
    wrote to anywhere (confirmed: zero hits for "FriendCrop" outside the schema in
    the whole vendor tree) — as `"<ownerId>:<yyyy-mm-dd>,..."`, trimmed to today's
    entries on every write so it never grows unbounded.
- **`hotspring.ts`** — `175 HOTSPRING_ROOM_CREATE` and 191 subs
  `RENEWAL_FEE(3)/EDIT(6)/ADMIN_REMOVE_PLAYER(9)/PLAYER_CONTINUE(10)` are now a
  real private-room feature, not stubs:
  - 175: rents a private room (not already owning one, not already in a room) for
    `HotSpringRoomCreateGold` gold (default 20000), `HotSpringRoomInitialMinutes`
    minutes (default 60). Stored as an ordinary `game."HotSpringRoom"` row with
    `roomType=1` (the 13 seeded public rooms are always `roomType=2`) and
    `playerID` = the owner, so it rides the exact same room-list/broadcast path as
    public rooms. `roomID` is allocated from an in-process counter seeded past the
    max existing roomID (starts at 1000) — simplest collision-free scheme without
    adding a DB sequence to an existing ported table.
  - The room's own `effectiveTime` now ticks down once a minute via its own timer
    (`SpaRoom.timer`, independent of each player's personal `MinHotSpring`),
    whether occupied or not — it's a rented slot. Resumed on server restart in
    `load()` (closed immediately if it had already expired in the DB). At 0,
    everyone inside is kicked, the row is deleted, 174 HOTSPRING_ROOM_REMOVE is
    broadcast to the room-list scene.
  - 191/3 RENEWAL_FEE: owner-only, pays `HotSpringRoomRenewalGold` gold (3000) for
    `HotSpringRoomRenewalMinutes` more minutes (30).
  - 191/6 EDIT: owner-only, renames/re-passwords/re-describes.
  - 191/9 ADMIN_REMOVE_PLAYER: owner-only, kicks one named player (reuses the
    existing `remove()` → 199 packet, same as voluntarily leaving).
  - 191/10 PLAYER_CONTINUE: the client never reads a server-sent one
    (`HotSpringRoomController.setEvent` has no listener for it) — `true` is an ack
    ("still here"), `false` leaves (same as 169).
  - Fix bundled with the feature: **202 HOTSPRING_ROOM_ENTER no longer charges the
    room's own owner the normal 10000-gold entry fee** — they already paid to rent
    the room; a guest still pays it in full.

### Verification

- `npx tsc --noEmit -p apps/game` — clean.
- New file `test/farm-compose-hotspring-rooms.test.ts` (6 tests, all green):
  ACCELERATE_FIELD consumes the fertilizer and adds its `Property1` minutes;
  COMPOSE_FOOD consumes all 4 ingredients and grants the food (plus a
  no-partial-consumption-on-shortage case); FARM_GIFTPACKS pays once/day per
  owner visited, blocked on a same-day repeat; the full private-room flow
  (create → owner enters free / guest pays 10000 → RENEWAL_FEE extends →
  EDIT renames (and a non-owner can't) → ADMIN_REMOVE_PLAYER kicks →
  PLAYER_CONTINUE(false) leaves) end to end with two real `FakeClient`s; a second
  private room for the same owner is refused.
- Full `apps/game` vitest suite re-run after the new file — all green (no
  regressions in the pass-1 hotspring/farm/marriage/academy/social tests).
- No DB migration needed: both new features reuse existing, already-ported
  columns (`HotSpringRoom.roomType/playerID`, `Sys_User_Farm.FriendCrop`) instead
  of adding schema.

### Notes for the next agent

- `19 BUY_PET_EXP_ITEM` is miscategorized in `FarmPackageType.as` (it's actually a
  `PET` packet, see Investigation above) — not farm's job, flag for block F
  (`handlers/pets.ts`).
- The private-room reward/cost numbers (`HotSpringRoomCreateGold`,
  `HotSpringRoomInitialMinutes`, `HotSpringRoomRenewalGold`,
  `HotSpringRoomRenewalMinutes`) and `FarmGiftPacksMoney` are new `Server_Config`
  keys with code-level fallbacks (`cfgInt(key, fallback)`) — no row exists for them
  in the seeded `Server_Config` table; add rows there (or via the admin panel) if
  the owner wants to tune them without a redeploy.

## Pass 1 — original port

Status at start of this pass: the block was already ported in a prior session (all 5
owned files existed, fully implemented, with PT-BR JSDoc + "Como lê esse código"
headers and C# `vendor/...:line` citations). Verified against `vendor/DDTank41`,
cross-checked `167 CHURCH_MOVIE_OVER` against `vendor/DDT-6600` too, fixed the one
remaining gap, then re-verified everything.

## Per code

- **MARRY_CMD (249) all subs** — DONE. `marryCmdRouter()` in `marriage.ts` covers
  MOVE(1)/POSITION(10)/HYMENEAL(2)/CONTINUATION(3)/INVITE(4)/LARGESS(5)/
  USEFIRECRACKERS(6)/KICK(7)/FORBID(8)/GUNSALUTE(11). Registered `partial` (a few
  AS3 reader shapes for 249 sub-replies are best-effort per the file's header —
  money/state/DB correctness is covered by tests, exact client rendering of those
  few isn't).
- **MARRY_ROOM_CREATE (241)** — DONE (`partial`). Ports `MarryRoomCreateHandler.cs`;
  writes `Marry_Room_Info`, creates the in-memory `ChapelRoom`.
- **MARRY_SCENE_CHANGE (233)** — DONE (`partial`). Ports `MarrySceneChangeHandler.cs`.
- **MARRY_ROOM_INFO_UPDATE (253)** — DONE (`partial`). Ports `MarryRoomInfoUpdateHandler.cs`;
  module header documents and fixes the original's 237/253 code collision (board
  edit vs chapel-room edit were both wired to 237 in the C#; this port splits them).
- **CHURCH_MOVIE_OVER (167)** — was MISSING (confirmed via
  `node tools/qa/packet-coverage.mjs`, and via grep: no AS3 call site anywhere under
  `Source Flash/src` or `DDT-6600/.../src`, and the C# side only declares the enum
  in `Packets/ePackageType.cs:66` — no handler class, nothing registers it). This
  is dead wire in **both** the original client and server. FIXED: added a safe
  no-op stub in `marriage.ts` (`r.player(167, "CHURCH_MOVIE_OVER", ...)`, reads
  int + UTF string, logs and returns) so `packet-coverage.mjs` no longer flags it
  MISSING. No real behavior exists to match — documented in the module header.
- **HOTSPRING_ROOM_CREATE (175) + stub subs** — was `stub` in this pass; **turned
  into a real private-room feature in Pass 2 above** (175 create,
  RENEWAL_FEE/EDIT/ADMIN_REMOVE_PLAYER/PLAYER_CONTINUE). Real flows
  (187/190/201/202/212/169/12/191 incl. TARGET_POINT) were already implemented
  here, with documented fixes vs the original (server-authoritative movement,
  gold charged before join, 60 free-min/day reset in `Sys_Users_Extra`).
- **FARM (81) all subs** — DONE (`partial`, default branch just logs unknown subs).
  `farm.ts` covers ENTER_FARM(1)/EXIT_FARM(16)/GROW_FIELD(2)/FASTFORWARD(18)/
  GAIN_FIELD(4, incl. friend-farm steal)/KILLCROP(7)/PAY_FIELD(6)/HELPER_PAY_FIELD(8)/
  HELPER_SWITCH_FIELD(9). Gift packs (20) and compose-food (5) were out of scope
  in this pass; **both implemented in Pass 2 above**, along with ACCELERATE_FIELD
  (3). "Poultry" turned out not to be a real client feature at all — see Pass 2's
  Investigation. Fix vs the original documented: farm-helper price exploit
  (client-supplied price ignored, recomputed server-side from
  `seedTime × FarmHelperPricePerMin`).
- **SNS_MSG_RECEIVE (40)** — DONE. Fire-and-forget per original (no C# logic ever
  existed; SNS post itself is HTTP, not socket).
- **INVITE_FRIEND (107) all subs** — DONE. `inviteRouter()` in `social.ts`:
  OPENVIEW(2)/FRIENDREWARD(1)/GETREWARD(4)/FBCLICK(6), plus the login-burst packet
  (`inviteLoginPacket`, sub 5) used by the session/login flow (mentioned in
  `docs/AI-HANDHOFF.md` history as already fixed/tested — burst-safe, never kicks
  login on error).
- **FRIEND_BIRTHDAY (223, wire name `FRIEND_BRITHDAY` — matches the client's own
  typo)** — DONE. Uploads today/tomorrow birthdays, replies with a type-60 mail.
- **ACADEMY_REGISTER (141/1) / ACADEMY_REMOVE (141/3)** — DONE as stubs (matches
  task note): the original `AcademyHandler.cs` also ignores register/remove-register
  (the club list is built from every eligible player, not a registry), so a no-op
  is byte-for-byte correct here, not a placeholder. All other ACADEMY subs
  (FOR_APPRENTICE/FOR_MASTER/MASTER_CONFIRM/APPRENTICE_CONFIRM/MASTER_REFUSE/
  APPRENTICE_REFUSE/FIRE_MASTER/FIRE_APPRENTICE) are fully implemented with a
  documented fix (FIRE_MASTER no longer takes the 10000 gold before checking the
  relation, unlike the original).

## Shared files touched

- `apps/game/src/handlers/marriage.ts` — added the 167 stub only (append, no
  reordering of existing code).
- `apps/game/src/handlers/index.ts` — unchanged (already wires `registerMarriage`
  and all other block-D registrars).
- `apps/game/src/packets/out.ts` — not touched (no new shared packet builder
  needed; 167's reply is "none").
- `apps/game/src/db/templates.ts`, `apps/game/src/db/social-extra.ts` — not needed,
  no new DB access was required for the one fix in this pass.

## Verification

- `node tools/qa/packet-coverage.mjs`: 167 CHURCH_MOVIE_OVER moved out of the
  MISSING list (21 → 20 missing; the other 20 missing codes belong to other
  blocks — ACTIVE_PULLDOWN/FIGHT_NPC/QUESTION_REPLY/ITEM_REFINERY/
  USER_RELOAD_GIFT/CID_CHECK/GOODS_EXCHANGE/COLLECTINFO/CARD_LOTTERY/LUCK_LOTTERY
  + 2 unresolved client names — not block D).
- `npx tsc --noEmit -p apps/game` — clean.
- `npx vitest run` (full `apps/game` suite) — 25 test files, 162 tests, all green.
- Targeted run of `test/academy.test.ts`, `test/hotspring.test.ts`,
  `test/marriage-farm-auction.test.ts`, `test/social-invite.test.ts` — 18/18 green.

## Open items / notes for the next agent

- No DB migration was needed this pass (167 is a stub, no new columns).
- The AS3 reader shapes for a handful of 249 MARRY_CMD sub-replies and for
  253/237/236/235 are still "best-effort" per the existing module header — no
  AS3 reader for those exact server→client replies was located. Money/state/DB
  behavior is covered by tests; visual rendering in the chapel UI for those is
  unverified. Flag for whoever gets Playwright time on the chapel scene.
