CREATE TABLE "player"."Sys_Users_CatchBeast" (
	"UserID" integer NOT NULL,
	"ChallengeNum" integer DEFAULT 0 NOT NULL,
	"BuyBuffNum" integer DEFAULT 0 NOT NULL,
	"DamageNum" integer DEFAULT 0 NOT NULL,
	"BoxState" varchar(20) DEFAULT '1-1-1-1-1' NOT NULL,
	"LastEnterDay" varchar(10) DEFAULT '' NOT NULL,
	CONSTRAINT "Sys_Users_CatchBeast_pkey" PRIMARY KEY("UserID")
);
--> statement-breakpoint
-- m4-catchbeast: Capturar Nian (145 ACTIVITY_SYSTEM sub 32-36, CatchBeastPackageType) PVE data. game."NPC_Info"
-- id 73000 ("Nian"/"Niên Thú", Script="GameServerScript.AI.NPC.YearMonster") already existed in BOTH seed
-- snapshots (NPC_Info.json.gz 4.1-translated row, NPC_Info2.json.gz 6600-original row, Blood=3000000 matching
-- GameProperties.YearMonsterHP exactly) but game."Pve_Info"/"Mission_Info" never linked it to a playable PVE
-- session (same gap shape as 0011's Labirinto: real NPC/brain script, missing the two linking rows) — the
-- Capturar Nian hall icon was never reachable in production. Portado de vendor/DDT-6600 Game.Server.Script/
-- {Game/YearMonster.cs, Messions/YearMonster1347.cs, NPC/YearMonster.cs} — transpiled by hand (no generated/
-- equivalent existed for this donor path) in packages/fight/src/pve/scripts/manual/catchbeast.ts, same
-- category as manual/worldboss.ts (ACDragon/AC1243/WorldAcientDragon). Pve_Info.ID=1347 = eMap.CatchBeast
-- (Game.Logic/eMap.cs:15) = the literal MapId `CreateCatchBeastAction.cs:32` hardcodes (`int_0 = 1347`) — this
-- port's `RoomMgr.createCatchBeastRoom` passes `room.MapId` straight through as `pveId`, same convention
-- `rooms/room-mgr.ts launchPve` already uses for every other PVE room type. Type=26 = eRoomType.CatchBeast
-- (Game.Logic/eRoomType.cs:34, real value — unlike `RoomType.Rescue=70` this one did NOT need a fabricated
-- id). TotalTurn/Delay/IncrementDelay on the Mission_Info row: conservative bookkeeping (not real DDT-6600
-- data we have) — they only cap turn count, never affect the fight's outcome.
INSERT INTO "game"."Pve_Info" ("ID","Name","Type","Ordering","SimpleGameScript","NormalGameScript","HardGameScript","TerrorGameScript","Description") SELECT 1347, 'Capturar Nian', 26, 0, 'GameServerScript.AI.Game.YearMonster', 'GameServerScript.AI.Game.YearMonster', 'GameServerScript.AI.Game.YearMonster', 'GameServerScript.AI.Game.YearMonster', 'Capturar Nian: derrote a besta do ano novo e cause o maximo de dano possivel (145 ACTIVITY_SYSTEM sub 34 CHALLENGE).' WHERE NOT EXISTS (SELECT 1 FROM "game"."Pve_Info" WHERE "ID" = 1347);
--> statement-breakpoint
INSERT INTO "game"."Mission_Info" ("Id","Name","TotalCount","TotalTurn","Script","Success","Failure","Description","IncrementDelay","Delay","Title","Param1","Param2","TakeCard","TryAgain","TryAgainCost") SELECT 1347, 'Capturar Nian', 1, 200, 'GameServerScript.AI.Messions.YearMonster1347', 'Nian derrotado!', 'Voce perdeu.', 'Capturar Nian', 0, 0, 'Capturar Nian', -1, -1, 0, false, 0 WHERE NOT EXISTS (SELECT 1 FROM "game"."Mission_Info" WHERE "Id" = 1347);
