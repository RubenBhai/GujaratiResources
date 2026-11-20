/* descarga_offline.js (Claude, 20-nov-2026): botón «Guardar para usar sin internet» para las partes que no son lecciones
   (Curso de frases, Transforma la frase, Palabra → Frase → Diálogo). Igual que las tarjetas y el cargador de lecciones:
   misma caché del sw.js («gujarati-media») y un manifiesto versionado por parte, guardado en localStorage.
   Uso: <div class="offline" data-manifiesto="data/pfd/assets_pfd_versionado.json" data-clave="manifest_pfd"></div>
        <script src="descarga_offline.js"></script>
   Si ya está guardado y el manifiesto trae audios nuevos o cambiados, ofrece «Actualizar». */
(function () {
  'use strict';
  var CACHE = 'gujarati-media';
  var css = '.offline{margin:22px auto 8px;max-width:760px;padding:0 16px;text-align:center}' +
    '.offline button{font:inherit;font-weight:600;font-size:.95rem;padding:11px 18px;border-radius:50px;cursor:pointer;' +
    'border:1px solid rgba(184,134,61,.45);background:transparent;color:inherit;max-width:100%}' +
    '.offline button.listo{border-color:rgba(141,179,56,.6);color:#8DB338}.offline button:disabled{opacity:.7;cursor:wait}' +
    '.offline small{display:block;margin-top:6px;opacity:.65;font-size:.8rem}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function leer(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function mb(b) { return (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; }
  function iniciar(el) {
    if (!('caches' in window) || !window.fetch) { el.hidden = true; return; }
    var MANIF = el.dataset.manifiesto, CLAVE = el.dataset.clave, remoto = null;
    el.innerHTML = '<button type="button">⬇️ Guardar para usar sin internet</button><small></small>';
    var b = el.querySelector('button'), nota = el.querySelector('small');
    function pintar(t, listo, n) { b.textContent = t; b.classList.toggle('listo', !!listo); nota.textContent = n || ''; }
    function pendientes() {
      var loc = leer(CLAVE), viejos = {};
      ((loc && loc.assets) || []).forEach(function (a) { viejos[a.url] = a.lastModified; });
      return (remoto.assets || []).filter(function (a) { return !a.noEncontrado && viejos[a.url] !== a.lastModified; });
    }
    function estado() {
      var todos = (remoto.assets || []).filter(function (a) { return !a.noEncontrado; });
      var falta = pendientes(), peso = falta.reduce(function (s, a) { return s + (a.size || 0); }, 0);
      if (!leer(CLAVE)) pintar('⬇️ Guardar para usar sin internet', false, todos.length + ' audios · ' + mb(peso));
      else if (falta.length) pintar('⬇️ Actualizar: ' + falta.length + ' audios nuevos', false, mb(peso));
      else pintar('✓ Guardado para usar sin internet', true, '');
    }
    fetch(MANIF + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('404'); return r.json(); })
      .then(function (d) { remoto = d; estado(); })
      .catch(function () { if (leer(CLAVE)) pintar('✓ Guardado para usar sin internet', true, ''); else el.hidden = true; });
    b.onclick = async function () {
      if (!remoto) return;
      var loc = leer(CLAVE), viejos = {};
      ((loc && loc.assets) || []).forEach(function (a) { viejos[a.url] = a.lastModified; });
      var lista = (remoto.assets || []).filter(function (a) { return !a.noEncontrado; });
      if (b.classList.contains('listo')) return;
      b.disabled = true;
      try {
        var cache = await caches.open(CACHE), ok = [], hechos = 0;
        for (var i = 0; i < lista.length; i++) {
          var a = lista[i];
          try {
            var esta = await cache.match(a.url);
            if (!esta || viejos[a.url] !== a.lastModified) {
              var resp = await fetch(a.url + '?v=' + a.lastModified, { cache: 'reload' });
              if (resp.ok) { await cache.put(a.url, resp.clone()); ok.push(a); }
            } else ok.push(a);
          } catch (e) {}
          hechos++; pintar('⬇️ Guardando ' + hechos + ' de ' + lista.length + '…', false, '');
        }
        try { localStorage.setItem(CLAVE, JSON.stringify({ assets: ok })); } catch (e) {}
        if (ok.length === lista.length) pintar('✓ Guardado para usar sin internet', true, '');
        else pintar('⚠️ Faltaron ' + (lista.length - ok.length) + '. Toca para reintentar', false, '');
      } catch (e) { pintar('⚠️ Sin conexión. Toca para reintentar', false, ''); }
      b.disabled = false;
    };
  }
  function todo() { document.querySelectorAll('.offline[data-manifiesto]').forEach(iniciar); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', todo); else todo();
})();
