#!/usr/bin/env bash
# Exports every static text (DefineText/DefineEditText) of the served client SWFs (overlay first, vendor fallback)
# and lists the ones with Vietnamese diacritics. Output: research/i18n/swf-texts/<swf>/ + research/i18n/swf-text-vn.tsv
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
V="$ROOT/vendor/DDTank41/Source Flash/FlashSV1"
O="$ROOT/apps/api/assets/flash"
OUT="$ROOT/research/i18n/swf-texts"
JAR="$ROOT/vendor/_tools/ffdec/ffdec-cli.jar"
mkdir -p "$OUT"
list() { for f in "$V"/*.swf "$V"/*.png "$V"/ui/vietnam/swf/*.swf; do rel="${f#$V/}"; [ -f "$O/$rel" ] && echo "$O/$rel" || echo "$f"; done; }
list | while read -r f; do
  name="$(basename "$f")"; d="$OUT/$name"
  [ -d "$d" ] && continue
  mkdir -p "$d"
  java -jar "$JAR" -export text "$d" "$f" >/dev/null 2>&1 || echo "fail $name"
done
VN='[ăắằẳẵặâấầẩẫậđêếềểễệôốồổỗộơớờởỡợưứừửữựạảẹẻẽịỉọỏụủỳỵỷỹĂÂĐÊÔƠƯ]'
: > "$ROOT/research/i18n/swf-text-vn.tsv"
find "$OUT" -name "*.txt" | while read -r t; do
  if grep -qP "$VN" "$t"; then swf="${t#"$OUT"/}"; swf="${swf%%/*}"; id="$(basename "$t" .txt)"; printf '%s\t%s\t%s\n' "$swf" "$id" "$(tr '\r\n' '  ' < "$t" | cut -c1-160)" >> "$ROOT/research/i18n/swf-text-vn.tsv"; fi
done
echo "done: $(wc -l < "$ROOT/research/i18n/swf-text-vn.tsv") textos com vietnamita"
