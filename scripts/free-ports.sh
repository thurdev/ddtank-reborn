#!/usr/bin/env bash
# Kill whatever listens on the dev ports (Windows/Git Bash). Usage: scripts/free-ports.sh [ports...]
ports="${*:-8080 9200 9300 843 9400 5173 5174}"
for p in $ports; do
  for pid in $(netstat -ano | grep -E "[:.]$p[[:space:]].*LISTEN" | awk '{print $5}' | sort -u); do
    [ "$pid" != "0" ] && taskkill //PID "$pid" //F >/dev/null 2>&1 && echo "freed $p (pid $pid)"
  done
done
# Also kill orphaned dev watchers of THIS repo (tsx watch / vite) that respawn and grab ports again.
powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { \$_.CommandLine -match 'DDTank' -and \$_.CommandLine -match 'tsx|vite|serve-pg' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force; Write-Output ('killed watcher ' + \$_.ProcessId) }" 2>/dev/null
# Embedded Postgres can leave an orphan child holding 5432 after a hard kill: kill repo postgres + stale pid file.
if [ "${KEEP_DB:-0}" != "1" ] && [[ " $ports " == *" 5432 "* ]]; then
  powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='postgres.exe'\" | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" 2>/dev/null
  rm -f "$(dirname "$0")/../packages/db/.data/pg/postmaster.pid"
fi
