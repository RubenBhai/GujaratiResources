const BACKEND_URL = 'https://gujaratitraining-production.up.railway.app';
const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/reto_clase_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;
document.getElementById('nav-home').href = 'leccion_intro.html?leccion=' + _leccionRaw;

var _btnFlash = document.getElementById('btn-flash-palabras');
if(_btnFlash) _btnFlash.href = 'reto_flash.html?palabras=' + _leccionRaw;

const SND_OK  = 'https://rubenbhai.github.io/GujaratiResources/audios/clase_1_1/Clase_1_1_Correcto.mp3';
const SND_ERR = 'https://rubenbhai.github.io/GujaratiResources/audios/clase_1_1/Clase_1_1_Incorrecto.mp3';

const playerRef  = document.getElementById('player-ref');
const playerSelf = document.getElementById('player-self');
const sfx        = document.getElementById('sfx');

let DATA         = null;
let nivelActual  = 0;
let sesionNum    = 0;
let sesionTotal  = 0;
let sesionesUsadas = [];
let conteos      = {};
let textoActual  = '';
let n3Elementos  = [];
let n2Rondas     = [];
let n2RondaIdx   = 0;
let n2Resultados = [];
let audioActual  = '';
let sesionData   = null;
let mediaRecorder = null;
let audioChunks  = {};
let recordingId  = null;

/* ── Utilidades ── */
function shuffle(a){ return a.slice().sort(function(){ return Math.random()-0.5; }); }

