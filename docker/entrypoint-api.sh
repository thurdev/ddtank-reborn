#!/bin/sh
# Fails fast, before the server binds a port, instead of the soft warn-and-keep-running behavior
# apps/api/src/config.ts and app.ts have for these same conditions (they log and let logins fail
# instead of crashing, which is the right call for a library but the wrong one for a container).
set -eu

if [ "${NODE_ENV:-development}" = "production" ]; then
  if [ -z "${JWT_SECRET:-}" ]; then
    echo "entrypoint-api: JWT_SECRET is required in production (scripts/gen-secrets.mjs generates one)." >&2
    exit 1
  fi
  if [ -z "${RSA_PRIVATE_KEY:-}" ] && [ -z "${RSA_PRIVATE_KEY_FILE:-}" ]; then
    echo "entrypoint-api: no RSA_PRIVATE_KEY/RSA_PRIVATE_KEY_FILE set." >&2
    echo "  Production must not fall back to the vendor key. Run scripts/gen-secrets.mjs (it also" >&2
    echo "  runs patch-client-key so the served client matches the generated key) and re-deploy." >&2
    exit 1
  fi
  if [ "${RSA_USE_VENDOR_KEY:-true}" != "false" ]; then
    echo "entrypoint-api: RSA_USE_VENDOR_KEY must be \"false\" in production (set it in apps/api/.env)." >&2
    exit 1
  fi
fi

exec "$@"
