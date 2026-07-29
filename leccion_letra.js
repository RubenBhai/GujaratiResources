const BASE   = '.';
const player = document.getElementById('player');

const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const _item       = parseInt(_params.get('item') || '1', 10);
const JSON_URL    = 'data/' + _leccion + '/leccion_letra_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

function playAudio(url, btn){
  btn.classList.add('playing');
  btn.textContent = '▶ Reproduciendo...';
  player.src = url; player.playbackRate = 1.0; player.play();
  player.onended = function(){
    btn.classList.remove('playing');
    btn.innerHTML = '&#128266; Escuchar';
  };
}

fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    var letras = data.letras;
    var total  = letras.length;
    var idx    = Math.min(Math.max(_item, 1), total);
    var actual = letras[idx - 1];

    document.getElementById('page-title').textContent = 'Consonante ' + actual.consonante + ' · Piensa en Gujarati';
    document.getElementById('badge').textContent      = 'Consonante ' + idx + ' de ' + total;

    document.getElementById('q1-letra').textContent   = actual.consonante;
    document.getElementById('q2-detalle').innerHTML = '<p>' + (actual.detalle || '') + '</p>';
    document.getElementById('frame-cuadrantes').onclick = function(){ window.location.href = siguienteUrl; };

    document.getElementById('nav-home').href    = data.home;
    document.getElementById('nav-palabras').href = data.ir_a_palabras;

    var siguienteUrl = (idx < total)
      ? ('leccion_letra.html?leccion=' + _leccionRaw + '&item=' + (idx + 1))
      : data.ir_a_palabras;

    var navAnterior = document.getElementById('nav-anterior');
    navAnterior.classList.remove('disabled');
    if(idx > 1){
      navAnterior.href = 'leccion_letra.html?leccion=' + _leccionRaw + '&item=' + (idx - 1);
    } else {
      navAnterior.href = 'javascript:void(0)';
      navAnterior.onclick = function(){ history.back(); return false; };
    }

    document.getElementById('btn-practicar').href       = 'reto_flash.html?json=' + actual.reto_flash_json;
    document.getElementById('btn-siguiente').href       = actual.plana;
    document.getElementById('btn-siguiente-leccion').href = data.siguiente_leccion;

    var btnEscuchar = document.getElementById('btn-escuchar');
    btnEscuchar.onclick = function(){ playAudio(actual.audio, btnEscuchar); };

    setTimeout(function(){
      player.src = actual.audio;
      player.play().catch(function(){});
    }, 400);
  })
  .catch(function(){
    document.body.innerHTML =
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
