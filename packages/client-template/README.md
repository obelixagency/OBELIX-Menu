# حزمة عميل OBELIX / OBELIX Client Package

منيوه رقمي + لوحة تحكم مستقلة عن داشبورد الوكالة.

Digital menu + client dashboard — standalone after export from the agency.

## عربي — التشغيل المحلي

```bash
pnpm install   # أو npm install
cp .env.example .env.local
pnpm dev       # المنفذ الافتراضي في القالب: 43122 محلياً / 3000 في Docker
```

- المنيو العام: `/`
- لوحة التحكم: `/dashboard` — كلمة المرور من `.env` أو `data/brand.json`

## عربي — النشر على ساب دومين (VPS)

1. ارفع محتويات هذا المجلد إلى السيرفر (SSH/SCP/FTP).
2. جهّز الدومين: `client.example.com` → IP السيرفر.
3. شغّل:

```bash
docker compose up -d --build
```

4. اربط البروكسي العكسي (Caddy أو Nginx) على المنفذ `3000`.

مثال Caddy:

```
client.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

الوكالة **غير مطلوبة** بعد الرفع — البيانات محلية في `data/` و`public/uploads/`.

## English — local

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

- Public menu: `/`
- Dashboard: `/dashboard` (password from env / brand.json)

## English — subdomain deploy

1. Upload this folder to the VPS.
2. DNS: `client.example.com` → server IP.
3. `docker compose up -d --build`
4. Reverse-proxy port `3000` (see repo `deploy/` snippets).

No runtime dependency on the agency host after deploy.

## Data

| Path | Purpose |
|------|---------|
| `data/brand.json` | Logo URL, colors, password, domain |
| `data/menu.json` | Categories + products |
| `public/uploads/` | Images |

## Ordering

Disabled in v1. See `src/lib/extensions/ordering.ts`.
