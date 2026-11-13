/* ============================================================
   frases_chips.js — Módulo compartido de "chips ordenables".
   Adaptado de la mecánica de compone.js (banco + zona de construcción,
   tocar para poner/quitar, validación de orden la hace cada modo).
   Lo usan: Componer y Dictado. Requiere que `frases_base.js` (Frases)
   esté cargado antes.
   ============================================================ */
var FrasesChips = (function(){

  /* Sopa = piezas correctas + N distractores del banco (distintos por gu),
     todo barajado. Cada pieza es un bloque {gu, audio, es, ...}. */
  function sopa(correctas, banco, minD, maxD){
    var gusOk = correctas.map(function(p){ return p.gu; });
    var pool  = banco.filter(function(p){ return gusOk.indexOf(p.gu) === -1; });
    var n     = minD + Math.floor(Math.random() * (maxD - minD + 1));
    var distr = Frases.shuffle(pool).slice(0, n);
    return Frases.shuffle(correctas.concat(distr));
  }

  /* Crea un set de chips ordenables.
     config = { banco:El, construccion:El, piezas:[{gu,audio,...}], onTocar:fn(pieza) }
     Devuelve controlador: { construido, construidoGu, limpiar, bloquear } */
  function crear(config){
    var banco        = config.banco;
    var construccion = config.construccion;
    var onTocar      = config.onTocar || function(){};
    var piezas       = config.piezas || [];
    var construido   = [];
    var bloqueado    = false;

    banco.innerHTML = '';
    piezas.forEach(function(p, idx){
      var chip = document.createElement('button');
      chip.className   = 'chip gu';
      chip.lang        = 'gu';
      chip.textContent = p.gu;
      chip.dataset.idx = idx;
      chip.addEventListener('click', function(){
        if(bloqueado || chip.classList.contains('used')) return;
        chip.classList.add('used');
        construido.push({ pieza:p, chipIdx:idx });
        onTocar(p);
        pintar();
      });
      banco.appendChild(chip);
    });
    pintar();

    function pintar(){
      construccion.innerHTML = '';
      if(construido.length === 0){ construccion.classList.add('vacia'); return; }
      construccion.classList.remove('vacia');
      construido.forEach(function(item, i){
        var c = document.createElement('button');
        c.className   = 'chip-puesto gu';
        c.lang        = 'gu';
        c.textContent = item.pieza.gu;
        c.addEventListener('click', function(){
          if(bloqueado) return;
          var chip = banco.querySelector('.chip[data-idx="' + item.chipIdx + '"]');
          if(chip) chip.classList.remove('used');
          construido.splice(i, 1);
          pintar();
        });
        construccion.appendChild(c);
      });
    }

    return {
      construido:   function(){ return construido.map(function(x){ return x.pieza; }); },
      construidoGu: function(){ return construido.map(function(x){ return x.pieza.gu; }); },
      limpiar:      function(){
        construido = [];
        banco.querySelectorAll('.chip.used').forEach(function(c){ c.classList.remove('used'); });
        pintar();
      },
      bloquear:     function(b){ bloqueado = b; }
    };
  }

  return { sopa: sopa, crear: crear };
})();
