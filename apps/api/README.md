# @ddt/api

Fastify 5 HTTP API (port 8080) for DDTank Reborn. It replaces `vendor/DDTank41/Tank.Request` (the `.ashx` handlers and the
pre-built template XML the Flash client downloads) and adds the JSON REST used by `apps/web`, `apps/launcher` and `apps/admin`.
It also serves the client's static trees.

```sh
pnpm --filter @ddt/api dev               # tsx watch; PGlite at packages/db/.data/pglite, migrates + seeds on first boot
pnpm --filter @ddt/api test              # vitest + fastify.inject on in-memory PGlite (≈15 s)
pnpm --filter @ddt/api typecheck         # (= build: the workspace packages ship TS source, runtime is tsx)
pnpm --filter @ddt/api verify-templates  # diff every generated XML against vendor/DDTank41/Tank.Request/*.xml (--values for row diffs)
pnpm --filter @ddt/api gen-rsa-key       # new login key pair (see "RSA key")
```

Settings live in `.env.example` (validated with zod in `src/config.ts`). Set `TZ=UTC`; the app also forces it. DB timestamps are wall-clock values.

## URL map

| Prefix | What |
|---|---|
| `/request/*` | `REQUEST_PATH`. `.ashx` handlers (`src/request/`) and template `.xml` files (`src/templates/`). Matching is case-insensitive. Query **and** form values are merged into one case-insensitive map, like `context.Request["x"]`. The client's broken `?rnd=Xrnd=X` queries are tolerated |
| `/flash/*` | `FLASHSITE` = `FLASH_DIR`. `config.xml` is generated: every URL points at `PUBLIC_URL`/`SITE_URL`, statistics are off, the policy file is `/crossdomain.xml` |
| `/resource/*` | `SITE`. Uploads overlay first, then `RESOURCE_DIR`, through a lowercase index built at boot. A miss returns a typed placeholder (1×1 PNG, empty SWF, `<root />`) and is counted at `GET /api/admin/assets/misses` |
| `/ruffle/*`, `/uploads/*`, `/crossdomain.xml` | Ruffle self-host, local uploads, Flash policy file |
| `/CreateLogin.aspx` | Legacy portal ticket (`LOGIN_KEY`) |
| `/api/auth/*`, `/api/account/*`, `/api/play/config` | Accounts (`member."Accounts"`, scrypt) and JWT (HS256) |
| `/api/public/{config,status,news,ranking,launcher}`, `/api/ranking` | Site and launcher |
| `/api/admin/*` | Admin REST (role `admin`) |

All 101 non-page boot paths in `research/client/evidence/boot-requests.tsv` return 200 against the real `FlashSV1` plus the merged resource pack.

## Login tickets (shared with apps/game)

The flow is implemented in **`packages/auth`** (`@ddt/auth`) on the table **`app."LoginSessions"`** (`packages/db/src/schema/app.ts`). That table replaces Tank.Request's in-memory `PlayerManager`, and the 4.1 bypass (`if(true)` in `Login.ashx.cs`) is fixed.

1. `POST /api/auth/login` (or `/api/play/config`, `/api/public/config` with a Bearer token) runs `issueWebKey(user)`. This is the old `PlayerManager.Add`: one row per account, key = uppercase GUID, `ExpiresAt = now + LOGIN_KEY_TTL_MIN`. Flashvars: `user=<lowercase account>&key=<GUID>&config=<PUBLIC_URL>/flash/config.xml`. `CreateLogin.aspx` still accepts `content=name|key|time|md5(name+key+time+LoginKey)` (`verifyCreateLoginContent`, same md5 as `BaseInterface.UnEncryptLogin`).
2. `Login.ashx?p=` is RSA-decrypted to `user,key,tempPwd,nick`. `consumeWebKey(user, key, tempPwd)` requires the key to match: case-insensitive, unexpired, or equal to the previous game key when the client re-logs in. On success it stores `GameKey = tempPwd` (expires after `GAME_KEY_TTL_MIN`). Then `SP_Users_LoginWeb`/`SP_Users_Active` are ported (`src/request/players.ts`) and the original `<Item …/>` is returned.
3. **apps/game**, on the socket `LOGIN` packet `"user,tempPwd"`, calls `validateGameLogin(db, user, tempPwd)`. It returns the session row (`UserID`, `AccountID`) or `null`, and `removeSession` is called on kick or logout. There is no HMAC, because the client picks `tempPwd`, so the shared row is the source of truth.

