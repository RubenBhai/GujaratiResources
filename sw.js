// sw.js — Service Worker de "Piensa en Gujarati"
//
// Estrategia: red primero, caché de respaldo.
// - Si hay internet: siempre pide la versión más fresca (igual que ya hacías
//   con tus fetch de no-store), y de paso la guarda en caché.
// - Si NO hay internet: usa la última versión que sí se guardó en caché.
//
// Nota importante: tus fetch de JSON usan "?t=" + Date.now() para forzar
// que siempre sean frescos. Eso significa que cada petición tiene una URL
// distinta. Si guardáramos en caché con esa URL exacta, el modo offline
// nunca encontraría nada (la próxima vez el "?t=" sería otro). Por eso,
// para guardar/buscar en caché usamos la URL SIN esa parte del query string.

const CACHE_VERSION = 'v1';
const CACHE_NAME = 'piensa-en-gujarati-' + CACHE_VERSION;

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(
        nombres
          .filter(function (n) { return n !== CACHE_NAME; })
          .map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  const url = new URL(req.url);

  // Solo manejamos GET de nuestro propio sitio (no tocamos audios/imágenes
  // de rubenbhai.github.io si el sitio corre en otro dominio, ni llamadas
  // a APIs externas como Gemini).
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Clave de caché sin el parámetro de cache-busting "t"
  url.searchParams.delete('t');
  const cacheKey = new Request(url.toString(), { headers: req.headers });

  event.respondWith(
    fetch(req)
      .then(function (respuesta) {
        if (respuesta && respuesta.ok) {
          const clone = respuesta.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(cacheKey, clone);
          });
        }
        return respuesta;
      })
      .catch(function () {
        return caches.match(cacheKey).then(function (enCache) {
          return enCache || Response.error();
        });
      })
  );
});
