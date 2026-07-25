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
let comprobando   = false;   /* candado compartido: bloquea Comprobar mientras se resuelve la ronda */

/* ── Fase de escucha ── */
let ORACIONES_ESC = [];
let escCola       = [];
let escIdx        = 0;
let escActual     = null;
let escConstruido = [];
let escAcertadas  = [];
const ESC_PAUSA_MS = 2600;   /* margen para que suene la oración antes de la ronda siguiente */

/* ── Fase libre ── */
let ORACIONES_LIBRE  = [];
let libreEncontradas = [];
let libreConstruido  = [];

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
    document.getElementById('feedback').textContent  = '¡Completaste los ejercicios! Ahora te toca crear…';
    document.getElementById('feedback').className    = 'feedback ok';
    document.getElementById('word-bank').innerHTML   = '';
    document.getElementById('build-zone').innerHTML  = '';
    document.getElementById('build-zone').classList.add('empty');
    document.getElementById('target-es').textContent = '—';
    setTimeout(iniciarFaseEscucha, 1800);
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
  if(comprobando) return;                       /* evita doble pulsación */
  if(construido.length === 0 || !actual) return;
  var intento  = construido.map(function(x){ return x.gu; });
  var correcto = actual.palabras;
  var fb       = document.getElementById('feedback');

  var igual = intento.length === correcto.length &&
              intento.every(function(g, i){ return g === correcto[i]; });

  comprobando = true;
  if(igual){
    fb.innerHTML  = '✓ ¡Correcto! <span class="traduccion gu">' + correcto.join(' ') + '</span>';
    fb.className  = 'feedback ok';
    sfx.src = SND_OK; sfx.play().catch(function(){});
    score++;
    document.getElementById('score').textContent = score;
    setTimeout(function(){ comprobando = false; nuevaRonda(); }, 1800);
  } else {
    fb.textContent = '✗ Inténtalo de nuevo';
    fb.className   = 'feedback err';
    sfx.src = SND_ERR; sfx.play().catch(function(){});
    setTimeout(function(){ comprobando = false; limpiar(); }, 1200);
  }
}

