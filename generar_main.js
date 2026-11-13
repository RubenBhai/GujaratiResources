// generar_main.js
// Crea assets_main.json con TODOS los archivos del motor del curso
// (páginas .html, código .js, estilos .css de la raíz), para que un loader
// tras index.html los baje una sola vez y el motor funcione sin internet.
//
// Se ejecuta EN LA RAÍZ del sitio (donde están los .html/.js/.css).
// Uso:  node generar_main.js

const fs = require('fs');

// Los archivos del motor se listan con ruta RELATIVA (solo el nombre).
// El loader los resuelve contra el dominio actual, así funcionan igual en
// piensaengujarati.com o en rubenbhai.github.io, y coinciden con la URL
// exacta con que el navegador pide cada página (que también es relativa).

// Extensiones que forman el motor
const EXT_MOTOR = ['.html', '.js', '.css'];

// Archivos que NO son motor: utilidades que corren en tu PC, o los maneja la PWA.
const EXCLUIR = [
  'sw.js',                 // el service worker se registra solo
  'manifest.json',         // lo gestiona la instalación PWA (además no es .html/.js/.css)
  'convertir_rutas.js',    // utilidad de escritorio
  'generar_manifiesto.js', // utilidad de escritorio
  'generar_main.js',       // este mismo script
  'preparar_subida.js',   // ← añadir
  'depurar_json.js',      // ← añadir
  'arreglar_alfa.js',     // ← añadir
  'huerfanos.js',         // ← añadir
  'recursos.txt',          // listados varios
  'tema-modulo.css',       // sin uso: ningún HTML lo enlaza (versión vieja de tema-contenido_modulo.css)
  'tema-amigable.css'      // sin uso: ningún HTML lo enlaza
];

// Archivos que SÍ son motor aunque su extensión no esté en EXT_MOTOR.
const INCLUIR = ['cache_admin.json'];

// Fuera de la raíz (o sin extensión de motor) pero necesarios sin internet:
// JSON de módulos y del curso de frases, efectos de victoria (data/*.js).
// version.txt NO va: solo sirve en línea y el sw.js no lo cachea (una copia
// vieja en caché provocaba recargas de más sin conexión).
const CARPETAS_EXTRA = [
  ['data',        ['.json', '.js']],
  ['data/frases', ['.json']]
];
const ARCHIVOS_EXTRA = [];

// Imágenes de la app (iconos PWA del manifest.json, apple-touch-icon y logo).
// Se incluyen SIEMPRE, aunque no estén en esta carpeta (la copia de código no
// trae imágenes): en el disco del autor y en GitHub sí existen.
const ICONOS = ['icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png',
                'imagenes/icon-192.png', 'imagenes/LearnGujarati_SuperInmersivo_Main.jpg'];

function esMotor(nombre) {
  if (EXCLUIR.includes(nombre)) return false;
  if (INCLUIR.includes(nombre)) return true;
  return EXT_MOTOR.some(function (ext) { return nombre.endsWith(ext); });
}

const archivos = fs.readdirSync('.').filter(esMotor).sort();

CARPETAS_EXTRA.forEach(function (par) {
  if (!fs.existsSync(par[0])) return;
  fs.readdirSync(par[0])
    .filter(function (n) { return par[1].some(function (e) { return n.endsWith(e); }); })
    .sort()
    .forEach(function (n) { archivos.push(par[0] + '/' + n); });
});
ARCHIVOS_EXTRA.forEach(function (f) {
  if (fs.existsSync(f)) archivos.push(f);
  else console.log('AVISO: no encuentro ' + f + ' (no se incluye)');
});

const assets = [];
let totalBytes = 0;

archivos.forEach(function (nombre) {
  const stat = fs.statSync(nombre);
  assets.push({
    url: nombre,                    // ruta relativa (se resuelve en el navegador)
    lastModified: stat.mtime.getTime(),
    size: stat.size
  });
  totalBytes += stat.size;
});

// Iconos: si no están aquí, se conserva la entrada que ya tuviera
// assets_main.json. Nunca se inventa una entrada: un archivo que no existe
// en el servidor nunca se cachea y dejaría al loader "pendiente" en cada
// arranque (barra de "Preparando el curso..." en cada entrada).
let previo = [];
try { previo = JSON.parse(fs.readFileSync('assets_main.json', 'utf8')).assets || []; } catch (e) {}
ICONOS.forEach(function (f) {
  if (fs.existsSync(f)) {
    const st = fs.statSync(f);
    assets.push({ url: f, lastModified: st.mtime.getTime(), size: st.size });
    totalBytes += st.size;
  } else {
    const ya = previo.find(function (a) { return a.url === f && a.size > 0; });
    if (ya) {
      assets.push(ya);
      totalBytes += ya.size;
      console.log('AVISO: ' + f + ' no está en esta carpeta; se conserva la entrada previa.');
    } else {
      console.log('AVISO: ' + f + ' no está aquí ni en assets_main.json previo: NO se incluye (genera desde el disco con las imágenes).');
    }
  }
});

const salida = { motor: 'main', assets: assets };
fs.writeFileSync('assets_main.json', JSON.stringify(salida, null, 2));

// Resumen
const nH = archivos.filter(function (f) { return f.endsWith('.html'); }).length;
const nJ = archivos.filter(function (f) { return f.endsWith('.js'); }).length;
const nC = archivos.filter(function (f) { return f.endsWith('.css'); }).length;

console.log('='.repeat(52));
console.log('assets_main.json creado');
console.log('  HTML: ' + nH + '  |  JS: ' + nJ + '  |  CSS: ' + nC);
console.log('  Total: ' + archivos.length + ' archivos del motor');
console.log('  Tamaño: ' + (totalBytes / 1024).toFixed(0) + ' KB (' + (totalBytes / 1024 / 1024).toFixed(2) + ' MB)');
console.log('='.repeat(52));
console.log('Excluidos (no son motor): ' + EXCLUIR.join(', '));
