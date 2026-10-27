-- Task pve-qa, follow-up to 0030_pve_gulu_king_chamber.sql: same class of gap as 0028
-- (pve-cartas) -- game."Drop_Condiction" CondictionType=5 (Copy) rows for Gulu Kingdom / "Bugo Castle"
-- Normal/Hard/Terror don't list the mission ids 0030 just restored, so PVEGame.TakeCard
-- (DropInventory.CopyDrop -> DropMgr.FindCondiction) resolves no item for those missions' end-of-stage
-- cards, same as the Easy/Baron case 0028 fixed. Confirmed each sibling row currently stops one short of
-- its difficulty's longest reachable mission id, exactly like 0028's Easy case:
--   DropID 50007 (Normal) Para1 ',1171,1172,1173,'      -> missing 1176
--   DropID 50008 (Hard)   Para1 ',1271,1272,1273,1274,' -> missing 1276, 1277 (1274 stays; harmless, not in
--                                                           the chain either, pre-existing, out of scope)
--   DropID 50009 (Terror) Para1 ',1371,1372,1373,1374,1375,' -> missing 1376, 1378 (1377 excluded on
--                                                           purpose: no SetupMissions chain ever reaches it)
-- Drop_Item pools unchanged, same as 0028 -- only each condition's mission-id list grows.
-- Idempotent: only rewrites a row if Para1 still has the exact known-broken value.
-- Also updates the seed file (packages/db/seed/game/Drop_Condiction.json.gz).

UPDATE "game"."Drop_Condiction"
SET "Para1" = ',1171,1172,1173,1176,'
WHERE "DropID" = 50007 AND "CondictionType" = 5 AND "Para1" = ',1171,1172,1173,';
--> statement-breakpoint
UPDATE "game"."Drop_Condiction"
SET "Para1" = ',1271,1272,1273,1274,1276,1277,'
WHERE "DropID" = 50008 AND "CondictionType" = 5 AND "Para1" = ',1271,1272,1273,1274,';
--> statement-breakpoint
UPDATE "game"."Drop_Condiction"
SET "Para1" = ',1371,1372,1373,1374,1375,1376,1378,'
WHERE "DropID" = 50009 AND "CondictionType" = 5 AND "Para1" = ',1371,1372,1373,1374,1375,';
