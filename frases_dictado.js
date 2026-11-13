/* ============================================================
   frases_dictado.js — Modo 3: Dictado.
   Reproduce el audio de la frase; el alumno la reconstruye de oído
   ordenando los bloques (con distractores). Al acertar revela la
   frase (gujarati + rom + español) y repite el audio. Al fallar:
   reintentar o saltar. Reusa `Frases` y `FrasesChips`.
   (Mecánica basada en tu dictado.js del nivel 4 de reto.)
   ============================================================ */
(function(){
  var data        = null;
  var cola        = [];
  var actual      = null;
  var bancoGlobal = [];
  var ctrl        = null;
  var score       = 0;

  var elCat    = document.getElementById('cat');
  var elBanco  = document.getElementById('banco');
  var elConst  = document.getElementById('construccion');
  var elFb     = document.getElementById('feedback');
  var elScore  = document.getElementById('score');
  var elRev    = document.getElementById('revelacion');
  var elRevGu  = document.getElementById('rev-gu');
  var elRevRom = document.getElementById('rev-rom');
  var elRevEs  = document.getElementById('rev-es');
  var accComp  = document.getElementById('acciones-comprobar');
  var accFallo = document.getElementById('acciones-fallo');
  var btnEsc   = document.getElementById('btn-escuchar');
  var btnLimp  = document.getElementById('btn-limpiar');
  var btnComp  = document.getElementById('btn-comprobar');
  var btnRe    = document.getElementById('btn-reintentar');
  var btnSalt  = document.getElementById('btn-saltar');

  Frases.cargar()
    .then(function(d){
      data = d;
      document.getElementById('page-title').textContent = (d.categoria || 'Frases') + ' · Dictado';
      elCat.textContent = d.categoria || 'Frases';
      bancoGlobal = [];
      (d.frases || []).forEach(function(f){ (f.bloques || []).forEach(function(b){ bancoGlobal.push(b); }); });
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
    elRev.classList.add('oculto');
    accComp.classList.remove('oculto');
    accFallo.classList.add('oculto');

    var correctas = actual.bloques || [];
    var piezas    = FrasesChips.sopa(correctas, bancoGlobal, 2, 3);
    ctrl = FrasesChips.crear({
      banco:        elBanco,
      construccion: elConst,
      piezas:       piezas,
      onTocar:      function(p){ Frases.audio(p.audio); }
    });

    setTimeout(reproducirFrase, 400);   // el audio se oye solo al empezar
  }

  function reproducirFrase(){ if(actual) Frases.audio(actual.audio); }

  function comprobar(){
    if(!ctrl || !actual) return;
    var intento = ctrl.construidoGu();
    if(intento.length === 0) return;
    var correcto = (actual.bloques || []).map(function(b){ return b.gu; });

    var igual = intento.length === correcto.length &&
                intento.every(function(g, i){ return g === correcto[i]; });

    if(igual){
      ctrl.bloquear(true);
      accComp.classList.add('oculto');   // evita doble toque en "Comprobar" (nuevaRonda lo vuelve a mostrar)
      elFb.textContent = ''; elFb.className = 'feedback';
      elRevGu.textContent  = actual.gu || '';
      elRevRom.textContent = Frases.util(actual.rom) ? actual.rom : '';
      elRevEs.textContent  = actual.es || '';
      elRev.classList.remove('oculto');
      score++; elScore.textContent = score;
      setTimeout(reproducirFrase, 650);   // repite el audio como refuerzo
      setTimeout(nuevaRonda, 2400);
    }else{
      ctrl.bloquear(true);
      elFb.textContent = '✗ No es lo que dice el audio';
      elFb.className   = 'feedback err';
      accComp.classList.add('oculto');
      accFallo.classList.remove('oculto');
    }
  }

  function reintentar(){
    if(ctrl){ ctrl.limpiar(); ctrl.bloquear(false); }
    elFb.textContent = ''; elFb.className = 'feedback';
    accFallo.classList.add('oculto');
    accComp.classList.remove('oculto');
    setTimeout(reproducirFrase, 300);
  }

  function terminar(){
    elBanco.innerHTML = '';
    elConst.innerHTML = ''; elConst.classList.add('vacia');
    accComp.classList.add('oculto');
    accFallo.classList.add('oculto');
    btnEsc.classList.add('oculto');
    elRev.classList.add('oculto');
    elFb.textContent = '¡Terminaste el dictado! 🎉';
    elFb.className   = 'feedback ok';
  }

  btnEsc.addEventListener('click',  reproducirFrase);
  btnLimp.addEventListener('click', function(){ if(ctrl) ctrl.limpiar(); });
  btnComp.addEventListener('click', comprobar);
  btnRe.addEventListener('click',   reintentar);
  btnSalt.addEventListener('click', nuevaRonda);

  Frases.checarVersion();
})();
