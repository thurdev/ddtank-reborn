#!/usr/bin/env bash
# Populates ./vendor on a fresh server and runs the one-shot asset-fix job.
# vendor/ is gitignored and ~3 GB (vendor/_assets/merged ~1.3 GB, vendor/DDTank41 ~1.6 GB) — it is
# never in the repo or in the Docker build context. Get it onto the server first, by ONE of:
#
#   A) rsync from your dev machine (recommended; resumable, only transfers diffs on re-runs):
#        rsync -avz --progress \
#          "vendor/_assets/merged/" you@server:~/ddtank/vendor/_assets/merged/
#        rsync -avz --progress \
#          "vendor/DDTank41/Source Flash/FlashSV1/" you@server:~/ddtank/vendor/DDTank41/'Source Flash'/FlashSV1/
#        rsync -avz --progress \
#          "vendor/DDTank41/Tank.Request/Web.config" you@server:~/ddtank/vendor/DDTank41/Tank.Request/Web.config
#      (Web.config is only needed on the server for `--dry`/debugging; production never reads it — see
#      docker/entrypoint-api.sh, which refuses to boot with RSA_USE_VENDOR_KEY=true in production.)
#
#   B) Cloudflare R2 (if you've already mirrored assets there for CDN serving, see docs/deploy/README.md §3):
#        rclone sync r2:ddtank-assets/merged ./vendor/_assets/merged
#
# Then, on the server:
#   bash scripts/deploy/assets.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

for p in "vendor/_assets/merged" "vendor/DDTank41/Source Flash/FlashSV1"; do
  if [ ! -d "$p" ]; then
    echo "missing: $p" >&2
    echo "upload it first (see the rsync commands in this script's header comment)." >&2
    exit 1
  fi
done

echo "==> docker compose --profile assets run --rm assets  (fix-maps.ts + gen-craters.ts -> apps/api/.data/uploads overlay)"
docker compose --profile assets run --rm assets

echo "==> done. Restart api so it re-reads the uploads overlay it may have cached at boot:"
echo "    docker compose restart api"
