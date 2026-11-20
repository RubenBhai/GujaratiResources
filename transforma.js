/* transforma.js (Claude, 19-nov-2026): «Transforma la frase» — clases maestras de gramática.
   transforma.html?clase=1 lee data/transforma/clase_1.json. Una frase base y fichas que la cambian;
   las palabras que cambian se pintan de verde. Cada combinación tiene su frase completa grabada
   (nunca palabras sueltas). Las fichas con "desde" se abren al completar esa lección.
   19-nov: aviso «Ningún cambio en la oración»; la ficha tocada muestra un momento la palabra en gujarati;
   la clave de cada frase tiene un tramo por fila de fichas (así una fila «estilo» A/B funciona igual). */
var params = new URLSearchParams(location.search);
var CLASE = (params.get('clase') || '1').replace(/[^0-9a-z_]/gi, '');
var datos = null, sel = {}, previa = null, player = new Audio();

function desbloqueada(desde) {
  if (!desde) return true;
  try { return localStorage.getItem('leccion_' + desde.replace(/\./g, '_')) === 'completada'; } catch (e) { return false; }
}
function toast(t) {
  var el = document.getElementById('toast'); el.textContent = t; el.classList.add('ver');
  clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('ver'); }, 2200);
}
function limpio(w) { return w.replace(/[.?!,]/g, ''); }

/* Palabras de la frase nueva que no están en la anterior (diferencia por LCS, así શું al inicio no corre todo) */
function cambios(antes, ahora) {
  var a = antes.map(limpio), b = ahora.map(limpio), n = a.length, m = b.length, L = [];
  for (var i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
  for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--)
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  var marca = new Array(m).fill(true); i = 0; j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { marca[j] = false; i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return marca;
}
function clave() { return datos.grupos.map(function (g) { return sel[g.id]; }).join('|'); }   // un tramo por fila de fichas, en orden

/* Devuelve las palabras que cambiaron (para mostrarlas en la ficha) o '' si la frase no cambió */
function pintar(sonar) {
  var f = datos.frases[clave()], gu = document.getElementById('frase-gu'), es = document.getElementById('frase-es');
  var btn = document.getElementById('btn-oir');
  if (!f) { gu.textContent = '—'; es.textContent = 'Esta combinación todavía no está lista.'; btn.disabled = true; return; }
  var toks = f.gu.split(' '), marca = previa ? cambios(previa.gu.split(' '), toks) : toks.map(function () { return false; });
  var igual = previa && previa.gu === f.gu;
  gu.innerHTML = '';
  toks.forEach(function (t, k) {
    var s = document.createElement('span'); s.className = 'tok' + (marca[k] ? ' cambio' : ''); s.textContent = t;
    gu.appendChild(s); if (k < toks.length - 1) gu.appendChild(document.createTextNode(' '));
  });
  es.textContent = f.es; btn.disabled = !f.audio; previa = f;
  if (sonar) oir();
  if (igual) { toast('Ningún cambio en la oración'); return ''; }
  return toks.filter(function (t, k) { return marca[k]; }).map(limpio).slice(0, 2).join(' ');
}
function oir() {
  var f = datos && datos.frases[clave()]; if (!f || !f.audio) return;
  var btn = document.getElementById('btn-oir'); btn.classList.add('sonando');
  player.src = f.audio; player.onended = function () { btn.classList.remove('sonando'); };
  player.play().catch(function () { btn.classList.remove('sonando'); });
}
function construir() {
  document.getElementById('badge').textContent = datos.badge || 'Transforma la frase';
  document.getElementById('titulo').textContent = datos.titulo;
  document.getElementById('subtitulo').textContent = datos.subtitulo || '';
  document.getElementById('nota').innerHTML = datos.nota_html || '';
  if (!datos.nota_html) document.getElementById('nota').style.display = 'none';
  sel = Object.assign({}, datos.inicial);
  var cont = document.getElementById('grupos');
  datos.grupos.forEach(function (g) {
    var box = document.createElement('div'); box.className = 'grupo';
    box.innerHTML = '<div class="grupo-label">' + g.label + '</div>';
    var fichas = document.createElement('div'); fichas.className = 'fichas';
    g.opciones.forEach(function (o) {
      var b = document.createElement('button'), abierta = desbloqueada(o.desde);
      b.className = 'ficha' + (sel[g.id] === o.id ? ' sel' : '') + (abierta ? '' : ' bloqueada');
      b.innerHTML = (abierta ? '' : '🔒 ') + o.es + (o.sub ? '<span class="sub">' + o.sub + '</span>' : '');
      b.onclick = function () {
        if (!abierta) { toast('Se abre al terminar la lección ' + o.desde); return; }
        if (sel[g.id] === o.id) { oir(); return; }
        sel[g.id] = o.id;
        fichas.querySelectorAll('.ficha').forEach(function (x) { x.classList.remove('sel', 'flash'); });
        var nuevas = pintar(true), etiqueta = b.innerHTML;
        // la ficha muestra un momento la palabra en gujarati (o.gu si la clase la trae; si no, lo que cambió)
        var g2 = o.gu || nuevas;
        if (g2) { b.innerHTML = '<span class="gu">' + g2 + '</span>'; }
        b.classList.add('sel', 'flash');
        b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        setTimeout(function () { b.classList.remove('flash'); b.innerHTML = etiqueta; }, 1200);
      };
      fichas.appendChild(b);
    });
    // la sombra de la derecha avisa que hay más fichas; desaparece al llegar al final
    var revisar = function () { fichas.classList.toggle('al-final', fichas.scrollLeft + fichas.clientWidth >= fichas.scrollWidth - 4); };
    fichas.addEventListener('scroll', revisar);
    box.appendChild(fichas); cont.appendChild(box); revisar();
    window.addEventListener('resize', revisar);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(revisar);
  });
  pintar(false);
}
fetch('data/transforma/clase_' + CLASE + '.json?t=' + Date.now(), { cache: 'no-store' })
  .then(function (r) { if (!r.ok) throw new Error('404'); return r.json(); })
  .then(function (d) { datos = d; construir(); })
  .catch(function () { document.getElementById('titulo').textContent = 'No se encontró esta clase maestra'; });
