#!/usr/bin/env bash
# Repacks every staged SWF (modified images only) into the API's flash overlay (vendor stays read-only).
set -u
ROOT="C:/Users/T/Documents/Projects/DDTank"
SP="C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad"
FFDEC="$ROOT/vendor/_tools/ffdec/ffdec-cli.jar"
SWFDIR="$ROOT/vendor/DDTank41/Source Flash/FlashSV1/ui/vietnam/swf"
STAGE="$SP/i18n/staged"
OVERLAY="$ROOT/apps/api/assets/flash/ui/vietnam/swf"

mkdir -p "$OVERLAY"
for d in "$STAGE"/*/; do
  name=$(basename "$d")
  [ "$name" = "_report.json" ] && continue
  src="$SWFDIR/$name"
  [ -f "$src" ] || { echo "[skip] no vendor source for $name"; continue; }
  out="$OVERLAY/$name"
  echo "[pack] $name"
  # --add-opens: some vendor SWFs embed CMYK JPEGs; ffdec's CMYK reader needs reflective access to the JDK's
  # internal JPEG decoder that JPMS blocks by default on modern JDKs (java.lang.IllegalAccessError otherwise).
  java --add-opens java.desktop/com.sun.imageio.plugins.jpeg=ALL-UNNAMED -jar "$FFDEC" -importImages "$src" "$out" "$d" >>"$SP/i18n/pack.log" 2>&1
  if [ -f "$out" ]; then echo "  -> $(du -h "$out" | cut -f1)"; else echo "  !! FAILED, see $SP/i18n/pack.log"; fi
done
