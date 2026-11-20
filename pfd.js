/* pfd.js (Claude, 20-nov-2026): «Palabra → Frase → Diálogo» del menú principal.
   Contenido propio, organizado por tramos de lectura (Todos · 1.1.1 → 1.2.3 · 1.3.1 → 1.3.3 · …), SIN candados.
   Cada palabra se lee con las letras de su tramo; las frases simulan la predicación, las revisitas, el estudio,
   la llegada a la reunión y la vida en casa. Audio solo en los diálogos (y en los ejemplos que salen de un diálogo).
   Sin romanización. Datos: data/pfd/tramos.json (recursos/pfd/construir_tramos.py).
   pfd.html            → menú
   pfd.html#palabras   → tarjetas que se voltean, repaso espaciado (localStorage «pfdm_srs»)
   pfd.html#frases     → las frases de ejemplo, por situación
   pfd.html#dialogos   → los diálogos con audio por línea y «escuchar todo»
   pfd.html#numeros    → los números que ya se leen
   El repaso de final de lección (con candados) es pfd_repaso.html. */
(function () {
  'use strict';
  var $app = document.getElementById('app');
  var D = null, player = new Audio(), sonando = null, cola = [];
  var DIAS = [0, 1, 3, 7, 14, 30];

  function leer(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function E(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t) { var el = document.getElementById('toast'); el.textContent = t; el.classList.add('ver'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('ver'); }, 2200); }

  /* ── filtros: tramo y situación ── */
  function listos() { return D.tramos.filter(function (t) { return t.listo; }); }
  function tramoSel() { var f = leer('pfdm_tramo', 'todos'); return (f === 'todos' || listos().some(function (t) { return t.id === f; })) ? f : 'todos'; }
  function sitSel() { var s = leer('pfdm_sit', 'todas'); return (s === 'todas' || D.situaciones[s]) ? s : 'todas'; }
  function tramosVisibles() { var f = tramoSel(); return listos().filter(function (t) { return f === 'todos' || t.id === f; }); }
  function junta(campo, conSit) {
    var s = sitSel(), out = [];
    tramosVisibles().forEach(function (t) { (t[campo] || []).forEach(function (x) { if (!conSit || s === 'todas' || x.sit === s) out.push(Object.assign({ tramo: t }, x)); }); });
    return out;
  }
  function filtrosHtml(conSit) {
    var f = tramoSel(), h = '<div class="filtro" data-fila="tramo"><button class="chip' + (f === 'todos' ? ' on' : '') + '" data-t="todos">Todos</button>';
    D.tramos.forEach(function (t) {
      h += '<button class="chip' + (f === t.id ? ' on' : '') + (t.listo ? '' : ' pronto') + '" data-t="' + t.id + '">' + E(t.nombre) + (t.listo ? '' : ' · pronto') + '</button>';
    });
    h += '</div>';
    if (conSit) {
      var s = sitSel();
      h += '<div class="filtro" data-fila="sit"><button class="chip sit' + (s === 'todas' ? ' on' : '') + '" data-s="todas">Todas las situaciones</button>';
      Object.keys(D.situaciones).forEach(function (k) {
        h += '<button class="chip sit' + (s === k ? ' on' : '') + '" data-s="' + k + '">' + E(D.situaciones[k]) + '</button>';
      });
      h += '</div>';
    }
    return h;
  }
  function enlazarFiltros(redibujar) {
    $app.querySelectorAll('.filtro').forEach(function (fila) { var on = fila.querySelector('.chip.on'); if (on) fila.scrollLeft = on.offsetLeft - (fila.clientWidth - on.offsetWidth) / 2; });
    $app.querySelectorAll('.chip[data-t]').forEach(function (c) {
      c.onclick = function () {
        if (c.classList.contains('pronto')) { toast('Muy pronto: se llena cuando lleguen esas lecciones'); return; }
        guardar('pfdm_tramo', c.dataset.t); redibujar();
      };
    });
    $app.querySelectorAll('.chip[data-s]').forEach(function (c) { c.onclick = function () { guardar('pfdm_sit', c.dataset.s); redibujar(); }; });
  }
  function vacio() { return '<div class="bloqueado">No hay nada en esta combinación todavía.<br>Prueba con «Todas las situaciones» o con otro tramo.</div>'; }

  /* ── audio ── */
  function parar() { cola = []; player.pause(); if (sonando) sonando.classList.remove('sonando'); sonando = null; $app.querySelectorAll('.item.activa').forEach(function (x) { x.classList.remove('activa'); }); }
  function oir(src, btn, alTerminar) {
    if (!src) return;
    if (sonando) sonando.classList.remove('sonando');
    player.pause(); player.src = src; sonando = btn || null;
    if (btn) btn.classList.add('sonando');
    player.onended = function () { if (btn) btn.classList.remove('sonando'); if (alTerminar) alTerminar(); };
    player.play().catch(function () { if (btn) btn.classList.remove('sonando'); cola = []; });
  }
  function enlazarPlays(raiz) {
    raiz.querySelectorAll('.play[data-a]').forEach(function (b) {
      b.onclick = function (ev) { ev.stopPropagation(); cola = []; oir(b.dataset.a, b); };
    });
  }
  function avatar(quien) {
    var p = D.personajes[quien] || {}, ini = E(quien.charAt(0));
    return p.img ? '<img class="av" src="' + E(p.img) + '" alt="" onerror="this.outerHTML=\'<span class=&quot;av ini&quot; style=&quot;background:' + E(p.color) + '&quot;>' + ini + '</span>\'">'
      : '<span class="av ini" style="background:' + E(p.color || '#4A3D37') + '">' + ini + '</span>';
  }

  /* ── menú ── */
  function menu() {
    parar();
    document.getElementById('nav-atras').href = 'contenido.html';
    var np = junta('palabras').length, nf = np, nd = junta('dialogos').length, nn = junta('numeros').length;
    $app.innerHTML = '<span class="badge">Practica con lo que ya lees</span><h1>Palabra → Frase → Diálogo</h1>' +
      '<p class="sub">Palabras útiles para predicar, para las revisitas, el estudio, la reunión y la casa. Todas se leen con las letras que ya aprendiste. Elige hasta dónde llegas:</p>' +
      filtrosHtml(false) +
      '<a class="opcion" href="#palabras"><span class="ico">🔤</span><div><div class="t">Palabras</div><div class="d">Tarjetas que se voltean, con un ejemplo</div></div><span class="n">' + np + '</span></a>' +
      '<a class="opcion" href="#frases"><span class="ico">💬</span><div><div class="t">Frases</div><div class="d">Cada palabra dentro de una frase, por situación</div></div><span class="n">' + nf + '</span></a>' +
      '<a class="opcion" href="#dialogos"><span class="ico">🎭</span><div><div class="t">Diálogos</div><div class="d">Escucha cómo se usan en una conversación</div></div><span class="n">' + nd + '</span></a>' +
      (nn ? '<a class="opcion" href="#numeros"><span class="ico">🔢</span><div><div class="t">Números</div><div class="d">Los que ya sabes leer: para citas y capítulos</div></div><span class="n">' + nn + '</span></a>' : '') +
      '<p class="sub" style="margin-top:22px">¿Ya terminaste una lección? Repasa sus palabras y su diálogo en el <a href="pfd_repaso.html" style="color:var(--saffron)">repaso de lecciones →</a></p>';
    enlazarFiltros(menu);
  }

  /* ── palabras ── */
  function srs() { try { return JSON.parse(leer('pfdm_srs', '{}')) || {}; } catch (e) { return {}; } }
  function hoy() { return Math.floor(Date.now() / 86400000); }
  function marcarGu(frase, palabra) {
    var t = palabra.replace(/[.?!…]/g, '').trim(), h = E(frase);
    return t ? h.split(E(t)).join('<mark>' + E(t) + '</mark>') : h;
  }
  var mazo = [], pos = 0, todasModo = false;
  function armarMazo() {
    var s = srs(), d = hoy(), lista = junta('palabras', true);
    mazo = todasModo ? lista.slice() : lista.filter(function (p) { var r = s[p.gu]; return !r || r.prox <= d; });
    mazo.sort(function (a, b) { var ra = s[a.gu], rb = s[b.gu]; return (ra ? ra.caja : -1) - (rb ? rb.caja : -1) || Math.random() - 0.5; });
    pos = 0;
  }
  function palabras(rehacer) {
    parar();
    document.getElementById('nav-atras').href = '#';
    if (rehacer !== false) armarMazo();
    var h = '<span class="badge">Palabras</span><h1>Tarjetas</h1>' + filtrosHtml(true);
    var total = junta('palabras', true).length;
    if (!total) { $app.innerHTML = h + vacio(); enlazarFiltros(palabras); return; }
    if (pos >= mazo.length) {
      h += '<div class="bloqueado">¡Al día! 🎉<br>Ya repasaste las ' + total + ' palabras que tocaban.<br><br>' +
        '<button class="btn sec" id="otra-vuelta" style="max-width:280px">Repasar todas otra vez</button></div>';
      $app.innerHTML = h; enlazarFiltros(palabras);
      document.getElementById('otra-vuelta').onclick = function () { todasModo = true; palabras(); todasModo = false; };
      return;
    }
    var p = mazo[pos], ej = p.ejemplo;
    h += '<div class="mazo-info"><span>' + (pos + 1) + ' de ' + mazo.length + '</span><span>' + E(D.situaciones[p.sit] || '') + '</span></div>' +
      '<div class="tarjeta" id="tarj"><div class="in">' +
      '<div class="cara"><div class="grande gu">' + E(p.gu) + '</div>' +
      '<div class="pista">¿Qué significa? Toca la tarjeta para voltearla</div></div>' +
      '<div class="cara atras"><div class="grande gu" style="font-size:2.2rem">' + E(p.gu) + '</div><div class="es">' + E(p.es) + '</div>' +
      (ej ? '<div class="ejemplo"><div style="display:flex;gap:10px;align-items:center"><div style="flex:1"><div class="gu">' + marcarGu(ej.gu, p.gu) + '</div><div class="es2">' + E(ej.es) + '</div></div>' +
        (ej.audio ? '<button class="play" data-a="' + E(ej.audio) + '" aria-label="Escuchar la frase">▶</button>' : '') + '</div></div>' : '') +
      '</div></div></div>' +
      '<div class="botones"><button class="btn otra" id="b-otra">Otra vez</button><button class="btn sabe" id="b-sabe">¡La sé!</button></div>';
    $app.innerHTML = h; enlazarFiltros(palabras); enlazarPlays($app);
    var tj = document.getElementById('tarj');
    tj.onclick = function () { tj.classList.toggle('vuelta'); };
    function responder(bien) {
      var s = srs(), r = s[p.gu] || { caja: 0 };
      r.caja = bien ? Math.min(r.caja + 1, DIAS.length - 1) : 0;
      r.prox = hoy() + (bien ? DIAS[r.caja] : 0);
      s[p.gu] = r; guardar('pfdm_srs', JSON.stringify(s));
      if (!bien) mazo.push(p);
      pos++; palabras(false);
    }
    document.getElementById('b-otra').onclick = function () { responder(false); };
    document.getElementById('b-sabe').onclick = function () { responder(true); };
  }

  /* ── frases ── */
  function frases() {
    parar();
    document.getElementById('nav-atras').href = '#';
    var h = '<span class="badge">Frases</span><h1>La palabra en una frase</h1>' + filtrosHtml(true);
    var ps = junta('palabras', true);
    if (!ps.length) { $app.innerHTML = h + vacio(); enlazarFiltros(frases); return; }
    Object.keys(D.situaciones).forEach(function (k) {
      var g = ps.filter(function (p) { return p.sit === k; });
      if (!g.length) return;
      h += '<div class="lec-titulo">' + E(D.situaciones[k]) + '</div>';
      g.forEach(function (p) {
        h += '<div class="item"><div class="tx"><div class="pal"><span class="gu">' + E(p.gu) + '</span> · ' + E(p.es) + '</div>' +
          '<div class="gu">' + marcarGu(p.ejemplo.gu, p.gu) + '</div><div class="es2">' + E(p.ejemplo.es) + '</div></div>' +
          (p.ejemplo.audio ? '<button class="play" data-a="' + E(p.ejemplo.audio) + '" aria-label="Escuchar">▶</button>' : '') + '</div>';
      });
    });
    h += '<p class="sub nota">▶ = la frase sale en un diálogo; ahí la escuchas completa.</p>';
    $app.innerHTML = h; enlazarFiltros(frases); enlazarPlays($app);
  }

  /* ── diálogos ── */
  function dialogos() {
    parar();
    document.getElementById('nav-atras').href = '#';
    var h = '<span class="badge">Diálogos</span><h1>Escucha la conversación</h1>' + filtrosHtml(true);
    var ds = junta('dialogos', true);
    if (!ds.length) { $app.innerHTML = h + vacio(); enlazarFiltros(dialogos); return; }
    ds.forEach(function (d, n) {
      var quienes = []; d.lineas.forEach(function (l) { if (quienes.indexOf(l.quien) < 0) quienes.push(l.quien); });
      h += '<div class="dlg" data-d="' + n + '"><div class="cab"><div><div class="quien" style="color:var(--saffron);font-size:.75rem;letter-spacing:.1em;text-transform:uppercase">' + E(D.situaciones[d.sit] || '') + '</div>' +
        '<div class="tit">' + E(d.titulo) + '</div></div></div>' +
        '<div class="avs">' + quienes.map(avatar).join('') + '<span class="nombres">' + quienes.map(E).join(' · ') + '</span></div>' +
        '<div class="acc"><button class="btn sec todo" data-d="' + n + '">▶ Escuchar todo</button><button class="btn sec ocultar" data-d="' + n + '">🙈 Ocultar español</button></div>' +
        '<details><summary>Ver el diálogo (' + d.lineas.length + ' líneas)</summary>' +
        d.lineas.map(function (x, i) {
          var c = (D.personajes[x.quien] || {}).color || 'var(--saffron)';
          return '<div class="item" data-i="' + i + '"><div class="tx"><div class="quien" style="color:' + E(c) + '">' + E(x.quien) + '</div><div class="gu">' + E(x.gu) +
            '</div><div class="es2">' + E(x.es) + '</div></div>' + (x.audio ? '<button class="play" data-a="' + E(x.audio) + '" aria-label="Escuchar">▶</button>' : '') + '</div>';
        }).join('') + '</details></div>';
    });
    $app.innerHTML = h; enlazarFiltros(dialogos); enlazarPlays($app);
    $app.querySelectorAll('.btn.todo').forEach(function (b) {
      b.onclick = function () {
        var caja = b.closest('.dlg');
        if (b.classList.contains('on')) { parar(); b.classList.remove('on'); b.textContent = '▶ Escuchar todo'; return; }
        parar(); $app.querySelectorAll('.btn.todo.on').forEach(function (x) { x.classList.remove('on'); x.textContent = '▶ Escuchar todo'; });
        caja.querySelector('details').open = true;
        b.classList.add('on'); b.textContent = '■ Parar';
        cola = Array.prototype.slice.call(caja.querySelectorAll('.item[data-i]'));
        (function sig() {
          $app.querySelectorAll('.item.activa').forEach(function (x) { x.classList.remove('activa'); });
          var it = cola.shift();
          if (!it) { b.classList.remove('on'); b.textContent = '▶ Escuchar todo'; return; }
          var pl = it.querySelector('.play');
          if (!pl) { sig(); return; }
          it.classList.add('activa'); it.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          oir(pl.dataset.a, pl, function () { if (b.classList.contains('on')) setTimeout(sig, 450); });
        })();
      };
    });
    $app.querySelectorAll('.btn.ocultar').forEach(function (b) {
      b.onclick = function () {
        var caja = b.closest('.dlg'), on = caja.classList.toggle('sin-es');
        b.textContent = on ? '👁 Mostrar español' : '🙈 Ocultar español';
        caja.querySelector('details').open = true;
      };
    });
  }

  /* ── números ── */
  function numeros() {
    parar();
    document.getElementById('nav-atras').href = '#';
    var h = '<span class="badge">Números</span><h1>Los números que ya lees</h1>' + filtrosHtml(false) +
      '<p class="sub">Con estos ya puedes leer una cita: <span class="gu">યશાયા ૯:૭</span>, <span class="gu">રોમનો ૧૦:૧૩</span>. Los demás números se suman cuando aprendas sus letras.</p>';
    var ns = junta('numeros'), vistos = {};
    ns = ns.filter(function (x) { if (vistos[x.cifra]) return false; vistos[x.cifra] = 1; return true; });
    if (!ns.length) { $app.innerHTML = h + vacio(); enlazarFiltros(numeros); return; }
    h += '<div class="nums">' + ns.map(function (x) {
      return '<button class="num" type="button"><span class="cifra gu">' + E(x.cifra) + '</span><span class="pal gu">' + E(x.gu) + '</span></button>';
    }).join('') + '</div><p class="sub nota">Toca un número para ocultar o mostrar su palabra.</p>';
    $app.innerHTML = h; enlazarFiltros(numeros);
    $app.querySelectorAll('.num').forEach(function (b) { b.onclick = function () { b.classList.toggle('oculta'); }; });
  }

  function ruta() {
    var r = location.hash.replace('#', '');
    window.scrollTo(0, 0);
    if (r === 'palabras') palabras(); else if (r === 'frases') frases(); else if (r === 'dialogos') dialogos(); else if (r === 'numeros') numeros(); else menu();
  }
  fetch('data/pfd/tramos.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('404'); return r.json(); })
    .then(function (d) { D = d; window.addEventListener('hashchange', ruta); ruta(); })
    .catch(function () { $app.innerHTML = '<p class="cargando">No pude cargar el contenido. Revisa la conexión e inténtalo otra vez.</p>'; });
})();
