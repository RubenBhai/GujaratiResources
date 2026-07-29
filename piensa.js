/* ============================================================
   PIENSA — Motor de comprensión y transformación
   Estímulo (audio | texto | video)  ×  Pregunta (ordenar | imagen | opcion)
   Práctica en bucle. Una pregunta a la vez. Respuesta correcta por bandera.
   Datos: data/{leccion}/piensa_clase_{leccion}.json
============================================================ */

/* ── Parámetros de URL ── */
const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/piensa_clase_' + _leccion + '.json';

var _navMapa = document.getElementById('nav-mapa');
if (_navMapa) _navMapa.href = 'guia_navegacion.html?leccion=' + _leccionRaw;

/* ── Sonidos de acierto / error (compartidos con el resto del curso) ── */
const SND_OK  = 'audios/clase_1_1/Clase_1_1_Correcto.mp3';
const SND_ERR = 'audios/clase_1_1/Clase_1_1_Incorrecto.mp3';

/* ── Elementos ── */
const player = document.getElementById('player');
const sfx    = document.getElementById('sfx');
const zEstimulo = document.getElementById('estimulo-zona');
const zWidget   = document.getElementById('preg-widget');
const elEnunciado = document.getElementById('preg-enunciado');
const elFeedback  = document.getElementById('feedback');

/* ── Estado ── */
let DATA         = null;
let ACTIVIDADES  = [];
let actIdx       = 0;
let actActual    = null;

let aciertos      = 0;
let totalPregs    = 0;
let falloEnEsta   = false;

let avanceActual  = function(){};   /* qué hacer cuando se resuelve la pregunta actual */

/* Estado del modo ORDENAR */
let construido = [];

/* Estado del estímulo VIDEO */
let videoEl        = null;
let vidPreguntas   = [];   /* preguntas con ancla, ordenadas asc. */
let vidFinales     = [];   /* preguntas sin ancla → van al final del video */
let vpIdx          = 0;
let finIdx         = 0;
let enPregunta     = false;
let enFinales      = false;

/* ── Utilidades ── */
function shuffle(a){ return a.slice().sort(function(){ return Math.random() - 0.5; }); }

