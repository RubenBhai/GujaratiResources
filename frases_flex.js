/* ============================================================
   frases_flex.js — Modo 8: Adapta la frase.
   Parte de la frase base y deja sustituir los bloques que tienen
   variantes (mismas por `id`). "Escuchar mi versión" encadena los
   audios de los bloques actuales; "Frase original" reproduce el
   audio completo natural. Exploración libre. Usa `Frases`.
   (Idea del generador, pero anclada a la frase y sin columnas.)
   ============================================================ */
(function(){
  var data    = null;
  var cola    = [];
  var idx     = 0;
  var frase   = null;
  var elegido = {};   // id de bloque → opción activa { gu, rom, es, audio, img }

  var elFrase = document.getElementById('flex-frase');
  var elCat   = document.getElementById('cat');
  var elCont  = document.getElementById('contador');
  var overlay = document.getElementById('flex-overlay');
  var elOps   = document.getElementById('flex-opciones');

  Frases.cargar()
    .then(function(d){
      data = d;
      document.getElementById('page-title').textContent = (d.categoria || 'Frases') + ' · Adapta la frase';
      elCat.textContent = d.categoria || 'Frases';
      cola = (d.frases || []);
      render();
    })
    .catch(function(){
      document.querySelector('.escena').innerHTML =
        '<p class="error-carga">No se pudieron cargar las frases. Revisa tu conexión.</p>';
    });

  function bloquePorId(id){
    var b = (frase.bloques || []).filter(function(x){ return x.id === id; });
    return b[0];
  }
  function subsDe(id){
    return (frase.sustituciones || []).filter(function(s){ return s.id === id; });
  }
  function tieneSubs(id){ return subsDe(id).length > 0; }
  function opcionesDe(b){
    var orig = { gu:b.gu, rom:b.rom, es:b.es, audio:b.audio, img:b.img, orden:b.orden, _orig:true };
    var subs = subsDe(b.id).map(function(s){
      return {
        gu:s.gu, rom:s.rom, es:s.es, audio:s.audio, img:s.img, s_id:s.s_id,
        orden: (s.orden !== undefined && s.orden !== null && s.orden !== '') ? s.orden : b.orden
      };
    });
    return [orig].concat(subs);
  }

  /* Traducción natural: concatena el `es` de los bloques actuales, ordenados
     por `orden` (los sin orden van al final), y capitaliza la 1ª palabra. */
  function armarTraduccion(){
    var items = (frase.bloques || []).map(function(b, i){
      var e = elegido[b.id] || {};
      var o = (e.orden !== undefined && e.orden !== null && e.orden !== '') ? Number(e.orden) : Infinity;
      return { es:e.es || '', o:o, i:i };
    });
    items.sort(function(a, b){ var d = a.o - b.o; return d !== 0 ? d : (a.i - b.i); });
    var texto = items.map(function(x){ return x.es; }).filter(Boolean).join(' ');
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '';
  }

  function render(){
    Frases.detener();   // al cambiar de frase, corta la versión que esté sonando
    frase = cola[idx];
    elegido = {};
    (frase.bloques || []).forEach(function(b){
      elegido[b.id] = { gu:b.gu, rom:b.rom, es:b.es, audio:b.audio, img:b.img, orden:b.orden };
    });
    elCont.textContent = (idx + 1) + ' / ' + cola.length;
    document.getElementById('btn-ant').disabled = (idx === 0);
    document.getElementById('btn-sig').disabled = (idx === cola.length - 1);
    pintarFrase();
  }

  function pintarFrase(){
    var html = '';
    (frase.bloques || []).forEach(function(b){
      var actual = elegido[b.id];
      var inter  = tieneSubs(b.id);
      html += '<button class="flex-bloque' + (inter ? ' inter' : '') + '" data-id="' + b.id + '">';
      html +=   '<span class="fb-linea"><span class="fb-gu gu" lang="gu">' + (actual.gu || '') + '</span>';
      if(inter) html += '<span class="fb-mark">⇄</span>';
      html +=   '</span>';
      if(actual.es) html += '<span class="fb-es">' + actual.es + '</span>';
      html += '</button>';
    });
    elFrase.innerHTML = html;
    document.getElementById('flex-trad').textContent = armarTraduccion();

    elFrase.querySelectorAll('.flex-bloque').forEach(function(el){
      var id = el.dataset.id;
      el.addEventListener('click', function(){
        Frases.audio(elegido[id].audio);          // suena la pieza actual
        if(tieneSubs(id)) abrirPanel(bloquePorId(id));
      });
    });
  }

  function abrirPanel(b){
    var ops = opcionesDe(b);
    var html = '';
    ops.forEach(function(op, i){
      var sel = (elegido[b.id].gu === op.gu);
      html += '<button class="flex-op' + (sel ? ' sel' : '') + '" data-i="' + i + '">';
      if(op.img) html += '<img class="flex-op-img" src="' + op.img + '" alt="">';
      html +=   '<span class="flex-op-gu gu" lang="gu">' + (op.gu || '') + '</span>';
      if(op.es)    html += '<span class="flex-op-es">' + op.es + '</span>';
      if(op._orig) html += '<span class="flex-op-tag">original</span>';
      html += '</button>';
    });
    elOps.innerHTML = html;

    elOps.querySelectorAll('.flex-op').forEach(function(el){
      var op = ops[parseInt(el.dataset.i, 10)];
      el.addEventListener('click', function(){
        elegido[b.id] = { gu:op.gu, rom:op.rom, es:op.es, audio:op.audio, img:op.img, orden:op.orden };
        Frases.audio(op.audio);
        cerrarPanel();
        pintarFrase();
      });
      el.querySelectorAll('.flex-op-img').forEach(function(img){
        img.addEventListener('error', function(){ img.classList.add('oculto'); });
      });
    });

    overlay.classList.remove('oculto');
  }
  function cerrarPanel(){ overlay.classList.add('oculto'); }

  function escucharMiVersion(){
    var srcs = (frase.bloques || []).map(function(b){ return elegido[b.id].audio; });
    Frases.secuencia(srcs, {});
  }

  document.getElementById('btn-mi-version').addEventListener('click', escucharMiVersion);
  document.getElementById('btn-original').addEventListener('click', function(){ Frases.audio(frase.audio); });
  document.getElementById('flex-cerrar').addEventListener('click', cerrarPanel);
  overlay.addEventListener('click', function(e){ if(e.target === overlay) cerrarPanel(); });
  document.getElementById('btn-ant').addEventListener('click', function(){ if(idx > 0){ idx--; render(); } });
  document.getElementById('btn-sig').addEventListener('click', function(){ if(idx < cola.length - 1){ idx++; render(); } });

  Frases.checarVersion();
})();
