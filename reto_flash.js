const player  = document.getElementById('player');
const sfx     = document.getElementById('sfx');
const SND_OK  = 'https://rubenbhai.github.io/GujaratiResources/audios/clase_1_1/Clase_1_1_Correcto.mp3';
const SND_ERR = 'https://rubenbhai.github.io/GujaratiResources/audios/clase_1_1/Clase_1_1_Incorrecto.mp3';

const _params        = new URLSearchParams(location.search);
const _jsonKey       = _params.get('json') || '';
const _matchLeccion  = _jsonKey.match(/Leccion_(\d+_\d+_\d+)/);
const _folderLeccion = _matchLeccion ? _matchLeccion[1] : '';
const _leccionRaw    = _folderLeccion.replace(/_/g, '.');
const navMapa        = document.getElementById('nav-mapa');
navMapa.href         = 'guia_navegacion.html?leccion=' + _leccionRaw;

const _repasoParam   = _params.get('repaso')   || '';
const _palabrasParam = _params.get('palabras') || '';
const _nextUrl       = _params.get('next')     || '';
const MODO_REPASO    = !!_repasoParam || !!_palabrasParam;
const _lecRepaso     = (_repasoParam || _palabrasParam).replace(/\./g, '_');

const JSON_URL = _palabrasParam
  ? 'data/' + _lecRepaso + '/reto_flash_Leccion_' + _lecRepaso + '_palabras.json'
  : (_repasoParam
      ? 'data/' + _lecRepaso + '/reto_flash_Leccion_' + _lecRepaso + '_repaso.json'
      : (_jsonKey && _folderLeccion
          ? 'data/' + _folderLeccion + '/reto_flash_' + _jsonKey + '.json'
          : (_jsonKey ? 'data/reto_flash_' + _jsonKey + '.json' : '')));

if(MODO_REPASO) navMapa.href = 'guia_navegacion.html?leccion=' + (_repasoParam || _palabrasParam);

let letters       = [];
let extras        = [];
let LetrasYFrases = [];
let hayFaseC      = false;
let B_TOTAL       = 10;
let C_ROUNDS      = 10;

var REPASO_CFG = {};

function shuffle(a){ return a.slice().sort(function(){ return Math.random()-0.5; }); }

/* Gujarati + significado. Solo font-size permanece inline (es dinámico). */
function htmlConSignificado(item, sigRem){
  var sig = item.significado
    ? '<div class="guj-sig" style="font-size:' + sigRem + 'rem;">' + item.significado + '</div>'
    : '';
  return '<div class="guj-card-content"><div>' + item.letter + '</div>' + sig + '</div>';
}

/* Baraja el conjunto completo y lo recorre; cuando se agota, vuelve a barajar.
   Garantiza que todos los símbolos aparezcan antes de repetir ninguno, y evita
   que el primero de una baraja nueva sea igual al último de la anterior. */
function indicesAleatorios(cantidad){
  var total = LetrasYFrases.length, out = [], bolsa = [];
  if(total === 0) return out;

  function rellenarBolsa(evitarPrimero){
    bolsa = shuffle(base());
    if(bolsa.length > 1 && evitarPrimero !== null && bolsa[0] === evitarPrimero){
      bolsa.push(bolsa.shift());   /* si el primero repite el anterior, va al final */
    }
  }
  function base(){
    var a = [];
    for(var i = 0; i < total; i++) a.push(i);
    return a;
  }

  for(var i = 0; i < cantidad; i++){
    if(bolsa.length === 0) rellenarBolsa(out.length ? out[out.length-1] : null);
    out.push(bolsa.shift());
  }
  return out;
}

