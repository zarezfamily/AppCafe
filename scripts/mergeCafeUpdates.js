const fs = require('fs');
const path = require('path');

const CAFES_JSON_PATH = path.join(__dirname, 'cafes.json');
const UPDATES_JSON_PATH = path.join(__dirname, 'cafe-updates.json');

function main() {
  if (!fs.existsSync(CAFES_JSON_PATH)) {
    throw new Error(`No existe ${CAFES_JSON_PATH}`);
  }

  if (!fs.existsSync(UPDATES_JSON_PATH)) {
    throw new Error(`No existe ${UPDATES_JSON_PATH}`);
  }

  const cafes = JSON.parse(fs.readFileSync(CAFES_JSON_PATH, 'utf8'));
  const updates = JSON.parse(fs.readFileSync(UPDATES_JSON_PATH, 'utf8'));

  if (!Array.isArray(cafes)) {
    throw new Error('cafes.json debe ser un array');
  }

  if (!Array.isArray(updates)) {
    throw new Error('cafe-updates.json debe ser un array');
  }

  let updatedCount = 0;
  let missingCount = 0;

  for (const update of updates) {
    const nombre = update.nombre;

    if (!nombre) {
      console.log('⏭️ Update sin nombre, saltado');
      continue;
    }

    const cafe = cafes.find((c) => c.nombre === nombre);

    if (!cafe) {
      console.log(`⚠️ No encontrado en cafes.json: ${nombre}`);
      missingCount++;
      continue;
    }

    for (const [key, value] of Object.entries(update)) {
      if (key === 'nombre') continue;
      if (value === '') continue;
      cafe[key] = value;
    }

    if (update.officialPhoto && !cafe.foto) {
      cafe.foto = update.officialPhoto;
    }

    updatedCount++;
    console.log(`✅ Actualizado: ${nombre}`);
  }

  fs.writeFileSync(CAFES_JSON_PATH, JSON.stringify(cafes, null, 2), 'utf8');

  console.log('\n==============================');
  console.log('Merge completado');
  console.log('==============================');
  console.log(`✅ Actualizados: ${updatedCount}`);
  console.log(`⚠️ No encontrados: ${missingCount}`);
  console.log('==============================\n');
}

try {
  main();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
