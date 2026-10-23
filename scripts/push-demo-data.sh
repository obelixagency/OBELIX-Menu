#!/usr/bin/env bash
# Load the demo menu (items, photos, banners, brand look) onto a LIVE pilot.
# Code deploys never touch data/ or public/uploads/, so this is how demo content changes.
#
# Usage (on your Mac, from the repo root, photos in packages/client-template/demo/photos):
#   ./scripts/push-demo-data.sh eg              # → public_html/pilot
#   ./scripts/push-demo-data.sh sa              # → public_html/pilot-sa
#   ./scripts/push-demo-data.sh eg --dry-run    # check photos + pack, upload nothing
#
# On the server it backs up data/ + public/uploads/ to ~/obelix-backups/<slug>-demo-<stamp>/,
# runs scripts/demo-seed.mjs there (menu replaced, brand/ordering/branches merged,
# password/orders/tables kept) and restarts Passenger.
#
# Config: OBELIX_SSH, OBELIX_NODE as in deploy-client.sh.
set -euo pipefail

VARIANT="${1:-}"; DRY="${2:-}"
case "$VARIANT" in
  eg) SLUG=pilot ;;
  sa) SLUG=pilot-sa ;;
  *) echo "usage: $0 <eg|sa> [--dry-run]"; exit 1 ;;
esac
SSH_ARGS="${OBELIX_SSH:--p 65002 u856576437@147.93.92.242}"
NODE_BIN="${OBELIX_NODE:-/opt/alt/alt-nodejs20/root/usr/bin/node}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO="$ROOT/packages/client-template/demo"
REMOTE_DIR="domains/menu.obelixagency.com/public_html/$SLUG"

# Check every photo locally first (seed exits non-zero on a missing one).
CHECK="$(mktemp -d)"; mkdir -p "$CHECK/data"; echo "{}" > "$CHECK/data/brand.json"
node "$ROOT/scripts/demo-seed.mjs" "$VARIANT" "$CHECK" >/dev/null
rm -rf "$CHECK"

PACK="$(mktemp -d)/demo-$VARIANT"
mkdir -p "$PACK/scripts" "$PACK/packages/client-template/demo"
cp "$ROOT/scripts/demo-seed.mjs" "$PACK/scripts/"
cp -R "$DEMO/$VARIANT" "$DEMO/photos" "$PACK/packages/client-template/demo/"
TAR="$(dirname "$PACK")/demo-$VARIANT.tar.gz"
tar -C "$(dirname "$PACK")" -czf "$TAR" "demo-$VARIANT"
echo "▶ $VARIANT demo → $SLUG  ($(du -h "$TAR" | cut -f1))"
if [ "$DRY" = "--dry-run" ]; then echo "✓ dry run — nothing uploaded ($TAR)"; exit 0; fi

PORT=$(echo "$SSH_ARGS" | sed -n 's/.*-p \([0-9]*\).*/\1/p'); HOSTSPEC=$(echo "$SSH_ARGS" | awk '{print $NF}')
scp ${PORT:+-P $PORT} "$TAR" "$HOSTSPEC:~/demo-$VARIANT.tar.gz"
ssh $SSH_ARGS bash -s <<REMOTE
set -e
DIR="\$HOME/$REMOTE_DIR"
[ -f "\$DIR/app.js" ] || { echo "✗ \$DIR is not a deployed app — deploy the code first"; exit 1; }
STAMP=\$(date +%Y%m%d-%H%M%S)
BK="\$HOME/obelix-backups/$SLUG-demo-\$STAMP"
mkdir -p "\$BK"
cp -R "\$DIR/data" "\$BK/"
[ -d "\$DIR/public/uploads" ] && cp -R "\$DIR/public/uploads" "\$BK/" || true
echo "backup: \$BK"
TMP=\$(mktemp -d); tar -xzf "\$HOME/demo-$VARIANT.tar.gz" -C "\$TMP"
"$NODE_BIN" "\$TMP/demo-$VARIANT/scripts/demo-seed.mjs" "$VARIANT" "\$DIR"
rm -rf "\$TMP" "\$HOME/demo-$VARIANT.tar.gz"
mkdir -p "\$DIR/tmp" && touch "\$DIR/tmp/restart.txt"
REMOTE
URL="https://menu.obelixagency.com/$SLUG"
echo "✓ demo loaded → $URL"
echo "  smoke: $(curl -s -o /dev/null -w '%{http_code}' "$URL") menu · $(curl -s -o /dev/null -w '%{http_code}' "$URL/uploads/demo-espresso.jpg") photo"
echo "  If the page looks old: hPanel → Performance → CDN → Flush cache"
