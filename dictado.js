/* ============================================================
   DICTADO — motor independiente
   Reusa la funcionalidad del Nivel 4 de 'reto'. Lee el MISMO JSON
   (reto_clase_{leccion}.json → nivel4) y, si viene ?dictado=X, filtra a
   las oraciones cuyo 'oracion_completa' CONTIENE X (subcadena).
   Escucha el audio y ordena las fichas. Con evaluación (reintentar/saltar).
============================================================ */

const _params       = new URLSearchParams(location.search);
const _leccionRaw   = _params.get('leccion') || '1.1.1';
const _leccion      = _leccionRaw.replace(/\./g, '_');
const _dictadoFiltro = _params.get('dictado');   /* subcadena a buscar en oracion_completa, o null */
const JSON_URL      = 'data/' + _leccion + '/reto_clase_' + _leccion + '.json';

var _navMapa = document.getElementById('nav-mapa');
if (_navMapa) _navMapa.href = 'guia_navegacion.html?leccion=' + _leccionRaw;

const SND_OK  = 'audios/clase_1_1/Clase_1_1_Correcto.mp3';
const SND_ERR = 'audios/clase_1_1/Clase_1_1_Incorrecto.mp3';

const player = document.getElementById('player');
const sfx    = document.getElementById('sfx');

/* Estado */
let SESIONES = [], sIdx = 0;
let construido = [], actual = null, bloqueado = false, falloEnEsta = false;

function shuffle(a){ return a.slice().sort(function(){ return Math.random() - 0.5; }); }

/* Banco LOCAL: palabras solo de las oraciones filtradas (no de todo el nivel4) */
function bancoLocal(){
  var set = {};
  SESIONES.forEach(function(s){
    (s.oracion_completa || '').split(/\s+/).forEach(function(p){ if(p) set[p] = true; });
  });
  return Object.keys(set);
}

function nuevaOracion(){
  if (sIdx >= SESIONES.length){ irAFin(); return; }
  actual = SESIONES[sIdx];
  construido = []; bloqueado = false; falloEnEsta = false;

  document.getElementById('badge').textContent = 'Dictado · Oración ' + (sIdx + 1) + ' de ' + SESIONES.length;
  var fb = document.getElementById('feedback');
  fb.textContent = ''; fb.className = 'feedback';
  var build = document.getElementById('build');
  build.className = 'build-zone vacia'; build.innerHTML = '';
  mostrarBotones('comprobar');

  /* Fichas: palabras de la oración + hasta 3 distractores del banco local */
  var correctas = actual.oracion_completa.split(/\s+/).filter(Boolean);
  var banco = bancoLocal();
  var extra = shuffle(banco.filter(function(p){ return correctas.indexOf(p) === -1; })).slice(0, 3);
  var fichas = shuffle(correctas.concat(extra));

  var bank = document.getElementById('bank');
  bank.innerHTML = '';
  fichas.forEach(function(gu, idx){
    var chip = document.createElement('button');
    chip.className = 'ficha-dictado gu';
    chip.textContent = gu;
    chip.dataset.idx = idx;
    chip.onclick = function(){ tocar(chip, gu); };
    bank.appendChild(chip);
  });
  renderBuild();
  setTimeout(reproducir, 400);
}

function reproducir(){
  if (!actual || !actual.audio_oracion_completa) return;
  var btn = document.getElementById('btn-escuchar');
  if (btn) btn.classList.add('sonando');
  player.src = actual.audio_oracion_completa;
  player.play().catch(function(){});
  player.onended = function(){ player.onended = null; if(btn) btn.classList.remove('sonando'); };
}

function tocar(chip, gu){
  if (bloqueado) return;
  var btn = document.getElementById('btn-escuchar'); if(btn) btn.classList.remove('sonando');
  player.onended = null;
  chip.classList.add('usada');
  construido.push({ gu: gu, idx: chip.dataset.idx });
  renderBuild();
}

