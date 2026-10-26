#!/bin/sh
# Smoke trang thật trên GitHub Pages: trang chủ có nội dung và mọi JS/CSS nó trỏ tới đều trả 200.
set -eu
BASE="${PAGES_URL:-https://silver-rp.github.io/thue-cho-thue/}"
ORIGIN=$(printf '%s' "$BASE" | sed -E 's#^(https?://[^/]+).*#\1#')
html=$(curl -fsS "$BASE")
printf '%s' "$html" | grep -q 'Thuế cho thuê' || { echo "thiếu tiêu đề"; exit 1; }
assets=$(printf '%s' "$html" | grep -oE '/thue-cho-thue/assets/[^"]+\.(js|css)' | sort -u)
[ -n "$assets" ] || { echo "không thấy JS/CSS"; exit 1; }
for a in $assets; do
  curl -fsS -o /dev/null "$ORIGIN$a" || { echo "lỗi tải $a"; exit 1; }
done
echo "ok: $(printf '%s\n' "$assets" | wc -l | tr -d ' ') tài nguyên"
