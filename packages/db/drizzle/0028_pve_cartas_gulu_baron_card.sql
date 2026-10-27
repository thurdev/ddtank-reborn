-- Task pve-cartas (owner playtest, 2026-10-27: "Baron's reward card animates correctly but has NO ITEM on
-- it", Gulu Kingdom / Bugo Castle, Pve_Info ID 1, Easy, mission 1073 -- the Baron fight whose Mission_Info
-- row pve-cadeia's 0027_pve_cadeia_gulu_baron.sql just restored). Root cause traced 1:1 against the donor:
-- PVEGame.TakeCard (Game.Logic/PVEGame.cs:2180-2251) resolves a card's item via
-- DropInventory.CopyDrop(missionId, 1) (Game.Logic/DropInventory.cs:113-126) ->
-- DropMgr.FindCondiction(eDropType.Copy, missionId, "1") (Bussiness/Managers/DropMgr.cs:22-34, eDropType.Copy
-- = 5, Bussiness/Protocol/eDropType.cs:9) -- a game."Drop_Condiction" row with CondictionType = 5 whose
-- comma-wrapped Para1 contains the mission id. packages/fight/src/pve/game.ts takeCard() and
-- apps/game/src/db/templates.ts pveDrop()/findDropCondition() port this exactly -- this is NOT a code bug.
--
-- It's a data gap, same class as pve-cadeia: game."Drop_Condiction" DropID 50006 ("Cung Dien Ga De" / Gulu
-- Kingdom Easy's card pool) has Para1 = ",1071,1072," -- lists mission 1071 (Ga De S1, not even part of this
-- dungeon's SetupMissions("1072,1073") chain) and 1072 (Ga De S2), but never 1073 (Ga De S3, the Baron) --
-- confirmed missing even in the raw donor DB export (vendor/_dbexport/Project_Game34/data/Drop_Condiction.json,
-- same 112 rows), not an import bug. Every sibling difficulty's single Drop_Condiction row lists ALL of that
-- difficulty's missions together: Normal's DropID 50007 Para1 = ",1171,1172,1173,", Hard's 50008 =
-- ",1271,1272,1273,1274,", Terror's 50009 = ",1371,1372,1373,1374,1375," -- only Easy's 50006 is short its
-- last mission. Fixed by extending Para1 to ",1071,1072,1073," (same Drop_Item pool, DropID 50006, already
-- has 33 weighted entries -- no Drop_Item change needed, only the condition's mission-id list).
--
-- Idempotent: only rewrites the row if Para1 still has the known-broken value (first run); a second run (or
-- a DB where an admin already hand-edited this row) is a no-op either way.
-- Also fixes the seed file (packages/db/seed/game/Drop_Condiction.json.gz) so fresh `db:seed` runs ship the
-- corrected Para1 too; this migration is what repairs an already-running database without a full reseed.

UPDATE "game"."Drop_Condiction"
SET "Para1" = ',1071,1072,1073,'
WHERE "DropID" = 50006 AND "CondictionType" = 5 AND "Para1" = ',1071,1072,';
