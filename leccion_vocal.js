const BASE   = 'https://rubenbhai.github.io/GujaratiResources';
const player = document.getElementById('player');

const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const _item       = parseInt(_params.get('item') || '1', 10);
const JSON_URL    = 'data/' + _leccion + '/leccion_vocal_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

function playSimple(url, btn, labelHtml){
  btn.classList.add('playing');
  btn.textContent = '▶ Reproduciendo...';
  player.src = url; player.playbackRate = 1.0; player.play();
  player.onended = function(){ btn.classList.remove('playing'); btn.innerHTML = labelHtml; };
}

function mensajeParaPorcentaje(p){
  if(p === 100) return '¡Magnífico!';
  if(p >= 85)   return '¡Bravo!';
  if(p >= 71)   return '¡Excelente!';
  if(p >= 61)   return 'Buen intento';
  return '¡Bien! Sigue practicando';
}

/* ── Canvas de práctica ── */
function configurarCanvasPlana(img, segmentosJSON, sonidoVictoria, programaEfectoVictoria){
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
    ctx.lineWidth = GROSOR_TRAZO; ctx.lineCap = 'round';
    ctx.lineJoin  = 'round';     ctx.strokeStyle = colorTrazo;
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
    ctx.beginPath(); ctx.moveTo(ultimoX, ultimoY); ctx.lineTo(p.x, p.y); ctx.stroke();
    ultimoX = p.x; ultimoY = p.y;
    trazoActual.push(p);
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(ev){
    canvas.addEventListener(ev, function(){
      if(dibujando && trazoActual.length > 1) trazos.push(trazoActual);
      dibujando = false; trazoActual = [];
    });
  });

  var btnEvaluar        = document.getElementById('btn-evaluar');
  var btnVer            = document.getElementById('btn-ver');
  var etiquetaResultado = document.getElementById('resultado-evaluacion');

  document.getElementById('btn-reintentar').onclick = function(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    trazos = []; yaEvaluado = false;
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
      var seg  = evaluarSegmentos();
      var res  = validarPlanaCompleta(seg, trazos);
      etiquetaResultado.textContent   = mensajeParaPorcentaje(res.porcentaje);
      etiquetaResultado.style.display = '';
      yaEvaluado = true;
      document.getElementById('btn-escuchar-plana').click();
      revisarVictoria(res.porcentaje, sonidoVictoria, programaEfectoVictoria, _leccion);
    };

    btnVer.style.display = '';
    var tokenAnimacionVer = 0;
    btnVer.onclick = function(){
      document.getElementById('btn-reintentar').click();
      var seg     = evaluarSegmentos();
      var miToken = ++tokenAnimacionVer;

      var nombresOrdenados = Object.keys(seg)
        .sort(function(a, b){ return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]); });
      var subVectores = [];
      nombresOrdenados.forEach(function(nombre){ subVectores = subVectores.concat(seg[nombre]); });

      var acumulado  = 0;
      var acumuladas = subVectores.map(function(v){
        acumulado += Math.hypot(v.destino.x - v.origen.x, v.destino.y - v.origen.y);
        return acumulado;
      });
      var longitudTotal = acumulado;
      var DURACION_MS   = 2000;
      var inicio        = performance.now();

      function dibujarHasta(dist){
        var cp = ctx.strokeStyle, gp = ctx.lineWidth;
        ctx.strokeStyle = '#FF0000'; ctx.lineWidth = GROSOR_TRAZO;
        var dh = 0;
        for(var i = 0; i < subVectores.length; i++){
          var ft = acumuladas[i];
          if(dist <= dh) break;
          var v = subVectores[i];
          ctx.beginPath(); ctx.moveTo(v.origen.x, v.origen.y);
          if(dist >= ft){
            ctx.lineTo(v.destino.x, v.destino.y);
          } else {
            var t = (dist - dh) / (ft - dh);
            ctx.lineTo(v.origen.x + t * (v.destino.x - v.origen.x),
                       v.origen.y + t * (v.destino.y - v.origen.y));
          }
          ctx.stroke(); dh = ft;
        }
        ctx.strokeStyle = cp; ctx.lineWidth = gp;
      }

      function frame(ahora){
        if(miToken !== tokenAnimacionVer) return;
        var p = Math.min(1, (ahora - inicio) / DURACION_MS);
        dibujarHasta(p * longitudTotal);
        if(p < 1) requestAnimationFrame(frame);
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
    var pasos  = data.pasos;
    var total  = pasos.length;
    var idx    = Math.min(Math.max(_item, 1), total);
    var actual = pasos[idx - 1];

    document.getElementById('nav-home').href    = data.home;
    document.getElementById('nav-palabras').href = data.ir_a_palabras;
    document.getElementById('nav-anterior').href = (idx > 1)
      ? ('leccion_vocal.html?leccion=' + _leccionRaw + '&item=' + (idx - 1))
      : data.anterior_primera;

    var siguienteUrl = (idx < total)
      ? ('leccion_vocal.html?leccion=' + _leccionRaw + '&item=' + (idx + 1))
      : (data.repaso_final
          ? ('reto_flash.html?repaso=' + _leccionRaw + '&next=' + encodeURIComponent(data.siguiente_final))
          : data.siguiente_final);

    /* ── vocal ── */
    if(actual.tipo === 'vocal'){
      document.getElementById('page-title').textContent = 'Vocal ' + actual.gujarati + ' · Piensa en Gujarati';
      document.getElementById('badge').textContent = actual.badge;

      document.getElementById('q1-vocal').textContent       = actual.gujarati;
      document.getElementById('q2-vocal').innerHTML = '<p>' + (actual.detalle || '') + '</p>';
      document.getElementById('frame-vocal').style.display  = '';
      document.getElementById('frame-vocal').onclick = function(){ window.location.href = siguienteUrl; };

      var btnEsc = document.getElementById('btn-escuchar-vocal');
      btnEsc.onclick = function(){ playSimple(actual.audio, btnEsc, '&#128266; Escuchar'); };
      document.getElementById('btn-siguiente-vocal').href  = siguienteUrl;
      document.getElementById('btn-sigleccion-vocal').href = data.siguiente_leccion;
      document.getElementById('bottom-vocal').style.display = '';

      setTimeout(function(){ player.src = actual.audio; player.play().catch(function(){}); }, 400);

    /* ── matra ── */
    } else if(actual.tipo === 'matra'){
      document.getElementById('page-title').textContent = 'Matra ' + actual.matra + ' · Piensa en Gujarati';
      document.getElementById('badge').textContent = actual.badge;

      var img = document.getElementById('img-380');
      img.src = actual.imagen; img.alt = 'Matra ' + actual.matra;
      img.onerror = function(){ img.style.opacity = '0.3'; img.title = 'Imagen no encontrada'; };
      img.onclick = function(){ window.location.href = siguienteUrl; };
      document.getElementById('frame-380').style.display = '';

      document.getElementById('btn-siguiente-matra').href  = siguienteUrl;
      document.getElementById('btn-sigleccion-matra').href = data.siguiente_leccion;

      var btnNota = document.getElementById('btn-nota-especial');
      if(actual.nota_especial){
        btnNota.href = actual.nota_especial;
        btnNota.style.display = '';
      } else {
        btnNota.style.display = 'none';
      }
      document.getElementById('bottom-matra').style.display = '';

    /* ── con_matra ── */
    } else if(actual.tipo === 'con_matra'){
      document.getElementById('page-title').textContent = 'Consonantes con matra ' + actual.matra + ' · Piensa en Gujarati';
      document.getElementById('badge').textContent = 'Las 3 consonantes con esta matra';

      var eqs = actual.ecuaciones || [];
      eqs.forEach(function(eq, i){
        var cel = document.getElementById('eq-' + i);
        if(!cel) return;
        cel.innerHTML =
          '<div class="eq-partes gu">' + eq.partes + '</div>' +
          '<div class="eq-resultado gu">' + eq.resultado + '</div>';
      });
      document.getElementById('frame-conmatra').style.display = '';
      document.getElementById('frame-conmatra').onclick = function(){ window.location.href = siguienteUrl; };


      var textoBase = '&#128266; ' + actual.texto_boton;
      var btnSec    = document.getElementById('btn-secuencia');
      btnSec.innerHTML = textoBase;
      var seqIdx = 0;
      function reproducirSiguiente(){
        if(seqIdx >= actual.audios_secuencia.length){
          btnSec.classList.remove('playing');
          btnSec.innerHTML = textoBase;
          return;
        }
        player.src = actual.audios_secuencia[seqIdx];
        player.playbackRate = 1.0; player.play();
        player.onended = function(){ seqIdx++; setTimeout(reproducirSiguiente, 350); };
      }
      btnSec.onclick = function(){
        btnSec.classList.add('playing');
        btnSec.textContent = '▶ Reproduciendo...';
        seqIdx = 0; reproducirSiguiente();
      };

      document.getElementById('btn-practicar-cm').href   = 'reto_flash.html?json=' + actual.reto_flash_json;
      document.getElementById('btn-siguiente-cm').href   = siguienteUrl;
      document.getElementById('btn-sigleccion-cm').href  = data.siguiente_leccion;
      document.getElementById('bottom-conmatra').style.display = '';

    /* ── plana ── */
    } else if(actual.tipo === 'plana'){
      document.getElementById('page-title').textContent = 'Plana ' + actual.roman + ' · Piensa en Gujarati';
      document.getElementById('badge').style.display    = 'none';
      document.getElementById('roman-label').textContent = '"' + actual.roman + '"';

      var img = document.getElementById('img-plana');
      img.src = actual.imagen; img.alt = 'Plana ' + actual.roman;
      img.onerror = function(){ img.style.opacity = '0.3'; };

      var trazosUrl = 'data/' + _leccion + '/trazos_' + actual.roman + '.json';
      fetch(trazosUrl + '?t=' + Date.now(), { cache: 'no-store' })
        .then(function(r){ if(!r.ok) throw new Error('sin trazos'); return r.json(); })
        .then(function(seg){ configurarCanvasPlana(img, seg, data.sonido_victoria, data.programa_efecto_victoria); })
        .catch(function(){   configurarCanvasPlana(img, null, data.sonido_victoria, data.programa_efecto_victoria); });

      document.getElementById('bloque-plana').style.display = '';

      var btnEsc     = document.getElementById('btn-escuchar-plana');
      var labelHtml  = '🎵 Escucha';
      btnEsc.innerHTML = labelHtml;
      btnEsc.onclick = function(){ playSimple(actual.audio, btnEsc, labelHtml); };

      document.getElementById('btn-continuar-plana').href = siguienteUrl;
      document.getElementById('bottom-plana').style.display = '';
    }
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
