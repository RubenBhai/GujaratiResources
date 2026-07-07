/* petalos.js — Pétalos de flores cayendo (caléndula/marigold, guirnaldas indias) */
function ejecutarEfectoVictoria() {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; z-index:99999; pointer-events:none; overflow:hidden;';
  document.body.appendChild(overlay);
  var canvas = document.createElement('canvas');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%;';
  overlay.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var COLORES = ['#E8912A', '#F0A93D', '#D96E1E', '#E8B84A', '#C85A1A'];
  var petalos = [];
  for (var i = 0; i < 90; i++) {
    petalos.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.6,
      vy: 1.5 + Math.random() * 2,
      color: COLORES[i % COLORES.length],
      tam: 7 + Math.random() * 7,
      rot: Math.random() * Math.PI * 2,
      velRot: (Math.random() - 0.5) * 0.15,
      bamboleo: Math.random() * Math.PI * 2,
      ampBamboleo: 1 + Math.random() * 1.5
    });
  }

  function dibujarPetalo(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    // pétalo = dos curvas que forman una gota
    ctx.beginPath();
    ctx.moveTo(0, -p.tam);
    ctx.quadraticCurveTo(p.tam * 0.7, -p.tam * 0.2, 0, p.tam);
    ctx.quadraticCurveTo(-p.tam * 0.7, -p.tam * 0.2, 0, -p.tam);
    ctx.fill();
    // vena central más oscura
    ctx.strokeStyle = 'rgba(150,70,15,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -p.tam * 0.8); ctx.lineTo(0, p.tam * 0.8); ctx.stroke();
    ctx.restore();
  }

  var inicio = performance.now();
  function loop(ahora) {
    var t = ahora - inicio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    petalos.forEach(function(p) {
      p.bamboleo += 0.04;
      p.x += Math.sin(p.bamboleo) * p.ampBamboleo;
      p.y += p.vy;
      p.rot += p.velRot;
      dibujarPetalo(p);
    });
    if (t < 4500) requestAnimationFrame(loop);
    else overlay.remove();
  }
  requestAnimationFrame(loop);
}
