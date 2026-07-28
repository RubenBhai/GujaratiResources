// sw.js — Service Worker de "Piensa en Gujarati"
//
// DOS cachés con propósitos distintos:
//  1. ESTRUCTURAL (piensa-en-gujarati-vN): HTML, JS, CSS, JSON.
//     Red primero. Se versiona: al subir VERSION, se borra la vieja y todos
//     reciben el código nuevo.
//  2. MEDIOS (gujarati-media): audios e imágenes descargados por el usuario
//     para uso sin internet. Caché primero. NUNCA se borra al versionar,
//     para que lo que el usuario bajó para offline no se pierda en cada update.
//     El control de versión de cada archivo lo hace el loader con "?v=".

const CACHE_VERSION = 'v4';
const CACHE_ESTRUCTURAL = 'piensa-en-gujarati-' + CACHE_VERSION;
const CACHE_MEDIOS = 'gujarati-media';   // audios/imágenes descargados, estable


self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(
        nombres
          // Borra todo lo que NO sea la estructural actual NI la de medios.
          .filter(function (n) { return n !== CACHE_ESTRUCTURAL && n !== CACHE_MEDIOS; })
          .map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// ¿Es un recurso multimedia de la lección? (audio o imagen del repositorio)
function esMultimedia(url) {
  var p = url.pathname;
  return url.href.includes('rubenbhai.github.io') &&
         (p.endsWith('.mp3') || p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg'));
}

self.addEventListener('fetch', function (event) {
  const req = event.request;
  const url = new URL(req.url);

  // 1. MULTIMEDIA: caché primero. Si el usuario lo descargó, se sirve al
  //    instante desde 'gujarati-media'. Si NO está (modo "solo en línea"),
  //    se trae de la red y se muestra SIN guardarlo (no ocupa espacio).
  if (esMultimedia(url)) {
    event.respondWith(
      caches.match(req).then(function (enCache) {
        if (enCache) return enCache;
        return fetch(req);   // en línea, sin cachear
      })
    );
    return;
  }

  // 2. ESTRUCTURAL: red primero (código siempre fresco), caché de respaldo.
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Clave canónica: sin parámetros. El archivo (html/js/css/json) es el mismo
  // sin importar el ?leccion= o el ?t=; esos los lee el JavaScript en runtime.
  const cacheKey = url.origin + url.pathname;

  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(function (respuesta) {
        if (respuesta && respuesta.ok) {
          const clone = respuesta.clone();
          caches.open(CACHE_ESTRUCTURAL).then(function (cache) {
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
