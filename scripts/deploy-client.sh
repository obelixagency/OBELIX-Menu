#!/usr/bin/env bash
# Build + publish ONE OBELIX Menu client to Hostinger shared hosting (Passenger + Node 20).
#
# Usage (run on your Mac from the repo root):
#   ./scripts/deploy-client.sh <client-package-dir> [--dry-run]
#
#   <client-package-dir>  = the folder exported by the agency
#                           (apps/agency/generated/<slug>/ or an unzipped export ZIP)
#                           — or packages/client-template for the /pilot demo.
#
# What it does:
#   1. Reads OBELIX-DEPLOY.json + .env from the package (basePath, remote folder).
#   2. Installs deps and builds a Next.js standalone bundle with that basePath.
#   3. Packs server + static + public + app.js (Passenger entry) + .htaccess.
#   4. Uploads over SSH and extracts into the remote folder.
#      FIRST deploy: ships data/ and .env.  UPDATES: never touches data/,
#      public/uploads/ or .env on the server (client data is kept).
#   5. Restarts Passenger (tmp/restart.txt).
#
# Config (env vars):
#   OBELIX_SSH   default: "-p 65002 u856576437@147.93.92.242"
#   OBELIX_NODE  default: /opt/alt/alt-nodejs20/root/usr/bin/node
set -euo pipefail

PKG="${1:-}"
DRY="${2:-}"
[ -z "$PKG" ] && { echo "usage: $0 <client-package-dir> [--dry-run]"; exit 1; }
PKG="$(cd "$PKG" && pwd)"
SSH_ARGS="${OBELIX_SSH:--p 65002 u856576437@147.93.92.242}"
NODE_BIN="${OBELIX_NODE:-/opt/alt/alt-nodejs20/root/usr/bin/node}"
HERE="$(cd "$(dirname "$0")" && pwd)"

# ---------- 1) read deploy config
if [ -f "$PKG/OBELIX-DEPLOY.json" ]; then
  SLUG=$(node -e 'console.log(require(process.argv[1]).slug)' "$PKG/OBELIX-DEPLOY.json")
  BASE=$(node -e 'console.log(require(process.argv[1]).basePath||"")' "$PKG/OBELIX-DEPLOY.json")
  REMOTE_DIR=$(node -e 'console.log(require(process.argv[1]).remoteDir)' "$PKG/OBELIX-DEPLOY.json")
  PUBLIC_URL=$(node -e 'console.log(require(process.argv[1]).publicUrl)' "$PKG/OBELIX-DEPLOY.json")
else
  # pilot demo (packages/client-template)
  SLUG=pilot; BASE=/pilot
  REMOTE_DIR="~/domains/menu.obelixagency.com/public_html/pilot"
  PUBLIC_URL="https://menu.obelixagency.com/pilot"
fi
echo "▶ $SLUG  basePath='${BASE}'  →  $PUBLIC_URL"
echo "  remote: $REMOTE_DIR"

# ---------- 2) build in a clean temp copy (flat standalone output)
WORK="$(mktemp -d)"
BUILD="$WORK/app"
mkdir -p "$BUILD"
(cd "$PKG" && tar --exclude=./node_modules --exclude=./.next --exclude=./.git -cf - .) | (cd "$BUILD" && tar -xf -)
cd "$BUILD"
rm -f pnpm-lock.yaml
npm install --no-audit --no-fund --loglevel=error
NEXT_BASE_PATH="$BASE" NEXT_TELEMETRY_DISABLED=1 npx next build

# ---------- 3) assemble release
OUT="$WORK/release"
mkdir -p "$OUT"
cp -R .next/standalone/. "$OUT/"
mkdir -p "$OUT/.next"
cp -R .next/static "$OUT/.next/static"
mkdir -p "$OUT/public"; cp -R public/. "$OUT/public/"
cp "$HERE/app.js" "$OUT/app.js"
mkdir -p "$OUT/tmp" "$OUT/data"
cp -R data/. "$OUT/data/" 2>/dev/null || true
[ -f .env ] && cp .env "$OUT/.env"