function goTo(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

/* ── INTRO ── */
function montarIntro(){
  if(MODO_REPASO){
    var unidad = REPASO_CFG.unidad || 'letras';
    document.querySelector('#s-intro h1').textContent =
      REPASO_CFG.titulo || 'Repaso final de lectura';
    document.getElementById('intro-desc').textContent =
      'Verás las ' + contarReales() + ' ' + unidad + ' ' + R_VUELTAS + ' veces cada una.';
    document.querySelector('#screen-repaso .badge').textContent =
      REPASO_CFG.badge || 'Repaso final';
    document.querySelector('#screen-repaso .lead').textContent =
      'Pronuncia lo que se ilumina. Luego escucharás la respuesta.';
    document.getElementById('btn-empezar').onclick = iniciarRepaso;
    return;
  }
  var n = LetrasYFrases.length;
  document.getElementById('intro-desc').textContent =
    n + (n===1 ? ' símbolo para practicar.' : ' símbolos para practicar.');
}

function iniciarFaseB(){ goTo('screen-b'); initB(); }

/* ── FASE B ── */
var bIdx=0, bQueue=[], bTimer=null, bCardBaseFont=null, audiosB=[];

function initB(){
  bIdx = 0;
  var idx = indicesAleatorios(B_TOTAL);
  bQueue  = idx.map(function(i){ return LetrasYFrases[i]; });
  audiosB = bQueue.map(function(o){ return o.audio; });
  document.getElementById('btn-saltar-b').textContent = hayFaseC ? '¡Vamos a emparejar! →' : 'Terminar →';
  bShowCard();
}

function bShowCard(){
  if(bTimer) clearTimeout(bTimer);
  var item = bQueue[bIdx];
  document.getElementById('b-progress').textContent = (bIdx+1)+' de '+B_TOTAL;
  var card = document.getElementById('b-card');
  var ans  = document.getElementById('b-answer');
  var bar  = document.getElementById('b-timer');

  card.innerHTML = htmlConSignificado(item, 1.8);
  if(bCardBaseFont===null) bCardBaseFont = parseFloat(getComputedStyle(card).fontSize);
  card.style.fontSize = (item.letter.length>=4 ? bCardBaseFont*0.6 : bCardBaseFont)+'px';
  card.classList.remove('reveal');
  ans.textContent=''; ans.classList.remove('visible');

  var prev = document.getElementById('btn-b-prev');
  if(bIdx===0) prev.classList.add('btn-disabled');
  else         prev.classList.remove('btn-disabled');

  bar.style.transition='none'; bar.style.transform='scaleX(1)';
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    bar.style.transition='transform 2s linear'; bar.style.transform='scaleX(0)';
  }); });
  bTimer = setTimeout(function(){ bReveal(item); }, 2000);
}

function bReveal(item){
  document.getElementById('b-card').classList.add('reveal');
  var ans = document.getElementById('b-answer');
  ans.textContent=item.answer; ans.classList.add('visible');
  player.src=audiosB[bIdx]; player.playbackRate=1.0; player.play().catch(function(){});
}

function bPrev(){
  player.pause(); player.currentTime=0;
  if(bIdx>0){ bIdx--; bShowCard(); }
}

function bNext(){
  player.pause(); player.currentTime=0;
  bIdx++;
  if(bIdx<B_TOTAL) bShowCard();
  else             terminarFaseB();
}

function terminarFaseB(){
  if(bTimer) clearTimeout(bTimer);
  player.pause();
  if(hayFaseC){ goTo('screen-c'); initC(); }
  else         { mostrarResultadoFinal(); }
}

/* ── FASE C ── */
var cIdx=0, cScore=0, cCurrentItem=null, cLayout=[], cLocked=false, audiosC=[];

function initC(){
  var idx    = indicesAleatorios(C_ROUNDS);
  var cQueue = idx.map(function(i){ return LetrasYFrases[i]; });
  audiosC    = cQueue.map(function(o){ return o.audio; });
  window._cQueue = cQueue;
  cIdx=0; cScore=0; cLocked=false;
  document.getElementById('c-score').textContent = '0';
  document.getElementById('c-total').textContent = C_ROUNDS;
  cShowRound();
}

function cShowRound(){
  if(cIdx>=C_ROUNDS){ mostrarResultadoFinal(); return; }
  cLocked=false;
  cCurrentItem = window._cQueue[cIdx];

  var numBotones   = Math.min(4, LetrasYFrases.length);
  var distractores = shuffle(LetrasYFrases.filter(function(l){ return l.letter!==cCurrentItem.letter; })).slice(0, numBotones-1);
  var pool         = shuffle(distractores.concat([cCurrentItem]));
  cLayout          = pool.map(function(l){ return LetrasYFrases.indexOf(l); });

  var cont = document.getElementById('match-letters-container');
  cont.innerHTML='';
  for(var i=0; i<pool.length; i++){
    var btn       = document.createElement('button');
    btn.className = 'match-btn';
    btn.id        = 'mb-'+i;
    if(pool[i].letter.length>=4) btn.style.fontSize='3rem';
    btn.innerHTML = htmlConSignificado(pool[i], 1.2);
    btn.onclick   = (function(idx){ return function(){ matchTap(idx); }; })(i);
    cont.appendChild(btn);
  }
  document.getElementById('c-prompt').innerHTML='&nbsp;';
  setTimeout(function(){ player.src=audiosC[cIdx]; player.play().catch(function(){}); }, 300);
}

