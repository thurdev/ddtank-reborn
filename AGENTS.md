# DDTank Reborn — shared context for all agents

Goal: port the DDTank 4.1 private server (C#/.NET Framework + SQL Server + ASP.NET .ashx) to a modern stack,
keep the original Flash AS3 client working (via Ruffle in the browser + optional desktop launcher),
and add a full admin panel + documentation. Must be fully playable: lobby, PvP rooms, PvE dungeons,
guild/GvG, shop, items, quests, events, bots (AI opponents with editable names).

## Base source (read-only, never edit; copy what you need)
- `vendor/DDTank41` — base (pnkl1999/DDTank41). Projects: Center.Server, Fighting.Server, Game.Server,
  Game.Base, Game.Logic, Bussiness, SqlDataProvider, Tank.Request (.ashx), Road.Service, GameAdmin,
  Database (.bak backups), "Source Flash" (AS3 client source), Tank.Flash/Road.Flash (compiled client).
  Branch `remake/main` (AloneInAbyss fork) has fixes and PT-BR guides.
- `vendor/DDTank4.1` — donor: PvE mission/NPC AI scripts.
- `vendor/DDT-6600` — reference only (later version).
- Research notes: `research/01-sources.md`, `02-client-runtime.md`, `03-hosting.md`, `04-protocol-and-rewrites.md`.

## Target stack
- pnpm monorepo (pnpm 11, Node 24, TypeScript strict, ESM, `tsconfig.base.json`). Tests: vitest.
- `packages/protocol` — binary packet codec, crypto, framing (TCP + WebSocket stream), packet codes.
- `packages/db` — Drizzle ORM schema for Postgres (Neon in prod, local Postgres/PGlite in dev), migrations, seed data.
- `packages/game-data` — loaders for templates (items, maps, quests, drops...) shared by servers.
- `apps/game` — game server (replaces Center + Game/Road + Fighting) — TCP + WS on same protocol, policy server 843.
- `apps/api` — HTTP API (Fastify): replaces Tank.Request .ashx endpoints byte-compatible (same URLs/XML/zlib) + REST for site/admin.
- `apps/web` — React (Vite) player website: register/login, play page embedding Ruffle.
- `apps/admin` — React (Vite) admin panel.
- `docs/` — documentation (Portuguese PT-BR for user-facing guides, code identifiers in English).

## Rules
- Work only in the directories your task owns. Don't touch other agents' dirs.
- Add deps with `pnpm --filter <pkg> add <dep>`; if lockfile conflict, retry. Don't change root config except to add deps.
- No git commits (orchestrator commits). No global installs unless your task says so.
- Behavior must match the original C# server (the Flash client is fixed); when in doubt, cite the C# file:line you mirrored.
- Never put secrets in code; use `.env.example`.
