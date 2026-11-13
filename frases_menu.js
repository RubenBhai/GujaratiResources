/* ============================================================
   frases_menu.js — Menú de categorías (puerta del curso de frases).
   Lee data/frases/categorias.json y arma una tarjeta por categoría,
   cada una hacia el hub de modos: frases_hub.html?set=<set>.
   ============================================================ */
(function(){
  var URL = 'data/frases/categorias.json';

  fetch(URL + '?t=' + Date.now(), { cache:'no-store' })
    .then(function(r){ if(!r.ok) throw new Error('404'); return r.json(); })
    .then(function(data){
      if(data.titulo) document.getElementById('menu-titulo').textContent = data.titulo;
      document.getElementById('menu-desc').textContent = data.descripcion || '';

      var lista = document.getElementById('cat-lista');
      var cats  = data.categorias || [];
      if(cats.length === 0){
        lista.innerHTML = '<p class="hint">Aún no hay categorías disponibles.</p>';
        return;
      }
      var html = '';
      cats.forEach(function(c){
        html += '<a class="cat-card" href="frases_hub.html?set=' + encodeURIComponent(c.set) + '">';
        html +=   '<span class="cat-icono">' + (c.icono || '💬') + '</span>';
        html +=   '<span class="cat-info">';
        html +=     '<span class="cat-nombre">' + (c.nombre || c.set) + '</span>';
        if(c.descripcion) html += '<span class="cat-desc">' + c.descripcion + '</span>';
        html +=   '</span>';
        html +=   '<span class="cat-flecha">→</span>';
        html += '</a>';
      });
      lista.innerHTML = html;
    })
    .catch(function(){
      document.getElementById('cat-lista').innerHTML =
        '<p class="error-carga">No se pudo cargar el curso de frases. Revisa tu conexión.</p>';
    });

  Frases.checarVersion();
})();
