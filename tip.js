/* tip.js — Tips para las reuniones (Claude, 16-nov-2026)
   tip.html          → lista de semanas, de la más reciente a la más antigua
   tip.html?s=<id>   → el tip de esa semana · tip.html?s=ultimo → el de esta semana
   Datos: data/tips/tips.json (índice) y data/tips/tip_<id>.json (contenido ya preparado).
   Audio de la conversación: audios/tarjetas/<audio>_<m|h>.mp3 (tarjeta 12 de las Tarjetas rápidas). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function leer(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var audio = new Audio(), voz = leer('tarjetas_voz', 'm');

  function nivel(n) {
    document.querySelectorAll('#contenido .w[data-n], #t-titulo-gu .w[data-n]').forEach(function (w) { w.classList.toggle('si', +w.dataset.n <= n); });
    document.querySelectorAll('#niveles button').forEach(function (b) { b.classList.toggle('on', +b.dataset.n === n); });
  }
  function marcarVoz() {
    document.querySelectorAll('.seg-btn[data-voz]').forEach(function (b) { b.classList.toggle('activo', b.dataset.voz === voz); });
  }
  function preparar(tip) {
    $('t-semana').textContent = '💡 Tip de La Atalaya · ' + tip.semana;
    $('t-titulo-gu').innerHTML = tip.titulo_gu;
    $('t-titulo-es').textContent = tip.titulo_es;
    document.title = 'Tip · ' + tip.semana + ' · Piensa en Gujarati';
    $('contenido').innerHTML = tip.html;
    var porDefecto = (tip.niveles.filter(function (x) { return x.codigo === tip.nivel; })[0] || tip.niveles[0]).n;
    var elegido = +leer('tip_nivel', porDefecto);
    if (!tip.niveles.some(function (x) { return x.n === elegido; })) elegido = porDefecto;
    $('niveles').innerHTML = tip.niveles.map(function (x) { return '<button data-n="' + x.n + '">' + x.codigo + '</button>'; }).join('');
    document.querySelectorAll('#niveles button').forEach(function (b) {
      b.onclick = function () { guardar('tip_nivel', b.dataset.n); nivel(+b.dataset.n); };
    });
    nivel(elegido);
    document.querySelectorAll('.seg-btn[data-voz]').forEach(function (b) {
      b.onclick = function () { voz = b.dataset.voz; guardar('tarjetas_voz', voz); marcarVoz(); };
    });
    marcarVoz();
    document.querySelectorAll('.play[data-audio]').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('.play.sonando').forEach(function (x) { x.classList.remove('sonando'); });
        audio.pause(); audio.src = 'audios/tarjetas/' + b.dataset.audio + '_' + voz + '.mp3';
        b.classList.add('sonando'); audio.onended = function () { b.classList.remove('sonando'); };
        audio.play().catch(function () { b.classList.remove('sonando'); });
      };
    });
  }
  function lista(idx) {
    var semanas = idx.semanas.slice().sort(function (a, b) { return a.id < b.id ? 1 : -1; });   // de la más reciente a la más antigua
    $('lista-semanas').innerHTML = semanas.map(function (s) {
      var nueva = s.id === idx.actual ? '<span class="nueva">Esta semana</span>' : '';
      return '<li><a class="semana" href="tip.html?s=' + encodeURIComponent(s.id) + '">' +
        '<span class="sem-fecha">' + s.semana + nueva + '</span>' +
        '<span class="sem-gu gu">' + s.titulo_gu + '</span>' +
        '<span class="sem-es">' + s.titulo_es + '</span></a></li>';
    }).join('');
    $('cargando').hidden = true; $('vista-lista').hidden = false;
  }
  var pedida = new URLSearchParams(location.search).get('s');
  fetch('data/tips/tips.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (idx) {
    if (!pedida) { lista(idx); return null; }
    var id = pedida === 'ultimo' ? idx.actual : pedida;
    var sem = idx.semanas.filter(function (s) { return s.id === id; })[0];
    if (!sem) { lista(idx); return null; }
    $('nav-salir').href = 'tip.html'; $('nav-salir').textContent = '← Semanas';
    return fetch(sem.archivo, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (tip) {
      $('cargando').hidden = true; $('vista-tip').hidden = false; preparar(tip);
    });
  }).catch(function () {
    $('cargando').textContent = 'No pude cargar los tips. Revisa la conexión e inténtalo otra vez.';
  });
})();
