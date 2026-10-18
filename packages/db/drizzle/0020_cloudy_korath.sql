CREATE TABLE "player"."Sys_Users_Trusteeship" (
	"UserID" integer NOT NULL,
	"QuestID" integer NOT NULL,
	"EndTime" timestamp (3) NOT NULL,
	CONSTRAINT "Sys_Users_Trusteeship_pkey" PRIMARY KEY("UserID","QuestID")
);
--> statement-breakpoint
ALTER TABLE "game"."Quest" ADD COLUMN "CollocationCost" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "game"."Quest" ADD COLUMN "CollocationColdTime" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "player"."Sys_Users_Extra" ADD COLUMN "NormalFightNum" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "player"."Sys_Users_Extra" ADD COLUMN "HardFightNum" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "player"."Sys_Users_Extra" ADD COLUMN "TrusteeshipSpirit" integer DEFAULT 100 NOT NULL;