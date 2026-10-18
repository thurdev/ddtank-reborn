-- m3-fusao (regerada como 0016 ao juntar com ch-processo): receitas de fusão do 6600. Rollback: DROP TABLE "game"."Item_Fusion_New";
CREATE TABLE "game"."Item_Fusion_New" (
	"FusionID" integer NOT NULL,
	"Item1" integer DEFAULT 0 NOT NULL,
	"Item2" integer DEFAULT -1 NOT NULL,
	"Item3" integer DEFAULT -1 NOT NULL,
	"Item4" integer DEFAULT -1 NOT NULL,
	"Count1" integer DEFAULT 0 NOT NULL,
	"Count2" integer DEFAULT 0 NOT NULL,
	"Count3" integer DEFAULT 0 NOT NULL,
	"Count4" integer DEFAULT 0 NOT NULL,
	"Formula" integer DEFAULT 0 NOT NULL,
	"FusionRate" integer DEFAULT 0 NOT NULL,
	"FusionType" integer DEFAULT 0 NOT NULL,
	"Reward" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "Item_Fusion_New_pkey" PRIMARY KEY("FusionID")
);