## RSA key

The modulus is hardcoded in the client (`2.png`, class `ddt.DDT`). In dev, with `RSA_USE_VENDOR_KEY=true`, the API uses the pair from `vendor/DDTank41/Tank.Request/Web.config`. That pair is public, so it is for dev only. For production:

1. Run `pnpm --filter @ddt/api gen-rsa-key` and put the `RSA_PRIVATE_KEY=` line in env.
2. Run `tsx scripts/patch-client-key.ts FlashSV1/2.png out/2.png <modulus>` and deploy the patched `2.png`. The script inflates the CWS file, replaces the 172-character modulus and deflates it again (`research/client/01-client-map.md` §5).

## Templates (the 55 "build" endpoints + static-only files)

`src/templates/defs.ts` ports each `<Name>.ashx.cs` `Bulid()`. All the procedures are `select * from X [order by]` plus a `FlashUtils.Create*Info` builder, written as compact attribute specs. `TemplateCache` does the following:

- builds every file from the DB at boot;
- keeps the bytes in memory (zlib level 9 = `78 DA`, or plain, exactly as the original wrote each file);
- serves them with an ETag;
- calls `invalidate(["game.Shop_Goods", …])` after any admin write to a dependent table;
- rebuilds the CelebList ranking files every `CELEB_REBUILD_MIN`.

The builder `.ashx` URLs plus `CreateAllXml.ashx`/`CelebList/CreateAllCeleb.ashx` still exist, but they need an admin Bearer token instead of `AdminIP`. Files that shipped only as snapshots but have a table are generated with the snapshot's attribute names (cloth*, levellist, toteminfo, petconfiginfo, …). Files with no table at all (loadallquestions, cardinfolist, CelebByAchievementPoint*, …) are served verbatim from `assets/request/`. Cross-area or unknown `*celeb*.xml` lists answer with an empty valid list.

`verify-templates` shows identical element and attribute layout for every generated file that has a vendor snapshot. The remaining value diffs are data drift between the shipped snapshot and the DB dump.

Player views used by the paging procedures (`V_Sys_Users_Detail`, `V_Consortia`, `V_Consortia_Users`, `V_Sys_Users_Friends`, `V_Consortia_Apply_Users`) are ported as Postgres views in `app.*` (`packages/db/drizzle/0002_app_views.sql`).

## Endpoint status

Ported (`src/request/endpoints/`): `Login`, `LoginSelectList`, `ServerList` (advertises `GAME_PORT-69` on `GAME_HOST`), `VisualizeRegister`, `NickNameCheck`, `ConsortiaNameCheck`, `IMListLoad`, `UserApprenticeshipInfoList`, `ConsortiaList` (zlib), `ConsortiaUsersList`, `LoadUserMail` (zlib), `MailSenderList` (zlib), `AdvanceQuestionRead`, `shopcheapitemlist`, `CreateLogin.aspx`, plus all template builders. Every query is parameterized; order and where clauses come from fixed whitelists.

Stubs (`src/request/registry.ts`, `STUBS`): every other `.ashx` in `docs/spec/request/00-endpoints.md`, plus the client-requested ones with no handler in DDTank41. They answer `<Result value="false" message="Not supported" />`, compressed only where the client loader inflates (`dailyloglist`, `UserQuestList`, `CheckRegistration`). The next ones to port are `AuctionPageList`, `MarryInfoPageList`, `Consortia{Duty,Event,EquipControl,ApplyUsers,InviteUsers}List`, `RenameNick`/`RenameConsortiaName` (RSA `p`, same decrypt as Login), `UserRankDate`, `gmtipallbyids` and the `IMRecentContactsList`/`Farm*`/`Gift*` logs. For the 6 handlers where the server zlibs but the client reads plain text (spec §3.3), the response must be plain.

