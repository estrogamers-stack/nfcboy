const VERSION = "nfcboy-v3-1-fix";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js?v=31",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// IMPORTANT: ROM IS NOT PRECACHED.
// That was the cause of the old TEST getting stuck.

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === "opaque")) {
      const cache = await caches.open(RUNTIME_CACHE);
      try { await cache.put(request, response.clone()); } catch (_) {}
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request, {ignoreSearch:true});
    return cached || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    const cache = await caches.open(RUNTIME_CACHE);
    try { await cache.put(request, response.clone()); } catch (_) {}
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // ROMS: ONLINE = always ask GitHub/network first.
  // OFFLINE = fall back to the last cached copy.
  if (url.pathname.includes("/rom/") &&
      (url.pathname.endsWith(".gb") ||
       url.pathname.endsWith(".gbc") ||
       url.pathname.endsWith(".gba"))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // EmulatorJS engine/core and static app files can be cache-first.
  event.respondWith(cacheFirst(request));
});