function goTo(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function evalMsg(pct){
  if(pct>=91) return {emoji:'🏆', msg:'¡Felicidades!', snd:SND_OK};
  if(pct>=81) return {emoji:'⭐', msg:'Muy bien',       snd:SND_OK};
  if(pct>=71) return {emoji:'👍', msg:'Ya casi lo logras', snd:SND_ERR};
  if(pct>=61) return {emoji:'💪', msg:'Vas bien...',    snd:SND_ERR};
  return            {emoji:'🔄', msg:'Reintenta',       snd:SND_ERR};
}

/* ── Conteo de incidencias en texto ── */
function contarIncidencias(texto, elemento){
  var tokens = texto.split(/[\s,.?!]+/).filter(function(t){ return t.length>0; });
  var count  = 0;
  tokens.forEach(function(t){ if(t === elemento) count++; });
  if(count === 0){
    var regex   = new RegExp(elemento.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g');
    var matches = texto.match(regex);
    count = matches ? matches.length : 0;
  }
  return count;
}

/* ── Inicio de nivel ── */
function datosNivel(n){
  return n===1 ? DATA.nivel1 : n===2 ? DATA.nivel2 :
         n===3 ? DATA.nivel3 : n===4 ? DATA.nivel4 : DATA.nivel5;
}

function iniciarNivel(n){
  nivelActual = n;
  var d = datosNivel(n);
  sesionTotal = (n===2 && d.sesiones && d.sesiones.length)
    ? Math.min(d.sesiones.length, 5)
    : Math.min(d.maxSesiones || 1, 5);
  sesionNum = 0;
  elegirSesion();
}

function elegirSesion(){
  sesionNum++;
  if(sesionNum > sesionTotal){ history.back(); return; }
  if(nivelActual===2 && DATA.nivel2.sesiones && DATA.nivel2.sesiones.length){
    sesionData = DATA.nivel2.sesiones[sesionNum-1] || DATA.nivel2.sesiones[0];
  }
  if(nivelActual===1)      montarN1(sesionNum, sesionTotal);
  else if(nivelActual===2) montarN2(sesionNum, sesionTotal);
  else if(nivelActual===3) montarN3(sesionNum, sesionTotal);
  else if(nivelActual===4) montarN4(sesionNum, sesionTotal);
  else                     montarN5(sesionNum, sesionTotal);
}

/* ── NIVEL 1 ── */
function montarN1(num, total){
  var d = DATA.nivel1;
  document.getElementById('n1-badge').textContent       = 'Nivel 1 · Sesión '+num+' de '+total;
  document.getElementById('n1-instruccion').textContent = d.instruccion;
  document.getElementById('n1-texto').textContent       = d.texto;

  var elegidos = shuffle(d.elementos).slice(0, 3);
  conteos = {};
  textoActual = d.texto;
  elegidos.forEach(function(e){ conteos[e] = 0; });

  renderEtiquetas('n1-etiquetas', elegidos, 'n1');
  document.getElementById('top-fill').style.width = Math.round((num/total)*100)+'%';
  goTo('s-n1');
}

function renderEtiquetas(containerId, elegidos, prefix){
  var c = document.getElementById(containerId);
  c.innerHTML = '';
  elegidos.forEach(function(el){
    var div       = document.createElement('div');
    div.className = 'etiqueta';
    div.id        = prefix+'-et-'+el;
    div.innerHTML = '<span class="et-gu">'+el+'</span><span class="et-cnt" id="'+prefix+'-cnt-'+el+'">0</span>';
    div.onclick   = function(){
      conteos[el]++;
      document.getElementById(prefix+'-cnt-'+el).textContent = conteos[el];
      div.classList.remove('pulse');
      void div.offsetWidth;
      div.classList.add('pulse');
    };
    c.appendChild(div);
  });
}

function resetConteos(prefix){
  Object.keys(conteos).forEach(function(el){
    conteos[el] = 0;
    var cnt = document.getElementById(prefix+'-cnt-'+el);
    if(cnt) cnt.textContent = '0';
  });
}

/* ── NIVEL 2 ── */
function montarN2(num, total){
  var d = DATA.nivel2;
  document.getElementById('n2-badge').textContent       = 'Nivel 2 · Sesión '+num+' de '+total;
  document.getElementById('n2-instruccion').textContent = d.instruccion;
  document.getElementById('n2-texto').style.display     = 'none';

  var elementoStr  = sesionData && sesionData.elemento ? sesionData.elemento : '';
  n2Rondas         = elementoStr.split(',').map(function(e){ return e.trim(); }).filter(Boolean);
  n2RondaIdx       = 0;
  n2Resultados     = [];
  audioActual      = sesionData ? sesionData.audio : '';
  textoActual      = sesionData && sesionData.texto ? sesionData.texto : elementoStr;

  montarRondaN2();
  document.getElementById('top-fill').style.width = Math.round((num/total)*100)+'%';
  goTo('s-n2');
}

function montarRondaN2(){
  var el       = n2Rondas[n2RondaIdx];
  conteos      = {};
  conteos[el]  = 0;
  var badgeBase = 'Nivel 2 · Sesión '+sesionNum+' de '+sesionTotal;
  document.getElementById('n2-badge').textContent = n2Rondas.length > 1
    ? badgeBase+' · Ronda '+(n2RondaIdx+1)+' de '+n2Rondas.length
    : badgeBase;
  document.getElementById('n2-texto').style.display = 'none';
  renderEtiquetas('n2-etiquetas', [el], 'n2');
}

function playAudioRef(prefix, speed){
  playerRef.src = audioActual;
  playerRef.playbackRate = speed;
  playerRef.play().catch(function(){});
}

/* ── VERIFICAR N1 y N2 ── */
function verificar(nivel){
  playerRef.pause();
  if(nivel === 2){ verificarRondaN2(); return; }
  var elegidos = Object.keys(conteos);
  var detalle  = [];
  elegidos.forEach(function(el){
    var real    = contarIncidencias(textoActual, el);
    var usuario = conteos[el];
    detalle.push({ gu:el, real:real, usuario:usuario, ok: usuario===real });
  });
  var exactos = detalle.filter(function(d){ return d.ok; }).length;
  mostrarResultado(Math.round((exactos/elegidos.length)*100), detalle, 'conteo');
}

function verificarRondaN2(){
  var el      = n2Rondas[n2RondaIdx];
  var real    = (sesionData && sesionData.respuesta !== undefined)
    ? sesionData.respuesta
    : contarIncidencias(textoActual, el);
  var usuario = conteos[el] || 0;
  var ok      = usuario === real;
  n2Resultados.push({ gu:el, real:real, usuario:usuario, ok:ok });
  n2RondaIdx++;

  if(n2RondaIdx < n2Rondas.length){
    var t = document.getElementById('n2-texto');
    if(t){ t.textContent = el+(ok ? '  ✓' : '  ✗ ('+real+')'); t.style.display = ''; }
    setTimeout(function(){
      if(t) t.style.display = 'none';
      montarRondaN2();
    }, 1200);
  } else {
    var t2 = document.getElementById('n2-texto');
    if(t2){ t2.textContent = textoActual; t2.style.display = ''; }
    var exactos = n2Resultados.filter(function(d){ return d.ok; }).length;
    mostrarResultado(Math.round((exactos/n2Resultados.length)*100), n2Resultados, 'conteo');
  }
}

/* ── NIVEL 3 ── */
function montarN3(num, total){
  var d = DATA.nivel3;
  document.getElementById('n3-badge').textContent       = 'Nivel 3 · Sesión '+num+' de '+total;
  document.getElementById('n3-instruccion').textContent = d.instruccion;

  var lista = document.getElementById('n3-lista');
  lista.innerHTML = '';
  audioChunks     = {};
  n3Elementos     = shuffle(d.elementos).slice(0, 3);

  n3Elementos.forEach(function(el, i){
    var div       = document.createElement('div');
    div.className = 'pronuncia-item';
    div.id        = 'n3-item-'+i;
    div.innerHTML =
      '<div class="pi-top">'+
        '<div>'+
          '<div class="pi-gu">'+el.gujarati+'</div>'+
        '</div>'+
        '<div class="pi-btns">'+
          '<button class="btn-grabar" id="btn-g-'+i+'" onclick="toggleGrabacion('+i+',\''+el.gujarati+'\')">🎙 Grabar</button>'+
        '</div>'+
      '</div>'+
      '<div class="spinner" id="load-'+i+'">⏳ Evaluando...</div>'+
      '<div class="eval-panel" id="eval-'+i+'">'+
        '<div class="eval-nota" id="nota-'+i+'"></div>'+
        '<div class="eval-trans" id="trans-'+i+'"></div>'+
        '<div class="eval-consejo" id="consejo-'+i+'"></div>'+
      '</div>';
    lista.appendChild(div);
  });

  document.getElementById('top-fill').style.width = Math.round((num/total)*100)+'%';
  goTo('s-n3');
}

function toggleGrabacion(i, fraseObjetivo){
  var btn = document.getElementById('btn-g-'+i);
  if(recordingId === i){
    mediaRecorder.stop(); recordingId = null;
    btn.innerHTML = '🎙 Grabar'; btn.classList.remove('recording');
    return;
  }
  if(mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  recordingId = i;
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
    mediaRecorder = new MediaRecorder(stream);
    audioChunks[i] = [];
    mediaRecorder.ondataavailable = function(e){ if(e.data && e.data.size>0) audioChunks[i].push(e.data); };
    mediaRecorder.onstop = function(){
      var blob = new Blob(audioChunks[i], {type: mediaRecorder.mimeType||'audio/webm'});
      convertirYEnviar(blob, i, fraseObjetivo);
      stream.getTracks().forEach(function(t){ t.stop(); });
    };
    mediaRecorder.start();
    btn.innerHTML = '🛑 Detener'; btn.classList.add('recording');
  }).catch(function(){ alert('Verifica los permisos de tu micrófono.'); });
}

function convertirYEnviar(blob, i, fraseObjetivo){
  var reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = function(){
    enviarAGemini(reader.result.split(',')[1], blob.type||'audio/webm', fraseObjetivo, i);
  };
}

function enviarAGemini(audioBase64, mimeType, fraseObjetivo, i){
  var spinner = document.getElementById('load-'+i);
  var panel   = document.getElementById('eval-'+i);
  if(spinner) spinner.style.display = 'block';
  if(panel)   panel.style.display   = 'none';
  fetch(BACKEND_URL+'/api/evaluar-audio',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-access-token':sessionStorage.getItem('accessToken')||''},
    body: JSON.stringify({audioBase64:audioBase64, mimeType:mimeType, fraseObjetivo:fraseObjetivo})
  })
  .then(function(r){ if(!r.ok) throw new Error('Error servidor'); return r.json(); })
  .then(function(data){
    document.getElementById('nota-'+i).innerHTML    = '⭐ Nota: '+data.nota+'/10';
    document.getElementById('trans-'+i).innerHTML   = 'Gemini entendió: "'+data.transcripcion+'"';
    document.getElementById('consejo-'+i).innerHTML = '💡 '+data.consejo;
    document.getElementById('nota-'+i).style.color  = data.nota>=7?'var(--saffron)':'var(--wrong-text)';
    if(panel) panel.style.display = 'block';
  })
  .catch(function(err){
    console.error(err);
    document.getElementById('nota-'+i).innerHTML = '⚠️ No se pudo conectar con Gemini';
    if(panel) panel.style.display = 'block';
  })
  .finally(function(){ if(spinner) spinner.style.display = 'none'; });
}

