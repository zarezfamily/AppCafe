require('dotenv').config();
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// These "Lote XX" cafes are GPT-generated fake data, not real products
const FAKE_LOTE_PATTERN = /\bLote\s+\d+\b/i;

async function main() {
  const snapshot = await db.collection('cafes').get();
  console.log(`Total docs: ${snapshot.size}\n`);

  const toDelete = [];
  const toKeep = [];

  for (const doc of snapshot.docs) {
    const d = doc.data();
    const nombre = d.nombre || '';
    const fuente = d.fuente || '';
    const foto = d.foto || '';
    const legacy = d.legacy === true;

    // Detect fake "Lote XX" GPT-generated cafes
    const isLote = FAKE_LOTE_PATTERN.test(nombre);
    const hasFakeUrl =
      (d.fuenteUrl || '').includes('example.com') ||
      (d.fuenteUrl || '').includes('placeholder') ||
      (d.fuenteUrl || '').startsWith('"') ||
      ((d.fuenteUrl || '').includes('url') && (d.fuenteUrl || '').includes('.com"'));
    const noRealPhoto = !foto || !foto.startsWith('http');
    const isPendiente = nombre === 'Pendiente de identificar';
    const isEmptyDoc = !nombre && !d.name;

    if ((isLote && noRealPhoto) || isPendiente || isEmptyDoc) {
      toDelete.push({
        id: doc.id,
        nombre,
        marca: d.marca || '',
        fuente,
        ref: doc.ref,
      });
    } else {
      toKeep.push(doc.id);
    }
  }

  // Show what we'll delete
  console.log(`Cafés falsos a eliminar: ${toDelete.length}`);
  console.log(`Cafés reales a mantener: ${toKeep.length}\n`);

  // Group by brand
  const byBrand = {};
  for (const c of toDelete) {
    const b = c.marca || '(sin marca)';
    if (!byBrand[b]) byBrand[b] = [];
    byBrand[b].push(c.nombre);
  }

  for (const [brand, names] of Object.entries(byBrand).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${brand}: ${names.length}`);
    names.slice(0, 3).forEach((n) => console.log(`  - ${n}`));
    if (names.length > 3) console.log(`  ... y ${names.length - 3} más`);
  }

  // Delete in batches
  console.log(`\nEliminando ${toDelete.length} documentos falsos...`);
  let deleted = 0;
  const batchSize = 400;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = db.batch();
    const chunk = toDelete.slice(i, i + batchSize);
    for (const c of chunk) {
      batch.delete(c.ref);
    }
    await batch.commit();
    deleted += chunk.length;
    console.log(`  Eliminados: ${deleted}/${toDelete.length}`);
  }

  console.log(`\n✅ ${deleted} cafés falsos eliminados.`);
  console.log(`Quedan ${toKeep.length} cafés reales en la base de datos.`);

  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
