#!/usr/bin/env node
/**
 * _import_supers_es.js
 * Import coffees from Dia, Eroski, Consum, Condis, Gadis, BonPreu, Covirán, Spar, Hiperdino, Caprabo.
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
const cafes = require('./cafe-import-supers-es-2026.json');

function inferTipo(nombre, formato) {
  const n = (nombre + ' ' + (formato || '')).toLowerCase();
  if (/c[aá]psula|nesp|dolce|compatible/i.test(n)) return 'capsules';
  if (/soluble|instant|liofilizado/i.test(n)) return 'instant';
  if (/grano|beans/i.test(n)) return 'beans';
  if (/molido|ground/i.test(n)) return 'ground';
  return 'other';
}
function inferPais(o) {
  if (!o) return '';
  return (
    {
      Colombia: 'CO',
      Brasil: 'BR',
      Etiopía: 'ET',
      Guatemala: 'GT',
      Kenia: 'KE',
      Perú: 'PE',
      'Costa Rica': 'CR',
      Honduras: 'HN',
    }[o] || ''
  );
}
function inferNotas(c) {
  const n = c.nombre.toLowerCase(),
    notas = [];
  if (/descaf/i.test(n)) notas.push('suave', 'cuerpo ligero');
  if (/intenso|forte|ristretto/i.test(n)) notas.push('intenso', 'cuerpo robusto', 'cacao');
  if (/lungo/i.test(n)) notas.push('suave', 'floral', 'cítrico');
  if (c.origen === 'Colombia') notas.push('caramelo', 'nuez', 'chocolate');
  else if (c.origen === 'Etiopía') notas.push('floral', 'cítrico', 'afrutado');
  else if (/mezcla/i.test(n)) notas.push('equilibrado', 'cuerpo medio', 'tostado');
  else if (/natural/i.test(n)) notas.push('equilibrado', 'suave', 'tostado');
  if (!notas.length) notas.push('equilibrado', 'suave');
  return [...new Set(notas)].join(', ');
}

(async () => {
  console.log(`Loading ${cafes.length} coffees...`);
  const existing = new Set();
  (await db.collection('cafes').get()).forEach((d) => existing.add(d.id));
  let imported = 0,
    skipped = 0,
    batch = db.batch(),
    bc = 0;
  for (const c of cafes) {
    if (existing.has(c.id)) {
      console.log(`  SKIP: ${c.id}`);
      skipped++;
      continue;
    }
    const tipo = inferTipo(c.nombre, c.formato);
    const now = admin.firestore.FieldValue.serverTimestamp();
    batch.set(db.collection('cafes').doc(c.id), {
      nombre: c.nombre,
      marca: c.marca,
      formato: c.formato || tipo,
      tipo,
      peso: c.peso || '',
      precio: c.precio || null,
      tueste: c.tueste || '',
      variedad: c.variedad || '',
      origen: c.origen || '',
      pais: inferPais(c.origen),
      notas: c.notas || inferNotas(c),
      coffeeCategory: c.coffeeCategory || 'daily',
      fuente: c.fuente || '',
      fuentePais: 'ES',
      isBio: c.isBio || false,
      aprobado: true,
      visible: true,
      createdAt: now,
      updatedAt: now,
    });
    bc++;
    imported++;
    if (bc >= 400) {
      await batch.commit();
      console.log(`  Committed ${bc}`);
      batch = db.batch();
      bc = 0;
    }
  }
  if (bc > 0) await batch.commit();
  console.log(`Done! Imported: ${imported}, Skipped: ${skipped}, Total file: ${cafes.length}`);
  process.exit(0);
})();
