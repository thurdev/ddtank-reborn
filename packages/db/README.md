# @ddt/db

Drizzle ORM schema, migrations and seed data for DDTank Reborn. The schema mirrors the three original SQL Server
databases **1:1**: same table and column names (quoted identifiers, e.g. `"game"."Shop_Goods"."TemplateID"`), and the
TS property names are those names too, so porting C# `reader["TemplateID"]` / stored procedures is mechanical.

| Postgres schema | Source DB (.bak) | Content |
|---|---|---|
| `game` | Project_Game34 (104 tables) | all templates: items, shop, drops, maps, NPCs, missions, quests, pets, cards, events, config |
| `player` | Project_Player34 (73 tables) | player state (characters, bags, mail, guilds, pets, ...) + a few config tables |
| `member` | Db_Membership (20 tables) + new `Accounts` | web accounts. **Schema only, no data imported** |

## Tables by domain

Full per-table list with row counts and purpose: [`research/db/00-summary.md`](../../research/db/00-summary.md).

- **Items / forge** (`game`): `Shop_Goods` (= item templates, 7640; there is no `Items` table), `Shop_Goods_Box`, `Shop_Goods_Categorys`,
  `Item_Strengthen`, `Item_Strengthen_Goods`, `StrengThenExp`, `Item_Fusion`, `Items_Fusion_List`, `Fusion`, `Item_Refinery*`, `Rune_Template`,
  `GoldEquipTemplateLoad`, `Suit_TemplateID`, `SuitTemplateInfo`, `ClothGroupTemplateInfo`, `ClothPropertyTemplateInfo`, `Fight_Spirit_Templatelist`, `Totem_*`, `New_Title`.
- **Shop**: `Shop` (listings/prices), `ShopGoodsShowList`.
- **Combat / PvE / maps**: `Ball`, `BallConfig`, `Game_Map`, `Map_Server`, `Map_Week`, `NPC_Info`, `Mission_Info`, `Pve_Info`, `LevelInfo`,
  `ExerciseInfo`, `Fair_Battle_Reward_Temp`, `DailyLeague*`, `League_Info`.
- **Drops**: `Drop_Condiction`, `Drop_Item`.
- **Quests / achievements**: `Quest`, `Quest_Condiction`, `Quest_Goods`, `Quest_Rate`, `Achievement`, `AchievementCondition`, `Achievement_Goods`.
- **Pets / cards**: `Pet_*`, `Card_*`, `CardUpdate*`.
- **Events / activities**: `Active`, `Active_Award`, `Active_Convert_Item`, `Activity_System_Item`, `Event_*`, `Communal_Active*`, `Daily_Award`,
  `Login_Award_Item_Template`, `LuckyStart_Topten_Award`, `Old_Player_Award_Info`, `Sub_Active_*`, `User_Box`, `LoadUserBox`.
- **Guild**: `game.Consortia_*` templates; `player.Consortia*` state.
- **Config**: `game.Server_Config`, `game.Rate`, `game.Fight_Rate`, `AreaConfig`, `Edictum_List`, `QQtips_Messages`;
  `player.Server_Config`, `player.Server_List`, `player.Server_Event`. Several tables exist in both DBs (Server_Config, Rate, Fight_Rate,
  Item_Fusion, Items_Fusion_List, Consortia_Level, Fight_Record) — use the copy the C# caller uses
  (`ProduceBussiness`/`GameBussiness` -> `game`, `PlayerBussiness`/`ConsortiaBussiness`/... -> `player`).
- **Player** (`player`): `Sys_Users_Detail` (character), `Sys_Users_Goods` (inventory), `User_Messages` (mail), `Sys_Users_Friends`,
  `Sys_Users_Pet`, `Sys_Users_Card`, `QuestData`, `AchievementData`, `Auction`, `Marry_*`, `Sys_User_Farm`/`Field`, `Sys_VIP_Info`, `User_Buff`, ...
- **Accounts** (`member`): `Accounts` (new, see below); legacy `Mem_*`, `Pay_*` kept as empty tables for reference.

## Usage

```ts
import { createDb, migrateDb, game } from "@ddt/db";
import { eq } from "drizzle-orm";

const h = await createDb(); // DATABASE_URL, or embedded PGlite when unset
await migrateDb(h);
const [item] = await h.db.select().from(game.Shop_Goods).where(eq(game.Shop_Goods.TemplateID, 7001));
await h.close();
```

Scripts (`pnpm --filter @ddt/db <script>`):

| script | what |
|---|---|
| `db:gen-schema` | regenerate `src/schema/{schemas,game,player,member}.ts` from `catalog.json` (vendor/_dbexport, else research/db) |
| `db:generate` | `drizzle-kit generate` -> new SQL migration in `drizzle/` |
| `db:migrate` | apply migrations to `DATABASE_URL` |
| `db:seed` | migrate + import seed (`--from-vendor` reads vendor/_dbexport JSON; positional args limit tables, e.g. `Shop_Goods`) |
| `db:seed:export` | vendor/_dbexport JSON -> `seed/<schema>/<Table>.json.gz` + `seed/manifest.json` |
| `db:dev-account` | create/reset `admin`/`admin` (IsAdmin) and `test`/`test` (refuses when NODE_ENV=production) |
| `db:serve` | expose the PGlite dir as a Postgres server on 127.0.0.1:5432 (`PGLITE_PORT`) |
| `test` | vitest on in-memory PGlite: migrate + seed + row counts vs `row-counts.json` |

