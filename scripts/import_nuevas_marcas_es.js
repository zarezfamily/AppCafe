/**
 * Import new Spanish coffee brands into Firestore.
 * Reads cafe-import-nuevas-marcas-es.json and uploads to Firestore,
 * skipping any that already exist (by id or by nombre+marca).
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const cafes = require('./cafe-import-nuevas-marcas-es.json');

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
    fuente: 'import_nuevas_marcas_es',
    fuentePais: 'ES',
    importMeta: {
      importedAt: NOW,
      sourceType: 'nuevas_marcas_es',
    },
  };
}

(async () => {
  // Load existing cafes to check for duplicates
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
  console.log(`New cafes to process: ${cafes.length}`);

  let added = 0;
  let skipped = 0;

  for (const c of cafes) {
    const id = c.id;
    const key = ((c.nombre || '') + '|' + (c.marca || '')).toLowerCase().trim();

    if (existingIds.has(id)) {
      console.log(`  SKIP (id exists): ${id}`);
      skipped++;
      continue;
    }
    if (existingKeys.has(key)) {
      console.log(`  SKIP (name+brand exists): ${c.nombre} | ${c.marca}`);
      skipped++;
      continue;
    }

    const doc = buildDoc(c);
    await db.collection('cafes').doc(id).set(doc);
    console.log(`  ADDED: ${id} - ${c.nombre}`);
    existingIds.add(id);
    existingKeys.add(key);
    added++;
  }

  console.log(`\nDone. Added: ${added}, Skipped: ${skipped}`);
  console.log(`Total cafes now: ${snap.size + added}`);
  process.exit(0);
})();
