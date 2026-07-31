/* ============================================================
   DICTADO BACKWARDS — motor independiente
   Reusa la funcionalidad del Nivel 6 de 'reto'. Lee el MISMO JSON
   (reto_clase_{leccion}.json → nivel6) y, si viene ?oracion=..., filtra
   a esa sola frase (igual que 'practica' filtra por ?palabra=).
   Escucha y repite; sin evaluación.
============================================================ */

const _params      = new URLSearchParams(location.search);
const _leccionRaw  = _params.get('leccion') || '1.1.1';
const _leccion     = _leccionRaw.replace(/\./g, '_');
const _oracionFiltro = _params.get('oracion');   /* gujarati de una frase, o null (todas) */
const JSON_URL     = 'data/' + _leccion + '/reto_clase_' + _leccion + '.json';

var _navMapa = document.getElementById('nav-mapa');
if (_navMapa) _navMapa.href = 'guia_navegacion.html?leccion=' + _leccionRaw;

const player = document.getElementById('player');

/* Estado */
let ORACIONES = [], oIdx = 0, fIdx = 0;

function mostrarFragmento(o, f){
  oIdx = o; fIdx = f;
  var frags = ORACIONES[o].fragmentos || [];
  var frag  = frags[f] || {};
  document.getElementById('badge').textContent    = 'Frase ' + (o + 1) + ' de ' + ORACIONES.length;
  document.getElementById('progreso').textContent = 'Parte ' + (f + 1) + ' de ' + frags.length;
  document.getElementById('cierre').style.display        = 'none';
  document.getElementById('fragmento-wrap').style.display = 'flex';
  document.getElementById('frag-texto').textContent = frag.texto || '';
  var esUltimo = (f === frags.length - 1);
  document.getElementById('btn-siguiente').textContent = esUltimo ? 'Ver la frase completa →' : 'Siguiente →';
  setTimeout(reproducir, 350);
}

function reproducir(){
  var frag = (ORACIONES[oIdx].fragmentos || [])[fIdx];
  if (!frag || !frag.audio) return;
  var btn = document.getElementById('btn-escuchar');
  if (btn) btn.classList.add('sonando');
  player.src = frag.audio;
  player.onended = function(){ player.onended = null; if (btn) btn.classList.remove('sonando'); };
  player.play().catch(function(){});
}
function repetir(){ reproducir(); }

function siguiente(){
  var frags = ORACIONES[oIdx].fragmentos || [];
  if (fIdx < frags.length - 1) mostrarFragmento(oIdx, fIdx + 1);
  else mostrarCierre();
}

function mostrarCierre(){
  var oracion = ORACIONES[oIdx];
  document.getElementById('fragmento-wrap').style.display = 'none';
  document.getElementById('cierre').style.display = 'flex';
  document.getElementById('cierre-gu').textContent = oracion.oracion_completa || '';
  document.getElementById('cierre-es').textContent = oracion.espanol || '';
  document.getElementById('progreso').textContent = '';
  var esUltimaOracion = (oIdx === ORACIONES.length - 1);
  document.getElementById('btn-siguiente-cierre').textContent = esUltimaOracion ? '✓ Terminar' : 'Siguiente frase →';
  setTimeout(reproducirCierre, 300);
}

function reproducirCierre(){
  var frags = ORACIONES[oIdx].fragmentos || [];
  var ultimo = frags[frags.length - 1];
  if (ultimo && ultimo.audio){ player.src = ultimo.audio; player.play().catch(function(){}); }
}

function siguienteOracion(){
  if (oIdx < ORACIONES.length - 1) mostrarFragmento(oIdx + 1, 0);
  else history.back();
}

/* ── Init ── */
fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    var n6 = data.nivel6 || {};
    var oraciones = n6.oraciones || [];

    /* Si viene ?oracion=..., practicar SOLO esa frase */
    if (_oracionFiltro){
      oraciones = oraciones.filter(function(o){ return o.oracion_completa === _oracionFiltro; });
    }
    ORACIONES = oraciones;

    if (ORACIONES.length === 0){
      document.querySelector('.wrap').innerHTML =
        '<p class="error-carga">No se encontró esta frase para practicar.</p>' +
        '<button class="btn-sec" onclick="history.back()">← Volver</button>';
      return;
    }

    var instr = document.getElementById('instruccion');
    if (instr) instr.textContent = n6.instruccion || 'Escucha cada parte y repítela en voz alta. La frase irá creciendo.';
    mostrarFragmento(0, 0);
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
      if (localV === null){
        try { localStorage.setItem('appVersion', serverV); } catch(e) {}
      } else if (localV !== serverV){
        try { localStorage.setItem('appVersion', serverV); } catch(e) {}
        location.reload(true);
      }
    })
    .catch(function(){});
})();
