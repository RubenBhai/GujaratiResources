// ── Parámetros de URL ──
const _params    = new URLSearchParams(location.search);
const _leccion   = (_params.get('leccion') || '1.1.1').replace(/\./g, '_');
const _nextParam = _params.get('next');
const _modo      = _params.get('modo');

const audio  = document.getElementById('audio');
const escena = document.getElementById('escena');
const fill   = document.getElementById('progress-fill');

let DATA       = null;
let DIALOGOS   = [];
let SECUENCIAS = [];
let AVATARES   = {};
let NEXT_PAGE  = null;
let RESALTADOR_URL = null;

let burbujas         = [];
let mostradas        = [];
let dialogoSecuencia = [];
let burbujaDeDialogo = [];
let secuenciaActual  = -1;
let rafId            = null;

var dimensionesImagen   = {};
var fondoActualUrl      = null;
var elResaltado         = null;

var mostrarAvatarIcono    = false;
var mostrarMarcadorActivo = false;

var imagenesCacheadas = [];
var spritesColocados  = [];  // registro para reposicionar en cada frame

function precargarImagenes(){
  var urls = [];
  SECUENCIAS.forEach(function(sec){ if(sec.imagenFondo) urls.push(sec.imagenFondo); });
  DIALOGOS.forEach(function(d){ if(d.imagenFondo) urls.push(d.imagenFondo); });
  DIALOGOS.forEach(function(d){
    if(d.coordenada_escena && d.coordenada_escena.length){
      d.coordenada_escena.forEach(function(s){ if(s.imagen) urls.push(s.imagen); });
    }
  });
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

function construirEscena(){
  escena.innerHTML = '';

  var bgDiv = document.createElement('div');
  bgDiv.id        = 'bg-escena';
  bgDiv.className = 'bg-escena';
  escena.appendChild(bgDiv);

  var bgDivB = document.createElement('div');
  bgDivB.id        = 'bg-escena-b';
  bgDivB.className = 'bg-escena bg-capa-b';
  escena.appendChild(bgDivB);

  // Contenedor de sprites de escena (se acumulan encima del fondo).
  // overflow:hidden es CRITICO: los sprites recortan en el mismo borde que
  // el fondo (background-size:cover). Sin esto, un sprite que se sale del
  // contenedor genera scroll en .escena (overflow-y:auto), la barra reduce
  // clientWidth, la escala se recalcula, el sprite encoge, la barra
  // desaparece... y el ciclo se repite en cada frame del RAF.
  var spritesDiv = document.createElement('div');
  spritesDiv.id             = 'sprites-escena';
  spritesDiv.style.cssText  = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:1;';
  escena.appendChild(spritesDiv);

  var resaltado = document.createElement('div');
  resaltado.className = 'resaltado-avatar';
  if(RESALTADOR_URL) resaltado.style.backgroundImage = "url('" + RESALTADOR_URL + "')";
  escena.appendChild(resaltado);
  elResaltado = resaltado;

  burbujas         = [];
  burbujaDeDialogo = [];
  mostradas        = DIALOGOS.map(function(){ return false; });
  spritesColocados = [];

  var claveAIndice = {};

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
          '<div class="gu-texto">' + (d.gujarati || '') + '</div>' +
          '<div class="es-texto">' + (d.espanol  || '') + '</div>' +
        '</div>';
      escena.appendChild(b);
      claveAIndice[clave] = burbujas.length;
      burbujas.push(b);
      if(!mostrarAvatarIcono){
        var avNueva = b.querySelector('.avatar');
        if(avNueva) avNueva.style.display = 'none';
      }
    }
    burbujaDeDialogo[i] = claveAIndice[clave];
  });

  secuenciaActual = -1;

  // Establecer fondo inicial (solo el primero — nunca cambia)
  fondoActualUrl = null;
  var fondoInicial = null;
  if(SECUENCIAS.length && SECUENCIAS[0].imagenFondo) fondoInicial = SECUENCIAS[0].imagenFondo;
  else if(DIALOGOS.length && DIALOGOS[0].imagenFondo) fondoInicial = DIALOGOS[0].imagenFondo;
  if(fondoInicial){
    var base0 = document.getElementById('bg-escena');
    if(base0) base0.style.backgroundImage = "url('" + fondoInicial + "')";
    fondoActualUrl = fondoInicial;
  }

  ajustarAltura(burbujasEnSecuencia(0));
}

