CREATE TABLE "player"."Sys_Users_Rescue" (
	"UserID" integer NOT NULL,
	"Arrow" integer DEFAULT 0 NOT NULL,
	"BloodPack" integer DEFAULT 0 NOT NULL,
	"KingBless" integer DEFAULT 0 NOT NULL,
	"SceneData" varchar(600) DEFAULT '' NOT NULL,
	"LastFreeDay" varchar(10) DEFAULT '' NOT NULL,
	CONSTRAINT "Sys_Users_Rescue_pkey" PRIMARY KEY("UserID")
);
