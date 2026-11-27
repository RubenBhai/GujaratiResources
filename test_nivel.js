/* test_nivel.js (Claude, 27-nov-2026): test para el alumno que vuelve después de un tiempo.
   Por lección (1.1.1 → 1.2.3): 2 preguntas de oír y tocar la palabra escrita + 1 de qué significa una frase.
   Con 2 de 3 la lección está firme y pasa a la siguiente; si no, se detiene y recomienda empezar ahí.
   Datos: data/test_nivel.json. El resultado se guarda en localStorage 'test_nivel' (la guía lo muestra). */
(function () {
  'use strict';
  var app = document.getElementById('app'), player = document.getElementById('player');
  var D = null, iN = 0, iP = 0, aciertos = 0, resumen = [], ordenOps = [];
  var LECCIONES = ['1.1.1', '1.1.2', '1.1.3', '1.2.1', '1.2.2', '1.2.3', '1.2.R'];

  function E(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mezclar(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function hecha(c) { try { return localStorage.getItem('leccion_' + c.replace(/\./g, '_')) === 'completada'; } catch (e) { return false; } }
  function oir(src, btn) {
    if (!src) return;
    player.pause(); player.src = src;
    if (btn) btn.classList.add('on');
    player.onended = player.onerror = function () { if (btn) btn.classList.remove('on'); };
    player.play().catch(function () { if (btn) btn.classList.remove('on'); });
  }

  function total() { return D.niveles.length * 3; }
  function pregunta() {
    var n = D.niveles[iN], q = n.preguntas[iP], hechas = iN * 3 + iP;
    ordenOps = mezclar(q.opciones);
    var h = '<span class="badge">Test de nivel</span>' +
      '<div class="tn-caja"><div class="tn-prog"><span>Lección ' + n.leccion + '</span><span>Pregunta ' + (iP + 1) + ' de 3</span></div>' +
      '<div class="tn-barra"><i style="width:' + Math.round(100 * hechas / total()) + '%"></i></div>';
    if (q.tipo === 'oir') {
      h += '<div class="tn-preg">Escucha y toca la palabra que oyes</div>' +
        '<div class="tn-oir"><button class="tn-play" id="tn-play" aria-label="Escuchar otra vez">▶</button></div>' +
        '<div class="tn-ops">' + ordenOps.map(function (o, k) { return '<button class="tn-op gu" data-k="' + k + '">' + E(o) + '</button>'; }).join('');
    } else {
      h += '<div class="tn-preg">¿Qué significa?</div>' +
        '<div class="tn-frase"><span class="tn-gu">' + E(q.gu) + '</span>' + (q.audio ? '<button class="tn-play mini" id="tn-play" aria-label="Escuchar">▶</button>' : '') + '</div>' +
        '<div class="tn-ops">' + ordenOps.map(function (o, k) { return '<button class="tn-op" data-k="' + k + '">' + E(o) + '</button>'; }).join('');
    }
    h += '<button class="tn-op nose" data-k="-1">No sé</button></div><div class="tn-fb" id="tn-fb" aria-live="polite"></div></div>';
    app.innerHTML = h; window.scrollTo(0, 0);
    var pb = document.getElementById('tn-play');
    if (pb) { pb.onclick = function () { oir(q.audio, pb); }; if (q.tipo === 'oir') oir(q.audio, pb); }
    [].forEach.call(app.querySelectorAll('.tn-op'), function (b) { b.onclick = function () { responder(+b.dataset.k, b); }; });
  }

  function responder(k, btn) {
    var n = D.niveles[iN], q = n.preguntas[iP], bien = k >= 0 && ordenOps[k] === q.correcta;
    [].forEach.call(app.querySelectorAll('.tn-op'), function (b) {
      b.disabled = true;
      if (+b.dataset.k >= 0 && ordenOps[+b.dataset.k] === q.correcta) b.classList.add('bien');
    });
    if (!bien && k >= 0) btn.classList.add('mal');
    if (bien) aciertos++;
    var fb = document.getElementById('tn-fb');
    fb.innerHTML = bien ? '✓ ¡Bien!' : (q.tipo === 'oir' ? 'Era <span class="tn-gu">' + E(q.correcta) + '</span> (' + E(q.significado) + ').' : 'Significa: «' + E(q.correcta) + '»');
    fb.style.color = bien ? 'var(--verde)' : 'var(--ink-soft)';
    setTimeout(siguiente, bien ? 900 : 2200);
  }

  function siguiente() {
    iP++;
    if (iP < 3) return pregunta();
    var firme = aciertos >= 2;
    resumen.push({ leccion: D.niveles[iN].leccion, ok: firme, aciertos: aciertos });
    if (!firme) return resultado(D.niveles[iN].leccion);
    iN++; iP = 0; aciertos = 0;
    if (iN < D.niveles.length) return pregunta();
    resultado(null);
  }

  function resultado(lec) {
    player.pause();
    try { localStorage.setItem('test_nivel', JSON.stringify({ leccion: lec || 'todas', t: Date.now() })); } catch (e) {}
    var chips = '<div class="tn-chips">' + resumen.map(function (r) { return '<span class="tn-chip ' + (r.ok ? 'ok' : 'no') + '">' + r.leccion + ' ' + (r.ok ? '✓' : '·') + ' ' + r.aciertos + '/3</span>'; }).join('') + '</div>';
    var h = '<span class="badge">Tu resultado</span><div class="tn-caja"><div class="tn-res-lbl">👉 Por dónde seguir</div>';
    if (lec) {
      var primera = lec === '1.1.1';
      h += '<div class="tn-res-t">Empieza en la lección ' + lec + '</div>' +
        '<p style="line-height:1.55">' + (primera ? 'Lo mejor es empezar desde el principio. Vas a avanzar rápido: lo que ya sabes se repasa solo.'
          : 'Lo anterior lo tienes firme. En la ' + lec + ' empiezan las letras y frases que todavía se te escapan: retómala desde el principio.') + '</p>' + chips +
        '<div class="tn-btns"><a class="btn sabe" href="leccion_loader.html?leccion=' + lec + '">Empezar la lección ' + lec + ' →</a></div>' +
        (primera ? '' : '<a class="tn-sec" href="pfd_repaso.html">🔁 Antes, un repaso rápido de lo que ya terminaste</a>');
    } else {
      var sig = LECCIONES.filter(function (c) { return !hecha(c); })[0];
      h += '<div class="tn-res-t">¡Lo tienes firme! 🎉</div><p style="line-height:1.55">Recuerdas bien todas las lecciones hasta la 1.2.3.' +
        (sig ? ' Sigue con la ' + sig + (sig === '1.2.R' ? ', el repaso del módulo.' : '.') : ' Practica con los recursos mientras sale la próxima lección.') + '</p>' + chips +
        '<div class="tn-btns">' + (sig ? '<a class="btn sabe" href="leccion_loader.html?leccion=' + sig + '">Ir a la lección ' + sig + ' →</a>' : '<a class="btn sabe" href="contenido.html">Ir al menú →</a>') + '</div>';
    }
    h += '<a class="tn-sec" href="guia.html">🧭 Volver a «¿Por dónde empiezo?»</a></div>';
    app.innerHTML = h; window.scrollTo(0, 0);
  }

  document.getElementById('empezar').onclick = function () {
    var b = this; b.disabled = true; b.textContent = 'Cargando…';
    fetch('data/test_nivel.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('404'); return r.json(); })
      .then(function (d) { D = d; pregunta(); })
      .catch(function () { b.disabled = false; b.textContent = 'Empezar el test →'; var m = document.createElement('p'); m.className = 'sub'; m.style.marginTop = '10px'; m.textContent = 'No pude cargar el test. Revisa la conexión e inténtalo otra vez.'; b.after(m); });
  };
})();
