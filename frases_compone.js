/* ============================================================
   frases_compone.js — Modo 2: Componer.
   Muestra el español de la frase; el alumno ordena los bloques
   (barajados + distractores de otras frases) para reconstruirla.
   Valida el orden exacto. Usa `Frases` y `FrasesChips`.
   ============================================================ */
(function(){
  var data        = null;
  var cola        = [];
  var actual      = null;
  var bancoGlobal = [];
  var ctrl        = null;
  var score       = 0;
  var resolviendo = false;   // evita doble toque en "Comprobar" mientras se muestra el resultado

  var elCat   = document.getElementById('cat');
  var elEs    = document.getElementById('pista-es');
  var elBanco = document.getElementById('banco');
  var elConst = document.getElementById('construccion');
  var elFb    = document.getElementById('feedback');
  var elScore = document.getElementById('score');
  var btnOir  = document.getElementById('btn-oir');
  var btnLimp = document.getElementById('btn-limpiar');
  var btnComp = document.getElementById('btn-comprobar');

  Frases.cargar()
    .then(function(d){
      data = d;
      document.getElementById('page-title').textContent = (d.categoria || 'Frases') + ' · Componer';
      elCat.textContent = d.categoria || 'Frases';
      // Banco global de bloques (fuente de distractores)
      bancoGlobal = [];
      (d.frases || []).forEach(function(f){ (f.bloques || []).forEach(function(b){ bancoGlobal.push(b); }); });
      // Solo frases con al menos 2 bloques tienen sentido para ordenar
      cola = Frases.shuffle((d.frases || []).filter(function(f){ return (f.bloques || []).length >= 2; }));
      nuevaRonda();
    })
    .catch(function(){
      document.querySelector('.escena').innerHTML =
        '<p class="error-carga">No se pudieron cargar las frases. Revisa tu conexión.</p>';
    });

  function nuevaRonda(){
    actual = cola.shift();
    if(!actual){ terminar(); return; }

    elFb.textContent = ''; elFb.className = 'feedback';
    elEs.textContent = actual.es || '—';

    var correctas = actual.bloques || [];
    var piezas    = FrasesChips.sopa(correctas, bancoGlobal, 2, 4);
    ctrl = FrasesChips.crear({
      banco:        elBanco,
      construccion: elConst,
      piezas:       piezas,
      onTocar:      function(p){ Frases.audio(p.audio); }
    });
  }

  function comprobar(){
    if(!ctrl || !actual || resolviendo) return;
    var intento  = ctrl.construidoGu();
    if(intento.length === 0) return;
    var correcto = (actual.bloques || []).map(function(b){ return b.gu; });

    var igual = intento.length === correcto.length &&
                intento.every(function(g, i){ return g === correcto[i]; });

    resolviendo = true;
    if(igual){
      elFb.textContent = '✓ ¡Correcto!';
      elFb.className   = 'feedback ok';
      score++; elScore.textContent = score;
      ctrl.bloquear(true);
      setTimeout(function(){ resolviendo = false; nuevaRonda(); }, 1600);
    }else{
      elFb.textContent = '✗ Ese no es el orden. Inténtalo otra vez.';
      elFb.className   = 'feedback err';
      // Bloquea los chips mientras se ve el error: si no, la limpieza
      // de abajo borraba el intento nuevo que el alumno ya empezaba.
      ctrl.bloquear(true);
      setTimeout(function(){
        if(ctrl){ ctrl.limpiar(); ctrl.bloquear(false); elFb.textContent = ''; elFb.className = 'feedback'; }
        resolviendo = false;
      }, 1300);
    }
  }

  function terminar(){
    elEs.textContent = '';
    elBanco.innerHTML = '';
    elConst.innerHTML = '';
    elConst.classList.add('vacia');
    elFb.textContent = '¡Compusiste todas las frases! 🎉';
    elFb.className   = 'feedback ok';
    btnComp.textContent = 'Volver';
    ctrl = null;
    btnComp.onclick = function(){ Frases.volver('frases_hub.html' + location.search); };
    btnLimp.classList.add('oculto');
    btnOir.classList.add('oculto');
  }

  btnOir.addEventListener('click',  function(){ if(actual) Frases.audio(actual.audio); });
  btnLimp.addEventListener('click', function(){ if(ctrl) ctrl.limpiar(); });
  btnComp.addEventListener('click', comprobar);

  Frases.checarVersion();
})();
