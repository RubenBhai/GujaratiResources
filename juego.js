const player  = document.getElementById('player');
const sfx     = document.getElementById('sfx');
const BASE    = '.';
const SND_OK  = BASE + '/audios/clase_1_1/Clase_1_1_Correcto.mp3';
const SND_ERR = BASE + '/audios/clase_1_1/Clase_1_1_Incorrecto.mp3';

const _params        = new URLSearchParams(location.search);
const _leccion       = (_params.get('leccion') || '1.1.1').replace(/\./g, '_');
const JSON_URL       = 'data/' + _leccion + '/juego_clase_' + _leccion + '.json';

const _leccionRaw    = _params.get('leccion') || '1.1.1';
const _partesLeccion = _leccionRaw.split('.');
const _moduloCorto   = _partesLeccion[0] + '.' + _partesLeccion[1];
const _leccionCorta  = _partesLeccion[2];

document.getElementById('nav-mapa').href       = 'guia_navegacion.html?leccion='  + _leccionRaw;
document.getElementById('nav-home').href       = 'leccion_intro.html?leccion='     + _leccionRaw;
document.getElementById('nav-practica').href   = 'practica.html?modulo='           + _moduloCorto + '&leccion=' + _leccionCorta;
document.getElementById('btn-finalizar').href  = 'leccion_notas.html?leccion='     + _leccionRaw;

let letters       = [];
let extras        = [];
let LetrasYFrases = [];

/* Genera N índices aleatorios del array master, evitando repetición inmediata */
function indicesAleatorios(cantidad){
  var MAX_INTENTOS = 12;
  var total = LetrasYFrases.length;
  var out   = [];
  for(var i = 0; i < cantidad; i++){
    var idx      = Math.floor(Math.random() * total);
    var intentos = 0;
    while(out.length > 0 && idx === out[out.length - 1] && intentos < MAX_INTENTOS){
      idx = Math.floor(Math.random() * total);
      intentos++;
    }
    out.push(idx);
  }
  return out;
}

function shuffle(a){ return a.slice().sort(function(){ return Math.random() - 0.5; }); }

/* Gujarati grande + significado pequeño. Solo font-size queda inline (es dinámico). */
function htmlConSignificado(item, sigRem){
  var sig = item.significado
    ? '<div class="guj-sig" style="font-size:' + sigRem + 'rem;">' + item.significado + '</div>'
    : '';
  return '<div class="guj-card-content"><div>' + item.letter + '</div>' + sig + '</div>';
}

/* Calcula font-size en px para que el texto quepa en el contenedor */
var _medidorSpan = null;
function fontSizeParaAncho(el, texto, tamanoMaximoPx){
  if(!_medidorSpan){
    _medidorSpan = document.createElement('span');
    _medidorSpan.style.position   = 'absolute';
    _medidorSpan.style.visibility = 'hidden';
    _medidorSpan.style.whiteSpace = 'nowrap';
    _medidorSpan.style.lineHeight = '1';
    _medidorSpan.style.fontFamily = "'Noto Serif Gujarati', serif";
    _medidorSpan.style.fontWeight = '700';
    document.body.appendChild(_medidorSpan);
  }
  var TAMANO_PRUEBA       = 100;
  _medidorSpan.style.fontSize = TAMANO_PRUEBA + 'px';
  _medidorSpan.textContent    = texto;
  var anchoMedido      = _medidorSpan.scrollWidth;
  var altoMedido       = _medidorSpan.scrollHeight;
  _medidorSpan.textContent = '';   /* vaciar: con frases largas el span (nowrap, 100px) ensanchaba la página en móvil */
  var anchoDisponible  = el.clientWidth  - 5;
  var altoDisponible   = el.clientHeight - 5;
  var tamanoPorAncho   = anchoMedido > 0 ? (anchoDisponible / anchoMedido) * TAMANO_PRUEBA : TAMANO_PRUEBA;
  var tamanoPorAlto    = altoMedido  > 0 ? (altoDisponible  / altoMedido)  * TAMANO_PRUEBA : TAMANO_PRUEBA;
  var resultado        = Math.min(tamanoPorAncho, tamanoPorAlto);
  if(tamanoMaximoPx) resultado = Math.min(resultado, tamanoMaximoPx);
  return resultado;
}

