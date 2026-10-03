# syntax=docker/dockerfile:1.7
# One-shot "assets" job: regenerates the map/crater fixes docs/BACKLOG.md's [deploy] note calls for
# (tools/assets/fix-maps.ts + gen-craters.ts) against a mounted vendor/_assets/merged pack and the
# apps/api uploads overlay. Build context MUST be the repo root.
#   docker compose --profile assets run --rm assets
FROM node:24-slim
ENV TZ=UTC PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=1 NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY tools ./tools
# tools/assets scripts aren't a workspace package themselves (no package.json there); they're run from
# the repo root using root's tsx and the workspace packages they import (packages/fight). "./packages/**"
# selects exactly those 5 packages without needing apps/* present.
RUN pnpm install --frozen-lockfile --filter "./packages/**"
CMD ["sh", "-c", "pnpm exec tsx tools/assets/fix-maps.ts && pnpm exec tsx tools/assets/gen-craters.ts"]