function burbujasEnSecuencia(sidx){
  if(!SECUENCIAS.length) return 1;
  var vistos = {};
  SECUENCIAS[sidx].dialogos.forEach(function(id){
    var i = DIALOGOS.findIndex(function(x){ return x.id === id; });
    if(i >= 0) vistos[ burbujaDeDialogo[i] ] = true;
  });
  return Object.keys(vistos).length || 1;
}

function mapearSecuencias(){
  dialogoSecuencia = DIALOGOS.map(function(){ return 0; });
  SECUENCIAS.forEach(function(sec, sidx){
    sec.dialogos.forEach(function(id){
      var idx = DIALOGOS.findIndex(function(d){ return d.id === id; });
      if(idx >= 0) dialogoSecuencia[idx] = sidx;
    });
  });
}

function ajustarAltura(numDialogos){
  var paddingTotal = 28;
  var gapTotal     = (numDialogos > 1) ? (numDialogos - 1) * 10 : 0;
  var alturaReal   = paddingTotal + gapTotal + (75 * numDialogos);
  escena.style.height = alturaReal + 'px';
}

/* ─────────────────────────────────────────────────────────────
   SPRITES DE ESCENA
   Se acumulan encima del fondo inicial y nunca se borran.

   x, y   → coordenadas en el espacio del FONDO INICIAL (obligatorio)
   ancho  → ancho del sprite en el espacio del FONDO INICIAL (opcional)
   alto   → alto  del sprite en el espacio del FONDO INICIAL (opcional)

   Si NO se especifica "ancho", se usa el tamaño natural del PNG.
   Eso solo funciona bien si el sprite fue recortado de una imagen
   con la MISMA resolución que el fondo inicial. Si el recorte vino
   de una imagen de otra resolución, el sprite saldrá desproporcionado
   — en ese caso, especifica "ancho" en el JSON y queda resuelto.
   ───────────────────────────────────────────────────────────── */
function posicionarSprite(s){
  var punto = coordsAPixeles({ x: s.x, y: s.y });
  if(!punto) return;

  var dim = dimensionesImagen[s.imagen];

  // Ancho en el espacio del fondo base: del JSON si viene, si no del PNG natural
  var anchoBase = (s.ancho !== undefined && s.ancho !== null)
    ? s.ancho
    : (dim ? dim.w : null);

  var altoBase = (s.alto !== undefined && s.alto !== null)
    ? s.alto
    : null;

  s.el.style.left = Math.round(punto.x) + 'px';
  s.el.style.top  = Math.round(punto.y) + 'px';

  if(anchoBase !== null){
    s.el.style.width = Math.round(anchoBase * punto.scale) + 'px';
  } else {
    s.el.style.width = 'auto';
  }

  if(altoBase !== null){
    s.el.style.height = Math.round(altoBase * punto.scale) + 'px';
  } else {
    s.el.style.height = 'auto';
  }
}

function colocarSprites(d){
  var contenedor = document.getElementById('sprites-escena');
  if(!contenedor || !d.coordenada_escena) return;
  d.coordenada_escena.forEach(function(s){
    if(!s.imagen) return;
    var img = document.createElement('img');
    img.src = s.imagen;
    img.style.cssText = 'position:absolute;pointer-events:none;';
    contenedor.appendChild(img);

    var registro = {
      el:     img,
      x:      s.x,
      y:      s.y,
      ancho:  s.ancho,
      alto:   s.alto,
      imagen: s.imagen
    };
    spritesColocados.push(registro);
    posicionarSprite(registro);
  });
}

function reposicionarSprites(){
  spritesColocados.forEach(posicionarSprite);
}

/* Cross-fade de fondo — se mantiene por si se necesita en el futuro */
var _bgFadeTimer = null;
function cambiarFondo(url){
  if(!url || url === fondoActualUrl) return;
  var base  = document.getElementById('bg-escena');
  var capaB = document.getElementById('bg-escena-b');
  if(!base || !capaB){
    if(base) base.style.backgroundImage = "url('" + url + "')";
    fondoActualUrl = url;
    return;
  }
  capaB.style.backgroundImage = "url('" + url + "')";
  void capaB.offsetWidth;
  capaB.classList.add('activa');
  fondoActualUrl = url;
  if(_bgFadeTimer) clearTimeout(_bgFadeTimer);
  _bgFadeTimer = setTimeout(function(){
    base.style.backgroundImage = "url('" + url + "')";
    capaB.classList.remove('activa');
  }, 520);
}

