INSERT INTO "app"."Bots" ("nickname", "sex", "level", "difficulty", "weaponTemplateId", "equips", "guild", "enabled")
SELECT 'TiroCerto', 'm', 10, 'easy', 7001, '[]'::jsonb, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM "app"."Bots" WHERE "nickname" = 'TiroCerto');
--> statement-breakpoint
INSERT INTO "app"."Bots" ("nickname", "sex", "level", "difficulty", "weaponTemplateId", "equips", "guild", "enabled")
SELECT 'MiraLaser', 'f', 15, 'normal', 7002, '[]'::jsonb, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM "app"."Bots" WHERE "nickname" = 'MiraLaser');
--> statement-breakpoint
INSERT INTO "app"."Bots" ("nickname", "sex", "level", "difficulty", "weaponTemplateId", "equips", "guild", "enabled")
SELECT 'BoomMaster', 'm', 20, 'normal', 7003, '[]'::jsonb, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM "app"."Bots" WHERE "nickname" = 'BoomMaster');
--> statement-breakpoint
INSERT INTO "app"."Bots" ("nickname", "sex", "level", "difficulty", "weaponTemplateId", "equips", "guild", "enabled")
SELECT 'RainhaVento', 'f', 25, 'hard', 7004, '[]'::jsonb, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM "app"."Bots" WHERE "nickname" = 'RainhaVento');
--> statement-breakpoint
INSERT INTO "app"."Bots" ("nickname", "sex", "level", "difficulty", "weaponTemplateId", "equips", "guild", "enabled")
SELECT 'GeneralBOOM', 'm', 30, 'hard', 7005, '[]'::jsonb, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM "app"."Bots" WHERE "nickname" = 'GeneralBOOM');
