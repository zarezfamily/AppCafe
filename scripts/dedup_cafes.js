/**
 * Deduplicate cafes in Firestore.
 * For each group of duplicates (same nombre+marca), keep the doc with:
 *   1. bestPhoto present (priority)
 *   2. Most filled fields
 * Delete the rest.
 *
 * Also list any docs the admin panel might be excluding (the 998→996 gap).
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const DRY_RUN = process.argv.includes('--dry-run');

function fieldScore(d) {
  let score = 0;
  if (d.bestPhoto) score += 10;
  if (d.officialPhoto) score += 5;
  if (d.foto || d.image) score += 3;
  if (d.ean && d.ean !== 'N/A') score += 5;
  if (d.puntuacion) score += 2;
  if (d.notas) score += 2;
  if (d.proceso) score += 1;
  if (d.pais) score += 1;
  if (d.variedad) score += 1;
  if (d.tostado) score += 1;
  if (d.coffeeCategory) score += 1;
  if (d.formato) score += 1;
  if (d.tipoMolienda) score += 1;
  if (d.region) score += 1;
  if (d.descripcion) score += 1;
  if (d.precioEuros) score += 1;
  if (d.rankingScore) score += 2;
  return score;
}

(async () => {
  const snap = await db.collection('cafes').get();
  console.log('Total docs:', snap.size);

  // Build duplicate map
  const byKey = {};
  snap.forEach((doc) => {
    const d = doc.data();
    const name = (d.nombre || '').trim();
    const marca = (d.marca || '').trim();
    const key = (name + '|' + marca).toLowerCase();
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push({ id: doc.id, data: d, score: fieldScore(d) });
  });

  const dupeGroups = Object.entries(byKey).filter(([, docs]) => docs.length > 1);
  console.log('Duplicate groups:', dupeGroups.length);

  const toDelete = [];
  for (const [_key, docs] of dupeGroups) {
    // Sort by score descending - keep first
    docs.sort((a, b) => b.score - a.score);
    const keep = docs[0];
    const remove = docs.slice(1);
    console.log(`\n  KEEP: ${keep.id} (score=${keep.score})`);
    for (const r of remove) {
      console.log(`  DELETE: ${r.id} (score=${r.score})`);
      toDelete.push(r.id);
    }
  }

  console.log(`\nTotal to delete: ${toDelete.length}`);
  console.log(`After deletion: ${snap.size - toDelete.length} cafes`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN - no changes made ---');
    process.exit(0);
  }

  // Delete in batches of 500
  const batchSize = 500;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = db.batch();
    const chunk = toDelete.slice(i, i + batchSize);
    for (const id of chunk) {
      batch.delete(db.collection('cafes').doc(id));
    }
    await batch.commit();
    console.log(`Deleted batch ${Math.floor(i / batchSize) + 1}: ${chunk.length} docs`);
  }

  console.log('\nDone. Duplicates removed.');
  process.exit(0);
})();
