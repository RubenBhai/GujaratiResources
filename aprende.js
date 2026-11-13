/* ============================================================
   SRS — Repaso espaciado estilo Memrise (mejorado)
   Persistencia: localStorage
============================================================ */
const _params = new URLSearchParams(location.search);
// Compatible con dos formatos:
//  a) ?leccion=1.1.1
//  b) ?modulo=1.1&leccion=1  (estilo practica.html)
var _modulo = _params.get('modulo');
var _lecRaw = _params.get('leccion');
var LECCION;
if (_modulo && _lecRaw) {
  LECCION = _modulo + '.' + _lecRaw;       // 1.1 + 1 => 1.1.1
} else {
  LECCION = _lecRaw || '1.1.1';            // 1.1.1
}
const navMapa = document.getElementById('nav-mapa');
navMapa.href = 'guia_navegacion.html?leccion=' + LECCION;

const _leccion    = LECCION.replace(/\./g, '_');
const STORAGE_KEY = 'srs_' + LECCION;
const JSON_URL    = 'data/' + _leccion + '/aprende_clase_' + _leccion + '.json';
const SND_OK      = 'audios/clase_1_1/Clase_1_1_Correcto.mp3';
const SND_ERR     = 'audios/clase_1_1/Clase_1_1_Incorrecto.mp3';

// Intervalos SRS en minutos: nivel 0..6
const INTERVALOS       = [0, 10, 60, 1440, 4320, 10080, 20160]; // 0, 10min, 1h, 1d, 3d, 7d, 14d
const NIVEL_DOMINADO   = 5;
const ITEMS_POR_SESION = 7;
const MAX_OPCIONES     = 4;

const player = document.getElementById('player');
const sfx    = document.getElementById('sfx');

let ITEMS             = [];
let progreso          = {};
let modoActual        = '';
const MATRIZ_KEY = 'matriz_vector_' + LECCION;
let vectorCombinaciones = [];
let combinacionActual = null;
let sesionPracticados = 0;
let sesionAciertos    = 0;

/* ---------- Carga y persistencia ---------- */
function cargarProgreso(){
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    progreso = raw ? JSON.parse(raw) : {};
  } catch(e) { progreso = {}; }
}

function guardarProgreso(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progreso)); } catch(e) {}
}

function estadoItem(id){
  if(!progreso[id]) progreso[id] = { nivel:-1, proximoRepaso:0, aciertos:0, fallos:0 };
  return progreso[id];
}

/* ---------- Clasificación ---------- */
function ahora(){ return Date.now(); }

function itemsNuevos(){
  return ITEMS.filter(function(it){ return estadoItem(it.id).nivel === -1; });
}
function itemsParaRepasar(){
  return ITEMS.filter(function(it){
    var st = estadoItem(it.id);
    return st.nivel >= 0 && st.nivel < NIVEL_DOMINADO && st.proximoRepaso <= ahora();
  });
}
function itemsDominados(){
  return ITEMS.filter(function(it){ return estadoItem(it.id).nivel >= NIVEL_DOMINADO; });
}

