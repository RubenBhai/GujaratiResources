/* Tarjetas rápidas · Piensa en Gujarati (Claude, 16-nov-2026)
   Datos: data/tarjetas/tarjetas_rapidas.json · Audio: audios/tarjetas/<audio>_<m|h>.mp3 */
(function () {
  var PDF = 'data/tarjetas/Tarjetas_Rapidas_Piensa_en_Gujarati.pdf';
  var DATOS = null, actual = 0, cara = 'digo', voz = 'm', sinEs = false, cat = 'todas';
  // Categorías y marca de lectura (Claude, 20-nov-2026): cada frase trae «lee» = la lección desde la que se puede leer
  function completada(cod) { return leer('leccion_' + String(cod).replace(/\./g, '_'), '') === 'completada'; }
  function visibles() { return DATOS.momentos.map(function (m, i) { return i; }).filter(function (i) { return cat === 'todas' || DATOS.momentos[i].cat === cat; }); }
  function maxLee(m) { var ORD = ['1.1.1','1.1.2','1.1.3','1.2.1','1.2.2','1.2.3','1.3.1','1.3.2','1.3.3','1.4.1','1.4.2'];
    return m.digo.concat(m.dicen).reduce(function (a, f) { return ORD.indexOf(f.lee) > ORD.indexOf(a) ? f.lee : a; }, '1.1.1'); }
  var audio = new Audio(), cola = [], filaSonando = null;
  var $ = function (id) { return document.getElementById(id); };

  function leer(k, def) { try { var v = localStorage.getItem(k); return v === null ? def : v; } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function textoDe(f) { return voz === 'h' && f.gu_h ? f.gu_h : f.gu; }
  function espDe(f) { return voz === 'h' && f.es_h ? f.es_h : f.es; }
  function urlDe(f) { return 'audios/tarjetas/' + f.audio + '_' + voz + '.mp3'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ── audio ── */
  function parar() {
    cola = []; audio.pause();
    if (filaSonando) filaSonando.classList.remove('sonando');
    filaSonando = null;
  }
  function tocar(f, fila, alTerminar) {
    if (filaSonando) filaSonando.classList.remove('sonando');
    filaSonando = fila; if (fila) fila.classList.add('sonando');
    audio.onended = function () { if (fila) fila.classList.remove('sonando'); filaSonando = null; if (alTerminar) setTimeout(alTerminar, 450); };
    audio.onerror = function () { if (fila) fila.classList.remove('sonando'); filaSonando = null; avisoAudio(); if (alTerminar) alTerminar(); };
    audio.src = urlDe(f);
    var p = audio.play(); if (p && p.catch) p.catch(function () {});
  }
  function avisoAudio() {
    if ($('aviso-audio')) return;
    var a = document.createElement('p'); a.className = 'aviso'; a.id = 'aviso-audio';
    a.textContent = 'Este audio todavía no está disponible (o no hay conexión).';
    $('frases').after(a);
  }
  function tocarTodas() {
    parar();
    var lista = DATOS.momentos[actual][cara], filas = $('frases').querySelectorAll('.frase');
    cola = lista.map(function (f, i) { return [f, filas[i]]; });
    (function sig() { var x = cola.shift(); if (x) tocar(x[0], x[1], sig); })();
  }

  /* ── vistas ── */
  function pintarLista() {
    var cats = (DATOS.categorias || []).filter(function (c) { return DATOS.momentos.some(function (m) { return m.cat === c.id; }); }), fila = $('cats');
    if (!fila && cats.length) { fila = document.createElement('div'); fila.id = 'cats'; fila.className = 'cats'; $('momentos').before(fila); }
    if (fila) {
      fila.innerHTML = [{ id: 'todas', titulo: 'Todas' }].concat(cats).map(function (c) {
        return '<button class="cat' + (c.id === cat ? ' on' : '') + '" data-c="' + c.id + '">' + esc(c.titulo) + '</button>'; }).join('');
      [].forEach.call(fila.querySelectorAll('.cat'), function (b) { b.onclick = function () { cat = b.dataset.c; guardar('tarjetas_cat', cat); pintarLista(); }; });
    }
    $('momentos').innerHTML = visibles().map(function (i) {
      var m = DATOS.momentos[i], todas = m.digo.concat(m.dicen), ya = todas.filter(function (f) { return f.lee && completada(f.lee); }).length;
      var lect = !todas[0].lee ? '' : (ya === todas.length ? '📖 ya la puedes leer toda' : (ya ? '📖 ya lees ' + ya + ' de ' + todas.length + ' · ' : '📖 ') + 'toda desde la ' + maxLee(m));
      return '<button class="momento" data-i="' + i + '"><span class="momento-num">' + (i + 1) + '</span>' +
        '<span><span class="momento-tit">' + esc(m.titulo) + '</span>' +
        '<span class="momento-sub">' + m.digo.length + ' para decir · ' + m.dicen.length + ' para entender</span>' +
        (lect ? '<span class="momento-lee' + (ya === todas.length ? ' toda' : '') + '">' + lect + '</span>' : '') + '</span></button>';
    }).join('');
    [].forEach.call($('momentos').querySelectorAll('.momento'), function (b) {
      b.onclick = function () { abrir(+b.dataset.i); };
    });
  }
  function pintarTarjeta() {
    var m = DATOS.momentos[actual];
    var vis = visibles(), pos = vis.indexOf(actual);
    if (pos < 0) { vis = DATOS.momentos.map(function (x, i) { return i; }); pos = actual; }
    $('t-num').textContent = 'MOMENTO ' + (pos + 1) + ' DE ' + vis.length;
    $('t-titulo').textContent = m.titulo;
    $('btn-ant').disabled = pos === 0;
    $('btn-sig').disabled = pos === vis.length - 1;
    [].forEach.call(document.querySelectorAll('.cara-btn'), function (b) {
      var on = b.dataset.cara === cara; b.classList.toggle('activa', on); b.setAttribute('aria-selected', on);
    });
    var ul = $('frases'); ul.className = 'frases ' + cara + (sinEs ? ' sin-es' : '');
    var av = $('aviso-audio'); if (av) av.remove();
    ul.innerHTML = m[cara].map(function (f, i) {
      return '<li><button class="frase" data-i="' + i + '"><span class="frase-play">▶</span><span>' +
        '<span class="frase-gu">' + esc(textoDe(f)) + (f.lee && completada(f.lee) ? ' <span class="lee" title="Ya la puedes leer">📖</span>' : '') + '</span><span class="frase-es">' + esc(espDe(f)) + '</span></span></button></li>';
    }).join('');
    [].forEach.call(ul.querySelectorAll('.frase'), function (b) {
      b.onclick = function () { parar(); tocar(m[cara][+b.dataset.i], b); };
    });
  }
  function abrir(i) {
    parar(); actual = i; cara = 'digo';
    $('vista-lista').hidden = true; $('vista-tarjeta').hidden = false; document.body.classList.add('en-tarjeta');
    pintarTarjeta(); window.scrollTo(0, 0);
    try { history.replaceState(null, '', '#' + DATOS.momentos[i].id); } catch (e) {}
  }
  function volver() {
    parar(); $('vista-tarjeta').hidden = true; $('vista-lista').hidden = false; document.body.classList.remove('en-tarjeta');
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }
  function pintarImpresion() {
    var catPrev = null, catTit = {}; (DATOS.categorias || []).forEach(function (c) { catTit[c.id] = c.titulo; });
    $('vista-impresion').innerHTML = DATOS.momentos.map(function (m, i) { return i; }).sort(function (a, b) {
      var ca = (DATOS.categorias || []).findIndex(function (c) { return c.id === DATOS.momentos[a].cat; }), cb = (DATOS.categorias || []).findIndex(function (c) { return c.id === DATOS.momentos[b].cat; });
      return ca - cb || a - b; }).map(function (i) { var m = DATOS.momentos[i];
      var cara_ = function (lista, clase, tit) {
        return '<div class="imp-cara ' + clase + '"><h4>' + tit + '</h4><ul>' + lista.map(function (f) {
          return '<li><span class="gu">' + esc(f.gu) + '</span><span class="es">' + esc(f.es) + '</span></li>';
        }).join('') + '</ul></div>';
      };
      var h2 = (m.cat && m.cat !== catPrev) ? '<h2 class="imp-cat">' + esc(catTit[m.cat] || '') + '</h2>' : ''; catPrev = m.cat;
      return h2 + '<div class="imp-tarjeta"><h3><span>' + (i + 1) + '</span>' + esc(m.titulo) + '</h3><div class="imp-caras">' +
        cara_(m.digo, 'digo', 'Lo que digo') + cara_(m.dicen, 'dicen', 'Lo que me pueden decir') + '</div></div>';
    }).join('');
  }
  function ponerVoz(v) {
    voz = v; guardar('tarjetas_voz', v); parar();
    [].forEach.call(document.querySelectorAll('.seg-btn'), function (b) { b.classList.toggle('activo', b.dataset.voz === v); });
    if (!$('vista-tarjeta').hidden) pintarTarjeta();
  }


  /* ── usar sin internet: igual que el cargador de lecciones (misma caché y misma clave) ── */
  var CACHE_MEDIOS = 'gujarati-media', CLAVE_MANIF = 'manifest_tarjetas', MANIF = 'data/tarjetas/assets_tarjetas_versionado.json';
  function manifLocal() { try { return JSON.parse(localStorage.getItem(CLAVE_MANIF) || 'null'); } catch (e) { return null; } }
  function pintarDescarga(txt, listo) {
    var b = $('btn-descargar'); if (!b) return;
    b.textContent = txt; b.classList.toggle('listo', !!listo);
  }
  async function revisarDescarga() {
    if (!('caches' in window)) { $('btn-descargar').hidden = true; return; }
    if (manifLocal()) pintarDescarga('✓ Guardadas para usar sin internet', true);
  }
  async function descargar() {
    if (!('caches' in window)) return;
    var b = $('btn-descargar'); b.disabled = true;
    try {
      var r = await fetch(MANIF + '?t=' + Date.now(), { cache: 'no-store' });
      var remoto = await r.json(), lista = remoto.assets || [];
      var loc = manifLocal(), viejos = (loc && loc.assets) || [];
      var cache = await caches.open(CACHE_MEDIOS), ok = [], hechos = 0;
      for (var i = 0; i < lista.length; i++) {
        var a = lista[i], previo = viejos.find(function (x) { return x.url === a.url; });
        var esta = await cache.match(a.url);
        try {
          if (!esta || !previo || previo.lastModified !== a.lastModified) {
            var resp = await fetch(a.url + '?v=' + a.lastModified, { cache: 'reload' });
            if (resp.ok) { await cache.put(a.url, resp.clone()); ok.push(a); }
          } else ok.push(a);
        } catch (e) {}
        hechos++; pintarDescarga('⬇️ Guardando ' + hechos + ' de ' + lista.length + '…');
      }
      try { localStorage.setItem(CLAVE_MANIF, JSON.stringify({ leccion: 'tarjetas', assets: ok })); } catch (e) {}
      pintarDescarga(ok.length === lista.length ? '✓ Guardadas para usar sin internet' : '⚠️ Faltaron ' + (lista.length - ok.length) + '. Toca para reintentar', ok.length === lista.length);
    } catch (e) { pintarDescarga('⚠️ Sin conexión. Toca para reintentar'); }
    b.disabled = false;
  }

  /* ── arranque ── */
  function iniciar() {
    voz = leer('tarjetas_voz', 'm') === 'h' ? 'h' : 'm';
    cat = leer('tarjetas_cat', 'todas'); if (cat !== 'todas' && !(DATOS.categorias || []).some(function (c) { return c.id === cat; })) cat = 'todas';
    sinEs = leer('tarjetas_sin_es', '0') === '1';
    $('btn-es').setAttribute('aria-pressed', sinEs);
    $('btn-es').textContent = sinEs ? '👁️ Mostrar español' : '🙈 Ocultar español';
    [].forEach.call(document.querySelectorAll('.seg-btn'), function (b) { b.onclick = function () { ponerVoz(b.dataset.voz); }; });
    ponerVoz(voz);
    $('btn-es').onclick = function () {
      sinEs = !sinEs; guardar('tarjetas_sin_es', sinEs ? '1' : '0');
      this.setAttribute('aria-pressed', sinEs); this.textContent = sinEs ? '👁️ Mostrar español' : '🙈 Ocultar español';
      if (!$('vista-tarjeta').hidden) pintarTarjeta();
    };
    // iPhone/iPad: window.print() no hace nada en la app instalada, y abrir el PDF deja al usuario
    // atrapado (sin botón para volver). Por eso:
    //  1) se abre el menú «Compartir» de iOS con el PDF (Imprimir, Guardar en Archivos, WhatsApp…), sin salir de la página;
    //  2) si no se puede, el PDF se ve dentro de la página con un botón «← Volver a las tarjetas».
    var esIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var pdfArchivo = null;
    if (esIOS && navigator.canShare && window.File) {
      // Se descarga antes del toque: iOS solo deja compartir si se hace justo al tocar, sin esperas.
      fetch(PDF).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) {
        if (!b) return;
        var f = new File([b], 'Tarjetas_Rapidas_Piensa_en_Gujarati.pdf', { type: 'application/pdf' });
        try { if (navigator.canShare({ files: [f] })) pdfArchivo = f; } catch (e) {}
      }).catch(function () {});
    }
    function verPDF() {
      var v = $('visor-pdf');
      if (!v) {
        v = document.createElement('div'); v.id = 'visor-pdf';
        v.innerHTML = '<div class="visor-barra"><button class="btn-main" id="visor-volver">← Volver a las tarjetas</button></div>' +
          '<iframe title="Tarjetas rápidas en PDF"></iframe>';
        document.body.appendChild(v);
        $('visor-volver').onclick = function () { v.hidden = true; document.body.classList.remove('con-visor'); };
      }
      v.querySelector('iframe').src = PDF; v.hidden = false; document.body.classList.add('con-visor');
    }
    $('btn-imprimir').onclick = function () {
      if (esIOS) {
        if (pdfArchivo) {
          navigator.share({ files: [pdfArchivo], title: 'Tarjetas rápidas' })
            .catch(function (e) { if (!e || e.name !== 'AbortError') verPDF(); });
        } else verPDF();
        return;
      }
      try { window.print(); } catch (e) { verPDF(); }
    };
    $('btn-descargar').onclick = descargar; revisarDescarga();
    [].forEach.call(document.querySelectorAll('.cara-btn'), function (b) { b.onclick = function () { parar(); cara = b.dataset.cara; pintarTarjeta(); }; });
    function mover(d) { var vis = visibles(), p = vis.indexOf(actual); if (p < 0) { vis = DATOS.momentos.map(function (x, i) { return i; }); p = actual; }
      if (vis[p + d] !== undefined) abrir(vis[p + d]); }
    $('btn-ant').onclick = function () { mover(-1); };
    $('btn-sig').onclick = function () { mover(1); };
    $('btn-todas').onclick = tocarTodas;
    $('btn-volver').onclick = volver;
    $('fuente').textContent = DATOS.fuente || '';
    pintarLista(); pintarImpresion();
    function porHash() { var h = location.hash.slice(1), i = DATOS.momentos.findIndex(function (m) { return m.id === h; }); if (i >= 0) abrir(i); }
    window.addEventListener('hashchange', porHash); porHash();
  }
  fetch('data/tarjetas/tarjetas_rapidas.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (d) { DATOS = d; iniciar(); })
    .catch(function () { $('momentos').innerHTML = '<p class="aviso">No se pudieron cargar las tarjetas. Revisa la conexión.</p>'; });
})();
