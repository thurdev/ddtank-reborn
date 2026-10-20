CREATE TABLE "game"."ButtonConfig" (
	"ID" integer NOT NULL,
	"Name" varchar(50) DEFAULT '' NOT NULL,
	"Text" varchar(50) DEFAULT '' NOT NULL,
	"IsShow" boolean DEFAULT true NOT NULL,
	"IsClose" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ButtonConfig_pkey" PRIMARY KEY("ID")
);
--> statement-breakpoint
CREATE TABLE "game"."ChargeSpendRewardTemplateInfoList" (
	"ID" integer NOT NULL,
	"RewardID" integer NOT NULL,
	"RewardItemID" integer NOT NULL,
	"IsSelect" boolean DEFAULT true NOT NULL,
	"IsBind" boolean DEFAULT true NOT NULL,
	"RewardItemValid" integer NOT NULL,
	"RewardItemCount" integer NOT NULL,
	"StrengthenLevel" integer NOT NULL,
	"AttackCompose" integer NOT NULL,
	"DefendCompose" integer NOT NULL,
	"AgilityCompose" integer NOT NULL,
	"LuckCompose" integer NOT NULL,
	CONSTRAINT "ChargeSpendRewardTemplateInfoList_pkey" PRIMARY KEY("RewardID","ID")
);
--> statement-breakpoint
CREATE TABLE "game"."FoodComposeList" (
	"FoodID" integer NOT NULL,
	"VegetableID" integer NOT NULL,
	"NeedCount" integer NOT NULL,
	CONSTRAINT "FoodComposeList_pkey" PRIMARY KEY("FoodID","VegetableID")
);
--> statement-breakpoint
CREATE TABLE "game"."GoodsCollect" (
	"ID" integer NOT NULL,
	"Type" integer NOT NULL,
	"TemplateID" integer NOT NULL,
	"Count" integer NOT NULL,
	"ValidDate" integer NOT NULL,
	"IsBind" boolean DEFAULT true NOT NULL,
	"GetFrom" varchar(200) DEFAULT '' NOT NULL,
	"SondNode" varchar(100) DEFAULT '' NOT NULL,
	CONSTRAINT "GoodsCollect_pkey" PRIMARY KEY("ID")
);
--> statement-breakpoint
CREATE TABLE "game"."ItemStrengthenData" (
	"TemplateID" integer NOT NULL,
	"StrengthenLevel" integer NOT NULL,
	"Data" integer NOT NULL,
	CONSTRAINT "ItemStrengthenData_pkey" PRIMARY KEY("TemplateID","StrengthenLevel")
);
--> statement-breakpoint
CREATE TABLE "game"."LoadAllQuestions" (
	"QuestionCatalogID" integer NOT NULL,
	"QuestionID" integer NOT NULL,
	"QuestionContent" varchar(200) DEFAULT '' NOT NULL,
	"Option1" varchar(100) DEFAULT '' NOT NULL,
	"Option2" varchar(100) DEFAULT '' NOT NULL,
	"Option3" varchar(100) DEFAULT '' NOT NULL,
	"Option4" varchar(100) DEFAULT '' NOT NULL,
	CONSTRAINT "LoadAllQuestions_pkey" PRIMARY KEY("QuestionCatalogID","QuestionID")
);
--> statement-breakpoint
CREATE TABLE "game"."LoadChargeActiveTemplate" (
	"ID" integer NOT NULL,
	"Condition" integer NOT NULL,
	"Description" varchar(50) DEFAULT '' NOT NULL,
	"RegetType" integer NOT NULL,
	"TypeID" integer NOT NULL,
	CONSTRAINT "LoadChargeActiveTemplate_pkey" PRIMARY KEY("ID")
);
--> statement-breakpoint
CREATE TABLE "game"."LotteryShowTemplate" (
	"BoxType" integer NOT NULL,
	"SortID" integer NOT NULL,
	"TemplateID" integer NOT NULL,
	"Count" integer NOT NULL,
	CONSTRAINT "LotteryShowTemplate_pkey" PRIMARY KEY("BoxType","SortID")
);
--> statement-breakpoint
CREATE TABLE "game"."MagicItemTemp" (
	"Lv" integer NOT NULL,
	"Exp" integer NOT NULL,
	"MagicAttack" integer NOT NULL,
	"MagicDefence" integer NOT NULL,
	CONSTRAINT "MagicItemTemp_pkey" PRIMARY KEY("Lv")
);
--> statement-breakpoint
CREATE TABLE "game"."MissionEnergyPrice" (
	"Count" integer NOT NULL,
	"Money" integer NOT NULL,
	"Energy" integer NOT NULL,
	CONSTRAINT "MissionEnergyPrice_pkey" PRIMARY KEY("Count")
);
--> statement-breakpoint
CREATE TABLE "game"."SearchGoodsPayMoney" (
	"Number" integer NOT NULL,
	"NeedMoney" integer NOT NULL,
	CONSTRAINT "SearchGoodsPayMoney_pkey" PRIMARY KEY("Number")
);
--> statement-breakpoint
CREATE TABLE "game"."WarriorFamRankList" (
	"PlayerRank" integer NOT NULL,
	"PlayerName" varchar(50) DEFAULT '' NOT NULL,
	"FamLevel" integer NOT NULL,
	CONSTRAINT "WarriorFamRankList_pkey" PRIMARY KEY("PlayerRank")
);
--> statement-breakpoint
-- Seed: the 12 new tables above have no vendor SP/row dump anywhere (docs/plan/TASKS.md m3-endpoints-schema,
-- research/6600/ashx-missing.md Pendencias 1) -- every row below is ported verbatim (zlib-inflated) from the
-- 6600 vendor snapshot XML itself (vendor/DDT-6600/Request/<endpoint>.xml), the only source that ever existed
-- for them. See packages/db/src/schema/game.ts HAND-ADDED comments above each table for per-table provenance.
INSERT INTO "game"."ButtonConfig" ("ID", "Name", "Text", "IsShow", "IsClose") VALUES (1, 'TimeActiveBtn', '限时活动', true, true);
--> statement-breakpoint
INSERT INTO "game"."ButtonConfig" ("ID", "Name", "Text", "IsShow", "IsClose") VALUES (2, 'rollBtn', '轮盘', true, true);
--> statement-breakpoint
INSERT INTO "game"."ButtonConfig" ("ID", "Name", "Text", "IsShow", "IsClose") VALUES (3, 'vipBtn', 'VIP', true, true);
--> statement-breakpoint
INSERT INTO "game"."ButtonConfig" ("ID", "Name", "Text", "IsShow", "IsClose") VALUES (4, 'activeBtn', '活动', true, true);
--> statement-breakpoint
INSERT INTO "game"."ButtonConfig" ("ID", "Name", "Text", "IsShow", "IsClose") VALUES (5, 'signBtn', '签到', true, true);
--> statement-breakpoint
INSERT INTO "game"."ButtonConfig" ("ID", "Name", "Text", "IsShow", "IsClose") VALUES (6, 'awardBtn', '领奖', true, true);
--> statement-breakpoint
INSERT INTO "game"."ButtonConfig" ("ID", "Name", "Text", "IsShow", "IsClose") VALUES (7, 'angelblessBtn', '天使赐福', true, true);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (1, 1001, 70246, false, true, 1, 1, 12, 50, 50, 50, 50);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (2, 1001, 17100, false, true, 3, 1, 12, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (3, 1001, 11905, false, true, 0, 3, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (4, 1001, 11025, false, true, 0, 300, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (5, 1001, 13493, false, true, 7, 1, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (1, 4001, 100100, false, true, 0, 100, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (2, 4001, 11098, false, false, 0, 4, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (3, 4001, 11164, false, true, 0, 5, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (4, 4002, 100100, false, true, 0, 200, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (5, 4002, 11098, false, false, 0, 8, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (6, 4002, 11164, false, true, 0, 10, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (7, 4003, 100100, false, true, 0, 200, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (8, 4003, 11098, false, false, 0, 8, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (9, 4003, 11164, false, true, 0, 10, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (10, 4004, 100100, false, true, 0, 500, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (11, 4004, 11098, false, false, 0, 20, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (12, 4004, 11164, false, true, 0, 25, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (13, 4005, 100100, false, true, 0, 2000, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (14, 4005, 11098, false, false, 0, 100, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (15, 4005, 11164, false, true, 0, 100, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (16, 4006, 100100, false, true, 0, 2000, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (17, 4006, 11098, false, false, 0, 100, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (18, 4006, 11164, false, true, 0, 100, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (19, 4007, 100100, false, true, 0, 3000, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (20, 4007, 11098, false, false, 0, 100, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (21, 4007, 11164, false, true, 0, 200, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ChargeSpendRewardTemplateInfoList" ("ID", "RewardID", "RewardItemID", "IsSelect", "IsBind", "RewardItemValid", "RewardItemCount", "StrengthenLevel", "AttackCompose", "DefendCompose", "AgilityCompose", "LuckCompose") VALUES (22, 4008, 35150101, false, true, 0, 1, 0, 0, 0, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."FoodComposeList" ("FoodID", "VegetableID", "NeedCount") VALUES (334101, 336101, 10);
--> statement-breakpoint
INSERT INTO "game"."FoodComposeList" ("FoodID", "VegetableID", "NeedCount") VALUES (334101, 336102, 10);
--> statement-breakpoint
INSERT INTO "game"."FoodComposeList" ("FoodID", "VegetableID", "NeedCount") VALUES (334101, 336103, 10);
--> statement-breakpoint
INSERT INTO "game"."FoodComposeList" ("FoodID", "VegetableID", "NeedCount") VALUES (334101, 336104, 10);
--> statement-breakpoint
INSERT INTO "game"."FoodComposeList" ("FoodID", "VegetableID", "NeedCount") VALUES (334102, 336101, 10);
--> statement-breakpoint
INSERT INTO "game"."FoodComposeList" ("FoodID", "VegetableID", "NeedCount") VALUES (334102, 336105, 10);
--> statement-breakpoint
INSERT INTO "game"."FoodComposeList" ("FoodID", "VegetableID", "NeedCount") VALUES (334102, 336106, 10);
--> statement-breakpoint
INSERT INTO "game"."FoodComposeList" ("FoodID", "VegetableID", "NeedCount") VALUES (334102, 336107, 10);
--> statement-breakpoint
INSERT INTO "game"."FoodComposeList" ("FoodID", "VegetableID", "NeedCount") VALUES (334103, 336101, 10);
--> statement-breakpoint
INSERT INTO "game"."FoodComposeList" ("FoodID", "VegetableID", "NeedCount") VALUES (334103, 336108, 10);
--> statement-breakpoint
INSERT INTO "game"."FoodComposeList" ("FoodID", "VegetableID", "NeedCount") VALUES (334103, 336109, 10);
--> statement-breakpoint
INSERT INTO "game"."FoodComposeList" ("FoodID", "VegetableID", "NeedCount") VALUES (334103, 336110, 10);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 1, 10);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 2, 20);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 3, 40);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 4, 60);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 5, 90);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 6, 120);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 7, 160);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 8, 200);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 9, 250);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 10, 300);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 11, 350);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17004, 12, 400);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 0, 0);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 1, 10);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 2, 20);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 3, 35);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 4, 50);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 5, 70);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 6, 90);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 7, 115);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 8, 140);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 9, 170);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 10, 200);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 11, 235);
--> statement-breakpoint
INSERT INTO "game"."ItemStrengthenData" ("TemplateID", "StrengthenLevel", "Data") VALUES (17003, 12, 270);
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 1, '属于国家一类保护动物的是：', '天鹅', '娃娃鱼', '孔雀', '丹顶鹤');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 2, '举重时运动员为什么搓白粉？', '使手变的粗糙', '吸取手上的汗', '刺激肌肉', '保护皮肤');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 3, '下面哪一种熨烫衣服的方法是不正确的？', '熨之前在衣服上喷一些水', '尽可能长时间地熨', '掌握合适的温度', '在衣服和熨斗之间垫一块湿布');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 4, '世界上最大的宫殿是：', '故宫', '白宫', '爱丽舍宫', '克里姆林宫');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 5, '世界上最靠北的首都是：', '斯德哥尔摩', '莫斯科', '雷克亚未克', '哥本哈根');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 6, '戛纳电影节在哪国举办？', '法国', '意大利', '英国', '德国');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 7, '传统彩瓷“素三彩”之所以称“素”是因不用：', '绿色', '黄色', '红色', '黑色');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 8, '世界上最长的山脉是：', '比利牛斯山', '喜马拉雅山', '安第斯山', '乞力马扎罗山');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 9, '"六一居士”是谁的别号？', '欧阳修', '唐伯虎', '柳亚子', '苏曼殊');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 10, '苏伊士运河属于哪个国家？', '以色列', '巴勒斯坦', '约旦', '埃及');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 11, '太阳系中最大的行星是:', '土星', '木星', '火星', '海王星');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 12, '举重比赛中，最重的杠铃片是：', '蓝色的', '绿色的', '红色的', '黄色的');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 13, '西游记中去西天取经的“唐三藏”的真名是：', '玄慈', '玄明', '唐僧', '玄奘');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 14, '奥运五环旗中的绿色环代表：', '美洲', '欧洲', '澳洲', '亚洲');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 15, '“歌棚”是哪个民族的习俗？', '傣族', '苗族', '壮族', '京族');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 16, '正规围棋比赛的棋盘大小是：', ' 13乘13', '15乘15', '19乘19', '21乘21');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 17, '有“钢琴诗人”之称的是：', '贝多芬', '海顿', '莫扎特', '肖邦');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 18, '“总角之交”是指：', '顽童之交', '少年之交', '中年之交', '忘年之交');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 19, '蝴蝶发现花蜜靠：', '眼看', '前足沾', '嗅觉闻', '嘴尝');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 20, '以下哪一位曾被称为“药王”？', '孙思邈', '张仲景', '李时珍', '扁鹊');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 21, '青蛙除了用肺外还用什么器官呼吸？', '肌肉', '皮肤', '脾脏', '肝脏');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 22, '世界上生产玉米最多的国家是：', '中国', '日本', '美国', '英国');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 23, '发生在北京卢沟桥的历史事变名叫？', '华北事变', '戊戌政变', '七七事变', '皖南事变');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 24, '我国的“冰城”是指哪一城市？', '吉林市', '哈尔滨', '辽阳市', '牡丹江');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 25, '世界最深的洼地是：', '地中海', '死海', '红海', '黑海');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 26, '人走路时摆动双臂主要是为了：', '减少能量消耗', '校正头部位置', '平衡走路姿势', '加快行走速度');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 27, '世界上地势最低的国家是：', '芬兰', '冰岛', '挪威', '荷兰');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 28, '亚洲首次举办奥运会是哪一届？', '16届', '17届', '18届', '19届');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 29, '小提琴有几根弦？', '2根', '3根', '4根', '6根');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 30, '五岳中的中岳是', '泰山', '嵩山', '华山', '恒山');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 31, '在“夸父逐日”中，“夸父”是怎样追逐太阳的？', '驾车', '奔跑', '飞行', '骑马');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 32, '“春风不度玉门关”是谁的诗句？', '李白', '杜甫', '李清照', '王之涣');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 33, '以下哪种菜肴是湖南风味？', '凤翔驴肉', '开封豆腐干', '威宁火腿', '东安子鸡');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 34, '生态危机与人类的哪个习惯关系最密切？', '懒惰', '遗忘', '浪费', '贪吃');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 35, '“琴棋书画”中的“棋”指：', '象棋', '围棋', '古代象棋', '国际象棋');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 36, '中国农业银行发行的信用卡是：', '长城卡', '金穗卡', '牡丹卡', '龙卡');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 37, '“初出茅庐”中的“茅庐”本意是指谁的的住处？', '诸葛亮', '司马迁', '司马光', '刘备');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 38, 'INTERNET的中文名称是：', '因特网', '以太网', '令牌环网', '计算机网');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 39, '“五岳”中的南岳指：', '衡山', '恒山', '泰山', '华山');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 40, '蒲松龄的故居在：', '山东淄博', '江苏徐州', '河北沧州', '安徽凤阳');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 41, '“沧海桑田”的沧海应是：', '东海', '南海', '黄海', '渤海');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 42, '陆军棋有多少枚棋子？', '50', '60', '40', '70');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 43, '太阳的年龄约有多大？', '30亿岁', '50亿岁', '80亿岁', '100亿岁');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 44, '下列成语中，有错别字的是：', '黄粱美梦', '再接再厉', '按部就班', '墨守晨规');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 45, '第一届世界杯足球赛是在哪里举办的？', '乌拉圭', '墨西哥', '阿根廷', '意大利');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 46, '最清洁的能源是：', '石油', '太阳能', '煤气', '沼气');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 47, '银杏属于什么种类水果？', '仁果类', '核果类', '坚果类', '复果类');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 48, '狗的鼻尖为什么经常是湿乎乎的？', '滋润嗅觉细胞的分泌物', '经常喝水而弄湿的', '鼻子怕冷而冻出来的', '经常用唾液清洗');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 49, '“三顾茅庐”的故事是指：', '刘备访诸葛亮', '刘备访关羽', '曹操访许攸', '孙权访周瑜');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 50, '我国第一座投入商业运营的核电站是：', '大亚湾核电站', '泰山核电站', '岭澳核电站', '田湾核电站');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 51, '巴西人最喜爱的一种舞蹈是：', '华尔兹', '桑巴', '探戈', '踢踏');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 52, '下列哪一首作品表达了归隐的意愿', '陶渊明《咏荆轲》', '王维《山居秋瞑》', '阮籍《夜中不能寐》', '杜苟鹤《山中寡妇》');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 53, '使用灭火器灭火时的错误做法是', '人要站在上风处', '尽量远离火源', '灭火器瞄准火源', '灭火器瞄准火苗');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 54, '世界上面积最大的国家是：', '加拿大', '俄罗斯', '中国', '美国');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 55, '举办婚礼获得的情定终身婚戒的有效期是？', '30天', '7天', '365天', '永久有效');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 56, '青龙石可以提高什么属性？', '攻击', '敏捷', '防御', '幸运');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 57, '白虎石可以提高什么属性？', '幸运', '攻击', '敏捷', '防御');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 58, '朱雀石可以提高什么属性？', '防御', '幸运', '攻击', '敏捷');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 59, '玄武石可以提高什么属性？', '敏捷', '防御', '幸运', '攻击');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 60, '属性宝珠的形状是？', '三角形', '方形', '圆形', '星形');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 61, '轰天的哪项属性高？', '攻击', '防御', '敏捷', '幸运');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 62, '雷霆的哪项属性高？', '攻击', '防御', '敏捷', '幸运');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 63, '神风的哪项属性高？', '攻击', '防御', '敏捷', '幸运');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 64, '烈火的哪项属性高？', '攻击', '防御', '敏捷', '幸运');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 65, '游戏中玩家创建名字最长为多少字符？', '4个字符', '7个字符', '14个字符', '28个字符');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 66, '游戏中玩家创建工会所需的最低等级是多少？', '5级', '10级', '12级', '20级');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 67, '游戏中创建工会需要多少金币？', '10000', '20000', '50000', '100000');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 68, '出售道具精致女神之泪需要工会商城的级别为？', '1级', '2级', '3级', '4级');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 69, '普通玩家每天泡温泉的时间上限是多少？', '60分钟', '100分钟', '120分钟', '200分钟');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 70, '工会铁匠铺最高等级是多少？', '3级', '5级', '10级', '15级');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 71, '10级工会铁匠铺强化与合成的成功率提升多少？', '10%', '20%', '50%', '100%');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 72, '工会保管箱最高等级是多少？', '3级', '5级', '10级', '15级');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 73, '10级工会保管箱容量是多少？', '30格', '50格', '100格', '150格');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 74, '使用3级经验药水可以提升多少点经验？', '1000', '2000', '3000', '5000');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 75, '游戏中朱雀石的颜色是？', '红色', '蓝色', '绿色', '黄色');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 76, '游戏中玄武石的颜色是？', '红色', '蓝色', '绿色', '黄色');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 77, '游戏中青龙石的颜色是？', '红色', '蓝色', '绿色', '黄色');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 78, '游戏中白虎石的颜色是？', '红色', '蓝色', '绿色', '黄色');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 79, '温泉中每个房间最多容纳多少人？', '5', '10', '15', '20');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 80, '三国武将关羽使用的的武器是？', '偃月刀', '雷霆', '轰天', '司马砸缸');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 81, '中国最大的岛屿是？', '台湾岛', '海南岛', '崇明岛', '舟山岛');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 82, '历史上的朱元璋是哪个朝代的皇帝？', '清朝', '明朝', '唐朝', '宋朝');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 83, '以下哪个是中国最大的沙漠？', '塔克拉玛干沙漠', '巴丹吉林沙漠', '腾格里沙漠', '柴达木沙漠');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 84, '以下哪个是中国最长的河流？', '长江', '黄河', '珠江', '黑龙江');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 85, '我国最高的山峰珠穆朗玛峰是在哪个省？', '西藏', '四川', '新疆', '云南');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 86, '泼水节是我国哪个少数民族的特有节日？', '侗族', '羌族', '白族', '傣族');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 87, '叙事长诗《阿诗玛》是哪个民族的民间传说？', '彝族', '傣族', '白族', '藏族');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 88, '我国女性传统服饰旗袍源于哪个民族？', '满族', '汉族', '傣族', '白族');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 89, '使用生命恢复可以恢复玩家多少生命值？', '100', '200', '500', '1000');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 90, '团队恢复可以使己方成员恢复多少生命值？', '100', '200', '300', '500');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 91, '使用隐身可以使自己隐形几回合？', '2', '3', '4', '5');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 92, '使用团队隐身可以使己方成员隐形几回合？', '2', '3', '4', '5');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 93, '使用道具激怒可以增加怒气总值多少？', '30%', '40%', '50%', '60%');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 94, '玩家拍卖物品时最长单次拍卖时限是多少？', '12小时', '24小时', '48小时', '72小时');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 95, '游戏中玩家组队对战的最高人数是？', '2', '3', '4', '5');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 96, '游戏中玩家组队挑战副本的最高人数是？', '2', '3', '4', '5');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 97, '贝多芬是著名的？', '医学家', '音乐家', '哲学家', '数学家');
--> statement-breakpoint
INSERT INTO "game"."LoadAllQuestions" ("QuestionCatalogID", "QuestionID", "QuestionContent", "Option1", "Option2", "Option3", "Option4") VALUES (1, 98, '游戏中普通玩家可添加好友的上限是多少？', '50', '100', '200', '无上限');
--> statement-breakpoint
INSERT INTO "game"."LoadChargeActiveTemplate" ("ID", "Condition", "Description", "RegetType", "TypeID") VALUES (4001, 1000, 'Valor de consumo acumulada de {0} Cupons recebe pr', 1, 3);
--> statement-breakpoint
INSERT INTO "game"."LoadChargeActiveTemplate" ("ID", "Condition", "Description", "RegetType", "TypeID") VALUES (4002, 3000, 'Valor de consumo acumulada de {0} Cupons recebe pr', 1, 3);
--> statement-breakpoint
INSERT INTO "game"."LoadChargeActiveTemplate" ("ID", "Condition", "Description", "RegetType", "TypeID") VALUES (4003, 5000, 'Valor de consumo acumulada de {0} Cupons recebe pr', 1, 3);
--> statement-breakpoint
INSERT INTO "game"."LoadChargeActiveTemplate" ("ID", "Condition", "Description", "RegetType", "TypeID") VALUES (4004, 10000, 'Valor de consumo acumulada de {0} Cupons recebe pr', 1, 3);
--> statement-breakpoint
INSERT INTO "game"."LoadChargeActiveTemplate" ("ID", "Condition", "Description", "RegetType", "TypeID") VALUES (4005, 30000, 'Valor de consumo acumulada de {0} Cupons recebe pr', 1, 3);
--> statement-breakpoint
INSERT INTO "game"."LoadChargeActiveTemplate" ("ID", "Condition", "Description", "RegetType", "TypeID") VALUES (4006, 50000, 'Valor de consumo acumulada de {0} Cupons recebe pr', 1, 3);
--> statement-breakpoint
INSERT INTO "game"."LoadChargeActiveTemplate" ("ID", "Condition", "Description", "RegetType", "TypeID") VALUES (4007, 100000, 'Valor de consumo acumulada de {0} Cupons recebe pr', 1, 3);
--> statement-breakpoint
INSERT INTO "game"."LoadChargeActiveTemplate" ("ID", "Condition", "Description", "RegetType", "TypeID") VALUES (4008, 150000, 'Valor de consumo acumulada de {0} Cupons recebe pr', 1, 3);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 1, 7024, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 2, 7026, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 3, 7027, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 4, 7041, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 5, 7046, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 6, 7047, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 7, 7048, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 8, 7015, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 9, 7016, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 10, 7017, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 11, 7018, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 12, 7019, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 13, 7020, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 14, 7021, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 15, 7022, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 16, 7023, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 17, 14008, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 18, 14009, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 19, 14010, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 20, 11030, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 21, 11031, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 22, 11032, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 23, 11033, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 24, 8406, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 25, 8506, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 26, 8404, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 27, 8504, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 28, 8402, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 29, 8502, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 30, 9402, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 31, 9502, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 32, 9403, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 33, 9503, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 34, 9405, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 35, 9505, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 36, 9406, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 37, 9506, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 38, 9424, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (1, 39, 9425, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 1, 7024, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 2, 7026, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 3, 7027, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 4, 7047, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 5, 7046, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 6, 7015, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 7, 7016, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 8, 7017, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 9, 7018, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 10, 7019, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 11, 7020, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 12, 7021, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 13, 7022, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 14, 7023, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 15, 14010, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 16, 14009, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 17, 14008, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 18, 8406, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 19, 8506, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 20, 8404, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 21, 8504, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 22, 8402, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 23, 8502, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 24, 9402, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 25, 9502, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 26, 9403, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 27, 9503, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 28, 9405, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 29, 9505, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 30, 9406, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 31, 9506, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 32, 9424, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (2, 33, 9425, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 1, 7024, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 2, 7026, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 3, 7027, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 4, 7041, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 5, 7047, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 6, 7046, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 7, 7015, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 8, 7016, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 9, 7017, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 10, 7018, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 11, 7019, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 12, 7020, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 13, 7021, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 14, 7022, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 15, 14010, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 16, 14009, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 17, 14008, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 18, 8406, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 19, 8506, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 20, 8404, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 21, 8504, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 22, 8402, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 23, 8502, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 24, 9402, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 25, 9502, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 26, 9403, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 27, 9503, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 28, 9405, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 29, 9505, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 30, 9406, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 31, 9506, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 32, 9424, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (3, 33, 9425, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 1, 7089, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 2, 35140401, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 3, 35160101, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 4, 7063, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 5, 7057, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 6, 7058, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 7, 7026, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 8, 7027, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 9, 7024, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 10, 17007, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 11, 11150, 100);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 12, 30006, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 13, 31006, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 14, 32006, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 15, 11560, 3);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 16, 11917, 500);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 17, 100100, 500);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 18, 11680, 200);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 19, 14010, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 20, 7053, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 21, 7045, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 22, 334107, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 23, 11944, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 24, 11954, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 25, 11027, 15);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 26, 8514, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 27, 9523, 1);
--> statement-breakpoint
INSERT INTO "game"."LotteryShowTemplate" ("BoxType", "SortID", "TemplateID", "Count") VALUES (4, 28, 9525, 1);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (1, 1000, 30, 30);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (2, 2100, 45, 45);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (3, 3300, 60, 60);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (4, 4600, 75, 75);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (5, 6000, 90, 90);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (6, 7500, 105, 105);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (7, 9100, 120, 120);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (8, 10800, 135, 135);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (9, 12600, 150, 150);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (10, 15100, 167, 167);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (11, 17800, 184, 184);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (12, 20700, 201, 201);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (13, 23800, 218, 218);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (14, 27100, 235, 235);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (15, 30600, 252, 252);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (16, 34300, 269, 269);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (17, 38200, 286, 286);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (18, 42300, 303, 303);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (19, 46600, 320, 320);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (20, 53600, 339, 339);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (21, 60900, 358, 358);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (22, 68500, 377, 377);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (23, 76400, 396, 396);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (24, 84600, 415, 415);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (25, 93100, 434, 434);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (26, 101900, 453, 453);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (27, 111000, 472, 472);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (28, 120400, 491, 491);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (29, 130100, 510, 510);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (30, 143100, 531, 531);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (31, 156500, 552, 552);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (32, 170300, 573, 573);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (33, 184500, 594, 594);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (34, 199100, 615, 615);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (35, 214100, 636, 636);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (36, 229500, 657, 657);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (37, 245300, 678, 678);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (38, 261500, 699, 699);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (39, 278100, 720, 720);
--> statement-breakpoint
INSERT INTO "game"."MagicItemTemp" ("Lv", "Exp", "MagicAttack", "MagicDefence") VALUES (40, 298100, 745, 745);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (1, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (2, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (3, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (4, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (5, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (6, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (7, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (8, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (9, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (10, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (11, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (12, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (13, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (14, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (15, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (16, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (17, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (18, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (19, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (20, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (21, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (22, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (23, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (24, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (25, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (26, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (27, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (28, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (29, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."MissionEnergyPrice" ("Count", "Money", "Energy") VALUES (30, 100, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (1, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (2, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (3, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (4, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (5, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (6, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (7, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (8, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (9, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (10, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (11, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (12, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (13, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (14, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (15, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (16, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (17, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (18, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (19, 50);
--> statement-breakpoint
INSERT INTO "game"."SearchGoodsPayMoney" ("Number", "NeedMoney") VALUES (20, 50);
--> statement-breakpoint
INSERT INTO "game"."WarriorFamRankList" ("PlayerRank", "PlayerName", "FamLevel") VALUES (1, 'Asuna', 38);
--> statement-breakpoint
INSERT INTO "game"."WarriorFamRankList" ("PlayerRank", "PlayerName", "FamLevel") VALUES (2, 'Tohru', 16);
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (1, 0, 201233, 10, 0, false, 'Instâncias,Eventos', '0|0');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (2, 0, 201234, 15, 0, false, 'Instâncias,Eventos', '0|0');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (3, 0, 201235, 10, 0, false, 'Instâncias,Eventos', '0|0');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (4, 0, 201236, 30, 0, false, 'Instâncias,Eventos', '0|0');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (5, 1, 15030, 1, 30, true, 'Instâncias,Eventos', '1|2');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (6, 1, 201146, 2, 0, true, 'Instâncias,Eventos', '3|4');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (7, 0, 201237, 10, 0, false, 'Instâncias,Eventos', '0|0');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (8, 1, 40003, 30, 0, true, 'Instâncias,Eventos', '1|2|3|4|5|6');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (9, 0, 201238, 50, 0, false, 'Instâncias,Eventos', '0|0');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (10, 0, 201239, 30, 0, false, 'Instâncias,Eventos', '0|0');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (11, 1, 13433, 1, 30, true, 'Instâncias,Eventos', '1|2|3|4|5|6|7|8');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (12, 1, 13434, 1, 30, true, 'Instâncias,Eventos', '1|2|3|4|5|6|8|9');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (13, 0, 201240, 50, 0, false, 'Instâncias,Eventos', '0|0');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (14, 1, 8414, 1, 7, true, 'Instâncias,Eventos', '1|2|3|4|5|6|7|8|10|11');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (15, 0, 201241, 20, 0, false, 'Instâncias,Eventos', '0|0');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (16, 1, 9424, 1, 7, true, 'Instâncias,Eventos', '1|2|3|4|5|6|8|9|12|13');
--> statement-breakpoint
INSERT INTO "game"."GoodsCollect" ("ID", "Type", "TemplateID", "Count", "ValidDate", "IsBind", "GetFrom", "SondNode") VALUES (17, 1, 7113, 1, 7, true, 'Instâncias,Eventos', '1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16');
