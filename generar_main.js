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
  'recursos.txt'           // listados varios
];

// Archivos que SÍ son motor aunque su extensión no esté en EXT_MOTOR.
const INCLUIR = ['cache_admin.json'];

function esMotor(nombre) {
  if (EXCLUIR.includes(nombre)) return false;
  if (INCLUIR.includes(nombre)) return true;
  return EXT_MOTOR.some(function (ext) { return nombre.endsWith(ext); });
}

const archivos = fs.readdirSync('.').filter(esMotor).sort();

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