function coordsAPixeles(coords){
  var dimFondo = dimensionesImagen[fondoActualUrl];
  var bg       = document.getElementById('bg-escena');
  if(!dimFondo || !bg || !coords) return null;

  var cw      = bg.clientWidth, ch = bg.clientHeight;
  var scale   = Math.max(cw / dimFondo.w, ch / dimFondo.h);
  var offsetX = (cw - dimFondo.w * scale) / 2;
  var offsetY = (ch - dimFondo.h * scale) / 2;

  return { x: offsetX + coords.x * scale, y: offsetY + coords.y * scale, scale: scale };
}

function posicionarResaltado(coords){
  var dimBadge = dimensionesImagen[RESALTADOR_URL];
  var punto    = coordsAPixeles(coords);
  if(!dimBadge || !punto){ elResaltado.classList.remove('visible'); return; }

  var badgeW    = dimBadge.w * punto.scale;
  var badgeH    = dimBadge.h * punto.scale;
  var escenaRect = escena.getBoundingClientRect();
  var bgRect     = document.getElementById('bg-escena').getBoundingClientRect();
  var diffY      = bgRect.top - escenaRect.top;

  elResaltado.style.left   = (punto.x - badgeW / 2) + 'px';
  elResaltado.style.top    = (punto.y - badgeH / 2 + diffY) + 'px';
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
}

var idiomaEspActivo     = true;
var idiomaGujActivo     = true;
var burbujasTextoActivo = true;

function toggleIdioma(cual){
  if(cual === 'esp') idiomaEspActivo = !idiomaEspActivo;
  if(cual === 'guj') idiomaGujActivo = !idiomaGujActivo;
  if(document.getElementById('lang-esp')) document.getElementById('lang-esp').classList.toggle('active', idiomaEspActivo);
  if(document.getElementById('lang-guj')) document.getElementById('lang-guj').classList.toggle('active', idiomaGujActivo);
  aplicarModoIdiomaSubtitulos();
  aplicarModoBurbujas();
}

function toggleBurbujasTexto(){
  burbujasTextoActivo = !burbujasTextoActivo;
  document.getElementById('toggle-burbujas').classList.toggle('active', burbujasTextoActivo);
  aplicarModoBurbujas();
}

function aplicarModoBurbujas(){
  if(!burbujasTextoActivo){
    escena.classList.add('burbujas-ocultas');
  } else {
    escena.classList.remove('burbujas-ocultas');
  }
  if(!idiomaGujActivo){
    escena.classList.add('gujarati-oculto');
  } else {
    escena.classList.remove('gujarati-oculto');
  }
  escena.classList.toggle('espanol-activo', idiomaEspActivo);
}

function aplicarModoIdiomaSubtitulos(){
  var textos  = document.getElementById('sub-textos');
  var avatar  = document.getElementById('sub-avatar');
  var mensaje = document.getElementById('sub-mensaje-escucha');

  var modoEscucha      = !idiomaEspActivo;
  textos.style.display  = modoEscucha ? 'none' : '';
  avatar.style.display  = modoEscucha ? 'none' : '';
  mensaje.style.display = modoEscucha ? 'block' : 'none';
}

function reproducir(){
  document.body.classList.add('video-iniciado');
  document.getElementById('btn-empezar').textContent = 'Empezar →';

  if(mostradas.some(function(m){ return m; })){
    fill.style.width = '0%';
    construirEscena();
  }

  audio.src         = DATA.audio;
  audio.currentTime = 0;
  audio.play().catch(function(){ alert('No se pudo reproducir el audio.'); });

  document.getElementById('btn-play').disabled = true;
  var btnP          = document.getElementById('btn-pause');
  btnP.textContent  = '⏸';
  btnP.style.display = 'inline-block';

  seguir();
}

function togglePausa(){
  var btnP = document.getElementById('btn-pause');
  if(audio.paused){
    audio.play();
    btnP.textContent = '⏸';
    seguir();
  } else {
    audio.pause();
    btnP.textContent = '▶';
    cancelAnimationFrame(rafId);
  }
}

