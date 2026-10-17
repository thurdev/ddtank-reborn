-- Seed data pra Forja › Forno: "Espírito do equipamento" (391 EQUIP_GHOST). Tabela nova
-- (não existe no catálogo original — nunca implementada no servidor C# base deste projeto). Dados reais
-- portados de barrydevp/ddt3.8 (SpiritInfo, Tank.Request/spiritinfolist.xml), decodificados (zlib
-- inflate) nesta sessão. Ver research/qa/feature-sources.md e THIRD_PARTY_NOTICES.md.
-- NOTA: a irmã SetsBuildTemp (295 STORE_FINE_SUIT) NÃO precisou de seed nova — já existe no catálogo
-- original como game."Sets_Build_Temp" (packages/db/seed/game/Sets_Build_Temp.json.gz, 70 linhas reais).

INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 1, 50, 50000, 11, 411, 0, 0, 0, 0, 0, 0, 1 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 1 AND "Level" = 1);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 1, 50, 50000, 11, 421, 0, 0, 0, 0, 0, 4, 5 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 5 AND "Level" = 1);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 1, 50, 50000, 11, 401, 20, 20, 20, 20, 0, 6, 7 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 7 AND "Level" = 1);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 2, 250, 10000, 150, 412, 0, 0, 0, 0, 0, 0, 1 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 1 AND "Level" = 2);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 2, 250, 10000, 150, 422, 0, 0, 0, 0, 0, 4, 5 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 5 AND "Level" = 2);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 2, 250, 10000, 150, 402, 40, 40, 40, 40, 0, 6, 7 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 7 AND "Level" = 2);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 3, 750, 2000, 230, 413, 0, 0, 0, 0, 0, 0, 1 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 1 AND "Level" = 3);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 3, 750, 2000, 230, 423, 0, 0, 0, 0, 0, 4, 5 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 5 AND "Level" = 3);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 3, 750, 2000, 230, 403, 60, 60, 60, 60, 0, 6, 7 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 7 AND "Level" = 3);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 4, 1000, 1000, 1350, 414, 0, 0, 0, 0, 0, 0, 1 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 1 AND "Level" = 4);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 4, 1000, 1000, 1350, 424, 0, 0, 0, 0, 0, 4, 5 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 5 AND "Level" = 4);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 4, 1000, 1000, 1350, 404, 80, 80, 80, 80, 0, 6, 7 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 7 AND "Level" = 4);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 5, 2000, 0, 4050, 415, 0, 0, 0, 0, 0, 0, 1 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 1 AND "Level" = 5);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 5, 2000, 0, 4050, 425, 0, 0, 0, 0, 0, 4, 5 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 5 AND "Level" = 5);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 5, 2000, 0, 4050, 405, 100, 100, 100, 100, 0, 6, 7 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 7 AND "Level" = 5);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 6, 15000, 0, 12150, 416, 0, 0, 0, 0, 0, 0, 1 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 1 AND "Level" = 6);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 6, 15000, 0, 12150, 426, 0, 0, 0, 0, 0, 4, 5 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 5 AND "Level" = 6);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 6, 15000, 0, 12150, 406, 130, 130, 130, 130, 0, 6, 7 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 7 AND "Level" = 6);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 7, 25000, 0, 30375, 417, 0, 0, 0, 0, 0, 0, 1 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 1 AND "Level" = 7);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 7, 25000, 0, 30375, 427, 0, 0, 0, 0, 0, 4, 5 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 5 AND "Level" = 7);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 7, 25000, 0, 30375, 407, 160, 160, 160, 160, 0, 6, 7 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 7 AND "Level" = 7);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 8, 50000, 0, 75938, 418, 0, 0, 0, 0, 0, 0, 1 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 1 AND "Level" = 8);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 8, 50000, 0, 75938, 428, 0, 0, 0, 0, 0, 4, 5 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 5 AND "Level" = 8);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 8, 50000, 0, 75938, 408, 190, 190, 190, 190, 0, 6, 7 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 7 AND "Level" = 8);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 9, 100000, 0, 151875, 419, 0, 0, 0, 0, 0, 0, 1 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 1 AND "Level" = 9);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 9, 100000, 0, 151875, 429, 0, 0, 0, 0, 0, 4, 5 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 5 AND "Level" = 9);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 9, 100000, 0, 151875, 409, 220, 220, 220, 220, 0, 6, 7 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 7 AND "Level" = 9);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 10, 150000, 0, 303750, 420, 0, 0, 0, 0, 0, 0, 1 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 1 AND "Level" = 10);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 10, 150000, 0, 303750, 430, 0, 0, 0, 0, 0, 4, 5 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 5 AND "Level" = 10);
--> statement-breakpoint
INSERT INTO "app"."SpiritInfo" ("Level", "MustGetTimes", "BaseSuccessPro", "RefrenceValue", "SkillId", "AttackAdd", "LuckAdd", "DefendAdd", "AgilityAdd", "BagType", "BagPlace", "CategoryId") SELECT 10, 150000, 0, 303750, 410, 250, 250, 250, 250, 0, 6, 7 WHERE NOT EXISTS (SELECT 1 FROM "app"."SpiritInfo" WHERE "CategoryId" = 7 AND "Level" = 10);