if [ "$DRY" = "--dry-run" ]; then REMOTE_HOME="/home/USER"; else REMOTE_HOME=$(ssh $SSH_ARGS 'echo $HOME'); fi
ABS_DIR="${REMOTE_DIR/#\~/$REMOTE_HOME}"
{
  echo "PassengerEnabled on"
  echo "PassengerAppRoot $ABS_DIR"
  [ -n "$BASE" ] && echo "PassengerBaseURI $BASE"
  echo "PassengerAppType node"
  echo "PassengerStartupFile app.js"
  echo "PassengerNodejs $NODE_BIN"
  echo "Options -Indexes"
  echo '<FilesMatch "^\.(env|dashboard-secret)">'
  echo "  Require all denied"
  echo "</FilesMatch>"
  echo 'RedirectMatch 404 ^.*/data/.*$'
} > "$OUT/.htaccess"

TAR="$(dirname "$OUT")/$SLUG-release.tar.gz"
tar -C "$OUT" -czf "$TAR" .
echo "  package: $TAR ($(du -h "$TAR" | cut -f1))"

if [ "$DRY" = "--dry-run" ]; then
  echo "✓ dry run — nothing uploaded"; echo "  release dir: $OUT"; exit 0
fi

# ---------- 4) upload + extract (keep client data on updates)
PORT=$(echo "$SSH_ARGS" | sed -n 's/.*-p \([0-9]*\).*/\1/p'); HOSTSPEC=$(echo "$SSH_ARGS" | awk '{print $NF}')
scp ${PORT:+-P $PORT} "$TAR" "$HOSTSPEC:~/$SLUG-release.tar.gz"
ssh $SSH_ARGS bash -s <<REMOTE
set -e
DIR="$ABS_DIR"
STAMP=\$(date +%Y%m%d-%H%M%S)
mkdir -p "\$DIR"
if [ -f "\$DIR/app.js" ] || [ -f "\$DIR/server.js" ]; then
  echo "update: backing up data + .env"
  mkdir -p "\$HOME/obelix-backups/$SLUG-\$STAMP"
  cp -R "\$DIR/data" "\$DIR/.env" "\$HOME/obelix-backups/$SLUG-\$STAMP/" 2>/dev/null || true
  [ -d "\$DIR/public/uploads" ] && cp -R "\$DIR/public/uploads" "\$HOME/obelix-backups/$SLUG-\$STAMP/" || true
  TMP=\$(mktemp -d); tar -xzf "\$HOME/$SLUG-release.tar.gz" -C "\$TMP"
  rm -rf "\$TMP/data" "\$TMP/.env"; rm -rf "\$TMP/public/uploads"
  # replace code, keep data/, uploads, .env
  find "\$DIR" -mindepth 1 -maxdepth 1 ! -name data ! -name public ! -name .env ! -name tmp -exec rm -rf {} +
  [ -d "\$DIR/public" ] && find "\$DIR/public" -mindepth 1 -maxdepth 1 ! -name uploads -exec rm -rf {} + || true
  cp -R "\$TMP/." "\$DIR/"
  rm -rf "\$TMP"
else
  echo "first deploy"
  tar -xzf "\$HOME/$SLUG-release.tar.gz" -C "\$DIR"
fi
chmod 600 "\$DIR/.env" 2>/dev/null || true
mkdir -p "\$DIR/tmp" && touch "\$DIR/tmp/restart.txt"
rm -f "\$HOME/$SLUG-release.tar.gz"
REMOTE

echo "✓ deployed → $PUBLIC_URL"
echo "  smoke: $(curl -s -o /dev/null -w '%{http_code}' "$PUBLIC_URL") menu · $(curl -s -o /dev/null -w '%{http_code}' "$PUBLIC_URL/dashboard/login") login"
echo "  If the page looks old: hPanel → Performance → CDN → Flush cache"
