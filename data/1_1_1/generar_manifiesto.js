const fs = require('fs');

// Obtener el número de lección desde la terminal (ej: "1.1.1")
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Por favor, indica el número de la lección.');
  console.error('Ejemplo de uso: node generar_manifiesto.js 1.1.1');
  process.exit(1);
}

const leccion = args[0];

// Reemplazar los puntos por guiones bajos para armar el nombre del archivo (ej. "1_1_1")
const leccionFolder = leccion.replace(/\./g, '_'); 

// Construir los nombres de entrada y salida
// Nota: Ajusta la ruta si tus JSON están en carpetas separadas, ej: `data/${leccionFolder}/assets_${leccionFolder}.json`
const archivoEntrada = `assets_${leccionFolder}.json`;
const archivoSalida = `assets_${leccionFolder}_versionado.json`;

async function procesarManifiesto() {
  console.log(`Buscando ${archivoEntrada}...`);
  
  if (!fs.existsSync(archivoEntrada)) {
    console.error(`❌ Error: El archivo ${archivoEntrada} no existe en esta carpeta.`);
    return;
  }

  // Lee el archivo JSON original
  const rawData = fs.readFileSync(archivoEntrada, 'utf-8');
  const jsonData = JSON.parse(rawData);
  
  const assetsVersionados = [];
  console.log(`Examinando ${jsonData.assets.length} recursos de la lección ${leccion}...`);

  for (const url of jsonData.assets) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const lastModifiedStr = response.headers.get('last-modified');
      
      const timestamp = lastModifiedStr 
        ? new Date(lastModifiedStr).getTime() 
        : Date.now();
      
      assetsVersionados.push({
        url: url,
        lastModified: timestamp
      });
      
      console.log(`✓ Verificado: ${url.split('/').pop()}`);
      
    } catch (error) {
      console.error(`✗ Error de red con: ${url}`, error.message);
      assetsVersionados.push({
        url: url,
        lastModified: Date.now()
      });
    }
  }
  
  const nuevoJson = {
    leccion: jsonData.leccion,
    assets: assetsVersionados
  };
  
  // Guardar el nuevo JSON versionado
  fs.writeFileSync(archivoSalida, JSON.stringify(nuevoJson, null, 2));
  console.log(`\n¡Éxito! Archivo ${archivoSalida} creado exitosamente.`);
}

procesarManifiesto();