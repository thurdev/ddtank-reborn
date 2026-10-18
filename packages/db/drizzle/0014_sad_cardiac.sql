ALTER TABLE "player"."Server_List" ADD COLUMN "Enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "player"."Server_List" ADD COLUMN "SortOrder" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "player"."Server_List" ADD COLUMN "InternalUrl" varchar(255);--> statement-breakpoint
ALTER TABLE "player"."Server_List" ADD COLUMN "PvpOnly" boolean DEFAULT false NOT NULL;