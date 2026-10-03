CREATE TABLE IF NOT EXISTS "app"."Translations" (
	"table" varchar(100) NOT NULL,
	"column" varchar(100) NOT NULL,
	"rowId" varchar(64) NOT NULL,
	"lang" varchar(8) DEFAULT 'pt-BR' NOT NULL,
	"text" text NOT NULL,
	"sourceText" text,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "Translations_pkey" PRIMARY KEY("table","column","rowId","lang")
);
