/* bloques.js (Claude, 21-nov-2026): «Bloques de construcción» — las piezas que usa el gujarati de verdad para armar frases naturales.
   bloques.html          → la lista, por «para qué sirve»
   bloques.html#<id>     → un bloque: qué hace, ojo, ejemplos (gujarati · literal · natural, audio donde importa) y «Arma la frase»
   Datos: data/bloques/bloques.json (recursos/bloques/construir_bloques.py). Sin romanización. Estilos: tema-pfd.css. */
(function () {
  'use strict';
  var $app = document.getElementById('app'), D = null, player = new Audio(), sonando = null;
  var ORD = ['1.1.1', '1.1.2', '1.1.3', '1.2.1', '1.2.2', '1.2.3', '1.3.1', '1.3.2', '1.3.3', '1.4.1', '1.4.2'];
  var CM_LISTAS = [1, 2];   // clases maestras publicadas

  function leer(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function E(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function completada(cod) { return leer('leccion_' + String(cod).replace(/\./g, '_'), '') === 'completada'; }
  function marcar(gu, re) { var h = E(gu); try { return h.replace(new RegExp(re, 'g'), function (m) { return '<mark>' + m + '</mark>'; }); } catch (e) { return h; } }
  function toast(t) { var el = document.getElementById('toast'); el.textContent = t; el.classList.add('ver'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('ver'); }, 2200); }
  function oir(src, btn) {
    if (!src) return;
    if (sonando) sonando.classList.remove('sonando');
    player.pause(); player.src = src; sonando = btn || null;
    if (btn) btn.classList.add('sonando');
    player.onended = function () { if (btn) btn.classList.remove('sonando'); };
    player.play().catch(function () { if (btn) btn.classList.remove('sonando'); });
  }
  function offline(ver) { var o = document.getElementById('offline'); if (o) o.style.display = ver ? '' : 'none'; }

  /* ── lista ── */
  function lista() {
    offline(true); player.pause();
    document.getElementById('nav-atras').href = 'contenido.html';
    var cat = leer('bloques_cat', 'todos'), cats = D.categorias.filter(function (c) { return D.bloques.some(function (b) { return b.cat === c.id; }); });
    if (cat !== 'todos' && !cats.some(function (c) { return c.id === cat; })) cat = 'todos';
    var h = '<span class="badge">Para traducir con naturalidad</span><h1>🧱 Bloques de construcción</h1>' +
      '<p class="sub">El gujarati no se traduce palabra por palabra: se arma con piezas que ya existen. Aquí están esas piezas, con su traducción literal y la natural, para que veas cómo se construye una frase.</p>' +
      '<div class="filtro">' + [{ id: 'todos', titulo: 'Todos' }].concat(cats).map(function (c) {
        return '<button class="chip' + (c.id === cat ? ' on' : '') + '" data-c="' + c.id + '">' + E(c.titulo) + '</button>'; }).join('') + '</div>';
    D.bloques.forEach(function (b) {
      if (cat !== 'todos' && b.cat !== cat) return;
      var ya = completada(b.lee);
      h += '<a class="opcion bq" href="#' + b.id + '"><span class="bq-gu gu">' + E(b.bloque) + '</span><div><div class="t">' + E(b.que) + '</div>' +
        '<div class="d">' + E((D.categorias.filter(function (c) { return c.id === b.cat; })[0] || {}).titulo || '') + ' · ' + b.ejemplos.length + ' ejemplos</div>' +
        '<div class="bq-lee' + (ya ? ' ya' : '') + '">📖 ' + (ya ? 'ya lo puedes leer' : 'se lee desde la ' + b.lee) + '</div></div><span class="n">→</span></a>';
    });
    h += '<p class="sub nota">Se irán sumando bloques a medida que los encontremos en las publicaciones y las reuniones.</p>';
    $app.innerHTML = h;
    $app.querySelectorAll('.chip[data-c]').forEach(function (c) { c.onclick = function () { guardar('bloques_cat', c.dataset.c); lista(); }; });
  }

  /* ── un bloque ── */
  function bloque(b) {
    offline(false); player.pause();
    document.getElementById('nav-atras').href = '#';
    var i = D.bloques.indexOf(b), cat = (D.categorias.filter(function (c) { return c.id === b.cat; })[0] || {}).titulo || '';
    var h = '<span class="badge">' + E(cat) + '</span><h1 class="gu bq-tit">' + E(b.bloque) + '</h1><p class="sub bq-que">' + E(b.que) + '</p>' +
      '<div class="bq-caja">' + b.explica + '</div>' + (b.ojo ? '<div class="bq-caja ojo">👀 ' + b.ojo + '</div>' : '') +
      '<h2>Ejemplos</h2>';
    b.ejemplos.forEach(function (e) {
      h += '<div class="item bq-ej"><div class="tx"><div class="gu">' + marcar(e.gu, b.marca) + '</div>' +
        '<div class="bq-lit"><span>Literal:</span> ' + E(e.literal) + '</div>' +
        '<div class="bq-nat"><span>Natural:</span> ' + E(e.natural) + '</div></div>' +
        (e.audio ? '<button class="play" data-a="' + E(e.audio) + '" aria-label="Escuchar">▶</button>' : '') + '</div>';
    });
    if (b.arma && b.arma.length) h += '<h2>🧩 Arma la frase</h2><div id="arma"></div>';
    if (b.cm) {
      var ok = CM_LISTAS.indexOf(b.cm) >= 0;
      h += '<a class="opcion" ' + (ok ? 'href="transforma.html?clase=' + b.cm + '"' : 'data-pronto="1" style="opacity:.55"') + '><span class="ico">🎛️</span><div><div class="t">Practícalo tocando fichas</div>' +
        '<div class="d">Clase maestra ' + b.cm + (ok ? '' : ' · muy pronto') + '</div></div><span class="n">' + (ok ? '→' : '') + '</span></a>';
    }
    h += '<div class="botones bq-nav">' + (i > 0 ? '<a class="btn sec" href="#' + D.bloques[i - 1].id + '">← ' + E(D.bloques[i - 1].bloque) + '</a>' : '<span></span>') +
      (i < D.bloques.length - 1 ? '<a class="btn sec" href="#' + D.bloques[i + 1].id + '">' + E(D.bloques[i + 1].bloque) + ' →</a>' : '<a class="btn sec" href="#">Todos los bloques</a>') + '</div>';
    $app.innerHTML = h;
    $app.querySelectorAll('.play[data-a]').forEach(function (p) { p.onclick = function () { oir(p.dataset.a, p); }; });
    $app.querySelectorAll('[data-pronto]').forEach(function (a) { a.onclick = function () { toast('Muy pronto'); }; });
    if (b.arma && b.arma.length) arma(b, 0);
  }

  /* ── «Arma la frase»: tocar las piezas en orden ── */
  function arma(b, k) {
    var ej = b.arma[k], cont = document.getElementById('arma');
    var piezas = ej.piezas.map(function (p, i) { return { t: p, i: i }; });
    do { piezas.sort(function () { return Math.random() - 0.5; }); } while (piezas.length > 1 && piezas.every(function (p, j) { return p.i === j; }));
    var puesto = [];
    function pintar(estado) {
      cont.innerHTML = '<div class="bq-arma"><div class="bq-es">«' + E(ej.es) + '»</div>' +
        '<div class="bq-linea gu' + (estado ? ' ' + estado : '') + '">' + (puesto.length ? puesto.map(function (p, j) { return '<button class="pz puesta" data-j="' + j + '">' + E(p.t) + '</button>'; }).join('') : '<span class="bq-vacio">Toca las piezas en orden…</span>') + '</div>' +
        '<div class="bq-piezas gu">' + piezas.map(function (p, j) { var usada = puesto.indexOf(p) >= 0; return '<button class="pz' + (usada ? ' usada' : '') + '" data-p="' + j + '"' + (usada ? ' disabled' : '') + '>' + E(p.t) + '</button>'; }).join('') + '</div>' +
        '<div class="botones"><button class="btn sec" id="bq-ver">Ver la respuesta</button><button class="btn sabe" id="bq-comp">Comprobar</button></div></div>';
      cont.querySelectorAll('.pz[data-p]').forEach(function (x) { x.onclick = function () { puesto.push(piezas[+x.dataset.p]); pintar(); }; });
      cont.querySelectorAll('.pz.puesta').forEach(function (x) { x.onclick = function () { puesto.splice(+x.dataset.j, 1); pintar(); }; });
      document.getElementById('bq-ver').onclick = function () { puesto = ej.piezas.map(function (t, i) { return piezas.filter(function (p) { return p.i === i; })[0]; }); pintar('bien'); };
      document.getElementById('bq-comp').onclick = function () {
        if (puesto.length < piezas.length) { toast('Faltan piezas'); return; }
        var bien = puesto.every(function (p, j) { return p.t === ej.piezas[j]; });
        pintar(bien ? 'bien' : 'mal'); toast(bien ? '¡Muy bien! 🎉' : 'Casi: toca una pieza para quitarla y prueba otra vez');
      };
    }
    pintar();
  }

  function ruta() {
    window.scrollTo(0, 0);
    var id = location.hash.replace('#', ''), b = D.bloques.filter(function (x) { return x.id === id; })[0];
    if (b) bloque(b); else lista();
  }
  fetch('data/bloques/bloques.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('404'); return r.json(); })
    .then(function (d) { D = d; window.addEventListener('hashchange', ruta); ruta(); })
    .catch(function () { $app.innerHTML = '<p class="cargando">No pude cargar los bloques. Revisa la conexión e inténtalo otra vez.</p>'; });
})();
