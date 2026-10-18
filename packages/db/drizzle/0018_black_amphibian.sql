-- m3-loja-treino (feature/m3-loja-treino): 155 EVERYDAY_ACTIVEPOINT, 278 MYSTERY_SHOP, 288 SHOP_BUYLIMITEDCOUNT.
-- Another agent (feature/m3-bolsa-core) may also add a migration in parallel — renumber on merge if needed.
-- Rollback: DROP TABLE "app"."EveryDayActiveProgress", "app"."GypsyShopState", "app"."MysteryShopTemplate", "app"."ShopBuyLimited";
CREATE TABLE "app"."EveryDayActiveProgress" (
	"UserID" integer NOT NULL,
	"Day" varchar(10) NOT NULL,
	"ActivityID" integer NOT NULL,
	"Count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "EveryDayActiveProgress_pkey" PRIMARY KEY("UserID","Day","ActivityID")
);
--> statement-breakpoint
CREATE TABLE "app"."GypsyShopState" (
	"UserID" integer NOT NULL,
	"Slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"CurRefreshedTimes" integer DEFAULT 0 NOT NULL,
	"LastRefresh" timestamp (3),
	CONSTRAINT "GypsyShopState_pkey" PRIMARY KEY("UserID")
);
--> statement-breakpoint
CREATE TABLE "app"."MysteryShopTemplate" (
	"ID" integer NOT NULL,
	"LableType" integer DEFAULT 1 NOT NULL,
	"InfoID" integer NOT NULL,
	"Unit" integer DEFAULT 1 NOT NULL,
	"Num" integer DEFAULT 1 NOT NULL,
	"Price" integer DEFAULT 0 NOT NULL,
	"CanBuy" integer DEFAULT 1 NOT NULL,
	"Random" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "MysteryShopTemplate_pkey" PRIMARY KEY("ID")
);
--> statement-breakpoint
CREATE TABLE "app"."ShopBuyLimited" (
	"UserID" integer NOT NULL,
	"Day" varchar(10) NOT NULL,
	"GoodsID" integer NOT NULL,
	"Count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ShopBuyLimited_pkey" PRIMARY KEY("UserID","Day","GoodsID")
);
