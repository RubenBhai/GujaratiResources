const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// depurar_json.js
//
// Quita de los JSON de una lección los campos que NINGÚN motor lee.
// Verificado leyendo el código de los motores (Piensa en Gujarati v2).
//
//   node depurar_json.js                 → simulación (no escribe)
//   node depurar_json.js --aplicar       → escribe los JSON depurados
//   node depurar_json.js --dir=RUTA      → carpeta de la lección (por defecto: .)
//
// Qué se quita y por qué:
//
//   aprende_clase    audioH, roman        aprende.js solo usa audioM, gujarati,
//                    titulo, descripcion  significado e imagen
//   compone_clase    titulo, instruccion  compone.js los toma del HTML
//   generador_clase  rom                  generador.js pinta gu / es, nunca rom
//   juego_clase      desc                 juego.js nunca lo pinta
//                    img                  lo mete en imagenesB/imagenesC y esos
//                                         arrays no se usan en ningún sitio
//   leccion_intro    siguiente_leccion    el botón sale de boton_secundario
//   leccion_letra    imagen, roman        leccion_letra.js pinta la letra como
//                                         texto; solo usa consonante, detalle,
//                                         audio, reto_flash_json y plana
//   leccion_vocal    imagen (solo en los  la rama 'vocal' pinta gujarati como
//                    pasos vocal y        texto; la rama 'con_matra' pinta
//                    con_matra)           ecuaciones. Se CONSERVA la imagen en
//                                         los pasos 'matra' y 'plana', que sí
//                                         la usan
//   practica_clase   imagen, tipo         practica.js solo usa gujarati, espanol,
//                                         audioClip y audioClip2
//   reto_clase       titulo               los títulos de cada nivel están en el HTML
//   reto_flash       desc, img, modo      reto_flash.js no lee ninguno
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('-h') || args.includes('--help')) {
  console.log('Uso: node depurar_json.js [--aplicar] [--dir=RUTA]');
  console.log('  (sin flags)   Simulación: te dice qué quitaría');
  console.log('  --aplicar     Escribe los JSON depurados');
  console.log('  --dir=RUTA    Carpeta de la lección (por defecto: .)');
  process.exit(0);
}

const APLICAR = args.includes('--aplicar');
const flagDir = args.find(a => a.startsWith('--dir='));
const DIR = flagDir ? flagDir.slice(6) : '.';

// prefijo del archivo → { raiz: [...], hijos: [...] }
const REGLAS = {
  'aprende_clase':   { raiz: ['titulo', 'descripcion'], hijos: ['audioH', 'roman'] },
  'compone_clase':   { raiz: ['titulo', 'instruccion'],  hijos: [] },
  'generador_clase': { raiz: [], hijos: ['rom'] },
  'juego_clase':     { raiz: [], hijos: ['desc', 'img'] },
  'leccion_intro':   { raiz: ['siguiente_leccion'], hijos: [] },
  'leccion_letra':   { raiz: [], hijos: ['imagen', 'roman'] },
  'practica_clase':  { raiz: [], hijos: ['imagen', 'tipo'] },
  'reto_clase':      { raiz: ['titulo'], hijos: ['titulo'] },
  'reto_flash':      { raiz: ['modo'], hijos: ['desc', 'img'] },
};

let totalQuitados = 0, totalAntes = 0, totalDespues = 0;
const resumen = [];

function limpiarProfundo(nodo, campos, cuenta) {
  if (Array.isArray(nodo)) {
    nodo.forEach(n => limpiarProfundo(n, campos, cuenta));
  } else if (nodo && typeof nodo === 'object') {
    for (const c of campos) {
      if (Object.prototype.hasOwnProperty.call(nodo, c)) { delete nodo[c]; cuenta.n++; }
    }
    Object.values(nodo).forEach(v => limpiarProfundo(v, campos, cuenta));
  }
}

// leccion_vocal necesita lógica por rama: la imagen solo sobra en 'vocal' y 'con_matra'
function limpiarVocal(datos, cuenta) {
  (datos.pasos || []).forEach(p => {
    if ((p.tipo === 'vocal' || p.tipo === 'con_matra') && 'imagen' in p) {
      delete p.imagen; cuenta.n++;
    }
  });
}

let archivos;
try {
  archivos = fs.readdirSync(DIR).filter(n => n.endsWith('.json'));
} catch (e) {
  console.error(`❌ No pude leer "${DIR}": ${e.message}`);
  process.exit(1);
}

for (const nombre of archivos.sort()) {
  if (/_versionado\.json$/.test(nombre) || nombre.startsWith('assets_') || nombre.startsWith('trazos')) continue;

  const ruta = path.join(DIR, nombre);
  const bytesAntes = fs.statSync(ruta).size;
  const datos = JSON.parse(fs.readFileSync(ruta, 'utf-8'));
  const cuenta = { n: 0 };

  if (nombre.startsWith('leccion_vocal')) {
    limpiarVocal(datos, cuenta);
  } else {
    const clave = Object.keys(REGLAS).find(k => nombre.startsWith(k));
    if (!clave) continue;
    const { raiz, hijos } = REGLAS[clave];
    for (const c of raiz) {
      if (Object.prototype.hasOwnProperty.call(datos, c)) { delete datos[c]; cuenta.n++; }
    }
    if (hijos.length) {
      Object.values(datos).forEach(v => limpiarProfundo(v, hijos, cuenta));
    }
  }

  if (cuenta.n === 0) continue;

  const texto = JSON.stringify(datos, null, 2) + '\n';
  const bytesDespues = Buffer.byteLength(texto);
  if (APLICAR) fs.writeFileSync(ruta, texto);

  totalQuitados += cuenta.n;
  totalAntes += bytesAntes;
  totalDespues += bytesDespues;
  const ahorro = (100 * (bytesAntes - bytesDespues) / bytesAntes).toFixed(0);
  resumen.push(`   ${nombre.padEnd(38)} ${String(cuenta.n).padStart(3)} campos   −${ahorro}%`);
}

console.log(`Carpeta: ${DIR}\n`);
resumen.forEach(r => console.log(r));
console.log('\n' + '='.repeat(60));
console.log(`Campos eliminados: ${totalQuitados}`);
if (totalAntes) {
  const pct = (100 * (totalAntes - totalDespues) / totalAntes).toFixed(1);
  console.log(`Tamaño: ${(totalAntes/1024).toFixed(1)} KB → ${(totalDespues/1024).toFixed(1)} KB  (−${pct}%)`);
}
console.log('='.repeat(60));
console.log(APLICAR
  ? '\n💾 JSON depurados. Vuelve a generar el manifiesto.'
  : '\n🔍 SIMULACIÓN. Para aplicarlo:  node depurar_json.js --aplicar');
