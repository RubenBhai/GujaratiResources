const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/leccion_pensarEnGUJ_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    document.getElementById('nav-anterior').onclick = function(){ history.back(); return false; };
    document.getElementById('nav-home').href = data.home;

    function configurarBoton(id, mostrarCampo, href){
      var el = document.getElementById(id);
      if(mostrarCampo === false){ el.style.display = 'none'; }
      else { el.href = href; }
    }

    configurarBoton('btn-aprende', data.mostrar_aprende, 'aprende.html?leccion=' + _leccionRaw);
    configurarBoton('btn-compone', data.mostrar_compone, 'compone.html?leccion=' + _leccionRaw);
    configurarBoton('btn-reto',    data.mostrar_reto,    'reto.html?leccion='    + _leccionRaw);
    configurarBoton('btn-pensar',  data.mostrar_pensar,  'piensa.html?leccion='  + _leccionRaw);
    configurarBoton('btn-dialogo', data.mostrar_dialogo,
      'video.html?leccion=' + _leccionRaw + '&next=video_interactivo.html&modo=desafio');

    document.getElementById('btn-fin-leccion').href = 'leccion_fin.html?leccion=' + _leccionRaw;
  })
  .catch(function(){
    document.querySelector('.wrap').innerHTML =
      '<p class="error-carga">No se pudo cargar el contenido. Revisa tu conexión.</p>';
  });

/* ── Verificador de versión ── */
(function(){
  var VERSION_URL = 'version.txt';
  fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function(r){ return r.text(); })
    .then(function(serverV){
      serverV = serverV.trim();
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
