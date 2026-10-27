# syntax=docker/dockerfile:1.7
# Static builds of apps/web + apps/admin + apps/client, served (and reverse-proxied to api/game) by
# Caddy. Build context MUST be the repo root: docker build -f docker/caddy/Dockerfile -t ddtank-caddy .
FROM node:24-slim AS build-base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=1
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages

FROM build-base AS web-build
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile --filter web...
RUN pnpm --filter web build

FROM build-base AS admin-build
COPY apps/admin ./apps/admin
RUN pnpm install --frozen-lockfile --filter admin...
RUN pnpm --filter admin build

# apps/client (PixiJS game client): needs apps/client/src/game, which does NOT exist until the
# transpiler freeze lands (tools/as3-to-ts/freeze.mjs — docs/client-pixi/TRANSPILADOR.md#congelamento;
# tracked by task "lancamento"). This stage will fail with "Cannot find module './game/all'" until then
# — expected, not a bug in this Dockerfile. Once frozen, `docker compose build caddy` builds it like any
# other workspace app.
FROM build-base AS client-build
ARG VITE_ASSETS_BASE_URL=
# apps/client/package.json has playwright as a devDependency (its own test runner, not used at build
# time) — skip the ~300MB browser download `pnpm install` would otherwise trigger in this throwaway
# build stage.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY apps/client ./apps/client
RUN pnpm install --frozen-lockfile --filter @ddt/client...
RUN VITE_ASSETS_BASE_URL=$VITE_ASSETS_BASE_URL pnpm --filter @ddt/client build

FROM caddy:2-alpine
COPY --from=web-build /repo/apps/web/dist /srv/web
COPY --from=admin-build /repo/apps/admin/dist /srv/admin
COPY --from=client-build /repo/apps/client/dist /srv/client
COPY docker/caddy/Caddyfile /etc/caddy/Caddyfile
