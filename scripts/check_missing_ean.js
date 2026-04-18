const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'spain-specialty-coffees.json');

function normalize(value) {
  return String(value || '').trim();
}

function main() {
  if (!fs.existsSync(filePath)) {
    console.error(`No existe el fichero: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const coffees = JSON.parse(raw);

  if (!Array.isArray(coffees)) {
    console.error('El JSON no contiene un array de cafés.');
    process.exit(1);
  }

  const total = coffees.length;
  const withEan = coffees.filter((c) => normalize(c.ean) !== '');
  const withoutEan = coffees.filter((c) => normalize(c.ean) === '');
  const invalidLength = withEan.filter((c) => !/^\d{13}$/.test(normalize(c.ean)));

  console.log('========== RESUMEN EAN ==========');
  console.log(`Total cafés: ${total}`);
  console.log(`Con EAN: ${withEan.length}`);
  console.log(`Sin EAN: ${withoutEan.length}`);
  console.log(`EAN con formato inválido: ${invalidLength.length}`);
  console.log('');

  if (withoutEan.length) {
    console.log('========== CAFÉS SIN EAN ==========');
    withoutEan.forEach((c, i) => {
      console.log(
        `${i + 1}. ${c.nombre || 'Sin nombre'} | ${c.roaster || 'Sin roaster'} | ${c.formato || 'Sin formato'}`
      );
    });
    console.log('');
  }

  if (invalidLength.length) {
    console.log('========== EAN INVÁLIDOS ==========');
    invalidLength.forEach((c, i) => {
      console.log(`${i + 1}. ${c.nombre || 'Sin nombre'} | EAN: ${normalize(c.ean)}`);
    });
  }
}

main();