function goTo(id){
  /* Cancelar timers pendientes de la fase que se abandona: si no, el audio de B
     (o de una ronda vieja de C) suena encima de la pantalla nueva */
  if(bTimer){ clearTimeout(bTimer); bTimer = null; }
  if(cTimer){ clearTimeout(cTimer); cTimer = null; }
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  if(id === 'screen-b') initB();
  if(id === 'screen-c') initC();
}


/* ===== FASE B ===== */
let B_TOTAL = 20;   /* se recalcula al cargar el JSON */
var bIdx = 0, bQueue = [], bTimer = null;
var imagenesB = [], audiosB = [];

function initB(){
  bIdx    = 0;
  var idx = indicesAleatorios(B_TOTAL);
  bQueue  = idx.map(function(i){ return LetrasYFrases[i]; });
  imagenesB = bQueue.map(function(o){ return o.img; });
  audiosB   = bQueue.map(function(o){ return o.audio; });
  bShowCard();
}

function bShowCard(){
  if(bTimer) clearTimeout(bTimer);
  var item = bQueue[bIdx];
  document.getElementById('b-progress').textContent = (bIdx + 1) + ' de ' + B_TOTAL;
  var card = document.getElementById('b-card');
  var ans  = document.getElementById('b-answer');
  var bar  = document.getElementById('b-timer');

  card.innerHTML = htmlConSignificado(item, 1.8);
  card.style.fontSize = fontSizeParaAncho(card, item.letter, 144) + 'px';
  card.classList.remove('reveal');
  ans.textContent = ''; ans.classList.remove('visible');

  var prev = document.getElementById('btn-b-prev');
  if(prev){
    if(bIdx === 0) prev.classList.add('btn-disabled');
    else           prev.classList.remove('btn-disabled');
  }

  bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)';
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    bar.style.transition = 'transform 3s linear'; bar.style.transform = 'scaleX(0)';
  }); });
  bTimer = setTimeout(function(){ bReveal(item); }, 3000);
}

function bReveal(item){
  document.getElementById('b-card').classList.add('reveal');
  var ans = document.getElementById('b-answer');
  ans.textContent = item.answer; ans.classList.add('visible');
  player.src = audiosB[bIdx]; player.playbackRate = 1.0; player.play().catch(function(){});   /* sin gesto previo el navegador puede bloquearlo */
}

function bPrev(){
  player.pause(); player.currentTime = 0;
  if(bIdx > 0){ bIdx--; bShowCard(); }
}

function bNext(){
  player.pause(); player.currentTime = 0;
  bIdx++;
  if(bIdx < B_TOTAL){ bShowCard(); }
  else { goTo('screen-c'); }
}

/* ===== FASE C ===== */
let C_ROUNDS = 20;  /* se recalcula al cargar el JSON */
var cQueue = [], cIdx = 0, cScore = 0;
var cCurrentItem = null, cLayout = [], cLocked = false;
var cTimer = null, cFallo = false;   /* cFallo: hubo error en la ronda actual → no suma */
var imagenesC = [], audiosC = [];

function initC(){
  var idx = indicesAleatorios(C_ROUNDS);
  cQueue  = idx.map(function(i){ return LetrasYFrases[i]; });
  imagenesC = cQueue.map(function(o){ return o.img; });
  audiosC   = cQueue.map(function(o){ return o.audio; });
  cIdx = 0; cScore = 0; cLocked = false;
  document.getElementById('c-score').textContent = '0';
  document.getElementById('c-total').textContent = C_ROUNDS;
  cShowRound();
}

