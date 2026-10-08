#!/usr/bin/env bash
# Stops the hf-queue server (port 7788), backs up state, applies tools/remaster/_pending-rejects.json, starts it again.
# Run from the repo root between loop batches (never while a loop batch is running).
set -e
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 7788 -State Listen -ErrorAction SilentlyContinue | % { Stop-Process -Id \$_.OwningProcess -Force }" || true
sleep 1
cp remaster/_auto/state.json remaster/_auto/state.backup.json
node tools/remaster/apply-pending.mjs
nohup node tools/remaster/hf-queue.mjs > remaster/_auto/queue.log 2>&1 &
for i in $(seq 1 30); do curl -s localhost:7788/status && echo && exit 0; sleep 1; done
echo "queue did not come up"; exit 1