function verificarN3(){
  playerRef.pause();
  var notas=[], detalle=[], todos=true;
  n3Elementos.forEach(function(el, i){
    var notaEl = document.getElementById('nota-'+i);
    if(!notaEl || !notaEl.textContent.includes('/10')){ todos=false; return; }
    var match = notaEl.textContent.match(/(\d+(?:\.\d+)?)\/10/);
    if(match){ var n=parseFloat(match[1]); notas.push(n); detalle.push({gu:el.gujarati,nota:n,ok:n>=7}); }
  });
  if(!todos || notas.length===0){ alert('Graba y evalúa todos los elementos antes de verificar.'); return; }
  var pct = Math.round(notas.reduce(function(a,b){return a+b;},0)/notas.length*10);
  mostrarResultado(pct, detalle, 'gemini');
}

/* ── RESULTADO ── */
function mostrarResultado(pct, detalle, modo){
  var ev = evalMsg(pct);
  sfx.src = ev.snd; sfx.play().catch(function(){});
  document.getElementById('res-emoji').textContent = ev.emoji;
  document.getElementById('res-msg').textContent   = ev.msg;
  document.getElementById('res-pct').textContent   = 'Resultado: '+pct+'%';

  var html = '';
  detalle.forEach(function(d){
    var val, estado;
    if(modo === 'gemini' || modo === 'gemini5'){
      val = '⭐ '+d.nota+'/10'; estado = d.ok?'df-ok':'df-err';
    } else if(modo === 'opciones'){
      val = d.ok?'✓ Correcto':'✗ Incorrecto'; estado = d.ok?'df-ok':'df-err';
    } else {
      val = (d.ok?'✓ ':'✗ ')+d.usuario+' / '+d.real; estado = d.ok?'df-ok':'df-err';
    }
    html += '<div class="detalle-fila"><span class="df-gu">'+d.gu+'</span><span class="'+estado+'">'+val+'</span></div>';
  });
  document.getElementById('res-detalle').innerHTML = html;

  var haySiguiente = sesionNum < sesionTotal;
  var btnSig       = document.getElementById('btn-siguiente-sesion');
  btnSig.style.display = haySiguiente ? 'block' : 'none';
  if(pct < 81){
    btnSig.textContent = '🔄 Intentar de nuevo';
    btnSig.onclick     = repetirSesion;
  } else {
    btnSig.textContent = 'Siguiente sesión →';
    btnSig.onclick     = siguienteSesion;
  }
  goTo('s-resultado');

  // BUG CORREGIDO: era 'data.sonido_victoria' (fuera de scope) → 'DATA.sonido_victoria'
  if(pct >= 81){
    revisarVictoria(pct, DATA.sonido_victoria, DATA.programa_efecto_victoria, _leccion);
  }
}

