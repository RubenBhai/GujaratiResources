(function(){
  var TOTAL       = 3;
  var actualPantalla = 1;

  var pantallas    = document.querySelectorAll('.pantalla-item');
  var btnLeccion   = document.getElementById('nav-leccion');
  var btnAnterior  = document.getElementById('nav-anterior');
  var btnSiguiente = document.getElementById('nav-siguiente');

  // "Regresar" siempre sale por el historial, sin importar la pantalla
  btnLeccion.onclick = function(){ history.back(); };

  /* ── Audio y Resalte Secuencial de Letras (Izquierda -> Derecha) ── */
  var botonesAudio = document.querySelectorAll('.btn-audio');
  var audioActual  = null;

  function limpiarResaltes(boton) {
    var pantalla = boton.closest('.pantalla-item');
    if (!pantalla) return;
    var cuads = pantalla.querySelectorAll('.cuad');
    cuads.forEach(function(c){ c.classList.remove('activa'); });
  }

  // Bucle de alta precisión (60fps) para cambiar el resalte exactamente a mitad del audio
  function monitorearAudio(boton, audio) {
    if (audio.paused || audio.ended) {
      return;
    }

    var pantalla = boton.closest('.pantalla-item');
    if (pantalla) {
      var cuadCerrado = pantalla.querySelector('.cuad-cerrado');
      var cuadAbierto = pantalla.querySelector('.cuad-abierto');
      if (cuadCerrado && cuadAbierto) {
        var dur = audio.duration;
        // Si la duración aún no está disponible por preload="none", usamos 1.6s como respaldo (mitad = 0.8s)
        var mitad = (dur && !isNaN(dur) && dur > 0 && dur !== Infinity) ? (dur / 2) : 0.8;

        if (audio.currentTime < mitad) {
          // 1er sonido (mitad inicial): resalte en el frame izquierdo
          cuadCerrado.classList.add('activa');
          cuadAbierto.classList.remove('activa');
        } else {
          // 2do sonido (mitad final): resalte en el frame derecho
          cuadCerrado.classList.remove('activa');
          cuadAbierto.classList.add('activa');
        }
      }
    }

    requestAnimationFrame(function(){
      monitorearAudio(boton, audio);
    });
  }

  function detenerAudio(entrada){
    if(!entrada) return;
    entrada.audio.pause();
    entrada.audio.currentTime = 0;
    entrada.boton.classList.remove('is-playing');
    entrada.boton.querySelector('.btn-audio-icono').textContent = '▶';
    limpiarResaltes(entrada.boton);
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
      
      // Iniciamos el seguimiento de alta precisión
      monitorearAudio(boton, audio);
      audioActual = { audio: audio, boton: boton };
    });

    audio.addEventListener('ended', function(){
      if(audioActual && audioActual.audio === audio){ 
        detenerAudio(audioActual); 
        audioActual = null; 
      }
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