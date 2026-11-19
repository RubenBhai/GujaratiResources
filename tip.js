/* tip.js — Tips para las reuniones (Claude, 16-nov-2026; formato único desde el 19-nov-2026)
   tip.html → el tip de esta semana. Hay un solo tip: cada lunes su contenido se reemplaza por el nuevo
   (decisión de Rubén: una semana pasada ya nadie la mira). Datos: data/tips/tip.json.
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
  fetch('data/tips/tip.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('404'); return r.json(); }).then(function (tip) {
    $('cargando').hidden = true; $('vista-tip').hidden = false; preparar(tip);
  }).catch(function () {
    $('cargando').textContent = 'No pude cargar el tip. Revisa la conexión e inténtalo otra vez.';
  });
})();
