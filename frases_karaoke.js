/* ============================================================
   frases_karaoke.js — Modo 5: Lectura guiada (karaoke).
   Reproduce la frase encadenando el audio de cada bloque y resalta
   la pieza que suena. Tocar una pieza la repite. Toggle de velocidad
   (1× / 0.75×) y de subtítulos en español. Usa `Frases` (secuencia()).
   (Ideas tomadas de tu lectura.js: resaltado + tap-to-seek + velocidad
   + subtítulos; adaptado a "audio por bloque" en vez de timestamps.)
   ============================================================ */
(function(){
  var data      = null;
  var cola      = [];
  var idx       = 0;
  var frase     = null;
  var bloques   = [];
  var seq       = null;
  var velocidad = 1;       // 1 = normal, 0.75 = lento
  var verEs     = true;

  var elCat   = document.getElementById('cat');
  var elFrase = document.getElementById('kfrase');
  var elTrad  = document.getElementById('ktrad');
  var elCont  = document.getElementById('contador');
  var btnRep  = document.getElementById('btn-repro');
  var tgVel   = document.getElementById('tg-vel');
  var tgEs    = document.getElementById('tg-es');
  var btnAnt  = document.getElementById('btn-ant');
  var btnSig  = document.getElementById('btn-sig');

  Frases.cargar()
    .then(function(d){
      data = d;
      document.getElementById('page-title').textContent = (d.categoria || 'Frases') + ' · Lectura guiada';
      elCat.textContent = d.categoria || 'Frases';
      cola = d.frases || [];                 // en orden del JSON (es lectura, no quiz)
      render();
    })
    .catch(function(){
      document.querySelector('.escena').innerHTML =
        '<p class="error-carga">No se pudieron cargar las frases. Revisa tu conexión.</p>';
    });

  function render(){
    if(seq){ seq.cancelar(); seq = null; }
    frase   = cola[idx];
    bloques = frase.bloques || [];

    var html = '';
    bloques.forEach(function(b, i){
      html += '<button class="kbloque" data-i="' + i + '">';
      html +=   '<span class="kgu" lang="gu">' + (b.gu || '') + '</span>';
      if(Frases.util(b.rom)) html += '<span class="krom">' + b.rom + '</span>';
      html += '</button>';
    });
    elFrase.innerHTML = html;
    elTrad.textContent = frase.es || '\u00a0';   // por defecto muestra el español de la frase entera
    aplicarVerEs();

    elCont.textContent = (idx + 1) + ' / ' + cola.length;
    btnAnt.disabled = (idx === 0);
    btnSig.disabled = (idx === cola.length - 1);

    // Clic en cada pieza → repetir esa pieza
    elFrase.querySelectorAll('.kbloque').forEach(function(el){
      el.addEventListener('click', function(){ reproducirBloque(parseInt(el.dataset.i, 10)); });
    });
  }

  var finTimer = null;   // limpieza diferida de la reproducción anterior

  function reproducirTodo(){
    if(seq){ seq.cancelar(); }
    clearTimeout(finTimer);   // si no, el timer de la anterior apagaba el resaltado nuevo
    limpiarActivo();
    var srcs = bloques.map(function(b){ return b.audio; });
    seq = Frases.secuencia(srcs, {
      velocidad: velocidad,
      onInicio:  function(i){ activar(i); },
      onFin:     function(){ finTimer = setTimeout(function(){ limpiarActivo(); elTrad.textContent = frase.es || '\u00a0'; }, 500); }
    });
  }

  function reproducirBloque(i){
    if(seq){ seq.cancelar(); }
    clearTimeout(finTimer);
    activar(i);
    seq = Frases.secuencia([bloques[i].audio], {
      velocidad: velocidad,
      // al terminar la pieza vuelve el subtítulo de la frase entera
      onFin: function(){ finTimer = setTimeout(function(){ limpiarActivo(); elTrad.textContent = frase.es || '\u00a0'; }, 500); }
    });
  }

  function activar(i){
    limpiarActivo();
    var el = elFrase.querySelector('.kbloque[data-i="' + i + '"]');
    if(el) el.classList.add('activo');
    var b = bloques[i];
    if(b && b.es) elTrad.textContent = b.es;   // subtítulo de la pieza que suena
  }

  function limpiarActivo(){
    elFrase.querySelectorAll('.kbloque.activo').forEach(function(e){ e.classList.remove('activo'); });
  }

  function aplicarVerEs(){
    if(verEs) elTrad.classList.remove('invisible');
    else      elTrad.classList.add('invisible');
  }

  btnRep.addEventListener('click', reproducirTodo);
  tgVel.addEventListener('click', function(){
    velocidad = (velocidad === 1) ? 0.75 : 1;
    tgVel.classList.toggle('activo', velocidad !== 1);
  });
  tgEs.addEventListener('click', function(){
    verEs = !verEs;
    tgEs.classList.toggle('activo', verEs);
    aplicarVerEs();
  });
  btnAnt.addEventListener('click', function(){ if(idx > 0){ idx--; render(); } });
  btnSig.addEventListener('click', function(){ if(idx < cola.length - 1){ idx++; render(); } });

  Frases.checarVersion();
})();
