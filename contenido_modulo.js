const _params    = new URLSearchParams(location.search);
const _moduloRaw = _params.get('modulo') || '1.1';
const _modulo    = _moduloRaw.replace(/\./g, '_');
const JSON_URL   = 'data/contenido_modulo_' + _modulo + '.json';

/* ==========================================================================
   Registro de renderizadores.  Cada tipo de sección declarado en el JSON
   se despacha aquí.  Para soportar un tipo nuevo: escribe su función y
   agrégala a este objeto.  El JS no sabe nada de "consonantes" ni "vocales":
   solo sabe renderizar TIPOS (grid, info_box, lista_lecciones).
   ========================================================================= */
const RENDERERS = {
  grid:            renderGrid,
  info_box:        renderInfoBox,
  lista_lecciones: renderListaLecciones
};

fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(construir)
  .catch(function(){
    document.body.innerHTML =
      '<p class="error-carga">No se pudo cargar el contenido. Revisa tu conexión.</p>';
  });

function construir(data){
  /* ── Cabecera fija ── */
  document.getElementById('page-title').textContent = (data.badge || '') + ' · Piensa en Gujarati';
  document.getElementById('nav-atras').href = data.atras || 'contenido.html';
  document.getElementById('nav-home').href  = data.home  || 'contenido.html';
  document.getElementById('badge').textContent   = data.badge || '';
  document.getElementById('titulo').textContent  = data.titulo || '';
  document.getElementById('subtitulo').innerHTML = data.subtitulo_html || '';

  var colIzq = document.getElementById('col-izq');
  var colDer = document.getElementById('col-der');
  var secciones = data.secciones || [];
  var leccionActiva = null;

  /* ── Render por secciones ── */
  secciones.forEach(function(sec, i){
    var render = RENDERERS[sec.tipo];
    if(!render){ console.warn('Tipo de sección desconocido:', sec.tipo); return; }

    var el = render(sec);
    if(!el) return;

    // Layout: columna (izq | der, por defecto der) y orden global de flujo
    el.classList.add(sec.columna === 'izq' ? 'sec-izq' : 'sec-der');
    el.classList.add('ord-' + (i + 1));
    (sec.columna === 'izq' ? colIzq : colDer).appendChild(el);

    // La lección activa (si existe) alimenta el botón principal
    if(sec.tipo === 'lista_lecciones'){
      (sec.items || []).forEach(function(l){ if(l.estado === 'activa') leccionActiva = l; });
    }
  });

  /* ── Botón principal + enlace al mapa ── */
  var navMapa = document.getElementById('nav-mapa');
  if(leccionActiva){
    var btn = document.createElement('a');
    btn.className   = 'btn-empezar sec-izq ord-final';
    btn.id          = 'btn-empezar';
    btn.href        = 'leccion_loader.html?leccion=' + leccionActiva.codigo_leccion;
    btn.textContent = 'Empezar con la Lección ' + leccionActiva.numero + ' →';
    colIzq.appendChild(btn);
    if(navMapa) navMapa.href = 'guia_navegacion.html?leccion=' + leccionActiva.codigo_leccion;
  } else {
    if(navMapa) navMapa.classList.add('nav-oculto');
  }
}

/* ==========================================================================
   RENDERIZADORES
   ========================================================================= */

/* grid genérico: sirve para letras, vocales, palabras, frases... lo que sea.
   La FORMA de cada tarjeta la dicta `campos`; el estilo, `item_clase`.       */
function renderGrid(sec){
  var section = document.createElement('section');
  section.className = 'seccion cols-' + (sec.columnas || 5);

  if(sec.label){
    var label = document.createElement('div');
    label.className   = 'seccion-label';
    label.textContent = etiqueta(sec.label, (sec.items || []).length);
    section.appendChild(label);
  }

  var grid = document.createElement('div');
  grid.className = 'grid-seccion';

  var campos = sec.campos || [];
  (sec.items || []).forEach(function(item){
    var card = document.createElement('div');
    card.className = 'grid-card' + (sec.item_clase ? ' ' + sec.item_clase : '');
    var html = '';
    campos.forEach(function(campo){
      var val = item[campo];
      if(val === undefined || val === null || val === '') return; // campo ausente → se omite
      html += '<span class="' + campo + '">' + val + '</span>';
    });
    card.innerHTML = html;
    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

/* info_box: bloque de HTML libre. */
function renderInfoBox(sec){
  var box = document.createElement('div');
  box.className = 'seccion info-box';
  box.innerHTML = sec.html || '';
  return box;
}

/* lista_lecciones: conserva la lógica de estado (activa/proxima),
   el enlace al loader y el marcador ▶ / "Muy pronto".                        */
function renderListaLecciones(sec){
  var section = document.createElement('section');
  section.className = 'seccion';

  if(sec.label){
    var label = document.createElement('div');
    label.className   = 'seccion-label';
    label.textContent = etiqueta(sec.label, (sec.items || []).length);
    section.appendChild(label);
  }

  var lista = document.createElement('div');
  lista.className = 'lecciones-lista';

  (sec.items || []).forEach(function(l){
    var esActiva = (l.estado === 'activa');
    var el = document.createElement(esActiva ? 'a' : 'div');
    el.className = 'leccion ' + (l.estado || 'proxima');
    if(esActiva) el.href = 'leccion_loader.html?leccion=' + l.codigo_leccion;
    el.innerHTML =
      '<span class="lec-num">' + (l.numero != null ? l.numero : '') + '</span>' +
      '<div class="lec-info">' +
        '<div class="lec-title">' + (l.titulo   || '') + '</div>' +
        '<div class="lec-sub">'   + (l.sub_html || '') + '</div>' +
      '</div>' +
      (esActiva
        ? '<span class="lec-status">▶</span>'
        : '<span class="lec-soon">Muy pronto</span>');
    lista.appendChild(el);
  });

  section.appendChild(lista);
  return section;
}

/* ==========================================================================
   UTILIDADES
   ========================================================================= */

/* Reemplaza {n} en las etiquetas por la cantidad de items (auto-conteo).
   Si la etiqueta no trae {n}, se usa literal.                                 */
function etiqueta(txt, n){
  return String(txt).replace('{n}', n);
}

/* Verificador de versión (sin cambios). */
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
