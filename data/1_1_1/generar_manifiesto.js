const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Argumentos ────────────────────────────────────────────────────────────────
//   node generar_manifiesto.js 1.1.2                  → contra GitHub Pages (producción)
//   node generar_manifiesto.js 1.1.2 --local          → contra http://localhost:8000/
//   node generar_manifiesto.js 1.1.2 --local=3000     → contra http://localhost:3000/
//   node generar_manifiesto.js 1.1.2 --base=http://192.168.1.50:8000/   → servidor a medida
const args = process.argv.slice(2);

if (args.includes('-h') || args.includes('--help')) {
  console.log('Uso: node generar_manifiesto.js <leccion> [--local[=puerto]] [--base=URL]');
  console.log('');
  console.log('  <leccion>        Número de lección, ej: 1.1.2');
  console.log('  --local          Busca los recursos en http://localhost:8000/');
  console.log('  --local=3000     Igual, pero en el puerto que indiques');
  console.log('  --base=URL       Busca los recursos en la URL base que indiques');
  console.log('');
  console.log('Sin flags, busca en https://rubenbhai.github.io/GujaratiResources/');
  process.exit(0);
}

const leccion = args.find(a => !a.startsWith('-'));
if (!leccion) {
  console.error('Por favor, indica el número de la lección.');
  console.error('Ejemplo de uso: node generar_manifiesto.js 1.1.2');
  console.error('               node generar_manifiesto.js 1.1.2 --local');
  process.exit(1);
}

// Reemplazar los puntos por guiones bajos para armar el nombre del archivo (ej. "1_1_1")
const leccionFolder = leccion.replace(/\./g, '_');

// ── Rutas: el manifiesto se GUARDA relativo (para que coincida con el dominio
//    que sirve la app), pero para MEDIR cada asset por HTTP se necesita absoluto.
const PREFIJO_PROD = 'https://rubenbhai.github.io/GujaratiResources/';

function conBarraFinal(u) {
  return u.endsWith('/') ? u : u + '/';
}

let BASE_URL = PREFIJO_PROD;
let esLocal = false;

const flagBase  = args.find(a => a.startsWith('--base='));
const flagLocal = args.find(a => a === '--local' || a.startsWith('--local='));

if (flagBase) {
  BASE_URL = conBarraFinal(flagBase.slice('--base='.length));
  esLocal = /localhost|127\.0\.0\.1|192\.168\.|^http:\/\//i.test(BASE_URL);
} else if (flagLocal) {
  const puerto = flagLocal.includes('=') ? flagLocal.split('=')[1] : '8000';
  BASE_URL = `http://localhost:${puerto}/`;
  esLocal = true;
}