function mostrar(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function reproducirAudio(url, btn){
  if(!url) return;
  player.src = url;
  if(btn){ btn.classList.add('sonando'); player.onended = function(){ player.onended = null; btn.classList.remove('sonando'); }; }
  player.play().catch(function(){});
}

function detenerMedios(){
  try { player.pause(); } catch(e){}
  player.onended = null;
  if(videoEl){ try { videoEl.pause(); } catch(e){} }
}

/* ── Flujo principal ── */
function empezar(){
  actIdx     = 0;
  aciertos   = 0;
  totalPregs = 0;
  cargarActividad(0);
}

function cargarActividad(idx){
  detenerMedios();
  videoEl = null;
  actIdx  = idx;

  if(idx >= ACTIVIDADES.length){ irAFin(); return; }
  actActual = ACTIVIDADES[idx];

  document.getElementById('top-fill').style.width = Math.round((idx / ACTIVIDADES.length) * 100) + '%';

  elFeedback.textContent = '';
  elFeedback.className    = 'feedback';
  zWidget.innerHTML       = '';
  elEnunciado.textContent = '';

  var est = actActual.estimulo || {};
  mostrar('s-actividad');

  if(est.tipo === 'video')      montarEstimuloVideo(est);
  else if(est.tipo === 'texto') { montarEstimuloTexto(est); iniciarPreguntasSecuenciales(); }
  else                          { montarEstimuloAudio(est); iniciarPreguntasSecuenciales(); }
}

/* ── ESTÍMULO: AUDIO ── */
function montarEstimuloAudio(est){
  zEstimulo.innerHTML =
    '<span class="estimulo-label">Escucha</span>' +
    '<div class="estimulo-audio">' +
      '<button class="btn-audio" id="est-audio-btn">🔊</button>' +
    '</div>';
  var btn = document.getElementById('est-audio-btn');
  btn.onclick = function(){ reproducirAudio(est.audio, btn); };
  setTimeout(function(){ reproducirAudio(est.audio, btn); }, 350);   /* se escucha una vez al entrar */
}

/* ── ESTÍMULO: TEXTO ── */
function montarEstimuloTexto(est){
  zEstimulo.innerHTML =
    '<div class="target-card">' +
      '<div class="target-label">Lee esta oración</div>' +
      '<div class="target-gu gu" id="est-texto"></div>' +
    '</div>';
  document.getElementById('est-texto').textContent = est.texto || '';
}

/* ── ESTÍMULO: VIDEO (MP4 + anclas por segundo) ── */
function montarEstimuloVideo(est){
  zEstimulo.innerHTML =
    '<div class="video-wrap"><video id="est-video" playsinline preload="metadata"></video></div>' +
    '<button class="btn-play" id="est-video-play">▶ Reproducir</button>';

  videoEl = document.getElementById('est-video');
  videoEl.src = est.video || '';

  var preguntas = actActual.preguntas || [];
  vidPreguntas = preguntas.filter(function(p){ return typeof p.ancla === 'number'; })
                          .sort(function(a, b){ return a.ancla - b.ancla; });
  vidFinales   = preguntas.filter(function(p){ return typeof p.ancla !== 'number'; });
  vpIdx = 0; finIdx = 0; enPregunta = false; enFinales = false;

  var inicio = (typeof est.inicio === 'number') ? est.inicio : 0;
  var fin    = (typeof est.fin === 'number') ? est.fin : Infinity;

  videoEl.addEventListener('loadedmetadata', function(){
    if(inicio > 0){ try { videoEl.currentTime = inicio; } catch(e){} }
  });

  videoEl.addEventListener('timeupdate', function(){
    if(enPregunta || enFinales) return;
    /* ¿toca una pregunta anclada? */
    if(vpIdx < vidPreguntas.length && videoEl.currentTime >= vidPreguntas[vpIdx].ancla){
      enPregunta = true;
      videoEl.pause();
      mostrarPregunta(vidPreguntas[vpIdx], trasPreguntaAnclada);
      return;
    }
    /* ¿llegó al corte 'fin'? */
    if(videoEl.currentTime >= fin){
      videoEl.pause();
      iniciarFinalesVideo();
    }
  });

  videoEl.addEventListener('ended', function(){ iniciarFinalesVideo(); });

  var btnPlay = document.getElementById('est-video-play');
  btnPlay.onclick = function(){ videoEl.play().catch(function(){}); };
}

function trasPreguntaAnclada(){
  vpIdx++;
  enPregunta = false;
  limpiarZonaPregunta();
  var fin = (actActual.estimulo && typeof actActual.estimulo.fin === 'number') ? actActual.estimulo.fin : Infinity;
  if(videoEl.ended || videoEl.currentTime >= fin){ iniciarFinalesVideo(); }
  else { videoEl.play().catch(function(){}); }   /* reanuda hasta la próxima ancla o el final */
}

function iniciarFinalesVideo(){
  if(enFinales) return;              /* evita doble arranque (ended + corte 'fin') */
  enFinales = true;
  try { videoEl.pause(); } catch(e){}
  if(vidFinales.length === 0){ cargarActividad(actIdx + 1); return; }
  finIdx = 0;
  mostrarPregunta(vidFinales[finIdx], trasPreguntaFinalVideo);
}

function trasPreguntaFinalVideo(){
  finIdx++;
  limpiarZonaPregunta();
  if(finIdx < vidFinales.length){ mostrarPregunta(vidFinales[finIdx], trasPreguntaFinalVideo); }
  else { cargarActividad(actIdx + 1); }
}

/* ── Preguntas secuenciales (audio / texto: todas tras el estímulo, una a la vez) ── */
var seqIdx = 0;
function iniciarPreguntasSecuenciales(){
  seqIdx = 0;
  var preguntas = actActual.preguntas || [];
  if(preguntas.length === 0){ cargarActividad(actIdx + 1); return; }
  mostrarPregunta(preguntas[seqIdx], trasPreguntaSecuencial);
}
function trasPreguntaSecuencial(){
  seqIdx++;
  limpiarZonaPregunta();
  var preguntas = actActual.preguntas || [];
  if(seqIdx < preguntas.length){ mostrarPregunta(preguntas[seqIdx], trasPreguntaSecuencial); }
  else { cargarActividad(actIdx + 1); }
}

/* ── Mostrar una pregunta (enruta según modo) ── */
function limpiarZonaPregunta(){
  zWidget.innerHTML = '';
  elFeedback.textContent = '';
  elFeedback.className   = 'feedback';
}

function mostrarPregunta(preg, avanceFn){
  avanceActual = avanceFn || function(){};
  falloEnEsta  = false;
  totalPregs++;
  limpiarZonaPregunta();
  elEnunciado.textContent = preg.enunciado || '';

  if(preg.modo === 'ordenar')     widgetOrdenar(preg);
  else if(preg.modo === 'imagen') widgetImagen(preg);
  else                            widgetOpcion(preg);   /* 'opcion' por defecto */
}

/* ── Resolución compartida ── */
function acierto(traduccionGu){
  if(!falloEnEsta) aciertos++;
  elFeedback.className   = 'feedback ok';
  elFeedback.innerHTML   = traduccionGu
    ? '✓ ¡Correcto! <span class="traduccion gu">' + traduccionGu + '</span>'
    : '✓ ¡Correcto!';
  sfx.src = SND_OK; sfx.play().catch(function(){});
  setTimeout(function(){ avanceActual(); }, traduccionGu ? 1600 : 1000);
}

function marcarFallo(){
  falloEnEsta = true;
  elFeedback.textContent = '✗ Inténtalo de nuevo';
  elFeedback.className    = 'feedback err';
  sfx.src = SND_ERR; sfx.play().catch(function(){});
}

/* ── MODO ORDENAR (sopa de palabras) ── */
function widgetOrdenar(preg){
  construido = [];
  var correctas    = (preg.respuesta || []).slice();
  var distractores = (preg.distractores || []).slice();
  var sopa = shuffle(correctas.concat(distractores));

  zWidget.innerHTML =
    '<div class="build-zone empty" id="build-zone"></div>' +
    '<div class="word-bank" id="word-bank"></div>' +
    '<button class="btn-main" id="btn-comprobar">Comprobar</button>' +
    '<button class="btn-sec"  id="btn-limpiar">🔄 Limpiar</button>';

  var bank = document.getElementById('word-bank');
  sopa.forEach(function(gu, idx){
    var chip = document.createElement('button');
    chip.className   = 'word-chip gu';
    chip.textContent = gu;
    chip.dataset.idx = idx;
    chip.onclick     = function(){ ordenarTocar(chip, gu); };
    bank.appendChild(chip);
  });

  document.getElementById('btn-comprobar').onclick = function(){ ordenarComprobar(preg); };
  document.getElementById('btn-limpiar').onclick   = ordenarLimpiar;
  ordenarRender();
}

function ordenarTocar(chip, gu){
  chip.classList.add('used');
  construido.push({ gu: gu, idx: chip.dataset.idx });
  ordenarRender();
}

function ordenarRender(){
  var zone = document.getElementById('build-zone');
  if(!zone) return;
  zone.innerHTML = '';
  if(construido.length === 0){ zone.classList.add('empty'); return; }
  zone.classList.remove('empty');
  construido.forEach(function(item, i){
    var c = document.createElement('button');
    c.className   = 'chip-built gu';
    c.textContent = item.gu;
    c.onclick     = function(){ ordenarQuitar(i); };
    zone.appendChild(c);
  });
}

function ordenarQuitar(i){
  var item = construido[i];
  var chip = document.querySelector('#word-bank .word-chip[data-idx="' + item.idx + '"]');
  if(chip) chip.classList.remove('used');
  construido.splice(i, 1);
  ordenarRender();
}

function ordenarLimpiar(){
  construido = [];
  document.querySelectorAll('#word-bank .word-chip').forEach(function(c){ c.classList.remove('used'); });
  ordenarRender();
}

function ordenarComprobar(preg){
  if(construido.length === 0) return;
  var intento  = construido.map(function(x){ return x.gu; });
  var correcto = preg.respuesta || [];
  var ok = intento.length === correcto.length && intento.every(function(g, i){ return g === correcto[i]; });
  if(ok){ acierto(correcto.join(' ')); }
  else { marcarFallo(); setTimeout(ordenarLimpiar, 1100); }
}

/* ── MODO IMAGEN (hasta 4 imágenes; bandera 'correcta') ── */
function widgetImagen(preg){
  var opciones = shuffle((preg.opciones || []).slice());
  var cont = document.createElement('div');
  cont.className = 'options';
  opciones.forEach(function(op){
    var btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.innerHTML = '<img class="opt-img" src="' + (op.imagen || '') + '" alt="">';
    btn.onclick   = function(){ opcionElegir(btn, !!op.correcta); };
    cont.appendChild(btn);
  });
  zWidget.appendChild(cont);
}

/* ── MODO OPCIÓN (varias oraciones; bandera 'correcta') ──
   preg.opciones_idioma: 'gu' (por defecto, fuente gujarati) | 'es' (texto normal) */
function widgetOpcion(preg){
  var esGuj = (preg.opciones_idioma || 'gu') !== 'es';
  var opciones = shuffle((preg.opciones || []).slice());
  var cont = document.createElement('div');
  cont.className = 'options';
  opciones.forEach(function(op){
    var btn = document.createElement('button');
    if(esGuj){ btn.className = 'opt-btn'; btn.innerHTML = '<span class="gu">' + (op.texto || '') + '</span>'; }
    else     { btn.className = 'opt-btn opt-text'; btn.textContent = op.texto || ''; }
    btn.onclick = function(){ opcionElegir(btn, !!op.correcta); };
    cont.appendChild(btn);
  });
  zWidget.appendChild(cont);
}

/* Resolución compartida para imagen y opción */
function opcionElegir(btn, esCorrecta){
  if(btn.disabled) return;
  if(esCorrecta){
    document.querySelectorAll('#preg-widget .opt-btn').forEach(function(b){ b.disabled = true; });
    btn.classList.add('correct');
    acierto('');
  } else {
    btn.classList.add('wrong');
    btn.disabled = true;   /* se descarta esta; puede elegir otra */
    marcarFallo();
  }
}

/* ── FIN ── */
function irAFin(){
  detenerMedios();
  document.getElementById('top-fill').style.width = '100%';
  document.getElementById('fin-total').textContent    = totalPregs;
  document.getElementById('fin-aciertos').textContent = aciertos;
  mostrar('s-fin');
}

/* ── Init ── */
fetch(JSON_URL)
  .then(function(r){ if(!r.ok) throw new Error('No se encontró ' + JSON_URL); return r.json(); })
  .then(function(data){
    DATA        = data;
    ACTIVIDADES = data.actividades || [];
    var st = document.getElementById('stat-total');
    if(st) st.textContent = ACTIVIDADES.length;
    if(data.titulo)  document.getElementById('inicio-titulo').textContent = data.titulo;
    if(data.intro)   document.getElementById('inicio-intro').textContent  = data.intro;
    if(ACTIVIDADES.length === 0){
      document.getElementById('btn-empezar').disabled = true;
      document.getElementById('inicio-intro').textContent = 'Esta lección todavía no tiene actividades de "Piensa".';
    }
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
      if(localV === null){
        try { localStorage.setItem('appVersion', serverV); } catch(e) {}
      } else if(localV !== serverV){
        try { localStorage.setItem('appVersion', serverV); } catch(e) {}
        location.reload(true);
      }
    })
    .catch(function(){});
})();