/* ---------- Pantallas ---------- */
function mostrar(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function actualizarStats(){
  var nuevos    = itemsNuevos().length;
  var repasos   = itemsParaRepasar().length;
  var dominados = itemsDominados().length;
  document.getElementById('stat-nuevos').textContent    = nuevos;
  document.getElementById('stat-repaso').textContent    = repasos;
  document.getElementById('stat-dominados').textContent = dominados;

  var btnEmpezar = document.getElementById('btn-empezar');
  btnEmpezar.textContent = 'Empezar →';
  var pendientesFuturos = ITEMS.filter(function(it){
    var st = estadoItem(it.id);
    return st.nivel >= 0 && st.nivel < NIVEL_DOMINADO && st.proximoRepaso > Date.now();
  });
  if(nuevos === 0 && repasos === 0 && pendientesFuturos.length > 0){
    var proximos   = pendientesFuturos.map(function(it){ return estadoItem(it.id).proximoRepaso; });
    var minProximo = Math.min.apply(null, proximos);
    var minutos    = Math.round((minProximo - Date.now()) / 60000);
    var tiempoMsg  = minutos < 60 ? 'en ' + Math.max(1, minutos) + ' min'
                   : minutos < 1440 ? 'en ' + Math.round(minutos / 60) + ' h'
                   : 'en ' + Math.round(minutos / 1440) + (Math.round(minutos / 1440) === 1 ? ' día' : ' días');
    btnEmpezar.textContent = '¡Al día! Próximo repaso ' + tiempoMsg + ' →';
  } else if(nuevos === 0 && repasos === 0 && dominados > 0){
    btnEmpezar.textContent = '¡Todo dominado! →';   // nada pendiente: Empezar muestra "Estás al día"
  }
}

/* ---------- Matriz y Vector de Combinaciones ---------- */

function inicializarOImportarMatriz() {
  // 1. Intentamos recuperar el vector si ya existe de una sesión anterior
  try {
    var guardado = localStorage.getItem(MATRIZ_KEY);
    if (guardado) {
      var v = JSON.parse(guardado);
      if (Array.isArray(v)) { vectorCombinaciones = v; return; }   // si está dañada, se reconstruye abajo
    }
  } catch(e) {}

  // 2. Si no existe, construimos el vector combinatorio desde cero
  vectorCombinaciones = [];
  ITEMS.forEach(function(item) {
    
    // Definimos las fases disponibles según la categoría
    var fases = (item.categoria === 'accion') 
      ? ['accion'] 
      : ['aprender', 'reconocer', 'recordar', 'escuchar'];
    
    // Llenamos el vector con la estructura que propusiste
    fases.forEach(function(fase) {
      vectorCombinaciones.push({
        idItem: item.id,
        fase: fase,
        usos: 0  // Arranca en 0 como indicaste
      });
    });
  });
  
  guardarMatriz();
}

function guardarMatriz() {
  try {
    localStorage.setItem(MATRIZ_KEY, JSON.stringify(vectorCombinaciones));
  } catch(e) {}
}

function reiniciarMatrizCompleta() {
  try { localStorage.removeItem(MATRIZ_KEY); } catch(e) {}
  inicializarOImportarMatriz();
}

function shuffle(a){ return a.slice().sort(function(){ return Math.random() - 0.5; }); }

/* Fases de la matriz para un ítem (igual que en inicializarOImportarMatriz) */
function fasesDe(item){
  return (item.categoria === 'accion') ? ['accion'] : ['aprender', 'reconocer', 'recordar', 'escuchar'];
}

/* ── Sincronizar la matriz guardada con el JSON actual, SIN perder los usos ──
   - Quita entradas de ítems que ya no existen (huérfanas): antes, al quedar
     solo ellas, siguienteItem()↔avanzar() se llamaban sin fin (RangeError) y
     la sesión se congelaba para siempre.
   - Añade las combinaciones de ítems nuevos del JSON. */
function sincronizarMatriz(){
  var cambio = false;
  var filtrada = vectorCombinaciones.filter(function(c){
    return ITEMS.some(function(it){ return it.id === c.idItem; });
  });
  if(filtrada.length !== vectorCombinaciones.length){ vectorCombinaciones = filtrada; cambio = true; }
  ITEMS.forEach(function(item){
    if(vectorCombinaciones.some(function(c){ return c.idItem === item.id; })) return;
    fasesDe(item).forEach(function(fase){ vectorCombinaciones.push({ idItem:item.id, fase:fase, usos:0 }); });
    cambio = true;
  });
  if(cambio) guardarMatriz();
}

/* ── Qué combinaciones toca practicar AHORA según el SRS ──
   Antes la matriz ignoraba nivel/proximoRepaso: cada sesión recorría las 56
   combinaciones, podía preguntar un ítem antes de enseñarlo y 12 de 14 ítems
   quedaban "dominados" en dos minutos. Ahora:
   - ítem nuevo (nivel -1): solo su tarjeta "Aprende esto" (o la acción);
   - ítem en curso: sus quizzes pendientes, solo si ya venció proximoRepaso;
   - ítem dominado: no vuelve. */
function combinacionesDisponibles(){
  return vectorCombinaciones.filter(function(c){
    if(c.usos !== 0) return false;
    if(!ITEMS.some(function(it){ return it.id === c.idItem; })) return false;   // huérfana (por si acaso)
    var st = estadoItem(c.idItem);
    if(st.nivel === -1) return c.fase === 'aprender' || c.fase === 'accion';
    return st.nivel < NIVEL_DOMINADO && st.proximoRepaso <= ahora();
  });
}

/* ── Reabrir combinaciones de ítems que vencieron ──
   Un ítem cuyo repaso ya toca pero que tiene todas sus combinaciones usadas no
   tendría nada que practicar: se le vuelven a poner en 0 (nueva vuelta). También
   se reabre la tarjeta "Aprende esto" si el ítem figura como nuevo (nivel -1).
   El progreso SRS (srs_<lección>) no se toca. */
function reabrirCombinacionesVencidas(){
  var cambio = false;
  ITEMS.forEach(function(it){
    var st   = estadoItem(it.id);
    var mias = vectorCombinaciones.filter(function(c){ return c.idItem === it.id; });
    if(!mias.length) return;
    if(st.nivel === -1){
      mias.forEach(function(c){ if((c.fase === 'aprender' || c.fase === 'accion') && c.usos !== 0){ c.usos = 0; cambio = true; } });
      return;
    }
    if(st.nivel >= NIVEL_DOMINADO || st.proximoRepaso > ahora()) return;
    var quizzes = mias.filter(function(c){ return c.fase !== 'aprender'; });
    if(quizzes.length && !quizzes.some(function(c){ return c.usos === 0; })){
      quizzes.forEach(function(c){ c.usos = 0; });
      cambio = true;
    }
  });
  if(cambio) guardarMatriz();
}

var sesionCombosHechos = 0;   // combinaciones completadas en esta sesión (para la barra superior)
var SEPARACION = 3;           // pantallas de otras palabras antes de volver a la misma
var recientes  = [];          // últimas palabras mostradas en esta sesión

function siguienteItem(){
  // 1. ¿Queda algo que toque practicar ahora? Si no, se termina la sesión
  //    (con 0 ítems si el alumno ya está al día: nunca queda sin salida).
  var disponibles = combinacionesDisponibles();
  if (disponibles.length === 0) {
    irAFin();
    return;
  }

  actualizarTopProgress();

  // 2. Una al azar entre las disponibles, sin repetir palabra demasiado pronto:
  //    si una palabra salió en las últimas SEPARACION pantallas (p. ej. acaba de
  //    verse su tarjeta), se prefiere otra, para que el quiz obligue a recordar
  //    y no a copiar de la memoria inmediata. Si no hay otra, se usa igual.
  var lejanas = disponibles.filter(function(c){ return recientes.indexOf(c.idItem) === -1; });
  var pool = lejanas.length ? lejanas : disponibles;
  combinacionActual = pool[Math.floor(Math.random() * pool.length)];
  recientes.push(combinacionActual.idItem);
  if(recientes.length > SEPARACION) recientes.shift();
  var item = ITEMS.find(function(it) { return it.id === combinacionActual.idItem; });
  if (!item) { combinacionActual.usos = 1; guardarMatriz(); siguienteItem(); return; } // no debería pasar; se marca y se sigue

  // 3. Enrutador de Fases
  if (combinacionActual.fase === 'aprender') {
    mostrarAprender(item);
  } else if (combinacionActual.fase === 'accion') {
    mostrarAccion(item);
  } else {
    // Para las fases 'reconocer', 'recordar' o 'escuchar'
    mostrarQuizConFase(item, combinacionActual.fase);
  }
}

/* ---------- Flujo principal ---------- */
function empezarSesion(){
  inicializarOImportarMatriz(); // Arrancamos tu matriz (la guardada, si existe)
  sincronizarMatriz();          // huérfanas fuera, ítems nuevos dentro; conserva los usos
  reabrirCombinacionesVencidas();
  sesionPracticados  = 0;
  sesionAciertos     = 0;
  sesionCombosHechos = 0;
  recientes          = [];
  siguienteItem();
}

function avanzar(){
  if(_accionTimer){ clearTimeout(_accionTimer); _accionTimer = null; }
  _accionToken++;
  // Como ya no hay "cola", simplemente saltamos al siguiente ítem de la matriz
  siguienteItem();
}

function actualizarTopProgress(){
  if (!vectorCombinaciones || vectorCombinaciones.length === 0) return;
  // Progreso de ESTA sesión: hechas / (hechas + las que toca practicar ahora)
  var pendientes = combinacionesDisponibles().length;
  var total = sesionCombosHechos + pendientes;
  var pct = total > 0 ? Math.round((sesionCombosHechos / total) * 100) : 0;
  document.getElementById('top-fill').style.width = pct + '%';
}

/* ---------- APRENDER ---------- */
var _aprenderDesde = 0;   // cuándo se mostró la tarjeta actual (contra el doble toque)
function mostrarAprender(item){
  modoActual = 'aprender';
  _aprenderDesde = Date.now();

  document.getElementById('learn-gu').textContent  = item.gujarati;
  document.getElementById('learn-sig').textContent = item.significado;

  var img = document.getElementById('learn-img');
  if(img) img.src = item.imagen || '';
  mostrar('screen-aprender');
  setTimeout(reproducirActual, 350);
}

function trasAprender(){
  // Doble toque en "Ya lo memoricé": el segundo caía sobre la tarjeta SIGUIENTE
  // (mismo botón) y la daba por aprendida sin que el alumno la viera.
  if(!combinacionActual || combinacionActual.fase !== 'aprender') return;
  if(Date.now() - _aprenderDesde < 500) return;
  // 1. Registramos el éxito en la matriz
  combinacionActual.usos++;
  sesionCombosHechos++;
  guardarMatriz();
  
  // 2. Lógica normal
  var item = ITEMS.find(function(it) { return it.id === combinacionActual.idItem; });
  var st   = estadoItem(item.id);
  if(st.nivel === -1) st.nivel = 0;
  guardarProgreso();
  avanzar();
}

function mostrarQuizConFase(item, faseForzada){
  modoActual = faseForzada; // Usamos la fase que dictó tu matriz aleatoria
  var promptEl  = document.getElementById('quiz-prompt');
  var instrEl   = document.getElementById('quiz-instruction');
  var badgeEl   = document.getElementById('quiz-badge');
  var audioBtn  = document.getElementById('quiz-audio');
  var optionsEl = document.getElementById('quiz-options');

  document.getElementById('quiz-feedback').textContent = '';
  var _r=document.getElementById('quiz-reintentar'), _s=document.getElementById('quiz-saltar');
  if(_r) _r.style.display='none';
  if(_s) _s.style.display='none';

  optionsEl.innerHTML = '';
  audioBtn.style.display = 'none';

  var correcta, opciones, render;
  var qImg = document.getElementById('quiz-img');
  if(qImg) qImg.src = '';

  if(modoActual === 'reconocer'){
    badgeEl.textContent = '¿Qué imagen corresponde?';
    instrEl.textContent = 'Toca la imagen correcta';
    promptEl.innerHTML  = '<div class="gu big-gu">' + item.gujarati + '</div>';
    if(qImg) qImg.src   = '';          /* sin imagen en el prompt */
    correcta = item.imagen;
    opciones = generarOpciones(item, 'imagen');
    render   = function(val){
      return '<img class="opt-img" src="' + val + '" alt="">';
    };
  } else if(modoActual === 'recordar'){
    badgeEl.textContent = '¿Cómo se escribe?';
    instrEl.textContent = 'Toca la escritura correcta';
    promptEl.innerHTML  = '<div class="big-sig">' + item.significado + '</div>';
    correcta = item.gujarati;
    opciones = generarOpciones(item, 'gujarati');
    render   = function(val){ return '<div class="gu">' + val + '</div>'; };
  } else { // escuchar
    badgeEl.textContent    = '¿Qué escuchaste?';
    instrEl.textContent    = 'Toca lo que oíste';
    promptEl.innerHTML     = '<div class="quiz-headphone">🎧</div>';  // clase CSS en vez de inline style
    audioBtn.style.display = 'flex';
    correcta = item.gujarati;
    opciones = generarOpciones(item, 'gujarati');
    render   = function(val){ return '<div class="gu">' + val + '</div>'; };
    setTimeout(reproducirActual, 350);
  }

  opciones.forEach(function(val, i){
    var btn       = document.createElement('button');
    btn.className = 'opt-btn' + (modoActual === 'reconocer' ? ' opt-img-wrap' : '');
    if(modoActual === 'reconocer') btn.setAttribute('aria-label', 'Opción ' + (i + 1));   /* alt vacío a propósito */
    btn.innerHTML = render(val);
    btn.onclick   = function(){ responder(btn, val, correcta, item); };
    optionsEl.appendChild(btn);
  });

  mostrar('screen-quiz');
}

function generarOpciones(item, campo){
  var correcta    = item[campo];
  var distractores = shuffle(ITEMS.filter(function(it){ return it.id !== item.id; }))
    .slice(0, MAX_OPCIONES - 1)
    .map(function(it){ return it[campo]; });
  return shuffle([correcta].concat(distractores));
}

function responder(btn, elegido, correcta, item){
  var todos = document.querySelectorAll('.opt-btn');
  todos.forEach(function(b){ b.disabled = true; });

  var fb = document.getElementById('quiz-feedback');
  var st = estadoItem(item.id);
  sesionPracticados++;

  if(elegido === correcta){
    // ¡ÉXITO! Marcamos la combinación como usada para que no se repita
    combinacionActual.usos++;
    sesionCombosHechos++;
    guardarMatriz();

    btn.classList.add('correct');
    fb.textContent = '✓ ¡Correcto!';
    fb.className   = 'feedback ok';
    sfx.src = SND_OK; sfx.play().catch(function(){});
    sesionAciertos++;
    st.nivel        = Math.min(st.nivel + 1, INTERVALOS.length - 1);
    st.aciertos++;
    st.proximoRepaso = ahora() + INTERVALOS[st.nivel] * 60000;
    guardarProgreso();
    setTimeout(avanzar, 900);
  } else {
    // FALLO: No sumamos uso. La matriz lo volverá a intentar.
    btn.classList.add('wrong');
    fb.textContent = (typeof correcta === 'string' && correcta.indexOf('/') !== -1) ? '✗' : '✗ Era: ' + correcta;
    fb.className   = 'feedback err';
    sfx.src = SND_ERR; sfx.play().catch(function(){});

    todos.forEach(function(b){
      var img = b.querySelector('.opt-img');
      if(img){
        if(img.src.endsWith(correcta.split('/').pop())) b.classList.add('correct');
      } else if(b.textContent.trim() === String(correcta).trim()){
        b.classList.add('correct');
      }
    });

    st.nivel        = 0;
    st.fallos++;
    st.proximoRepaso = ahora();   // vence ya: lo fallado vuelve en esta misma sesión
    guardarProgreso();
    document.getElementById('quiz-reintentar').style.display = '';
    document.getElementById('quiz-saltar').style.display = '';
  }
}

function quizReintentar(){
  document.getElementById('quiz-reintentar').style.display = 'none';
  document.getElementById('quiz-saltar').style.display = 'none';
  var item = ITEMS.find(function(it){ return it.id === combinacionActual.idItem; });
  mostrarQuizConFase(item, combinacionActual.fase);   // misma combinación, no sumó uso
}

function quizSaltar(){
  document.getElementById('quiz-reintentar').style.display = 'none';
  document.getElementById('quiz-saltar').style.display = 'none';
  avanzar();   // otra combinación; la fallada volverá porque no sumó uso
}


/* ---------- Audio ---------- */
function reproducirActual(){
  if (!combinacionActual) return;
  var item = ITEMS.find(function(it) { return it.id === combinacionActual.idItem; });
  if(!item) return;
  player.src = item.audioM;
  player.play().catch(function(){});
}

/* ── MODO ACCIÓN ────────────────────────────────────────────────
   1. Audio × 2 con 1500 ms de pausa entre ellos
   2. Timer visual arranca después de la segunda reproducción
      duración = max(5000, duracionAudio×2 + 1500)
   3. Al terminar → sonido + imagen
   4. Autoevaluación: ¡Lo hice! / Casi / Me confundí
────────────────────────────────────────────────────────────────*/
var _accionTimer  = null;
var _accionToken  = 0;

function mostrarAccion(item){
  modoActual = 'accion';
  _accionToken++;
  var miToken = _accionToken;

  player.onended = null;
  player.onloadedmetadata = null;
  player.onerror = null;
  player.pause();

  var zona  = document.getElementById('accion-zona');
  var barra = document.getElementById('accion-barra');
  var icono = document.getElementById('accion-icono');
  var eval_ = document.getElementById('accion-eval');

  document.getElementById('accion-gu').textContent  = item.gujarati;
  document.getElementById('accion-sig').textContent = item.significado;
  zona.className         = 'accion-zona suspense';
  barra.style.transition = 'none';
  barra.style.transform  = 'scaleX(0)';
  icono.style.display    = 'none';
  icono.src              = '';
  eval_.style.display    = 'none';
  document.getElementById('accion-feedback').textContent = '';

  /* Botones de autoevaluación */
  var cont = document.getElementById('accion-eval-btns');
  cont.innerHTML = '';
  [['bien','¡Lo hice!'],['casi','Casi'],['mal','Me confundí']].forEach(function(par){
    var btn = document.createElement('button');
    btn.className = 'accion-eval-btn eval-' + par[0];
    btn.textContent = par[1];
    btn.onclick = (function(v){ return function(){ responderAccion(v, item); }; })(par[0]);
    cont.appendChild(btn);
  });

  mostrar('screen-accion');

player.src = item.audioM;
  player.onloadedmetadata = function(){
    if(miToken !== _accionToken) return;
    
    // 1. Limpiamos el evento para evitar bucles infinitos
    player.onloadedmetadata = null;
    
    var durMs = Math.round(player.duration * 1000);
    // El tiempo de espera será 5 segundos, o un poco más si el audio es muy largo
    var timerMs = Math.max(5000, durMs * 2 + 1500);

    // 2. Arrancamos el timer y la barra visual INMEDIATAMENTE
    barra.style.transition = 'none';
    barra.style.transform  = 'scaleX(1)';
    requestAnimationFrame(function(){ 
      requestAnimationFrame(function(){
        barra.style.transition = 'transform ' + (timerMs / 1000) + 's linear';
        barra.style.transform  = 'scaleX(0)';
      }); 
    });

    // 3. Programamos el momento exacto en que se revela el GIF
    _accionTimer = setTimeout(function(){
      if(miToken !== _accionToken) return;
      revelarAccion(item);
    }, timerMs);

    // 4. Reproducimos la 1ra vez, esperamos 1.5s y reproducimos la 2da vez
    player.play().catch(function(){});
    player.onended = function(){
      if(miToken !== _accionToken) return;
      player.onended = null; // Limpiamos para que no escuche más finales
      
      setTimeout(function(){
        if(miToken !== _accionToken) return;
        // Solo regresamos el audio al inicio, NO recargamos el src
        player.currentTime = 0; 
        player.play().catch(function(){});
      }, 1500);
    };
  };
  player.onerror = function(){
    if(miToken !== _accionToken) return;
    player.onerror = null;
    revelarAccion(item);
  };
}

function revelarAccion(item){
  sfx.src = SND_OK; sfx.play().catch(function(){});
  var zona  = document.getElementById('accion-zona');
  var icono = document.getElementById('accion-icono');
  var eval_ = document.getElementById('accion-eval');
  zona.className      = 'accion-zona revelado';

  icono.style.animation = 'none';
  icono.src = item.imagen || '';
  icono.style.display = item.imagen ? 'block' : 'none';
  void icono.offsetWidth;      /* fuerza reflow para reiniciar la animación */
  icono.style.animation = '';

  eval_.style.display = 'flex';
}

function responderAccion(valoracion, item){
  var st = estadoItem(item.id);
  sesionPracticados++;
  var fb = document.getElementById('accion-feedback');
  
  if(valoracion === 'bien'){
    // ¡ÉXITO! Marcamos la combinación como usada
    combinacionActual.usos++;
    sesionCombosHechos++;
    guardarMatriz();

    st.nivel         = Math.min(st.nivel + 1, INTERVALOS.length - 1);
    st.aciertos++;
    st.proximoRepaso = ahora() + INTERVALOS[st.nivel] * 60000;
    fb.textContent   = '✓ ¡Genial!';
    fb.className     = 'feedback ok';
    sesionAciertos++;
  } else {
    // FALLO: No sumamos uso.
    st.nivel         = 0;
    st.fallos++;
    st.proximoRepaso = ahora();   // vence ya: vuelve en esta misma sesión
    
    fb.textContent   = valoracion === 'casi' ? '👍 ¡Sigue así!' : '🔄 ¡La próxima!';
    fb.className     = 'feedback';
  }
  
  guardarProgreso();
  document.querySelectorAll('.accion-eval-btn').forEach(function(b){ b.disabled = true; });
  setTimeout(avanzar, 1200);
}

/* ---------- FIN ---------- */
function irAFin(){
  var h2 = document.querySelector('#screen-fin h2');
  if(h2) h2.textContent = (sesionCombosHechos === 0 && sesionPracticados === 0) ? '¡Estás al día!' : '¡Sesión completada!';
  document.getElementById('top-fill').style.width           = '100%';
  document.getElementById('fin-practicados').textContent    = sesionPracticados;
  document.getElementById('fin-aciertos').textContent       = sesionAciertos;
  document.getElementById('fin-dominados').textContent      = itemsDominados().length;
  mostrar('screen-fin');
}

/* ---------- Reiniciar ---------- */
function reiniciarProgreso(){
  if(confirm('¿Seguro que quieres borrar tu progreso de esta lección y empezar de cero?')){
    progreso = {};
    guardarProgreso();
    reiniciarMatrizCompleta();   /* también reinicia la matriz de cobertura, o siguienteItem() se queda sin combinaciones disponibles */
    actualizarStats();
  }
}

/* ---------- Init ---------- */
fetch(JSON_URL)
  .then(function(r){ if(!r.ok) throw new Error('No se encontró ' + JSON_URL); return r.json(); })
  .then(function(data){
    ITEMS = data.items;
    cargarProgreso();
    actualizarStats();
  })
  .catch(function(){
    document.getElementById('screen-inicio').innerHTML =
      '<p class="subtitle">No se pudo cargar el contenido. Revisa tu conexión.</p>';
  });

/* ---------- Verificador de versión ---------- */
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
