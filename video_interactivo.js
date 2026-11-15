// ── Constantes y parámetros ──
const BACKEND_URL = 'https://gujaratitraining-production.up.railway.app';
const SND_OK      = 'audios/clase_1_1/Clase_1_1_Correcto.mp3';

const _params     = new URLSearchParams(location.search);
const _leccion    = (_params.get('leccion') || '1.1.1').replace(/\./g, '_');
const _leccionRaw = _params.get('leccion') || '1.1.1';

var _navHome = document.getElementById('nav-home');
if (_navHome) _navHome.href = 'leccion_pensarEnGUJ.html?leccion=' + _leccionRaw;

const audio    = document.getElementById('audio');
const sfx      = document.getElementById('sfx');
const escena   = document.getElementById('escena');
const bgEscena = document.getElementById('bg-escena');
const elResaltado = document.getElementById('resaltado-avatar');

let DATA          = null;
let DIALOGOS      = [];
let AVATARES      = {};
let avatarElegido = null;

let idxActual  = 0;
let pasoActual = -1;
let runToken   = 0;
let burbujas   = [];
let burbujaDeDialogo = [];

let notasEstudiante      = [];
let turnosEstudiante     = 0;

let mediaRecorder = null;
let audioChunks   = [];
let audioBlobsEstudiante = {};
let grabando      = false;
let pidiendoMic   = false;   // evita abrir dos micrófonos con un doble toque
let guiaEsVisible = true;
let guiaGuVisible = true;

var imagenesCacheadas = [];
var dimensionesImagen = {};
var spritesColocados  = [];
var spritesPuestos    = {};

var fondoActualUrl    = null;
var RESALTADOR_URL    = null;

var mostrarAvatarIcono    = false;
var mostrarMarcadorActivo = false;
var idiomaEspActivo       = true;
var idiomaGujActivo       = true;
var burbujasTextoActivo   = true;

var PAUSA_TRAS_GRABAR_MS = 1800;

// ── Precarga global de assets ──
function precargarImagenes(){
  var urls = [];

  DIALOGOS.forEach(function(d){ if(d.imagenFondo) urls.push(d.imagenFondo); });
  DIALOGOS.forEach(function(d){
    if(d.coordenada_escena && d.coordenada_escena.length){
      d.coordenada_escena.forEach(function(s){ if(s.imagen) urls.push(s.imagen); });
    }
  });


  DIALOGOS.forEach(function(d){ if(d.imagenFondo) urls.push(d.imagenFondo); });
  Object.keys(AVATARES).forEach(function(key){ if(AVATARES[key].imagen) urls.push(AVATARES[key].imagen); });
  if(RESALTADOR_URL) urls.push(RESALTADOR_URL);
  urls = urls.filter(function(u, i){ return urls.indexOf(u) === i; });

  var promesas = urls.map(function(url){
    return new Promise(function(resolve){
      var img = new Image();
      img.onload  = function(){ dimensionesImagen[url] = { w: img.naturalWidth, h: img.naturalHeight }; resolve(); };
      img.onerror = resolve;
      img.src     = url;
      imagenesCacheadas.push(img);
    });
  });
  var limite = new Promise(function(resolve){ setTimeout(resolve, 8000); });
  return Promise.race([ Promise.all(promesas), limite ]);
 
}

// ── Cross-fade de fondo ──
var _bgEscenaB  = document.getElementById('bg-escena-b');
var _bgFadeTimer = null;

function cambiarFondo(url){
  if(!url || url === fondoActualUrl) return;
  if(!_bgEscenaB){
    bgEscena.style.backgroundImage = "url('" + url + "')";
    fondoActualUrl = url;
    return;
  }
  _bgEscenaB.style.backgroundImage = "url('" + url + "')";
  void _bgEscenaB.offsetWidth;
  _bgEscenaB.classList.add('activa');
  fondoActualUrl = url;
  if(_bgFadeTimer) clearTimeout(_bgFadeTimer);
  _bgFadeTimer = setTimeout(function(){
    bgEscena.style.backgroundImage = "url('" + url + "')";
    _bgEscenaB.classList.remove('activa');
  }, 520);
  aplicarRatioEscena();
}

/* ── PROPORCION DE LA ESCENA ──
   El marco toma la proporcion real de la imagen de fondo en vez del 16/9
   clavado en el CSS de escritorio. Igualadas las proporciones,
   background-size:cover deja de recortar y coordsAPixeles() no cambia. */
