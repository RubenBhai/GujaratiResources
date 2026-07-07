/* estrellas.js — Lluvia de estrellas doradas que titilan y caen */
function ejecutarEfectoVictoria() {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; z-index:99999; pointer-events:none; overflow:hidden;';
  document.body.appendChild(overlay);
  var canvas = document.createElement('canvas');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%;';
  overlay.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var COLORES = ['#F0C64A', '#E8D9A0', '#D9A441', '#FFE9A8'];
  var estrellas = [];
  for (var i = 0; i < 70; i++) {
    estrellas.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.6,
      vy: 1.5 + Math.random() * 2.5,
      color: COLORES[i % COLORES.length],
      tam: 6 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      velRot: (Math.random() - 0.5) * 0.1,
      titileo: Math.random() * Math.PI * 2
    });
  }

  function dibujarEstrella(x, y, r, rot, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (var i = 0; i < 5; i++) {
      var ang = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      var angInt = ang + Math.PI / 5;
      ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      ctx.lineTo(Math.cos(angInt) * r * 0.45, Math.sin(angInt) * r * 0.45);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  var inicio = performance.now();
  function loop(ahora) {
    var t = ahora - inicio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    estrellas.forEach(function(s) {
      s.y += s.vy;
      s.rot += s.velRot;
      s.titileo += 0.12;
      ctx.fillStyle = s.color;
      var alpha = 0.6 + Math.sin(s.titileo) * 0.4;
      dibujarEstrella(s.x, s.y, s.tam, s.rot, Math.max(0, alpha));
    });
    ctx.globalAlpha = 1;
    if (t < 4000) requestAnimationFrame(loop);
    else overlay.remove();
  }
  requestAnimationFrame(loop);
}
