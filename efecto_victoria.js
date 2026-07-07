/* ═══════════════════════════════════════════════════════════════
   efecto_victoria.js — Cargador de celebración (por lección)
   ═══════════════════════════════════════════════════════════════
   Este archivo va en la raíz del sitio (junto a los .html), es fijo
   y no cambia entre lecciones. NO contiene el efecto visual en sí —
   ese vive por lección, en data/{leccion}/{programa_efecto_victoria}.js

   Uso desde cualquier motor:

     <script src="efecto_victoria.js"></script>
     ...
     revisarVictoria(resultado.porcentaje, data.sonido_victoria, data.programa_efecto_victoria, _leccion);

   Convención que debe cumplir el archivo del efecto (ej. data/1_1_1/pinata.js):
   debe definir una función global llamada exactamente ejecutarEfectoVictoria(),
   sin parámetros, que arme y dispare su propia animación (crea sus propios
   elementos, se limpia sola al terminar). Cada lección puede tener un
   archivo de efecto distinto, con nombre distinto, mientras cumpla esa
   única regla.
   ═══════════════════════════════════════════════════════════════ */

var UMBRAL_VICTORIA = 80;

function revisarVictoria(porcentaje, sonidoUrl, nombrePrograma, leccionFolder) {
  if (typeof porcentaje !== 'number' || porcentaje < UMBRAL_VICTORIA) return;
  if (!nombrePrograma || !leccionFolder) return; // sin programa o sin lección, no hay qué cargar

  if (sonidoUrl) {
    try {
      var audio = new Audio(sonidoUrl);
      audio.play().catch(function(){});
    } catch (e) {}
  }

  var url = 'data/' + leccionFolder + '/' + nombrePrograma + '.js';
  var script = document.createElement('script');
  script.src = url + '?t=' + Date.now(); // evita caché vieja, mismo patrón que el resto del sitio
  script.onload = function() {
    if (typeof ejecutarEfectoVictoria === 'function') {
      ejecutarEfectoVictoria();
    } else {
      console.warn('efecto_victoria: ' + url + ' cargó pero no definió ejecutarEfectoVictoria()');
    }
  };
  script.onerror = function() {
    console.warn('efecto_victoria: no se pudo cargar ' + url);
  };
  document.head.appendChild(script);
}
