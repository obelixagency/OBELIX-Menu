/* OBELIX POS offline service worker — cache shell + catalog GETs */
/* global self, caches, fetch, Response */

const CACHE = "obelix-pos-v2";

function scopeBase() {
  try {
    const u = new URL(self.registration.scope);
    return u.pathname.replace(/\/$/, "") || "";
  } catch {
    return "";
  }
}

self.addEventListener("install", (event) => {
  const base = scopeBase();
  const urls = [`${base}/pos`, `${base}/pos-sw.js`].filter(Boolean);
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(urls).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone()).catch(() => undefined);
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone()).catch(() => undefined);
      return res;
    })
    .catch(() => undefined);
  return cached || network || fetch(request);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;
  const base = scopeBase();
  const underApp = !base || path === base || path.startsWith(`${base}/`);

  if (!underApp) return;

  // Catalog / shifts — network first, cache fallback (offline POS shell)
  if (
    path.includes("/api/pos/catalog") ||
    path.endsWith("/api/shifts") ||
    path.includes("/api/shifts?")
  ) {
    event.respondWith(networkFirst(req));
    return;
  }

  // POS page + Next static assets
  if (
    path.endsWith("/pos") ||
    path.includes("/pos/") ||
    path.includes("/_next/static/") ||
    path.includes("/uploads/")
  ) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
