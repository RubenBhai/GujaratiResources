(function(){
  var _lec    = new URLSearchParams(location.search).get('leccion') || '1.1.1';
  var _partes = _lec.split('.');
  var _folder = _lec.replace(/\./g, '_');   // "1.1.1" → "1_1_1"

  /* ── Links de navegación ── */
  document.getElementById('link-consonantes').href = 'leccion_letra.html?leccion=' + _lec;
  document.getElementById('link-vocales').href     = 'leccion_vocal.html?leccion='  + _lec;

  document.getElementById('link-juego-a').href = 'juego.html?leccion=' + _lec;
  document.getElementById('link-juego-b').href = 'juego.html?leccion=' + _lec + '&fase=b';
  document.getElementById('link-juego-c').href = 'juego.html?leccion=' + _lec + '&fase=c';

  document.getElementById('link-practica').href =
    'practica.html?modulo=' + _partes[0] + '.' + _partes[1] + '&leccion=' + _partes[2];

  document.getElementById('link-aprende').href = 'aprende.html?leccion='  + _lec;
  document.getElementById('link-compone').href = 'compone.html?leccion='  + _lec;
  document.getElementById('link-reto').href    = 'reto.html?leccion='     + _lec;
  document.getElementById('link-pensar').href  = 'piensa.html?leccion='    + _lec;
  document.getElementById('link-generar').href = 'generador.html?leccion=' + _lec;
  document.getElementById('link-lectura').href = 'lectura.html?leccion=' + _lec;
  document.getElementById('link-dialogo').href = 'video.html?leccion='    + _lec
                                               + '&next=video_interactivo.html&modo=desafio';

  /* ── Visibilidad controlada por JSON ── */
  var SECCIONES = {
    'tema-alfabeto': ['link-consonantes', 'link-vocales'],
    'tema-juegos':   ['link-juego-a', 'link-juego-b', 'link-juego-c'],
    'tema-practica': ['link-practica'],
    'tema-pensar':   ['link-aprende', 'link-compone', 'link-lectura', 'link-reto', 'link-pensar', 'link-generar', 'link-dialogo']
  };

  var JSON_URL = 'data/' + _folder + '/guia_navegacion_' + _folder + '.json';

  fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
    .then(function(data){
      if(data.iconos){
        var mapaIconos = {
          'icon-alfabeto': data.iconos.alfabeto,
          'icon-juegos':   data.iconos.juegos,
          'icon-practica': data.iconos.practica,
          'icon-pensar':   data.iconos.pensar
        };
        Object.keys(mapaIconos).forEach(function(id){
          var src = mapaIconos[id];
          var el  = document.getElementById(id);
          if(el && src){
            el.innerHTML = '<img src="' + src + '" alt="" class="card-icon-img">';
          }
        });
      }

      var botones = data.botones || {};
      Object.keys(SECCIONES).forEach(function(claseSeccion){
        var ids       = SECCIONES[claseSeccion];
        var seccionEl = document.querySelector('.' + claseSeccion);
        var algunoVisible = false;
        ids.forEach(function(id){
          var visible = botones[id] === true;
          var el = document.getElementById(id);
          if(el) el.style.display = visible ? '' : 'none';
          if(visible) algunoVisible = true;
        });
        if(seccionEl) seccionEl.style.display = algunoVisible ? '' : 'none';
      });
    })
    .catch(function(){
      // Sin JSON de visibilidad → todos los botones y secciones visibles por defecto
    });
})();
