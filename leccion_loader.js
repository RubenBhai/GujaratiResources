(function(){
  var _params     = new URLSearchParams(location.search);

  // 1. Definición de variables de entorno y rutas (¡Movido arriba!)
  var _leccionRaw = _params.get('leccion') || '1.1.1';
  var _folder     = _leccionRaw.replace(/\./g, '_');   // "1.1.1" → "1_1_1"
  var _destino    = 'video.html?leccion=' + _leccionRaw + '&next=leccion_intro.html&modo=intro';
  
  var CACHE_NAME       = 'curso-gujarati-v1';
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

  function arrancarDescarga(){
    fetch(assetsUrl + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function(r){ if(!r.ok) throw new Error('No se encontró ' + assetsUrl); return r.json(); })
      .then(function(remoteData){
        var remoteAssets = remoteData.assets || [];
        if(remoteAssets.length === 0){ irALeccion(); return; }

        var localManifestStr = localStorage.getItem(localManifestKey);
        var localManifestAssets = [];
        if (localManifestStr) {
          try { localManifestAssets = JSON.parse(localManifestStr).assets || []; } catch(e){}
        }

        estadoEl.textContent = 'Verificando ' + remoteAssets.length + ' recursos...';
        setProgreso(0, remoteAssets.length);
        
        descargarEnLotes(remoteAssets, localManifestAssets, 6, function(cargados, total){
          setProgreso(cargados, total);
          if(cargados >= total) {
            localStorage.setItem(localManifestKey, JSON.stringify(remoteData));
            irALeccion();
          }
        });
      })
      .catch(function(){
        estadoEl.textContent = '¡Listo!';
        setProgreso(1, 1);
        setTimeout(function(){ window.location.href = _destino; }, 600);
      });
  }

})();