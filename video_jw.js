const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/video_jw_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

function texto(id, valor){
  var el = document.getElementById(id);
  if(el) el.innerHTML = valor || '';
}

/* Palabras que el estudiante debe reconocer */
function montarChips(lista){
  var cont = document.getElementById('antes-chips');
  cont.innerHTML = '';
  (lista || []).forEach(function(p){
    var chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = '<div class="chip-gu gu">' + p.gu + '</div>' +
                     '<div class="chip-es">' + (p.es || '') + '</div>';
    cont.appendChild(chip);
  });
}

/* Preguntas: al tocar una, revela su respuesta durante 'duracion' segundos
   (default 2) con el efecto de color, y vuelve sola a la pregunta original.
   Cada pregunta tiene su propio timer; mientras está revelada, ignora toques. */
function montarPreguntas(lista){
  var cont = document.getElementById('despues-preguntas');
  cont.innerHTML = '';
  (lista || []).forEach(function(item){
    var preguntaHTML  = item.pregunta  || '';
    var respuestaHTML = item.respuesta || '';
    var dur = (typeof item.duracion === 'number' && item.duracion > 0) ? item.duracion : 2;

    var p = document.createElement('div');
    p.className = 'pregunta';
    p.innerHTML = preguntaHTML;
    p.setAttribute('role', 'button');
    p.setAttribute('tabindex', '0');

    function revelar(){
      if(p.classList.contains('revelada')) return;   // ya mostrando respuesta → ignora
      p.classList.add('revelada');
      p.innerHTML = '<span class="lbl-resp">Respuesta</span>' + respuestaHTML;
      p._timer = setTimeout(function(){
        p.classList.remove('revelada');
        p.innerHTML = preguntaHTML;
      }, dur * 1000);
    }

    p.addEventListener('click', revelar);
    p.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); revelar(); }
    });

    cont.appendChild(p);
  });
}

fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    if(data.home) document.getElementById('nav-home').href = data.home;

    texto('badge',  data.badge);
    texto('titulo', data.titulo);
    texto('lead',   data.lead);

    /* ── Antes de ver ── */
    var antes = data.antes || {};
    if(antes.palabras && antes.palabras.length){
      texto('antes-titulo', antes.titulo);
      montarChips(antes.palabras);
    } else {
      document.getElementById('card-antes').style.display = 'none';
    }

    /* ── El enlace ── */
    var v = data.video || {};
    texto('ve-kicker', v.kicker);
    texto('ve-titulo', v.titulo);
    texto('ve-desc',   v.descripcion);
    texto('ve-aviso',  v.aviso || 'Se abre en otra pestaña');
    var boton = document.getElementById('ve-boton');
    boton.textContent = v.boton || '▶ Ver el video';
    if(v.url) boton.href = v.url;
    else      boton.classList.add('deshabilitado');

    /* ── Después de ver ── */
    var desp = data.despues || {};
    if(desp.preguntas && desp.preguntas.length){
      texto('despues-titulo', desp.titulo);
      montarPreguntas(desp.preguntas);
    } else {
      document.getElementById('card-despues').style.display = 'none';
    }

    /* ── Continuar ── */
    var btn = document.getElementById('btn-continuar');
    if(data.continuar){
      btn.href = data.continuar;
      if(data.continuar_caption) btn.textContent = data.continuar_caption;
    } else {
      btn.href = '#';
      btn.onclick = function(e){ e.preventDefault(); history.back(); };
    }

    document.title = (data.titulo || 'Mira el video') + ' · Piensa en Gujarati';
  })
  .catch(function(){
    document.getElementById('wrap').innerHTML =
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
