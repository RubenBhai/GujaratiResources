/* ============================================================
   frases_base.js — Módulo compartido del curso de frases.
   Lo usan todos los modos (presenta, compone, dictado, karaoke...).
   NO importa ni modifica ningún motor de lección: solo adapta su
   lógica ya probada. Expone el objeto global `Frases`.
   ============================================================ */
var Frases = (function(){

  /* Carga la colección de una categoría.
     ?set=predicar  →  data/frases/frases_predicar.json
     Todos los modos leen la MISMA fuente por categoría. */
  function cargar(){
    var params = new URLSearchParams(location.search);
    var set    = params.get('set') || 'predicar';
    var url    = 'data/frases/frases_' + set + '.json';
    return fetch(url + '?t=' + Date.now(), { cache:'no-store' })
      .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); });
  }

  /* Baraja una copia (no muta el original). Fisher-Yates: el
     sort(random - 0.5) de los otros motores no reparte uniforme. */
  function shuffle(a){
    a = a.slice();
    for(var i = a.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Un campo se muestra solo si trae contenido real: ignora los
     placeholders "…" que quedan mientras no hay romanización/audio. */
  function util(v){ return !!v && v !== '…'; }

  /* Reproductor único: garantiza que suene un solo audio a la vez
     (la frase completa, un bloque o una secuencia). Devuelve el Audio o null. */
  var _audioActual = null;
  var _seqActual   = null;   // secuencia en curso (ver secuencia())

  /* Detiene lo que esté sonando: audio suelto y/o secuencia encadenada.
     Sin esto, "mi versión" + "frase original" (Adapta) o el cierre de
     Backwards + la frase siguiente sonaban encimados. */
  function detener(){
    if(_audioActual){ try{ _audioActual.pause(); }catch(e){} }
    if(_seqActual){ _seqActual.cancelar(); _seqActual = null; }
  }

  function audio(src){
    if(!util(src)) return null;
    detener();
    try{
      _audioActual = new Audio(src);
      _audioActual.play().catch(function(){});
    }catch(e){ _audioActual = null; }
    return _audioActual;
  }

  /* Reproduce una lista de audios ENCADENADOS (uno tras otro).
     Lo usan Backwards (la porción que crece) y, más adelante, el Karaoke.
     opts.onInicio(i) se llama antes de cada audio; opts.onFin al terminar.
     Devuelve { cancelar } para detener la cadena si el usuario avanza. */
  function secuencia(srcs, opts){
    detener();
    opts = opts || {};
    var i = 0, actual = null, cancelado = false;
    function paso(){
      if(cancelado) return;
      if(i >= srcs.length){ if(opts.onFin) opts.onFin(); return; }
      if(opts.onInicio) opts.onInicio(i);
      var src = srcs[i];
      if(!util(src)){ i++; paso(); return; }   // pieza sin audio: la salta
      try{
        actual = new Audio(src);
        if(opts.velocidad){ actual.playbackRate = opts.velocidad; }
        actual.onended = function(){ i++; paso(); };
        actual.onerror = function(){ i++; paso(); };   // audio inexistente: sigue
        actual.play().catch(function(){});
      }catch(e){ i++; paso(); }
    }
    var ctl = { cancelar: function(){
      cancelado = true;
      if(actual){ try{ actual.pause(); }catch(e){} actual.onended = null; actual.onerror = null; }
    } };
    _seqActual = ctl;
    paso();
    return ctl;
  }

  /* Botón "volver": solo usa history.back() si se llegó desde otra página
     de la app; si se abrió directo (enlace compartido, PWA en frío, pestaña
     nueva) back() no hace nada o sale de la app → ir a `respaldo`. */
  function volver(respaldo){
    var desdeApp = false;
    try{ desdeApp = !!document.referrer && new URL(document.referrer).origin === location.origin; }catch(e){}
    if(desdeApp && history.length > 1) history.back();
    else location.href = respaldo || 'frases.html';
  }

  /* Verificador de versión (idéntico al del resto del curso). */
  function checarVersion(){
    fetch('version.txt?t=' + Date.now(), { cache:'no-store' })
      .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function(sv){
        sv = sv.trim();
      if(!sv || sv.length > 20) return;   // respuesta rara (p.ej. una página 404): no recargar
        var lv = null;
        try{ lv = localStorage.getItem('appVersion'); }catch(e){}
        if(lv === null){
          try{ localStorage.setItem('appVersion', sv); }catch(e){}
        }else if(lv !== sv){
          try{ localStorage.setItem('appVersion', sv); }catch(e){}
          location.reload(true);
        }
      })
      .catch(function(){});
  }

  return {
    cargar:        cargar,
    shuffle:       shuffle,
    util:          util,
    audio:         audio,
    secuencia:     secuencia,
    detener:       detener,
    volver:        volver,
    checarVersion: checarVersion
  };
})();