/* Init */
fetch(JSON_URL)
  .then(function(r){ if(!r.ok) throw new Error('No se encontró ' + JSON_URL); return r.json(); })
  .then(function(data){
    DATA      = data;
    BANCO     = data.banco_palabras || [];

    ORACIONES       = data.oraciones || [];
    ORACIONES_LIBRE = data.oraciones || [];
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


/* ═══════════════════════════════════════════════════════════
   FASE DE ESCUCHA — "¿Qué escuchaste?"
   Suena la oración completa; el estudiante la reconstruye en
   orden desde el banco. Mide segmentación auditiva, no traducción.
   ═══════════════════════════════════════════════════════════ */

function iniciarFaseEscucha(){
  /* El dictado usa las oraciones que tengan audio_oracion_completa.
     Ese mismo campo es el que suena en la fase libre al acertar. */
  ORACIONES_ESC = ORACIONES_LIBRE.filter(function(o){ return o.audio_oracion_completa; });
  if(!ORACIONES_ESC.length){ iniciarFaseLibre(); return; }   /* sin dictado, se salta */

  var cfg = (DATA && DATA.dictado) || {};
  document.getElementById('esc-titulo').textContent =
    cfg.titulo || 'Escucha y arma la oración';
  document.getElementById('esc-instruccion').textContent =
    cfg.instruccion || 'Toca las palabras en el orden en que las oyes.';

  escCola      = shuffle(ORACIONES_ESC);
  escIdx       = 0;
  escAcertadas = [];
  document.getElementById('esc-total').textContent = escCola.length;
  escRenderAcertadas();
  irAFase('fase-escucha');
  escNuevaRonda();
}

function escNuevaRonda(){
  if(escIdx >= escCola.length){
    var fbFin = document.getElementById('esc-feedback');
    fbFin.textContent = '¡Terminaste el dictado! Ahora te toca crear…';
    fbFin.className   = 'feedback ok';
    document.getElementById('esc-bank').innerHTML  = '';
    document.getElementById('esc-build').innerHTML = '';
    document.getElementById('esc-build').classList.add('empty');
    setTimeout(iniciarFaseLibre, 1800);
    return;
  }

  escActual     = escCola[escIdx];
  escConstruido = [];
  document.getElementById('esc-ronda').textContent    = escIdx + 1;
  document.getElementById('esc-feedback').textContent = '';
  document.getElementById('esc-feedback').className   = 'feedback';

  var sopa = construirSopa(escActual);
  var bank = document.getElementById('esc-bank');
  bank.innerHTML = '';
  sopa.forEach(function(gu, idx){
    var chip         = document.createElement('button');
    chip.className   = 'word-chip gu';
    chip.textContent = gu;
    chip.dataset.gu  = gu;
    chip.dataset.idx = idx;
    chip.onclick     = function(){ escTocar(chip, gu); };
    bank.appendChild(chip);
  });

  escRenderBuild();
  setTimeout(escReproducir, 400);
}

function escReproducir(){
  if(!escActual || !escActual.audio_oracion_completa) return;
  var btn = document.getElementById('esc-play');
  if(btn) btn.classList.add('sonando');
  player.src = escActual.audio_oracion_completa;
  player.play().catch(function(){});
  player.onended = function(){
    player.onended = null;
    if(btn) btn.classList.remove('sonando');
  };
}

function escTocar(chip, gu){
  var btn = document.getElementById('esc-play');
  if(btn) btn.classList.remove('sonando');
  player.onended = null;
  chip.classList.add('used');
  escConstruido.push({ gu: gu, chipIdx: chip.dataset.idx });
  /* Sin audio por palabra: el dictado se resuelve oyendo la frase entera,
     no emparejando sonidos sueltos. Para activarlo: reproducir(gu); */
  escRenderBuild();
}

function escRenderBuild(){
  var zone = document.getElementById('esc-build');
  zone.innerHTML = '';
  if(escConstruido.length === 0){ zone.classList.add('empty'); return; }
  zone.classList.remove('empty');
  escConstruido.forEach(function(item, i){
    var c         = document.createElement('button');
    c.className   = 'chip-built gu';
    c.textContent = item.gu;
    c.onclick     = function(){ escQuitar(i); };
    zone.appendChild(c);
  });
}

function escQuitar(i){
  var item = escConstruido[i];
  var chip = document.querySelector('#esc-bank .word-chip[data-idx="' + item.chipIdx + '"]');
  if(chip) chip.classList.remove('used');
  escConstruido.splice(i, 1);
  escRenderBuild();
}

function escLimpiar(){
  escConstruido = [];
  document.querySelectorAll('#esc-bank .word-chip').forEach(function(c){ c.classList.remove('used'); });
  escRenderBuild();
}

function escComprobar(){
  if(comprobando) return;
  if(escConstruido.length === 0 || !escActual) return;
  var intento = escConstruido.map(function(x){ return x.gu; });
  var fb      = document.getElementById('esc-feedback');

  var ok = intento.length === escActual.palabras.length;
  if(ok){
    for(var i = 0; i < intento.length; i++){
      if(intento[i] !== escActual.palabras[i]){ ok = false; break; }
    }
  }

  if(!ok){
    fb.textContent = '✗ No es lo que dice el audio — escucha otra vez';
    fb.className   = 'feedback err';
    sfx.src = SND_ERR; sfx.play().catch(function(){});
    comprobando = true;
    setTimeout(function(){ comprobando = false; escLimpiar(); }, 1200);
    return;
  }

  comprobando = true;

  escAcertadas.push(escActual.id);
  fb.textContent = '✓ ¡Eso dijo!';
  fb.className   = 'feedback ok';

  /* "Bien hecho" y, al terminar, la oración completa */
  var oracion = escActual;
  sfx.src = SND_OK;
  sfx.play().catch(function(){});
  var lanzado = false;
  var lanzarOracion = function(){
    if(lanzado) return;
    lanzado = true;
    sfx.onended = null;
    player.src = oracion.audio_oracion_completa;
    player.play().catch(function(){});
  };
  sfx.onended = lanzarOracion;
  setTimeout(lanzarOracion, 1200);

  escRenderAcertadas();
  escIdx++;
  setTimeout(function(){ comprobando = false; escNuevaRonda(); }, ESC_PAUSA_MS);
}


function escRenderAcertadas(){
  var cont = document.getElementById('esc-lista');
  cont.innerHTML = '';

  if(escAcertadas.length === 0){
    var vacio = document.createElement('div');
    vacio.className   = 'hallazgo-vacio';
    vacio.textContent = 'Aquí aparecerán las oraciones que reconozcas';
    cont.appendChild(vacio);
    return;
  }

  escAcertadas.forEach(function(id){
    var o = null;
    for(var k = 0; k < ORACIONES_ESC.length; k++){
      if(ORACIONES_ESC[k].id === id){ o = ORACIONES_ESC[k]; break; }
    }
    if(!o) return;
    var fila = document.createElement('div');
    fila.className = 'fila-hallazgo';
    fila.innerHTML =
      '<div class="fh-gu gu">' + o.palabras.join(' ') + '</div>' +
      '<div class="fh-es">'    + o.espanol           + '</div>';
    cont.appendChild(fila);
  });
}

/* ═══════════════════════════════════════════════════════════
   FASE LIBRE — "¿Cuántas oraciones puedes crear?"
   Sin pista en español. El estudiante arma libremente y
   descubre cuántas oraciones válidas logra formar.
   ═══════════════════════════════════════════════════════════ */

function irAFase(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function iniciarFaseLibre(){
  if(!ORACIONES_LIBRE.length){ history.back(); return; }
  libreEncontradas = [];
  libreConstruido  = [];
  var cfg = (DATA && DATA.fase_libre) || {};
  document.getElementById('libre-titulo').textContent =
    cfg.titulo || '¿Cuántas oraciones puedes crear?';
  document.getElementById('libre-instruccion').textContent =
    cfg.instruccion || 'Arma una oración con estas palabras y toca Comprobar.';
  document.getElementById('libre-feedback').textContent = '';
  document.getElementById('libre-feedback').className   = 'feedback';
  libreMontarBanco();
  libreRenderBuild();
  libreRenderEncontradas();
  irAFase('fase-libre');
}

function libreMontarBanco(){
  var bank = document.getElementById('libre-bank');
  bank.innerHTML = '';
  BANCO.forEach(function(b, idx){
    var chip         = document.createElement('button');
    chip.className   = 'word-chip gu';
    chip.textContent = b.gujarati;
    chip.dataset.gu  = b.gujarati;
    chip.dataset.idx = idx;
    chip.onclick     = function(){ libreTocar(chip, b.gujarati); };
    bank.appendChild(chip);
  });
}

function libreTocar(chip, gu){
  chip.classList.add('used');
  libreConstruido.push({ gu: gu, chipIdx: chip.dataset.idx });
  reproducir(gu);
  libreRenderBuild();
}

function libreRenderBuild(){
  var zone = document.getElementById('libre-build');
  zone.innerHTML = '';
  if(libreConstruido.length === 0){ zone.classList.add('empty'); return; }
  zone.classList.remove('empty');
  libreConstruido.forEach(function(item, i){
    var c         = document.createElement('button');
    c.className   = 'chip-built gu';
    c.textContent = item.gu;
    c.onclick     = function(){ libreQuitar(i); };
    zone.appendChild(c);
  });
}

function libreQuitar(i){
  var item = libreConstruido[i];
  var chip = document.querySelector('#libre-bank .word-chip[data-idx="' + item.chipIdx + '"]');
  if(chip) chip.classList.remove('used');
  libreConstruido.splice(i, 1);
  libreRenderBuild();
}

function libreLimpiar(){
  libreConstruido = [];
  document.querySelectorAll('#libre-bank .word-chip').forEach(function(c){ c.classList.remove('used'); });
  libreRenderBuild();
}

function libreComprobar(){
  if(comprobando) return;
  if(libreConstruido.length === 0) return;
  var intento = libreConstruido.map(function(x){ return x.gu; });
  var fb      = document.getElementById('libre-feedback');

  var hallada = null;
  for(var k = 0; k < ORACIONES_LIBRE.length; k++){
    var o = ORACIONES_LIBRE[k];
    if(o.palabras.length !== intento.length) continue;
    var igual = true;
    for(var j = 0; j < intento.length; j++){
      if(o.palabras[j] !== intento[j]){ igual = false; break; }
    }
    if(igual){ hallada = o; break; }
  }

  if(!hallada){
    fb.textContent = '✗ Esa combinación no forma una oración';
    fb.className   = 'feedback err';
    sfx.src = SND_ERR; sfx.play().catch(function(){});
    comprobando = true;
    setTimeout(function(){ comprobando = false; libreLimpiar(); }, 1200);
    return;
  }

  if(libreEncontradas.indexOf(hallada.id) !== -1){
    fb.textContent = '↺ Esa ya la tenías';
    fb.className   = 'feedback';
    comprobando = true;
    setTimeout(function(){ comprobando = false; libreLimpiar(); }, 1200);
    return;
  }

  comprobando = true;

  libreEncontradas.push(hallada.id);
  fb.textContent = '✓ ¡Nueva oración encontrada!';
  fb.className   = 'feedback ok';

  /* Suena "bien hecho" y, al terminar, la oración completa.
     El setTimeout es red de seguridad por si 'ended' no dispara. */
  sfx.src = SND_OK;
  sfx.play().catch(function(){});
  if(hallada.audio_oracion_completa){
    var lanzado = false;
    var lanzarOracion = function(){
      if(lanzado) return;
      lanzado = true;
      sfx.onended = null;
      player.src = hallada.audio_oracion_completa;
      player.play().catch(function(){});
    };
    sfx.onended = lanzarOracion;
    setTimeout(lanzarOracion, 1200);
  }

  libreRenderEncontradas();
  setTimeout(function(){ comprobando = false; libreLimpiar(); }, 1400);
}

function libreRenderEncontradas(){
  document.getElementById('libre-score').textContent = libreEncontradas.length;
  document.getElementById('libre-total').textContent = ORACIONES_LIBRE.length;
  var cont = document.getElementById('libre-lista');
  cont.innerHTML = '';

  if(libreEncontradas.length === 0){
    var vacio = document.createElement('div');
    vacio.className   = 'hallazgo-vacio';
    vacio.textContent = 'Aquí aparecerán las oraciones que descubras';
    cont.appendChild(vacio);
    return;
  }

  libreEncontradas.forEach(function(id){
    var o = null;
    for(var k = 0; k < ORACIONES_LIBRE.length; k++){
      if(ORACIONES_LIBRE[k].id === id){ o = ORACIONES_LIBRE[k]; break; }
    }
    if(!o) return;
    var fila = document.createElement('div');
    fila.className = 'fila-hallazgo';
    fila.innerHTML =
      '<div class="fh-gu gu">' + o.palabras.join(' ') + '</div>' +
      '<div class="fh-es">'    + o.espanol           + '</div>';
    cont.appendChild(fila);
  });
}

function evalLibre(pct){
  if(pct >= 91) return { emoji:'🏆', msg:'¡Impresionante!' };
  if(pct >= 71) return { emoji:'⭐', msg:'¡Muy bien!' };
  if(pct >= 51) return { emoji:'👍', msg:'¡Buen trabajo!' };
  if(pct >= 26) return { emoji:'💪', msg:'Vas por buen camino' };
  return            { emoji:'🌱', msg:'Buen comienzo' };
}

function terminarFaseLibre(){
  var n   = libreEncontradas.length;
  var t   = ORACIONES_LIBRE.length;
  var pct = t ? Math.round((n / t) * 100) : 0;
  var ev  = evalLibre(pct);

  document.getElementById('res-emoji').textContent = ev.emoji;
  document.getElementById('res-msg').textContent   = ev.msg;
  document.getElementById('res-pct').textContent   =
    'Creaste ' + n + ' de ' + t + ' oraciones (' + pct + '%)';

  var elDic = document.getElementById('res-dictado');
  if(ORACIONES_ESC.length){
    elDic.textContent   = 'Dictado: reconociste ' + escAcertadas.length + ' de ' + ORACIONES_ESC.length;
    elDic.style.display = '';
  } else {
    elDic.style.display = 'none';
  }

  var cont = document.getElementById('res-detalle');
  cont.innerHTML = '';
  ORACIONES_LIBRE.forEach(function(o){
    var ok   = libreEncontradas.indexOf(o.id) !== -1;
    var fila = document.createElement('div');
    fila.className = 'detalle-fila' + (ok ? '' : ' faltante');
    fila.innerHTML =
      '<span class="df-mark ' + (ok ? 'df-ok' : 'df-err') + '">' + (ok ? '✓' : '·') + '</span>' +
      '<span class="df-gu gu">' + o.palabras.join(' ') + '</span>' +
      '<span class="df-es">' + o.espanol + '</span>';
    cont.appendChild(fila);
  });

  irAFase('fase-resultado');
}

/* Verificador de versión */
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