function seguir(){
  cancelAnimationFrame(rafId);
  function loop(){
    var t   = audio.currentTime;
    var dur = audio.duration || (DIALOGOS.length ? DIALOGOS[DIALOGOS.length - 1].fin : 20);
    fill.style.width = Math.min(100, (t / dur) * 100) + '%';
    reposicionarSprites();

    DIALOGOS.forEach(function(d, i){
      var bIdx = burbujaDeDialogo[i];

      if(t >= d.ini && !mostradas[i]){
        var sidx = dialogoSecuencia[i];

        if(sidx !== secuenciaActual){
          secuenciaActual = sidx;
          // imagenFondo de secuencias ignorado — solo usamos el fondo inicial
          DIALOGOS.forEach(function(dd, jj){
            if(dialogoSecuencia[jj] !== sidx){
              burbujas[ burbujaDeDialogo[jj] ].classList.add('saliente');
              burbujas[ burbujaDeDialogo[jj] ].classList.remove('visible');
            }
          });
          ajustarAltura(burbujasEnSecuencia(sidx));
        }

        mostradas[i] = true;

        // Colocar sprites de escena si los hay
        if(d.coordenada_escena && d.coordenada_escena.length){
          colocarSprites(d);
        }

        var caja  = burbujas[bIdx];
        caja.classList.add('visible');
        caja.classList.remove('saliente');
        var av    = AVATARES[d.avatar] || {};
        var color = av.color  || '#5F6E4F';
        var img   = av.imagen || '';
        caja.className = 'burbuja ' + (d.lado || 'izq') + ' visible';
        caja.querySelector('.avatar').style.backgroundImage = "url('" + img + "')";
        caja.querySelector('.avatar').style.backgroundColor = color;
        caja.querySelector('.caja').style.background        = color;
        caja.querySelector('.caja').style.setProperty('--color-burbuja', color);
        caja.querySelector('.gu-texto').textContent = d.gujarati || '';
        var esEl = caja.querySelector('.es-texto');
        if(esEl) esEl.textContent = d.espanol || '';

        // imagenFondo individual ignorado — solo usamos el fondo inicial
      }

      var activa = (t >= d.ini && t <= d.fin);
      if(bIdx !== undefined) burbujas[bIdx].classList.toggle('activa', activa);
      if(activa && d.avatarActivo && mostrarMarcadorActivo) posicionarResaltado(d.avatarActivo);
      if(activa && bIdx !== undefined) posicionarBurbuja(burbujas[bIdx], d.Burbuja_Posicion);

      if(d.Burbuja_Posicion && bIdx !== undefined && t > d.fin && mostradas[i]){
        var reasignadaAOtroActivo = DIALOGOS.some(function(otro, otroI){
          return otroI !== i && burbujaDeDialogo[otroI] === bIdx && (t >= otro.ini && t <= otro.fin);
        });
        if(!reasignadaAOtroActivo){
          burbujas[bIdx].classList.remove('visible');
          burbujas[bIdx].classList.add('saliente');
        }
      }

      if(activa){
        var nombreRoman = (d.avatar || '').charAt(0).toUpperCase() + (d.avatar || '').slice(1);
        document.getElementById('sub-avatar').textContent = nombreRoman + ' : ';
        document.getElementById('sub-es').textContent     = d.espanol || '';
      }
    });

    var algunaActiva = DIALOGOS.some(function(d){ return t >= d.ini && t <= d.fin; });
    if(!algunaActiva){
      document.getElementById('sub-avatar').textContent = '';
      document.getElementById('sub-es').textContent     = '';
    }

    if(!audio.paused && !audio.ended){ rafId = requestAnimationFrame(loop); }
  }
  rafId = requestAnimationFrame(loop);
}

audio.addEventListener('ended', function(){
  fill.style.width = '100%';
  burbujas.forEach(function(b){ b.classList.remove('activa'); });
  document.getElementById('btn-pause').style.display = 'none';
  document.getElementById('btn-play').disabled = false;
});

/* Reajustar sprites al rotar o redimensionar, aunque el audio esté
   pausado o terminado (el RAF no está corriendo en esos casos). */
var _resizeTimer = null;
function _onResize(){
  if(_resizeTimer) clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(reposicionarSprites, 80);
}
window.addEventListener('resize', _onResize);
window.addEventListener('orientationchange', _onResize);

