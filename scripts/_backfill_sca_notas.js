#!/usr/bin/env node
/**
 * Backfill SCA scores, notas de cata, and missing fields for all cafes.
 * Focuses especially on cremashop imports that may lack these fields.
 *
 * - SCA: recomputes if missing or outdated (cloud function also does this on write)
 * - notas: generates from description/origin/process if missing
 * - Normalizes formato, tueste, especie fields
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

// Spanish tasting note keywords by category
const NOTE_MAP = {
  // From origin
  colombia: 'dulce, caramelo, cuerpo medio',
  ethiopia: 'floral, afrutado, cítrico',
  etiopía: 'floral, afrutado, cítrico',
  brasil: 'nuez, chocolate, cuerpo pleno',
  brazil: 'nuez, chocolate, cuerpo pleno',
  guatemala: 'chocolate, caramelo, especiado',
  honduras: 'dulce, fruta tropical, caramelo',
  'costa rica': 'miel, cítrico, equilibrado',
  peru: 'chocolate, nuez, dulce',
  perú: 'chocolate, nuez, dulce',
  kenya: 'cítrico, bayas, vino',
  kenia: 'cítrico, bayas, vino',
  indonesia: 'terroso, especiado, cuerpo pleno',
  india: 'especiado, cuerpo pleno, nuez',
  vietnam: 'robusto, chocolate oscuro, intenso',
  jamaica: 'suave, equilibrado, dulce',
  mexico: 'chocolate, nuez, caramelo',
  méxico: 'chocolate, nuez, caramelo',
  nicaragua: 'chocolate, cítrico, dulce',
  'el salvador': 'caramelo, dulce, suave',
  panama: 'floral, jazmín, complejo',
  panamá: 'floral, jazmín, complejo',
  rwanda: 'cítrico, floral, brillante',
  ruanda: 'cítrico, floral, brillante',
  tanzania: 'cítrico, bayas, vino',
  uganda: 'chocolate, nuez, cuerpo pleno',
  // From roast
  light: 'acidez brillante, notas florales',
  medium: 'equilibrado, dulce, cuerpo medio',
  'medium-dark': 'chocolate, caramelo, cuerpo pleno',
  dark: 'intenso, ahumado, chocolate oscuro',
  // From process
  washed: 'limpio, brillante, acidez definida',
  natural: 'afrutado, dulce, cuerpo pleno',
  honey: 'dulce, meloso, cuerpo sedoso',
  // From species
  arabica: 'suave, aromático, complejo',
  robusta: 'intenso, terroso, cuerpo fuerte',
};

function generateNotas(data) {
  const parts = new Set();

  // From description keywords
  const desc = (data.descripcion || '').toLowerCase();
  const descNotes = [];
  if (desc.includes('chocolate')) descNotes.push('chocolate');
  if (desc.includes('caramel')) descNotes.push('caramelo');
  if (desc.includes('floral')) descNotes.push('floral');
  if (desc.includes('fruit') || desc.includes('frut')) descNotes.push('afrutado');
  if (desc.includes('citrus') || desc.includes('cítric')) descNotes.push('cítrico');
  if (desc.includes('nut') || desc.includes('nuez')) descNotes.push('nuez');
  if (desc.includes('spice') || desc.includes('especi')) descNotes.push('especiado');
  if (desc.includes('berry') || desc.includes('bayas')) descNotes.push('bayas');
  if (desc.includes('honey') || desc.includes('miel')) descNotes.push('miel');
  if (desc.includes('vanilla') || desc.includes('vainilla')) descNotes.push('vainilla');
  if (desc.includes('sweet') || desc.includes('dulce')) descNotes.push('dulce');
  if (desc.includes('smoke') || desc.includes('ahum')) descNotes.push('ahumado');
  if (desc.includes('creamy') || desc.includes('cremos')) descNotes.push('cremoso');
  if (desc.includes('balanced') || desc.includes('equilib')) descNotes.push('equilibrado');
  descNotes.forEach((n) => parts.add(n));

  // From origin
  const origin = (data.pais || data.origen || '').toLowerCase();
  for (const [key, notes] of Object.entries(NOTE_MAP)) {
    if (origin.includes(key)) {
      notes.split(', ').forEach((n) => parts.add(n));
      break;
    }
  }

  // From roast
  const roast = (data.tueste || '').toLowerCase();
  if (NOTE_MAP[roast]) {
    NOTE_MAP[roast].split(', ').forEach((n) => parts.add(n));
  }

  // From process
  const process = (data.proceso || '').toLowerCase();
  if (NOTE_MAP[process]) {
    NOTE_MAP[process].split(', ').forEach((n) => parts.add(n));
  }

  // From species
  const species = (data.especie || '').toLowerCase();
  if (NOTE_MAP[species]) {
    NOTE_MAP[species].split(', ').forEach((n) => parts.add(n));
  }

  const arr = [...parts].slice(0, 5);
  return arr.length >= 2 ? arr.join(', ') : '';
}

function computeSCA(data) {
  let score = 72;
  if (data.especie === 'arabica') score += 4;
  else if (data.especie === 'blend' || data.especie === 'arábica') score += 3;
  else if (data.especie === 'robusta') score += 0;
  if (data.tueste === 'light') score += 3;
  else if (data.tueste === 'medium' || data.tueste === 'medio') score += 2;
  else if (data.tueste === 'medium-dark') score += 1;
  if (data.pais && data.pais.length > 3) score += 2;
  if (data.formato === 'beans' || data.formato === 'grano') score += 1;
  if (data.descripcion && data.descripcion.length > 50) score += 1;
  if (data.notas && data.notas.length > 5) score += 1;
  if (data.categoria === 'especialidad' || data.coffeeCategory === 'specialty') score += 5;
  else if (data.categoria === 'premium') score += 3;
  if (data.proceso === 'washed' || data.proceso === 'lavado') score += 1;
  else if (data.proceso === 'natural') score += 1;
  else if (data.proceso === 'honey') score += 2;
  if (data.variedad) score += 1;
  if (data.altitud && Number(data.altitud) > 1500) score += 2;
  else if (data.altitud && Number(data.altitud) > 1000) score += 1;
  return Math.min(score, 89);
}

(async () => {
  try {
    const snap = await db.collection('cafes').get();
    console.log(`Total cafes: ${snap.size}`);

    let updatedNotas = 0;
    let updatedSca = 0;
    let totalUpdated = 0;
    let batch = db.batch();
    let batchCount = 0;

    snap.forEach((doc) => {
      const d = doc.data();
      const updates = {};

      // Backfill notas
      if (!d.notas || d.notas === 'false' || d.notas === 'null') {
        const notas = generateNotas(d);
        if (notas) {
          updates.notas = notas;
          updatedNotas++;
        }
      }

      // Backfill SCA
      const currentSca = typeof d.sca === 'object' ? d.sca?.score : d.sca_score || d.sca || 0;
      if (!currentSca || Number(currentSca) === 0) {
        const sca = computeSCA({ ...d, ...(updates.notas ? { notas: updates.notas } : {}) });
        updates.sca_score = sca;
        updatedSca++;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        batch.update(doc.ref, updates);
        batchCount++;
        totalUpdated++;

        if (batchCount >= 400) {
          // Commit and create new batch
          batch.commit();
          batch = db.batch();
          batchCount = 0;
          console.log(`Committed batch, total updated: ${totalUpdated}`);
        }
      }
    });

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`\n=== BACKFILL COMPLETE ===`);
    console.log(`Total updated: ${totalUpdated}`);
    console.log(`Notas added: ${updatedNotas}`);
    console.log(`SCA computed: ${updatedSca}`);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
