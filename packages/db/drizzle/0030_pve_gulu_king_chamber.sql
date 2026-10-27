-- Task pve-qa (owner report 2026-10-27, item 1): "Bugo Castle (Pve_Info 1, Gulu Kingdom) on NORMAL:
-- start -> black screen -> returned straight to stage 2; play again -> only black screen." Same root
-- cause class as 0027/0028 (owner report 2026-10-26/27): a *GameScript calls Game.SetupMissions(...) with
-- a mission id that has no game."Mission_Info" row, so SetupMissions (packages/fight/src/pve/game.ts) never
-- registers that session key, hasNextSession() goes false right after the last mission that DOES resolve,
-- and the dungeon ends mid-chain. docs/guides/pve.md SS1.1 already found and documented this exact gap for
-- Normal/Hard/Terror (left pending because, unlike 0027's mission, these use a different script-name family
-- and nobody had traced what boss each one actually fights). Traced now against the donor scripts + NPC_Info
-- (confirmed missing from vendor/_dbexport/Project_Game34/data/Mission_Info.json too, not an import bug):
--
--   Normal  GuluKingdomNormalGame.ts  SetupMissions("1172,1173,1176")           -> missing 1176
--   Hard    GuluKingdomHardGame.ts    SetupMissions("1272,1273,1276,1277")      -> missing 1276, 1277
--   Terror  GuluKingdomTerrorGame.ts  SetupMissions("1372,1373,1375,1376,1378") -> missing 1376, 1378
--
-- (1377 is never referenced by any SetupMissions call -- Terror's chain jumps 1375 -> 1376 directly -- but
-- its script CTM1377.ts exists like the others, so it's restored here too for data completeness; it has no
-- Drop_Condiction entry in 0031 because no chain can ever reach it to award a card for it.)
--
-- Boss identity per mission, from the generated scripts' CreateBoss npc ids cross-referenced with
-- game."NPC_Info" (packages/fight/src/pve/scripts/generated/Messions/{CNM1176,CHM1276,CHM1277,CTM1376,
-- CTM1377,CTM1378}.ts):
--   1176/1276/1376 (CNM1176/CHM1276/CTM1376): firstBossID/secondBossID two-phase "Gà" king fight on map 1076
--     (same boss family/map as mission *73's "Rei Galinha" -- NPC_Info Name is literally "Gà" for all of
--     1105/1106/1205/1206/1305/1306, so Success reuses the exact wording already established for that same
--     generic "Gà" boss identity in mission *73/*74: "Derrote o Rei Galinha.").
--   1277/1377 (CHM1277/CTM1377): bossID 1207/1307, NPC_Info Name "Matthias " -- reuses the exact wording
--     already established for that NPC name in mission 1274's Success: "Elimine Matthias."
--   1378 (CTM1378): bossID 1308, NPC_Info Name "Bóng ma Matthias " ("Matthias's Ghost") -- reuses the exact
--     wording already established for that NPC name in mission 1375's Success: "Elimine o Fantasma de
--     Matthias."
-- No prose is invented: every Success string already exists verbatim on a sibling row naming the same boss.
--
-- TotalTurn/Delay/IncrementDelay/Failure/Title/Description/Param1/Param2/TakeCard copied from the sibling
-- rows of the same difficulty (1172/1173 for Normal, 1272-1274 for Hard, 1372-1375 for Terror) -- identical
-- across every row of a difficulty already. TryAgainCost follows the one pattern that fits every existing
-- row exactly: Normal/Hard = 100*(last digit of Id - 1), Terror = 100*(last digit of Id); S1 rows (TryAgain
-- always false) are the trivial 0 case for both formulas.
--
-- Idempotent (same INSERT .. WHERE NOT EXISTS pattern as 0027). Also updates the seed file
-- (packages/db/seed/game/Mission_Info.json.gz) so a fresh db:seed ships these rows too; this migration is
-- what repairs an already-running database without a full reseed.

INSERT INTO "game"."Mission_Info" ("Id","Name","TotalCount","TotalTurn","Script","Success","Failure","Description","IncrementDelay","Delay","Title","Param1","Param2","TakeCard","TryAgain","TryAgainCost")
SELECT * FROM (VALUES
  (1176, 'Gà Thường S6',    1, 200, 'GameServerScript.AI.Messions.CNM1176', 'Derrote o Rei Galinha. ', 'Derrotado pelo oponente<br>Limite de turnos excedido', 'Phe địch bị hạ', 2400, 800, 'TURN,Phe địch bị hạ',  -1, -1, 1, true, 500),
  (1276, 'Gà Khó S6',       1, 200, 'GameServerScript.AI.Messions.CHM1276', 'Derrote o Rei Galinha. ', 'Derrotado pelo oponente<br>Fim dos turnos',            'Phe địch bị hạ', 2400, 800, 'TURN,Phe địch bị hạ.', -1, -1, 1, true, 500),
  (1277, 'Gà Khó S7',       1, 200, 'GameServerScript.AI.Messions.CHM1277', 'Elimine Matthias.',       'Derrotado pelo oponente<br>Fim dos turnos',            'Phe địch bị hạ', 2400, 800, 'TURN,Phe địch bị hạ.', -1, -1, 1, true, 600),
  (1376, 'Gà Anh Hùng S6',  1, 200, 'GameServerScript.AI.Messions.CTM1376', 'Derrote o Rei Galinha. ', 'Derrotado pelo oponente<br>Limite de turnos excedido', 'Phe địch bị hạ', 2400, 800, 'TURN,Phe địch bị hạ',  -1, -1, 1, true, 600),
  (1377, 'Gà Anh Hùng S7',  1, 200, 'GameServerScript.AI.Messions.CTM1377', 'Elimine Matthias.',       'Derrotado pelo oponente<br>Limite de turnos excedido', 'Phe địch bị hạ', 2400, 800, 'TURN,Phe địch bị hạ',  -1, -1, 1, true, 700),
  (1378, 'Gà Anh Hùng S8',  1, 200, 'GameServerScript.AI.Messions.CTM1378', 'Elimine o Fantasma de Matthias.', 'Derrotado pelo oponente<br>Limite de turnos excedido', 'Phe địch bị hạ', 2400, 800, 'TURN,Phe địch bị hạ', -1, -1, 1, true, 800)
) AS v("Id","Name","TotalCount","TotalTurn","Script","Success","Failure","Description","IncrementDelay","Delay","Title","Param1","Param2","TakeCard","TryAgain","TryAgainCost")
WHERE NOT EXISTS (SELECT 1 FROM "game"."Mission_Info" WHERE "Id" = v."Id");
