const VERSION = "nfcboy-v4-robust-save";
const STATIC = `${VERSION}-static`;
const RUNTIME = `${VERSION}-runtime`;

const SHELL = [
  "./",
  "./index.html",
  "./app.js?v=40",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![STATIC, RUNTIME].includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request, {cache:"no-store"});
    if (response && (response.ok || response.type === "opaque")) {
      const cache = await caches.open(RUNTIME);
      try { await cache.put(request, response.clone()); } catch (_) {}
    }
    return response;
  } catch (_) {
    return (await caches.match(request, {ignoreSearch:true})) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, {ignoreSearch:false});
  if (cached) return cached;

  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    const cache = await caches.open(RUNTIME);
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

  // ROM: network-first when online, cached copy when offline.
  // Crucially, the URL itself stays stable; app.js no longer adds timestamps.
  if (
    url.pathname.includes("/rom/") &&
    (url.pathname.endsWith(".gb") ||
     url.pathname.endsWith(".gbc") ||
     url.pathname.endsWith(".gba"))
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // EmulatorJS engine/core and app shell.
  event.respondWith(cacheFirst(request));
});
