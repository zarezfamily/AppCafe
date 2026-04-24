const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const backupIds = new Set(
    require('../data/backup_cafes_2026-04-24T17-16-42-914Z.json').map((c) => c.id)
  );
  const snap = await db.collection('cafes').get();

  const extras = [];
  snap.forEach((d) => {
    if (!backupIds.has(d.id)) extras.push(d.id);
  });

  console.log(`Found ${extras.length} extra docs not in original backup`);

  // Check if any extra doc has a duplicate in backup (same EAN)
  const backupCafes = require('../data/backup_cafes_2026-04-24T17-16-42-914Z.json');
  const backupEans = new Set(backupCafes.map((c) => c.ean).filter(Boolean));

  let dupeCount = 0;
  let uniqueExtras = [];
  for (const id of extras) {
    const doc = await db.collection('cafes').doc(id).get();
    const data = doc.data();
    const ean = data.ean || data.barcode || '';
    if (ean && backupEans.has(ean)) {
      dupeCount++;
    } else {
      uniqueExtras.push({ id, nombre: data.nombre, ean });
    }
  }

  console.log(`Duplicates (same EAN in backup): ${dupeCount}`);
  console.log(`Unique extras (new cafes): ${uniqueExtras.length}`);
  uniqueExtras.forEach((e) => console.log(`  ${e.id} => ${e.nombre}`));

  // Delete only true duplicates
  if (dupeCount > 0) {
    console.log(`\nDeleting ${dupeCount} duplicate extras...`);
    let deleted = 0;
    for (const id of extras) {
      const doc = await db.collection('cafes').doc(id).get();
      const data = doc.data();
      const ean = data.ean || data.barcode || '';
      if (ean && backupEans.has(ean)) {
        await db.collection('cafes').doc(id).delete();
        deleted++;
      }
    }
    console.log(`Deleted ${deleted} duplicates`);
  }

  const final = await db.collection('cafes').get();
  console.log(`\nFinal total: ${final.size} cafes`);
  process.exit(0);
})();