function matchReplay(){ player.src=audiosC[cIdx]; player.play().catch(function(){}); }

function matchTap(btnIdx){
  if(cLocked) return;
  var tapped  = LetrasYFrases[cLayout[btnIdx]]; if(!tapped) return;
  var correct = tapped.letter===cCurrentItem.letter;
  var btn     = document.getElementById('mb-'+btnIdx);
  if(correct){
    cLocked=true;
    btn.classList.add('correct');
    cScore++;
    document.getElementById('c-score').textContent = cScore;
    document.getElementById('c-prompt').innerHTML  = '✔ ¡Correcto! — <strong>'+cCurrentItem.answer+'</strong>';
    sfx.src=SND_OK; sfx.play().catch(function(){});
    cIdx++;
    setTimeout(cShowRound, 1200);
  } else {
    btn.classList.add('wrong');
    document.getElementById('c-prompt').innerHTML='✖ ¡Inténtalo de nuevo!';
    sfx.src=SND_ERR; sfx.play().catch(function(){});
    setTimeout(function(){ btn.classList.remove('wrong'); player.src=audiosC[cIdx]; player.play().catch(function(){}); }, 1000);
  }
}

/* ── FASE REPASO (cuadrícula de lectura) ── */
var rQueue = [], rIdx = 0, rDetenido = false;
var rTimer1 = null, rTimer2 = null, rTimer3 = null, rTimer4 = null;
var R_VUELTAS = 2, R_ESPERA_MS = 1500, R_PAUSA_MS = 500, R_ANSWER_MS = 1000;
var R_COLUMNAS = 4, R_ESTILO = '';
var rToken = 0;

function esVacia(o){ return !o || o.vacia === true || !o.letter; }

function contarReales(){
  var n = 0;
  for(var i = 0; i < LetrasYFrases.length; i++) if(!esVacia(LetrasYFrases[i])) n++;
  return n;
}

/* El orden del JSON es el orden de la cuadrícula. */
function montarGridRepaso(){
  var cont = document.getElementById('repaso-grid');
  cont.innerHTML = '';

  cont.style.gridTemplateColumns = 'repeat(' + R_COLUMNAS + ',1fr)';
  cont.className = 'repaso-grid' + (R_ESTILO ? ' grid-' + R_ESTILO : '');

  for(var i = 0; i < LetrasYFrases.length; i++){
    var c = document.createElement('div');
    c.id = 'rc-' + i;
    if(esVacia(LetrasYFrases[i])){
      c.className = 'repaso-celda vacia';
    } else {
      c.className = 'repaso-celda';
      c.innerHTML = '<span class="rc-letra">' + LetrasYFrases[i].letter + '</span>' +
                    '<span class="rc-timer" id="rt-' + i + '"><i></i></span>' +
                    '<span class="rc-answer" id="ra-' + i + '"></span>';
    }
    cont.appendChild(c);
  }
}

/* 3 vueltas barajadas; evita repetir el mismo cuadrante en la unión entre vueltas. */
function construirColaRepaso(){
  var base = [];
  for(var i = 0; i < LetrasYFrases.length; i++) if(!esVacia(LetrasYFrases[i])) base.push(i);
  var cola = [], prev = -1;
  for(var v = 0; v < R_VUELTAS; v++){
    var idx = shuffle(base);
    if(idx.length > 1 && idx[0] === prev){ var t = idx[0]; idx[0] = idx[1]; idx[1] = t; }
    prev = idx[idx.length - 1];
    cola = cola.concat(idx);
  }
  return cola;
}

function iniciarRepaso(){
  montarGridRepaso();
  rQueue = construirColaRepaso();
  rIdx = 0; rDetenido = false;
  goTo('screen-repaso');
  rSiguiente();
}