var _escenaWrap = document.querySelector('.escena-wrap');
function aplicarRatioEscena(){
  if(!_escenaWrap) return;
  var dim = dimensionesImagen[fondoActualUrl];
  if(!dim || !dim.w || !dim.h){
    _escenaWrap.style.removeProperty('--escena-ratio');
    _escenaWrap.classList.remove('con-ratio');
    return;
  }
  _escenaWrap.style.setProperty('--escena-ratio', dim.w + ' / ' + dim.h);
  if(window._horizontalLlenar) _escenaWrap.style.setProperty('--escena-ratio-h', '16 / 9');
  else _escenaWrap.style.removeProperty('--escena-ratio-h');
  if(window._verticalRatio) _escenaWrap.style.setProperty('--escena-ratio-v', window._verticalRatio);
  else _escenaWrap.style.removeProperty('--escena-ratio-v');
  _escenaWrap.classList.add('con-ratio');
  reposicionarSprites();
}

// ── Motor de coordenadas ──
function coordsAPixeles(coords){
  var dimFondo = dimensionesImagen[fondoActualUrl];
  if(!dimFondo || !bgEscena || !coords) return null;
  var cw = bgEscena.clientWidth, ch = bgEscena.clientHeight;
  var scale   = Math.max(cw / dimFondo.w, ch / dimFondo.h);
  var offsetX = (cw - dimFondo.w * scale) / 2;
  var offsetY = (ch - dimFondo.h * scale) / 2;
  return { x: offsetX + coords.x * scale, y: offsetY + coords.y * scale, scale: scale };
}

/* ── SPRITES DE ESCENA (portado de video.js) ──
   x, y  → coordenadas en el espacio del FONDO INICIAL
   ancho → ancho del sprite en ese mismo espacio (opcional)
   alto  → alto  del sprite en ese mismo espacio (opcional) */
function posicionarSprite(s){
  var punto = coordsAPixeles({ x: s.x, y: s.y });
  if(!punto) return;
  var dim       = dimensionesImagen[s.imagen];
  var anchoBase = (s.ancho !== undefined && s.ancho !== null) ? s.ancho : (dim ? dim.w : null);
  var altoBase  = (s.alto  !== undefined && s.alto  !== null) ? s.alto  : null;
  s.el.style.left   = Math.round(punto.x) + 'px';
  s.el.style.top    = Math.round(punto.y) + 'px';
  s.el.style.width  = (anchoBase !== null) ? Math.round(anchoBase * punto.scale) + 'px' : 'auto';
  s.el.style.height = (altoBase  !== null) ? Math.round(altoBase  * punto.scale) + 'px' : 'auto';
}

function colocarSprites(indice, d){
  var contenedor = document.getElementById('sprites-escena');
  if(!contenedor || !d.coordenada_escena) return;
  if(spritesPuestos[indice]) return;
  spritesPuestos[indice] = true;
  d.coordenada_escena.forEach(function(s){
    if(!s.imagen) return;
    var img = document.createElement('img');
    img.src = s.imagen;
    img.style.cssText = 'position:absolute;pointer-events:none;';
    contenedor.appendChild(img);
    var registro = { el:img, x:s.x, y:s.y, ancho:s.ancho, alto:s.alto, imagen:s.imagen };
    spritesColocados.push(registro);
    posicionarSprite(registro);
  });
}

function reposicionarSprites(){ spritesColocados.forEach(posicionarSprite); }

function limpiarSprites(){
  var contenedor = document.getElementById('sprites-escena');
  if(contenedor) contenedor.innerHTML = '';
  spritesColocados = [];
  spritesPuestos   = {};
}

function posicionarResaltado(coords){
  if(!mostrarMarcadorActivo || !coords){ elResaltado.classList.remove('visible'); return; }
  var dimBadge = dimensionesImagen[RESALTADOR_URL];
  var punto    = coordsAPixeles(coords);
  if(!dimBadge || !punto){ elResaltado.classList.remove('visible'); return; }
  var badgeW = dimBadge.w * punto.scale;
  var badgeH = dimBadge.h * punto.scale;
  elResaltado.style.left   = (punto.x - badgeW / 2) + 'px';
  elResaltado.style.top    = (punto.y - badgeH / 2) + 'px';
  elResaltado.style.width  = badgeW + 'px';
  elResaltado.style.height = badgeH + 'px';
  elResaltado.classList.add('visible');
}