function cShowRound(){
  if(cIdx >= C_ROUNDS){ goTo('screen-fin'); return; }
  cLocked      = false;
  cFallo       = false;
  cCurrentItem = cQueue[cIdx];
  var pool = shuffle(LetrasYFrases.filter(function(l){ return l.letter !== cCurrentItem.letter; })).slice(0,3);
  pool.push(cCurrentItem);
  pool = shuffle(pool);
  cLayout = pool.map(function(l){ return LetrasYFrases.indexOf(l); });
  for(var i = 0; i < 4; i++){
    var btn        = document.getElementById('mb-' + i);
    btn.className  = 'match-btn';
    btn.style.fontSize = fontSizeParaAncho(btn, pool[i].letter, 72) + 'px';
    btn.innerHTML  = htmlConSignificado(pool[i], 1.2);
  }
  document.getElementById('c-prompt').innerHTML = '&nbsp;';
  var rondaIdx = cIdx;   /* si la ronda ya cambió (acierto rápido) o se salió de C (← Volver), no reproducir */
  setTimeout(function(){ if(rondaIdx !== cIdx || cLocked || !enFaseC()) return; player.src = audiosC[cIdx]; player.play().catch(function(){}); }, 300);
}

/* true mientras la pantalla del pareo sigue activa (los timers de C no deben sonar en otra pantalla) */
function enFaseC(){ return document.getElementById('screen-c').classList.contains('active'); }

function matchReplay(){ player.src = audiosC[cIdx]; player.play().catch(function(){}); }

function matchTap(btnIdx){
  if(cLocked) return;
  var tapped  = LetrasYFrases[cLayout[btnIdx]]; if(!tapped) return;
  var correct = tapped.letter === cCurrentItem.letter;
  var btn     = document.getElementById('mb-' + btnIdx);
  if(correct){
    cLocked = true;
    btn.classList.add('correct');
    if(!cFallo) cScore++;   /* solo cuenta si acertó a la primera */
    document.getElementById('c-score').textContent = cScore;
    document.getElementById('c-prompt').innerHTML  = '\u2714 \u00a1Correcto! &mdash; <strong>' + cCurrentItem.answer + '</strong>';
    sfx.src = SND_OK; sfx.play().catch(function(){});
    cIdx++;
    cTimer = setTimeout(function(){ cTimer = null; cShowRound(); }, 1200);
  } else {
    btn.classList.add('wrong');
    cFallo = true;
    document.getElementById('c-prompt').innerHTML = '\u2716 \u00a1Int\u00e9ntalo de nuevo!';
    sfx.src = SND_ERR; sfx.play().catch(function(){});
    var rondaIdx = cIdx;
    setTimeout(function(){
      btn.classList.remove('wrong');
      if(rondaIdx !== cIdx || !enFaseC()) return;   /* ya pasó de ronda o salió de C: no sonar en otra pantalla */
      player.src = audiosC[cIdx]; player.play().catch(function(){});
    }, 1000);
  }
}

function reiniciar(){ goTo('screen-b'); }

/* ===== ARRANQUE ===== */
fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    letters       = data.letters;
    extras        = data.extras;
    LetrasYFrases = letters.concat(extras);
    B_TOTAL       = data.rondas_b || LetrasYFrases.length;
    C_ROUNDS      = data.rondas_c || LetrasYFrases.length;

    var _faseInicial = _params.get('fase');
    
    // Si piden la fase C por URL vamos allá, de lo contrario iniciamos en la B
    if (_faseInicial === 'c') {
      goTo('screen-c');
    } else {
      goTo('screen-b'); 
    }
  })
  .catch(function(){
    document.body.innerHTML =
      '<p class="error-carga">No se pudo cargar el contenido. Revisa tu conexión.</p>';
  });

/* ── Verificador de versión ── */
(function(){
  var VERSION_URL = 'version.txt';
  fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(function(serverV){
      serverV = serverV.trim();
      if(!serverV || serverV.length > 20) return;   // respuesta rara (p.ej. una página 404): no recargar
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