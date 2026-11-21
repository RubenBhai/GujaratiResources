/* nav_atras.js (Claude, 21-nov-2026): el botón «← Atrás» de las páginas de recursos regresa a la página anterior
   (o a la vista anterior dentro de la página). Si el alumno entró directo (sin página anterior del curso), va a su enlace.
   El botón «🏠 Menú» siempre lleva al menú principal. Uso: <a data-atras href="contenido.html">← Atrás</a> */
(function () {
  var interno = false;
  try { interno = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
  window.addEventListener('hashchange', function () { interno = true; });
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('[data-atras]');
    if (!a) return;
    if (interno && history.length > 1) { ev.preventDefault(); ev.stopPropagation(); history.back(); }
  }, true);
})();
