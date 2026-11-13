#!/usr/bin/env node
/**
 * preparar_subida.js — junta en dos carpetas los recursos de UNA lección
 * para subirlos a GitHub de una sola vez.
 *
 * Ejecútalo DESDE LA RAÍZ de GujaratiResources (donde están audios/ e imagenes/).
 *
 *   node preparar_subida.js                    -> simulación de la 1.1.2
 *   node preparar_subida.js --aplicar          -> copia de verdad
 *   node preparar_subida.js 1.1.3 --aplicar    -> otra lección
 *   node preparar_subida.js --nuevos --aplicar -> solo lo que NO está ya en 1.1.1
 *   node preparar_subida.js --plano --aplicar  -> todo suelto, sin subcarpetas
 *   node preparar_subida.js --help
 *
 * Lee  assets_<leccion>_versionado.json  (el que genera generar_manifiesto.js)
 * y copia cada recurso a:
 *
 *   Subir_a_GitHub_Audios/     <- .mp3
 *   Subir_a_GitHub_Imagenes/   <- .jpg / .png
 *
 * Por defecto conserva la ruta original dentro de cada carpeta
 * (audios/clase_1_1/..., audios/musica/..., videos/clase_1_1/...), así puedes
 * arrastrar el CONTENIDO de la carpeta a la raíz del repo en GitHub y cada
 * archivo cae en su sitio solo. Con --plano los deja todos sueltos.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- argumentos
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
  process.exit(0);
}

const APLICAR = args.includes('--aplicar');
const PLANO   = args.includes('--plano');
const NUEVOS  = args.includes('--nuevos');
const LECCION = args.find(a => /^\d+\.\d+\.\d+$/.test(a)) || '1.1.2';

const DIR_AUDIOS   = 'Subir_a_GitHub_Audios';
const DIR_IMAGENES = 'Subir_a_GitHub_Imagenes';

const EXT_AUDIO  = new Set(['.mp3', '.m4a', '.ogg', '.wav']);
const EXT_IMAGEN = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

// ---------------------------------------------------------------- utilidades
function guion(l) { return l.replace(/\./g, '_'); }

/** Busca el manifiesto en los sitios habituales. */
function buscarManifiesto(leccion) {
  const nombres = [
    `assets_${guion(leccion)}_versionado.json`,
    `assets_${guion(leccion)}.json`,
  ];
  const carpetas = ['.', `data/${guion(leccion)}`, `data/${leccion}`];
  for (const n of nombres) {
    for (const c of carpetas) {
      const p = path.join(c, n);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

/** Devuelve la lista de rutas de un manifiesto, sea del formato que sea. */
function leerRutas(archivo) {
  const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  const bruto = Array.isArray(datos) ? datos : (datos.assets || datos.recursos || []);
  return bruto
    .map(x => (typeof x === 'string' ? x : x.url))
    .filter(Boolean)
    .map(u => u.replace(/^\.?\//, '').split('?')[0]);
}

function tamano(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function borrarCarpeta(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------- manifiesto
const manifiesto = buscarManifiesto(LECCION);

if (!manifiesto) {
  console.error(`\nNo encuentro assets_${guion(LECCION)}_versionado.json.`);
  console.error('Genéralo primero:');
  console.error(`    node generar_manifiesto.js ${LECCION} --local\n`);
  console.error('Y ejecuta este script desde la raíz de GujaratiResources.\n');
  process.exit(1);
}

let rutas = leerRutas(manifiesto);

if (!manifiesto.includes('_versionado')) {
  console.log(`AVISO: uso ${manifiesto} (el versionado no existe todavía).\n`);
}

// --nuevos: quita lo que ya está en el manifiesto de la lección anterior
let excluidos = 0;
if (NUEVOS) {
  const partes = LECCION.split('.');
  const anterior = [partes[0], partes[1], String(Number(partes[2]) - 1)].join('.');
  const manAnterior = buscarManifiesto(anterior);
  if (manAnterior) {
    const yaSubidos = new Set(leerRutas(manAnterior));
    const antes = rutas.length;
    rutas = rutas.filter(r => !yaSubidos.has(r));
    excluidos = antes - rutas.length;
    console.log(`--nuevos: fuera ${excluidos} recursos que ya están en ${anterior}.\n`);
  } else {
    console.log(`--nuevos: no encuentro el manifiesto de ${anterior}, copio todo.\n`);
  }
}

// ---------------------------------------------------------------- clasificar
const plan = [];      // { origen, destino, bytes }
const faltan = [];
const otros = [];
const vistos = new Set();

for (const ruta of rutas) {
  if (vistos.has(ruta)) continue;
  vistos.add(ruta);

  const ext = path.extname(ruta).toLowerCase();
  let base;
  if (EXT_AUDIO.has(ext))       base = DIR_AUDIOS;
  else if (EXT_IMAGEN.has(ext)) base = DIR_IMAGENES;
  else { otros.push(ruta); continue; }

  if (!fs.existsSync(ruta)) { faltan.push(ruta); continue; }

  const destino = PLANO
    ? path.join(base, path.basename(ruta))
    : path.join(base, ruta);

  plan.push({ origen: ruta, destino, bytes: fs.statSync(ruta).size });
}

// --plano: avisa si dos archivos distintos acabarían con el mismo nombre
if (PLANO) {
  const porDestino = new Map();
  for (const p of plan) {
    if (!porDestino.has(p.destino)) porDestino.set(p.destino, []);
    porDestino.get(p.destino).push(p.origen);
  }
  const choques = [...porDestino.entries()].filter(([, v]) => v.length > 1);
  if (choques.length) {
    console.error('\nCHOQUE DE NOMBRES con --plano. Estos archivos se pisarían:\n');
    for (const [d, v] of choques) console.error(`  ${d}\n      <- ${v.join('\n      <- ')}`);
    console.error('\nQuita --plano para conservar las subcarpetas.\n');
    process.exit(1);
  }
}

// ---------------------------------------------------------------- resumen
const audios   = plan.filter(p => p.destino.startsWith(DIR_AUDIOS));
const imagenes = plan.filter(p => p.destino.startsWith(DIR_IMAGENES));

console.log(`Manifiesto: ${manifiesto}`);
console.log(`Lección:    ${LECCION}`);
console.log(`Modo:       ${APLICAR ? 'COPIANDO' : 'simulación'}${PLANO ? ' · plano' : ''}${NUEVOS ? ' · solo nuevos' : ''}`);
console.log('');
console.log(`  ${DIR_AUDIOS.padEnd(24)} ${String(audios.length).padStart(4)} archivos  ${tamano(audios.reduce((s, p) => s + p.bytes, 0))}`);
console.log(`  ${DIR_IMAGENES.padEnd(24)} ${String(imagenes.length).padStart(4)} archivos  ${tamano(imagenes.reduce((s, p) => s + p.bytes, 0))}`);
console.log('');

if (faltan.length) {
  console.log(`FALTAN ${faltan.length} recursos en tu disco (no se copian):\n`);
  for (const f of faltan) console.log('  ' + f);
  console.log('');
}

if (otros.length) {
  console.log(`${otros.length} recursos con extensión que no es audio ni imagen (ignorados):\n`);
  for (const o of otros) console.log('  ' + o);
  console.log('');
}

// ---------------------------------------------------------------- copiar
if (!APLICAR) {
  console.log('Esto fue una simulación. Para copiar de verdad:');
  console.log(`    node preparar_subida.js ${LECCION}${NUEVOS ? ' --nuevos' : ''}${PLANO ? ' --plano' : ''} --aplicar\n`);
  process.exit(faltan.length ? 2 : 0);
}

borrarCarpeta(DIR_AUDIOS);
borrarCarpeta(DIR_IMAGENES);

for (const p of plan) {
  fs.mkdirSync(path.dirname(p.destino), { recursive: true });
  fs.copyFileSync(p.origen, p.destino);
}

console.log(`Copiados ${plan.length} archivos.\n`);

if (PLANO) {
  console.log('Sube el contenido de cada carpeta a su destino en GitHub:');
  console.log(`    ${DIR_AUDIOS}/    -> audios/clase_1_1/`);
  console.log(`    ${DIR_IMAGENES}/  -> imagenes/Clase_1_1/`);
  console.log('\n(Ojo: con --plano, si el manifiesto trae algo de audios/musica/ o');
  console.log(' videos/, tendrás que moverlo a mano en el repo.)\n');
} else {
  const raiz = [...new Set(plan.map(p => p.origen.split('/')[0]))].sort();
  console.log('Cada carpeta ya trae la estructura de destino:');
  for (const d of raiz) console.log(`    ${d}/...`);
  console.log('\nEn GitHub, "Add file > Upload files" y arrastra el CONTENIDO de');
  console.log(`${DIR_AUDIOS}/ y ${DIR_IMAGENES}/ a la raíz del repo.`);
  console.log('Cada archivo cae en su carpeta solo.\n');
}

if (faltan.length) {
  console.log(`Recuerda: quedan ${faltan.length} recursos por grabar/crear (lista arriba).\n`);
  process.exit(2);
}