function rSiguiente(){
  if(rDetenido) return;
  if(rIdx >= rQueue.length){ finalizarRepaso(); return; }
  
  var miToken = rToken;
  var i     = rQueue[rIdx];
  var celda = document.getElementById('rc-' + i);
  var ansEl = document.getElementById('ra-' + i);

  var timEl = document.getElementById('rt-' + i);
  var timBar = timEl.querySelector('i');

  celda.classList.add('activa');

  timBar.style.transition = 'none';
  timBar.style.transform  = 'scaleX(1)';
  timEl.classList.add('visible');
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    timBar.style.transition = 'transform ' + (R_ESPERA_MS / 1000) + 's linear';
    timBar.style.transform  = 'scaleX(0)';
  }); });

  if(celda.scrollIntoView) celda.scrollIntoView({ block:'nearest', behavior:'smooth' });
  document.getElementById('top-fill').style.width =
    Math.round(((rIdx + 1) / rQueue.length) * 100) + '%';

  rTimer1 = setTimeout(function(){
    if(rDetenido || miToken !== rToken) return;
    celda.classList.add('sonando');

    /* Romanizado: aparece con el audio y dura exactamente R_ANSWER_MS */
    var tInicioAudio = Date.now();
    ansEl.textContent = LetrasYFrases[i].answer || '';
    ansEl.classList.add('visible');
    rTimer3 = setTimeout(function(){
      ansEl.classList.remove('visible');
      timEl.classList.remove('visible');
      ansEl.textContent = '';
    }, R_ANSWER_MS);

    var avanzo = false;
    function avanzar(){
      if(avanzo || rDetenido || miToken !== rToken) return;
      avanzo = true;
      player.onended = null; player.onerror = null;
      rIdx++;
      /* La celda sigue encendida hasta que el romanizado desaparezca */
      var restante = Math.max(0, R_ANSWER_MS - (Date.now() - tInicioAudio));
      rTimer4 = setTimeout(function(){
        celda.classList.remove('activa', 'sonando');
        rTimer2 = setTimeout(rSiguiente, R_PAUSA_MS);
      }, restante);
    }

    player.onended = avanzar;
    player.onerror = avanzar;
    player.src = fuenteAudio(LetrasYFrases[i], esVozHombre());
    player.playbackRate = 1.0;
    player.play().catch(function(){ avanzar(); });
  }, R_ESPERA_MS);
}

function salirRepaso(){
  if(_nextUrl) window.location.href = _nextUrl;
  else         history.back();
}

function detenerRepaso(){
  rToken++;
  rDetenido = true;
  clearTimeout(rTimer1); clearTimeout(rTimer2);
  clearTimeout(rTimer3); clearTimeout(rTimer4);
  player.onended = null; player.onerror = null;
  player.pause();
  salirRepaso();
}

function finalizarRepaso(){
  document.getElementById('top-fill').style.width = '100%';
  var btn = document.getElementById('btn-detener-repaso');
  btn.textContent = '✓ Continuar';
  btn.onclick = salirRepaso;
}

/* ── RESULTADO ── */
function evalMsgJuego(pct){
  if(pct>=91) return {emoji:'🏆',msg:'¡Felicidades!'};
  if(pct>=81) return {emoji:'⭐',msg:'Muy bien'};
  if(pct>=71) return {emoji:'👍',msg:'Ya casi lo logras'};
  if(pct>=61) return {emoji:'💪',msg:'Vas bien...'};
  return            {emoji:'🔄',msg:'Sigue practicando'};
}

function mostrarResultadoFinal(){
  document.getElementById('top-fill').style.width='100%';
  if(hayFaseC){
    var pct=Math.round((cScore/C_ROUNDS)*100), ev=evalMsgJuego(pct);
    document.getElementById('res-emoji').textContent=ev.emoji;
    document.getElementById('res-msg').textContent  =ev.msg;
    document.getElementById('res-pct').textContent  ='Correctas: '+cScore+' / '+C_ROUNDS+' ('+pct+'%)';
  } else {
    document.getElementById('res-emoji').textContent='🎉';
    document.getElementById('res-msg').textContent  ='¡Bien hecho!';
    document.getElementById('res-pct').textContent  ='';
  }
  goTo('s-resultado');
}

function reiniciarTodo(){
  document.getElementById('top-fill').style.width='0%';
  goTo('s-intro');
}