function posicionarBurbuja(burbujaEl, coords){
  if(!coords){
    burbujaEl.style.position = '';
    burbujaEl.style.left     = '';
    burbujaEl.style.top      = '';
    return;
  }
  var punto = coordsAPixeles(coords);
  if(!punto) return;
  burbujaEl.style.position = 'absolute';
  burbujaEl.style.left     = punto.x + 'px';
  burbujaEl.style.top      = punto.y + 'px';

  // Burbujas "arriba" (cola hacia abajo) y "abajo" (cola hacia arriba), 14-nov-2026:
  // x = centro de la burbuja; la burbuja no se sale de la escena y la cola apunta
  // a coords.cola (x del que habla, en coordenadas del fondo).
  if(burbujaEl.classList.contains('arriba') || burbujaEl.classList.contains('abajo')){
    var cont  = burbujaEl.offsetParent;
    burbujaEl.style.left = '0px';                 // medir con todo el ancho disponible
    var w     = burbujaEl.offsetWidth, h = burbujaEl.offsetHeight;
    var left  = punto.x - w / 2, top = punto.y;
    if(cont){
      left = Math.max(6, Math.min(left, cont.clientWidth  - w - 6));
      top  = Math.max(6, Math.min(top,  cont.clientHeight - h - 6));
    }
    burbujaEl.style.left = left + 'px';
    burbujaEl.style.top  = top  + 'px';
    var pCola = coordsAPixeles({ x: (coords.cola !== undefined ? coords.cola : coords.x), y: coords.y });
    var caja  = burbujaEl.querySelector('.caja');
    var cx    = (pCola ? pCola.x : punto.x) - left - (caja ? caja.offsetLeft : 0) - 9;
    var maxC  = (caja ? caja.offsetWidth : w) - 30;
    burbujaEl.style.setProperty('--cola-x', Math.max(12, Math.min(cx, maxC)) + 'px');
  }
}

// ── Toggles ──
function toggleIdioma(cual){
  if(cual === 'esp') idiomaEspActivo = !idiomaEspActivo;
  if(cual === 'guj') idiomaGujActivo = !idiomaGujActivo;
  if(document.getElementById('lang-esp')) document.getElementById('lang-esp').classList.toggle('active', idiomaEspActivo);
  if(document.getElementById('lang-guj')) document.getElementById('lang-guj').classList.toggle('active', idiomaGujActivo);
  aplicarModoBurbujas();
  aplicarModoIdiomaSubtitulos();
}

function toggleBurbujasTexto(){
  burbujasTextoActivo = !burbujasTextoActivo;
  document.getElementById('toggle-burbujas').classList.toggle('active', burbujasTextoActivo);
  aplicarModoBurbujas();
}

function aplicarModoBurbujas(){
  escena.classList.toggle('burbujas-ocultas',  !burbujasTextoActivo);
  escena.classList.toggle('gujarati-oculto',   !idiomaGujActivo);
  escena.classList.toggle('espanol-oculto',    !idiomaEspActivo);
}

function aplicarModoIdiomaSubtitulos(){
  var textos  = document.getElementById('sub-textos');
  var avatar  = document.getElementById('sub-avatar');
  var mensaje = document.getElementById('sub-mensaje-escucha');
  if(!textos || !avatar || !mensaje) return;
  var modoEscucha      = !idiomaEspActivo;
  textos.style.display  = modoEscucha ? 'none' : '';
  avatar.style.display  = modoEscucha ? 'none' : '';
  mensaje.style.display = modoEscucha ? 'block' : 'none';
}

function toggleAvatarIcono(){
  mostrarAvatarIcono = !mostrarAvatarIcono;
  document.getElementById('toggle-avatar-icono').classList.toggle('active', mostrarAvatarIcono);
  burbujas.forEach(function(b){
    var av = b.querySelector('.avatar');
    if(av) av.style.display = mostrarAvatarIcono ? '' : 'none';
  });
}

function toggleMarcadorActivo(){
  mostrarMarcadorActivo = !mostrarMarcadorActivo;
  document.getElementById('toggle-marcador').classList.toggle('active', mostrarMarcadorActivo);
  if(!mostrarMarcadorActivo && elResaltado) elResaltado.classList.remove('visible');
  if(mostrarMarcadorActivo && DIALOGOS[idxActual]) posicionarResaltado(DIALOGOS[idxActual].avatarActivo);
}

