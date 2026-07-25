const BASE        = 'https://rubenbhai.github.io/GujaratiResources';

const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/leccion_fin_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){

    // Marcar lección como completada
    try { localStorage.setItem('leccion_' + _leccion, 'completada'); } catch(e) {}

    // Sonido de triunfo
    setTimeout(function(){
      var t = document.getElementById('triunfo');
      if(t){ t.volume = 0.7; t.play().catch(function(){}); }
    }, 350);

    document.getElementById('nav-anterior').onclick = function(){ history.back(); return false; };
    document.getElementById('nav-home').href    = 'leccion_intro.html?leccion=' + _leccionRaw;
    document.getElementById('btn-repetir').href = 'leccion_intro.html?leccion=' + _leccionRaw;
    document.getElementById('nav-mapa').href    = 'guia_navegacion.html?leccion=' + _leccionRaw;

    // Efecto victoria (definido en efecto_victoria.js)
    revisarVictoria(100, data.sonido_victoria, data.programa_efecto_victoria, _leccion);

    // Subtitle: usa clase .gu-inline en lugar de style= inline
    var r = data.resumen;
    document.getElementById('subtitle').innerHTML =
      'Aprendiste <strong>' + r.consonantes + ' consonantes</strong>, ' +
      '<strong>' + r.vocales + ' vocales</strong> y ' +
      '<strong>' + r.palabras + ' palabras</strong> de verdad. ' +
      '¡Ya puedes preguntar <span class="gu-inline">' + r.frase_ejemplo + '</span>!';

    // Letras aprendidas
    var letrasCont = document.getElementById('letras-aprendidas');
    data.letras_aprendidas.forEach(function(l){
      var span       = document.createElement('span');
      span.className = 'gu';
      span.textContent = l;
      letrasCont.appendChild(span);
    });

    // Tabla de vocabulario
    var tabla = document.getElementById('tabla-aprendido');
    data.palabras_aprendidas.forEach(function(p){
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="gu-cell">'   + p.gujarati  + '</td>' +
        '<td class="pron-cell">' + p.se_dice   + '</td>' +
        '<td class="mean-cell">' + p.significa + '</td>';
      tabla.appendChild(tr);
    });

    // Próxima lección
    var prox = data.proxima_leccion;
    document.getElementById('proxima-texto').textContent = 'Aprenderás ' + prox.cantidad_letras + ' letras nuevas:';
    var proxLetrasCont = document.getElementById('proxima-letras');
    prox.letras.forEach(function(l){
      var span       = document.createElement('span');
      span.className = 'gu';
      span.textContent = l;
      proxLetrasCont.appendChild(span);
    });
    document.getElementById('btn-siguiente-leccion').href = 'leccion_intro.html?leccion=' + prox.codigo;
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
