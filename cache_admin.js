/* ============================================================
   cache_admin.js — Panel de almacenamiento (autocontenido)
   Lee cache_admin.json (lista de lecciones → su manifiesto),
   cruza cada manifiesto contra la caché 'gujarati-media' y permite
   borrar por lección, borrar todo, y depurar archivos huérfanos.
   NO descarga nada. NO toca la caché estructural (código de la app).
============================================================ */

const CACHE_NAME   = 'gujarati-media';        // la misma que usa el sw.js y el loader
const CATALOGO_URL = 'cache_admin.json';

/* Resuelve una ruta (relativa o absoluta) al URL absoluto real,
   igual que hace el navegador al guardar/buscar en la Cache API. */
function abs(u){ return new URL(u, location.href).href; }
function fmtMB(bytes){ return (bytes / 1024 / 1024).toFixed(1); }
function folderDe(codigo){ return codigo.replace(/\./g, '_'); }

/* Archivos de la APP (PWA / logo) que viven en la caché pero NO pertenecen a
   ninguna lección. Nunca se tratan como huérfanos, aunque no estén en un
   manifiesto. Se comparan por nombre de archivo. */
var PROTEGIDOS = new Set([
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'icon_192.jpg',
  'LearnGujarati_SuperInmersivo_Main.jpg'
]);
function nombreArchivo(u){
  try { return new URL(u, location.href).pathname.split('/').pop(); }
  catch(e){ return u.split('?')[0].split('/').pop(); }
}

/* Estado en memoria */
let LECCIONES        = [];    // [{codigo, titulo, manifiesto}]
let MANIFIESTOS      = {};    // codigo → [assets]
let TODOS_OK         = true;  // ¿se cargaron TODOS los manifiestos? (seguridad para huérfanos)

const el = function(id){ return document.getElementById(id); };

function mostrarAviso(txt, tipo){
  var a = el('aviso');
  a.textContent = txt || '';
  a.className = 'aviso' + (tipo ? ' ' + tipo : '');
}

/* ── Estado de una lección: cuántos de sus assets están en caché y cuánto pesan ── */
async function estadoLeccion(cache, assets){
  var presentes = 0, bytesPresentes = 0, bytesTotal = 0;
  for (var i = 0; i < assets.length; i++){
    var a = assets[i];
    bytesTotal += a.size || 0;
    var hit = await cache.match(abs(a.url));
    if (hit){ presentes++; bytesPresentes += a.size || 0; }
  }
  return { presentes: presentes, total: assets.length, bytesPresentes: bytesPresentes, bytesTotal: bytesTotal };
}

/* ── Pintar una tarjeta de lección ── */
function tarjetaLeccion(lec, est, fallo){
  var div = document.createElement('div');
  div.className = 'lec-card';
  div.id = 'card-' + folderDe(lec.codigo);

  if (fallo){
    div.classList.add('vacia');
    div.innerHTML =
      '<div class="lec-main">' +
        '<div class="lec-codigo">' + lec.codigo + '</div>' +
        '<div class="lec-titulo">' + (lec.titulo || '') + '</div>' +
        '<div class="lec-estado"><span class="pill no">Sin manifiesto</span> No se pudo leer su lista de archivos</div>' +
      '</div>';
    return div;
  }

  var completa = est.presentes === est.total && est.total > 0;
  var vacia    = est.presentes === 0;
  var pct      = est.total > 0 ? Math.round((est.presentes / est.total) * 100) : 0;

  if (completa) div.classList.add('descargada');
  if (vacia)    div.classList.add('vacia');

  var pill = completa
    ? '<span class="pill ok">Descargada</span>'
    : (vacia ? '<span class="pill no">No descargada</span>'
             : '<span class="pill parcial">Parcial</span>');

  var detalle = vacia
    ? 'No ocupa espacio en este dispositivo'
    : '<span class="lec-peso">' + fmtMB(est.bytesPresentes) + ' MB</span> · ' +
      est.presentes + ' de ' + est.total + ' archivos';

  div.innerHTML =
    '<div class="lec-main">' +
      '<div class="lec-codigo">' + lec.codigo + '</div>' +
      '<div class="lec-titulo">' + (lec.titulo || '') + '</div>' +
      '<div class="lec-estado">' + pill + detalle + '</div>' +
      (vacia ? '' : '<div class="mini-barra"><div class="mini-barra-fill" style="width:' + pct + '%"></div></div>') +
    '</div>' +
    '<button class="btn-borrar-lec" ' + (vacia ? 'disabled' : '') +
      ' onclick="borrarLeccion(\'' + lec.codigo + '\')">🗑️ Borrar</button>';

  return div;
}

