/* ============================================================
   GENERADOR DE LENGUAJE UNIVERSAL — motor contenedor
   Renderiza cualquier generador definido en su JSON: columnas con
   pregunta + opciones (gu/rom/es/audio). El estudiante elige una opción
   por columna y arma su propia oración; el audio se encadena en el orden
   de las columnas. Exploración libre, sin puntaje.
   Datos: data/{leccion}/generador_clase_{leccion}.json
============================================================ */

const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/generador_clase_' + _leccion + '.json';

var _navMapa = document.getElementById('nav-mapa');
if (_navMapa) _navMapa.href = 'guia_navegacion.html?leccion=' + _leccionRaw;

const player = document.getElementById('player');

/* Estado */
let DATA        = null;
let GENERADORES = [];
let genActivo   = 0;
let COLUMNAS    = [];
let seleccion   = {};   /* colIdx → optIdx (o undefined) */

function esObligatoria(col){ return String(col.obligatorio || '').toUpperCase() === 'SI'; }

/* ── Selector de generador (solo si hay más de uno) ── */
function renderSelector(){
  var cont = document.getElementById('selector');
  cont.innerHTML = '';
  if (GENERADORES.length <= 1) return;
  GENERADORES.forEach(function(g, i){
    var btn = document.createElement('button');
    btn.className = 'selector-btn' + (i === genActivo ? ' activo' : '');
    btn.textContent = g.nombre || ('Generador ' + (i + 1));
    btn.onclick = function(){ activarGenerador(i); };
    cont.appendChild(btn);
  });
}

/* ── Activar un generador ── */
function activarGenerador(idx){
  genActivo = idx;
  COLUMNAS  = (GENERADORES[idx] && GENERADORES[idx].columnas) || [];
  seleccion = {};
  var g = GENERADORES[idx] || {};
  
  /* Mostrar el tema (nombre del generador) en el badge */
  var badge = document.getElementById('badge-tema') || document.querySelector('.badge');
  if (badge && g.nombre) badge.textContent = g.nombre;

  if (g.instruccion) document.getElementById('subtitulo').textContent = g.instruccion;
  renderSelector();
  renderColumnas();
  actualizarOracion();
}

/* ── Pintar las columnas ── */
function renderColumnas(){
  var cont = document.getElementById('columnas');
  cont.innerHTML = '';
  COLUMNAS.forEach(function(col, ci){
    var bloque = document.createElement('div');
    bloque.className = 'col-bloque' + (esObligatoria(col) ? ' obligatoria' : '');
    bloque.id = 'col-' + ci;

    var preg = '<div class="col-preg">' +
      '<span class="col-preg-es">' + (col.pregunta || '') + '</span>' +
      (col.pregunta_gu ? '<span class="col-preg-gu gu">' + col.pregunta_gu + '</span>' : '') +
      (esObligatoria(col) ? '<span class="col-oblig">obligatorio</span>'
                          : '<span class="col-opcional">opcional</span>') +
      '</div>';

    var celdas = '<div class="celdas">';
    (col.opciones || []).forEach(function(op, oi){
      celdas += '<button class="celda" data-col="' + ci + '" data-opt="' + oi + '" onclick="toggleCelda(' + ci + ',' + oi + ')">' +
                  '<span class="celda-gu gu">' + (op.gu || '') + '</span>' +
                  (op.es ? '<span class="celda-es">' + op.es + '</span>' : '') +
                '</button>';
    });
    celdas += '</div>';

    bloque.innerHTML = preg + celdas;
    cont.appendChild(bloque);
  });
}

/* ── Elegir / des-elegir una celda ── */
function toggleCelda(ci, oi){
  var deseleccionar = (seleccion[ci] === oi);
  seleccion[ci] = deseleccionar ? undefined : oi;

  /* actualizar solo esa columna */
  var bloque = document.getElementById('col-' + ci);
  bloque.querySelectorAll('.celda').forEach(function(c){ c.classList.remove('sel'); });
  if (!deseleccionar){
    var sel = bloque.querySelector('.celda[data-opt="' + oi + '"]');
    if (sel) sel.classList.add('sel');
  }
  bloque.classList.toggle('completa', seleccion[ci] !== undefined);

  /* reproducir el audio de la celda al elegirla */
  if (!deseleccionar){
    var op = COLUMNAS[ci].opciones[oi];
    if (op && op.audio){ player.src = op.audio; player.play().catch(function(){}); }
  }

  actualizarOracion();
}