function siguienteSesion(){ elegirSesion(); }

function repetirSesion(){
  if(nivelActual===1)      montarN1(sesionNum, sesionTotal);
  else if(nivelActual===2) montarN2(sesionNum, sesionTotal);
  else if(nivelActual===3) montarN3(sesionNum, sesionTotal);
  else if(nivelActual===4) montarN4(sesionNum, sesionTotal);
  else                     montarN5(sesionNum, sesionTotal);
}

/* ── NIVEL 4 · DICTADO DE ORACIONES ── */
var n4Sesiones=[], n4Idx=0, n4Aciertos=0, n4Detalle=[];
var n4Construido=[], n4Actual=null, n4Bloqueado=false;
var n4FalloEnEsta=false;   /* true si el estudiante ya se equivocó en la oración actual */

/* Junta las palabras de todas las oraciones del nivel para usarlas como distractores */
function n4BancoGlobal(){
  var set={};
  (DATA.nivel4.sesiones||[]).forEach(function(s){
    (s.oracion_completa||'').split(/\s+/).forEach(function(p){ if(p) set[p]=true; });
  });
  return Object.keys(set);
}

function montarN4(num, total){
  document.getElementById('n4-badge').textContent = 'Dictado · Sesión '+num+' de '+total;
  n4Sesiones = DATA.nivel4.sesiones || [];
  n4Idx=0; n4Aciertos=0; n4Detalle=[];
  var instr = DATA.nivel4.instruccion || 'Escucha el audio y toca las palabras en el orden correcto.';
  var elInstr = document.getElementById('n4-instruccion');
  if(elInstr) elInstr.textContent = instr;
  actualizarTopProgress();
  n4NuevaOracion();
  goTo('s-n4');
}