/* ── Recalcular estados y repintar todo ── */
async function refrescar(){
  var cache = await caches.open(CACHE_NAME);
  var lista = el('lista');
  lista.innerHTML = '';

  var totalBytes = 0, lecDescargadas = 0, algoBorrable = false;

  for (var i = 0; i < LECCIONES.length; i++){
    var lec = LECCIONES[i];
    var assets = MANIFIESTOS[lec.codigo];
    if (!assets){
      lista.appendChild(tarjetaLeccion(lec, null, true));
      continue;
    }
    var est = await estadoLeccion(cache, assets);
    totalBytes += est.bytesPresentes;
    if (est.presentes > 0){ lecDescargadas++; algoBorrable = true; }
    lista.appendChild(tarjetaLeccion(lec, est, false));
  }

  el('total-mb').textContent = fmtMB(totalBytes);
  el('resumen-sub').textContent = lecDescargadas === 0
    ? 'No hay lecciones descargadas'
    : lecDescargadas + (lecDescargadas === 1 ? ' lección guardada' : ' lecciones guardadas');

  el('btn-borrar-todo').disabled = !algoBorrable;
  // Huérfanos: solo si TODOS los manifiestos se pudieron leer (si no, podríamos borrar de más)
  el('btn-huerfanos').disabled = !TODOS_OK;
}

/* ── Borrar una lección: sus assets presentes + su manifiesto local ── */
window.borrarLeccion = async function(codigo){
  var lec = LECCIONES.find(function(l){ return l.codigo === codigo; });
  if (!lec) return;
  if (!confirm('¿Borrar los archivos descargados de la lección ' + codigo + '?\nPodrás volver a descargarlos con internet.')) return;

  mostrarAviso('Borrando ' + codigo + '…', 'info');
  try {
    var cache  = await caches.open(CACHE_NAME);
    var assets = MANIFIESTOS[codigo] || [];
    for (var i = 0; i < assets.length; i++){ await cache.delete(abs(assets[i].url)); }
    try { localStorage.removeItem('manifest_' + folderDe(codigo)); } catch(e){}
    await refrescar();
    mostrarAviso('✓ Lección ' + codigo + ' borrada', 'ok');
  } catch(e){
    mostrarAviso('No se pudo borrar. Intenta de nuevo.', 'err');
  }
  setTimeout(function(){ mostrarAviso(''); }, 3000);
};

/* ── Borrar todo lo descargado (todas las lecciones listadas) ── */
window.borrarTodo = async function(){
  if (!confirm('¿Borrar TODO lo descargado de todas las lecciones?\nEsto libera todo el espacio; podrás volver a descargar con internet.')) return;

  mostrarAviso('Borrando todo…', 'info');
  try {
    var cache = await caches.open(CACHE_NAME);
    for (var i = 0; i < LECCIONES.length; i++){
      var codigo = LECCIONES[i].codigo;
      var assets = MANIFIESTOS[codigo] || [];
      for (var j = 0; j < assets.length; j++){ await cache.delete(abs(assets[j].url)); }
      try { localStorage.removeItem('manifest_' + folderDe(codigo)); } catch(e){}
    }
    await refrescar();
    mostrarAviso('✓ Se borró todo lo descargado', 'ok');
  } catch(e){
    mostrarAviso('No se pudo completar. Intenta de nuevo.', 'err');
  }
  setTimeout(function(){ mostrarAviso(''); }, 3500);
};

/* ── Depurar huérfanos: archivos en caché que no están en NINGÚN manifiesto ──
   Solo disponible si TODOS los manifiestos se leyeron (si no, no sabríamos
   distinguir un huérfano real de un archivo de una lección que no cargó). */