Changing the schema: edit the generator (or `src/schema/accounts.ts`), run `db:gen-schema` then `db:generate`, commit both.
Never edit the generated files.

## Dev mode (PGlite, no Postgres install)

`DATABASE_URL` unset (or `pglite:<dir>`) -> [PGlite](https://pglite.dev) (Postgres 17 in WASM), persisted in
`packages/db/.data/pglite` (gitignored; absolute path so every app resolves the same dir; override with `PGLITE_DIR`).
`pglite:memory` is in-memory (tests).

```sh
pnpm --filter @ddt/db db:seed && pnpm --filter @ddt/db db:dev-account
```

A PGlite directory can only be opened by **one process**. When several processes need the DB (game server + API + studio),
run `pnpm --filter @ddt/db db:serve` and point everything at `DATABASE_URL=postgres://postgres@127.0.0.1:5432/postgres`.

## Production (Neon)

1. Create a project; copy the **pooled** connection string (host contains `-pooler`) and keep `?sslmode=require`:
   `postgres://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`
2. `DATABASE_URL=... pnpm --filter @ddt/db db:migrate`, then `db:seed` (uses the committed `seed/`, no vendor needed).
   The direct (non-pooler) URL also works for migrations.
3. The client uses postgres.js (long-lived game server): pool `max` 5 (`DB_POOL_MAX`), `idle_timeout` 20 s so idle
   connections close and Neon can autosuspend, `max_lifetime` 30 min, prepared statements disabled automatically on
   `-pooler` hosts (PgBouncer transaction mode).

## Type mapping

| SQL Server | Postgres (Drizzle) |
|---|---|
| int / bigint / smallint, tinyint | integer / bigint (mode number) / smallint |
| bit | boolean |
| nvarchar(n), varchar(n) / nvarchar(max), text, ntext | varchar(n) / text |
| datetime | timestamp(3) without time zone, mode `date` |
| decimal(p,s), numeric, money | numeric(p,s) (string in TS) |
| float / real | double precision / real |
| uniqueidentifier | uuid |
| varbinary, image | bytea (custom type, `Uint8Array`) |
| IDENTITY(1,1) | `generated by default as identity` (explicit ids allowed; seed resets the sequence to MAX+1) |
| getdate() / newid() | now() / gen_random_uuid() |

Timestamps are wall-clock values (like C# `DateTime` local time). Drizzle reads and writes them as UTC `Date`s, so run the
servers with `TZ=UTC` and treat `getUTC*()` as the original local time.

The original DBs have **no foreign keys and almost no indexes** besides PKs (only `Pay_Card.IX_Pay_Card`). The generator
adds a few non-unique `IX_*` indexes on per-user lookup columns in `player` (marked "added" in the generated code; see
`EXTRA_INDEXES` in `scripts/gen-schema.ts`).

## Schema generation

<!-- gen-schema:begin -->

Synthetic primary keys (the original table is a heap):

| schema | table | key | why it is safe |
|---|---|---|---|
| game | Achievement | ID | natural key, NOT NULL and unique across 281 rows |
| game | Ball | ID | natural key, NOT NULL and unique across 1586 rows |
| game | BallConfig | TemplateID | natural key, NOT NULL and unique across 781 rows |
| game | Communal_Active_Award | ID | identity column, unique across 25 seeded rows |
| game | DailyLeagueAwardItems | ID | natural key, NOT NULL and unique across 93 rows |
| game | Game_Map | ID | natural key, NOT NULL and unique across 454 rows |
| game | Item_Record | Id | identity column |
| game | Login_Award_Item_Template | ID | natural key, NOT NULL and unique across 23 rows |
| game | Mission_Info_Backup | Id | natural key, NOT NULL and unique across 128 rows |
| game | NPC_Info | ID | natural key, NOT NULL and unique across 1005 rows |
| game | Pet_Exp_Item_Price | ID | identity column, unique across 20 seeded rows |
| game | Quest | ID | natural key, NOT NULL and unique across 728 rows |
| game | ShopGoodsShowList | TempID | identity column, unique across 5093 seeded rows |
| game | ShopGoodsShowList_BK | TempID | identity column, unique across 4090 seeded rows |
| player | Sys_Active_System_Data | ID | identity column |
| player | Sys_Eat_Pets | ID | identity column |
| player | Sys_Users_DanhHieu | Id | identity column |
| member | Mem_UserRight | Id | identity column |

Still heaps (no safe key, left without PK): `game.Achievement_Goods`, `game.AreaConfig`, `game.Communal_Active`, `game.DailyLeagueAwardList`, `game.DailyLeagueLevel`, `game.Event_Live`, `game.Event_LiveGoods`, `game.Event_Reward_Goods`, `game.Event_Reward_Info`, `game.Fair_Battle_Reward_Temp`, `game.Item_Refinery_Strengthen`, `game.Map_Server`, `game.Quest_Condiction`, `game.Quest_Goods`, `game.Quest_Rate`, `game.Rate`, `game.Shop`, `game.Shop_Goods_Box`, `game.Suit_TemplateID`, `game.SuitTemplateInfo`, `game.TempTable`, `player.DailyRecordInfo`, `player.Rate`, `player.Suit_Manager`, `player.Sys_Users_Rank_Date`, `player.Sys_Users_Record`, `member.Mem_Application_Sub`, `member.Mem_Code`, `member.Mem_ResetPwd`, `member.Mem_Right`, `member.Mem_Roles`, `member.Mem_UserInfo`, `member.Mem_Users`, `member.Mem_Users_Save`, `member.Mem_UsersInRoles`, `member.Pay_Card`, `member.Pay_Exchange`, `member.Pay_History`, `member.Pay_Select`, `member.Pay_Way`.

Other translation notes:

- `player.Consortia.KickDate` default `(((2009)-(1))-(1))` is integer arithmetic (= 2007 days after 1900-01-01 in SQL Server), translated literally to `1905-07-01 00:00:00`.
- `player.Sys_Users_Detail.LastAward` default `(((2009)-(1))-(1))` is integer arithmetic (= 2007 days after 1900-01-01 in SQL Server), translated literally to `1905-07-01 00:00:00`.
- `player.Sys_Users_Detail.LastAuncherAward` default `(((2009)-(1))-(1))` is integer arithmetic (= 2007 days after 1900-01-01 in SQL Server), translated literally to `1905-07-01 00:00:00`.
- `player.Sys_Users_Detail.LastGetEgg` default `(((2009)-(1))-(1))` is integer arithmetic (= 2007 days after 1900-01-01 in SQL Server), translated literally to `1905-07-01 00:00:00`.
- `player.Sys_Users_Goods.BeginDate` default `(((2008)-(10))-(11))` is integer arithmetic (= 1987 days after 1900-01-01 in SQL Server), translated literally to `1905-06-11 00:00:00`.
- FK `FK_MEM_PATH_主从表_MEM_APPL` on `member.Mem_Paths(ApplicationId)` -> `dbo.Mem_Application(ApplicationId)` is not emitted (ref is not a PK/unique in a way that matters; table is empty).

<!-- gen-schema:end -->

Synthetic PK rules (`pickSyntheticKey`): (1) the table's identity column, if it is unique in the seeded data (for empty
tables the identity guarantees uniqueness); (2) for non-empty `game` template tables only, a NOT NULL `ID`/`Id`/`TemplateID`
column that is unique across all rows (template rows are only upserted by that id via `SP_Insert_Update_*`). Otherwise the table stays a heap.

## Seed

`seed/` holds gzip JSON (one row per line) for **106 tables / 51,070 rows: 0.77 MB** (14.8 MB raw). It is committed so deploys
don't need `vendor/`. Contents:

- `game`: all 98 Project_Game34 tables that have rows.
- `player`: config only: `Server_Config`, `Server_List`, `Server_Event`, `Item_Fusion`, `Items_Fusion_List`, `Consortia_Buff_Temp`,
  `Consortia_Level`, `Fight_Rate` (whitelist in `scripts/export-seed.ts`).
- `member`: nothing. Real accounts, password hashes, 20,200 activation codes and 2,694 prepaid cards are not imported.
- Override: `player.Server_List.IP` is rewritten from a third-party public IP to `127.0.0.1`.

`db:seed` is idempotent. For each table, in one transaction, it runs `TRUNCATE ... RESTART IDENTITY`, batched inserts (<=30k params),
then `setval` on each identity sequence to `MAX+1`. It takes about 7 s on PGlite.

## Accounts

`Db_Membership.Mem_Users`/`Mem_UserInfo` don't work as the login table. They have no primary key, use nvarchar user ids,
split rows per ApplicationId across two tables, and store legacy `PasswordFormat` hashes. So `member."Accounts"` is new:
`ID` identity PK, `UserName` varchar(200) (case-insensitive unique on `lower(UserName)`; same width as, and join key to,
`player."Sys_Users_Detail"."UserName"`, as in the original login `SP_Users_LoginWeb @UserName`), `Email`,
`PasswordHash` (scrypt `scrypt$N$r$p$salt$hash`, Node built-in crypto, no native addon), `IsAdmin`, `IsBanned`,
`BanReason`, `CreatedAt`, `LastLoginAt`, `LastLoginIP`. Helpers: `hashPassword`, `verifyPassword`, `upsertAccount`,
`checkLogin`, `createDevAccounts`. Characters (`Sys_Users_Detail`) are created by the game on first login, not here.
