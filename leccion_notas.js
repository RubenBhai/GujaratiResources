const BASE        = '.';
const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/leccion_notas_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

let TOTAL = 0;

function ir(n){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById('s' + n).classList.add('active');
  document.getElementById('top-fill').style.width = Math.round((n / (TOTAL - 1)) * 100) + '%';
  window.scrollTo(0, 0);
}

/* Pinta una fila de elementos coloreados. color: 1, 2 o 3.
   El numerito volado repite la correspondencia sin depender del color. */
function filaCorresp(items, marcar){
  return (items || []).map(function(it){
    var c     = it.color || 1;
    var marca = marcar ? '<sup class="corresp-num">' + c + '</sup>' : '';
    return '<span class="corresp-el c' + c + '">' + it.texto + marca + '</span>';
  }).join('');
}

function crearBloqueNota(b){
  var nodos = [];
  if(b.tipo === 'texto'){
    if(b.gu){
      var guDiv = document.createElement('div');
      guDiv.className  = 'gu nota-gu';
      guDiv.textContent = b.gu;
      nodos.push(guDiv);
    }
    var texDiv = document.createElement('div');
    texDiv.className = 'nota-texto';
    texDiv.innerHTML = b.html;
    nodos.push(texDiv);
  } else if(b.tipo === 'correspondencia'){
    var divC = document.createElement('div');
    divC.className = 'corresp';
    var marcar = (b.marcas !== false);          // activadas salvo que digas lo contrario
    var h = '';
    if(b.titulo) h += '<div class="corresp-titulo">' + b.titulo + '</div>';
    h += '<div class="corresp-linea gu">' + filaCorresp(b.gujarati, marcar) + '</div>';
    h += '<div class="corresp-sep"></div>';
    h += '<div class="corresp-linea es">' + filaCorresp(b.espanol, marcar) + '</div>';
    divC.innerHTML = h;
    nodos.push(divC);
  } else if(b.tipo === 'ejemplo'){
    var div = document.createElement('div');
    div.className = 'ejemplo';
    div.innerHTML =
      '<div class="gu ejemplo-gu">' + b.gu + '</div>' +
      '<div class="ejemplo-lit">literalmente: "' + b.literal + '"</div>' +
      '<div class="ejemplo-sig">se entiende: "' + b.significado + '"</div>';
    nodos.push(div);
  }
  return nodos;
}

fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    document.getElementById('nav-salir').href    = data.salir;
    document.getElementById('nav-home').href     = data.home;
    document.getElementById('nav-terminar').href = 'leccion_pensarEnGUJ.html?leccion=' + _leccionRaw;

    var notas      = data.notas;
    var totalNotas = notas.length;
    TOTAL = totalNotas + 2; // intro + notas + fin

    var contenedor = document.getElementById('contenedor-pantallas');

    /* ── s0: intro ── */
    var s0 = document.createElement('div');
    s0.className = 'screen active';
    s0.id        = 's0';
    s0.innerHTML =
      '<span class="badge">Notas del Gujarati</span>' +
      '<h1>' + data.intro.titulo + '</h1>' +
      '<p class="lead">' + data.intro.texto + '</p>';
    var btnEmpezar       = document.createElement('button');
    btnEmpezar.className = 'btn-main';
    btnEmpezar.textContent = 'Empecemos →';
    btnEmpezar.onclick   = function(){ ir(1); };
    s0.appendChild(btnEmpezar);
    contenedor.appendChild(s0);

    /* ── s1..sN: notas ── */
    notas.forEach(function(nota, i){
      var n = i + 1;
      var s = document.createElement('div');
      s.className = 'screen';
      s.id        = 's' + n;

      var badge       = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = n + ' de ' + totalNotas;
      s.appendChild(badge);

      var card = document.createElement('div');
      card.className = 'nota-card' + (nota.destacado ? ' destacado' : '');

      nota.bloques.forEach(function(b, bi){
        var bloqueNodos = crearBloqueNota(b);
        bloqueNodos.forEach(function(nodo){
          // Separación entre bloques de tipo texto cuando no es el primero
          if(b.tipo === 'texto' && bi > 0) nodo.classList.add('nota-bloque-extra');
          card.appendChild(nodo);
        });
      });
      s.appendChild(card);

      var btnRow          = document.createElement('div');
      btnRow.className    = 'btn-row';
      var btnAtras        = document.createElement('button');
      btnAtras.className  = 'btn-sec';
      btnAtras.textContent = '← Atrás';
      btnAtras.onclick    = function(){ ir(n - 1); };
      var btnSig          = document.createElement('button');
      btnSig.className    = 'btn-main';
      btnSig.textContent  = (n === totalNotas) ? 'Entendido →' : 'Siguiente →';
      btnSig.onclick      = function(){ ir(n + 1); };
      btnRow.appendChild(btnAtras);
      btnRow.appendChild(btnSig);

      if(nota.practica_flash && nota.practica_flash.length){
        var btnFlash       = document.createElement('a');
        btnFlash.className = 'btn-sec';
        btnFlash.innerHTML = '🎉 ¡Vamos a practicar!';
        btnFlash.href      = 'compone.html?leccion=' + _leccionRaw
                           + '&practica_flash=' + nota.practica_flash.join(',');
        s.appendChild(btnFlash);
      }

      s.appendChild(btnRow);

      contenedor.appendChild(s);
    });

    /* ── s(N+1): fin ── */
    var sFin       = document.createElement('div');
    sFin.className = 'screen';
    sFin.id        = 's' + (totalNotas + 1);
    sFin.innerHTML =
      '<span class="badge">¡Listo!</span>' +
      '<h1>' + data.fin_pantalla.titulo + '</h1>' +
      '<p class="lead">' + data.fin_pantalla.texto + '</p>';

    var extra = data.fin_pantalla.boton_extra;
    if(extra && extra.habilitado){
      var btnExtra        = document.createElement('a');
      btnExtra.className  = 'btn-sec';
      btnExtra.href       = extra.pagina + '?leccion=' + _leccionRaw;
      btnExtra.textContent = extra.caption;
      sFin.appendChild(btnExtra);
    }

    var btnFin        = document.createElement('a');
    btnFin.className  = 'btn-main';
    btnFin.href       = data.fin;
    btnFin.textContent = 'A Pensar en GUJARATI →';
    sFin.appendChild(btnFin);
    contenedor.appendChild(sFin);
  })
  .catch(function(){
    document.body.innerHTML =
      '<p class="error-carga">No se pudo cargar el contenido. Revisa tu conexión.</p>';
  });

/* ── Verificador de versión ── */
(function(){
  var VERSION_URL = 'version.txt';
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
