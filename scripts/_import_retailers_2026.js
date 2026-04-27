#!/usr/bin/env node
/**
 * _import_retailers_2026.js
 * Import new coffees from El Corte Inglés, Carrefour, and Alcampo into Firestore.
 * Skips existing documents. Fills computed fields (tipo, pais, notas, etc.).
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();

const cafes = require('./cafe-import-retailers-2026.json');

// ---------- helpers ----------
function inferTipo(nombre, formato) {
  const n = (nombre + ' ' + (formato || '')).toLowerCase();
  if (/c[aá]psula|nesp|dolce|compatible/i.test(n)) return 'capsules';
  if (/soluble|instant|liofilizado/i.test(n)) return 'instant';
  if (/grano|beans/i.test(n)) return 'beans';
  if (/molido|ground/i.test(n)) return 'ground';
  return 'other';
}

function inferPais(origen) {
  if (!origen) return '';
  const map = {
    Colombia: 'CO',
    Brasil: 'BR',
    Etiopía: 'ET',
    Ethiopia: 'ET',
    Guatemala: 'GT',
    Kenia: 'KE',
    Kenya: 'KE',
    Perú: 'PE',
    Peru: 'PE',
    'Costa Rica': 'CR',
    Honduras: 'HN',
    México: 'MX',
    Mexico: 'MX',
  };
  return map[origen] || '';
}

function inferNotas(cafe) {
  const n = cafe.nombre.toLowerCase();
  const notas = [];
  if (/descaf/i.test(n)) notas.push('suave', 'cuerpo ligero');
  if (/intenso|forte|ristretto/i.test(n)) notas.push('intenso', 'cuerpo robusto', 'cacao');
  if (/lungo/i.test(n)) notas.push('suave', 'floral', 'cítrico');
  if (cafe.origen === 'Colombia') notas.push('caramelo', 'nuez', 'chocolate');
  else if (cafe.origen === 'Etiopía' || cafe.origen === 'Ethiopia')
    notas.push('floral', 'cítrico', 'afrutado');
  else if (cafe.origen === 'Brasil') notas.push('chocolate', 'nuez', 'dulce');
  else if (cafe.origen === 'Kenia' || cafe.origen === 'Kenya')
    notas.push('grosella', 'cítrico', 'intenso');
  else if (cafe.origen === 'Guatemala') notas.push('chocolate', 'caramelo', 'especias');
  else if (cafe.origen === 'Perú') notas.push('chocolate', 'frutos secos', 'dulce');
  else if (cafe.origen === 'Costa Rica') notas.push('miel', 'cítrico', 'frutos tropicales');
  else if (cafe.origen === 'Honduras') notas.push('caramelo', 'chocolate', 'frutos secos');
  else if (/mezcla/i.test(n)) notas.push('equilibrado', 'cuerpo medio', 'tostado');
  else if (/natural/i.test(n)) notas.push('equilibrado', 'suave', 'tostado');
  if (notas.length === 0) notas.push('equilibrado', 'suave');
  return [...new Set(notas)].join(', ');
}

(async () => {
  console.log(`Loading ${cafes.length} coffees from import file...`);

  // Check existing
  const existing = new Set();
  const snap = await db.collection('cafes').get();
  snap.forEach((d) => existing.add(d.id));

  let imported = 0,
    skipped = 0;
  const batch_size = 100;
  let batch = db.batch();
  let batchCount = 0;

  for (const cafe of cafes) {
    if (existing.has(cafe.id)) {
      console.log(`  SKIP (exists): ${cafe.id}`);
      skipped++;
      continue;
    }

    const tipo = inferTipo(cafe.nombre, cafe.formato);
    const pais = inferPais(cafe.origen);
    const notas = cafe.notas || inferNotas(cafe);
    const now = admin.firestore.FieldValue.serverTimestamp();

    const doc = {
      nombre: cafe.nombre,
      marca: cafe.marca,
      formato: cafe.formato || tipo,
      tipo,
      peso: cafe.peso || '',
      precio: cafe.precio || null,
      tueste: cafe.tueste || '',
      variedad: cafe.variedad || '',
      origen: cafe.origen || '',
      pais: pais,
      notas: notas,
      coffeeCategory: cafe.coffeeCategory || 'daily',
      fuente: cafe.fuente || '',
      fuentePais: 'ES',
      isBio: cafe.isBio || false,
      aprobado: true,
      visible: true,
      createdAt: now,
      updatedAt: now,
    };

    const ref = db.collection('cafes').doc(cafe.id);
    batch.set(ref, doc);
    batchCount++;
    imported++;

    if (batchCount >= batch_size) {
      await batch.commit();
      console.log(`  Committed batch of ${batchCount}`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount}`);
  }

  console.log(`\nDone! Imported: ${imported}, Skipped: ${skipped}, Total in file: ${cafes.length}`);
  process.exit(0);
})();
