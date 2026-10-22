# Publishing a client (Hostinger shared · Passenger · Node 20)

Default hosting (rule from 22 Oct 2026): every client gets a **free link**
`https://menu.obelixagency.com/<slug>` on the OBELIX host. A client's own domain is a
paid add-on (agency client "Domain" field set to e.g. `menu.cafe.com`).

## New client
1. Agency → New client (Brand Kit, modules, strong owner password) → **Export**.
   The export writes `.env` (owner password + random `SESSION_SECRET` + `NEXT_BASE_PATH`)
   and `OBELIX-DEPLOY.json` (path, URL, remote folder). No secrets go into `brand.json`.
2. On your Mac, from the repo root:
   ```bash
   ./scripts/deploy-client.sh apps/agency/generated/<slug> --dry-run   # build only
   ./scripts/deploy-client.sh apps/agency/generated/<slug>             # build + upload
   ```
3. Hand over `https://menu.obelixagency.com/<slug>/dashboard/login` (user `owner`).
4. If the page looks stale: hPanel → Performance → CDN → Flush cache.

## Updating an existing client / the pilot
Same command. Updates **never** overwrite `data/`, `public/uploads/` or `.env` on the
server, and a backup is saved to `~/obelix-backups/<slug>-<timestamp>/` first.
Pilot: `./scripts/deploy-client.sh packages/client-template`

## Agency redeploys
When redeploying the agency app into `~/domains/menu.obelixagency.com/public_html`,
**exclude every client folder** (`/pilot` and each `/<slug>`), or you will delete clients.

## Reserved slugs
login, logout, api, clients, pilot, uploads, _next, dashboard, static, icons, generated, tmp
