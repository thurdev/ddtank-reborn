# Port E — PvE/Salas/Missões

Status at start of this pass: `handlers/pve-misc.ts` already existed and was fully
implemented+registered (USER_ANSWER 15, GOODS_EXCHANGE 31, FIGHT_NPC 50 stub,
COLLECTINFO 32 stub, QUESTION_REPLY 89 stub — all with PT-BR JSDoc + C# citations).
`packages/fight/src/pve/effects.ts` existed (poison/energy-loss/effect query-remove).
`node tools/qa/packet-coverage.mjs` showed 0 missing/stub codes left for this block's
packet list. All work this pass went into the PRIORITY item: the mission-AI
coverage gap another AI found by simulating all 170 missions.

## PRIORITY: mission/NPC script coverage

`packages/fight/scripts/pve-smoke.ts` runs every real `Mission_Info` row (real DB
seed, `packages/db/seed/game/Mission_Info.json.gz`) against the actual PvE engine
for up to 20 simulated minutes and records which missions hit `game.missingScripts`
(mission or NPC-brain class not registered → falls back to `GenericMission` /
`GenericNpcBrain`). Before this pass: `withMissing: 72` (see the previous run's
`generated/smoke.json`, now overwritten).

Investigation (not assumption): for all 72 `missing` refs, grepped every `.cs` file
in `vendor/DDTank41`, `vendor/DDTank4.1` (donor, the actual source of
`scripts/generated/**`), and `vendor/DDT-6600` (reference-only per AGENTS.md) by
both filename and `class <Name>` content. Result:

- **4 missions + 5 NPC brains DO have source** — in `vendor/DDT-6600` only (later
  version, same decompiled-dll style as the existing `worldboss.ts` AC1243 port).
  Ported them the same way `worldboss.ts` already does for AC1243/WorldAcientDragon:
  new file `packages/fight/src/pve/scripts/manual/ancient-castle.ts`, registered
  from `manual/index.ts`.
  - Mission 12016 "Tàu Hải Tặc": `Messions/CrosairBoss.cs` + boss brain `NPC/CrosairBoss.cs`.
  - Mission 30001 "Bá tước hút máu" (wave): `Messions/AC30001.cs` + trash brain
    `NPC/WorldSimpleBat.cs` + boss brain `NPC/WorldBatKing.cs`. Ported the donor bug
    as-is: `CanGameOver()` always `return false` at the end — this mission has no
    scripted win condition in the source, same as several already-generated
    donor missions that never signal game-over either.
  - Mission 30002 "Bá tước hắc ám" (2-phase boss): `Messions/AC30002.cs` + phase-1
    brain `NPC/WorldBatKing.cs` (shared with 30001) + phase-2 brain
    `NPC/WorldBatKingSecond.cs`.
  - Mission 30004 "Đội trưởng": `Messions/AC30004.cs` + boss brain
    `NPC/WorldSoccerCaptain.cs`.
  - Two documented, intentional drops (same spirit as `worldboss.ts`'s
    `UpdatePveResult` note): `Game.IsKillWorldBoss` (not tracked anywhere in the
    port) and `Player.ChangeSpecialBall` (single-mission cosmetic ball-skin flag,
    nothing else in the port plumbs it).
- **1 NPC brain is a data/code name drift, not missing** — NPC_Info 6321/6322 (bosses
  of missions 6101/6201/6301 = DTGT1165/DTGK1165/DTGAH1165) have
  `Script = "GameServerScript.AI.NPC.SixTerrorSecondNpc"`, but the donor only ever
  shipped `NPC/SixTerrorSecondBoss.cs` ("Npc" vs "Boss" suffix). Aliased the
  existing generated `SixTerrorSecondBoss` class under the `...SecondNpc` full name
  in `ancient-castle.ts` instead of re-deriving an identical class.
- **The remaining 65 unique mission refs have NO source anywhere** — confirmed by
  the same exhaustive grep (class name AND filename) across all three vendor
  trees, zero hits. These are real, named, localized Mission_Info rows (e.g.
  "Vịnh Cariga ải 1/2", "Gà Anh Hùng S1-S5", "Vòng Xoáy Thời Gian…") — not stale
  test data — but the C# class their own `Script` column points to was never
  shipped in any source we have access to (donor dump, base fork, or the later
  DDT-6600 reference). This is a **data/content gap, not a porting gap**: there is
  no C# to port. Documented as `KNOWN_SOURCELESS` in the new coverage test below;
  future work here is either decompiling a DLL that has them (none found in this
  repo) or writing bespoke gameplay as a feature, not a port.

After the fix: `withMissing: 65` (down from 72), `withErrors: 0`, all four manual
missions run clean (no crashes, no fallback) in both the full 20-min smoke run and a
targeted re-run of missions 6101/6201/6301/12016/30001/30002/30004.

New test: `packages/fight/test/pve-mission-coverage.test.ts` — fails if any
`Mission_Info.Script` doesn't resolve via `scriptInfo()` *and* isn't in the
documented `KNOWN_SOURCELESS` allowlist (catches future regressions / new gaps);
also fails if an allowlisted name ever *does* resolve (keeps the allowlist honest —
forces removal when someone ports one, e.g. by decompiling a DLL later), plus a
direct regression guard for the 4 ancient-castle missions + the brain alias.

## Everything else in the task's packet list — already done, verified not touched

- **FIGHT_NPC 50 / USER_ANSWER 15 / QUESTION_REPLY 89 / GOODS_EXCHANGE 31 /
  COLLECTINFO 32** — all in `handlers/pve-misc.ts` already, registered in
  `handlers/index.ts`. Nothing missing per `packet-coverage.mjs`.
- **LABYRINTH (131) subs** — all 7 (1 DOUBLE_REWARD, 2 REQUEST_UPDATE, 3 CLEAN_OUT,
  4 SPEEDED_UP_CLEAN_OUT, 5 STOP_CLEAN_OUT, 6 RESET_LABYRINTH, 9 TRY_AGAIN) are
  fully implemented with real DB persistence in `handlers/activities.ts` — **not my
  file** (Block C "Eventos" owns it per `port-plan.md`). Verified read-only, did
  not touch.
- **ELITEGAME (162) subs** — all 4 (1 status, 2 start, 3 rank, 4 champions) fully
  implemented in `handlers/events.ts` — also Block C's file, not mine. Verified
  read-only, did not touch.
- **GAME_CMD stubs (6)** — `docs/qa-matrix.json` already documents exactly 6
  `GAME_CMD` subs marked `server: "stub"`: BLAST=3, CHANGEBALL=19, KILLSELF=21,
  BEAT=22, WANNA_LEADER=97, MOVESTOP=10. All 6 are implemented as faithful no-ops
  in `apps/game/src/fight/ddt.ts` (lines ~267/291/296-300), each with a comment
  citing the exact research finding: 3/19/21/22 have **no** `Game.Logic.Cmd.*`
  class in `vendor/DDTank41` that `CommandMgr`'s reflection scan would ever load
  (confirmed dead in the original server, not just unported), and 10/97 **are**
  registered in the original but with an empty `HandleCommand` body (confirmed
  no-op by reading the file). Not a gap — a faithfully-ported dead feature.
  `docs/qa-matrix.json` is append/read-only for other agents per `port-plan.md`,
  not edited.

## Files touched

- `packages/fight/src/pve/scripts/manual/ancient-castle.ts` (new) — CrosairBoss
  (mission + brain), WorldSimpleBat, WorldBatKing, WorldBatKingSecond,
  WorldSoccerCaptain, AC30001, AC30002, AC30004, SixTerrorSecondNpc alias.
- `packages/fight/src/pve/scripts/manual/index.ts` — import + `MANUAL_SCRIPTS` entries.
- `packages/fight/test/pve-mission-coverage.test.ts` (new).
- `packages/fight/src/pve/scripts/generated/smoke.json` — regenerated (clean rerun).

## Verification

- `pnpm --filter @ddt/fight typecheck` — clean.
- `pnpm --filter @ddt/fight test` — 9 files / 195 tests green (incl. the 3 new ones).
- `pnpm --filter @ddt/game typecheck` — clean.
- `pnpm --filter @ddt/game test` — 31 files / 216 tests green.
- `pnpm --filter @ddt/fight pve-smoke` (full 20-min default) — `withErrors: 0`,
  `withMissing: 65` (all documented `KNOWN_SOURCELESS`).
