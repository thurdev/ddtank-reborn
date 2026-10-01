# client-harness

A small static server with one HTML page. It boots the original DDTank 4.1 Flash client (`vendor/DDTank41/Source Flash/FlashSV1`) under a self-hosted Ruffle build and writes every HTTP request the client makes to a log file. It is a feasibility and contract tool, not the production site (that is `apps/web`).

## Pinned versions

| Component | Version | Source |
|---|---|---|
| Ruffle (web, self-hosted) | **nightly-2026-10-01** (`@ruffle-rs/ruffle` 0.7.0-nightly.2026.10.1) | https://github.com/ruffle-rs/ruffle/releases/download/nightly-2026-10-01/ruffle-nightly-2026_10_01-web-selfhosted.zip |
| Fonts | Noto Sans Regular/Bold (OFL), hinted TTF | https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/hinted/ttf/ |

`public/ruffle/` (about 30 MB) and `public/game/` (about 73 MB) are git-ignored. To recreate them:

```sh
# from apps/client-harness
curl -L -o ruffle.zip https://github.com/ruffle-rs/ruffle/releases/download/nightly-2026-10-01/ruffle-nightly-2026_10_01-web-selfhosted.zip
mkdir -p public/ruffle && tar -xf ruffle.zip -C public/ruffle && rm ruffle.zip
pnpm --filter @ddtank/client-harness copy-client     # copies FlashSV1 -> public/game/flash (skips *.bak)
```

## Run

```sh
pnpm --filter @ddtank/client-harness start          # http://localhost:9380/
pnpm --filter @ddtank/client-harness ws-probe       # optional: fake game socket on ws://localhost:9300/ws
pnpm --filter @ddtank/client-harness requests       # unique paths from logs/requests.jsonl
```

These are plain `node` runs of `.ts` files (Node 24 type stripping), so there is no build step.

Environment variables:

| Var | Default | Meaning |
|---|---|---|
| `HARNESS_PORT` | `9380` | HTTP port (the URLs in `fixtures/flash/config.xml` assume 9380) |
| `FLASH_DIR` | `public/game/flash` | Compiled client directory |
| `REQUEST_DIR` | `../../vendor/DDTank41/Tank.Request` | Pre-built zlib XML files the client loads (`*.xml` only, read-only) |
| `RESOURCE_DIR` | (unset) | A resource pack (`image/`, `sound/`, `flash/characterDefine.xml`). It is not in the repo; without it every `/resource/*` request returns 404 |
| `FIXTURE_VARIANT` | (unset) | Prefer `fixtures/<path>.<variant>.<ext>`: `socket` gives a successful `Login.ashx` (the client then opens the game socket), `register` gives an empty `LoginSelectList.ashx` (character-creation path) |

Page query parameters: `?swf=DDT_Loading.swf` (skips the select-list step), `?user=..&key=..&site=..`, `?log=info|warn|error|debug` (Ruffle log level).

## Routing

All file lookups are **case-insensitive**, like IIS. The client lowercases every URL it builds through `LoaderManager.creatLoader`, but the files on disk use mixed case.

1. `fixtures/<path>`: harness overrides. `fixtures/flash/config.xml` points everything at `http://localhost:9380/`. The `fixtures/request/*.ashx` files are canned XML replies for `LoginSelectList`, `ServerList` and `Login`.
2. `/flash/*` is served from `FLASH_DIR`.
3. `/request/*.xml` is served from `REQUEST_DIR`. Every other `.ashx` returns 404 and is logged; that 404 is the list of endpoints `apps/api` must implement.
4. `/resource/*` is served from `RESOURCE_DIR`.
5. Everything else is served from `public/` (Ruffle, fonts, `crossdomain.xml`, and `server_list.html`, which the client navigates to when login fails).

Ruffle `socketProxy` maps `127.0.0.1:9200` and `localhost:9200` to `ws://localhost:9300/ws`. The host and port come from `ServerList.ashx` (`IP`, and `Port` + 69; see `research/client/01-client-map.md`).

See `research/client/02-ruffle-report.md` for the results.