function n4NuevaOracion(){
  if(n4Idx >= n4Sesiones.length){
    var pct = n4Sesiones.length ? Math.round((n4Aciertos/n4Sesiones.length)*100) : 0;
    mostrarResultado(pct, n4Detalle, 'dictado');
    return;
  }
  n4Actual     = n4Sesiones[n4Idx];
  n4Construido = [];
  n4Bloqueado  = false;
  n4FalloEnEsta = false;

  document.getElementById('n4-progreso').textContent = 'Oración '+(n4Idx+1)+' de '+n4Sesiones.length;
  document.getElementById('n4-feedback').textContent = '';
  document.getElementById('n4-feedback').className   = 'pregunta-feedback';
  n4RestaurarPlaceholder();           /* borra el español y deja el texto/color original */
  n4MostrarBotones('comprobar');      /* solo el botón Comprobar visible */

  /* Fichas: palabras de la oración + distractores del banco global, sin repetir */
  var correctas = n4Actual.oracion_completa.split(/\s+/).filter(Boolean);
  var banco = n4BancoGlobal();
  var extra = shuffle(banco.filter(function(p){ return correctas.indexOf(p)===-1; })).slice(0,3);
  var fichas = shuffle(correctas.concat(extra));

  var bank = document.getElementById('n4-bank');
  bank.innerHTML='';
  fichas.forEach(function(gu, idx){
    var chip = document.createElement('button');
    chip.className='ficha-dictado gu';
    chip.textContent=gu;
    chip.dataset.idx=idx;
    chip.onclick=function(){ n4Tocar(chip, gu); };
    bank.appendChild(chip);
  });
  n4RenderBuild();
  setTimeout(n4Reproducir, 400);
}

function n4Reproducir(){
  if(!n4Actual || !n4Actual.audio_oracion_completa) return;
  var btn=document.getElementById('n4-play');
  if(btn) btn.classList.add('sonando');
  playerRef.src=n4Actual.audio_oracion_completa;
  playerRef.play().catch(function(){});
  playerRef.onended=function(){ playerRef.onended=null; if(btn) btn.classList.remove('sonando'); };
}

function n4Tocar(chip, gu){
  if(n4Bloqueado) return;
  var btn=document.getElementById('n4-play'); if(btn) btn.classList.remove('sonando');
  playerRef.onended=null;
  chip.classList.add('usada');
  n4Construido.push({gu:gu, idx:chip.dataset.idx});
  n4RenderBuild();
}

function n4RenderBuild(){
  var zone=document.getElementById('n4-build');
  if(zone.classList.contains('con-espanol')) return;   /* no tocar mientras muestra el español */
  zone.innerHTML='';
  if(n4Construido.length===0){ zone.classList.add('vacia'); return; }
  zone.classList.remove('vacia');
  n4Construido.forEach(function(item,i){
    var c=document.createElement('button');
    c.className='ficha-puesta gu';
    c.textContent=item.gu;
    c.onclick=function(){ n4Quitar(i); };
    zone.appendChild(c);
  });
}