// ── Pantallas ──
function goTo(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function evalMsg(pct){
  if(pct >= 91) return { emoji:'🏆', msg:'¡Felicidades!' };
  if(pct >= 81) return { emoji:'⭐', msg:'Muy bien' };
  if(pct >= 71) return { emoji:'👍', msg:'Ya casi lo logras' };
  if(pct >= 61) return { emoji:'💪', msg:'Vas bien...' };
  return               { emoji:'🔄', msg:'Sigue practicando' };
}

// ── Montaje de avatares ──
function montarAvatares(){
  var grid = document.getElementById('avatares-grid');
  grid.innerHTML = '';
  Object.keys(AVATARES).forEach(function(key){
    var av   = AVATARES[key];
    var card = document.createElement('div');
    card.className = 'avatar-card';
    card.onclick   = function(){ elegirAvatar(key); };
    card.setAttribute('role', 'button');
    card.tabIndex  = 0;
    card.onkeydown = function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); elegirAvatar(key); } };
    card.innerHTML =
      '<div class="foto" style="background-image:url(\'' + av.imagen + '\'); background-color:' + av.color + ';"></div>' +
      '<div class="nombre gu" style="color:' + av.color + ';">' + av.nombre + '</div>';
    grid.appendChild(card);
  });
}

function elegirAvatar(key){
  avatarElegido    = key;
  turnosEstudiante = DIALOGOS.filter(function(d){ return d.avatar === key; }).length;
  construirEscena();
  goTo('s-conversar');
}

// ── Construcción de escena ──
function construirEscena(){
  escena.innerHTML = '';
  burbujas         = [];
  burbujaDeDialogo = [];
  idxActual        = 0;
  notasEstudiante  = [];
  audioBlobsEstudiante = {};
  document.getElementById('progress-fill').style.width = '0%';

  var claveAIndice = {};
  var subAv = document.getElementById('sub-avatar');
  var subEs = document.getElementById('sub-es');
  if(subAv) subAv.textContent = '';
  if(subEs) subEs.textContent = '';

  DIALOGOS.forEach(function(d, i){
    var clave = (d.burbuja !== undefined && d.burbuja !== null) ? ('g' + d.burbuja) : ('d' + d.id);
    if(claveAIndice[clave] === undefined){
      var av    = AVATARES[d.avatar] || {};
      var color = av.color  || '#5F6E4F';
      var img   = av.imagen || '';
      var b     = document.createElement('div');
      b.className = 'burbuja ' + (d.lado || 'izq');
      b.id        = 'burbuja-' + burbujas.length;
      b.innerHTML =
        '<div class="avatar" style="background-image:url(\'' + img + '\'); background-color:' + color + ';"></div>' +
        '<div class="caja" style="background:' + color + '; --color-burbuja:' + color + ';">' +
          '<div class="gu-texto"></div>' +
          '<div class="es-texto"></div>' +
        '</div>';
      if(!mostrarAvatarIcono){
        var avEl = b.querySelector('.avatar');
        if(avEl) avEl.style.display = 'none';
      }
      escena.appendChild(b);
      claveAIndice[clave] = burbujas.length;
      burbujas.push(b);
    }
    burbujaDeDialogo[i] = claveAIndice[clave];
  });

  aplicarModoBurbujas();
  aplicarModoIdiomaSubtitulos();

  fondoActualUrl = null;
  if(_bgEscenaB){ _bgEscenaB.style.backgroundImage = 'none'; _bgEscenaB.classList.remove('activa'); }
  limpiarSprites();
  var fondoInicial = null;
  for(var k = 0; k < DIALOGOS.length; k++){
    if(DIALOGOS[k].imagenFondo){ fondoInicial = DIALOGOS[k].imagenFondo; break; }
  }
  if(fondoInicial){
    bgEscena.style.backgroundImage = "url('" + fondoInicial + "')";
    fondoActualUrl = fondoInicial;
  } else {
    bgEscena.style.backgroundImage = 'none';
  }
  aplicarRatioEscena();
}

// ── Conversación ──

/* iOS Safari: un <audio> solo puede sonar si su PRIMER play() ocurre dentro
   de un toque del usuario. 'sfx' siempre se toca más tarde (tras el fetch) y
   'audio' también, si el primer turno es del alumno. Se "desbloquean" aquí,
   en el toque de Comenzar, con un play() silenciado + pause(). */
function desbloquearAudios(){
  var lista = [sfx];
  if(DIALOGOS[0] && DIALOGOS[0].avatar === avatarElegido) lista.push(audio);
  lista.forEach(function(a){
    try {
      if(!a.getAttribute('src')) a.src = SND_OK;
      a.muted = true;
      var q = a.play();
      if(q && q.then) q.then(function(){ a.pause(); a.muted = false; }, function(){ a.muted = false; });
      else { a.pause(); a.muted = false; }
    } catch(e){ a.muted = false; }
  });
}

/* El botón de Comenzar se reutiliza para "Continuar" (si el navegador bloquea
   el audio) y para "Detener" la repetición del diálogo. */
