/* ═══════════════════════════════════════════════════════════════
   pinata.js — Efecto de victoria para data/1_1_1/
   ═══════════════════════════════════════════════════════════════
   Piñata que se sacude, revienta, y suelta confeti con gravedad.
   Cargado dinámicamente por efecto_victoria.js — debe definir
   exactamente esta función, sin parámetros:
   ═══════════════════════════════════════════════════════════════ */

function ejecutarEfectoVictoria() {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; z-index:99999; pointer-events:none; overflow:hidden;';
  document.body.appendChild(overlay);

  var canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%;';
  overlay.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var cx = canvas.width / 2;
  var cy = canvas.height * 0.32;

  // ── Piñata: rombo con franjas de colores, colgada de una cuerda ──
  var piñata = document.createElement('div');
  piñata.style.cssText =
    'position:absolute; left:' + cx + 'px; top:' + cy + 'px; width:90px; height:120px; ' +
    'transform:translate(-50%,-50%); transform-origin:50% -30px; ' +
    'animation:efvSacudir 0.35s ease-in-out 4;';
  piñata.innerHTML =
    '<div style="position:absolute; left:50%; top:-34px; width:2px; height:34px; background:#8a7256; transform:translateX(-1px);"></div>' +
    '<svg width="90" height="120" viewBox="0 0 90 120">' +
      '<polygon points="45,4 86,60 45,116 4,60" fill="#B8863D"/>' +
      '<polygon points="45,4 86,60 45,60 4,60" fill="#A8362A"/>' +
      '<polygon points="4,60 45,60 45,116" fill="#4A6B53"/>' +
      '<polygon points="45,60 86,60 45,116" fill="#7A5FBF"/>' +
    '</svg>';
  overlay.appendChild(piñata);

  var styleTag = document.createElement('style');
  styleTag.textContent =
    '@keyframes efvSacudir { 0%,100%{transform:translate(-50%,-50%) rotate(0deg);} 25%{transform:translate(-50%,-50%) rotate(-8deg);} 75%{transform:translate(-50%,-50%) rotate(8deg);} }' +
    '@keyframes efvMensaje { 0%{opacity:0; transform:translate(-50%,-40%) scale(0.7);} 15%{opacity:1; transform:translate(-50%,-50%) scale(1);} 80%{opacity:1;} 100%{opacity:0; transform:translate(-50%,-50%) scale(1);} }';
  document.head.appendChild(styleTag);

  // ── Confeti: nace de golpe cuando la piñata "revienta" ──
  var particulas = [];
  var COLORES = ['#B8863D', '#A8362A', '#4A6B53', '#7A5FBF', '#E8D9C0'];

  function reventar() {
    piñata.style.display = 'none';
    for (var i = 0; i < 110; i++) {
      var ang = Math.random() * Math.PI * 2;
      var vel = 4 + Math.random() * 9;
      particulas.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel - 3,
        color: COLORES[i % COLORES.length],
        tam: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        velRot: (Math.random() - 0.5) * 0.3
      });
    }
  }

  var mensaje = document.createElement('div');
  mensaje.textContent = '¡Excelente!';
  mensaje.style.cssText =
    'position:absolute; left:50%; top:' + (cy + 10) + 'px; ' +
    'font-family:"Fraunces",serif; font-size:2.2rem; font-weight:700; color:#B8863D; ' +
    'text-shadow:0 2px 12px rgba(0,0,0,0.5); white-space:nowrap; ' +
    'animation:efvMensaje 2.4s ease-out 1.1s forwards; opacity:0;';
  overlay.appendChild(mensaje);

  setTimeout(reventar, 1100);

  var inicio = performance.now();
  function loop(ahora) {
    var t = ahora - inicio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < particulas.length; i++) {
      var p = particulas[i];
      p.vy += 0.22; // gravedad
      p.x += p.vx; p.y += p.vy;
      p.rot += p.velRot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.tam/2, -p.tam/2, p.tam, p.tam * 0.6);
      ctx.restore();
    }
    if (t < 3200) {
      requestAnimationFrame(loop);
    } else {
      overlay.remove();
      styleTag.remove();
    }
  }
  requestAnimationFrame(loop);
}
