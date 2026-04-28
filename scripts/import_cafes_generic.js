/**
 * Generic importer: reads a JSON array of cafes (same format as
 * cafe-import-nuevas-marcas-es.json) from the path provided as argv[2]
 * and uploads them to Firestore, skipping duplicates by id or name+brand.
 *
 * Usage: node scripts/import_cafes_generic.js scripts/cafe-import-slowmov.json
 */
const path = require('path');
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const file = process.argv[2];
if (!file) {
  console.error('Missing JSON file path argument');
  process.exit(1);
}
const cafes = require(path.resolve(file));
const FUENTE = process.argv[3] || 'import_nuevas_marcas_es';
const NOW = new Date().toISOString();

function buildDoc(c) {
  return {
    nombre: c.nombre || '',
    name: c.nombre || '',
    marca: c.marca || '',
    roaster: c.roaster || c.marca || '',
    ean: c.ean || 'N/A',
    normalizedEan: c.ean && c.ean !== 'N/A' ? c.ean.replace(/\D/g, '') : '',
    descripcion: c.descripcion || '',
    description: c.descripcion || '',
    category: c.isSpecialty ? 'specialty' : 'supermarket',
    coffeeCategory: c.coffeeCategory || 'daily',
    isSpecialty: c.isSpecialty || false,
    legacy: false,
    formato: c.formato || 'whole_bean',
    format: c.formato || 'whole_bean',
    sistemaCapsula: c.sistemaCapsula || '',
    tipoProducto: c.tipoProducto || 'cafe en grano',
    cantidad: c.cantidad || 0,
    intensidad: c.intensidad || null,
    tueste: c.tueste || '',
    roastLevel: c.tueste || '',
    pais: c.pais || '',
    origen: c.origen || '',
    region: c.region || '',
    variedad: c.variedad || '',
    proceso: c.proceso || '',
    notas: c.notas || '',
    notes: c.notas || '',
    decaf: c.decaf || false,
    precio: c.precio || null,
    precioEuros: c.precio || null,
    certificaciones: c.certificaciones || '',
    isBio: c.isBio || false,
    fecha: NOW,
    puntuacion: c.puntuacion || 0,
    votos: c.votos || 0,
    officialPhoto: c.officialPhoto || '',
    bestPhoto: c.officialPhoto || '',
    imageUrl: c.officialPhoto || '',
    foto: c.officialPhoto || '',
    status: 'approved',
    reviewStatus: 'approved',
    provisional: false,
    appVisible: true,
    scannerVisible: true,
    adminReviewedAt: NOW,
    updatedAt: NOW,
    approvedAt: NOW,
    createdAt: NOW,
    fuente: FUENTE,
    fuentePais: 'ES',
    importMeta: {
      importedAt: NOW,
      sourceType: FUENTE,
    },
  };
}

(async () => {
  const snap = await db.collection('cafes').get();
  const existingIds = new Set();
  const existingKeys = new Set();
  snap.forEach((doc) => {
    existingIds.add(doc.id);
    const d = doc.data();
    const key = ((d.nombre || '') + '|' + (d.marca || '')).toLowerCase().trim();
    existingKeys.add(key);
  });

  console.log(`Existing cafes: ${snap.size}`);
  console.log(`To process: ${cafes.length}`);

  let added = 0;
  let skipped = 0;
  for (const c of cafes) {
    const id = c.id;
    const key = ((c.nombre || '') + '|' + (c.marca || '')).toLowerCase().trim();
    if (existingIds.has(id)) {
      console.log('  SKIP (id):', id);
      skipped++;
      continue;
    }
    if (existingKeys.has(key)) {
      console.log('  SKIP (name+brand):', c.nombre, '|', c.marca);
      skipped++;
      continue;
    }
    await db.collection('cafes').doc(id).set(buildDoc(c));
    console.log('  ADDED:', id);
    existingIds.add(id);
    existingKeys.add(key);
    added++;
  }

  console.log(`\nDone. Added: ${added}, Skipped: ${skipped}`);
  console.log(`Total cafes now: ${snap.size + added}`);
  process.exit(0);
})();