function usarBotonIniciar(texto, accion){
  var b = document.getElementById('btn-iniciar');
  b.textContent   = texto;
  b.style.display = 'block';
  b.disabled      = false;
  b.onclick       = accion;
}
function restaurarBotonIniciar(){
  var b = document.getElementById('btn-iniciar');
  b.style.display = 'none';
  b.textContent   = '▶ Comenzar';
  b.onclick       = iniciarConversacion;
}

function iniciarConversacion(){
  document.getElementById('btn-iniciar').style.display = 'none';
  desbloquearAudios();
  runToken++;
  idxActual = 0;
  avanzar();
}

function pintarBurbuja(i, gujarati, espanol){
  var d    = DIALOGOS[i];
  var bIdx = burbujaDeDialogo[i];

  burbujas.forEach(function(b, idx){
    if(idx !== bIdx){ b.classList.add('saliente'); b.classList.remove('visible'); b.classList.remove('activa'); }
  });

  var b = burbujas[bIdx];
  if(!b) return;

  b.querySelector('.gu-texto').textContent = gujarati || '';
  b.querySelector('.es-texto').textContent = espanol  || '';

  var av    = AVATARES[d.avatar] || {};
  var color = av.color  || '#5F6E4F';
  var img   = av.imagen || '';
  b.className = 'burbuja ' + (d.lado || 'izq') + ' visible activa';

  var avEl = b.querySelector('.avatar');
  if(avEl){
    avEl.style.backgroundImage = "url('" + img + "')";
    avEl.style.backgroundColor = color;
    avEl.style.display         = mostrarAvatarIcono ? '' : 'none';
  }
  var cajaEl = b.querySelector('.caja');
  if(cajaEl){ cajaEl.style.background = color; cajaEl.style.setProperty('--color-burbuja', color); }

  colocarSprites(i, d);
  if(d.Burbuja_Posicion) posicionarBurbuja(b, d.Burbuja_Posicion);
  else posicionarBurbuja(b, null);
  if(mostrarMarcadorActivo) posicionarResaltado(d.avatarActivo);
  else elResaltado.classList.remove('visible');

  var nombreRoman = (d.avatar || '').charAt(0).toUpperCase() + (d.avatar || '').slice(1);
  var subAv = document.getElementById('sub-avatar');
  var subEs = document.getElementById('sub-es');
  if(subAv) subAv.textContent = nombreRoman + ' : ';
  if(subEs) subEs.textContent = espanol || '';

  document.getElementById('progress-fill').style.width =
    Math.round(((i + 1) / DIALOGOS.length) * 100) + '%';
}

function detenerAudio(){
  audio.onended = null;
  audio.onerror = null;
  try { audio.pause(); } catch(e) {}
}

function avanzar(){
  detenerAudio();
  if(idxActual >= DIALOGOS.length){ finalizar(); return; }
  var d = DIALOGOS[idxActual];

  if(d.avatar === avatarElegido){
    pasoActual = idxActual;
    if(mostrarMarcadorActivo) posicionarResaltado(d.avatarActivo);
    mostrarTurnoEstudiante(d);
    return;
  }

  pintarBurbuja(idxActual, d.gujarati, d.espanol);
  document.getElementById('turno-box').style.display = 'none';

  var miPaso  = idxActual;
  var miToken = runToken;
  var yaAvanzo = false;

  function continuar(){
    if(yaAvanzo) return; yaAvanzo = true; detenerAudio();
    if(miToken !== runToken || idxActual !== miPaso) return;
    idxActual++;
    setTimeout(avanzar, 400);
  }

  audio.onended = continuar;
  audio.onerror = continuar;
  audio.src     = d.audio;
  var p = audio.play();
  if(p && p.catch) p.catch(function(err){
    // Navegador bloqueó el audio (iOS fuera de un toque): sin esto 'ended'
    // nunca llega y la conversación se congela. Pedimos un toque para seguir.
    if(!err || err.name !== 'NotAllowedError') return;
    if(miToken !== runToken || idxActual !== miPaso) return;
    usarBotonIniciar('▶ Continuar', function(){
      restaurarBotonIniciar();
      var q = audio.play();
      if(q && q.catch) q.catch(continuar);
    });
  });
}

