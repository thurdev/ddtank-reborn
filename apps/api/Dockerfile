# syntax=docker/dockerfile:1.7
# Production image for @ddt/api. Multi-arch: build with
#   docker buildx build --platform linux/amd64,linux/arm64 -f apps/api/Dockerfile -t ddtank-api .
# (build context MUST be the repo root, not apps/api).
#
# No separate JS bundle: @ddt/db, @ddt/protocol and @ddt/auth ship raw TypeScript (their package.json
# "exports" point at src/*.ts, no dist), and apps/api's own tsconfig has noEmit:true. The repo's own
# "start" script ("tsx src/index.ts") already runs TS directly — this image does the same in prod
# instead of inventing a parallel build/bundle pipeline the repo doesn't otherwise use. `pnpm typecheck`
# still runs as a build-time gate so a type error fails `docker build`, not a running container.
FROM node:24-slim AS base
ENV TZ=UTC \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=1
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

FROM base AS deps
WORKDIR /repo
# Only what @ddt/api needs to resolve (pnpm's documented Docker pattern: copy workspace manifests +
# the filtered subtree, then `--filter <pkg>...` installs it and its workspace dependencies only).
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @ddt/api...

FROM deps AS typecheck
RUN pnpm --filter @ddt/api run typecheck

FROM typecheck AS runtime
ENV NODE_ENV=production TZ=UTC
WORKDIR /repo/apps/api
RUN groupadd -r ddt && useradd -r -g ddt -d /repo ddt \
    && mkdir -p /repo/apps/api/.data/uploads \
    && chown -R ddt:ddt /repo
COPY --chmod=755 docker/entrypoint-api.sh /usr/local/bin/entrypoint-api.sh
USER ddt
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/entrypoint-api.sh"]
CMD ["pnpm", "start"]
