// ── Parámetros de URL ──
const _params    = new URLSearchParams(location.search);
const _leccion   = (_params.get('leccion') || '1.1.1').replace(/\./g, '_');
const _nextParam = _params.get('next');
const _modo      = _params.get('modo');

const audio             = document.getElementById('audio');
const contenedorParrafo = document.getElementById('parrafo-contenedor');
const fill              = document.getElementById('progress-fill');

let DATA                 = null;
let NEXT_PAGE            = null;
let rafId                = null;
let segmentoActual       = -1;
let segmentoHover        = -1; // Controla qué segmento tiene el cursor encima
let segmentosDOM         = [];
let idxVelocidad         = 0;
let fragmentoObjetivoFin = null; // Almacena el límite exacto donde DEBE detenerse el audio
const VELOCIDADES        = [1.0, 0.75];

var idiomaEspActivo = true;

function construirParrafo() {
  contenedorParrafo.innerHTML = '';
  segmentosDOM = [];
  segmentoActual = -1;
  segmentoHover  = -1;

  if (!DATA || !DATA.segmentos) return;

  DATA.segmentos.forEach(function(seg, i) {
    var span = document.createElement('span');
    span.className   = 'segmento';
    span.id          = 'seg-' + i;
    span.textContent = seg.gujarati + ' ';
    
    // Tap-to-seek: reproduce ÚNICAMENTE este fragmento y se detiene
    span.onclick = function() {
      reproducirFragmento(seg);
    };

    // ── Al pasar el mouse por encima: mostrar la traducción en la barra inferior ──
    span.onmouseenter = function() {
      segmentoHover = i;
      if (idiomaEspActivo) {
        document.getElementById('sub-es').textContent = seg.espanol || '';
      }
    };

    // ── Al quitar el mouse: restaurar el texto activo o limpiar ──
    span.onmouseleave = function() {
      if (segmentoHover === i) {
        segmentoHover = -1;
        if (idiomaEspActivo) {
          if (segmentoActual >= 0 && DATA.segmentos[segmentoActual]) {
            document.getElementById('sub-es').textContent = DATA.segmentos[segmentoActual].espanol || '';
          } else {
            document.getElementById('sub-es').textContent = '';
          }
        }
      }
    };

    contenedorParrafo.appendChild(span);
    segmentosDOM.push(span);
  });
}

// ── Reproducción exclusiva de un fragmento (Echo Reading) ──
function reproducirFragmento(seg) {
  if (!audio.src || audio.src === '' || audio.src === window.location.href) {
    audio.src = DATA.lectura.audio;
    audio.addEventListener('loadedmetadata', function onLoaded() {
      audio.removeEventListener('loadedmetadata', onLoaded);
      iniciarReproduccionFragmento(seg);
    });
  } else {
    iniciarReproduccionFragmento(seg);
  }
}

function iniciarReproduccionFragmento(seg) {
  fragmentoObjetivoFin = seg.fin;
  audio.currentTime    = seg.ini;
  
  audio.play().catch(function() {});

  document.getElementById('btn-play').disabled = false;
  var btnP          = document.getElementById('btn-pause');
  btnP.textContent  = '⏸';
  btnP.style.display = 'inline-block';

  seguirLectura();
}

// ── Detiene la reproducción inmediatamente al terminar la oración aislada ──
function detenerFragmento() {
  audio.pause();
  fragmentoObjetivoFin = null;

  document.getElementById('btn-pause').style.display = 'none';
  document.getElementById('btn-play').disabled       = false;

  if (segmentoActual >= 0 && segmentosDOM[segmentoActual]) {
    segmentosDOM[segmentoActual].classList.remove('activo');
  }
  segmentoActual = -1;
  
  // Solo se limpia la traducción si el usuario NO tiene el cursor encima de otra frase
  if (segmentoHover === -1) {
    document.getElementById('sub-es').textContent = '';
  }
  
  cancelAnimationFrame(rafId);
}

function toggleIdioma(cual) {
  if (cual === 'esp') {
    idiomaEspActivo = !idiomaEspActivo;
    var btnEsp = document.getElementById('lang-esp');
    if (btnEsp) btnEsp.classList.toggle('active', idiomaEspActivo);
    aplicarModoSubtitulos();
  }
}

function toggleVelocidad() {
  idxVelocidad = (idxVelocidad + 1) % VELOCIDADES.length;
  var val = VELOCIDADES[idxVelocidad];
  audio.playbackRate = val;
  document.getElementById('btn-velocidad').textContent = val + 'x';
}

function aplicarModoSubtitulos() {
  var subEs  = document.getElementById('sub-textos');
  var subMjs = document.getElementById('sub-mensaje-escucha');

  if (idiomaEspActivo) {
    subEs.style.display  = '';
    subMjs.style.display = 'none';
    // Si al activar el español el mouse está sobre un segmento, mostrarlo de inmediato
    if (segmentoHover >= 0 && DATA.segmentos[segmentoHover]) {
      document.getElementById('sub-es').textContent = DATA.segmentos[segmentoHover].espanol || '';
    }
  } else {
    subEs.style.display  = 'none';
    subMjs.style.display = 'block';
  }
}

function reproducir() {
  document.body.classList.add('video-iniciado');
  document.getElementById('btn-empezar').textContent = 'Empezar →';

  fragmentoObjetivoFin = null;

  if (!audio.src || audio.src === '' || audio.src === window.location.href) {
    audio.src = DATA.lectura.audio;
  }

  audio.currentTime = 0;
  audio.play().catch(function() {});

  document.getElementById('btn-play').disabled = true;
  var btnP          = document.getElementById('btn-pause');
  btnP.textContent  = '⏸';
  btnP.style.display = 'inline-block';

  seguirLectura();
}

