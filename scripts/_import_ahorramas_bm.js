#!/usr/bin/env node
/**
 * _import_ahorramas_bm.js
 * Import coffees from Ahorramas (Alipende) and BM Supermercados into Firestore.
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
const cafes = require('./cafe-import-ahorramas-bm-2026.json');

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
    Guatemala: 'GT',
    Kenia: 'KE',
    Perú: 'PE',
    'Costa Rica': 'CR',
    Honduras: 'HN',
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
  else if (/mezcla/i.test(n)) notas.push('equilibrado', 'cuerpo medio', 'tostado');
  else if (/natural/i.test(n)) notas.push('equilibrado', 'suave', 'tostado');
  if (notas.length === 0) notas.push('equilibrado', 'suave');
  return [...new Set(notas)].join(', ');
}

(async () => {
  console.log(`Loading ${cafes.length} coffees...`);
  const existing = new Set();
  (await db.collection('cafes').get()).forEach((d) => existing.add(d.id));

  let imported = 0,
    skipped = 0;
  let batch = db.batch(),
    bc = 0;

  for (const cafe of cafes) {
    if (existing.has(cafe.id)) {
      console.log(`  SKIP: ${cafe.id}`);
      skipped++;
      continue;
    }
    const tipo = inferTipo(cafe.nombre, cafe.formato);
    const now = admin.firestore.FieldValue.serverTimestamp();
    batch.set(db.collection('cafes').doc(cafe.id), {
      nombre: cafe.nombre,
      marca: cafe.marca,
      formato: cafe.formato || tipo,
      tipo,
      peso: cafe.peso || '',
      precio: cafe.precio || null,
      tueste: cafe.tueste || '',
      variedad: cafe.variedad || '',
      origen: cafe.origen || '',
      pais: inferPais(cafe.origen),
      notas: cafe.notas || inferNotas(cafe),
      coffeeCategory: cafe.coffeeCategory || 'daily',
      fuente: cafe.fuente || '',
      fuentePais: 'ES',
      isBio: cafe.isBio || false,
      aprobado: true,
      visible: true,
      createdAt: now,
      updatedAt: now,
    });
    bc++;
    imported++;
    if (bc >= 100) {
      await batch.commit();
      batch = db.batch();
      bc = 0;
    }
  }
  if (bc > 0) await batch.commit();
  console.log(`Done! Imported: ${imported}, Skipped: ${skipped}`);
  process.exit(0);
})();
