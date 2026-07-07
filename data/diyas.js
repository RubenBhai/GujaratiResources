/* diyas.js — Lámparas de aceite (diyas) que se encienden una por una, estilo Diwali */
function ejecutarEfectoVictoria() {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; z-index:99999; pointer-events:none; overflow:hidden;';
  document.body.appendChild(overlay);
  var canvas = document.createElement('canvas');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%;';
  overlay.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var n = 7;
  var diyas = [];
  var margen = canvas.width * 0.12;
  var ancho = canvas.width - margen * 2;
  var baseY = canvas.height * 0.62;
  for (var i = 0; i < n; i++) {
    diyas.push({
      x: margen + (ancho * i) / (n - 1),
      y: baseY + Math.sin(i * 0.9) * 24, // ligera onda para que no sea una línea recta
      encendida: false,
      encenderEn: 200 + i * 260,
      parpadeo: Math.random() * Math.PI * 2
    });
  }

  var inicio = performance.now();
  function loop(ahora) {
    var t = ahora - inicio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    diyas.forEach(function(d) {
      if (!d.encendida && t >= d.encenderEn) d.encendida = true;

      // base de barro de la diya (semi-elipse)
      ctx.fillStyle = '#6E4A2F';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 26, 10, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#8A5E3B';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 26, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (d.encendida) {
        d.parpadeo += 0.2;
        var flick = 1 + Math.sin(d.parpadeo) * 0.15;
        var fy = d.y - 8;
        // halo
        var grad = ctx.createRadialGradient(d.x, fy, 2, d.x, fy, 55 * flick);
        grad.addColorStop(0, 'rgba(255,200,90,0.55)');
        grad.addColorStop(1, 'rgba(255,200,90,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(d.x, fy, 55 * flick, 0, Math.PI * 2); ctx.fill();
        // llama
        ctx.fillStyle = '#FFD24A';
        ctx.beginPath();
        ctx.moveTo(d.x, fy - 20 * flick);
        ctx.quadraticCurveTo(d.x + 7, fy - 4, d.x, fy + 2);
        ctx.quadraticCurveTo(d.x - 7, fy - 4, d.x, fy - 20 * flick);
        ctx.fill();
        ctx.fillStyle = '#FF8A3D';
        ctx.beginPath();
        ctx.moveTo(d.x, fy - 12 * flick);
        ctx.quadraticCurveTo(d.x + 4, fy - 3, d.x, fy + 1);
        ctx.quadraticCurveTo(d.x - 4, fy - 3, d.x, fy - 12 * flick);
        ctx.fill();
      }
    });

    if (t < 4500) requestAnimationFrame(loop);
    else overlay.remove();
  }
  requestAnimationFrame(loop);
}
