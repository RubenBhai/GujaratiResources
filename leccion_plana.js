const BASE   = 'https://rubenbhai.github.io/GujaratiResources';
const player = document.getElementById('player');

const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const _item       = parseInt(_params.get('item') || '1', 10);
const JSON_URL    = 'data/' + _leccion + '/leccion_plana_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

function mensajeParaPorcentaje(p){
  if(p === 100) return '¡Magnífico!';
  if(p >= 85)   return '¡Bravo!';
  if(p >= 71)   return '¡Muy bien!';
  if(p >= 61)   return '¡Buen intento';
  return '¡Bien! Sigue practicando';
}

function configurarCanvasPlana(img, segmentosJSON, sonidoVictoria, programaEfectoVictoria, audioLetra){
  var canvas = document.getElementById('canvas-plana');
  var ctx    = canvas.getContext('2d');
  var dibujando   = false;
  var yaEvaluado  = false;
  var ultimoX = 0, ultimoY = 0;
  var trazoActual = [];
  var trazos      = [];

  var colorTrazo  = '#0066FF';
  var GROSOR_TRAZO = 7;

  function ajustarCanvas(){
    var dpr = window.devicePixelRatio || 1;
    var w   = img.clientWidth, h = img.clientHeight;
    if(!w || !h) return;
    canvas.style.left   = img.offsetLeft + 'px';
    canvas.style.top    = img.offsetTop  + 'px';
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth   = GROSOR_TRAZO;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = colorTrazo;
  }

  function posicionDesdeEvento(e){
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: Date.now() };
  }

  canvas.addEventListener('pointerdown', function(e){
    if(yaEvaluado){
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      trazos = [];
      etiquetaResultado.style.display = 'none';
      yaEvaluado = false;
    }
    dibujando = true;
    var p = posicionDesdeEvento(e);
    ultimoX = p.x; ultimoY = p.y;
    trazoActual = [p];
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', function(e){
    if(!dibujando) return;
    var p = posicionDesdeEvento(e);
    ctx.beginPath();
    ctx.moveTo(ultimoX, ultimoY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ultimoX = p.x; ultimoY = p.y;
    trazoActual.push(p);
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(ev){
    canvas.addEventListener(ev, function(){
      if(dibujando && trazoActual.length > 1) trazos.push(trazoActual);
      dibujando   = false;
      trazoActual = [];
    });
  });

  var btnEvaluar        = document.getElementById('btn-evaluar');
  var btnVer            = document.getElementById('btn-ver');
  var etiquetaResultado = document.getElementById('resultado-evaluacion');

  document.getElementById('btn-reintentar').onclick = function(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    trazos     = [];
    yaEvaluado = false;
    etiquetaResultado.style.display = 'none';
  };

  function evaluarSegmentos(){
    var naturalW = img.naturalWidth, naturalH = img.naturalHeight;
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    var scale   = Math.min(cw / naturalW, ch / naturalH);
    var offsetX = (cw - naturalW * scale) / 2;
    var offsetY = (ch - naturalH * scale) / 2;
    function transformar(p){ return { x: offsetX + p.x * scale, y: offsetY + p.y * scale }; }
    var segmentosEscalados = {};
    Object.keys(segmentosJSON).forEach(function(nombre){
      segmentosEscalados[nombre] = segmentosJSON[nombre].map(function(v){
        return { origen: transformar(v.origen), destino: transformar(v.destino) };
      });
    });
    return segmentosEscalados;
  }

  if(segmentosJSON){
    btnEvaluar.style.display = '';
    btnEvaluar.onclick = function(){
      var segmentosEscalados = evaluarSegmentos();
      var resultado          = validarPlanaCompleta(segmentosEscalados, trazos);
      etiquetaResultado.textContent   = mensajeParaPorcentaje(resultado.porcentaje);
      etiquetaResultado.style.display = '';
      yaEvaluado = true;
      document.getElementById('btn-escuchar').click();
      revisarVictoria(resultado.porcentaje, sonidoVictoria, programaEfectoVictoria, _leccion);
    };

    btnVer.style.display = '';
    var tokenAnimacionVer = 0;
    btnVer.onclick = function(){
      document.getElementById('btn-reintentar').click();
      var segmentosEscalados = evaluarSegmentos();
      var miToken            = ++tokenAnimacionVer;

      var nombresOrdenados = Object.keys(segmentosEscalados)
        .sort(function(a, b){ return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]); });
      var subVectores = [];
      nombresOrdenados.forEach(function(nombre){ subVectores = subVectores.concat(segmentosEscalados[nombre]); });

      var acumulado  = 0;
      var acumuladas = subVectores.map(function(v){
        acumulado += Math.hypot(v.destino.x - v.origen.x, v.destino.y - v.origen.y);
        return acumulado;
      });
      var longitudTotal = acumulado;
      var DURACION_MS   = 2000;
      var inicio        = performance.now();

      function dibujarHasta(distanciaObjetivo){
        var colorPrevio  = ctx.strokeStyle, grosorPrevio = ctx.lineWidth;
        ctx.strokeStyle  = '#FF0000';
        ctx.lineWidth    = GROSOR_TRAZO;
        var dibujadoHastaAqui = 0;
        for(var i = 0; i < subVectores.length; i++){
          var finTramo = acumuladas[i];
          if(distanciaObjetivo <= dibujadoHastaAqui) break;
          var v = subVectores[i];
          ctx.beginPath();
          ctx.moveTo(v.origen.x, v.origen.y);
          if(distanciaObjetivo >= finTramo){
            ctx.lineTo(v.destino.x, v.destino.y);
          } else {
            var t = (distanciaObjetivo - dibujadoHastaAqui) / (finTramo - dibujadoHastaAqui);
            ctx.lineTo(v.origen.x + t * (v.destino.x - v.origen.x), v.origen.y + t * (v.destino.y - v.origen.y));
          }
          ctx.stroke();
          dibujadoHastaAqui = finTramo;
        }
        ctx.strokeStyle = colorPrevio;
        ctx.lineWidth   = grosorPrevio;
      }

      function frame(ahora){
        if(miToken !== tokenAnimacionVer) return;
        var proporcion = Math.min(1, (ahora - inicio) / DURACION_MS);
        dibujarHasta(proporcion * longitudTotal);
        if(proporcion < 1){
          requestAnimationFrame(frame);
        } else {
          player.src = audioLetra;
          player.playbackRate = 1.0;
          player.play().catch(function(){});
        }
      }
      requestAnimationFrame(frame);
    };
  } else {
    btnEvaluar.style.display = 'none';
    btnVer.style.display     = 'none';
  }

  if(img.complete && img.naturalWidth) ajustarCanvas();
  else img.addEventListener('load', ajustarCanvas);
}

