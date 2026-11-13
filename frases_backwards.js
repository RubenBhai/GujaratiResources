/* ============================================================
   frases_backwards.js — Modo 4: Backwards (buildup hacia atrás).
   La frase se arma desde el ÚLTIMO bloque hacia el principio: cada
   paso suma un bloque, y el audio se forma encadenando los audios
   de esos bloques. Escuchar y repetir en voz alta (sin evaluación).
   Deriva los pasos de los bloques; usa `Frases` (incl. secuencia()).
   (Mecánica basada en tu backwards.js del nivel 6 de reto.)
   ============================================================ */
(function(){
  var data    = null;
  var cola    = [];
  var oIdx    = 0;      // índice de la frase actual
  var frase   = null;
  var bloques = [];
  var paso    = 0;      // 0 = solo el último bloque; bloques.length-1 = frase completa
  var seq     = null;   // controlador de la secuencia de audio en curso

  var elCat    = document.getElementById('cat');
  var elBadge  = document.getElementById('badge');
  var elProg   = document.getElementById('progreso');
  var elWrap   = document.getElementById('fragmento-wrap');
  var elTexto  = document.getElementById('frag-texto');
  var elCierre = document.getElementById('cierre');
  var elCieGu  = document.getElementById('cierre-gu');
  var elCieRom = document.getElementById('cierre-rom');
  var elCieEs  = document.getElementById('cierre-es');
  var btnEsc   = document.getElementById('btn-escuchar');
  var btnSig   = document.getElementById('btn-siguiente');
  var btnCie   = document.getElementById('btn-cierre');

  Frases.cargar()
    .then(function(d){
      data = d;
      document.getElementById('page-title').textContent = (d.categoria || 'Frases') + ' · Backwards';
      elCat.textContent = d.categoria || 'Frases';
      // Solo frases con ≥2 bloques tienen "buildup"; se presentan en el orden del JSON
      cola = (d.frases || []).filter(function(f){ return (f.bloques || []).length >= 2; });
      if(cola.length === 0){
        document.querySelector('.escena').innerHTML =
          '<p class="error-carga">No hay frases con suficientes piezas para practicar.</p>';
        return;
      }
      iniciarFrase(0);
    })
    .catch(function(){
      document.querySelector('.escena').innerHTML =
        '<p class="error-carga">No se pudieron cargar las frases. Revisa tu conexión.</p>';
    });

  function iniciarFrase(i){
    oIdx = i; frase = cola[i]; bloques = frase.bloques || []; paso = 0;
    mostrarPaso();
  }

  function mostrarPaso(){
    var n      = bloques.length;
    var desde  = n - 1 - paso;                 // paso 0 → último; crece hacia el inicio
    var porcion = bloques.slice(desde);        // [b(desde) … bn] en orden natural
    var esUltimo = (paso === n - 1);

    elCierre.classList.add('oculto');
    elWrap.classList.remove('oculto');
    elBadge.textContent = 'Frase ' + (oIdx + 1) + ' de ' + cola.length;
    elProg.textContent  = 'Parte ' + (paso + 1) + ' de ' + n;
    elTexto.textContent = porcion.map(function(b){ return b.gu; }).join(' ');
    btnSig.textContent  = esUltimo ? 'Ver la frase completa →' : 'Siguiente →';

    reproducirPorcion(porcion);
  }

  function reproducirPorcion(porcion){
    if(seq){ seq.cancelar(); }
    var srcs = porcion.map(function(b){ return b.audio; });
    seq = Frases.secuencia(srcs, {});
  }

  function siguiente(){
    if(paso < bloques.length - 1){ paso++; mostrarPaso(); }
    else mostrarCierre();
  }

  function mostrarCierre(){
    if(seq){ seq.cancelar(); }
    elWrap.classList.add('oculto');
    elCierre.classList.remove('oculto');
    elCieGu.textContent  = frase.gu || '';
    elCieRom.textContent = Frases.util(frase.rom) ? frase.rom : '';
    elCieEs.textContent  = frase.es || '';
    var esUltimaFrase = (oIdx === cola.length - 1);
    btnCie.textContent = esUltimaFrase ? '✓ Terminar' : 'Siguiente frase →';
    Frases.audio(frase.audio);   // la frase entera, con su audio natural
  }

  function siguienteFrase(){
    if(oIdx < cola.length - 1) iniciarFrase(oIdx + 1);
    else Frases.volver('frases_hub.html' + location.search);
  }

  btnEsc.addEventListener('click', function(){
    var n = bloques.length, desde = n - 1 - paso;
    reproducirPorcion(bloques.slice(desde));
  });
  btnSig.addEventListener('click', siguiente);
  btnCie.addEventListener('click', siguienteFrase);

  Frases.checarVersion();
})();
