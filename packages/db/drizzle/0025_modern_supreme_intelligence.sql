CREATE TABLE "app"."NoviceActivityProgress" (
	"UserID" integer NOT NULL,
	"ActivityType" integer NOT NULL,
	"Conditions" integer DEFAULT 0 NOT NULL,
	"AwardGot" integer DEFAULT 0 NOT NULL,
	"PeriodKey" varchar(10) DEFAULT '' NOT NULL,
	CONSTRAINT "NoviceActivityProgress_pkey" PRIMARY KEY("UserID","ActivityType")
);
