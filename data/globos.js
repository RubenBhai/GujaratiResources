/* globos.js — Globos que suben flotando desde abajo */
function ejecutarEfectoVictoria() {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; z-index:99999; pointer-events:none; overflow:hidden;';
  document.body.appendChild(overlay);
  var canvas = document.createElement('canvas');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%;';
  overlay.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var COLORES = ['#A8362A', '#4A6B53', '#7A5FBF', '#D9A441', '#B8506A', '#3D8AAE'];
  var globos = [];
  for (var i = 0; i < 16; i++) {
    globos.push({
      x: 40 + Math.random() * (canvas.width - 80),
      y: canvas.height + 40 + Math.random() * canvas.height,
      vy: 1 + Math.random() * 1.6,
      rx: 22 + Math.random() * 12,
      color: COLORES[i % COLORES.length],
      bamboleo: Math.random() * Math.PI * 2,
      ampBamboleo: 0.5 + Math.random()
    });
  }

  var inicio = performance.now();
  function loop(ahora) {
    var t = ahora - inicio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    globos.forEach(function(g) {
      g.bamboleo += 0.03;
      g.y -= g.vy;
      var x = g.x + Math.sin(g.bamboleo) * g.ampBamboleo * 8;
      var ry = g.rx * 1.2;
      // cuerda
      ctx.strokeStyle = 'rgba(120,110,90,0.5)';
      ctx.beginPath(); ctx.moveTo(x, g.y + ry); ctx.lineTo(x, g.y + ry + 26); ctx.stroke();
      // globo
      ctx.fillStyle = g.color;
      ctx.beginPath(); ctx.ellipse(x, g.y, g.rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      // brillo
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(x - g.rx * 0.3, g.y - ry * 0.3, g.rx * 0.25, ry * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
    });
    if (t < 5000) requestAnimationFrame(loop);
    else overlay.remove();
  }
  requestAnimationFrame(loop);
}
