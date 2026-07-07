/* destello.js — Destello dorado discreto, sin partículas. Elegante y breve. */
function ejecutarEfectoVictoria() {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; z-index:99999; pointer-events:none; overflow:hidden; ' +
    'display:flex; align-items:center; justify-content:center;';
  document.body.appendChild(overlay);

  var styleTag = document.createElement('style');
  styleTag.textContent =
    '@keyframes efvDestelloBrillo { 0%{opacity:0;} 20%{opacity:0.7;} 100%{opacity:0;} }' +
    '@keyframes efvDestelloTexto { 0%{opacity:0; transform:scale(0.6);} 25%{opacity:1; transform:scale(1.05);} 40%{transform:scale(1);} 80%{opacity:1;} 100%{opacity:0; transform:scale(1);} }';
  document.head.appendChild(styleTag);

  var brillo = document.createElement('div');
  brillo.style.cssText =
    'position:absolute; width:80vmin; height:80vmin; border-radius:50%; ' +
    'background:radial-gradient(circle, rgba(240,198,74,0.6) 0%, rgba(240,198,74,0) 65%); ' +
    'animation:efvDestelloBrillo 1.6s ease-out forwards;';
  overlay.appendChild(brillo);

  var texto = document.createElement('div');
  texto.textContent = '¡Bravo!';
  texto.style.cssText =
    'position:relative; font-family:"Fraunces",serif; font-size:3rem; font-weight:700; ' +
    'color:#B8863D; text-shadow:0 2px 20px rgba(240,198,74,0.6); ' +
    'animation:efvDestelloTexto 2s ease-out forwards;';
  overlay.appendChild(texto);

  setTimeout(function() {
    overlay.remove();
    styleTag.remove();
  }, 2100);
}
