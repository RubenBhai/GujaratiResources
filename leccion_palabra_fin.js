const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/leccion_palabra_' + _leccion + '.json';

// Configurar botón de Mapa en barra superior
document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    var total = (data.palabras && data.palabras.length) ? data.palabras.length : 1;

    // 1. Navegación en header
    document.getElementById('nav-home').href  = data.home || 'index.html';
    document.getElementById('nav-vocab').href = 'leccion_palabra.html?leccion=' + _leccionRaw + '&item=' + total;

    // 2. Botón Siguiente → Toma el destino final de la lección (ej. juego.html?leccion=1.1.1)
    var urlJuego = data.siguiente_final || ('juego.html?leccion=' + _leccionRaw);
    document.getElementById('btn-siguiente-juego').href = urlJuego;

    // 3. Botón Reto Flash → Enlaza a _palabras.json a través de ?palabras=1.1.1
    // Al terminar, history.back() regresará automáticamente a esta pantalla
    document.getElementById('btn-repaso-flash').href = 'reto_flash.html?palabras=' + _leccionRaw;

    // 4. Botón Ver de nuevo → Vuelve a la palabra 1
    document.getElementById('btn-reiniciar-vocab').href = 'leccion_palabra.html?leccion=' + _leccionRaw + '&item=1';
  })
  .catch(function(){
    document.body.innerHTML =
      '<p class="error-carga" style="text-align:center; padding:40px; color:#C8B99A;">No se pudo cargar la configuración de la lección.</p>';
  });

/* ── Verificador de versión ── */
(function(){
  var VERSION_URL = 'version.txt';
  fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(function(serverV){
      serverV = serverV.trim();
      if(!serverV || serverV.length > 20) return;   // respuesta rara (p.ej. una página 404): no recargar
      var localV = null;
      try { localV = localStorage.getItem('appVersion'); } catch(e) {}
      if(localV === null){
        try { localStorage.setItem('appVersion', serverV); } catch(e) {}
      } else if(localV !== serverV){
        try { localStorage.setItem('appVersion', serverV); } catch(e) {}
        location.reload(true);
      }
    })
    .catch(function(){});
})();