function resolverAbs(u){
  if (/^https?:\/\//i.test(u)) return u;          // ya es absoluta → tal cual
  return BASE_URL + u.replace(/^\.?\/*/, '');      // relativa → absoluta (solo para fetch)
}
function aRelativo(u){
  // El manifiesto SIEMPRE se guarda con rutas relativas, sea cual sea la base
  // que hayamos consultado, para que el service worker las resuelva contra el
  // dominio que esté sirviendo la app.
  if (u.indexOf(BASE_URL) === 0)     return u.slice(BASE_URL.length);
  if (u.indexOf(PREFIJO_PROD) === 0) return u.slice(PREFIJO_PROD.length);
  return u.replace(/^\.?\/*/, '');                 // ya relativa → normaliza sin ./ ni / inicial
}

// Construir los nombres de entrada y salida
// Nota: Ajusta la ruta si tus JSON están en carpetas separadas, ej: `data/${leccionFolder}/assets_${leccionFolder}.json`
const archivoEntrada = `assets_${leccionFolder}.json`;
const archivoSalida = `assets_${leccionFolder}_versionado.json`;

// ── Comprobación previa: ¿responde el servidor? ───────────────────────────────
// Sin esto, si el servidor está apagado TODOS los recursos fallan por red y se
// genera un manifiesto entero marcado como noEncontrado, que es peor que nada.
async function servidorResponde() {
  try {
    await fetch(BASE_URL, { method: 'HEAD' });
    return true;   // cualquier respuesta (incluso 404) significa que hay servidor
  } catch (e) {
    return false;  // solo fallo de red real
  }
}

async function procesarManifiesto() {
  console.log(`Origen de los recursos: ${BASE_URL}${esLocal ? '  (LOCAL)' : '  (producción)'}`);
  console.log(`Buscando ${archivoEntrada}...`);

  if (!fs.existsSync(archivoEntrada)) {
    console.error(`❌ Error: El archivo ${archivoEntrada} no existe en esta carpeta.`);
    return;
  }

  if (!(await servidorResponde())) {
    console.error(`\n❌ No hay respuesta de ${BASE_URL}`);
    if (esLocal) {
      console.error('   ¿Está levantado el servidor? En la raíz del proyecto:');
      console.error('     python3 -m http.server 8000');
    } else {
      console.error('   Revisa tu conexión o la URL de producción.');
    }
    console.error('   No genero el manifiesto para no dejarlo todo marcado como noEncontrado.');
    process.exit(1);
  }

  // Lee el archivo JSON original
  const rawData = fs.readFileSync(archivoEntrada, 'utf-8');
  const jsonData = JSON.parse(rawData);

  const assetsVersionados = [];
  const recursosNoEncontrados = [];
  let totalBytes = 0;
  console.log(`Examinando ${jsonData.assets.length} recursos de la lección ${leccion}...`);

  for (const url of jsonData.assets) {
    try {
      const response = await fetch(resolverAbs(url), { method: 'HEAD' });

      // Un 404 (u otro estado de error) NO lanza excepción en fetch:
      // hay que comprobar response.ok explícitamente.
      if (!response.ok) {
        recursosNoEncontrados.push(url);
        console.error(`✗ ESTE RECURSO NO LO ENCONTRE (${response.status}): ${url}`);
        assetsVersionados.push({
          url: aRelativo(url),
          lastModified: Date.now(),
          noEncontrado: true
        });
        continue;
      }

      const lastModifiedStr = response.headers.get('last-modified');

      // Versión del recurso. GitHub Pages pone como Last-Modified la hora del
      // ÚLTIMO deploy a TODOS los archivos: usarla haría que cada alumno
      // volviera a bajar la lección entera aunque nada cambiara. Si el archivo
      // está en el disco (este script corre en data/<leccion>/, la raíz es
      // ../..), se usa una huella de su CONTENIDO: solo cambia si cambia él.
      // El loader compara con "!==", así que vale tanto huella como fecha.
      const enDisco = path.join('..', '..', aRelativo(url));
      const timestamp = fs.existsSync(enDisco)
        ? parseInt(crypto.createHash('sha1').update(fs.readFileSync(enDisco)).digest('hex').slice(0, 12), 16)
        : (lastModifiedStr ? new Date(lastModifiedStr).getTime() : Date.now());

      // Tamaño en bytes. Primero desde la cabecera content-length (rápido).
      // Si el servidor no la envía, descargamos el archivo para medirlo.
      let size = parseInt(response.headers.get('content-length'), 10);
      if (!size || isNaN(size)) {
        try {
          const full = await fetch(resolverAbs(url), { cache: 'no-store' });
          const buf  = await full.arrayBuffer();
          size = buf.byteLength;
        } catch (e) {
          size = 0;
        }
      }

      assetsVersionados.push({
        url: aRelativo(url),
        lastModified: timestamp,
        size: size
      });

      totalBytes += size;
      console.log(`✓ Verificado: ${url.split('/').pop()} (${(size/1024).toFixed(0)} KB)`);

    } catch (error) {
      // Aquí solo caen fallos de RED reales (sin respuesta del servidor).
      recursosNoEncontrados.push(url);
      console.error(`✗ ESTE RECURSO NO LO ENCONTRE (fallo de red): ${url}  — ${error.message}`);
      assetsVersionados.push({
        url: aRelativo(url),
        lastModified: Date.now(),
        size: 0,
        noEncontrado: true
      });
    }
  }

  // ── Añadir los JSON de la clase (de esta misma carpeta) para uso sin internet ──
  // Se ejecuta DENTRO de data/<leccion>/, así que leemos '.' (la carpeta actual).
  // Se excluye el assets base y el propio versionado para no incluirse a sí mismo.
  // Los engines piden los JSON con ruta RELATIVA (data/<leccion>/...), así que
  // se listan relativos para que se cacheen bajo el dominio actual y coincidan.
  const BASE_REL = 'data/' + leccionFolder + '/';
  const excluir = [archivoEntrada, archivoSalida];
  let jsonAgregados = 0;
  try {
    const archivosLocales = fs.readdirSync('.');
    for (const nombre of archivosLocales) {
      if (!nombre.endsWith('.json')) continue;
      if (excluir.includes(nombre)) continue;
      const stat = fs.statSync(nombre);
      assetsVersionados.push({
        url: BASE_REL + nombre,
        lastModified: stat.mtime.getTime(),
        size: stat.size
      });
      totalBytes += stat.size;
      jsonAgregados++;
      console.log(`➕ JSON de clase: ${nombre} (${(stat.size/1024).toFixed(0)} KB)`);
    }
  } catch (e) {
    console.error('No pude leer los JSON de la carpeta: ' + e.message);
  }

  const nuevoJson = {
    leccion: jsonData.leccion,
    // Informativo: desde dónde se verificaron los recursos. El service worker
    // ignora esta clave; sirve para no publicar sin querer un manifiesto local.
    _generadoDesde: BASE_URL,
    assets: assetsVersionados
  };

  // Guardar el nuevo JSON versionado
  fs.writeFileSync(archivoSalida, JSON.stringify(nuevoJson, null, 2));

  // ── Resumen de recursos no encontrados ──
  console.log('\n' + '='.repeat(56));
  if (recursosNoEncontrados.length === 0) {
    console.log(`✅ Todos los ${jsonData.assets.length} recursos fueron encontrados.`);
  } else {
    console.log(`⚠️  ${recursosNoEncontrados.length} de ${jsonData.assets.length} recursos NO se encontraron:`);
    recursosNoEncontrados.forEach(function (u) {
      console.log('   ✗ ' + u);
    });
    console.log('\nEstos recursos quedaron en el manifiesto marcados con "noEncontrado": true.');
    console.log('Revisa que existan en el servidor o corrige la ruta en assets_' + leccionFolder + '.json');
  }
  console.log('='.repeat(56));
  console.log(`\nJSON de clase incluidos para offline: ${jsonAgregados}`);
  console.log(`Tamaño total de la lección: ${(totalBytes/1024/1024).toFixed(2)} MB (${totalBytes.toLocaleString()} bytes)`);
  console.log(`¡Éxito! Archivo ${archivoSalida} creado exitosamente.`);

  if (esLocal) {
    console.log('\n' + '─'.repeat(56));
    console.log('⚠️  MANIFIESTO GENERADO EN LOCAL — no lo publiques así.');
    console.log('   Las fechas y tamaños vienen de tu servidor local.');
    console.log('   Cuando subas los recursos, vuelve a generarlo sin --local:');
    console.log(`     node generar_manifiesto.js ${leccion}`);
    console.log('─'.repeat(56));
  }
}

procesarManifiesto();