/* ── Carga del JSON ── */
fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    var planas = data.planas;
    var total  = planas.length;
    var idx    = Math.min(Math.max(_item, 1), total);
    var actual = planas[idx - 1];
    var label  = capitalize(actual.roman);

    document.getElementById('page-title').textContent  = 'Plana ' + label + ' · Piensa en Gujarati';
    document.getElementById('roman-label').textContent = '"' + label + '"';

    var img = document.getElementById('img-plana');
    img.src = actual.imagen;
    img.alt = 'Plana ' + label;

    var trazosUrl = 'data/' + _leccion + '/trazos_' + actual.roman + '.json';
    fetch(trazosUrl + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function(r){ if(!r.ok) throw new Error('sin trazos'); return r.json(); })
      .then(function(segmentos){ configurarCanvasPlana(img, segmentos, data.sonido_victoria, data.programa_efecto_victoria, actual.audio); })
      .catch(function(){ configurarCanvasPlana(img, null, data.sonido_victoria, data.programa_efecto_victoria, actual.audio); });

    document.getElementById('nav-home').href    = data.home;
    document.getElementById('nav-palabras').href = data.ir_a_palabras;
    document.getElementById('nav-anterior').href = 'leccion_letra.html?leccion=' + _leccionRaw + '&item=' + idx;

    var continuarUrl = (idx < total)
      ? ('leccion_letra.html?leccion=' + _leccionRaw + '&item=' + (idx + 1))
      : data.siguiente_palabras;
    document.getElementById('btn-continuar').href = continuarUrl;

    var btnEscuchar = document.getElementById('btn-escuchar');
    btnEscuchar.innerHTML = '🎵 Escucha';
    btnEscuchar.onclick = function(){
      btnEscuchar.classList.add('playing');
      btnEscuchar.textContent = '▶ Reproduciendo...';
      player.src = actual.audio; player.playbackRate = 1.0; player.play();
      player.onended = function(){
        btnEscuchar.classList.remove('playing');
        btnEscuchar.innerHTML = '🎵 Escucha';
      };
    };
  })
  .catch(function(){
    document.body.innerHTML =
      '<p class="error-carga">No se pudo cargar el contenido. Revisa tu conexión.</p>';
  });

/* ── Verificador de versión ── */
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
