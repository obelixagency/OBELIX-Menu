# نشر OBELIX Menu على Hostinger

**EN summary (short):** Use a **Hostinger VPS** with Docker Compose. Run the **agency** from the monorepo on one subdomain, and each **exported client package** on its own subdomain (same VPS, different ports, or separate VPS). Shared / Node hosting is a poor fit for this stack — see §4.

---

## 1) التوصية (موصى بها)

| الخيار | مناسب؟ | لماذا |
|--------|--------|--------|
| **Hostinger VPS** + Docker | ✅ نعم | Next.js 15، حزم متعددة، بورتات، SSL، تثبيت كامل |
| Hostinger Shared / Node App | ⚠️ محدود | وكالة المونوريبو تحتاج Docker/خروج؛ عميل واحد ممكن بصعوبة |
| Hostinger WordPress فقط | ❌ لا | ليس ووردبريس |

**المسار الأفضل لمحمد:** VPS واحد → `agency.yourdomain.com` للوكالة → لكل عميل `menu-client.yourdomain.com` بعد التصدير.

---

## 2) بعد ربط GitHub (Clone)

عندما تنشئ الريبو على GitHub وتربطه (Create repo في Cursor أو `git remote add`):

```bash
# على جهازك أو على الـ VPS
git clone https://github.com/<YOU>/<REPO>.git
cd <REPO>
git checkout cursor/obelix-menu-v1-579d   # أو main بعد الدمج

# تثبيت محلي للتجربة (اختياري)
corepack enable
pnpm install
pnpm dev:agency   # :43121
pnpm dev:client   # :43122
```

رفع أحدث كود للـ VPS لاحقاً:

```bash
cd /opt/obelix-menu   # مسار النسخة على السيرفر
git pull origin main  # أو اسم الفرع الذي تستخدمه للإنتاج
```

---

## 3) Hostinger VPS — الوكالة (Agency)

### متطلبات
- Ubuntu 22.04+ على VPS
- Docker + Docker Compose plugin
- دومين/ساب دومين يشير لـ IP السيرفر (A record)

```bash
# مثال تثبيت Docker (مرة واحدة)
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER   # ثم أعد تسجيل الدخول
```

### بناء وتشغيل الوكالة

من **جذر الريبو** (المونوريبو):

```bash
cd /opt/obelix-menu
git pull

# المنفذ العام على الهوست (داخل الـ container يبقى 3000)
export PORT=43121
docker compose -f docker/docker-compose.agency.yml up -d --build
```

- التطبيق يستمع محلياً على `127.0.0.1:43121`
- البيانات: `apps/agency/data/`
- الحزم المُصدَّرة: `apps/agency/generated/<slug>/`

### متغيرات البيئة (وكالة) — إلزامي للإنتاج

داشبورد الوكالة محمية بكلمة مرور. ضع في `.env` بجوار تشغيل الوكالة (أو في لوحة Hostinger / Passenger):

```bash
AGENCY_PASSWORD=strong-random-password
SESSION_SECRET=long-random-secret
```

- صفحة الدخول: `/login`
- بدون جلسة صحيحة: الصفحات → تحويل لـ `/login`، وواجهات `/api/*` → `401`
- لا ترفع `.env` للعامة؛ امنع فهرسة المجلدات (`Options -Indexes`)
- حزم العملاء المُصدَّرة ما زالت تستخدم `DASHBOARD_PASSWORD` + `SESSION_SECRET` على مضيف العميل

### DNS
- `agency.yourdomain.com` → A → IP الـ VPS

### reverse proxy + SSL

**Caddy** (أسهل — SSL تلقائي): انسخ وعدّل `deploy/caddy.Caddyfile`:

```caddy
agency.yourdomain.com {
	reverse_proxy 127.0.0.1:43121
}
```

ثم:

```bash
sudo caddy run --config /etc/caddy/Caddyfile
# أو ثبّت كخدمة systemd
```

**Nginx** + Certbot: استخدم `deploy/nginx.conf.snippet` ثم:

```bash
sudo certbot --nginx -d agency.yourdomain.com
```

---

## 4) Hostinger VPS — حزمة عميل (Client package)

كل عميل = حزمة مستقلة بعد **توليد / تصدير** من الوكالة (ZIP أو مجلد `generated/<slug>/`).

### نفس الـ VPS (موصى به للبداية)

