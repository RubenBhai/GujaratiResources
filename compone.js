// Leemos el parámetro 'leccion' de la URL (por ejemplo: ?leccion=1.1.1)
const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/compone_clase_' + _leccion + '.json';

/* Lista de ids que manda la nota gramatical: ?practica_flash=1,2,3,4,11 */
const _flash = (_params.get('practica_flash') || '')
                 .split(',').map(function(s){ return s.trim(); }).filter(Boolean);

const navMapa = document.getElementById('nav-mapa');
navMapa.href  = 'guia_navegacion.html?leccion=' + _leccionRaw;

const player = document.getElementById('player');
const sfx    = document.getElementById('sfx');

let DATA          = null;
let BANCO         = [];
let ORACIONES     = [];
let SND_OK        = '';
let SND_ERR       = '';
let actual        = null;
let colaOraciones = [];
let construido    = [];
let score         = 0;

function shuffle(a){ return a.slice().sort(function(){ return Math.random() - 0.5; }); }

function audioDe(gu){
  var item = BANCO.find(function(b){ return b.gujarati === gu; });
  return item ? item.audio : null;
}

function reproducir(gu){
  var url = audioDe(gu);
  if(url){ player.src = url; player.play().catch(function(){}); }
}

/* Elegir oración sin repetir hasta agotar todas */
function elegirOracion(){
  if(colaOraciones.length === 0) return null;
  return colaOraciones.shift();
}

function iniciarCola(){
  var mezclada = shuffle(ORACIONES.slice());
  if(actual && mezclada.length > 1 && mezclada[0].id === actual.id){
    mezclada.push(mezclada.shift());
  }
  colaOraciones = mezclada;
}

/* Construir la sopa: palabras correctas + 2-4 distractores */
function construirSopa(oracion){
  var correctas      = oracion.palabras.slice();
  var numDistractores = 2 + Math.floor(Math.random() * 3);
  var pool = BANCO.map(function(b){ return b.gujarati; })
    .filter(function(g){ return correctas.indexOf(g) === -1; });
  var distractores = shuffle(pool).slice(0, numDistractores);
  return shuffle(correctas.concat(distractores));
}

function nuevaRonda(){
  actual = elegirOracion();
  if(!actual){
    var btn = document.getElementById('btn-check');
    btn.textContent = 'Regresar';
    btn.onclick     = function(){ history.back(); };
    document.getElementById('feedback').textContent  = '¡Completaste todos los ejercicios!';
    document.getElementById('feedback').className    = 'feedback ok';
    document.getElementById('word-bank').innerHTML   = '';
    document.getElementById('build-zone').innerHTML  = '';
    document.getElementById('build-zone').classList.add('empty');
    document.getElementById('target-es').textContent = '—';
    return;
  }
  construido = [];
  document.getElementById('feedback').textContent  = '';
  document.getElementById('feedback').className    = 'feedback';
  document.getElementById('target-es').textContent = actual.espanol;

  var sopa = construirSopa(actual);
  var bank = document.getElementById('word-bank');
  bank.innerHTML = '';
  sopa.forEach(function(gu, idx){
    var chip        = document.createElement('button');
    chip.className  = 'word-chip gu';
    chip.textContent = gu;
    chip.dataset.gu  = gu;
    chip.dataset.idx = idx;
    chip.onclick     = function(){ tocarPalabra(chip, gu); };
    bank.appendChild(chip);
  });
  renderBuild();
}

function tocarPalabra(chip, gu){
  chip.classList.add('used');
  construido.push({ gu: gu, chipIdx: chip.dataset.idx });
  reproducir(gu);
  renderBuild();
}

function renderBuild(){
  var zone = document.getElementById('build-zone');
  zone.innerHTML = '';
  if(construido.length === 0){ zone.classList.add('empty'); return; }
  zone.classList.remove('empty');
  construido.forEach(function(item, i){
    var c        = document.createElement('button');
    c.className  = 'chip-built gu';
    c.textContent = item.gu;
    c.onclick    = function(){ quitarPalabra(i); };
    zone.appendChild(c);
  });
}

function quitarPalabra(i){
  var item = construido[i];
  var chip = document.querySelector('.word-chip[data-idx="' + item.chipIdx + '"]');
  if(chip) chip.classList.remove('used');
  construido.splice(i, 1);
  renderBuild();
}

function limpiar(){
  construido = [];
  document.querySelectorAll('.word-chip').forEach(function(c){ c.classList.remove('used'); });
  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className   = 'feedback';
  renderBuild();
}

function comprobar(){
  if(construido.length === 0) return;
  var intento  = construido.map(function(x){ return x.gu; });
  var correcto = actual.palabras;
  var fb       = document.getElementById('feedback');

  var igual = intento.length === correcto.length &&
              intento.every(function(g, i){ return g === correcto[i]; });

  if(igual){
    fb.innerHTML  = '✓ ¡Correcto! <span class="traduccion gu">' + correcto.join(' ') + '</span>';
    fb.className  = 'feedback ok';
    sfx.src = SND_OK; sfx.play().catch(function(){});
    score++;
    document.getElementById('score').textContent = score;
    setTimeout(nuevaRonda, 1800);
  } else {
    fb.textContent = '✗ Inténtalo de nuevo';
    fb.className   = 'feedback err';
    sfx.src = SND_ERR; sfx.play().catch(function(){});
    setTimeout(limpiar, 1200);
  }
}

/* Init */
fetch(JSON_URL)
  .then(function(r){ if(!r.ok) throw new Error('No se encontró ' + JSON_URL); return r.json(); })
  .then(function(data){
    DATA      = data;
    BANCO     = data.banco_palabras || [];

    ORACIONES = data.oraciones      || [];
    if(_flash.length){
      var filtradas = ORACIONES.filter(function(o){ return _flash.indexOf(String(o.id)) !== -1; });
      if(filtradas.length) ORACIONES = filtradas;
      else console.warn('practica_flash sin coincidencias:', _flash);
    }

    SND_OK    = data.sonido_correcto;
    SND_ERR   = data.sonido_incorrecto;
    if(data.boton_comprobar) document.getElementById('btn-check').textContent = data.boton_comprobar;
    iniciarCola();
    nuevaRonda();
  })
  .catch(function(){
    document.querySelector('.wrap').innerHTML =
      '<p class="subtitle">No se pudo cargar el contenido. Revisa tu conexión.</p>';
  });

/* Verificador de versión */
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
