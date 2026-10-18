#!/usr/bin/env bash
# 6600 equivalent of swf-text-audit.sh: exports every static text (DefineText/DefineEditText) of the
# served 6600 client SWFs (overlay first, vendor fallback) and lists the ones that look Turkish (diacritics
# or a common Turkish word with none). Output: research/i18n/swf-texts-6600/<swf>/ + research/i18n/swf-text-tr.tsv
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
V="$ROOT/vendor/DDT-6600/WebSimple/Flash_6600_v040"
O="$ROOT/apps/api/assets/flash6600"
OUT="$ROOT/research/i18n/swf-texts-6600"
JAR="$ROOT/vendor/_tools/ffdec/ffdec-cli.jar"
mkdir -p "$OUT"
list() { for f in "$V"/*.swf "$V"/ui/turkey/swf/*.swf; do rel="${f#$V/}"; [ -f "$O/$rel" ] && echo "$O/$rel" || echo "$f"; done; }
list | while read -r f; do
  name="$(basename "$f")"; d="$OUT/$name"
  [ -d "$d" ] && continue
  mkdir -p "$d"
  java -jar "$JAR" -export text "$d" "$f" >/dev/null 2>&1 || echo "fail $name"
done
# diacritics (strong signal) + common diacritic-less Turkish UI words (weak signal, word-boundary match)
TR_DIAC='[şŞçÇğĞıİöÖüÜ]'
TR_WORDS='\b(etkinlik|oyun|harika|tamam|kapat|iptal|devam|basla|başla|bugun|bugün|gorev|görev|odul|ödül|hediye|magaza|mağaza|arkadas|arkadaş|dusman|düşman|sunucu|giris|giriş|cikis|çikiş|kayit|kayıt|sifre|şifre|ayarlar|yardim|yardım|hakkinda|hakkında|bekleyin|yukleniyor|yükleniyor|tamamlandi|tamamlandı|gonder|gönder|mesaj|takim|takım|seviye|kazandin|kazandın|kaybettin|kaybettin)\b'
: > "$ROOT/research/i18n/swf-text-tr.tsv"
find "$OUT" -name "*.txt" | while read -r t; do
  if grep -qP "$TR_DIAC" "$t" || grep -qiP "$TR_WORDS" "$t"; then
    swf="${t#"$OUT"/}"; swf="${swf%%/*}"; id="$(basename "$t" .txt)"
    printf '%s\t%s\t%s\n' "$swf" "$id" "$(tr '\r\n' '  ' < "$t" | cut -c1-200)" >> "$ROOT/research/i18n/swf-text-tr.tsv"
  fi
done
echo "done: $(wc -l < "$ROOT/research/i18n/swf-text-tr.tsv") textos com turco"
