/* clases.js (Claude, 21-nov-2026): apartado propio «Clases maestras» (antes vivía dentro de Palabra → Frase → Diálogo).
   Cada clase abre transforma.html?clase=N. Las que no están listas salen como «Muy pronto». Sin candados aquí:
   las fichas que necesitan letras nuevas se abren solas dentro de cada clase (campo «desde»). */
(function () {
  'use strict';
  var CLASES = [
    { n: 1, t: '¿Cómo está?', d: 'yo, usted, él, ella · sí, no, pregunta', ok: true },
    { n: 2, t: 'Esto es mío', d: 'mío, suyo, nuestro · las terminaciones', ok: true },
    { n: 3, t: 'Me desanimo', d: 'થઈ જવું: ponerse, volverse' },
    { n: 4, t: 'Me gusta', d: 'a mí, a usted · gustar, parecer, saber' },
    { n: 5, t: 'Mi día', d: 'hoy, mañana, ayer' }, { n: 6, t: 'Lo que pasó', d: 'el pasado' },
    { n: 7, t: 'Números y tiempo', d: 'días, semanas, meses, años' }, { n: 8, t: 'Puedo, quiero, tengo que', d: '' },
    { n: 9, t: 'Por favor', d: 'pedir con cortesía' }, { n: 10, t: 'Mi idioma, mi congregación', d: 'frases para el ministerio' }];
  function E(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t) { var el = document.getElementById('toast'); el.textContent = t; el.classList.add('ver'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('ver'); }, 2200); }
  var h = '<span class="badge">Transforma la frase</span><h1>🎛️ Clases maestras</h1>' +
    '<p class="sub">Una frase base y unas fichas: toca una ficha y mira qué cambia. Lo que cambia se pinta de verde, y cada frase tiene su audio.</p>';
  CLASES.forEach(function (c) {
    h += '<a class="opcion"' + (c.ok ? ' href="transforma.html?clase=' + c.n + '"' : ' data-pronto="1" style="opacity:.5"') + '>' +
      '<span class="ico">🎛️</span><div><div class="t">' + c.n + '. ' + E(c.t) + '</div><div class="d">' + E(c.d || '') + '</div></div>' +
      '<span class="n">' + (c.ok ? '→' : 'pronto') + '</span></a>';
  });
  document.getElementById('app').innerHTML = h;
  document.querySelectorAll('[data-pronto]').forEach(function (a) { a.onclick = function () { toast('Muy pronto: llega con su lección'); }; });
})();
