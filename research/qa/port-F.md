# Port F — Guilda/Leilão/Pets/Conta

Status at start of this pass: the block was already ported in a prior session
(`consortia.ts` 729 lines, `auction.ts`, `pets.ts`, `mail.ts`, `basic.ts`, `chat.ts`
all existed with PT-BR JSDoc + "Como lê esse código" headers and
`vendor/DDTank41:file:line` citations; `pets.ts`/`chat.ts` had zero diff vs `HEAD`,
meaning they were already committed in this state). `node tools/qa/packet-coverage.mjs`
confirmed every top-level code owned by this block (129, 68, 216, 192-194, 112-118,
most of basic.ts/chat.ts) is `implemented`; the only `stub` entries left in these six
files (214 USER_RELOAD_GIFT, 224 CID_CHECK) are documented dead code in the original
— verified below, not touched further.

## Verified as correctly "stub" (confirmed dead in `vendor/DDTank41`, not fixed)

- **129/23 DONATE** and **129/25 POLL_CANDIDATE** (`consortia.ts`) — `Donate.cs`
  really only `Console.WriteLine`s; `ConsortiaLogicProcessor.OnGameData` only
  dispatches a sub if `ConsortiaHandleMgr.LoadCommandHandler` finds a
  `[ConsortiaHandleAttbute]`-tagged class, and no class carries `POLL_CANDIDATE`.
- **68/16 PAY_SKILL, 68/24 PET_FORMINFO, 68/25 PET_FOLLOW, 68/32 PET_WAKE**
  (`pets.ts`) — grepped `vendor/DDTank41/Game.Server/Pet/Handle/*.cs`: no
  `[PetHandleAttbute]` class for any of the four. Already documented in the file's
  `default:` branch and `registerPets`'s comment.
- **214 USER_RELOAD_GIFT** (`mail.ts`) and **224 CID_CHECK** (`basic.ts`) — neither
  `ePackageType` value has a `[PacketHandler(...)]`-tagged class anywhere under
  `Game.Server/Packets/Client/*.cs`. For 224 specifically: `AASInfoSetHandle.cs`
  exists (the China real-name/anti-addiction "AAS" flow — province table + ID
  checksum) but its class declaration carries **no** `[PacketHandler]` attribute,
  so the original dispatcher never calls it; `SendAASState`/`SendAASInfoSet` (both
  code 224 replies) are only ever called from inside that dead handler. Confirmed
  genuinely unreachable, not something to port.
- **251 SCENE_STATE** — registered in `marriage.ts` (block D's file, not mine);
  left untouched per file ownership.
- **188 USE_CONSORTIA_REWORK_NAME / 205 USE_CHANGE_COLOR_SHELL** — live in
  `items.ts` (Loja/Prop block), not mine.

## Fixed this pass

1. **`cloneForAuction` (auction.ts)** — `ItemInfo.CloneFromTemplate`
   (`vendor/DDTank41/SqlDataProvider/Data/ItemInfo.cs:812-860`) copies `IsJudge`,
   `IsUsed`, `goldBeginTime`, `latentEnergyEndTime`, `latentEnergyCurStr`,
   `latentEnergyNewStr` too — the port's clone silently fell back to `ItemInfo`'s
   own defaults for these (`IsJudge=true`, `IsUsed=false`), which happens to be
   harmless for a freshly-judged, never-equipped item but is wrong for gold-equip
   gear mid countdown or an item not yet "judged". `Hole5/6 Level+Exp` were
   already copied by the previous session — added the rest. New test
   (`marriage-farm-auction.test.ts`, "add clones IsJudge/IsUsed/Hole5-6
   Level+Exp...") lists an item with `IsJudge=false`/`IsUsed=true`/non-zero
   Hole5/6 Level+Exp and decodes the 195 `AUCTION_REFRESH` reply byte-for-byte to
   confirm the clone carries the source values, not the class defaults.
2. **129/23 DONATE wire read (consortia.ts)** — `Donate.cs:17-18` reads `itemType`
   *then* `amount` (two ints) before falling into its no-op `default:`; the port
   only read one int. Harmless across packet boundaries (each inbound packet is
   independently length-framed here), but still a real byte-count mismatch
   against the original handler — fixed to read and log both. New assertion in
   `consortia.test.ts` ("create, apply, accept, promote, donate, kick") sends the
   2-int DONATE packet mid-flow and confirms it's a true no-op (no reply, no
   state change) rather than crashing or silently dropping a field.

## Verification

- `npx tsc --noEmit -p apps/game` — clean.
- `apps/game` vitest: `consortia.test.ts` (11 passed), `mail.test.ts`,
  `marriage-farm-auction.test.ts` (8 passed incl. the new clone test),
  `pets-advanced.test.ts`, `pets-cards-vip.test.ts`, `chat-bots.test.ts` — all
  green. Full `apps/game` suite run was still in progress at hand-off; no
  failures seen through `consortia`/`auction`/`pets`/`mail`/`chat` so far.
- `node tools/qa/packet-coverage.mjs` — unchanged totals for this block (no new
  MISSING/stub); still reports 214 and 224 as `stub` by design (see above).

## Files touched

- `apps/game/src/handlers/auction.ts` (`cloneForAuction`)
- `apps/game/src/handlers/consortia.ts` (sub 23 DONATE read)
- `apps/game/test/marriage-farm-auction.test.ts` (new auction-clone test)
- `apps/game/test/consortia.test.ts` (new DONATE no-op assertion)
