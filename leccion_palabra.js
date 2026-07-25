const BASE   = 'https://rubenbhai.github.io/GujaratiResources';
const player = document.getElementById('player');
let currentSpeed = 1.0;
let toggle       = 'm';

const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const _item       = parseInt(_params.get('item') || '1', 10);
const JSON_URL    = 'data/' + _leccion + '/leccion_palabra_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

function setSpeed(s){
  currentSpeed = s;
  document.getElementById('btn-normal').classList.toggle('active', s === 1.0);
  document.getElementById('btn-slow').classList.toggle('active',   s === 0.75);
}

function playVocab(btn, urlH, urlM){
  var useH = toggle === 'h';
  toggle   = useH ? 'm' : 'h';
  btn.classList.add('playing');
  btn.textContent    = useH ? '♬♂' : '♬♀';
  player.src         = useH ? urlH : urlM;
  player.playbackRate = currentSpeed;
  player.play();
  player.onended = function(){ btn.classList.remove('playing'); btn.textContent = '▶'; };
}

fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    var palabras = data.palabras;
    var total    = palabras.length;
    var idx      = Math.min(Math.max(_item, 1), total);
    var actual   = palabras[idx - 1];

    document.getElementById('page-title').textContent =
      actual.gujarati + ' — ' + actual.significado + ' · Piensa en Gujarati';
    document.getElementById('badge').textContent = 'Vocabulario ' + idx + ' de ' + total;

    document.getElementById('nav-home').href     = data.home;
    document.getElementById('nav-practicar').href = data.practicar;
    document.getElementById('nav-anterior').href  = (idx > 1)
      ? ('leccion_palabra.html?leccion=' + _leccionRaw + '&item=' + (idx - 1))
      : data.anterior_primera;

    var siguienteUrl = (idx < total)
      ? ('leccion_palabra.html?leccion=' + _leccionRaw + '&item=' + (idx + 1))
      : data.siguiente_final;

    var btnPracticarPron = document.getElementById('btn-practicar-pronunciacion');
    if(idx === total){
      btnPracticarPron.href         = data.practicar;
      btnPracticarPron.style.display = '';    // muestra (quita el inline display:none del HTML)
    } else {
      btnPracticarPron.style.display = 'none';
    }

    var img    = document.getElementById('img-palabra');
    img.src    = actual.imagen;
    img.alt    = actual.gujarati;
    img.onclick = function(){ window.location.href = siguienteUrl; };

    /* El icono ⛶ abre la imagen actual en modo 16:9, sin avanzar */
    document.getElementById('btn-ampliar').onclick = function(e){
      e.stopPropagation();
      abrirWide(actual.imagen, actual.gujarati);
    };

    document.getElementById('pronunciacion').innerHTML = '💡 ' + actual.pronunciacion;

    var btnPlay   = document.getElementById('btn-play');
    btnPlay.onclick = function(){ playVocab(btnPlay, actual.audioH, actual.audioM); };

    document.getElementById('btn-siguiente').href   = siguienteUrl;
    document.getElementById('btn-sigleccion').href  = data.siguiente_leccion;

    setTimeout(function(){
      player.src = actual.audioM;
      player.play().catch(function(){});
    }, 400);
  })
  .catch(function(){
    document.body.innerHTML =
      '<p class="error-carga">No se pudo cargar el contenido. Revisa tu conexión.</p>';
  });

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

/* ── MODO PANTALLA COMPLETA 16:9 ── */
function abrirWide(src, alt){
  var ov  = document.getElementById('wide-overlay');
  var wimg = document.getElementById('wide-img');
  wimg.src = src || '';
  wimg.alt = alt || '';
  ov.classList.add('activo');
  ov.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function cerrarWide(){
  var ov = document.getElementById('wide-overlay');
  ov.classList.remove('activo');
  ov.setAttribute('aria-hidden', 'true');
  document.getElementById('wide-img').src = '';
  document.body.style.overflow = '';
}

function _initWide(){
  var cerrar = document.getElementById('wide-cerrar');
  var ov     = document.getElementById('wide-overlay');
  if(cerrar) cerrar.onclick = cerrarWide;
  /* Tocar el fondo (fuera de la imagen) también cierra */
  if(ov) ov.onclick = function(e){ if(e.target === this) cerrarWide(); };
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') cerrarWide();
  });
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', _initWide);
} else {
  _initWide();
}
