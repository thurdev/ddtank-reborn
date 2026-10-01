#!/usr/bin/env bash
# Kill whatever listens on the dev ports (Windows/Git Bash). Usage: scripts/free-ports.sh [ports...]
ports="${*:-8080 9200 9300 843 9400 5173 5174}"
for p in $ports; do
  for pid in $(netstat -ano | grep -E "[:.]$p[[:space:]].*LISTEN" | awk '{print $5}' | sort -u); do
    [ "$pid" != "0" ] && taskkill //PID "$pid" //F >/dev/null 2>&1 && echo "freed $p (pid $pid)"
  done
done
