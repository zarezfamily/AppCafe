const fs = require('fs');
const path = require('path');

const CAFES_JSON_PATH = path.join(__dirname, 'cafes.json');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function looksLikeRealImageUrl(value) {
  if (!isNonEmptyString(value)) return false;

  const v = value.toLowerCase().trim();

  if (!v.startsWith('http://') && !v.startsWith('https://')) return false;
  if (v.includes('via.placeholder.com')) return false;
  if (v.includes('placeholder')) return false;
  if (v.includes('dummyimage')) return false;
  if (v.includes('fake')) return false;

  return true;
}

function main() {
  if (!fs.existsSync(CAFES_JSON_PATH)) {
    throw new Error(`No existe ${CAFES_JSON_PATH}`);
  }

  const cafes = JSON.parse(fs.readFileSync(CAFES_JSON_PATH, 'utf8'));

  if (!Array.isArray(cafes)) {
    throw new Error('cafes.json debe ser un array');
  }

  let updated = 0;

  for (const cafe of cafes) {
    const foto = cafe.foto;
    const officialPhoto = cafe.officialPhoto;

    if (looksLikeRealImageUrl(foto) && !looksLikeRealImageUrl(officialPhoto)) {
      cafe.officialPhoto = foto;
      updated++;
      console.log(`✅ officialPhoto completada: ${cafe.nombre}`);
    }
  }

  fs.writeFileSync(CAFES_JSON_PATH, JSON.stringify(cafes, null, 2), 'utf8');

  console.log('\n==============================');
  console.log('Relleno de officialPhoto completado');
  console.log('==============================');
  console.log(`✅ Actualizados: ${updated}`);
  console.log('==============================\n');
}

try {
  main();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
