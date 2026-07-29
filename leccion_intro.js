const BASE = '.';

const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/leccion_intro_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

/* Muestra la pantalla N, oculta las demás */
function mostrarPantalla(n){
  document.querySelectorAll('.pantalla-item').forEach(function(el){
    el.style.display = (parseInt(el.dataset.n, 10) === n) ? '' : 'none';
  });
  window.scrollTo(0, 0);
}

/* Crea un bloque de contenido según su tipo */
function crearBloque(b){
  if(b.tipo === 'info-box'){
    var div = document.createElement('div');
    div.className = 'info-box';
    div.innerHTML = b.html;
    return div;
  }

  if(b.tipo === 'tabla'){
    var wrap  = document.createElement('div');
    wrap.className = 'table-wrap';
    var table = document.createElement('table');
    var trHead = document.createElement('tr');
    b.columnas.forEach(function(col){
      var th = document.createElement('th');
      th.textContent = col;
      trHead.appendChild(th);
    });
    table.appendChild(trHead);
    b.filas.forEach(function(fila){
      var tr = document.createElement('tr');
      fila.forEach(function(celda){
        var td = document.createElement('td');
        td.className = 'celda-' + celda.tipo;
        if(celda.tipo === 'gu' || celda.tipo === 'matra') td.classList.add('gu', 'gu-cell');
        td.innerHTML = celda.valor;
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    wrap.appendChild(table);
    return wrap;
  }

  if(b.tipo === 'frase-destacada'){
    var div = document.createElement('div');
    div.className = 'frase-destacada';
    div.innerHTML =
      '<span class="gu frase-gu">' + b.gu + '</span><br>' +
      '<span class="frase-traduccion">— ' + b.traduccion + '</span>';
    return div;
  }

  return document.createElement('div');
}

/* Crea un botón de acción para la botonera de cada pantalla */
function crearBoton(btnData, claseCss, empezarUrl){
  var esBoton = (btnData.tipo === 'pantalla');
  var el = document.createElement(esBoton ? 'button' : 'a');
  el.className   = 'btn-action ' + claseCss;
  el.textContent = btnData.texto;
  if(btnData.tipo === 'pantalla'){
    el.onclick = function(){ mostrarPantalla(btnData.destino); };
  } else if(btnData.tipo === 'href'){
    el.href = btnData.destino;
  } else if(btnData.tipo === 'empezar_leccion'){
    el.href = empezarUrl;
  }
  return el;
}

/* ── Carga del JSON ── */
fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    document.getElementById('page-title').textContent = 'Lección ' + data.leccion + ' · Piensa en Gujarati';
    document.getElementById('nav-anterior').href = data.anterior;
    document.getElementById('nav-home').href     = data.home;

    var empezarUrl = data.empezar || ('leccion_letra.html?leccion=' + _leccionRaw + '&item=1');
    document.getElementById('nav-empezar').href = empezarUrl;

    var contenedor = document.getElementById('contenedor-pantallas');
    data.pantallas.forEach(function(pantalla, i){
      var n    = i + 1;
      var wrap = document.createElement('div');
      wrap.className  = 'wrap pantalla-item';
      wrap.dataset.n  = n;
      wrap.style.display = (n === 1) ? '' : 'none';

      var badge       = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = pantalla.badge;
      wrap.appendChild(badge);

      var h1 = document.createElement('h1');
      h1.textContent = pantalla.titulo;
      wrap.appendChild(h1);

      pantalla.bloques.forEach(function(b){ wrap.appendChild(crearBloque(b)); });

      var botonera    = document.createElement('div');
      botonera.className = 'botonera-pantalla';    // antes: style.cssText inline
      botonera.appendChild(crearBoton(pantalla.boton_principal,   'btn-words',    empezarUrl));
      botonera.appendChild(crearBoton(pantalla.boton_secundario,  'btn-next-lec', empezarUrl));
      wrap.appendChild(botonera);

      contenedor.appendChild(wrap);
    });

    /* ── Música de fondo ── */
    var music    = document.getElementById('bgMusic');
    var btnMusic = document.getElementById('musicToggle');
    music.src    = data.musica_ambiente;
    music.volume = 0.0;
    var TARGET_VOL = 0.35;
    var fadeTimer  = null;
    var playing    = false;

    function fadeTo(target){
      if(fadeTimer) clearInterval(fadeTimer);
      fadeTimer = setInterval(function(){
        var diff = target - music.volume;
        if(Math.abs(diff) < 0.02){
          music.volume = target;
          clearInterval(fadeTimer);
          if(target === 0) music.pause();
        } else {
          music.volume += diff * 0.1;
        }
      }, 50);
    }

    function activarMusica(){
      playing = true;
      btnMusic.innerHTML = '🔊';
      btnMusic.classList.remove('music-off');    // color restaurado por CSS base
      music.play().then(function(){ fadeTo(TARGET_VOL); }).catch(function(){});
      try { localStorage.setItem('musica_pref', 'on'); } catch(e) {}
    }

    btnMusic.onclick = function(){
      if(playing){
        playing = false;
        btnMusic.innerHTML = '🔇';
        btnMusic.classList.add('music-off');      // antes: btnMusic.style.color = '...'
        fadeTo(0);
        setTimeout(function(){ if(!playing){ music.pause(); music.volume = 0; } }, 600);
        try { localStorage.setItem('musica_pref', 'off'); } catch(e) {}
      } else {
        activarMusica();
      }
    };

    var pref = 'off';
    try { pref = localStorage.getItem('musica_pref') || 'off'; } catch(e) {}
    if(pref === 'on'){
      var resume = function(){
        if(!playing) activarMusica();
        document.removeEventListener('click',      resume);
        document.removeEventListener('touchstart', resume);
      };
      document.addEventListener('click',      resume);
      document.addEventListener('touchstart', resume);
    }
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
