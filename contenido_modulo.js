const _params    = new URLSearchParams(location.search);
const _moduloRaw = _params.get('modulo') || '1.1';
const _modulo    = _moduloRaw.replace(/\./g, '_');
const JSON_URL   = 'data/contenido_modulo_' + _modulo + '.json';

fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    document.getElementById('page-title').textContent = data.badge + ' · Piensa en Gujarati';
    document.getElementById('nav-atras').href = 'contenido.html';
    document.getElementById('nav-home').href  = 'contenido.html';

    document.getElementById('badge').textContent    = data.badge;
    document.getElementById('titulo').textContent   = data.titulo;
    document.getElementById('subtitulo').innerHTML  = data.subtitulo_html;

    document.getElementById('label-consonantes').textContent = 'Las ' + data.consonantes.length + ' consonantes';
    var gridConsonantes = document.getElementById('grid-consonantes');
    data.consonantes.forEach(function(c){
      var div = document.createElement('div');
      div.className = 'letra-card';
      div.innerHTML = '<span class="gu">' + c.gu + '</span><span class="rom">' + c.rom + '</span>';
      gridConsonantes.appendChild(div);
    });

    document.getElementById('label-vocales').textContent = 'Las ' + data.vocales.length + ' vocales';
    var gridVocales = document.getElementById('grid-vocales');
    data.vocales.forEach(function(v){
      var div = document.createElement('div');
      div.className = 'vocal-card';
      div.innerHTML = '<span class="gu">' + v.gu + '</span><span class="rom">' + v.rom + '</span><span class="abrev">' + v.abrev + '</span>';
      gridVocales.appendChild(div);
    });

    document.getElementById('info-box').innerHTML = data.info_box_html;

    document.getElementById('label-lecciones').textContent = 'Las ' + data.lecciones.length + ' lecciones';
    var lista = document.getElementById('lista-lecciones');
    var leccionActiva = null;
    data.lecciones.forEach(function(l){
      var esActiva = (l.estado === 'activa');
      if(esActiva) leccionActiva = l;
      var el = document.createElement(esActiva ? 'a' : 'div');
      el.className = 'leccion ' + l.estado;
      if(esActiva) el.href = 'leccion_loader.html?leccion=' + l.codigo_leccion;
      el.innerHTML =
        '<span class="lec-num">'  + l.numero + '</span>' +
        '<div class="lec-info">'  +
          '<div class="lec-title">' + l.titulo   + '</div>' +
          '<div class="lec-sub">'   + l.sub_html  + '</div>' +
        '</div>' +
        (esActiva
          ? '<span class="lec-status">▶</span>'
          : '<span class="lec-soon">Muy pronto</span>');
      lista.appendChild(el);
    });

    var btnEmpezar = document.getElementById('btn-empezar');
    var navMapa    = document.getElementById('nav-mapa');
    if(leccionActiva){
      btnEmpezar.href        = 'leccion_loader.html?leccion=' + leccionActiva.codigo_leccion;
      btnEmpezar.textContent = 'Empezar con la Lección ' + leccionActiva.numero + ' →';
      navMapa.href           = 'guia_navegacion.html?leccion=' + leccionActiva.codigo_leccion;
    } else {
      btnEmpezar.classList.add('nav-oculto');  // antes: style.display='none'
      navMapa.classList.add('nav-oculto');     // antes: style.display='none'
    }
  })
  .catch(function(){
    document.body.innerHTML =
      '<p class="error-carga">No se pudo cargar el contenido. Revisa tu conexión.</p>';
  });

/* Verificador de versión */
(function(){
  var VERSION_URL = 'https://rubenbhai.github.io/GujaratiResources/version.txt';
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
