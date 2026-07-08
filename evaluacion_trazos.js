/* ═══════════════════════════════════════════════════════════════
   evaluacion_trazos.js — Evaluación geométrica de trazos (compartido)
   ═══════════════════════════════════════════════════════════════
   Usado por leccion_plana.html y leccion_vocal.html (paso "plana").
   Matemática pura, sin nada de DOM/canvas.
   
   *Incluye normalización global (Traslación + Escalado Uniforme) 
   para evaluar únicamente la FORMA y DIRECCIÓN del trazo, perdonando
   el tamaño y la posición exacta en la pantalla del celular.

   Expone:
     validarPlanaCompleta(segmentosJSON, trazosEstudiante)
       → { porcentaje: 0-100, porSegmento: [pct_seg1, pct_seg2, ...] }
   ═══════════════════════════════════════════════════════════════ */

const N_REMUESTREO = 64;            
const DISTANCIA_MAX_PARA_CERO = 40; 

function distanciaPuntos(p1, p2){ return Math.hypot(p1.x - p2.x, p1.y - p2.y); }

function longitudTotal(puntos){
  let total = 0;
  for (let i = 1; i < puntos.length; i++) total += distanciaPuntos(puntos[i-1], puntos[i]);
  return total;
}

function remuestrear(puntosOriginales, n){
  if (!puntosOriginales || puntosOriginales.length === 0) {
    return new Array(n).fill(0).map(function(){ return { x: 0, y: 0 }; });
  }
  if (puntosOriginales.length < 2) {
    const p = puntosOriginales[0];
    return new Array(n).fill(0).map(function(){ return { x: p.x, y: p.y }; });
  }

  const totalLen = longitudTotal(puntosOriginales);
  if (totalLen === 0) {
    return new Array(n).fill(0).map(function(){ return { x: puntosOriginales[0].x, y: puntosOriginales[0].y }; });
  }

  const espaciado = totalLen / (n - 1);
  let distanciaAcumulada = 0;
  const nuevosPuntos = [{ x: puntosOriginales[0].x, y: puntosOriginales[0].y }];

  let pt1 = puntosOriginales[0];
  let i = 1;

  while (i < puntosOriginales.length) {
    const pt2 = puntosOriginales[i];
    const d = distanciaPuntos(pt1, pt2);

    if (distanciaAcumulada + d >= espaciado) {
      const proporcion = (espaciado - distanciaAcumulada) / (d || 1);
      const q = {
        x: pt1.x + proporcion * (pt2.x - pt1.x),
        y: pt1.y + proporcion * (pt2.y - pt1.y)
      };
      nuevosPuntos.push(q);
      pt1 = q; 
      distanciaAcumulada = 0;
    } else {
      distanciaAcumulada += d;
      pt1 = pt2;
      i++; 
    }
  }

  while (nuevosPuntos.length < n) {
    const u = puntosOriginales[puntosOriginales.length - 1];
    nuevosPuntos.push({ x: u.x, y: u.y });
  }
  while (nuevosPuntos.length > n) {
    nuevosPuntos.pop();
  }

  return nuevosPuntos;
}

function poligonoDesdeSubVectores(subVectores){
  return [subVectores[0].origen].concat(subVectores.map(function(v){ return v.destino; }));
}

function distanciaPromedioRemuestreada(subVectores, trazo){
  const guia = remuestrear(poligonoDesdeSubVectores(subVectores), N_REMUESTREO);
  const est  = remuestrear(trazo, N_REMUESTREO);
  let suma = 0;
  for (let i = 0; i < N_REMUESTREO; i++) suma += distanciaPuntos(guia[i], est[i]);
  return suma / N_REMUESTREO;
}

// -----------------------------------------------------------------------------
// NORMALIZACIÓN DE CAJA DELIMITADORA (TAMAÑO Y POSICIÓN)
// -----------------------------------------------------------------------------

function calcularCajaDelimitadoraTrazos(trazos) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  trazos.forEach(function(trazo) {
    trazo.forEach(function(p) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
  });
  return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function calcularCajaDelimitadoraGuia(segmentosJSON) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  Object.keys(segmentosJSON).forEach(function(nombre) {
    segmentosJSON[nombre].forEach(function(v) {
      [v.origen, v.destino].forEach(function(p) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });
    });
  });
  return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

// Centra y escala el dibujo del estudiante para que coincida en proporciones con la guía
function normalizarTrazosGlobalmente(segmentosJSON, trazosEstudiante) {
  if (!trazosEstudiante || trazosEstudiante.length === 0) return trazosEstudiante;

  const cajaGuia = calcularCajaDelimitadoraGuia(segmentosJSON);
  const cajaEst = calcularCajaDelimitadoraTrazos(trazosEstudiante);

  if (cajaGuia.cx === Infinity || cajaEst.cx === Infinity) return trazosEstudiante;

  // Calculamos la dimensión mayor para aplicar una escala uniforme y no deformar la letra
  const maxDimGuia = Math.max(cajaGuia.maxX - cajaGuia.minX, cajaGuia.maxY - cajaGuia.minY);
  const maxDimEst  = Math.max(cajaEst.maxX - cajaEst.minX, cajaEst.maxY - cajaEst.minY);
  
  // Si el estudiante dibujó muy pequeño, la escala será mayor a 1 (lo agranda).
  // Si dibujó muy grande, la escala será menor a 1 (lo achica).
  const escala = (maxDimEst > 0) ? (maxDimGuia / maxDimEst) : 1;

  return trazosEstudiante.map(function(trazo) {
    return trazo.map(function(p) {
      // 1. Centramos el punto respecto al dibujo del estudiante
      let nx = p.x - cajaEst.cx;
      let ny = p.y - cajaEst.cy;
      
      // 2. Escalamos el tamaño
      nx *= escala;
      ny *= escala;

      // 3. Movemos el punto escalado hacia el centro de la guía ideal
      return { x: nx + cajaGuia.cx, y: ny + cajaGuia.cy };
    });
  });
}

// -----------------------------------------------------------------------------
// FUNCIÓN PRINCIPAL DE EVALUACIÓN
// -----------------------------------------------------------------------------

function validarPlanaCompleta(segmentosJSON, trazosEstudiante){
  // Normalizamos (tamaño y centro) antes de evaluar matemáticamente
  const trazosNormalizados = normalizarTrazosGlobalmente(segmentosJSON, trazosEstudiante);

  const nombresOrdenados = Object.keys(segmentosJSON)
    .sort(function(a, b){ return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]); });

  const porcentajesPorSegmento = [];

  nombresOrdenados.forEach(function(nombre){
    const subVectores = segmentosJSON[nombre];

    let mejorDistancia = Infinity;
    
    trazosNormalizados.forEach(function(trazo){
      const d = distanciaPromedioRemuestreada(subVectores, trazo);
      if (d < mejorDistancia) mejorDistancia = d;
    });

    const pctSegmento = Math.max(0, Math.min(100, Math.round(100 * (1 - mejorDistancia / DISTANCIA_MAX_PARA_CERO))));
    porcentajesPorSegmento.push(pctSegmento);
  });

  const porcentajeFinal = porcentajesPorSegmento.length
    ? Math.round(porcentajesPorSegmento.reduce(function(a,b){ return a+b; }, 0) / porcentajesPorSegmento.length)
    : 0;

  return { porcentaje: porcentajeFinal, porSegmento: porcentajesPorSegmento };
}