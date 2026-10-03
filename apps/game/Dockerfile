# syntax=docker/dockerfile:1.7
# Production image for @ddt/game. Multi-arch: build with
#   docker buildx build --platform linux/amd64,linux/arm64 -f apps/game/Dockerfile -t ddtank-game .
# (build context MUST be the repo root, not apps/game).
#
# Same reasoning as apps/api/Dockerfile: workspace packages ship raw TS, so this runs the repo's own
# "start" script (tsx) instead of apps/game's tsconfig.build.json dist output, which would need every
# @ddt/* dependency compiled too (it isn't — see packages/db/package.json "exports"). `pnpm typecheck`
# is still the build-time gate.
FROM node:24-slim AS base
ENV TZ=UTC \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=1
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

FROM base AS deps
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/game ./apps/game
RUN pnpm install --frozen-lockfile --filter @ddt/game...

FROM deps AS typecheck
RUN pnpm --filter @ddt/game run typecheck

FROM typecheck AS runtime
ENV NODE_ENV=production TZ=UTC
WORKDIR /repo/apps/game
RUN groupadd -r ddt && useradd -r -g ddt -d /repo ddt && chown -R ddt:ddt /repo
COPY --chmod=755 docker/entrypoint-game.sh /usr/local/bin/entrypoint-game.sh
USER ddt
# 9200 game TCP, 9300 WebSocket (proxied by Caddy, not published directly), 843 Flash policy, 9400 internal admin API
EXPOSE 9200 9300 843 9400
ENTRYPOINT ["/usr/local/bin/entrypoint-game.sh"]
CMD ["pnpm", "start"]