function n4Quitar(i){
  if(n4Bloqueado) return;
  var item=n4Construido[i];
  var chip=document.querySelector('#n4-bank .ficha-dictado[data-idx="'+item.idx+'"]');
  if(chip) chip.classList.remove('usada');
  n4Construido.splice(i,1);
  n4RenderBuild();
}

function n4Limpiar(){
  if(n4Bloqueado) return;
  n4Construido=[];
  document.querySelectorAll('#n4-bank .ficha-dictado').forEach(function(c){ c.classList.remove('usada'); });
  n4RenderBuild();
}

function n4Comprobar(){
  if(n4Bloqueado || n4Construido.length===0 || !n4Actual) return;
  var intento=n4Construido.map(function(x){ return x.gu; });
  var correcto=n4Actual.oracion_completa.split(/\s+/).filter(Boolean);
  var ok = intento.length===correcto.length && intento.every(function(g,i){ return g===correcto[i]; });

  var fb=document.getElementById('n4-feedback');

  if(ok){
    n4Bloqueado=true;
    fb.textContent=''; fb.className='pregunta-feedback';
    /* El español aparece en el cuadro, en amarillo */
    n4MostrarEspanol(n4Actual.espanol||'');
    sfx.src=SND_OK; sfx.play().catch(function(){});

    /* Cuenta como acierto SOLO si no hubo fallo previo en esta oración */
    if(!n4FalloEnEsta) n4Aciertos++;
    n4Detalle.push({gu:n4Actual.oracion_completa, ok:!n4FalloEnEsta,
                    usuario:intento.join(' ')||'—', real:correcto.join(' ')});

    /* Suena la oración completa, y luego avanza (borrando el español antes) */
    if(n4Actual.audio_oracion_completa){
      setTimeout(function(){ playerRef.src=n4Actual.audio_oracion_completa; playerRef.play().catch(function(){}); }, 650);
    }
    n4Idx++;
    setTimeout(n4NuevaOracion, 2200);
  } else {
    /* Falla: no avanza. Suena error y aparecen Reintentar / Saltar. */
    n4Bloqueado=true;
    n4FalloEnEsta=true;
    fb.textContent='✗ No es lo que dice el audio';
    fb.className='pregunta-feedback err';
    sfx.src=SND_ERR; sfx.play().catch(function(){});
    n4MostrarBotones('reintentar');
  }
}

function n4Reintentar(){
  n4Bloqueado=false;
  n4Limpiar();                         /* devuelve las fichas al banco */
  document.getElementById('n4-feedback').textContent='';
  document.getElementById('n4-feedback').className='pregunta-feedback';
  n4MostrarBotones('comprobar');
  setTimeout(n4Reproducir, 300);       /* vuelve a sonar la oración */
}

function n4Saltar(){
  /* Cuenta como fallo y pasa a la siguiente */
  var correcto=n4Actual.oracion_completa.split(/\s+/).filter(Boolean);
  n4Detalle.push({gu:n4Actual.oracion_completa, ok:false,
                  usuario:'(saltada)', real:correcto.join(' ')});
  n4Idx++;
  n4NuevaOracion();
}

/* ── Placeholder: mostrar español (amarillo) / restaurar original ──
   El texto original vive en el CSS como ::before de .vacia.
   Para mostrar el español, inyectamos un hijo real y ocultamos el ::before
   con la clase 'con-espanol'; al restaurar, quitamos todo y vuelve el ::before. */
function n4MostrarEspanol(texto){
  var zone=document.getElementById('n4-build');
  zone.innerHTML='';
  zone.classList.remove('vacia');
  zone.classList.add('con-espanol');
  var span=document.createElement('div');
  span.className='dictado-espanol';
  span.textContent=texto;
  zone.appendChild(span);
}

function n4RestaurarPlaceholder(){
  var zone=document.getElementById('n4-build');
  zone.classList.remove('con-espanol');
  zone.innerHTML='';
  zone.classList.add('vacia');       /* reaparece el ::before original con su color */
}

