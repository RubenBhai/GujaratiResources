/* confeti.js — Confeti cayendo desde el borde superior */
function ejecutarEfectoVictoria() {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; z-index:99999; pointer-events:none; overflow:hidden;';
  document.body.appendChild(overlay);
  var canvas = document.createElement('canvas');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%;';
  overlay.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var COLORES = ['#B8863D', '#A8362A', '#4A6B53', '#7A5FBF', '#E8D9C0', '#D9A441'];
  var particulas = [];
  for (var i = 0; i < 140; i++) {
    particulas.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 3,
      color: COLORES[i % COLORES.length],
      tam: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      velRot: (Math.random() - 0.5) * 0.2,
      bamboleo: Math.random() * Math.PI * 2
    });
  }

  var inicio = performance.now();
  function loop(ahora) {
    var t = ahora - inicio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particulas.forEach(function(p) {
      p.bamboleo += 0.05;
      p.x += p.vx + Math.sin(p.bamboleo) * 1.2;
      p.y += p.vy;
      p.rot += p.velRot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.tam / 2, -p.tam / 2, p.tam, p.tam * 0.55);
      ctx.restore();
    });
    if (t < 3500) requestAnimationFrame(loop);
    else overlay.remove();
  }
  requestAnimationFrame(loop);
}