function mostrarTurnoEstudiante(d){
  detenerAudio();
  pintarBurbuja(idxActual, '', '');
  var box = document.getElementById('turno-box');
  box.style.display = 'flex';
  document.getElementById('guia-gu').textContent = d.gujarati;
  document.getElementById('guia-es').textContent = d.espanol;
  document.getElementById('guia-box').classList.remove('guia-oculta');

  guiaEsVisible = true;
  guiaGuVisible = true;
  document.getElementById('guia-es').classList.remove('oculta');
  document.getElementById('guia-gu').classList.remove('oculta');
  document.getElementById('btn-guia-es').classList.add('activo');
  document.getElementById('btn-guia-gu').classList.add('activo');
  document.getElementById('estado-turno').textContent = '';

  var btn = document.getElementById('btn-grabar');
  btn.innerHTML = '🎙 Grabar mi voz';
  btn.classList.remove('recording');
  btn.disabled = false;
}

function toggleGuiaES(){
  guiaEsVisible = !guiaEsVisible;
  document.getElementById('guia-es').classList.toggle('oculta', !guiaEsVisible);
  document.getElementById('btn-guia-es').classList.toggle('activo', guiaEsVisible);
}

function toggleGuiaGUJ(){
  guiaGuVisible = !guiaGuVisible;
  document.getElementById('guia-gu').classList.toggle('oculta', !guiaGuVisible);
  document.getElementById('btn-guia-gu').classList.toggle('activo', guiaGuVisible);
}

function toggleGrabacion(){
  var btn = document.getElementById('btn-grabar');
  if(grabando){
    grabando = false;
    btn.innerHTML = '🎙 Grabar mi voz';
    btn.classList.remove('recording');
    if(mediaRecorder && mediaRecorder.state === 'recording'){
      btn.disabled = true;        // evita un segundo toque antes de que onstop → enviarTurno lo reactive
      mediaRecorder.stop();
    }
    /* si el sistema ya cortó el micrófono (llamada, cambio de app) el recorder está
       inactivo y onstop ya corrió: no se deshabilita, para no dejar el botón muerto */
    return;
  }
  if(pidiendoMic) return;
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder){
    alert('Este navegador no permite grabar audio.');
    ofrecerSaltarTurno();
    return;
  }
  pidiendoMic = true;
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream){
    pidiendoMic = false;
    try { mediaRecorder = new MediaRecorder(stream); }
    catch(e){ stream.getTracks().forEach(function(t){ t.stop(); }); throw e; }   // no dejar el micrófono abierto
    document.getElementById('estado-turno').textContent = '';
    audioChunks    = [];
    mediaRecorder.ondataavailable = function(e){ if(e.data && e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = function(){
      /* también llega aquí si el sistema cortó el micrófono (llamada, cambio de app):
         se deja el botón coherente para que el siguiente toque no sea un toque muerto */
      grabando = false;
      btn.innerHTML = '🎙 Grabar mi voz';
      btn.classList.remove('recording');
      var blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      enviarTurno(blob);
      stream.getTracks().forEach(function(t){ t.stop(); });
    };
    mediaRecorder.start();
    grabando       = true;
    btn.innerHTML  = '🛑 Detener';
    btn.classList.add('recording');
  }).catch(function(){
    pidiendoMic = false;
    alert('Verifica los permisos de tu micrófono.');
    ofrecerSaltarTurno();
  });
}

/* Si no se puede grabar o evaluar (backend caído, sin permiso de micrófono),
   el alumno puede seguir la conversación en vez de quedarse atascado. */
function ofrecerSaltarTurno(){
  var est = document.getElementById('estado-turno');
  if(est.querySelector('.btn-saltar')) return;
  var saltar = document.createElement('button');
  saltar.className   = 'btn-guia btn-saltar';
  saltar.textContent = 'Saltar este turno →';
  saltar.onclick = function(){
    if(grabando || pidiendoMic) return;
    document.getElementById('turno-box').style.display = 'none';
    if(idxActual === pasoActual){ idxActual++; avanzar(); }
  };
  est.appendChild(document.createElement('br'));
  est.appendChild(saltar);
}

