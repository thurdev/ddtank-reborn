#!/usr/bin/env bash
# Redeploy an already-set-up server (see oracle-setup.sh for first-time setup):
#   ssh you@vm 'cd ~/ddtank && bash scripts/deploy/update.sh'
# Pulls the latest code, rebuilds changed images, runs DB migrations, restarts with zero-downtime-ish
# rolling restart (api/game/caddy only — postgres is left alone so it never loses data on a bad deploy).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

BRANCH="${1:-main}"
echo "==> git pull origin $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> docker compose build (api, game, caddy)"
docker compose build api game caddy

echo "==> starting postgres (if not already) and waiting for it to be healthy"
docker compose up -d postgres
timeout 60 sh -c 'until docker compose ps postgres | grep -q "(healthy)"; do sleep 2; done'

echo "==> running DB migrations (apps/api also self-migrates on boot if DB_MIGRATE=true, this is belt-and-suspenders)"
docker compose run --rm --no-deps api pnpm --filter @ddt/db run db:migrate

echo "==> recreating api, game, caddy with the new images"
docker compose up -d --no-deps api game caddy

echo "==> pruning dangling images"
docker image prune -f

echo "==> done. Tail logs with: docker compose logs -f api game"