function renderBuild(){
  var zone = document.getElementById('build');
  if (zone.classList.contains('con-espanol')) return;
  zone.innerHTML = '';
  if (construido.length === 0){ zone.classList.add('vacia'); return; }
  zone.classList.remove('vacia');
  construido.forEach(function(item, i){
    var c = document.createElement('button');
    c.className = 'ficha-puesta gu';
    c.textContent = item.gu;
    c.onclick = function(){ quitar(i); };
    zone.appendChild(c);
  });
}

function quitar(i){
  if (bloqueado) return;
  var item = construido[i];
  var chip = document.querySelector('#bank .ficha-dictado[data-idx="' + item.idx + '"]');
  if (chip) chip.classList.remove('usada');
  construido.splice(i, 1);
  renderBuild();
}

function limpiar(){
  if (bloqueado) return;
  construido = [];
  document.querySelectorAll('#bank .ficha-dictado').forEach(function(c){ c.classList.remove('usada'); });
  renderBuild();
}

function mostrarEspanol(txt){
  var zone = document.getElementById('build');
  zone.classList.remove('vacia');
  zone.classList.add('con-espanol');
  zone.textContent = txt;
}

function mostrarBotones(cual){
  document.getElementById('btn-comprobar').style.display = (cual === 'comprobar') ? 'block' : 'none';
  document.getElementById('mini-fila').style.display     = (cual === 'reintentar') ? 'flex' : 'none';
}

function comprobar(){
  if (bloqueado || construido.length === 0 || !actual) return;
  var intento  = construido.map(function(x){ return x.gu; });
  var correcto = actual.oracion_completa.split(/\s+/).filter(Boolean);
  var ok = intento.length === correcto.length && intento.every(function(g, i){ return g === correcto[i]; });
  var fb = document.getElementById('feedback');

  if (ok){
    bloqueado = true;
    fb.textContent = ''; fb.className = 'feedback';
    mostrarEspanol(actual.espanol || '');
    sfx.src = SND_OK; sfx.play().catch(function(){});
    if (actual.audio_oracion_completa){
      setTimeout(function(){ player.src = actual.audio_oracion_completa; player.play().catch(function(){}); }, 650);
    }
    sIdx++;
    setTimeout(nuevaOracion, 2200);
  } else {
    bloqueado = true; falloEnEsta = true;
    fb.textContent = '✗ No es lo que dice el audio';
    fb.className = 'feedback err';
    sfx.src = SND_ERR; sfx.play().catch(function(){});
    mostrarBotones('reintentar');
  }
}

function reintentar(){
  bloqueado = false;
  limpiar();
  var fb = document.getElementById('feedback');
  fb.textContent = ''; fb.className = 'feedback';
  mostrarBotones('comprobar');
  setTimeout(reproducir, 300);
}

function saltar(){
  bloqueado = false;
  sIdx++;
  nuevaOracion();
}

function irAFin(){
  document.getElementById('ejercicio').style.display = 'none';
  document.getElementById('btn-salir').style.display = 'none';
  document.getElementById('fin').style.display = 'flex';
}

/* ── Init ── */
fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    var n4 = data.nivel4 || {};
    var sesiones = n4.sesiones || [];

    /* Si viene ?dictado=X, quedarse con las oraciones que CONTIENEN X */
    if (_dictadoFiltro){
      sesiones = sesiones.filter(function(s){ return (s.oracion_completa || '').indexOf(_dictadoFiltro) !== -1; });
    }
    SESIONES = sesiones;

    if (SESIONES.length === 0){
      document.querySelector('.wrap').innerHTML =
        '<p class="error-carga">No se encontraron oraciones para practicar.</p>' +
        '<button class="btn-sec" onclick="history.back()">← Volver</button>';
      return;
    }

    var instr = document.getElementById('instruccion');
    if (instr) instr.textContent = n4.instruccion || 'Escucha el audio y toca las palabras en gujarati para completar la oración.';
    nuevaOracion();
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
