// Memory Garden service worker: offline-friendly caching.
// - Static assets: cache-first.  - Already-seen Cloudinary images (signed, immutable): cache-first.
// - Patient pages (/play): network-first with a cached fallback.  - API and caregiver pages: never cached.
const VERSION = "mg-v1";
const STATIC = `${VERSION}-static`;
const IMAGES = `${VERSION}-images`;
const PAGES = `${VERSION}-pages`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(["/offline"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

async function trim(cache, max) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

async function cacheFirst(req, name, max) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === "opaque") {
      cache.put(req, res.clone());
      trim(cache, max);
    }
    return res;
  } catch (err) {
    return hit || Response.error();
  }
}

async function networkFirst(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await cache.match("/offline"));
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "res.cloudinary.com") return event.respondWith(cacheFirst(req, IMAGES, 400));
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/static/") || /\.(woff2?|png|svg|ico)$/.test(url.pathname)) {
    return event.respondWith(cacheFirst(req, STATIC, 300));
  }
  if (req.mode === "navigate" && (url.pathname === "/play" || url.pathname.startsWith("/play/"))) {
    return event.respondWith(networkFirst(req));
  }
});
