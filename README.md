# OBELIX Menu v1

Arabic-first multi-client digital menu generator for **OBELIX Menu** (OBELIX Agency).

**What it is:** Mohamed creates branded clients in the **agency dashboard**, exports a **standalone client package** (public menu + client dashboard), and deploys each package on its own subdomain/domain/host.

**What it is not (v1):** ordering, cart, payment, AI scanner, analytics, SSO.

## Structure

```
apps/agency                 → Agency dashboard (create clients, Brand Kit, export)
packages/client-template    → Standalone client app template (menu + dashboard)
docker/                     → Agency Docker Compose (monorepo build)
deploy/                     → Caddy / Nginx subdomain snippets
HOSTINGER.md                → Hostinger VPS / shared deploy guide (AR + EN)
```

## Clone from GitHub (after you create the remote)

```bash
git clone https://github.com/<YOU>/<REPO>.git
cd <REPO>
git checkout cursor/obelix-menu-v1-579d   # feature branch; or main after merge

corepack enable
pnpm install
```

If this clone still points at Cursor’s temporary remote, after **Create repo** on GitHub:

```bash
git remote rename origin cursor-origin   # optional keep
git remote add origin https://github.com/<YOU>/<REPO>.git
git push -u origin cursor/obelix-menu-v1-579d
git push -u origin main
```

## Local development

Requires Node 20+ and [pnpm](https://pnpm.io).

```bash
pnpm install

# Agency — http://127.0.0.1:43121/login
# cp apps/agency/.env.example apps/agency/.env  # set AGENCY_PASSWORD + SESSION_SECRET
pnpm dev:agency

# Sample client (قهوة البيت) — http://127.0.0.1:43122
pnpm dev:client
```

### Agency flow

1. Open the agency → **عميل جديد**
2. Enter name, slug, logo, colors, **currency**, optional **menu background**, languages, dashboard password
3. Open the client → upload/replace background if needed → **توليد / تصدير الحزمة**
4. Download ZIP or use `apps/agency/generated/<slug>/` (logo + background assets included)

### Sample client

- Public menu: `/`
- Dashboard: `/dashboard` (password default: `obelix123`)
- Brand + menu live in `packages/client-template/data/`
- Uploads in `packages/client-template/public/uploads/`
- Client can manage banners, contacts, reviews, and override menu background under **الإعدادات**

### Rate Form email (optional)

Submissions always persist to the client dashboard. To also email the owner, set on the client host:

```bash
# Option A — Resend
RESEND_API_KEY=re_xxx
EMAIL_FROM="Cafe <noreply@yourdomain.com>"

# Option B — SMTP (e.g. Hostinger)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM="Cafe <noreply@yourdomain.com>"
```

Set the recipient under client dashboard → **الإعدادات** (`notificationEmail`).

## Deploy (Hostinger)

**Recommended:** Hostinger **VPS** + Docker Compose — agency subdomain + one subdomain per exported client.

Full Arabic + short English guide: **[HOSTINGER.md](./HOSTINGER.md)**  
Also see `deploy/caddy.Caddyfile` and `deploy/nginx.conf.snippet`.

Quick agency start on a VPS:

```bash
docker compose -f docker/docker-compose.agency.yml up -d --build
# listens on host PORT (default 43121) → container :3000
```

Quick client package (after export), on the same or another host:

```bash
cd /path/to/exported-client
cp .env.example .env   # DASHBOARD_PASSWORD, SESSION_SECRET, optional mail
PORT=3001 docker compose up -d --build
```

Shared / Node hosting is not recommended for the agency monorepo; a single client package may run as a Node app only if the host allows Node 20+, writable `data/` + `uploads/`, and a custom start command — details in `HOSTINGER.md` §5.

## Ordering (when agency enables it)

Agency flags on the client Brand Kit turn on cart, dine-in, delivery, **pickup**, POS, inventory, and purchasing. Owner dashboard then sets tax, loyalty stamps, delivery areas, seasonal note, combos, and prep chips.

- Pickup is an agency flag (`pickupEnabled`), same pattern as delivery.
- Tax, loyalty, delivery fees, and seasonal copy live in the **client owner** settings — not extra agency flags.
- Online pay (Paymob / Fawry / Tap / Moyasar) is a stub until gateway keys exist.
- POS chrome is frozen; tax only appears on totals and the thermal receipt.

## License

Private — OBELIX Agency.