/* ── Mostrar el par de botones correcto según el momento ── */
function n4MostrarBotones(modo){
  var comprobar=document.getElementById('n4-comprobar');
  var limpiar  =document.getElementById('n4-limpiar');
  var reintentar=document.getElementById('n4-reintentar');
  var saltar   =document.getElementById('n4-saltar');
  if(modo==='reintentar'){
    if(comprobar) comprobar.style.display='none';
    if(limpiar)   limpiar.style.display='none';
    if(reintentar) reintentar.style.display='';
    if(saltar)     saltar.style.display='';
  } else {
    if(comprobar) comprobar.style.display='';
    if(limpiar)   limpiar.style.display='';
    if(reintentar) reintentar.style.display='none';
    if(saltar)     saltar.style.display='none';
  }
}

/* ── NIVEL 5 ── */
var n5Preguntas=[];

function montarN5(num, total){
  document.getElementById('n5-badge').textContent = 'Nivel 5 · Sesión '+num+' de '+total;
  var vid = document.getElementById('n5-video');
  vid.src = sesionData.video; vid.load();
  n5Preguntas  = sesionData.preguntas || [];
  audioChunks  = {};
  recordingId  = null;
  actualizarTopProgress();
  montarPreguntasN5();
  goTo('s-n5');
}

function montarPreguntasN5(){
  var lista = document.getElementById('n5-respuesta-wrap');
  lista.innerHTML = '';

  n5Preguntas.forEach(function(p, i){
    var div       = document.createElement('div');
    div.className = 'pronuncia-item';
    div.innerHTML =
      '<div class="pi-top">'+
        '<div class="pi-flex">'+                                     /* sustituye style="flex:1" */
          '<div class="pi-pregunta-label">Pregunta '+(i+1)+'</div>'+ /* sustituye style="font-size:0.75rem;..." */
          '<div class="pi-gu pi-gu-grande gu">'+p.pregunta+'</div>'+ /* sustituye style="font-size:1.6rem" */
        '</div>'+
        '<div class="pi-btns">'+
          '<button class="btn-grabar" id="btn-g5-'+i+'" onclick="toggleGrabacionN5('+i+')">🎙 Grabar</button>'+
        '</div>'+
      '</div>'+
      '<div class="spinner" id="load5-'+i+'">⏳ Evaluando...</div>'+
      '<div class="eval-panel" id="eval5-'+i+'">'+
        '<div class="eval-nota"    id="nota5-'+i+'"></div>'+
        '<div class="eval-trans"   id="trans5-'+i+'"></div>'+
        '<div class="eval-consejo" id="consejo5-'+i+'"></div>'+
      '</div>';
    lista.appendChild(div);
  });

  document.getElementById('n5-btn-verificar-row').style.display = 'flex';
}

function toggleGrabacionN5(i){
  var correcta = n5Preguntas[i] ? n5Preguntas[i].correcta : '';
  var pregunta  = n5Preguntas[i] ? n5Preguntas[i].pregunta  : '';
  var btn = document.getElementById('btn-g5-'+i);
  if(recordingId === 'n5-'+i){
    mediaRecorder.stop(); recordingId=null;
    btn.innerHTML='🎙 Grabar'; btn.classList.remove('recording');
    return;
  }
  if(mediaRecorder && mediaRecorder.state==='recording') mediaRecorder.stop();
  recordingId='n5-'+i;
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
    mediaRecorder=new MediaRecorder(stream);
    audioChunks[i]=[];
    mediaRecorder.ondataavailable=function(e){ if(e.data&&e.data.size>0) audioChunks[i].push(e.data); };
    mediaRecorder.onstop=function(){
      var blob=new Blob(audioChunks[i],{type:mediaRecorder.mimeType||'audio/webm'});
      convertirYEnviarN5(blob,i,correcta,pregunta);
      stream.getTracks().forEach(function(t){t.stop();});
    };
    mediaRecorder.start();
    btn.innerHTML='🛑 Detener'; btn.classList.add('recording');
  }).catch(function(){alert('Verifica los permisos de tu micrófono.');});
}

function convertirYEnviarN5(blob,i,correcta,pregunta){
  var reader=new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend=function(){
    enviarAGeminiN5(reader.result.split(',')[1],blob.type||'audio/webm',correcta,pregunta,i);
  };
}

