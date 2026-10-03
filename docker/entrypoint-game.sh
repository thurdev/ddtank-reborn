#!/bin/sh
# Mirrors docker/entrypoint-api.sh: fail fast on prod-unsafe config instead of the library-level warn.
set -eu

if [ "${NODE_ENV:-development}" = "production" ]; then
  if [ "${DEV_ALLOW_ANY_TICKET:-false}" != "false" ]; then
    echo "entrypoint-game: DEV_ALLOW_ANY_TICKET must not be enabled in production." >&2
    exit 1
  fi
  if [ -z "${RSA_PRIVATE_KEY:-}" ] && [ -z "${RSA_PRIVATE_KEY_FILE:-}" ]; then
    echo "entrypoint-game: no RSA_PRIVATE_KEY/RSA_PRIVATE_KEY_FILE set (must match apps/api's — run" >&2
    echo "  scripts/gen-secrets.mjs, which writes the same generated key to both .env files)." >&2
    exit 1
  fi
  if [ "${RSA_USE_VENDOR_KEY:-true}" != "false" ]; then
    echo "entrypoint-game: RSA_USE_VENDOR_KEY must be \"false\" in production (set it in apps/game/.env)." >&2
    exit 1
  fi
fi

exec "$@"
