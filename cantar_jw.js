const _params     = new URLSearchParams(location.search);
const _leccionRaw = _params.get('leccion') || '1.1.1';
const _leccion    = _leccionRaw.replace(/\./g, '_');
const JSON_URL    = 'data/' + _leccion + '/cantar_jw_' + _leccion + '.json';

document.getElementById('nav-mapa').href = 'guia_navegacion.html?leccion=' + _leccionRaw;

function texto(id, valor){
  var el = document.getElementById(id);
  if(el) el.innerHTML = valor || '';
}

/* Palabras clave que sonarán en la canción */
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

function montarPreguntas(idCont, lista){
  var cont = document.getElementById(idCont);
  cont.innerHTML = '';
  (lista || []).forEach(function(txt){
    var p = document.createElement('div');
    p.className = 'pregunta';
    p.innerHTML = txt;
    cont.appendChild(p);
  });
}

/* Configura un botón de modo. Si no hay url, queda deshabilitado. */
function configurarModo(prefijo, cfg){
  cfg = cfg || {};
  texto(prefijo + '-titulo', cfg.titulo);
  texto(prefijo + '-desc',   cfg.descripcion);
  texto(prefijo + '-aviso',  cfg.aviso || 'Se abre en jw.org, en otra pestaña');
  var boton = document.getElementById(prefijo + '-boton');
  boton.textContent = cfg.boton || 'Ver el video';
  if(cfg.url) boton.href = cfg.url;
  else        boton.classList.add('deshabilitado');
}

fetch(JSON_URL + '?t=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
  .then(function(data){
    if(data.home) document.getElementById('nav-home').href = data.home;

    texto('badge',  data.badge);
    texto('titulo', data.titulo);
    texto('lead',   data.lead);

    /* ── Antes: palabras clave ── */
    var antes = data.antes || {};
    if(antes.palabras && antes.palabras.length){
      texto('antes-titulo', antes.titulo);
      montarChips(antes.palabras);
    } else {
      document.getElementById('card-antes').style.display = 'none';
    }

    /* ── Los dos modos ── */
    configurarModo('esc', data.escuchar);
    configurarModo('kar', data.cantar);

    /* ── Después: reflexión por modo ── */
    var desp = data.despues || {};
    var hayEsc = desp.escuchar && desp.escuchar.length;
    var hayKar = desp.cantar   && desp.cantar.length;
    if(hayEsc || hayKar){
      texto('despues-titulo', desp.titulo || 'Después de cantar');
      texto('desp-esc-label', (data.escuchar && data.escuchar.etiqueta) || 'Si escuchaste');
      texto('desp-kar-label', (data.cantar   && data.cantar.etiqueta)   || 'Si cantaste');
      montarPreguntas('desp-esc-preguntas', desp.escuchar);
      montarPreguntas('desp-kar-preguntas', desp.cantar);
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

    document.title = (data.titulo || 'Canta en gujarati') + ' · Piensa en Gujarati';
  })
  .catch(function(){
    document.getElementById('wrap').innerHTML =
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
