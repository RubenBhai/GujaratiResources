// sw.js — Service Worker de "Piensa en Gujarati"
//
// TRES cachés con propósitos distintos:
//  1. ESTRUCTURAL (piensa-en-gujarati-vN): HTML, JS, CSS, JSON vistos en línea.
//     Red primero. Se versiona: al subir VERSION, se borra la vieja y todos
//     reciben el código nuevo.
//  2. MEDIOS (gujarati-media): audios e imágenes descargados por el usuario
//     para uso sin internet. Caché primero. NUNCA se borra al versionar,
//     para que lo que el usuario bajó para offline no se pierda en cada update.
//     El control de versión de cada archivo lo hace el loader con "?v=".
//  3. MOTOR (gujarati-motor): el motor completo que baja main_loader.js.
//     Tampoco se borra al versionar: main_loader lo mantiene al día.

const CACHE_VERSION = 'v20';
const CACHE_ESTRUCTURAL = 'piensa-en-gujarati-' + CACHE_VERSION;
const CACHE_MEDIOS = 'gujarati-media';   // audios/imágenes descargados, estable
const CACHE_MOTOR  = 'gujarati-motor';   // motor completo (main_loader.js), estable
const CONSERVAR    = [CACHE_ESTRUCTURAL, CACHE_MEDIOS, CACHE_MOTOR];


self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(
        nombres
          // Borra todo lo que NO sea la estructural actual, la de medios ni la del motor.
          .filter(function (n) { return CONSERVAR.indexOf(n) === -1; })
          .map(function (n) { return caches.delete(n); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// ¿Es un recurso multimedia de la lección? (audio o imagen del repositorio)
function esMultimedia(url) {
  // Mismo origen que sirve la app (portable: piensaengujarati.com o *.github.io),
  // y bajo una carpeta de medios. Detecta por CARPETA, no por dominio ni extensión,
  // así cubre .mp3/.jpg/.png y también .mp4 futuros sin enumerar extensiones.
  if (url.origin !== self.location.origin) return false;
  var p = url.pathname;
  return p.indexOf('/audios/')   !== -1 ||
         p.indexOf('/imagenes/') !== -1 ||
         p.indexOf('/videos/')   !== -1 ||
         p.indexOf('/audio/')    !== -1 ||   // curso de frases (data/frases/*.json)
         p.indexOf('/img/')      !== -1;
}

// iOS Safari pide audio/vídeo con "Range: bytes=..." y solo reproduce si
// recibe un 206. La caché guarda el archivo entero (200): aquí se recorta
// al rango pedido. Sin cabecera Range se devuelve tal cual.
function conRango(req, resp) {
  var range = req.headers.get('range');
  if (!range || resp.status !== 200) return Promise.resolve(resp);
  // blob() y no arrayBuffer(): blob.slice() no copia el archivo entero al heap
  // del SW (iOS lo mata si se pasa de memoria; Safari pide muchos rangos por audio).
  return resp.blob().then(function (buf) {
    var total = buf.size;
    var m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    var h = new Headers(resp.headers);
    h.set('Accept-Ranges', 'bytes');
    if (!m || (m[1] === '' && m[2] === '')) {
      // Multi-rango o malformado: se entrega entero.
      return new Response(buf, { status: 200, statusText: 'OK', headers: h });
    }
    var ini, fin;
    if (m[1] === '') {                       // "bytes=-500": los últimos 500
      ini = Math.max(0, total - Number(m[2]));
      fin = total - 1;
    } else {
      ini = Number(m[1]);
      fin = (m[2] === '') ? total - 1 : Math.min(Number(m[2]), total - 1);
    }
    if (ini >= total || ini > fin) {
      return new Response(null, {
        status: 416, statusText: 'Range Not Satisfiable',
        headers: { 'Content-Range': 'bytes */' + total }
      });
    }
    h.set('Content-Range', 'bytes ' + ini + '-' + fin + '/' + total);
    h.set('Content-Length', String(fin - ini + 1));
    return new Response(buf.slice(ini, fin + 1), { status: 206, statusText: 'Partial Content', headers: h });
  });
}

// Respaldo sin conexión: primero la estructural (lo último visto en línea),
// luego el motor y por último medios (JSON de lección bajados por el loader).
// Con caches.match() a secas ganaría la caché MÁS ANTIGUA, y tras subir
// VERSION esa es 'gujarati-media', con JSON posiblemente viejos.
function buscarEnOrden(clave) {
  return [CACHE_ESTRUCTURAL, CACHE_MOTOR, CACHE_MEDIOS].reduce(function (p, nombre) {
    return p.then(function (r) {
      return r || caches.open(nombre).then(function (c) { return c.match(clave); });
    });
  }, Promise.resolve(undefined));
}

// Página mínima para navegaciones sin conexión a algo que no está guardado
// (en vez de la página de error del navegador, sin salida).
// El enlace usa la raíz de la app (scope del SW): un enlace relativo, en una
// ruta profunda (data/..., audios/...), llevaría a otra página sin conexión.
function htmlSinConexion() {
  var raiz = (self.registration && self.registration.scope) || './';
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Sin conexión · Piensa en Gujarati</title></head>' +
    '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'background:#2C2420;color:#E8D9C0;font-family:sans-serif;text-align:center;padding:24px">' +
    '<div><p style="font-size:1.3rem;font-weight:700">Esta página no está guardada en tu teléfono</p>' +
    '<p>Conéctate a internet para abrirla.</p>' +
    '<p><a href="' + raiz + 'contenido.html" style="color:#B8863D;display:inline-block;padding:12px 20px">Ir al curso</a></p>' +
    '</div></body></html>';
}

self.addEventListener('fetch', function (event) {
  const req = event.request;
  const url = new URL(req.url);

  // 1. MULTIMEDIA: caché primero. Si el usuario lo descargó, se sirve al
  //    instante desde la caché. Si NO está (modo "solo en línea"),
  //    se trae de la red y se muestra SIN guardarlo (no ocupa espacio).
  //    OJO: sin ignoreSearch a propósito: la descarga "?v=" del loader debe ir
  //    a la red, no recibir la copia vieja de la caché.
  if (esMultimedia(url)) {
    event.respondWith(
      caches.match(req).then(function (enCache) {
        if (enCache) return conRango(req, enCache);
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

  // version.txt solo sirve en línea (detecta versiones nuevas): sin red, mejor
  // que falle a que la caché devuelva un número viejo y provoque recargas.
  if (url.pathname.slice(-12) === '/version.txt') {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(function (respuesta) {
        if (respuesta && respuesta.ok) {
          const clone = respuesta.clone();
          event.waitUntil(caches.open(CACHE_ESTRUCTURAL).then(function (cache) {
            return cache.put(cacheKey, clone);
          }));
        }
        return respuesta;
      })
      .catch(function () {
        return buscarEnOrden(cacheKey).then(function (enCache) {
          if (enCache) return enCache;
          if (req.mode === 'navigate') {
            return new Response(htmlSinConexion(), {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          }
          return Response.error();
        });
      })
  );
});
