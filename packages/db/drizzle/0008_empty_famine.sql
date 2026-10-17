CREATE TABLE "app"."ConsortiaPollVotes" (
	"ConsortiaID" integer NOT NULL,
	"Week" varchar(10) NOT NULL,
	"VoterID" integer NOT NULL,
	"TargetID" integer NOT NULL,
	"UpdatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "ConsortiaPollVotes_pkey" PRIMARY KEY("ConsortiaID","Week","VoterID")
);
--> statement-breakpoint
CREATE TABLE "app"."GuildMemberWeekContribution" (
	"ConsortiaID" integer NOT NULL,
	"UserID" integer NOT NULL,
	"Week" varchar(10) NOT NULL,
	"Total" integer DEFAULT 0 NOT NULL,
	"RewardedWeek" varchar(10) DEFAULT '' NOT NULL,
	CONSTRAINT "GuildMemberWeekContribution_pkey" PRIMARY KEY("UserID","Week")
);
--> statement-breakpoint
CREATE TABLE "app"."LightRoadProgress" (
	"UserID" integer NOT NULL,
	"Week" varchar(10) NOT NULL,
	"Bits" integer DEFAULT 0 NOT NULL,
	"PicksToday" integer DEFAULT 0 NOT NULL,
	"DayKey" varchar(10) DEFAULT '' NOT NULL,
	CONSTRAINT "LightRoadProgress_pkey" PRIMARY KEY("UserID","Week")
);
--> statement-breakpoint
CREATE INDEX "GMWC_guild_idx" ON "app"."GuildMemberWeekContribution" USING btree ("ConsortiaID","Week");