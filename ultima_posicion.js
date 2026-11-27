/* ultima_posicion.js (Claude, 27-nov-2026): recuerda la última pantalla de lección que abrió el alumno,
   para el botón «▶ Continuar» del menú y de la guía. Solo guarda si la página es de una lección (?leccion=...). */
(function () {
  function guardar() {
    var q = new URLSearchParams(location.search), lec = q.get('leccion'), mod = q.get('modulo');
    if (mod && lec && lec.indexOf('.') < 0) lec = mod + '.' + lec;          // practica.html?modulo=1.2&leccion=2
    if (!lec || !/^\d+\.\d+\.(\d+|R)$/.test(lec)) return;
    var pag = location.pathname.split('/').pop() || '';
    if (/^leccion_loader/.test(pag)) return;                                // el cargador no es un lugar para volver
    try { localStorage.setItem('ultima_posicion', JSON.stringify({ leccion: lec, url: pag + location.search + location.hash, pagina: pag.replace(/\.html$/, ''), t: Date.now() })); } catch (e) {}
  }
  guardar(); window.addEventListener('hashchange', guardar);
})();
