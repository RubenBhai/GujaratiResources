/* ── Preload: muestra la página solo cuando imagen y música estén listos ── */
(function(){
  document.body.style.opacity    = '0';
  document.body.style.transition = 'opacity 0.5s ease';
  var ASSETS = [
    'imagenes/LearnGujarati_SuperInmersivo_Main.jpg',
    'audios/musica/Index_musica_ambiente.mp3'
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

/* ── Partículas flotantes ── */
(function(){
  var container = document.getElementById('particles');
  var colors    = ['#D4AF37', '#00E5FF', '#F9E596', '#9333EA'];
  for(var i = 0; i < 22; i++){
    var p        = document.createElement('div');
    p.className  = 'particle';
    var size     = Math.random() * 4 + 2;
    var color    = colors[Math.floor(Math.random() * colors.length)];
    var left     = Math.random() * 100;
    var duration = Math.random() * 12 + 8;
    var delay    = Math.random() * 10;
    p.style.cssText = [
      'width:'              + size     + 'px',
      'height:'             + size     + 'px',
      'left:'               + left     + '%',
      'background:'         + color,
      'color:'              + color,
      'animation-duration:' + duration + 's',
      'animation-delay:'    + delay    + 's'
    ].join(';');
    container.appendChild(p);
  }
})();

/* ── Botón de música ambiente ── */
(function(){
  var music      = document.getElementById('bgMusic');
  var btn        = document.getElementById('musicToggle');
  music.volume   = 0.0;
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
        music.volume += diff * 0.1;
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
      btn.innerHTML = '&#128266;';
      btn.classList.remove('music-off');
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
        btn.innerHTML = '&#128266;';
        btn.classList.remove('music-off');
        music.play().then(function(){ fadeTo(TARGET_VOL); }).catch(function(){});
      }
      document.removeEventListener('click',      resume);
      document.removeEventListener('touchstart', resume);
    };
    document.addEventListener('click',      resume);
    document.addEventListener('touchstart', resume);
  }

  // Pausar al pasar a segundo plano; reanudar al volver
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
    .then(function(r){ return r.text(); })
    .then(function(serverV){
      serverV = serverV.trim();
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

/* ── Service Worker (PWA) ── */
if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
}