function enviarTurno(blob){
  audioBlobsEstudiante[idxActual] = blob;
  var d = DIALOGOS[idxActual];
  document.getElementById('estado-turno').textContent = '⏳ Procesando tu voz...';
  document.getElementById('btn-grabar').disabled = true;

  var reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = function(){
    var base64   = reader.result.split(',')[1];
    var mimeType = blob.type || 'audio/webm';
    /* Tope de 30 s: con el servidor colgado el alumno quedaba en "Procesando..." sin
       botón ni "Saltar". Al abortar entra el catch, que rehabilita Grabar y ofrece Saltar. */
    var ctrl = window.AbortController ? new AbortController() : null;
    var tmr  = ctrl ? setTimeout(function(){ ctrl.abort(); }, 30000) : null;
    fetch(BACKEND_URL + '/api/evaluar-audio', {
      method: 'POST', signal: ctrl ? ctrl.signal : undefined,
      headers: { 'Content-Type':'application/json', 'x-access-token': sessionStorage.getItem('accessToken') || '' },
      body: JSON.stringify({ audioBase64: base64, mimeType: mimeType, fraseObjetivo: d.gujarati })
    })
    .then(function(r){ clearTimeout(tmr); if(!r.ok) throw new Error('err'); return r.json(); })
    .then(function(data){
      notasEstudiante.push(data.nota);
      var transcrito = data.transcripcion || d.gujarati;
      d.gujaratiTranscrito = transcrito;

      var bIdx = burbujaDeDialogo[idxActual];
      burbujas[bIdx].querySelector('.gu-texto').textContent = transcrito;
      burbujas[bIdx].querySelector('.es-texto').textContent = d.espanol;

      var subEs = document.getElementById('sub-es');
      if(subEs) subEs.textContent = d.espanol;

      sfx.src = SND_OK; sfx.play().catch(function(){});
      document.getElementById('turno-box').style.display = 'none';
      detenerAudio();
      if(idxActual === pasoActual){ idxActual++; setTimeout(avanzar, PAUSA_TRAS_GRABAR_MS); }
    })
    .catch(function(){
      document.getElementById('estado-turno').textContent = '⚠️ No se pudo procesar. Intenta de nuevo.';
      document.getElementById('btn-grabar').disabled = false;
      ofrecerSaltarTurno();
    });
  };
}

function finalizar(){
  document.getElementById('progress-fill').style.width = '100%';
  var pct;
  if(notasEstudiante.length === 0){
    pct = 0;
  } else {
    var prom = notasEstudiante.reduce(function(a, b){ return a + b; }, 0) / notasEstudiante.length;
    pct = Math.round(prom * 10);
  }
  var ev = evalMsg(pct);
  document.getElementById('res-emoji').textContent = ev.emoji;
  document.getElementById('res-msg').textContent   = ev.msg;
  document.getElementById('res-pct').textContent   = 'Tu pronunciación: ' + pct + '%';
  document.getElementById('res-sub').textContent   =
    'Participaste ' + notasEstudiante.length + ' de ' + turnosEstudiante +
    ' veces como ' + (AVATARES[avatarElegido] ? AVATARES[avatarElegido].nombre : '');

  var subAv = document.getElementById('sub-avatar');
  var subEs = document.getElementById('sub-es');
  if(subAv) subAv.textContent = '';
  if(subEs) subEs.textContent = '';

  goTo('s-resultado');
}

function reiniciarTodo(){
  runToken++;
  detenerAudio();
  avatarElegido        = null;
  idxActual            = 0;
  notasEstudiante      = [];
  audioBlobsEstudiante = {};
  DIALOGOS.forEach(function(d){ delete d.gujaratiTranscrito; });
  document.getElementById('btn-iniciar').style.display = 'block';
  document.getElementById('turno-box').style.display   = 'none';
  bgEscena.style.backgroundImage = 'none';
  if(_bgEscenaB){ _bgEscenaB.style.backgroundImage = 'none'; _bgEscenaB.classList.remove('activa'); }
  limpiarSprites();
  fondoActualUrl = null;
  elResaltado.classList.remove('visible');

  var subAv = document.getElementById('sub-avatar');
  var subEs = document.getElementById('sub-es');
  if(subAv) subAv.textContent = '';
  if(subEs) subEs.textContent = '';

  goTo('s-elegir');
}

// ── Replay ──
var replayIdx    = 0;
var replayActivo = false;

function reproducirDialogo(){
  if(replayActivo) return;
  replayActivo = true;
  replayIdx    = 0;
  limpiarSprites();
  document.getElementById('btn-replay-dialogo').textContent = '⏹ Reproduciendo...';
  document.getElementById('btn-replay-dialogo').onclick     = detenerReplay;

  var blobsGuardados       = audioBlobsEstudiante;
  construirEscena();
  audioBlobsEstudiante     = blobsGuardados;

  document.getElementById('turno-box').style.display   = 'none';
  // El botón original queda en la pantalla de resultado (oculta): ofrecer Detener aquí
  usarBotonIniciar('⏹ Detener', detenerReplay);
  goTo('s-conversar');
  siguienteReplay();
}

