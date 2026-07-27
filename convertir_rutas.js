/* ============================================================
   convertir_rutas.js
   Convierte las URLs absolutas del sitio en rutas RELATIVAS.

   Cubre DOS formas:
   1) La URL completa dentro de una cadena:
        'https://rubenbhai.github.io/GujaratiResources/audios/x.mp3'
        ->  'audios/x.mp3'
   2) La constante BASE sin barra final:
        const BASE = 'https://rubenbhai.github.io/GujaratiResources';
        ->  const BASE = '.';
      (porque luego se usa como BASE + '/audios/...')

   NO toca sw.js en su condición url.href.includes('rubenbhai...'),
   porque eso es lógica de dominio, no una ruta. Ese archivo se
   excluye por completo para evitar romper el cacheo.

   USO:  node convertir_rutas.js          (aplica)
         node convertir_rutas.js --dry     (solo muestra)
   ============================================================ */

const fs = require('fs');
const path = require('path');

const DOMINIO_BASE = 'https://rubenbhai.github.io/GujaratiResources';
const PREFIJO      = DOMINIO_BASE + '/';        // con barra: forma 1

const EXTENSIONES = ['.js', '.html', '.json', '.css'];

// sw.js se excluye a propósito: su mención al dominio es una condición
// de cacheo, no una ruta. Convertirla rompería el service worker.
const EXCLUIR = ['convertir_rutas.js', 'generar_manifiesto.js', 'sw.js'];

const modoPrueba = process.argv.includes('--dry');

let totalArchivos = 0, totalReemplazos = 0;
const detalle = [];

function procesarCarpeta(carpeta) {
  for (const e of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      procesarCarpeta(ruta);
    } else if (EXTENSIONES.includes(path.extname(e.name)) && !EXCLUIR.includes(e.name)) {
      procesarArchivo(ruta);
    }
  }
}

function procesarArchivo(ruta) {
  const original = fs.readFileSync(ruta, 'utf-8');
  let texto = original;
  let n = 0;

  // Forma 2 PRIMERO: BASE = '...GujaratiResources'  (sin barra, entre comillas)
  // Solo cuando el dominio va pegado a una comilla de cierre.
  ['\'', '"', '`'].forEach(q => {
    const patron = DOMINIO_BASE + q;      // el dominio seguido de comilla de cierre
    while (texto.indexOf(patron) !== -1) {
      texto = texto.replace(patron, '.' + q);   // -> '.'  (punto = carpeta actual)
      n++;
    }
  });

  // Forma 1: la URL completa con barra
  const trozos = texto.split(PREFIJO).length - 1;
  if (trozos > 0) {
    texto = texto.split(PREFIJO).join('');
    n += trozos;
  }

  if (n === 0) return;

  totalArchivos++;
  totalReemplazos += n;
  detalle.push({ archivo: path.relative('.', ruta), reemplazos: n });

  if (!modoPrueba) fs.writeFileSync(ruta, texto);
}

console.log(modoPrueba ? '── MODO PRUEBA (no se escribe) ──\n'
                       : '── Convirtiendo rutas a relativas ──\n');
procesarCarpeta('.');
detalle.sort((a, b) => b.reemplazos - a.reemplazos);
detalle.forEach(d => console.log(`  ${d.reemplazos.toString().padStart(3)}  ${d.archivo}`));
console.log('\n' + '='.repeat(48));
console.log(`  Archivos afectados: ${totalArchivos}`);
console.log(`  Reemplazos totales: ${totalReemplazos}`);
console.log(`  (sw.js excluido a propósito — no tocar su condición)`);
console.log('='.repeat(48));
if (modoPrueba) console.log('\nEjecuta sin --dry para aplicar.');
