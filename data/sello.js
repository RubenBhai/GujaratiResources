/* sello.js — Un sello de "¡APROBADO!" que cae, golpea y rebota */
function ejecutarEfectoVictoria() {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; z-index:99999; pointer-events:none; overflow:hidden; ' +
    'display:flex; align-items:center; justify-content:center;';
  document.body.appendChild(overlay);

  var styleTag = document.createElement('style');
  styleTag.textContent =
    '@keyframes efvSelloGolpe {' +
      '0%{opacity:0; transform:scale(3) rotate(-18deg);}' +
      '40%{opacity:1; transform:scale(0.9) rotate(-12deg);}' +
      '55%{transform:scale(1.08) rotate(-12deg);}' +
      '70%{transform:scale(0.97) rotate(-12deg);}' +
      '100%{opacity:1; transform:scale(1) rotate(-12deg);}' +
    '}' +
    '@keyframes efvSelloSalida { 0%{opacity:1;} 100%{opacity:0;} }';
  document.head.appendChild(styleTag);

  var sello = document.createElement('div');
  sello.textContent = '¡APROBADO!';
  sello.style.cssText =
    'font-family:"Fraunces",serif; font-size:2.6rem; font-weight:700; letter-spacing:2px; ' +
    'color:#A8362A; border:6px solid #A8362A; border-radius:14px; padding:14px 34px; ' +
    'box-shadow:0 0 0 3px rgba(168,54,42,0.15); text-transform:uppercase; ' +
    'animation:efvSelloGolpe 0.7s cubic-bezier(.2,1.2,.3,1) forwards;';
  overlay.appendChild(sello);

  setTimeout(function() {
    sello.style.animation = 'efvSelloSalida 0.5s ease forwards';
  }, 1900);
  setTimeout(function() {
    overlay.remove();
    styleTag.remove();
  }, 2500);
}
