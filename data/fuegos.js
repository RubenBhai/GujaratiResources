/* fuegos.js — Fuegos artificiales: estallidos sucesivos de colores */
function ejecutarEfectoVictoria() {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; z-index:99999; pointer-events:none; overflow:hidden;';
  document.body.appendChild(overlay);
  var canvas = document.createElement('canvas');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%;';
  overlay.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var COLORES = ['#D9A441', '#A8362A', '#4A6B53', '#7A5FBF', '#E8D9C0', '#E89B3D'];
  var particulas = [];

  function estallido(cx, cy, color) {
    var n = 40 + Math.floor(Math.random() * 20);
    for (var i = 0; i < n; i++) {
      var ang = (Math.PI * 2 * i) / n;
      var vel = 2 + Math.random() * 4;
      particulas.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel,
        color: color,
        vida: 1,
        decaimiento: 0.008 + Math.random() * 0.012
      });
    }
  }

  var tiempos = [0, 400, 750, 1150, 1500, 1900];
  tiempos.forEach(function(ms) {
    setTimeout(function() {
      var cx = canvas.width * (0.25 + Math.random() * 0.5);
      var cy = canvas.height * (0.2 + Math.random() * 0.3);
      estallido(cx, cy, COLORES[Math.floor(Math.random() * COLORES.length)]);
    }, ms);
  });

  var inicio = performance.now();
  function loop(ahora) {
    var t = ahora - inicio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particulas.forEach(function(p) {
      p.vy += 0.03; // gravedad leve
      p.x += p.vx; p.y += p.vy;
      p.vida -= p.decaimiento;
      if (p.vida > 0) {
        ctx.globalAlpha = Math.max(0, p.vida);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    if (t < 4000) requestAnimationFrame(loop);
    else overlay.remove();
  }
  requestAnimationFrame(loop);
}