function enviarAGeminiN5(audioBase64,mimeType,correcta,pregunta,i){
  var spinner=document.getElementById('load5-'+i);
  var panel=document.getElementById('eval5-'+i);
  if(spinner) spinner.style.display='block';
  if(panel)   panel.style.display='none';
  fetch(BACKEND_URL+'/api/evaluar-audio',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-access-token':sessionStorage.getItem('accessToken')||''},
    body:JSON.stringify({audioBase64,mimeType,fraseObjetivo:correcta,pregunta})
  })
  .then(function(r){if(!r.ok)throw new Error('Error');return r.json();})
  .then(function(data){
    document.getElementById('nota5-'+i).innerHTML   ='⭐ Nota: '+data.nota+'/10';
    document.getElementById('trans5-'+i).innerHTML  ='Gemini entendió: "'+data.transcripcion+'"';
    document.getElementById('consejo5-'+i).innerHTML='💡 '+data.consejo;
    document.getElementById('nota5-'+i).style.color =data.nota>=7?'var(--saffron)':'var(--wrong-text)';
    if(panel) panel.style.display='block';
  })
  .catch(function(){
    document.getElementById('nota5-'+i).innerHTML='⚠️ No se pudo conectar con Gemini.';
    if(panel) panel.style.display='block';
  })
  .finally(function(){if(spinner) spinner.style.display='none';});
}

function verificarN5(){
  playerRef.pause();
  var notas=[],detalle=[],todos=true;
  n5Preguntas.forEach(function(p,i){
    var notaEl=document.getElementById('nota5-'+i);
    if(!notaEl||!notaEl.textContent.includes('/10')){todos=false;return;}
    var match=notaEl.textContent.match(/(\d+(?:\.\d+)?)\/10/);
    if(match){var n=parseFloat(match[1]);notas.push(n);detalle.push({gu:p.pregunta,nota:n,ok:n>=7});}
  });
  if(!todos||notas.length===0){alert('Graba y evalúa todas las preguntas antes de verificar.');return;}
  mostrarResultado(Math.round(notas.reduce(function(a,b){return a+b;},0)/notas.length*10),detalle,'gemini5');
}

function repetirSesionN5(){ montarN5(sesionNum, sesionTotal); }

/* ── Progreso ── */
function actualizarTopProgress(){
  document.getElementById('top-fill').style.width =
    sesionTotal > 0 ? Math.round((sesionNum/sesionTotal)*100)+'%' : '0%';
}

/* ── Verificar disponibilidad de niveles ── */
function verificarBotonesNivel(){
  function nivelTieneContenido(d){
    if(!d) return false;
    if(d.sesiones && d.sesiones.length) return true;
    if(d.texto && d.elementos && d.elementos.length) return true;
    if(d.elementos && d.elementos.length) return true;
    return false;
  }
  [1,2,3,4,5].forEach(function(n){
    var btn = document.getElementById('btn-nivel-'+n);
    if(!btn) return;
    if(!nivelTieneContenido(datosNivel(n))){
      btn.classList.add('disabled');
      var sub = btn.querySelector('.sub');
      if(sub) sub.textContent = 'No disponible para esta lección';
    }
  });
  
  var btnVideo = document.getElementById('btn-video-jw');
  if(btnVideo){
    if(DATA.video_jw){
      btnVideo.href = 'video_jw.html?leccion=' + _leccionRaw;
    } else {
      btnVideo.classList.add('disabled');
      var subV = btnVideo.querySelector('.sub');
      if(subV) subV.textContent = 'No disponible para esta lección';
    }
  }

  var btnCantar = document.getElementById('btn-cantar-jw');
  if(btnCantar){
    if(DATA.cantar_jw){
      btnCantar.href = 'cantar_jw.html?leccion=' + _leccionRaw;
    } else {
      btnCantar.classList.add('disabled');
      var subC = btnCantar.querySelector('.sub');
      if(subC) subC.textContent = 'No disponible para esta lección';
    }
  }
}

/* ── Init ── */
fetch(JSON_URL)
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    DATA = data;
    verificarBotonesNivel();
  })
  .catch(function(){
    document.querySelector('.wrap').innerHTML =
      '<p class="error-carga">No se pudo cargar el contenido. Revisa tu conexión.</p>';
  });

/* ── Verificador de versión ── */
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
