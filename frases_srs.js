/* ============================================================
   frases_srs.js — Motor de Repaso Espaciado (SRS), aislado.
   Adaptado de la lógica de aprende.js: niveles, intervalos y
   persistencia por ítem. Es agnóstico al contenido — aquí el ítem
   es una FRASE (por su id). Guarda el progreso por categoría (set).
   Expone el objeto global `FrasesSRS`.
   ============================================================ */
var FrasesSRS = (function(){
  /* minutos: 0, 10min, 1h, 1día, 3días, 7días, 14días (como aprende) */
  var INTERVALOS = [0, 10, 60, 1440, 4320, 10080, 20160];
  var DOMINADO   = 5;

  function ahora(){ return Date.now(); }
  function clave(set){ return 'frasesSRS_' + (set || 'predicar'); }

  function cargar(set){
    try{ return normalizar(JSON.parse(localStorage.getItem(clave(set)))); }
    catch(e){ return {}; }
  }

  /* Migración suave del progreso guardado: NO borra nada; solo sanea
     tipos (por si el valor guardado está corrupto o viene de una versión
     anterior) y acota el nivel al rango de INTERVALOS. Las frases que ya
     estaban "dominadas" conservan su nivel y su prox: con la nueva
     clasificar() vuelven a repaso cuando venza su intervalo (7/14 días). */
  function normalizar(est){
    if(!est || typeof est !== 'object' || Array.isArray(est)) return {};
    Object.keys(est).forEach(function(id){
      var st = est[id];
      if(!st || typeof st !== 'object'){ delete est[id]; return; }
      var n = Number(st.nivel);
      st.nivel    = isNaN(n) ? -1 : Math.max(-1, Math.min(Math.floor(n), INTERVALOS.length - 1));
      st.prox     = Number(st.prox) || 0;
      st.aciertos = Number(st.aciertos) || 0;
      st.fallos   = Number(st.fallos) || 0;
    });
    return est;
  }
  function guardar(set, est){
    try{ localStorage.setItem(clave(set), JSON.stringify(est)); }catch(e){}
  }
  function reset(set){ try{ localStorage.removeItem(clave(set)); }catch(e){} }

  /* Estado de una frase (se crea nuevo si no existía): nivel -1 = sin ver. */
  function estadoDe(est, id){
    if(!est[id]){ est[id] = { nivel:-1, prox:0, aciertos:0, fallos:0 }; }
    return est[id];
  }

  /* Acierto → sube un nivel y se espacia según INTERVALOS. */
  function acierto(st){
    var n = (st.nivel < 0 ? 0 : st.nivel) + 1;
    st.nivel = Math.min(n, INTERVALOS.length - 1);
    st.prox  = ahora() + INTERVALOS[st.nivel] * 60000;
    st.aciertos++;
  }
  /* Fallo → vuelve a nivel 0 y reaparece pronto (10 min). */
  function fallo(st){
    st.nivel = 0;
    st.prox  = ahora() + INTERVALOS[1] * 60000;
    st.fallos++;
  }
  /* Marca "conocida" una frase nueva (sin contar como acierto de repaso). */
  function conocida(st){ if(st.nivel < 0){ st.nivel = 0; st.prox = ahora(); } }

  /* Reparte las frases en: nuevas / pendientes de repaso / dominadas.
     Una dominada cuyo intervalo (7 o 14 días) ya venció cuenta como
     dominada Y como pendiente: antes no volvía nunca a repaso y los
     intervalos largos no se usaban. */
  function clasificar(items, est){
    var nuevas = [], pend = [], dom = [];
    items.forEach(function(f){
      var st = estadoDe(est, f.id);
      if(st.nivel < 0){ nuevas.push(f); return; }
      if(st.nivel >= DOMINADO) dom.push(f);
      if(st.prox <= ahora())   pend.push(f);
    });
    return { nuevas:nuevas, pendientes:pend, dominadas:dom };
  }

  return {
    INTERVALOS: INTERVALOS,
    DOMINADO:   DOMINADO,
    cargar:     cargar,
    guardar:    guardar,
    reset:      reset,
    estadoDe:   estadoDe,
    acierto:    acierto,
    fallo:      fallo,
    conocida:   conocida,
    clasificar: clasificar
  };
})();
