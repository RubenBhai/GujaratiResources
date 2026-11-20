/* repaso.js (Claude, 20-nov-2026): motor de las lecciones de repaso X.X.R («palabra → frase → diálogo»).
   repaso.html?leccion=1.2.R#palabras  → cada palabra del módulo (imagen + audio) y luego dentro de una frase con audio
   repaso.html?leccion=1.2.R#dialogo   → el diálogo nuevo: audio por línea, «Escuchar todo», «Ocultar español» y «Tu turno»
   Datos: data/1_2_R/repaso_1_2_R.json. Sin romanización. Estilos: tema-pfd.css. */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search);
  var LEC = Q.get('leccion') || '1.2.R', CARP = LEC.replace(/\./g, '_');
  var $app = document.getElementById('app'), D = null, player = new Audio(), sonando = null, cola = [];
  var idx = 0, frase = false, turno = null;

  function E(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function marcar(fr, pal) { var h = E(fr), t = E(pal); return t ? h.split(t).join('<mark>' + t + '</mark>') : h; }
  function parar() { cola = []; player.pause(); if (sonando) sonando.classList.remove('sonando'); sonando = null; $app.querySelectorAll('.item.activa').forEach(function (x) { x.classList.remove('activa'); }); }
  function oir(src, btn, fin) {
    if (!src) return;
    if (sonando) sonando.classList.remove('sonando');
    player.pause(); player.src = src; sonando = btn || null;
    if (btn) btn.classList.add('sonando');
    player.onended = function () { if (btn) btn.classList.remove('sonando'); if (fin) fin(); };
    player.play().catch(function () { if (btn) btn.classList.remove('sonando'); cola = []; });
  }
  function plays(raiz) { raiz.querySelectorAll('.play[data-a]').forEach(function (b) { b.onclick = function (ev) { ev.stopPropagation(); cola = []; oir(b.dataset.a, b); }; }); }
  function progreso(n, t) { var f = document.getElementById('top-fill'); if (f) f.style.width = Math.round(100 * n / t) + '%'; }

  /* ── palabra → frase ── */
  function palabras() {
    parar();
    var P = D.palabras, p = P[idx], ult = idx === P.length - 1;
    progreso(idx + (frase ? 1 : 0.5), P.length);
    var h = '<span class="badge">' + (frase ? 'Frase' : 'Palabra') + ' · ' + (idx + 1) + ' de ' + P.length + '</span>' +
      '<div class="rp-card">' +
      (p.img ? '<img class="rp-img" src="' + E(p.img) + '" alt="" onerror="this.style.display=\'none\'">' : '') +
      '<div class="rp-pal gu">' + E(p.gu) + '</div><div class="rp-es">' + E(p.es) + '</div>' +
      '<div class="rp-btns"><button class="play" data-a="' + E(p.audioM) + '" aria-label="Escuchar (mujer)">▶</button>' +
      (p.audioH ? '<button class="play h" data-a="' + E(p.audioH) + '" aria-label="Escuchar (hombre)">▶</button>' : '') + '</div>';
    if (frase) {
      h += '<div class="ejemplo rp-frase"><div style="display:flex;gap:10px;align-items:center"><div style="flex:1"><div class="gu">' + marcar(p.frase.gu, p.gu) +
        '</div><div class="es2">' + E(p.frase.es) + '</div></div><button class="play" id="pf" data-a="' + E(p.frase.audio) + '" aria-label="Escuchar la frase">▶</button></div></div>';
    }
    h += '</div><div class="botones">' +
      '<button class="btn sec" id="b-atras">←</button>' +
      (frase ? '<button class="btn sabe" id="b-sig">' + (ult ? 'La nota especial →' : 'Siguiente palabra →') + '</button>'
             : '<button class="btn sabe" id="b-sig">Verla en una frase →</button>') + '</div>';
    $app.innerHTML = h; plays($app);
    if (frase) { var pf = document.getElementById('pf'); setTimeout(function () { oir(pf.dataset.a, pf); }, 250); }
    document.getElementById('b-atras').onclick = function () {
      if (frase) frase = false; else if (idx > 0) { idx--; frase = true; } else { location.href = D.anterior; return; }
      palabras();
    };
    document.getElementById('b-sig').onclick = function () {
      if (!frase) { frase = true; palabras(); return; }
      if (ult) { location.href = D.despues_palabras; return; }
      idx++; frase = false; palabras();
    };
  }

  /* ── diálogo ── */
  function dialogo() {
    parar(); progreso(1, 1);
    var d = D.dialogo, A = d.avatares;
    var quienes = []; d.lineas.forEach(function (l) { if (quienes.indexOf(l.quien) < 0) quienes.push(l.quien); });
    function av(q) { var a = A[q] || {}; return a.img ? '<img class="av" src="' + E(a.img) + '" alt="">' : '<span class="av ini" style="background:' + E(a.color || '#4A3D37') + '">' + E((a.nombre || '?').charAt(0)) + '</span>'; }
    var h = '<span class="badge">Diálogo</span><h1>' + E(d.titulo) + '</h1><p class="sub">' + E(d.intro) + '</p>' +
      '<div class="dlg"><div class="avs">' + quienes.map(av).join('') + '<span class="nombres">' + quienes.map(function (q) { return E((A[q] || {}).nombre || q); }).join(' · ') + '</span></div>' +
      '<div class="acc"><button class="btn sec todo">▶ Escuchar todo</button><button class="btn sec ocultar">🙈 Ocultar español</button></div>' +
      '<div class="turno"><span>🎤 Tu turno: habla tú por</span>' + quienes.map(function (q) {
        return '<button class="chip' + (turno === q ? ' on' : '') + '" data-q="' + E(q) + '">' + E((A[q] || {}).nombre || q) + '</button>';
      }).join('') + '</div>' +
      d.lineas.map(function (x, i) {
        var a = A[x.quien] || {}, mio = turno === x.quien;
        return '<div class="item' + (mio ? ' mio' : '') + '" data-i="' + i + '"><div class="tx"><div class="quien" style="color:' + E(a.color) + '">' + E(a.nombre || x.quien) + '</div>' +
          '<div class="gu">' + (mio ? '<span class="oculto">Te toca: dilo en voz alta y toca para comprobar</span><span class="real">' + E(x.gu) + '</span>' : E(x.gu)) + '</div>' +
          '<div class="es2">' + E(x.es) + '</div></div><button class="play" data-a="' + E(x.audio) + '" aria-label="Escuchar">▶</button></div>';
      }).join('') + '</div>' +
      '<a class="btn sabe" style="display:block;margin-top:14px" href="' + E(D.despues_dialogo) + '">Terminar la lección →</a>' +
      '<p class="sub" style="margin-top:18px">¿Quieres repasar con tarjetas todo lo de tus lecciones? <a href="pfd_repaso.html" style="color:var(--saffron)">Repaso de lecciones →</a></p>';
    $app.innerHTML = h; plays($app);
    $app.querySelectorAll('.item.mio').forEach(function (it) { it.onclick = function () { it.classList.add('visto'); }; });
    $app.querySelectorAll('.turno .chip').forEach(function (c) { c.onclick = function () { turno = (turno === c.dataset.q) ? null : c.dataset.q; dialogo(); }; });
    var b = $app.querySelector('.btn.todo'), caja = $app.querySelector('.dlg');
    $app.querySelector('.btn.ocultar').onclick = function () { var on = caja.classList.toggle('sin-es'); this.textContent = on ? '👁 Mostrar español' : '🙈 Ocultar español'; };
    b.onclick = function () {
      if (b.classList.contains('on')) { parar(); b.classList.remove('on'); b.textContent = '▶ Escuchar todo'; return; }
      parar(); b.classList.add('on'); b.textContent = '■ Parar';
      cola = Array.prototype.slice.call(caja.querySelectorAll('.item[data-i]'));
      (function sig() {
        $app.querySelectorAll('.item.activa').forEach(function (x) { x.classList.remove('activa'); });
        var it = cola.shift();
        if (!it) { b.classList.remove('on'); b.textContent = '▶ Escuchar todo'; return; }
        var pl = it.querySelector('.play');
        it.classList.add('activa'); it.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        if (it.classList.contains('mio') && !it.classList.contains('visto')) {
          // Tu turno: pausa para que el alumno hable; luego se oye la línea
          setTimeout(function () { if (!b.classList.contains('on')) return; it.classList.add('visto'); oir(pl.dataset.a, pl, function () { if (b.classList.contains('on')) setTimeout(sig, 450); }); }, 3500);
          return;
        }
        oir(pl.dataset.a, pl, function () { if (b.classList.contains('on')) setTimeout(sig, 450); });
      })();
    };
  }

  function ruta() { window.scrollTo(0, 0); if (location.hash === '#dialogo') dialogo(); else palabras(); }
  fetch('data/' + CARP + '/repaso_' + CARP + '.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('404'); return r.json(); })
    .then(function (d) {
      D = d;
      document.getElementById('nav-salir').href = d.salir;
      document.getElementById('nav-home').href = d.home;
      document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + LEC;
      window.addEventListener('hashchange', ruta); ruta();
    })
    .catch(function () { $app.innerHTML = '<p class="cargando">No pude cargar la lección. Revisa la conexión e inténtalo otra vez.</p>'; });
})();
