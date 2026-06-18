// Service worker mínimo para que la app sea instalable (PWA).
// Estrategia: cachea solo estáticos versionados e iconos (cache-first); las
// navegaciones y peticiones de datos van siempre a la red, para no servir HTML
// con un estado de sesión obsoleto.
const STATIC_CACHE = "cuentas-claras-static-v1";
const STATIC_MATCH = /\.(?:png|ico|svg|webmanifest|woff2?)$/;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  const isStatic =
    url.pathname.startsWith("/assets/") || STATIC_MATCH.test(url.pathname);
  if (!isStatic) {
    return; // navegaciones/datos: red directa, sin cache
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
