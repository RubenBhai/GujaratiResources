/* continuar.js (Claude, 27-nov-2026): el botón «▶ Continuar donde quedaste» y, si el alumno vuelve después de 14 días
   o más, la invitación al test de nivel. Pinta dentro de <div id="continuar"></div> (menú principal y guía). */
(function () {
  var caja = document.getElementById('continuar'); if (!caja) return;
  if (!document.getElementById('cont-css')) { var st = document.createElement('style'); st.id = 'cont-css'; st.textContent =
    '#continuar[hidden]{display:none}' +
    '.cont-btn{display:flex;align-items:center;gap:12px;background:rgba(163,201,69,.12);border:1px solid rgba(163,201,69,.55);border-radius:14px;padding:12px 14px;margin:0 0 12px;color:inherit;text-decoration:none}' +
    '.cont-btn:hover,.cont-btn:focus-visible{border-color:#A3C945;outline:none}' +
    '.cont-ico{flex:0 0 40px;height:40px;border-radius:50%;background:#A3C945;color:#1F2A10;display:flex;align-items:center;justify-content:center;font-weight:700}' +
    '.cont-tx{flex:1;display:flex;flex-direction:column;line-height:1.35;min-width:0}.cont-tx b{font-size:1.02rem}.cont-tx span{opacity:.75;font-size:.9rem}.cont-fl{font-size:1.2rem;opacity:.7}' +
    '.cont-aviso{background:rgba(184,134,61,.12);border:1px solid rgba(184,134,61,.45);border-radius:14px;padding:12px 14px;margin:0 0 12px;line-height:1.5}' +
    '.cont-aviso a{color:#B8863D;font-weight:700;white-space:nowrap}';
    document.head.appendChild(st); }
  var NOMBRE = { leccion_intro: 'Inicio', video: 'Video', leccion_letra: 'Letras', leccion_vocal: 'Vocales', leccion_plana: 'Escritura',
    leccion_palabra_intro: 'Palabras', leccion_palabra: 'Palabras', leccion_palabra_fin: 'Palabras', leccion_notas: 'Notas',
    leccion_pensarEnGUJ: 'Pensar en gujarati', leccion_fin: 'Final de la lección', juego: 'Juego', practica: 'Práctica', aprende: 'Aprende',
    compone: 'Compone', reto: 'Reto', reto_flash: 'Reto relámpago', piensa: 'Piensa', generador: 'Generador', lectura: 'Lectura',
    video_interactivo: 'Diálogo', video_jw: 'Video', repaso: 'Repaso', guia_navegacion: 'Mapa de la lección', dictado: 'Dictado',
    backwards: 'Repetir por partes', cantar_jw: 'Canción' };
  var p = null; try { p = JSON.parse(localStorage.getItem('ultima_posicion') || 'null'); } catch (e) {}
  var hechas = 0; try { for (var i = 0; i < localStorage.length; i++) if (/^leccion_/.test(localStorage.key(i)) && localStorage.getItem(localStorage.key(i)) === 'completada') hechas++; } catch (e) {}
  var dias = p && p.t ? Math.floor((Date.now() - p.t) / 864e5) : null;
  function hace(d) { return d === 0 ? 'hoy' : d === 1 ? 'ayer' : 'hace ' + d + ' días'; }
  var h = '';
  if (p && p.url) {
    h += '<a class="cont-btn" href="' + p.url.replace(/"/g, '&quot;') + '"><span class="cont-ico">▶</span><span class="cont-tx"><b>Continuar la lección ' + p.leccion + '</b>' +
         '<span>' + (NOMBRE[p.pagina] || 'Donde quedaste') + ' · ' + hace(dias) + '</span></span><span class="cont-fl">→</span></a>';
  }
  var tn = null; try { tn = JSON.parse(localStorage.getItem('test_nivel') || 'null'); } catch (e) {}
  var testReciente = tn && p && tn.t > p.t;                    // ya hizo el test después de su última lección
  if (!caja.dataset.guia && !testReciente && dias !== null && dias >= 14) {   // en la guía ya está la tarjeta del test
    h += '<div class="cont-aviso"><b>' + (dias !== null ? '¡Qué bueno verte de nuevo! Pasaron ' + dias + ' días.' : '¿Vuelves después de un tiempo?') + '</b> ' +
         'Si te sientes perdido, haz el test de 3 minutos y te decimos por dónde seguir. <a href="test_nivel.html">Hacer el test →</a></div>';
  }
  caja.innerHTML = h; caja.hidden = !h;
})();