/* ── ARRANQUE ── */
if(!JSON_URL){
  document.querySelector('.wrap').innerHTML =
    '<p class="error-carga">Falta el parámetro <strong>?json=</strong> en la URL.</p>';
} else {
  fetch(JSON_URL+'?t='+Date.now(), { cache:'no-store' })
    .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
    .then(function(data){
      letters       = data.letters || [];
      extras        = data.extras  || [];
      LetrasYFrases = letters.concat(extras);
      hayFaseC      = LetrasYFrases.length >= 2;
      B_TOTAL       = data.rondas_b || LetrasYFrases.length;
      C_ROUNDS      = data.rondas_c || LetrasYFrases.length;

      if(data.columnas)  R_COLUMNAS  = data.columnas;
      if(data.espera_ms) R_ESPERA_MS = data.espera_ms;
      if(data.vueltas)   R_VUELTAS   = data.vueltas;
      R_ESTILO = data.estilo || '';
      REPASO_CFG = { titulo: data.titulo, badge: data.badge, unidad: data.unidad };

      montarIntro();
    })
    .catch(function(e){
      console.error('FALLO REPASO:', e);
      document.querySelector('.wrap').innerHTML =
        '<p class="error-carga">No se pudo cargar el contenido. Revisa tu conexión.</p>';
    });
}

/* Deriva la URL masculina (_h_) a partir de la femenina (_m_).
   Sustituye solo en el nombre del archivo, nunca en la ruta. */
function fuenteAudio(item, esHombre){
  if(!esHombre) return item.audio;
  if(item.audio_h) return item.audio_h;      /* palabras: campo explícito */
  var c = item.audio.lastIndexOf('/');       /* letras: deriva _m_ → _h_ */
  return item.audio.slice(0, c + 1) + item.audio.slice(c + 1).replace('_m_', '_h_');
}

/* A) Alterna en cada ronda: mujer, hombre, mujer, hombre... */
function esVozHombre(){ return rIdx % 2 === 1; }

/* B) Alterna por vuelta completa: 1ª vuelta mujer, 2ª hombre, 3ª mujer */
function esVozHombre(){ return Math.floor(rIdx / contarReales()) % 2 === 1; }

/* C) Al azar en cada ronda */
function esVozHombre(){ return Math.random() < 0.5; }

function limpiarCeldas(){
  var celdas = document.querySelectorAll('#repaso-grid .repaso-celda');
  for(var k = 0; k < celdas.length; k++){
    celdas[k].classList.remove('activa', 'sonando');
    var t = celdas[k].querySelector('.rc-timer');
    var a = celdas[k].querySelector('.rc-answer');
    if(t) t.classList.remove('visible');
    if(a){ a.classList.remove('visible'); a.textContent = ''; }
  }
}

function reiniciarRepaso(){
  rToken++;                                   /* invalida la ronda en curso */
  clearTimeout(rTimer1); clearTimeout(rTimer2);
  clearTimeout(rTimer3); clearTimeout(rTimer4);
  player.onended = null; player.onerror = null;
  player.pause(); player.currentTime = 0;
  limpiarCeldas();
  document.getElementById('top-fill').style.width = '0%';
  var btn = document.getElementById('btn-detener-repaso');
  btn.textContent = '■ Terminar';
  btn.onclick = detenerRepaso;
  rQueue = construirColaRepaso();
  rIdx = 0; rDetenido = false;
  rSiguiente();
}

/* Traduce leccion_palabra_*.json a la forma que entiende el motor */
var R_MIN_CARACT = 3;   /* solo palabras de más de 2 caracteres */

function largoGu(s){
  return (s || '').replace(/[\s?.!,\u2026]/g, '').length;
}

function adaptarPalabras(data){
  var src = data.palabras || [], out = [];
  for(var i = 0; i < src.length; i++){
    if(largoGu(src[i].gujarati) < R_MIN_CARACT) continue;
    out.push({
      letter:  src[i].gujarati,
      answer:  src[i].significado || '',
      audio:   src[i].audioM || src[i].audioH || '',
      audio_h: src[i].audioH || src[i].audioM || ''
    });
  }
  return { letters: out, extras: [] };
}


/* ── Verificador de versión ── */
(function(){
  var VERSION_URL='https://rubenbhai.github.io/GujaratiResources/version.txt';
  fetch(VERSION_URL+'?t='+Date.now(), { cache:'no-store' })
    .then(function(r){ return r.text(); })
    .then(function(serverV){
      serverV=serverV.trim();
      var localV=null;
      try { localV=localStorage.getItem('appVersion'); } catch(e){}
      if(localV===null){ try { localStorage.setItem('appVersion',serverV); } catch(e){} }
      else if(localV!==serverV){ try { localStorage.setItem('appVersion',serverV); } catch(e){} location.reload(true); }
    })
    .catch(function(){});
})();