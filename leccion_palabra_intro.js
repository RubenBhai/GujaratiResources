const BASE        = 'https://rubenbhai.github.io/GujaratiResources';
const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/leccion_palabra_intro_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    var empezarUrl = 'leccion_palabra.html?leccion=' + _leccionRaw + '&item=1';

    document.getElementById('nav-home').href     = data.home;
    document.getElementById('nav-anterior').href = data.anterior;
    document.getElementById('nav-empezar').href  = empezarUrl;
    document.getElementById('btn-empezar').href  = empezarUrl;

    document.getElementById('subtitle').innerHTML =
      'Ahora vas a juntar las letras para leer <strong>' + data.palabras.length + ' palabras y frases</strong> de verdad. ' +
      '¡Ya puedes preguntar <span class="frase-gu-inline">' + data.frase_ejemplo + '</span>!';

    var tabla = document.getElementById('tabla-palabras');
    data.palabras.forEach(function(p){
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="gu-cell">'   + p.gujarati  + '</td>' +
        '<td class="pron-cell">' + p.se_dice   + '</td>' +
        '<td class="mean-cell">' + p.significa + '</td>';
      tabla.appendChild(tr);
    });
  })
  .catch(function(){
    document.body.innerHTML =
      '<p class="error-carga">No se pudo cargar el contenido. Revisa tu conexión.</p>';
  });

/* ── Verificador de versión ── */
(function(){
  var VERSION_URL = 'https://rubenbhai.github.io/GujaratiResources/version.txt';
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
