#!/usr/bin/env bash
# Exports images from every client SWF (ui/vietnam/swf/*.swf + Loading/DDT_Loading/1-3.png-as-swf) via FFDec.
# Skips SWFs whose output dir already exists and is non-empty (resumable).
set -u
ROOT="C:/Users/T/Documents/Projects/DDTank"
SP="C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad"
FFDEC="$ROOT/vendor/_tools/ffdec/ffdec-cli.jar"
OUT="$SP/i18n/ffdec_out"
SWFDIR="$ROOT/vendor/DDTank41/Source Flash/FlashSV1/ui/vietnam/swf"
LOADDIR="$SP/i18n/loading_src"

mkdir -p "$OUT"
log() { echo "[$(date +%H:%M:%S)] $*"; }

count=0
total=$(ls "$SWFDIR"/*.swf "$LOADDIR"/*.swf 2>/dev/null | wc -l)
for f in "$SWFDIR"/*.swf "$LOADDIR"/*.swf; do
  [ -f "$f" ] || continue
  name=$(basename "$f")
  dest="$OUT/$name"
  count=$((count+1))
  if [ -d "$dest" ] && [ "$(ls -A "$dest" 2>/dev/null | wc -l)" -gt 0 ]; then
    log "[$count/$total] skip (already exported) $name"
    continue
  fi
  log "[$count/$total] exporting $name"
  java -jar "$FFDEC" -export image "$dest" "$f" >>"$OUT/_export.log" 2>&1
done
log "done. image dirs: $(ls "$OUT" | wc -l)"