function detenerReplay(){
  replayActivo = false;
  detenerAudio();
  restaurarBotonIniciar();
  document.getElementById('btn-replay-dialogo').textContent = '▶ Ver el diálogo completo';
  document.getElementById('btn-replay-dialogo').onclick     = reproducirDialogo;

  var subAv = document.getElementById('sub-avatar');
  var subEs = document.getElementById('sub-es');
  if(subAv) subAv.textContent = '';
  if(subEs) subEs.textContent = '';

  goTo('s-resultado');
}

function siguienteReplay(){
  if(!replayActivo || replayIdx >= DIALOGOS.length){ detenerReplay(); return; }
  var d = DIALOGOS[replayIdx];
  var i = replayIdx;
  var guTexto = d.gujaratiTranscrito || d.gujarati;
  pintarBurbuja(i, guTexto, d.espanol);

  if(d.avatar === avatarElegido && audioBlobsEstudiante[i]){
    var blobUrl = URL.createObjectURL(audioBlobsEstudiante[i]);
    audio.onended = null; audio.onerror = null;
    audio.src     = blobUrl;
    audio.play().catch(function(){});
    audio.onended = function(){ URL.revokeObjectURL(blobUrl); replayIdx++; setTimeout(siguienteReplay, 400); };
    audio.onerror = function(){ URL.revokeObjectURL(blobUrl); replayIdx++; setTimeout(siguienteReplay, 400); };
  } else {
    audio.onended = null; audio.onerror = null;
    audio.src     = d.audio;
    audio.play().catch(function(){});
    audio.onended = function(){ replayIdx++; setTimeout(siguienteReplay, 400); };
    audio.onerror = function(){ replayIdx++; setTimeout(siguienteReplay, 400); };
  }
}

function volverAFin(){
  window.location.href = 'leccion_pensarEnGUJ.html?leccion=' + _leccionRaw;
}

// ── Init ──
fetch('data/' + _leccion + '/dialogo_' + _leccion + '.json')
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(json){
    var vi       = json.video_interactivo || {};
    window._verticalRatio = (json.video && json.video.vertical === '4:3') ? '4 / 3' : null;   // fondo 16:9: vertical ve el centro 4:3
    window._horizontalLlenar = !!(json.video && json.video.horizontal === 'llenar');   // celular de lado: llenar a 16:9
    DATA         = json;
    DIALOGOS     = json.dialogos  || [];
    AVATARES     = json.avatares  || {};
    RESALTADOR_URL = json.imagenAvatarActivo || null;
    if(RESALTADOR_URL) elResaltado.style.backgroundImage = "url('" + RESALTADOR_URL + "')";
    if(vi.subtitulo) document.getElementById('badge').textContent = vi.subtitulo;
    if(vi.titulo)    document.getElementById('titulo').textContent = vi.titulo;
    if(vi.intro)     document.getElementById('intro').textContent  = vi.intro;
    montarAvatares();

    var btnIniciar          = document.getElementById('btn-iniciar');
    var textoIniciarOriginal = btnIniciar.textContent;
    btnIniciar.disabled     = true;
    btnIniciar.textContent  = 'Cargando…';
    precargarImagenes().then(function(){
      // Si el alumno eligió personaje antes de que cargara el fondo, la
      // proporción no se pudo aplicar entonces: aplicarla ahora.
      aplicarRatioEscena(); reposicionarTodo();
      btnIniciar.disabled    = false;
      btnIniciar.textContent = textoIniciarOriginal;
    });
  })
  .catch(function(){
    document.querySelector('.wrap').innerHTML =
      '<p style="text-align:center;color:var(--ink-soft);padding:40px 20px;">No se pudo cargar el contenido. Revisa tu conexión.</p>';
  });

/* ── Recolocar todo lo que se posiciona en píxeles al cambiar el tamaño ── */
function reposicionarTodo(){
  reposicionarSprites();
  var d = DIALOGOS[idxActual];
  if(!d) return;
  var bIdx = burbujaDeDialogo[idxActual];
  var b    = (bIdx !== undefined) ? burbujas[bIdx] : null;
  if(b && b.classList.contains('visible')) posicionarBurbuja(b, d.Burbuja_Posicion || null);
  if(mostrarMarcadorActivo && elResaltado && elResaltado.classList.contains('visible'))
    posicionarResaltado(d.avatarActivo);
}
var _resizeSpritesTimer = null;
window.addEventListener('resize', function(){
  clearTimeout(_resizeSpritesTimer);
  _resizeSpritesTimer = setTimeout(reposicionarTodo, 80);
});


// ── Verificador de versión ──
(function() {
  var VERSION_URL = 'version.txt';
  fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(function(serverV){
      serverV = serverV.trim();
      if(!serverV || serverV.length > 20) return;   // respuesta rara (p.ej. una página 404): no recargar
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