/* ── Armar la oración a partir de lo elegido (en orden de columnas) ── */
function celdasElegidas(){
  var out = [];
  COLUMNAS.forEach(function(col, ci){
    var oi = seleccion[ci];
    if (oi !== undefined && col.opciones && col.opciones[oi]) {
      var op = Object.assign({}, col.opciones[oi]);
      op._colIdx = ci;
      op._ordenEs = (col.orden !== undefined) ? Number(col.orden) : ci;
      out.push(op);
    }
  });
  return out;
}

function puedeArmar(){
  /* todas las columnas obligatorias deben tener selección */
  return COLUMNAS.every(function(col, ci){
    return !esObligatoria(col) || seleccion[ci] !== undefined;
  });
}

function actualizarOracion(){
  var elegidas = celdasElegidas();

  /* Gujarati respeta el orden natural de las columnas */
  var elegidasGu = elegidas.slice().sort(function(a, b){ return a._colIdx - b._colIdx; });
  document.getElementById('oracion-gu').textContent = elegidasGu.map(function(o){ return o.gu || ''; }).join(' ');

  /* Español respeta el parámetro "orden" */
  var elegidasEs = elegidas.slice().sort(function(a, b){ return a._ordenEs - b._ordenEs; });
  document.getElementById('oracion-es').textContent = elegidasEs.map(function(o){ return o.es || ''; }).join(' ');

  var listo = puedeArmar() && elegidas.length > 0;
  var btn = document.getElementById('btn-oir');
  btn.disabled = !listo;

  var aviso = document.getElementById('barra-aviso');
  if (listo){
    aviso.textContent = ''; aviso.className = 'barra-aviso listo';
  } else {
    var faltan = [];
    COLUMNAS.forEach(function(col, ci){
      if (esObligatoria(col) && seleccion[ci] === undefined) faltan.push(col.pregunta || '');
    });
    aviso.className = 'barra-aviso';
    aviso.textContent = faltan.length ? 'Elige: ' + faltan.join(', ') : '';
  }
}

/* ── Reproducir la oración: audios de las celdas elegidas, en secuencia ── */
function reproducirOracion(){
  var elegidasGu = celdasElegidas().sort(function(a, b){ return a._colIdx - b._colIdx; });
  var audios = elegidasGu.map(function(o){ return o.audio; }).filter(Boolean);
  if (audios.length === 0) return;
  var btn = document.getElementById('btn-oir');
  btn.classList.add('sonando');
  var i = 0;
  function siguiente(){
    if (i >= audios.length){ btn.classList.remove('sonando'); player.onended = null; return; }
    player.src = audios[i]; i++;
    player.onended = function(){ setTimeout(siguiente, 150); };
    player.play().catch(function(){ siguiente(); });
  }
  siguiente();
}

/* ── Limpiar la selección ── */
function limpiar(){
  seleccion = {};
  document.querySelectorAll('.celda').forEach(function(c){ c.classList.remove('sel'); });
  document.querySelectorAll('.col-bloque').forEach(function(b){ b.classList.remove('completa'); });
  actualizarOracion();
}

/* ── Init ── */
fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    DATA = data;
    if (data.titulo) document.getElementById('titulo').textContent = data.titulo;
    if (data.subtitulo) document.getElementById('subtitulo').textContent = data.subtitulo;
    GENERADORES = data.generadores || [];
    if (GENERADORES.length === 0){
      document.getElementById('columnas').innerHTML =
        '<p class="error-carga">Esta lección todavía no tiene generadores.</p>';
      document.getElementById('barra').style.display = 'none';
      return;
    }
    activarGenerador(0);
  })
  .catch(function(){
    document.querySelector('.wrap').innerHTML =
      '<p class="error-carga">No se pudo cargar el contenido. Revisa tu conexión.</p>';
    document.getElementById('barra').style.display = 'none';
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
