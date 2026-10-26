-- Task pve-cadeia (owner report 2026-10-26: "finished Bugo Castle on EASY, it ended right away, never went
-- to the Baron round, didn't unlock NORMAL"). Root cause: game."Pve_Info" ID 1 ("Lau dai Ga" / Gulu
-- Kingdom, the owner's "Castelo do Bugou") -- SimpleGameScript GuluKingdomSimpleGame calls
-- Game.SetupMissions("1072,1073") (packages/fight/src/pve/scripts/generated/Game/GuluKingdomSimpleGame.ts,
-- ported from vendor/DDTank4.1 Source Server/Game.Server.Scripts/AI/Game/GuluKingdomSimpleGame.cs) but
-- game."Mission_Info" never had a row for Id=1073 -- confirmed missing even in the raw donor DB export
-- (vendor/_dbexport/Project_Game34/data/Mission_Info.json, same 170 rows as our seed), not something our
-- import broke. The mission SCRIPT (GD1073, GameServerScript.AI.Messions.GD1073) and its NPCs (1003
-- "Baroff", 1009 "Ve si Ga") and map (1073.ddtm) all already exist and are fully playable -- only the
-- Mission_Info row was missing, so PVEGame.SetupMissions (PVEGame.cs:1964-1978) / our SetupMissions
-- (packages/fight/src/pve/game.ts) never added session key 2, HasNextSession() (PVEGame.cs:1213-1224 /
-- game.ts hasNextSession()) returned false right after mission 1, and the dungeon ended without ever
-- reaching the Baron (Baroff) fight. Values below mirror the sibling mission rows for the same boss in the
-- other 3 difficulties of the same dungeon (Id 1172/1272/1372, all "Success": "Derrote Baroff.") and the
-- GD1072 row immediately before it (same TotalTurn/Delay/IncrementDelay/TakeCard/TryAgain convention,
-- Name "Ga De S2" -> "Ga De S3" following the "S<last 2 digits of Id>" naming the other difficulties use).
-- Also fixes the seed file (packages/db/seed/game/Mission_Info.json.gz) so fresh `db:seed` runs ship this
-- row too; this migration is what repairs an already-running database without a full reseed.

INSERT INTO "game"."Mission_Info" ("Id","Name","TotalCount","TotalTurn","Script","Success","Failure","Description","IncrementDelay","Delay","Title","Param1","Param2","TakeCard","TryAgain","TryAgainCost")
SELECT 1073, 'Gà Dễ S3', 1, 200, 'GameServerScript.AI.Messions.GD1073', 'Derrote Baroff. ', 'Derrotado pelo oponente<br>Fim dos turnos', 'Phe địch bị hạ', 2400, 800, 'TURN,Phe địch bị hạ.', -1, -1, 1, true, 100
WHERE NOT EXISTS (SELECT 1 FROM "game"."Mission_Info" WHERE "Id" = 1073);
