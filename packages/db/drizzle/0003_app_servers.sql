CREATE TABLE IF NOT EXISTS "app"."Servers" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"host" text NOT NULL,
	"port" integer NOT NULL,
	"wsUrl" text,
	"state" integer DEFAULT 1 NOT NULL,
	"online" integer DEFAULT 0 NOT NULL,
	"lastSeenAt" timestamp(3) DEFAULT now() NOT NULL
);
