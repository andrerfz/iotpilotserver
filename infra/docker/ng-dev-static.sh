#!/bin/sh
set -e

# Alpine apk nginx puts virtual-host configs in http.d/ (included inside http {})
# Substitute only ${NG_API_URL} — nginx variables ($uri, $host, etc.) are left as-is
NG_API_URL="${NG_API_URL:-http://iotpilot-backend:3100}" \
  envsubst '${NG_API_URL}' \
  < /etc/nginx/templates/frontend-ng-dev.conf.template \
  > /etc/nginx/http.d/default.conf

# Ensure the build output directory exists; nginx needs it on startup
mkdir -p /app/apps/frontend-ng/www

# Placeholder served until the first successful build (~30s)
cat > /app/apps/frontend-ng/www/index.html << 'HTML'
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Building…</title>
<style>body{background:#111;color:#888;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{text-align:center}.dot{animation:blink 1s infinite}.dot:nth-child(2){animation-delay:.3s}.dot:nth-child(3){animation-delay:.6s}
@keyframes blink{0%,80%,100%{opacity:0}40%{opacity:1}}</style></head>
<body><div class="box"><p>Building Angular app…</p><p><span class="dot">●</span> <span class="dot">●</span> <span class="dot">●</span></p>
<p style="font-size:12px">Refresh when ready (first build ~30s)</p></div></body></html>
HTML

# Start nginx in background; logs go to stdout/stderr via symlinks set by Alpine nginx
nginx

echo "[ng-dev-static] nginx started, beginning ng build --watch"
echo "[ng-dev-static] Refresh your browser after each successful build"

# Watch-build: outputs to www/ — nginx picks up each new build
exec ng build --watch --configuration=development --poll=2000
