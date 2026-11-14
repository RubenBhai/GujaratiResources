const BASE        = '.';

const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/leccion_fin_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

/* ── Kahevat (refrán) de la lección ──
   data.kahevat = { gujarati, se_dice, literal, significa, equivalente, cuando,
                    audio_m, audio_h, conocidas }   ("conocidas": letras vistas hasta esta lección) */
function separarGrafemas(texto){
  if(window.Intl && Intl.Segmenter){
    return Array.from(new Intl.Segmenter('gu', { granularity: 'grapheme' }).segment(texto), function(s){ return s.segment; });
  }
  var res = [];                                     // respaldo: une matras y signos a la letra anterior
  Array.from(texto).forEach(function(ch){
    if(/[\u0A81-\u0A83\u0ABC\u0ABE-\u0ACD]/.test(ch) && res.length) res[res.length - 1] += ch;
    else res.push(ch);
  });
  return res;
}
function mostrarKahevat(k){
  var caja = document.getElementById('kahevat-box');
  if(!k || !k.gujarati){ return; }
  var conocidas = k.conocidas || '';
  var cont = document.getElementById('kahevat-gu');
  var total = 0, sabe = 0;
  separarGrafemas(k.gujarati).forEach(function(g){
    var span = document.createElement('span');
    span.textContent = g;
    if(/[\u0A80-\u0AFF]/.test(g)){
      total++;
      var ok = Array.from(g).every(function(ch){ return conocidas.indexOf(ch) !== -1; });
      if(ok){ sabe++; }
      span.className = ok ? 'kv-conocida' : 'kv-nueva';
    }
    cont.appendChild(span);
  });
  document.getElementById('kahevat-dice').textContent = k.se_dice || '';
  document.getElementById('kahevat-gu-simple').textContent = k.gujarati;   // misma frase en letra de imprenta, por si la serif confunde
  var filas = [['Literalmente', k.literal], ['Significa', k.significa], ['En español decimos', k.equivalente], ['Cuándo usarlo', k.cuando]];
  var dl = document.getElementById('kahevat-sig');
  filas.forEach(function(f){
    if(!f[1]) return;
    var dt = document.createElement('dt'); dt.textContent = f[0];
    var dd = document.createElement('dd'); dd.textContent = f[1];
    dl.appendChild(dt); dl.appendChild(dd);
  });
  document.getElementById('kahevat-pista').textContent = sabe
    ? 'Las letras en color ya las sabes leer: ' + sabe + ' de ' + total + '.'
    : 'Todavía no conoces estas letras: escúchalo y repítelo. ¡En pocas lecciones lo leerás tú solo!';
  var player = document.getElementById('player');
  [['kahevat-m', k.audio_m], ['kahevat-h', k.audio_h]].forEach(function(b){
    var btn = document.getElementById(b[0]);
    if(!b[1]){ btn.style.display = 'none'; return; }
    btn.onclick = function(){
      player.src = b[1]; player.playbackRate = 1.0;
      player.play().catch(function(){});
    };
  });
  caja.hidden = false;
}

fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){

    // Marcar lección como completada
    try { localStorage.setItem('leccion_' + _leccion, 'completada'); } catch(e) {}

    // Sonido de triunfo
    setTimeout(function(){
      var t = document.getElementById('triunfo');
      if(t){ t.volume = 0.7; t.play().catch(function(){}); }
    }, 350);

    document.getElementById('nav-anterior').onclick = function(){ history.back(); return false; };
    document.getElementById('nav-home').href    = 'leccion_intro.html?leccion=' + _leccionRaw;
    document.getElementById('btn-repetir').href = 'leccion_intro.html?leccion=' + _leccionRaw;
    document.getElementById('nav-mapa').href    = 'guia_navegacion.html?leccion=' + _leccionRaw;

    // Efecto victoria (definido en efecto_victoria.js)
    // Sin sonido: #triunfo ya suena arriba; con data.sonido_victoria se solapaban dos audios de victoria
    revisarVictoria(100, null, data.programa_efecto_victoria, _leccion);

    // Subtitle: usa clase .gu-inline en lugar de style= inline
    var r = data.resumen;
    document.getElementById('subtitle').innerHTML =
      'Aprendiste <strong>' + r.consonantes + ' consonantes</strong>, ' +
      '<strong>' + r.vocales + ' vocales</strong> y ' +
      '<strong>' + r.palabras + ' palabras</strong> de verdad. ' +
      '¡Ya puedes preguntar <span class="gu-inline">' + r.frase_ejemplo + '</span>!';

    // Letras aprendidas
    var letrasCont = document.getElementById('letras-aprendidas');
    data.letras_aprendidas.forEach(function(l){
      var span       = document.createElement('span');
      span.className = 'gu';
      span.textContent = l;
      letrasCont.appendChild(span);
    });

    // Tabla de vocabulario
    var tabla = document.getElementById('tabla-aprendido');
    data.palabras_aprendidas.forEach(function(p){
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="gu-cell">'   + p.gujarati  + '</td>' +
        '<td class="pron-cell">' + p.se_dice   + '</td>' +
        '<td class="mean-cell">' + p.significa + '</td>';
      tabla.appendChild(tr);
    });

    // Kahevat de la lección (antes de 'Próxima lección', que puede salir antes con return)
    mostrarKahevat(data.kahevat);

    // Próxima lección
    var prox = data.proxima_leccion;
    document.getElementById('btn-siguiente-leccion').href = 'leccion_intro.html?leccion=' + prox.codigo;
    // Próxima lección aún sin letras (p.ej. 1.1.4 en preparación): no mostrar "Aprenderás 0 letras nuevas"
    if(!prox.letras || !prox.letras.length){
      document.querySelector('.proxima-box').style.display = 'none';
      return;
    }
    document.getElementById('proxima-texto').textContent = 'Aprenderás ' + prox.cantidad_letras + ' letras nuevas:';
    var proxLetrasCont = document.getElementById('proxima-letras');
    prox.letras.forEach(function(l){
      var span       = document.createElement('span');
      span.className = 'gu';
      span.textContent = l;
      proxLetrasCont.appendChild(span);
    });
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