window.depurarHuerfanos = async function(){
  if (!TODOS_OK){
    mostrarAviso('No puedo depurar: falta leer algún manifiesto. Revisa cache_admin.json.', 'err');
    return;
  }
  mostrarAviso('Buscando archivos huérfanos…', 'info');
  try {
    var cache = await caches.open(CACHE_NAME);

    // Conjunto de URLs "conocidas" (todas las de todos los manifiestos), en absoluto.
    var conocidas = new Set();
    for (var codigo in MANIFIESTOS){
      var assets = MANIFIESTOS[codigo];
      for (var i = 0; i < assets.length; i++){ conocidas.add(abs(assets[i].url)); }
    }

    var keys = await cache.keys();
    var huerfanos = keys.filter(function(req){
      return !conocidas.has(req.url) && !PROTEGIDOS.has(nombreArchivo(req.url));
    });

    if (huerfanos.length === 0){
      mostrarAviso('✓ No hay archivos huérfanos. Todo limpio.', 'ok');
      setTimeout(function(){ mostrarAviso(''); }, 3000);
      return;
    }

    // Pesar los huérfanos leyendo su blob (no hay tamaño en las claves de caché).
    mostrarAviso('Encontrados ' + huerfanos.length + ' — calculando tamaño…', 'info');
    var bytes = 0;
    for (var k = 0; k < huerfanos.length; k++){
      try { var resp = await cache.match(huerfanos[k]); if (resp){ var b = await resp.blob(); bytes += b.size; } } catch(e){}
    }

    if (!confirm('Se encontraron ' + huerfanos.length + ' archivos huérfanos (' + fmtMB(bytes) + ' MB).\n' +
                 'Son restos que no pertenecen a ninguna lección del catálogo.\n\n¿Borrarlos?')) {
      mostrarAviso('');
      return;
    }

    for (var d = 0; d < huerfanos.length; d++){ await cache.delete(huerfanos[d]); }
    await refrescar();
    mostrarAviso('✓ Se borraron ' + huerfanos.length + ' archivos huérfanos (' + fmtMB(bytes) + ' MB)', 'ok');
  } catch(e){
    mostrarAviso('No se pudo depurar. Intenta de nuevo.', 'err');
  }
  setTimeout(function(){ mostrarAviso(''); }, 4000);
};

/* ── Init: leer catálogo, cargar manifiestos, pintar ── */
(async function init(){
  var catalogo;
  try {
    var r = await fetch(CATALOGO_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('404');
    catalogo = await r.json();
  } catch(e){
    document.querySelector('.main').innerHTML =
      '<p class="error-carga">No se pudo cargar el catálogo (cache_admin.json).</p>';
    return;
  }

  LECCIONES = catalogo.lecciones || [];
  if (LECCIONES.length === 0){
    el('lista').innerHTML = '<div class="cargando">El catálogo no tiene lecciones todavía.</div>';
    el('resumen-sub').textContent = 'Catálogo vacío';
    el('total-mb').textContent = '0';
    return;
  }

  // Cargar el manifiesto de cada lección (una vez).
  TODOS_OK = true;
  for (var i = 0; i < LECCIONES.length; i++){
    var lec = LECCIONES[i];
    try {
      var rm = await fetch(lec.manifiesto + '?t=' + Date.now(), { cache: 'no-store' });
      if (!rm.ok) throw new Error('404');
      var data = await rm.json();
      MANIFIESTOS[lec.codigo] = data.assets || [];
    } catch(e){
      MANIFIESTOS[lec.codigo] = null;   // no se pudo leer
      TODOS_OK = false;                 // desactiva depurar huérfanos por seguridad
    }
  }

  await refrescar();

  if (!TODOS_OK){
    mostrarAviso('Aviso: no se pudo leer algún manifiesto; "Depurar huérfanos" queda desactivado por seguridad.', 'err');
  }
})();

/* ── Verificador de versión (mismo patrón que el resto, relativo) ── */
(function(){
  var VERSION_URL = 'version.txt';
  fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function(r){ return r.text(); })
    .then(function(serverV){
      serverV = serverV.trim();
      var localV = null;
      try { localV = localStorage.getItem('appVersion'); } catch(e) {}
      if (localV === null){
        try { localStorage.setItem('appVersion', serverV); } catch(e) {}
      } else if (localV !== serverV){
        try { localStorage.setItem('appVersion', serverV); } catch(e) {}
        location.reload(true);
      }
    })
    .catch(function(){});
})();
