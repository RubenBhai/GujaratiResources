(function(){
  // Loader del MOTOR del curso. Baja las páginas/JS/CSS (assets_main.json)
  // una sola vez, bajo el dominio actual, y pasa a contenido.html.
  // A diferencia del loader de lección, NO pregunta: el motor es ~1 MB.

  var CACHE_NAME = 'gujarati-motor';           // caché estable que el sw.js conserva al versionar (CACHE_MOTOR)
  var ASSETS_URL = 'assets_main.json';         // relativo: en la raíz
  var DESTINO    = 'contenido.html';
  var LOCAL_KEY  = 'manifest_motor';

  // Registrar el SW también aquí: sin él, lo descargado no se sirve sin conexión.
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(function(){}); }

  var fillEl   = document.getElementById('progress-fill');
  var pctEl    = document.getElementById('progress-pct');
  var estadoEl = document.getElementById('loader-estado');

  function setProgreso(cargados, total){
    var pct = total > 0 ? Math.round((cargados / total) * 100) : 0;
    if(fillEl) fillEl.style.width = pct + '%';
    if(pctEl)  pctEl.textContent  = pct + '%';
  }

  function irAlCurso(){
    if(estadoEl) estadoEl.textContent = '¡Listo!';
    setTimeout(function(){ window.location.href = DESTINO; }, 300);
  }

  // URL canónica (origen + ruta, sin parámetros): así coincide EXACTAMENTE
  // con la clave que usa el service worker y con lo que el navegador pedirá.
  function canonica(relativa){
    var u = new URL(relativa, location.href);
    return u.origin + u.pathname;
  }

  async function fetchArchivo(asset, localAssets){
    var rel  = asset.url;                       // ruta relativa (nombre del archivo)
    var canon = canonica(rel);
    var remoteDate = asset.lastModified;
    try {
      var cache = await caches.open(CACHE_NAME);
      var enCache = await cache.match(canon);
      var necesita = false;
      if(!enCache){
        necesita = true;
      } else {
        var local = localAssets.find(function(a){ return a.url === rel; });
        if(!local || local.lastModified < remoteDate) necesita = true;
      }
      if(necesita){
        // ?v= para saltar la caché HTTP del navegador; se guarda sin el ?v=.
        var urlBaja = canon + (canon.indexOf('?') === -1 ? '?' : '&') + 'v=' + remoteDate;
        var resp = await fetch(urlBaja, { cache: 'reload' });
        if(resp.ok) await cache.put(canon, resp.clone());
        // 404/410: no existe en el servidor. Se anota como 'ausente' para que no
        // deje pendiente el motor en cada entrada; otros errores (sin red, 5xx,
        // sin espacio) devuelven false y se reintentan la próxima vez.
        else if(resp.status === 404 || resp.status === 410) return 'ausente';
        else return false;
      }
      return true;
    } catch(e){
      return false;   // si un archivo falla, seguimos; el SW lo traerá al vuelo online
    }
  }

  function descargarEnLotes(assets, localAssets, tam, onProg){
    var total = assets.length, cargados = 0, idx = 0;
    var fallidas = [];   // urls con fallo transitorio (red, 5xx, espacio): se reintentan
    var ausentes = [];   // urls que el servidor no tiene (404): no se reintentan hasta que cambie su fecha
    function siguiente(){
      if(idx >= total) return Promise.resolve();
      var lote = assets.slice(idx, idx + tam);
      idx += tam;
      return Promise.all(lote.map(function(a){ return fetchArchivo(a, localAssets); }))
        .then(function(res){
          res.forEach(function(ok, k){
            if(ok === 'ausente') ausentes.push(lote[k].url);
            else if(!ok) fallidas.push(lote[k].url);
          });
          cargados += lote.length; onProg(Math.min(cargados,total), total, fallidas, ausentes); return siguiente();
        });
    }
    return siguiente();
  }

  // Un archivo que el servidor no tiene (404) no se guarda; si el manifiesto
  // local lo anotó como ausente en esta misma versión, NO cuenta como pendiente:
  // si no, cada entrada al curso mostraría la barra de "Preparando..." por él.
  // Se reintenta en cuanto cambie su lastModified. Si el navegador vació la
  // caché, lo demás sí vuelve a contar como pendiente (y se vuelve a bajar).
  async function calcularPendiente(assets, localAssets, ausentes){
    var cache = await caches.open(CACHE_NAME);
    var n = 0;
    for(var i=0;i<assets.length;i++){
      var canon = canonica(assets[i].url);
      var enCache = await cache.match(canon);
      var local = localAssets.find(function(a){ return a.url === assets[i].url; });
      var alDia = !!local && local.lastModified >= assets[i].lastModified;
      if(!enCache){
        var ausente = ausentes.indexOf(assets[i].url) !== -1;
        if(!(ausente && alDia)) n++;
        continue;
      }
      if(!alDia) n++;
    }
    return n;
  }

  function arrancar(){
    fetch(ASSETS_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function(r){ if(!r.ok) throw new Error('sin assets_main'); return r.json(); })
      .then(async function(data){
        var assets = data.assets || [];
        if(assets.length === 0){ irAlCurso(); return; }

        var localStr = null;
        try { localStr = localStorage.getItem(LOCAL_KEY); } catch(e){}
        var localAssets = [], localAusentes = [];
        if(localStr){ try { var lj = JSON.parse(localStr); localAssets = lj.assets || []; localAusentes = lj.ausentes || []; } catch(e){} }

        // Si el motor ya está completo y al día, entra directo (rápido).
        var pend = await calcularPendiente(assets, localAssets, localAusentes);
        if(pend === 0){ irAlCurso(); return; }

        if(estadoEl) estadoEl.textContent = 'Preparando el curso...';
        setProgreso(0, assets.length);
        descargarEnLotes(assets, localAssets, 8, function(c, t, fallidas, ausentes){
          setProgreso(c, t);
          if(c >= t){
            // Se registra como "al día" todo menos lo que falló por red: eso
            // queda pendiente y se vuelve a intentar en la próxima entrada.
            var ok = assets.filter(function(a){ return fallidas.indexOf(a.url) === -1; });
            try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ motor: data.motor, assets: ok, ausentes: ausentes })); } catch(e){}
            irAlCurso();
          }
        });
      })
      .catch(function(){
        // Sin conexión o sin assets_main: seguimos igual (el SW sirve lo que haya).
        irAlCurso();
      });
  }

  arrancar();
})();
