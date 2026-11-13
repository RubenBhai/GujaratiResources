/* ============================================================
   frases_gemini.js — Módulo compartido: grabar voz + evaluar con Gemini.
   Replica EXACTAMENTE el flujo de practica.js / reto (nivel 3):
     POST {BACKEND}/api/evaluar-audio
     body:   { audioBase64, mimeType, fraseObjetivo }
     header: x-access-token  (del login, en sessionStorage)
     resp:   { nota, transcripcion, consejo }
   Requiere micrófono (getUserMedia) y el accessToken en sessionStorage.
   Expone el objeto global `FrasesGemini`.
   ============================================================ */
var FrasesGemini = (function(){
  var BACKEND = 'https://gujaratitraining-production.up.railway.app';
  var rec = null, chunks = [], streamActual = null;
  var pidiendo = false;   // permiso de micrófono en curso (evita abrir 2 micrófonos con doble toque)
  var generacion = 0;     // sube al cancelar: invalida un permiso que llegue tarde

  function estaGrabando(){ return !!(rec && rec.state === 'recording'); }

  /* Alterna la grabación. Si ya graba, detiene y manda a evaluar; si no, empieza.
     cb = { onInicio, onDetener, onAudio(url), onEvaluando, onResultado(data), onError(tipo) } */
  function alternar(fraseObjetivo, cb){
    cb = cb || {};
    if(estaGrabando()){ rec.stop(); return; }
    if(pidiendo) return;
    // iOS < 14.3 y algunos WebViews no tienen MediaRecorder / mediaDevices
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder){
      if(cb.onError) cb.onError('soporte');
      return;
    }

    pidiendo = true;
    var miGen = generacion;
    navigator.mediaDevices.getUserMedia({ audio:true })
      .then(function(stream){
        pidiendo = false;
        if(miGen !== generacion){   // se canceló (cambio de frase) mientras se pedía el permiso
          stream.getTracks().forEach(function(t){ t.stop(); });
          return;
        }
        streamActual = stream;
        try{ rec = new MediaRecorder(stream); }
        catch(e){
          stream.getTracks().forEach(function(t){ t.stop(); });   // no dejar el micrófono encendido
          streamActual = null;
          if(cb.onError) cb.onError('soporte');
          return;
        }
        chunks = [];
        rec.ondataavailable = function(e){ if(e.data && e.data.size > 0) chunks.push(e.data); };
        rec.onstop = function(){
          if(cb.onDetener) cb.onDetener();
          var tipo = rec.mimeType || 'audio/webm';
          var blob = new Blob(chunks, { type:tipo });
          if(cb.onAudio) cb.onAudio(URL.createObjectURL(blob));
          if(streamActual){ streamActual.getTracks().forEach(function(t){ t.stop(); }); streamActual = null; }
          evaluar(blob, fraseObjetivo, cb);
        };
        rec.start();
        if(cb.onInicio) cb.onInicio();
      })
      .catch(function(){ pidiendo = false; if(cb.onError) cb.onError('microfono'); });
  }

  /* Cancela una grabación en curso SIN evaluarla y apaga el micrófono.
     Lo usa Pronunciación al cambiar de frase. */
  function cancelar(){
    generacion++;
    pidiendo = false;
    if(rec){
      rec.onstop = null;
      if(rec.state === 'recording'){ try{ rec.stop(); }catch(e){} }
    }
    if(streamActual){ streamActual.getTracks().forEach(function(t){ t.stop(); }); streamActual = null; }
  }

  function evaluar(blob, fraseObjetivo, cb){
    if(cb.onEvaluando) cb.onEvaluando();
    var reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function(){
      var base64 = String(reader.result).split(',')[1];
      var mime   = blob.type || 'audio/webm';
      fetch(BACKEND + '/api/evaluar-audio', {
        method:  'POST',
        headers: { 'Content-Type':'application/json', 'x-access-token': token() },
        body:    JSON.stringify({ audioBase64:base64, mimeType:mime, fraseObjetivo:fraseObjetivo })
      })
        .then(function(r){
          if(r.status === 401 || r.status === 403) throw new Error('auth');
          if(!r.ok) throw new Error('server');
          return r.json();
        })
        .then(function(data){ if(cb.onResultado) cb.onResultado(data); })
        .catch(function(e){ if(cb.onError) cb.onError(e && e.message === 'auth' ? 'auth' : 'backend'); });
    };
    reader.onerror = function(){ if(cb.onError) cb.onError('audio'); };
  }

  function token(){ try{ return sessionStorage.getItem('accessToken') || ''; }catch(e){ return ''; } }

  return { alternar: alternar, estaGrabando: estaGrabando, cancelar: cancelar, BACKEND: BACKEND };
})();