function togglePausa() {
  var btnP = document.getElementById('btn-pause');
  if (audio.paused) {
    audio.play();
    btnP.textContent = '⏸';
    seguirLectura();
  } else {
    audio.pause();
    btnP.textContent = '▶';
    cancelAnimationFrame(rafId);
  }
}

function seguirLectura() {
  cancelAnimationFrame(rafId);

  function loop() {
    var t   = audio.currentTime;
    var dur = audio.duration || (DATA.segmentos.length ? DATA.segmentos[DATA.segmentos.length - 1].fin : 20);
    fill.style.width = Math.min(100, (t / dur) * 100) + '%';

    if (fragmentoObjetivoFin !== null && t >= (fragmentoObjetivoFin - 0.03)) {
      detenerFragmento();
      return;
    }

    var algunaActiva = false;

    DATA.segmentos.forEach(function(seg, i) {
      var el     = segmentosDOM[i];
      var activa = (t >= seg.ini && t <= seg.fin);

      if (activa) {
        algunaActiva = true;

        if (segmentoActual !== i) {
          if (segmentoActual >= 0 && segmentosDOM[segmentoActual]) {
            segmentosDOM[segmentoActual].classList.remove('activo');
          }
          el.classList.add('activo');
          segmentoActual = i;

          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }

        // ── El audio solo actualiza la barra si NO hay un fragmento siendo apuntado con el mouse ──
        if (idiomaEspActivo && segmentoHover === -1) {
          document.getElementById('sub-es').textContent = seg.espanol || '';
        }
      } else {
        if (t > seg.fin && el.classList.contains('activo')) {
          el.classList.remove('activo');
        }
      }
    });

    if (!algunaActiva) {
      if (segmentoHover === -1) {
        document.getElementById('sub-es').textContent = '';
      }
      if (segmentoActual >= 0 && segmentosDOM[segmentoActual]) {
        segmentosDOM[segmentoActual].classList.remove('activo');
        segmentoActual = -1;
      }
    }

    if (!audio.paused && !audio.ended) {
      rafId = requestAnimationFrame(loop);
    }
  }

  rafId = requestAnimationFrame(loop);
}

audio.addEventListener('ended', function() {
  fill.style.width = '100%';
  if (segmentoHover === -1) {
    document.getElementById('sub-es').textContent = '';
  }
  if (segmentoActual >= 0 && segmentosDOM[segmentoActual]) {
    segmentosDOM[segmentoActual].classList.remove('activo');
  }
  segmentoActual       = -1;
  fragmentoObjetivoFin = null;
  document.getElementById('btn-pause').style.display = 'none';
  document.getElementById('btn-play').disabled       = false;
});

function configurarBotonFin() {
  var btn = document.getElementById('btn-empezar');
  function irADestino(destino) {
    cancelAnimationFrame(rafId);
    audio.pause(); 
    audio.src = '';
    if (destino) window.location.href = destino;
    else history.back();
  }

  if (_modo === 'intro') {
    var lecParam = _params.get('leccion') || '1.1.1';
    NEXT_PAGE    = 'leccion_intro.html?leccion=' + lecParam;
    btn.textContent = 'Comenzar la lección →';
    btn.href        = 'javascript:void(0)';
    btn.onclick     = function() { irADestino(NEXT_PAGE); };
    return;
  }

  NEXT_PAGE = _nextParam || (DATA.lectura && DATA.lectura.next) || null;
  if (NEXT_PAGE) {
    btn.textContent = 'Empezar →';
    btn.href        = 'javascript:void(0)';
    btn.onclick     = function() { irADestino(NEXT_PAGE); };
  } else {
    btn.textContent = 'Regresar';
    btn.href        = 'javascript:void(0)';
    btn.onclick     = function() {
      if (DATA.lectura.subtitulo_fin) document.getElementById('badge').textContent = DATA.lectura.subtitulo_fin;
      if (DATA.lectura.intro_fin)     document.getElementById('intro').textContent  = DATA.lectura.intro_fin;
      irADestino(null);
    };
  }
}

// ── Carga de Archivos de Datos ──
fetch('data/' + _leccion + '/lectura_' + _leccion + '.json')
  .then(function(r) { 
    if (!r.ok) throw new Error('404'); 
    return r.json(); 
  })
  .then(function(json) {
    DATA     = json;
    var info = json.lectura || {};

    if (info.subtitulo) document.getElementById('badge').textContent  = info.subtitulo;
    if (info.titulo)    document.getElementById('titulo').textContent = info.titulo;
    if (info.intro)     document.getElementById('intro').textContent  = info.intro;

    construirParrafo();
    aplicarModoSubtitulos();
    configurarBotonFin();
  })
  .catch(function() {
    document.querySelector('.wrap').innerHTML =
      '<p style="text-align:center;color:var(--ink-soft);padding:40px 20px;">No se pudo cargar el contenido de lectura.</p>';
  });

// ── Botón Volver ──
var _btnVolver = document.getElementById('btn-volver');
if (_btnVolver) {
  _btnVolver.onclick = function() {
    audio.pause(); 
    audio.src = '';
    cancelAnimationFrame(rafId);
    if (_modo === 'intro') {
      var lec    = _params.get('leccion') || '1.1.1';
      var partes = lec.split('.');
      window.location.href = 'contenido_modulo.html?modulo=' + partes[0] + '.' + partes[1];
    } else {
      history.back();
    }
  };
}

// ── Verificador de versión ──
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