## REST contract

- `POST /api/auth/register {username,email,password}` → `201 {token,user,play,game}`.
- `POST /api/auth/login {username,password,serverId?,client?}` → `{token,user:{id,username,email,role},play:{flashvars,swfUrl,expiresAt},game}`, or `401 {message}`. During maintenance only admins get in (`503`).
- `GET /api/auth/me` → `{user}`.
- `GET /api/account/me` → `{user,characters}`.
- `POST /api/account/password`.
- `GET /api/play/config` → `{rufflePath,swfUrl,base,flashvars,socketProxy:[{host,port,proxyUrl}],socket,wsUrl,requestUrl,resourceUrl,flashUrl,configUrl,expiresAt}`.
- `GET /api/public/config` → `{serverName,launcherUrl,game}` (personal flashvars when a Bearer token is sent).
- `/api/public/status` (apps/game `GET /status` via `GAME_INTERNAL_URL`, falls back to the DB).
- `/api/public/news`.
- `/api/public/ranking?type=level|gp|offer|fight`.
- `/api/public/launcher` (the launcher manifest schema from `apps/launcher/src/main/api.ts`).

Admin (Bearer, role `admin`):

- **Generic CRUD:** `GET /api/admin/:resource?q&page&pageSize&sort=[-]col`, `GET|PATCH|DELETE /api/admin/:resource/:id` (composite ids joined with `~`), `POST /api/admin/:resource`. The resource-to-table whitelist is in `src/routes/admin-resources.ts`. It covers players, items, shop, quests (+conditions/goods), events, drops, npcs, missions, dungeons, maps, balls, edicts, news, bots, texts, logs, configs, server-list and others. Entries whose PK is missing are disabled at boot with a log line. Writes are audited in `app."Logs"` and rebuild the dependent XML.
- **Users and players:** `admin-users` (`member.Accounts` + `app.AccountRoles`); `POST /api/admin/players/:id/{ban,unban,give-item}`.
- **Server, stats and mail:** `GET|PUT /api/admin/server-config` (stored in `app.Settings`, applied live to ServerList, play config and config.xml); `GET /api/admin/stats` (proxied to apps/game `GET /stats`, merged with the API's own uptime, CPU and memory series); `POST /api/admin/mail/broadcast`.
- **Assets:** `GET|POST /api/admin/assets`, `DELETE /api/admin/assets/:key`, `POST /api/admin/uploads` (multipart `file` + `folder`; local `UPLOAD_DIR`, which also overlays `/resource/`, or S3/R2 with SigV4), `GET /api/admin/assets/misses`.
- **Templates:** `GET /api/admin/templates`, `POST /api/admin/templates/rebuild`.

## New DB objects (packages/db, additive only)

- `src/schema/app.ts`, migration `drizzle/0001_app.sql`: `app.LoginSessions`, `Settings`, `News`, `Bots`, `Texts`, `Logs`, `AccountRoles`, `MailBroadcasts`.
- `drizzle/0002_app_views.sql`: the views listed above.
- `drizzle.config.ts` now includes `app.ts` and the `app` schema, and `schema/index.ts` exports `app`.

### ActivePullDown.ashx (activity rewards)

`src/request/endpoints/events.ts` — SP_Active_PullDown ported: `activeKey` (RSA with the login key) = activation code;
HasKey 1/4 codes in `player."Active_Number"` (taken with a conditional UPDATE, IsOnly = one per account), 2 per-user
grant `<id>-2-<uid>`, 3 every account once (`app."EventClaims"`). `game."Active_Award"` rows (Sex, Mark) are mailed
(5 per mail) and apps/game gets `POST /mail-notice`. `value` is true only on success (the original always answered true,
so the client marked the activity done even on "code does not exist"). Admin: `/api/admin/events/status|start|stop|reload`
proxy the game internal channel; `POST /api/admin/events/:id/codes {count, mark}` generates codes; every admin write to a
`game.*` table or `app.ScheduledEvents` POSTs `/reload-templates` to the game (`GAME_INTERNAL_TOKEN` = game `ADMIN_TOKEN`).
