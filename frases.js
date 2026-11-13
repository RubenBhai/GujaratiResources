(function(){
  var params   = new URLSearchParams(location.search);
  var set      = params.get('set') || 'predicar';
  var JSON_URL = 'data/frases/frases_' + set + '.json';

  var escena = document.getElementById('escena');
  var idx    = parseInt(params.get('f'), 10);
  if(isNaN(idx)) idx = 0;

  var data = null;
  var audioActual = null;

  fetch(JSON_URL + '?t=' + Date.now(), { cache:'no-store' })
    .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
    .then(function(d){
      data = d;
      document.getElementById('page-title').textContent = (d.categoria || 'Frases') + ' · Piensa en Gujarati';
      if(idx < 0) idx = 0;
      if(idx >= d.frases.length) idx = d.frases.length - 1;
      render();
    })
    .catch(function(){
      escena.innerHTML = '<p class="error-carga">No se pudieron cargar las frases. Revisa tu conexión.</p>';
    });

  /* Muestra un campo solo si trae contenido real (ignora los placeholders "…") */
  function util(v){ return v && v !== '…'; }

  function render(){
    var f = data.frases[idx];
    var total = data.frases.length;
    var b = f.bloques || [];
    var html = '';

    html += '<div class="eyebrow"><span class="punto"></span>' + (data.categoria || 'Frases') + '</div>';

    html += '<div class="frase">';
    html +=   '<div class="frase-gu">' + (f.gu || '') + '</div>';
    if(util(f.rom)) html += '<div class="frase-rom">' + f.rom + '</div>';
    if(f.es)        html += '<div class="frase-es">' + f.es + '</div>';
    if(f.audio)     html += '<button class="btn-audio" data-audio="' + f.audio + '"><span class="ico">▶</span> Escuchar la frase</button>';
    html += '</div>';

    if(b.length){
      html += '<div class="divisor">Pieza por pieza</div>';
      html += '<p class="hint">Toca una pieza para escucharla.</p>';
      html += '<div class="bloques">';
      b.forEach(function(bl, i){
        html += '<div class="bloque" data-audio="' + (bl.audio || '') + '">';
        html +=   '<span class="bloque-num">' + (i + 1) + '</span>';
        if(bl.img)      html += '<img class="bloque-img" src="' + bl.img + '" alt="">';
        html +=   '<span class="bloque-gu">' + (bl.gu || '') + '</span>';
        if(util(bl.rom)) html += '<span class="bloque-rom">' + bl.rom + '</span>';
        if(bl.es)        html += '<span class="bloque-es">' + bl.es + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    html += '<div class="nav-frases">';
    html +=   '<button class="nav-frase-btn" id="btn-ant"' + (idx === 0 ? ' disabled' : '') + '>← Anterior</button>';
    html +=   '<span class="nav-contador">' + (idx + 1) + ' / ' + total + '</span>';
    html +=   '<button class="nav-frase-btn" id="btn-sig"' + (idx === total - 1 ? ' disabled' : '') + '>Siguiente →</button>';
    html += '</div>';

    escena.innerHTML = html;
    enlazar();
  }

  function enlazar(){
    // Audio (frase y piezas)
    escena.querySelectorAll('[data-audio]').forEach(function(el){
      el.addEventListener('click', function(){
        var src = el.getAttribute('data-audio');
        if(!util(src)) return;
        reproducir(src, el);
      });
    });
    // Imágenes que no existan aún: se ocultan sin romper el layout
    escena.querySelectorAll('.bloque-img').forEach(function(img){
      img.addEventListener('error', function(){ img.classList.add('oculto'); });
    });
    // Navegación entre frases
    var ant = document.getElementById('btn-ant');
    var sig = document.getElementById('btn-sig');
    if(ant) ant.addEventListener('click', function(){ if(idx > 0){ idx--; render(); arriba(); } });
    if(sig) sig.addEventListener('click', function(){ if(idx < data.frases.length - 1){ idx++; render(); arriba(); } });
  }

  function reproducir(src, el){
    try{
      if(audioActual){ audioActual.pause(); }
      audioActual = new Audio(src);
      audioActual.play().catch(function(){});
    }catch(e){}
    if(el && el.classList.contains('bloque')){
      escena.querySelectorAll('.bloque.suena').forEach(function(x){ x.classList.remove('suena'); });
      el.classList.add('suena');
      setTimeout(function(){ el.classList.remove('suena'); }, 900);
    }
  }

  function arriba(){ window.scrollTo({ top:0, behavior:'smooth' }); }
})();
