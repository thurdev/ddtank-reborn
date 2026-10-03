# syntax=docker/dockerfile:1.7
# Static builds of apps/web + apps/admin, served (and reverse-proxied to api/game) by Caddy.
# Build context MUST be the repo root: docker build -f docker/caddy/Dockerfile -t ddtank-caddy .
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

FROM caddy:2-alpine
COPY --from=web-build /repo/apps/web/dist /srv/web
COPY --from=admin-build /repo/apps/admin/dist /srv/admin
COPY docker/caddy/Caddyfile /etc/caddy/Caddyfile
