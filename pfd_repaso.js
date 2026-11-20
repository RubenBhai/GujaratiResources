/* pfd_repaso.js (Claude, 20-nov-2026): repaso de final de lección «Palabra → Frase → Diálogo» (antes pfd.js).
   El apartado del menú principal (contenido propio por tramos, sin candados) es ahora pfd.html / pfd.js.
   pfd_repaso.html            → menú: Palabras · Frases · Diálogos
   pfd_repaso.html#palabras   → tarjetas que se voltean, con repaso espaciado (cajas de Leitner en localStorage «pfd_srs»)
   pfd_repaso.html#frases     → frases de los diálogos y de la práctica, con audio, y las clases maestras
   pfd_repaso.html#dialogos   → los diálogos: video, «tu turno», lectura y el texto con audio por línea
   Sin romanización en palabras, frases ni diálogos (pedido de Rubén, 20-nov-2026).
   Solo muestra las lecciones que el alumno ya terminó (localStorage «leccion_X_Y_Z» = «completada»).
   pfd_repaso.html?todo=1 abre todas (para revisar). Datos: data/pfd/pfd.json (recursos/pfd/construir_pfd.py). */
(function () {
  'use strict';
  var $app = document.getElementById('app');
  var TODO = new URLSearchParams(location.search).get('todo') === '1';
  var D = null, player = new Audio(), sonando = null;
  var DIAS = [0, 1, 3, 7, 14, 30];                       // días hasta el próximo repaso según la caja
  var CLASES = [{ clase: 1, titulo: '¿Cómo está?', sub: 'persona, género, sí / no / pregunta', desde: '1.2.3' }];

  function leer(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function E(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t) { var el = document.getElementById('toast'); el.textContent = t; el.classList.add('ver'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('ver'); }, 2200); }
  function terminada(cod) { return TODO || leer('leccion_' + cod.replace(/\./g, '_'), '') === 'completada'; }
  function abiertas() { return D.lecciones.filter(function (l) { return terminada(l.codigo); }).map(function (l) { return l.codigo; }); }
  function filtro() { var f = leer('pfd_filtro', 'todas'); return (f === 'todas' || abiertas().indexOf(f) >= 0) ? f : 'todas'; }
  function enFiltro(cod) { var f = filtro(); return abiertas().indexOf(cod) >= 0 && (f === 'todas' || f === cod); }

  function oir(src, btn) {
    if (!src) return;
    if (sonando) sonando.classList.remove('sonando');
    player.pause(); player.src = src; sonando = btn || null;
    if (btn) btn.classList.add('sonando');
    player.onended = function () { if (btn) btn.classList.remove('sonando'); };
    player.play().catch(function () { if (btn) btn.classList.remove('sonando'); });
  }
  function enlazarPlays(raiz) {
    raiz.querySelectorAll('.play[data-a]').forEach(function (b) {
      b.onclick = function (ev) { ev.stopPropagation(); oir(b.dataset.a, b); };
    });
  }
  function filtroHtml() {
    var f = filtro(), h = '<div class="filtro"><button class="chip' + (f === 'todas' ? ' on' : '') + '" data-f="todas">Todas</button>';
    D.lecciones.forEach(function (l) {
      var ok = terminada(l.codigo);
      h += '<button class="chip' + (f === l.codigo ? ' on' : '') + (ok ? '' : ' lock') + '" data-f="' + l.codigo + '">' + (ok ? '' : '🔒 ') + l.codigo + '</button>';
    });
    return h + '</div>';
  }
  function enlazarFiltro(redibujar) {
    var on = $app.querySelector('.chip.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    $app.querySelectorAll('.chip[data-f]').forEach(function (c) {
      c.onclick = function () {
        if (c.classList.contains('lock')) { toast('Se abre al terminar la lección ' + c.dataset.f); return; }
        guardar('pfd_filtro', c.dataset.f); redibujar();
      };
    });
  }
  function nada() {
    return '<div class="bloqueado">Todavía no terminas ninguna lección.<br>Este repaso se llena solo: cada lección que termines suma sus palabras, frases y diálogo.<br><br>' +
      '<a href="contenido_modulo.html?modulo=1.1">Empieza por la lección 1.1.1 →</a></div>';
  }

  /* ── menú ── */
  function menu() {
    document.getElementById('nav-atras').href = 'contenido.html';
    var ab = abiertas();
    var np = D.palabras.filter(function (p) { return ab.indexOf(p.leccion) >= 0; }).length;
    var nf = D.frases.filter(function (p) { return ab.indexOf(p.leccion) >= 0; }).length;
    var nd = D.dialogos.filter(function (p) { return ab.indexOf(p.leccion) >= 0; }).length;
    $app.innerHTML = '<span class="badge">Repaso de lecciones</span><h1>Palabra → Frase → Diálogo</h1>' +
      '<p class="sub">Repasa lo que ya aprendiste: las palabras, las frases y los diálogos de las lecciones que terminaste. Se llena solo con cada lección nueva.</p>' +
      (ab.length ? '' : nada()) +
      '<a class="opcion" href="#palabras"><span class="ico">🔤</span><div><div class="t">Palabras</div><div class="d">Tarjetas que se voltean, con repaso espaciado</div></div><span class="n">' + np + '</span></a>' +
      '<a class="opcion" href="#frases"><span class="ico">💬</span><div><div class="t">Frases</div><div class="d">Escúchalas y repítelas · clases maestras</div></div><span class="n">' + nf + '</span></a>' +
      '<a class="opcion" href="#dialogos"><span class="ico">🎭</span><div><div class="t">Diálogos</div><div class="d">Mira, conversa y lee cada diálogo</div></div><span class="n">' + nd + '</span></a>' +
      '<p class="sub" style="margin-top:22px">¿Quieres frases para hablar ya, aunque todavía no las sepas leer? <a href="frases.html" style="color:var(--saffron)">Curso de frases →</a></p>';
  }

  /* ── palabras ── */
  function srs() { try { return JSON.parse(leer('pfd_srs', '{}')) || {}; } catch (e) { return {}; } }
  function hoy() { return Math.floor(Date.now() / 86400000); }
  function marcarGu(frase, palabra) {
    var t = palabra.replace(/[.?!…]/g, '').trim(), h = E(frase);
    if (!t) return h;
    return h.split(E(t)).join('<mark>' + E(t) + '</mark>');
  }
  var mazo = [], pos = 0, todasModo = false;
  function armarMazo() {
    var s = srs(), d = hoy();
    var lista = D.palabras.filter(function (p) { return enFiltro(p.leccion); });
    mazo = todasModo ? lista.slice() : lista.filter(function (p) { var r = s[p.gu]; return !r || r.prox <= d; });
    mazo.sort(function (a, b) { var ra = s[a.gu], rb = s[b.gu]; return (ra ? ra.caja : -1) - (rb ? rb.caja : -1) || Math.random() - 0.5; });
    pos = 0;
  }
  function palabras(rehacer) {
    document.getElementById('nav-atras').href = '#';
    if (rehacer !== false) armarMazo();
    var h = '<span class="badge">Palabras</span><h1>Tarjetas</h1>' + filtroHtml();
    if (!abiertas().length) { $app.innerHTML = h + nada(); enlazarFiltro(palabras); return; }
    var total = D.palabras.filter(function (p) { return enFiltro(p.leccion); }).length;
    if (pos >= mazo.length) {
      h += '<div class="bloqueado">¡Al día! 🎉<br>Ya repasaste las ' + total + ' palabras que tocaban.<br><br>' +
        '<button class="btn sec" id="otra-vuelta" style="max-width:280px">Repasar todas otra vez</button></div>';
      $app.innerHTML = h; enlazarFiltro(palabras);
      document.getElementById('otra-vuelta').onclick = function () { todasModo = true; palabras(); todasModo = false; };
      return;
    }
    var p = mazo[pos], ej = p.ejemplo;
    h += '<div class="mazo-info"><span>' + (pos + 1) + ' de ' + mazo.length + '</span><span>lección ' + p.leccion + '</span></div>' +
      '<div class="tarjeta" id="tarj"><div class="in">' +
      '<div class="cara"><div class="grande gu">' + E(p.gu) + '</div>' +
      '<button class="play" data-a="' + E(p.audio) + '" aria-label="Escuchar" style="margin-top:12px">▶</button>' +
      '<div class="pista">¿Qué significa? Toca la tarjeta para voltearla</div></div>' +
      '<div class="cara atras">' + (p.img ? '<img src="' + E(p.img) + '" alt="" onerror="this.style.display=\'none\'">' : '') +
      '<div class="grande gu" style="font-size:2rem">' + E(p.gu) + '</div><div class="es">' + E(p.es) + '</div>' +
      (ej ? '<div class="ejemplo">' + (ej.quien ? '<div class="quien">' + E(ej.quien) + '</div>' : '') +
        '<div style="display:flex;gap:10px;align-items:center"><div style="flex:1"><div class="gu">' + marcarGu(ej.gu, p.gu) + '</div><div class="es2">' + E(ej.es) + '</div></div>' +
        (ej.audio ? '<button class="play" data-a="' + E(ej.audio) + '" aria-label="Escuchar la frase">▶</button>' : '') + '</div></div>' : '') +
      '</div></div></div>' +
      '<div class="botones"><button class="btn otra" id="b-otra">Otra vez</button><button class="btn sabe" id="b-sabe">¡La sé!</button></div>';
    $app.innerHTML = h; enlazarFiltro(palabras); enlazarPlays($app);
    var tj = document.getElementById('tarj');
    tj.onclick = function () { tj.classList.toggle('vuelta'); };
    function responder(bien) {
      var s = srs(), r = s[p.gu] || { caja: 0 };
      r.caja = bien ? Math.min(r.caja + 1, DIAS.length - 1) : 0;
      r.prox = hoy() + (bien ? DIAS[r.caja] : 0);
      s[p.gu] = r; guardar('pfd_srs', JSON.stringify(s));
      if (!bien) mazo.push(p);            // vuelve a salir en esta vuelta
      pos++; palabras(false);
    }
    document.getElementById('b-otra').onclick = function () { responder(false); };
    document.getElementById('b-sabe').onclick = function () { responder(true); };
  }

  /* ── frases ── */
  function frases() {
    document.getElementById('nav-atras').href = '#';
    var h = '<span class="badge">Frases</span><h1>Escucha y repite</h1>' + filtroHtml();
    if (!abiertas().length) { $app.innerHTML = h + nada(); enlazarFiltro(frases); return; }
    var cm = CLASES.map(function (c) {
      var ok = terminada(c.desde);
      return '<a class="opcion" ' + (ok ? 'href="transforma.html?clase=' + c.clase + '"' : 'data-lock="' + c.desde + '"') + '>' +
        '<span class="ico">🎛️</span><div><div class="t">Clase maestra ' + c.clase + ': ' + E(c.titulo) + '</div><div class="d">' + E(c.sub) + '</div></div>' +
        '<span class="n">' + (ok ? '→' : '🔒') + '</span></a>';
    }).join('');
    h += '<h2>Clases maestras de gramática</h2>' + cm;
    D.lecciones.forEach(function (l) {
      if (!enFiltro(l.codigo)) return;
      var fs = D.frases.filter(function (f) { return f.leccion === l.codigo; });
      if (!fs.length) return;
      h += '<div class="lec-titulo">Lección ' + l.codigo + ' · <span class="gu">' + E(l.titulo_gu) + '</span></div>';
      fs.forEach(function (f) {
        h += '<div class="item"><div class="tx">' + (f.quien ? '<div class="quien" style="color:var(--saffron)">' + E(f.quien) + '</div>' : '') +
          '<div class="gu">' + E(f.gu) + '</div><div class="es2">' + E(f.es) + '</div></div>' +
          (f.audio ? '<button class="play" data-a="' + E(f.audio) + '" aria-label="Escuchar">▶</button>' : '') + '</div>';
      });
    });
    $app.innerHTML = h; enlazarFiltro(frases); enlazarPlays($app);
    $app.querySelectorAll('[data-lock]').forEach(function (a) { a.onclick = function () { toast('Se abre al terminar la lección ' + a.dataset.lock); }; });
  }

  /* ── diálogos ── */
  function dialogos() {
    document.getElementById('nav-atras').href = '#';
    var h = '<span class="badge">Diálogos</span><h1>Mira, conversa y lee</h1>' + filtroHtml();
    if (!abiertas().length) { $app.innerHTML = h + nada(); enlazarFiltro(dialogos); return; }
    D.dialogos.forEach(function (d) {
      if (!enFiltro(d.leccion)) return;
      var l = D.lecciones.filter(function (x) { return x.codigo === d.leccion; })[0] || {};
      h += '<div class="dlg"><div class="cab"><div><div class="quien" style="color:var(--saffron);font-size:.75rem;letter-spacing:.1em;text-transform:uppercase">Lección ' + d.leccion + '</div>' +
        '<div class="tit gu">' + E(l.titulo_gu) + '</div><div class="tit-es">' + E(l.titulo_es) + '</div></div></div>' +
        '<div class="avs">' + d.avatares.map(function (a) { return '<img src="' + E(a) + '" alt="" onerror="this.style.display=\'none\'">'; }).join('') + '</div>' +
        '<div class="acc"><a class="btn sec" href="video.html?leccion=' + d.leccion + '">▶ Ver</a>' +
        '<a class="btn sec" href="video_interactivo.html?leccion=' + d.leccion + '">🎤 Tu turno</a>' +
        '<a class="btn sec" href="lectura.html?leccion=' + d.leccion + '">📖 Lectura</a></div>' +
        '<details><summary>Ver el diálogo (' + d.lineas.length + ' líneas)</summary>' +
        d.lineas.map(function (x) {
          return '<div class="item"><div class="tx"><div class="quien" style="color:' + E(x.color) + '">' + E(x.quien) + '</div><div class="gu">' + E(x.gu) +
            '</div><div class="es2">' + E(x.es) + '</div></div>' + (x.audio ? '<button class="play" data-a="' + E(x.audio) + '" aria-label="Escuchar">▶</button>' : '') + '</div>';
        }).join('') + '</details></div>';
    });
    $app.innerHTML = h; enlazarFiltro(dialogos); enlazarPlays($app);
  }

  function ruta() {
    var r = location.hash.replace('#', '');
    window.scrollTo(0, 0);
    if (r === 'palabras') palabras(); else if (r === 'frases') frases(); else if (r === 'dialogos') dialogos(); else menu();
  }
  fetch('data/pfd/pfd.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('404'); return r.json(); })
    .then(function (d) { D = d; window.addEventListener('hashchange', ruta); ruta(); })
    .catch(function () { $app.innerHTML = '<p class="cargando">No pude cargar el repaso. Revisa la conexión e inténtalo otra vez.</p>'; });
})();
