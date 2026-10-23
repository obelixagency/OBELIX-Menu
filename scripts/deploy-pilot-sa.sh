#!/usr/bin/env bash
# Build + publish the Saudi demo (SAR, VAT 15% incl.) at menu.obelixagency.com/pilot-sa.
# Same code as /pilot, its own data folder and dashboard password.
#
#   ./scripts/deploy-pilot-sa.sh --dry-run   # build only
#   ./scripts/deploy-pilot-sa.sh             # build + upload (first run ships the SA demo data)
#
# Dashboard password: PILOT_SA_PASSWORD=... ./scripts/deploy-pilot-sa.sh
# (if unset, a random one is generated and printed once — only used on the FIRST deploy;
# later deploys keep the server's .env.)
# After the first deploy, refresh demo content with: ./scripts/push-demo-data.sh sa
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TPL="$ROOT/packages/client-template"
WORK="$(mktemp -d)"; PKG="$WORK/pilot-sa"
mkdir -p "$PKG"
(cd "$TPL" && tar --exclude=./node_modules --exclude=./.next --exclude=./demo \
  --exclude=./public/uploads --exclude=./.env --exclude='./data/*.bak-*' -cf - .) | (cd "$PKG" && tar -xf -)
mkdir -p "$PKG/public/uploads"
cp "$TPL/public/uploads/logo-qahwa.svg" "$PKG/public/uploads/" 2>/dev/null || true
# Fresh runtime stores for a new app: no demo orders, stock or staff from the template.
node -e '
const fs=require("fs"),p=process.argv[1]+"/data/";
const o=JSON.parse(fs.readFileSync(p+"ordering.json","utf8")); o.orders=[]; fs.writeFileSync(p+"ordering.json",JSON.stringify(o,null,2));
const b=JSON.parse(fs.readFileSync(p+"brand.json","utf8")); delete b.dashboardPassword;
Object.assign(b,{slug:"pilot-sa",domain:"https://menu.obelixagency.com/pilot-sa"}); fs.writeFileSync(p+"brand.json",JSON.stringify(b,null,2));
for (const f of ["inventory.json","users.json","shifts.json","purchasing.json","loyalty.json"]) { try { fs.unlinkSync(p+f) } catch {} }
' "$PKG"
node "$ROOT/scripts/demo-seed.mjs" sa "$PKG"
rm -f "$PKG"/data/*.bak-*

PASS="${PILOT_SA_PASSWORD:-$(node -e 'console.log(require("crypto").randomBytes(9).toString("base64url"))')}"
cat > "$PKG/.env" <<ENV
# OBELIX Menu — Saudi pilot demo
DASHBOARD_PASSWORD=$PASS
SESSION_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')
NEXT_BASE_PATH=/pilot-sa
PORT=3000
ENV
cat > "$PKG/OBELIX-DEPLOY.json" <<JSON
{ "slug": "pilot-sa", "basePath": "/pilot-sa",
  "remoteDir": "~/domains/menu.obelixagency.com/public_html/pilot-sa",
  "publicUrl": "https://menu.obelixagency.com/pilot-sa" }
JSON
[ -z "${PILOT_SA_PASSWORD:-}" ] && echo "  dashboard (first deploy only): user owner · password $PASS"
exec "$ROOT/scripts/deploy-client.sh" "$PKG" "$@"
