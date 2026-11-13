/* ============================================================
   frases_reto.js — Modo 6: Reto de memoria (SRS).
   El ítem que se repasa es la FRASE completa. Cada frase pasa por:
   conocer → entender (quiz de significado) → decir (en voz alta con
   cronómetro + autoevaluación). El motor `FrasesSRS` decide qué
   frases tocan y cómo se espacian. Usa `Frases` y `FrasesSRS`.
   (Estructura y fases basadas en tu aprende.js.)
   ============================================================ */
(function(){
  var params = new URLSearchParams(location.search);
  var set    = params.get('set') || 'predicar';

  var data    = null;
  var frases  = [];
  var estado  = {};
  var cola    = [];
  var paso    = 0;
  var vistas  = {};   // ids tocados en la sesión
  var aciertosSesion = 0;
  var cronoTimer = null;

  function $(id){ return document.getElementById(id); }
  function mostrar(id){
    ['screen-inicio','screen-conocer','screen-entender','screen-decir','screen-fin']
      .forEach(function(s){ $(s).classList.toggle('oculto', s !== id); });
  }

  Frases.cargar()
    .then(function(d){
      data   = d;
      frases = (d.frases || []).filter(function(f){ return !!f.id; });
      estado = FrasesSRS.cargar(set);
      document.getElementById('page-title').textContent = (d.categoria || 'Frases') + ' · Reto de memoria';
      $('cat').textContent = d.categoria || 'Frases';
      mostrarInicio();
    })
    .catch(function(){
      document.querySelector('.escena').innerHTML =
        '<p class="error-carga">No se pudieron cargar las frases. Revisa tu conexión.</p>';
    });

  function mostrarInicio(){
    var cls = FrasesSRS.clasificar(frases, estado);
    $('st-nuevas').textContent  = cls.nuevas.length;
    $('st-repasar').textContent = cls.pendientes.length;
    $('st-dom').textContent     = cls.dominadas.length;
    $('btn-empezar').disabled   = (cls.nuevas.length + cls.pendientes.length === 0);
    mostrarAvisoProximo($('btn-empezar').disabled);
    setProgreso(0);
    mostrar('screen-inicio');
  }

  /* Si no hay nada que estudiar (todo repasado hace poco), decir cuándo vuelve
     el siguiente repaso: sin esto quedaba "0 · 0 · 0" con Empezar gris y el
     alumno creía que había perdido el progreso. */
  function mostrarAvisoProximo(sinNada){
    var aviso = $('reto-aviso');
    if(!aviso){
      aviso = document.createElement('p');
      aviso.id = 'reto-aviso';
      aviso.className = 'reto-sub reto-aviso';
      $('btn-empezar').parentNode.insertBefore(aviso, $('btn-empezar'));
    }
    aviso.textContent = '';
    if(!sinNada) return;
    var prox = Infinity;
    frases.forEach(function(f){
      var st = FrasesSRS.estadoDe(estado, f.id);
      if(st.nivel >= 0 && st.prox < prox) prox = st.prox;
    });
    if(!isFinite(prox)) return;
    var min = Math.max(1, Math.ceil((prox - Date.now()) / 60000));
    var cuando = min < 60 ? min + ' min'
               : min < 1440 ? Math.round(min / 60) + ' h'
               : Math.round(min / 1440) + ' días';
    aviso.textContent = '✓ Todo al día. Próximo repaso en ' + cuando + '.';
  }

  function empezar(){
    var cls = FrasesSRS.clasificar(frases, estado);
    var aEstudiar = Frases.shuffle(cls.nuevas.concat(cls.pendientes));
    cola = []; paso = 0; vistas = {}; aciertosSesion = 0;
    aEstudiar.forEach(function(f){
      var st = FrasesSRS.estadoDe(estado, f.id);
      if(st.nivel < 0) cola.push({ f:f, fase:'conocer' });
      cola.push({ f:f, fase:'entender' });
      cola.push({ f:f, fase:'decir' });
    });
    if(cola.length === 0){ mostrarInicio(); return; }
    siguientePaso();
  }

  function siguientePaso(){
    if(paso >= cola.length){ mostrarFin(); return; }
    setProgreso(paso / cola.length);
    var c = cola[paso];
    vistas[c.f.id] = true;
    if(c.fase === 'conocer')       mostrarConocer(c.f);
    else if(c.fase === 'entender') mostrarEntender(c.f);
    else                           mostrarDecir(c.f);
  }
  function avanzar(){ paso++; siguientePaso(); }

  function setProgreso(frac){
    var fill = $('prog-fill');
    if(fill) fill.style.width = Math.round(frac * 100) + '%';
  }

  /* ── CONOCER: presentar la frase con sus piezas (imágenes de apoyo) ── */
  function mostrarConocer(f){
    $('con-gu').textContent  = f.gu || '';
    $('con-rom').textContent = Frases.util(f.rom) ? f.rom : '';
    $('con-es').textContent  = f.es || '';
    $('con-audio').onclick   = function(){ Frases.audio(f.audio); };

    var b = f.bloques || [];
    var html = '';
    b.forEach(function(bl, i){
      html += '<div class="bloque" data-audio="' + (bl.audio || '') + '">';
      html +=   '<span class="bloque-num">' + (i + 1) + '</span>';
      if(bl.img)             html += '<img class="bloque-img" src="' + bl.img + '" alt="">';
      html +=   '<span class="bloque-gu" lang="gu">' + (bl.gu || '') + '</span>';
      if(Frases.util(bl.rom)) html += '<span class="bloque-rom">' + bl.rom + '</span>';
      if(bl.es)              html += '<span class="bloque-es">' + bl.es + '</span>';
      html += '</div>';
    });
    $('con-bloques').innerHTML = html;
    $('con-bloques').querySelectorAll('[data-audio]').forEach(function(el){
      el.addEventListener('click', function(){ Frases.audio(el.getAttribute('data-audio')); });
    });
    $('con-bloques').querySelectorAll('.bloque-img').forEach(function(img){
      img.addEventListener('error', function(){ img.classList.add('oculto'); });
    });

    $('con-sig').onclick = function(){
      FrasesSRS.conocida(FrasesSRS.estadoDe(estado, f.id));
      FrasesSRS.guardar(set, estado);
      avanzar();
    };
    mostrar('screen-conocer');
    setTimeout(function(){ Frases.audio(f.audio); }, 350);
  }

  /* ── ENTENDER: quiz de significado (elige el español) ── */
  function mostrarEntender(f){
    $('q-gu').textContent = f.gu || '';
    $('q-audio').onclick  = function(){ Frases.audio(f.audio); };
    $('q-feedback').textContent = ''; $('q-feedback').className = 'feedback';
    $('q-acciones').classList.add('oculto');

    var opciones = opcionesEspanol(f);
    var cont = $('q-opciones');
    cont.innerHTML = '';
    opciones.forEach(function(txt){
      var btn = document.createElement('button');
      btn.className = 'opt-btn';
      btn.textContent = txt;
      btn.addEventListener('click', function(){ responderQuiz(btn, txt, f.es, f); });
      cont.appendChild(btn);
    });
    mostrar('screen-entender');
  }

  function opcionesEspanol(f){
    var otras = frases.filter(function(x){ return x.id !== f.id && x.es; });
    var distr = Frases.shuffle(otras).slice(0, 3).map(function(x){ return x.es; });
    return Frases.shuffle([f.es].concat(distr));
  }

  function responderQuiz(btn, elegido, correcto, f){
    var todos = $('q-opciones').querySelectorAll('.opt-btn');
    todos.forEach(function(b){ b.disabled = true; });
    var st = FrasesSRS.estadoDe(estado, f.id);

    if(elegido === correcto){
      btn.classList.add('correct');
      $('q-feedback').textContent = '✓ ¡Correcto!'; $('q-feedback').className = 'feedback ok';
      // El quiz solo penaliza; el nivel lo sube la autoevaluación de "decir".
      // Antes sumaban las dos fases → +2 niveles por sesión (dominada en ~3 días).
      aciertosSesion++;
      setTimeout(avanzar, 900);
    }else{
      btn.classList.add('wrong');
      todos.forEach(function(b){ if(b.textContent === correcto) b.classList.add('correct'); });
      $('q-feedback').textContent = '✗ Era: ' + correcto; $('q-feedback').className = 'feedback err';
      FrasesSRS.fallo(st); FrasesSRS.guardar(set, estado);
      $('q-acciones').classList.remove('oculto');
    }
  }

  /* ── DECIR: escuchar, decir en voz alta, autoevaluar ── */
  function mostrarDecir(f){
    $('decir-rev').classList.add('oculto');
    $('autoeval').classList.add('oculto');
    $('decir-audio').onclick = function(){ Frases.audio(f.audio); };

    // Cronómetro (animación CSS reiniciada), luego revela y pide autoevaluación
    var fill = $('crono-fill');
    fill.classList.remove('corriendo');
    void fill.offsetWidth;                 // fuerza reinicio de la animación
    fill.classList.add('corriendo');

    if(cronoTimer){ clearTimeout(cronoTimer); }
    cronoTimer = setTimeout(function(){ revelarDecir(f); }, 5000);

    mostrar('screen-decir');
    setTimeout(function(){ Frases.audio(f.audio); }, 350);
  }

  function revelarDecir(f){
    $('decir-gu').textContent  = f.gu || '';
    $('decir-rom').textContent = Frases.util(f.rom) ? f.rom : '';
    $('decir-es').textContent  = f.es || '';
    $('decir-rev').classList.remove('oculto');
    $('autoeval').classList.remove('oculto');

    $('autoeval').querySelectorAll('.autoeval-btn').forEach(function(btn){
      btn.onclick = function(){
        var st = FrasesSRS.estadoDe(estado, f.id);
        var r = btn.getAttribute('data-r');
        if(r === 'si'){ FrasesSRS.acierto(st); aciertosSesion++; }
        else if(r === 'no'){ FrasesSRS.fallo(st); }
        /* 'casi' = neutro: no cambia el nivel */
        FrasesSRS.guardar(set, estado);
        avanzar();
      };
    });
  }

  /* ── RESUMEN ── */
  function mostrarFin(){
    setProgreso(1);
    var cls = FrasesSRS.clasificar(frases, estado);
    var nVistas = Object.keys(vistas).length;
    $('fin-vistas').textContent   = nVistas;
    $('fin-aciertos').textContent = aciertosSesion;
    $('fin-dom').textContent      = cls.dominadas.length;
    mostrar('screen-fin');
  }

  /* ── Botones fijos ── */
  $('btn-empezar').addEventListener('click', empezar);
  $('btn-reiniciar').addEventListener('click', function(){
    if(!confirm('¿Borrar todo tu progreso de estas frases?')) return;
    FrasesSRS.reset(set);
    estado = FrasesSRS.cargar(set);
    mostrarInicio();
  });
  $('q-reintentar').addEventListener('click', function(){ mostrarEntender(cola[paso].f); });
  $('q-saltar').addEventListener('click', avanzar);
  $('fin-volver').addEventListener('click', function(){ Frases.volver('frases_hub.html' + location.search); });

  Frases.checarVersion();
})();
