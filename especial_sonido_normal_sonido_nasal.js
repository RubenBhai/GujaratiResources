(function(){
  var TOTAL       = 3;
  var actualPantalla = 1;

  var pantallas    = document.querySelectorAll('.pantalla-item');
  var btnLeccion   = document.getElementById('nav-leccion');
  var btnAnterior  = document.getElementById('nav-anterior');
  var btnSiguiente = document.getElementById('nav-siguiente');

  // "Regresar" siempre sale por el historial, sin importar la pantalla
  btnLeccion.onclick = function(){ history.back(); };

  /* ── Audio ── */
  var botonesAudio = document.querySelectorAll('.btn-audio');
  var audioActual  = null;

  function detenerAudio(entrada){
    if(!entrada) return;
    entrada.audio.pause();
    entrada.audio.currentTime = 0;
    entrada.boton.classList.remove('is-playing');
    entrada.boton.querySelector('.btn-audio-icono').textContent = '▶';
  }

  function detenerTodoAudio(){
    if(audioActual){ detenerAudio(audioActual); audioActual = null; }
  }

  botonesAudio.forEach(function(boton){
    var audio = document.getElementById(boton.getAttribute('data-audio'));
    if(!audio) return;
    boton.addEventListener('click', function(){
      var esElMismo = audioActual && audioActual.audio === audio;
      if(audioActual && !esElMismo){ detenerAudio(audioActual); }
      if(esElMismo && !audio.paused){ detenerAudio(audioActual); audioActual = null; return; }
      audio.play();
      boton.classList.add('is-playing');
      boton.querySelector('.btn-audio-icono').textContent = '⏸';
      audioActual = { audio: audio, boton: boton };
    });
    audio.addEventListener('ended', function(){
      if(audioActual && audioActual.audio === audio){ detenerAudio(audioActual); audioActual = null; }
    });
  });

  /* ── Navegación entre las 3 pantallas ── */
  function mostrarPantalla(n){
    detenerTodoAudio();
    actualPantalla = n;
    pantallas.forEach(function(el){
      el.hidden = (parseInt(el.dataset.n, 10) !== n);
    });
    window.scrollTo(0, 0);
    actualizarNav();
  }

  function actualizarNav(){
    if(actualPantalla <= 1){
      btnAnterior.classList.add('disabled');
      btnAnterior.onclick = null;
    } else {
      btnAnterior.classList.remove('disabled');
      btnAnterior.onclick = function(){ mostrarPantalla(actualPantalla - 1); };
    }

    if(actualPantalla >= TOTAL){
      btnSiguiente.classList.add('disabled');
      btnSiguiente.onclick = null;
    } else {
      btnSiguiente.classList.remove('disabled');
      btnSiguiente.onclick = function(){ mostrarPantalla(actualPantalla + 1); };
    }
  }

  actualizarNav();
})();
