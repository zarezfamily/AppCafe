// Etiove Service Worker — PWA offline shell
// Versión: incrementar para forzar actualización del caché
const CACHE_VERSION = 'etiove-v4';

// Assets del shell que se cachean en la instalación (siempre disponibles offline)
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/comunidad.html',
  '/blog/',
  '/favicon.png',
  '/favicon-48x48.png',
  '/quiz.js',
  '/favicon.svg',
  '/favicon.ico',
  '/icon.png',
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/site.webmanifest',
  '/404.html',
];

// ── Instalación: cachear shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activación: limpiar cachés viejos ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: estrategia por tipo de recurso ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar peticiones al mismo origen
  if (url.origin !== self.location.origin) return;

  // Peticiones a Firebase/API — siempre red, sin caché
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firestore') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('identitytoolkit')) {
    return;
  }

  // HTML — Network first, caché como fallback
  if (request.headers.get('accept')?.includes('text/html') ||
      request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request)
          .then((cached) => cached || caches.match('/404.html')))
    );
    return;
  }

  // JS, CSS, fuentes, imágenes — Cache first, red como fallback
  if (['script', 'style', 'font', 'image'].includes(request.destination)) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok && response.status < 400) {
              const clone = response.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(request, clone));
            }
            return response;
          });
        })
    );
    return;
  }
});
