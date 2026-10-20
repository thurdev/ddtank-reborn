CREATE TABLE "app"."PveBalance" (
	"PveId" integer NOT NULL,
	"HardLevel" integer NOT NULL,
	"NpcHpMult" double precision DEFAULT 1 NOT NULL,
	"NpcDamageMult" double precision DEFAULT 1 NOT NULL,
	"NpcDefenceMult" double precision DEFAULT 1 NOT NULL,
	"RewardMult" double precision DEFAULT 1 NOT NULL,
	"UpdatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "PveBalance_pkey" PRIMARY KEY("PveId","HardLevel")
);
--> statement-breakpoint
CREATE TABLE "app"."PveInstanceClear" (
	"UserID" integer NOT NULL,
	"PveId" integer NOT NULL,
	"HardLevel" integer NOT NULL,
	"ClearCount" integer DEFAULT 0 NOT NULL,
	"FirstClearedAt" timestamp (3) DEFAULT now() NOT NULL,
	"LastClearedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "PveInstanceClear_pkey" PRIMARY KEY("UserID","PveId","HardLevel")
);
