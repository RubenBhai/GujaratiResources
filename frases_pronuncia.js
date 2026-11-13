/* ============================================================
   frases_pronuncia.js — Modo 7: Pronunciación.
   Por cada frase: escuchar el audio maestro (con velocidades),
   grabarse diciéndola y recibir de Gemini una nota + transcripción
   + consejo; y poder escucharse. Usa `Frases` y `FrasesGemini`.
   (Flujo basado en tu practica.js.)
   ============================================================ */
(function(){
  var data      = null;
  var cola      = [];
  var idx       = 0;
  var velocidad = 1;
  var urlGrabada = null;
  var ronda     = 0;   // sube en cada render: descarta callbacks de una frase anterior

  var master = document.getElementById('master');
  var self   = document.getElementById('self');
  var card   = document.getElementById('pron-card');

  Frases.cargar()
    .then(function(d){
      data = d;
      document.getElementById('page-title').textContent = (d.categoria || 'Frases') + ' · Pronunciación';
      document.getElementById('cat').textContent = d.categoria || 'Frases';
      cola = d.frases || [];
      render();
    })
    .catch(function(){
      document.querySelector('.escena').innerHTML =
        '<p class="error-carga">No se pudieron cargar las frases. Revisa tu conexión.</p>';
    });

  function render(){
    var f = cola[idx];
    var U = Frases.util;
    urlGrabada = null;
    // Al cambiar de frase: corta la grabación anterior (sin evaluarla) y
    // apaga el micrófono; si no, se evaluaba la frase vieja en la nueva.
    FrasesGemini.cancelar();
    ronda++;
    try{ master.pause(); self.pause(); }catch(e){}

    var html = '';
    html += '<div class="frase">';
    html +=   '<div class="frase-gu" lang="gu">' + (f.gu || '') + '</div>';
    if(U(f.rom)) html += '<div class="frase-rom">' + f.rom + '</div>';
    if(f.es)     html += '<div class="frase-es">' + f.es + '</div>';
    html += '</div>';

    html += '<div class="pron-speeds">';
    html +=   '<button class="k-toggle spd" data-s="0.75">🐢 0.75×</button>';
    html +=   '<button class="k-toggle spd activo" data-s="1">▶ 1×</button>';
    html +=   '<button class="k-toggle spd" data-s="1.25">⚡ 1.25×</button>';
    html += '</div>';

    html += '<div class="pron-acciones">';
    html +=   '<button class="btn-chip-sec"  id="p-escuchar">🔊 Escuchar</button>';
    html +=   '<button class="btn-chip-main" id="p-grabar">🎙️ Practicar</button>';
    html +=   '<button class="btn-chip-sec"  id="p-escucharme" disabled>🎧 Escucharme</button>';
    html += '</div>';

    html += '<div class="pron-spinner invisible" id="p-spinner">✨ Evaluando…</div>';
    html += '<div class="pron-eval oculto" id="p-eval">';
    html +=   '<p class="eval-nota"    id="p-nota"></p>';
    html +=   '<p class="eval-trans"   id="p-trans"></p>';
    html +=   '<p class="eval-consejo" id="p-consejo"></p>';
    html += '</div>';

    html += '<div class="nav-frases">';
    html +=   '<button class="nav-frase-btn" id="btn-ant"' + (idx === 0 ? ' disabled' : '') + '>← Anterior</button>';
    html +=   '<span class="nav-contador">' + (idx + 1) + ' / ' + cola.length + '</span>';
    html +=   '<button class="nav-frase-btn" id="btn-sig"' + (idx === cola.length - 1 ? ' disabled' : '') + '>Siguiente →</button>';
    html += '</div>';

    card.innerHTML = html;
    enlazar(f);
  }

  function $(id){ return document.getElementById(id); }

  function enlazar(f){
    var miRonda = ronda;
    function vigente(){ return miRonda === ronda; }
    card.querySelectorAll('.spd').forEach(function(b){
      b.addEventListener('click', function(){
        velocidad = parseFloat(b.dataset.s);
        card.querySelectorAll('.spd').forEach(function(x){ x.classList.remove('activo'); });
        b.classList.add('activo');
        master.playbackRate = velocidad;
      });
    });

    $('p-escuchar').addEventListener('click', function(){
      // iOS: play() debe llamarse dentro del toque (no en onloadedmetadata).
      // defaultPlaybackRate sobrevive a la carga del src; playbackRate no.
      if(master.getAttribute('src') !== f.audio){ master.src = f.audio; }
      master.defaultPlaybackRate = velocidad;
      master.playbackRate = velocidad;
      try{ master.currentTime = 0; }catch(e){}
      master.play().catch(function(){});
    });

    var btnGrabar = $('p-grabar');
    btnGrabar.addEventListener('click', function(){
      FrasesGemini.alternar(f.gu, {
        onInicio:  function(){ if(!vigente()) return; btnGrabar.textContent = '🛑 Detener'; btnGrabar.classList.add('grabando'); },
        onDetener: function(){ if(!vigente()) return; btnGrabar.textContent = '🎙️ Practicar'; btnGrabar.classList.remove('grabando'); },
        onAudio:   function(url){ if(!vigente()) return; urlGrabada = url; $('p-escucharme').removeAttribute('disabled'); },
        onEvaluando: function(){ if(!vigente()) return; $('p-spinner').classList.remove('invisible'); $('p-eval').classList.add('oculto'); },
        onResultado: function(dataR){
          if(!vigente()) return;   // la nota llegó tarde: el alumno ya está en otra frase
          $('p-spinner').classList.add('invisible');
          $('p-nota').textContent    = '⭐ Nota: ' + dataR.nota + '/10';
          $('p-trans').textContent   = 'Gemini entendió: "' + dataR.transcripcion + '"';
          $('p-consejo').textContent = '💡 ' + dataR.consejo;
          $('p-nota').classList.toggle('nota-alta', dataR.nota >= 7);
          $('p-nota').classList.toggle('nota-baja', dataR.nota < 7);
          $('p-eval').classList.remove('oculto');
        },
        onError: function(tipo){
          if(!vigente()) return;
          $('p-spinner').classList.add('invisible');
          if(tipo === 'microfono') alert('Revisa los permisos del micrófono en tu dispositivo.');
          else if(tipo === 'soporte') alert('Tu navegador no permite grabar audio aquí. Prueba con Safari o Chrome actualizados.');
          else if(tipo === 'auth') alert('Para recibir la nota necesitas iniciar sesión.');
          else alert('Hubo un detalle al recibir la nota de Gemini. Inténtalo de nuevo.');
        }
      });
    });

    $('p-escucharme').addEventListener('click', function(){
      if(urlGrabada){ self.src = urlGrabada; self.load(); self.play().catch(function(){}); }
    });

    var ant = $('btn-ant'), sig = $('btn-sig');
    if(ant) ant.addEventListener('click', function(){ if(idx > 0){ idx--; render(); arriba(); } });
    if(sig) sig.addEventListener('click', function(){ if(idx < cola.length - 1){ idx++; render(); arriba(); } });
  }

  function arriba(){ window.scrollTo({ top:0, behavior:'smooth' }); }

  Frases.checarVersion();
})();