```bash
# انسخ الحزمة
sudo mkdir -p /opt/obelix-clients
sudo unzip qahwa-elbeit.zip -d /opt/obelix-clients/qahwa-elbeit
cd /opt/obelix-clients/qahwa-elbeit

cp .env.example .env
nano .env   # انظر المتغيرات أدناه

# منفذ مختلف لكل عميل على نفس السيرفر
export PORT=3001
docker compose up -d --build
```

| عميل | مثال منفذ | ساب دومين |
|------|-----------|-----------|
| وكالة | 43121 | agency.… |
| قهوة البيت | 3001 | menu-qahwa.… |
| عميل 2 | 3002 | menu-2.… |

### متغيرات `.env` للعميل

```bash
DASHBOARD_PASSWORD=strong-password-here
PORT=3001
SESSION_SECRET=long-random-string

# اختياري — إيميل نتائج Rate Form
# RESEND_API_KEY=re_xxx
# EMAIL_FROM="Cafe <noreply@yourdomain.com>"
# أو SMTP:
# SMTP_HOST=smtp.hostinger.com
# SMTP_PORT=465
# SMTP_USER=...
# SMTP_PASS=...
# EMAIL_FROM="Cafe <noreply@yourdomain.com>"
```

الإيميل المستلم يُضبط من داشبورد العميل → **الإعدادات** (`notificationEmail`). بدون SMTP/Resend تُحفظ التقييمات في الداشبورد فقط.

### DNS + proxy للعميل

```caddy
menu-qahwa.yourdomain.com {
	reverse_proxy 127.0.0.1:3001
}
```

Nginx: غيّر `server_name` و `proxy_pass` في `deploy/nginx.conf.snippet` ثم Certbot.

`client_max_body_size 10M;` مهم لرفع اللوجو/الخلفية/البانرات.

---

## 5) Hostinger Shared / Node hosting

| السيناريو | الحكم |
|-----------|--------|
| تشغيل **الوكالة** من المونوريبو على Shared | ❌ غير عملي (Docker، مجلدات generated، بورتات) |
| تشغيل **عميل واحد** عبر Node app (build + start) | ⚠️ ممكن إن وفر Hostinger Node 20+ و start command |
| عدة عملاء + وكالة | ✅ **VPS فقط** |

### أبسط مسار Shared لعميل واحد (إن أصررت)

1. صدّر الحزمة من الوكالة محلياً.
2. ارفع مجلد الحزمة (بدون `node_modules`).
3. في لوحة Node:
   - Build: `pnpm install && pnpm build` (أو npm)
   - Start: `pnpm start` / `node server.js` بعد standalone build
   - Env: `DASHBOARD_PASSWORD`, `SESSION_SECRET`, اختياري mail
4. اربط الدومين من لوحة Hostinger.

**ملاحظة:** رفع الملفات (`public/uploads`) وكتابة `data/*.json` تحتاج صلاحية كتابة — تأكد أن الاستضافة تسمح بذلك، وإلا استخدم VPS.

---

## 6) قائمة تحقق سريعة

1. [ ] إنشاء ريبو GitHub وربطه  
2. [ ] `git clone` على الـ VPS  
3. [ ] Docker يعمل  
4. [ ] Agency: `docker compose -f docker/docker-compose.agency.yml up -d --build`  
5. [ ] DNS `agency.…` + Caddy/Nginx + SSL  
6. [ ] إنشاء عميل من الوكالة → تصدير  
7. [ ] Client: `docker compose up -d --build` على منفذ خاص  
8. [ ] DNS `menu-….` + proxy + SSL  
9. [ ] اختياري: SMTP/Resend + إيميل في إعدادات العميل  

---

## 7) ملفات مساعدة في الريبو

| ملف | دور |
|-----|-----|
| `docker/docker-compose.agency.yml` | تشغيل الوكالة |
| `docker/agency.Dockerfile` | بناء الوكالة من جذر المونوريبو |
| `packages/client-template/docker-compose.yml` | قالب حزمة العميل (يُنسخ عند التصدير) |
| `deploy/caddy.Caddyfile` | أمثلة ساب دومين |
| `deploy/nginx.conf.snippet` | أمثلة Nginx |
| `HOSTINGER.md` | هذا الدليل |

أسئلة سريعة: المنفذ الداخلي للتطبيقات دائماً **3000** داخل الحاوية؛ المنفذ على الهوست تضبطه بـ `PORT=…` في الـ compose.
