/* ── Preload: muestra la página solo cuando imagen y música estén listos ── */
(function(){
  document.body.style.opacity    = '0';
  document.body.style.transition = 'opacity 0.5s ease';
  // Solo la imagen: la música es preload="none" y por defecto está apagada;
  // precargarla bajaba el mp3 entero (varios MB) en cada visita.
  var ASSETS = [
    'imagenes/LearnGujarati_SuperInmersivo_Main.jpg'
  ];
  var cargados = 0, mostrado = false;
  var timeout  = setTimeout(mostrar, 3000);
  function mostrar(){
    if(mostrado) return;
    mostrado = true;
    clearTimeout(timeout);
    document.body.style.opacity = '1';
  }
  ASSETS.forEach(function(url){
    fetch(url, { cache: 'default' })
      .then(function(){ cargados++; if(cargados >= ASSETS.length) mostrar(); })
      .catch(function(){ cargados++; if(cargados >= ASSETS.length) mostrar(); });
  });
})();

/* ── Progreso del curso ── */
var TOTAL_LECCIONES = 97;

function calcularProgreso(){
  var completadas = 0;
  for(var i = 0; i < localStorage.length; i++){
    var clave = localStorage.key(i);
    if(clave && clave.indexOf('leccion_') === 0 && localStorage.getItem(clave) === 'completada'){
      completadas++;
    }
  }

  var pct = Math.round((completadas / TOTAL_LECCIONES) * 1000) / 10;
  if(pct < 1 && completadas > 0) pct = 1;

  setTimeout(function(){
    var fill = document.querySelector('.progress-fill');
    if(fill) fill.style.width = pct + '%';
  }, 100);

  var labels = document.querySelectorAll('.progress-label span');
  if(labels.length >= 2){
    labels[0].textContent = 'Tu progreso';
    labels[1].textContent = completadas + ' de ' + TOTAL_LECCIONES + ' lecciones';
  }

  document.querySelectorAll('.leccion[data-leccion]').forEach(function(el){
    var id = el.getAttribute('data-leccion');
    if(localStorage.getItem('leccion_' + id) === 'completada'){
      var status = el.querySelector('.lec-status');
      if(status){ status.className = 'lec-status check'; status.innerHTML = '✔'; }
    }
  });
}

calcularProgreso();

/* ── Botón de música ── */
(function(){
  var music = document.getElementById('bgMusic');
  var btn   = document.getElementById('musicToggle');
  music.volume  = 0.0;
  var TARGET_VOL = 0.35;
  var fadeTimer  = null;
  var playing    = false;

  function fadeTo(target){
    if(fadeTimer) clearInterval(fadeTimer);
    fadeTimer = setInterval(function(){
      var diff = target - music.volume;
      if(Math.abs(diff) < 0.02){
        music.volume = target;
        clearInterval(fadeTimer);
        if(target === 0) music.pause();
      } else {
        var antes = music.volume;
        music.volume += diff * 0.1;
        // iOS: volume es de solo lectura (siempre 1); si no cambia, se corta
        // el fundido para no dejar el intervalo corriendo para siempre.
        if(music.volume === antes){
          clearInterval(fadeTimer);
          if(target === 0) music.pause();
        }
      }
    }, 50);
  }

  window.toggleMusic = function(){
    if(playing){
      playing = false;
      btn.innerHTML = '&#128263;';
      btn.classList.add('music-off');
      fadeTo(0);
      setTimeout(function(){ if(!playing){ music.pause(); music.volume = 0; } }, 600);
      try { localStorage.setItem('musica_pref', 'off'); } catch(e) {}
    } else {
      playing = true;
      btn.innerHTML = '🔊';
      btn.classList.remove('music-off'); // vuelve al color del CSS base
      music.play().then(function(){ fadeTo(TARGET_VOL); }).catch(function(){});
      try { localStorage.setItem('musica_pref', 'on'); } catch(e) {}
    }
  };

  var pref = 'off';
  try { pref = localStorage.getItem('musica_pref') || 'off'; } catch(e) {}
  if(pref === 'on'){
    var resume = function(){
      if(!playing){
        playing = true;
        btn.innerHTML = '🔊';
        btn.classList.remove('music-off');
        music.play().then(function(){ fadeTo(TARGET_VOL); }).catch(function(){});
      }
      document.removeEventListener('click', resume);
      document.removeEventListener('touchstart', resume);
    };
    document.addEventListener('click', resume);
    document.addEventListener('touchstart', resume);
  }

  // Pausar al pasar a segundo plano; reanudar al volver (igual que index.js)
  document.addEventListener('visibilitychange', function(){
    if(document.hidden){
      if(!music.paused) music.pause();
    } else if(playing && music.paused){
      music.play().then(function(){ fadeTo(TARGET_VOL); }).catch(function(){});
    }
  });
})();

/* ── Verificador de versión ── */
(function(){
  var VERSION_URL = 'version.txt';
  fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(function(serverV){
      serverV = serverV.trim();
      if(!serverV || serverV.length > 20) return;   // respuesta rara (p.ej. una página 404): no recargar
      var localV = null;
      try { localV = localStorage.getItem('appVersion'); } catch(e) {}
      if(localV === null){
        try { localStorage.setItem('appVersion', serverV); } catch(e) {}
      } else if(localV !== serverV){
        try { localStorage.setItem('appVersion', serverV); } catch(e) {}
        location.reload(true);
      }
    })
    .catch(function(){});
})();
