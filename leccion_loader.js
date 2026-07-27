(function(){
  var _params     = new URLSearchParams(location.search);

  // 1. Definición de variables de entorno y rutas (¡Movido arriba!)
  var _leccionRaw = _params.get('leccion') || '1.1.1';
  var _folder     = _leccionRaw.replace(/\./g, '_');   // "1.1.1" → "1_1_1"
  var _destino    = 'video.html?leccion=' + _leccionRaw + '&next=leccion_intro.html&modo=intro';
  
  var CACHE_NAME       = 'gujarati-media';   // misma caché que usa el sw.js
  var localManifestKey = 'manifest_' + _folder;
  var assetsUrl        = 'data/' + _folder + '/assets_' + _folder + '_versionado.json';

  // 2. Mostrar logo primero
  var _logo = document.querySelector('.loader-logo');
  if(_logo){
    _logo.style.opacity    = '0';
    _logo.style.transition = 'opacity 0.5s ease';
    var _imgTemp = new Image();
    _imgTemp.onload = function(){ _logo.style.opacity = '1'; arrancarDescarga(); };
    _imgTemp.onerror = function(){ _logo.style.opacity = '1'; arrancarDescarga(); };
    _imgTemp.src = _logo.src;
  } else {
    arrancarDescarga();
  }

  // 3. Variables del DOM
  var fillEl    = document.getElementById('progress-fill');
  var pctEl     = document.getElementById('progress-pct');
  var estadoEl  = document.getElementById('loader-estado');
  var leccionEl = document.getElementById('loader-leccion');
  var recursoEl = document.getElementById('loader-recurso');
  var eleccionEl = document.getElementById('loader-eleccion');   // pantalla de 3 opciones
  var tamanoEl   = document.getElementById('elec-tamano');       // texto del tamaño
  var progresoWrapEl = document.getElementById('progress-wrap'); // barra (se oculta al elegir)

  leccionEl.textContent = 'Lección ' + _leccionRaw;

  function setProgreso(cargados, total){
    var pct = total > 0 ? Math.round((cargados / total) * 100) : 0;
    fillEl.style.width = pct + '%';
    pctEl.textContent  = pct + '%';
  }

  function irALeccion(){
    estadoEl.textContent = '¡Listo! Comenzando...';
    if(recursoEl) recursoEl.textContent = ''; 
    setTimeout(function(){ window.location.href = _destino; }, 400);
  }

  /* Descarga un asset utilizando la Cache API y las 3 reglas de validación */
  async function fetchAsset(assetObj, localManifestAssets){
    var url = assetObj.url;
    var remoteDate = assetObj.lastModified;
    var nombreArchivo = url.split('/').pop();
    
    if(recursoEl) recursoEl.textContent = nombreArchivo;

    try {
      var cache = await caches.open(CACHE_NAME);
      var responseEnCache = await cache.match(url);
      var necesitaDescarga = false;

      if (!responseEnCache) {
        necesitaDescarga = true;
      } else {
        var localAsset = localManifestAssets.find(function(a) { return a.url === url; });
        if (!localAsset || localAsset.lastModified < remoteDate) {
          necesitaDescarga = true;
        }
      }

      if (necesitaDescarga) {
        // Se añade la versión (lastModified) a la URL de descarga para que
        // el navegador NO pueda devolver la copia vieja desde su caché HTTP.
        // Se guarda en el SW con la URL pelada, que es como se busca luego.
        var urlDescarga = url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + remoteDate;
        var networkResponse = await fetch(urlDescarga, { mode: 'cors', cache: 'reload' });
        if (networkResponse.ok) {
          await cache.put(url, networkResponse.clone());
        }
      }
      return true;
    } catch(error) {
      return false; 
    }
  }

  /* Descarga en lotes para no saturar conexiones en móvil */
  function descargarEnLotes(assets, localManifestAssets, tamanioLote, onProgreso){
    var total    = assets.length;
    var cargados = 0;
    var idx      = 0;

    function siguienteLote(){
      if(idx >= total) return Promise.resolve();
      var lote = assets.slice(idx, idx + tamanioLote);
      idx += tamanioLote;
      
      var promesas = lote.map(function(assetObj) {
        return fetchAsset(assetObj, localManifestAssets);
      });

      return Promise.all(promesas).then(function(){
        cargados += lote.length;
        onProgreso(Math.min(cargados, total), total);
        return siguienteLote();
      });
    }
    return siguienteLote();
  }

  /* FASE 2: calcula cuántos bytes FALTAN por descargar (los que no están
     ya en caché o están desactualizados). Misma lógica de decisión que
     fetchAsset, para que el tamaño mostrado coincida con lo que se bajará. */
  async function calcularPendiente(remoteAssets, localManifestAssets){
    var cache = await caches.open(CACHE_NAME);
    var bytesPendientes = 0, bytesTotal = 0, cantPendiente = 0;
    for (var i = 0; i < remoteAssets.length; i++){
      var a = remoteAssets[i];
      var tam = a.size || 0;
      bytesTotal += tam;
      var enCache = await cache.match(a.url);
      var necesita = false;
      if (!enCache) {
        necesita = true;
      } else {
        var local = localManifestAssets.find(function(x){ return x.url === a.url; });
        if (!local || local.lastModified < a.lastModified) necesita = true;
      }
      if (necesita) { bytesPendientes += tam; cantPendiente++; }
    }
    return { bytesPendientes: bytesPendientes, bytesTotal: bytesTotal, cantPendiente: cantPendiente };
  }

  function arrancarDescarga(){
    fetch(assetsUrl + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function(r){ if(!r.ok) throw new Error('No se encontró ' + assetsUrl); return r.json(); })
      .then(async function(remoteData){
        var remoteAssets = remoteData.assets || [];
        if(remoteAssets.length === 0){ irALeccion(); return; }

        var localManifestStr = localStorage.getItem(localManifestKey);
        var localManifestAssets = [];
        if (localManifestStr) {
          try { localManifestAssets = JSON.parse(localManifestStr).assets || []; } catch(e){}
        }

        // FASE 2: ¿cuánto falta por descargar?
        var pend = await calcularPendiente(remoteAssets, localManifestAssets);

        // Guardamos lo necesario para que los botones lo usen.
        _remoteData = remoteData;
        _remoteAssets = remoteAssets;
        _localManifestAssets = localManifestAssets;

        // Si ya está todo en caché, no hay nada que elegir: directo a la lección.
        if (pend.cantPendiente === 0) {
          estadoEl.textContent = 'Todo listo en tu dispositivo';
          localStorage.setItem(localManifestKey, JSON.stringify(remoteData));
          irALeccion();
          return;
        }

        // FASE 3: mostrar la pantalla de elección con el tamaño.
        mostrarEleccion(pend);
      })
      .catch(function(){
        estadoEl.textContent = '¡Listo!';
        setProgreso(1, 1);
        setTimeout(function(){ window.location.href = _destino; }, 600);
      });
  }

  /* ══════ FASE 3: pantalla de elección y sus acciones ══════ */
  var _remoteData = null, _remoteAssets = [], _localManifestAssets = [];

  function mb(bytes){ return (bytes / 1024 / 1024).toFixed(1); }

  function mostrarEleccion(pend){
    if(recursoEl) recursoEl.textContent = '';
    if(estadoEl)  estadoEl.textContent  = '';
    // Modo "eligiendo": el CSS oculta logo y bloque de preparando.
    document.body.classList.add('eligiendo');
    if(progresoWrapEl) progresoWrapEl.style.display = 'none';
    // Número de lección en el encabezado de la elección
    var elecLec = document.getElementById('elec-leccion');
    if(elecLec) elecLec.textContent = 'Lección ' + _leccionRaw;
    // Rellenar el tamaño y mostrar la pantalla
    if(tamanoEl) tamanoEl.textContent = mb(pend.bytesPendientes) + ' MB';
    if(eleccionEl) eleccionEl.style.display = 'flex';
  }

  // Botón 1: descargar todo para uso sin internet
  window.elecDescargar = function(){
    document.body.classList.remove('eligiendo');
    if(eleccionEl) eleccionEl.style.display = 'none';
    if(progresoWrapEl) progresoWrapEl.style.display = '';
    estadoEl.textContent = 'Descargando...';
    setProgreso(0, _remoteAssets.length);
    descargarEnLotes(_remoteAssets, _localManifestAssets, 6, function(cargados, total){
      setProgreso(cargados, total);
      if(cargados >= total){
        localStorage.setItem(localManifestKey, JSON.stringify(_remoteData));
        irALeccion();
      }
    });
  };

  // Botón 2: solo en línea — no descarga; el SW trae cada recurso al vuelo
  window.elecSoloEnLinea = function(){
    document.body.classList.remove('eligiendo');
    if(eleccionEl) eleccionEl.style.display = 'none';
    if(progresoWrapEl) progresoWrapEl.style.display = '';
    estadoEl.textContent = 'Entrando en modo en línea...';
    setProgreso(1, 1);
    setTimeout(irALeccion, 300);
  };

  // Botón 3: liberar espacio — borra de la caché los recursos de ESTA lección
  window.elecLiberarEspacio = async function(){
    var aviso = document.getElementById('elec-aviso');
    if(aviso) aviso.textContent = 'Liberando espacio...';
    try {
      var cache = await caches.open(CACHE_NAME);
      for (var i = 0; i < _remoteAssets.length; i++){
        await cache.delete(_remoteAssets[i].url);
      }
      try { localStorage.removeItem(localManifestKey); } catch(e){}
    } catch(e){}
    var pend = await calcularPendiente(_remoteAssets, []);
    _localManifestAssets = [];
    // Actualizar el tamaño mostrado y avisar, sin recrear la pantalla
    if(tamanoEl) tamanoEl.textContent = mb(pend.bytesPendientes) + ' MB';
    if(aviso) aviso.textContent = '✓ Espacio liberado';
    setTimeout(function(){ if(aviso) aviso.textContent = ''; }, 2500);
  };
})();