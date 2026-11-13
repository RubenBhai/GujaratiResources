/* ============================================================
   frases_hub.js — Hub de modos para una categoría.
   Lee ?set=<categoria>, toma el nombre de la categoría de su JSON,
   y muestra los 7 modos agrupados. Cada modo abre <archivo>?set=<set>.
   ============================================================ */
(function(){
  var set = new URLSearchParams(location.search).get('set') || 'predicar';

  /* Los 7 modos, agrupados por propósito. */
  var GRUPOS = [
    { titulo:'Conocer y repasar', modos:[
      { icono:'📖', nombre:'Presentación',    desc:'Mira la frase y sus piezas, con audio.',        archivo:'frases_presenta.html' },
      { icono:'👂', nombre:'Lectura guiada',   desc:'Karaoke: se resalta pieza por pieza.',          archivo:'frases_karaoke.html' },
      { icono:'🧠', nombre:'Reto de memoria',  desc:'Repaso espaciado hasta dominarlas.',            archivo:'frases_reto.html' }
    ]},
    { titulo:'Practicar la estructura', modos:[
      { icono:'🧩', nombre:'Componer',  desc:'Ordena las piezas para formar la frase.',  archivo:'frases_compone.html' },
      { icono:'✍️', nombre:'Dictado',   desc:'Escucha y reconstruye la frase de oído.',  archivo:'frases_dictado.html' },
      { icono:'🔁', nombre:'Backwards', desc:'Memorízala creciendo desde el final.',     archivo:'frases_backwards.html' },
      { icono:'🔀', nombre:'Adapta la frase', desc:'Cambia piezas y forma nuevas versiones.', archivo:'frases_flex.html' }
    ]},
    { titulo:'Hablar', modos:[
      { icono:'🎙️', nombre:'Pronunciación', desc:'Grábate y recibe una nota con un consejo.', archivo:'frases_pronuncia.html' }
    ]}
  ];

  function pintarModos(){
    var q = '?set=' + encodeURIComponent(set);
    var html = '';
    GRUPOS.forEach(function(g){
      html += '<div class="grupo-label">' + g.titulo + '</div>';
      html += '<div class="modo-grupo">';
      g.modos.forEach(function(m){
        html += '<a class="modo-card" href="' + m.archivo + q + '">';
        html +=   '<span class="modo-icono">' + m.icono + '</span>';
        html +=   '<span class="modo-nombre">' + m.nombre + '</span>';
        html +=   '<span class="modo-desc">' + m.desc + '</span>';
        html += '</a>';
      });
      html += '</div>';
    });
    document.getElementById('modo-lista').innerHTML = html;
  }

  // El nombre de la categoría sale de su propio JSON (data-driven)
  Frases.cargar()
    .then(function(d){
      var nombre = d.categoria || 'Frases';
      document.getElementById('page-title').textContent = nombre + ' · Piensa en Gujarati';
      document.getElementById('hub-cat').textContent = nombre;
      pintarModos();
    })
    .catch(function(){
      // Si el JSON de la categoría falla, igual mostramos los modos
      pintarModos();
    });

  Frases.checarVersion();
})();