function configurarBotonFin(){
  var btn = document.getElementById('btn-empezar');
  function irADestino(destino){
    cancelAnimationFrame(rafId);
    audio.pause(); audio.src = '';
    if(destino) window.location.href = destino;
    else history.back();
  }

  if(_modo === 'intro'){
    var lecParam = _params.get('leccion') || '1.1.1';
    NEXT_PAGE    = 'leccion_intro.html?leccion=' + lecParam;
    btn.textContent = 'Comenzar la lección →';
    btn.href        = 'javascript:void(0)';
    btn.onclick     = function(){ irADestino(NEXT_PAGE); };
    return;
  }

  if(_modo === 'desafio'){
    var lecParam = _params.get('leccion') || '1.1.1';
    NEXT_PAGE    = (_nextParam || 'video_interactivo.html') + '?leccion=' + lecParam;
    btn.textContent = 'Empezar →';
    btn.href        = 'javascript:void(0)';
    btn.onclick     = function(){ irADestino(NEXT_PAGE); };
    return;
  }
  NEXT_PAGE = _nextParam || DATA.next || null;
  if(NEXT_PAGE){
    btn.textContent = 'Empezar →';
    btn.href        = 'javascript:void(0)';
    btn.onclick     = function(){ irADestino(NEXT_PAGE); };
  } else {
    btn.textContent = 'Regresar';
    btn.href        = 'javascript:void(0)';
    btn.onclick     = function(){
      if(DATA.subtitulo_fin) document.getElementById('badge').textContent = DATA.subtitulo_fin;
      if(DATA.intro_fin)     document.getElementById('intro').textContent  = DATA.intro_fin;
      irADestino(null);
    };
  }
}

fetch('data/' + _leccion + '/dialogo_' + _leccion + '.json')
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(json){
    var v            = json.video || {};
    DATA             = json;
    DATA.audio             = v.audio             || null;
    DATA.altoPorDialogo    = v.altoPorDialogo    || null;
    DATA.subtitulo_fin     = v.subtitulo_fin     || null;
    DATA.intro_fin         = v.intro_fin         || null;
    DATA.subtitulo_desafio = v.subtitulo_desafio || null;
    DATA.titulo_desafio    = v.titulo_desafio    || null;
    DATA.intro_desafio     = v.intro_desafio     || null;

    DIALOGOS   = json.dialogos || [];
    SECUENCIAS = (v.secuencias && v.secuencias.length)
      ? v.secuencias
      : DIALOGOS.map(function(d){ return { dialogos: [d.id] }; });
    AVATARES       = json.avatares || {};
    RESALTADOR_URL = json.imagenAvatarActivo || null;

    if(_modo === 'desafio'){
      document.getElementById('badge').textContent  = v.subtitulo_desafio || v.subtitulo || '';
      document.getElementById('titulo').textContent = v.titulo_desafio    || v.titulo    || '';
      document.getElementById('intro').textContent  = v.intro_desafio     || v.intro     || '';
    } else {
      if(v.subtitulo) document.getElementById('badge').textContent  = v.subtitulo;
      if(v.titulo)    document.getElementById('titulo').textContent = v.titulo;
      if(v.intro)     document.getElementById('intro').textContent  = v.intro;
    }

    mapearSecuencias();
    construirEscena();
    aplicarModoBurbujas();
    aplicarModoIdiomaSubtitulos();
    configurarBotonFin();

    var btnPlay          = document.getElementById('btn-play');
    var textoPlayOriginal = btnPlay.textContent;
    btnPlay.disabled     = true;
    btnPlay.textContent  = 'Cargando…';
    precargarImagenes().then(function(){
      btnPlay.disabled    = false;
      btnPlay.textContent = textoPlayOriginal;
    });
  })
  .catch(function(){
    document.querySelector('.wrap').innerHTML =
      '<p style="text-align:center;color:var(--ink-soft);padding:40px 20px;">No se pudo cargar el contenido.</p>';
  });

// ── Botón ← Lección (va al FINAL del archivo, después de declarar audio y rafId) ──
var _btnVolver = document.getElementById('btn-volver');
if(_btnVolver){
  _btnVolver.onclick = function(){
    audio.pause(); audio.src = '';
    cancelAnimationFrame(rafId);
    if(_modo === 'intro'){
      var lec    = _params.get('leccion') || '1.1.1';
      var partes = lec.split('.');
      window.location.href = 'contenido_modulo.html?modulo=' + partes[0] + '.' + partes[1];
    } else {
      history.back();
    }
  };
}
