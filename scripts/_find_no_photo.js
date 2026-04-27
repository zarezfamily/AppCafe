const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  const noPhoto = [];
  snap.forEach((doc) => {
    const d = doc.data();
    const hasPhoto =
      d.fotoUrl ||
      d.foto ||
      d.imageUrl ||
      d.bestPhoto ||
      d.officialPhoto ||
      (d.photos && d.photos.selected);
    if (!hasPhoto) {
      noPhoto.push({
        id: doc.id,
        nombre: d.nombre,
        marca: d.marca,
        fuente: d.fuente,
        fuenteUrl: d.fuenteUrl,
        tipo: d.tipo,
        ean: d.ean,
      });
    }
  });
  console.log('Total cafes:', snap.size);
  console.log('Sin foto:', noPhoto.length);
  // Group by marca
  const byMarca = {};
  noPhoto.forEach((c) => {
    const m = c.marca || 'SIN_MARCA';
    if (!byMarca[m]) byMarca[m] = [];
    byMarca[m].push(c);
  });
  for (const [marca, items] of Object.entries(byMarca).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n=== ${marca} (${items.length}) ===`);
    items.forEach((c) =>
      console.log(`  ${c.id} | ${c.nombre} | fuente:${c.fuente || '-'} | url:${c.fuenteUrl || '-'}`)
    );
  }
  process.exit(0);
})();
