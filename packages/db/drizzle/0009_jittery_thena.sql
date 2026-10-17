CREATE TABLE "app"."SpiritInfo" (
	"Level" integer NOT NULL,
	"MustGetTimes" integer DEFAULT 0 NOT NULL,
	"BaseSuccessPro" integer DEFAULT 0 NOT NULL,
	"RefrenceValue" integer DEFAULT 0 NOT NULL,
	"SkillId" integer DEFAULT 0 NOT NULL,
	"AttackAdd" integer DEFAULT 0 NOT NULL,
	"LuckAdd" integer DEFAULT 0 NOT NULL,
	"DefendAdd" integer DEFAULT 0 NOT NULL,
	"AgilityAdd" integer DEFAULT 0 NOT NULL,
	"BagType" integer DEFAULT 0 NOT NULL,
	"BagPlace" integer DEFAULT 0 NOT NULL,
	"CategoryId" integer NOT NULL,
	CONSTRAINT "SpiritInfo_pkey" PRIMARY KEY("CategoryId","Level")
);
