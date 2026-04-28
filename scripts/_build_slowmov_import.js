/**
 * Build cafe-import-slowmov.json from the Slowmov Shopify products dump.
 * Picks the 250g/grano variant (or smallest grano variant) per coffee and
 * uses the real Shopify CDN image URL.
 */
const fs = require('fs');
const path = require('path');

const data = require('./_slowmov_products.json');

function slug(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const stripHtml = (s) =>
  String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Hardcoded enrichment: origins/notes/processes are extracted manually from descriptions.
const META = {
  'said-al-jaifi': {
    pais: 'Yemen',
    origen: 'Haraz, Yemen',
    region: 'Haraz',
    variedad: 'Typica yemení',
    proceso: 'Anaeróbico Mountain Silence',
    notas: 'fermentación anaeróbica, complejo, frutal',
    tueste: 'claro',
  },
  'rumu-damo': {
    pais: 'Etiopía',
    origen: 'Sidama, Etiopía',
    region: 'Arbegona, Sidama',
    variedad: 'Heirloom 74112',
    proceso: 'Lavado',
    notas: 'earl gray, naranja',
    tueste: 'claro',
  },
  'olman-sauceda': {
    pais: 'Nicaragua',
    origen: 'Nicaragua',
    region: 'Tierras altas, Nicaragua',
    variedad: 'Mezcla varietales',
    proceso: 'Lavado',
    notas: 'avellana, toffee',
    tueste: 'medio',
  },
  'boku-es': {
    pais: 'Etiopía',
    origen: 'Hambela Wamena, Oromía, Etiopía',
    region: 'Hambela Wamena',
    variedad: '74158',
    proceso: 'Natural',
    notas: 'bergamota, fresa',
    tueste: 'claro',
  },
  'la-divisa': {
    pais: 'Colombia',
    origen: 'Circasia, Quindío, Colombia',
    region: 'Quindío',
    variedad: 'Geisha y Pink Bourbon',
    proceso: 'Lavado',
    notas: 'licor, membrillo',
    tueste: 'claro',
  },
  alexis: {
    pais: 'Costa Rica',
    origen: 'Los Santos, Costa Rica',
    region: 'Los Santos',
    variedad: 'Mezcla varietales',
    proceso: 'Thermal Shock',
    notas: 'tarta sacher, vainilla',
    tueste: 'claro',
  },
  'san-sebastian': {
    pais: 'Colombia',
    origen: 'Inzá, Cauca, Colombia',
    region: 'Tierradentro, Cauca',
    variedad: 'Castillo y Caturra',
    proceso: 'Lavado',
    notas: 'bizcocho, canela',
    tueste: 'medio',
  },
  tapachula: {
    pais: 'México',
    origen: 'Pavencul, Chiapas, México',
    region: 'Sierra Madre de Chiapas',
    variedad: 'Bourbon y Caturra',
    proceso: 'Lavado y secado al sol',
    notas: 'avellana, caramelo',
    tueste: 'medio',
  },
  'el-indio': {
    pais: 'Colombia',
    origen: 'Planadas, Tolima, Colombia',
    region: 'Tolima',
    variedad: 'Mezcla varietales',
    proceso: 'Natural',
    notas: 'arándanos, moras',
    tueste: 'claro',
  },
  tolima: {
    pais: 'Colombia',
    origen: 'Planadas y Gaitania, Tolima, Colombia',
    region: 'Tolima',
    variedad: 'Mezcla varietales',
    proceso: 'Sugar Cane Decaf',
    notas: 'malta, panela',
    tueste: 'medio',
    decaf: true,
  },
};

const out = [];

for (const p of data.products) {
  const handle = p.handle;
  if (!META[handle]) continue; // skip non-coffee items (catas, subscription)

  // Pick smallest gram variant that contains 'grano' if possible.
  let chosen = null;
  for (const v of p.variants) {
    const t = (v.title || '').toLowerCase();
    if (t.includes('grano') && (v.grams === 250 || v.grams === 200 || v.grams === 90)) {
      if (!chosen || v.grams < chosen.grams) chosen = v;
    }
  }
  // Fallback: any 250g/200g/90g variant
  if (!chosen) {
    for (const v of p.variants) {
      if (v.grams && v.grams <= 250 && (!chosen || v.grams < chosen.grams)) chosen = v;
    }
  }
  if (!chosen) continue;

  const img = (p.images && p.images[0] && p.images[0].src) || '';

  const meta = META[handle];
  const id = `slowmov_${slug(p.title)}_${chosen.grams}g`;
  const desc = stripHtml(p.body_html).slice(0, 500);

  out.push({
    id,
    nombre: `Slowmov ${p.title} ${chosen.grams}g`,
    marca: 'Slowmov',
    roaster: 'Slowmov',
    ean: 'N/A',
    descripcion: desc,
    coffeeCategory: 'specialty',
    isSpecialty: true,
    formato: 'whole_bean',
    tipoProducto: 'cafe en grano',
    cantidad: chosen.grams,
    tueste: meta.tueste,
    pais: meta.pais,
    origen: meta.origen,
    region: meta.region,
    variedad: meta.variedad,
    proceso: meta.proceso,
    notas: meta.notas,
    decaf: !!meta.decaf,
    precio: parseFloat(chosen.price),
    isBio: false,
    officialPhoto: img,
  });
}

fs.writeFileSync(path.join(__dirname, 'cafe-import-slowmov.json'), JSON.stringify(out, null, 2));
console.log('Wrote', out.length, 'products to cafe-import-slowmov.json');
out.forEach((c) => console.log(' -', c.id, '|', c.precio + '€', '|', c.officialPhoto.slice(0, 80)));
