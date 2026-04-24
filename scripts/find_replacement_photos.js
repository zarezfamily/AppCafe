/**
 * For all 58 broken-photo docs, check if they have EANs and look up Open Food Facts
 */

const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const BROKEN_IDS = [
  // Ineffable (15)
  '4ashTwNxe5pN0PJtDzMw',
  'BQCaL3LqbVyxDFHyUKxs',
  'HGGeUk9twkdoilAnM75M',
  'JKwNJFQBhbtTrPCzmUJ2',
  'SNjB1rFlaj2nUgox5Qvk',
  'aPpffv5ORsPctEtiPQwT',
  'bCccnVLPqXfuszFqLYp8',
  'dYMCoakSg4GN4qSyRK5F',
  'fw4V8msD0KevQJ8H2TEx',
  'ineffable-coffee-costa-rica-tarrazu',
  'ineffable-coffee-ethiopia-guji',
  'ineffable-coffee-ethiopia-sidamo',
  'ineffable-coffee-guatemala-acatenango',
  'ineffable-coffee-kenia-nyeri',
  'ineffable-coffee-rwanda-nyamasheke',
  // Nomad (13)
  'Gzwq4EEWwtMQddYRkmdV',
  'IsvRAGRmsiZZQb33QNfQ',
  'R1uqtlXuqGgzRZIuVOCT',
  'Y7o5klBE0oShBnTdKbfV',
  'cD7a8xHh7wqc4DDLGFJM',
  'kkYNsZWWIsfc8l9Z8mVQ',
  'nomad-coffee-ethiopia-yirgacheffe',
  'nomad-coffee-finca-el-paraiso-lychee',
  'plKWhr1diUuepUUENpCg',
  'rp1WgqKe8BRoUmEBVbFI',
  'rws5vr5szw16tHuVbxvU',
  's7reQbZcmSBAwyOMx6JA',
  'usgnddz0dN8iQZwBM18u',
  // Amazon/brands (30)
  'delta-delta-cafes-platinum',
  'roaster-delta-cafes-platinum',
  'illy-illy-cafe-en-grano-100-arabica',
  'roaster-illy-cafe-en-grano-100-arabica',
  'lavazza-lavazza-qualita-rossa',
  'roaster-lavazza-qualita-rossa',
  'marcilla-marcilla-cafe-en-grano-mezcla',
  'roaster-marcilla-cafe-en-grano-mezcla',
  'marcilla-marcilla-cafe-molido-natural',
  'roaster-marcilla-cafe-molido-natural',
  'nescafe-nescafe-gold-blend',
  'roaster-nescafe-gold-blend',
  'saimaza-saimaza-espresso-7',
  'roaster-saimaza-espresso-7',
  'starbucks-starbucks-pike-place',
  'cafes-el-magnifico-etiopia-raro-nansebo',
  'cafes-el-magnifico-guatemala-huehuetenango',
  'rvNVIebaqwYUIwv7USJT',
  'aldi-dark-roast',
  'aldi-medium-roast',
  '0gbaTRLkg5agxlSfqKM7',
  '3U68wP8ALa2mYBa8ZMtR',
  'AF2gqonWWfxf4Ez7PkIy',
  'DrAD40l6JJVBsBMjlIuD',
  'F1VZFiSkq6UoIjxQF7I8',
  'F1ZSkDVbqiETPUH8ZMP3',
  'QKUAnsYTsKnyaTFmmo16',
  'ROVfLM5d9sFcFwsiGlI3',
  'hola-coffee-el-diviso-pink-bourbon',
  'k32C1FfcqVaauDvzAqQU',
];

async function main() {
  const docsWithEan = [];
  const docsWithoutEan = [];

  for (const id of BROKEN_IDS) {
    const url = `${BASE}/cafes/${id}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`  SKIP ${id}: HTTP ${res.status}`);
      continue;
    }
    const doc = await res.json();
    const f = doc.fields || {};
    const ean = f.ean?.stringValue || '';
    const nombre = f.nombre?.stringValue || '';
    const roaster = f.roaster?.stringValue || f.marca?.stringValue || '';

    if (ean && ean.length >= 8) {
      docsWithEan.push({ id, ean, nombre, roaster });
    } else {
      docsWithoutEan.push({ id, nombre, roaster });
    }
  }

  console.log(`\nDocs with EAN: ${docsWithEan.length}`);
  for (const d of docsWithEan) {
    // Try Open Food Facts
    const offUrl = `https://world.openfoodfacts.org/api/v2/product/${d.ean}.json?fields=product_name,image_url,image_front_url`;
    try {
      const res = await fetch(offUrl);
      const data = await res.json();
      const img = data.product?.image_front_url || data.product?.image_url || '';
      const valid = img && img.startsWith('http');
      console.log(
        `  [${d.id}] EAN:${d.ean} ${d.roaster} - ${d.nombre} → OFF: ${valid ? img : '(not found)'}`
      );
    } catch {
      console.log(`  [${d.id}] EAN:${d.ean} ${d.roaster} - ${d.nombre} → OFF: (error)`);
    }
  }

  console.log(`\nDocs without EAN: ${docsWithoutEan.length}`);
  for (const d of docsWithoutEan) {
    console.log(`  [${d.id}] ${d.roaster} - ${d.nombre}`);
  }
}

main().catch(console.error);
