require('dotenv').config();
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  const noPhoto = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const f = d.foto || '';
    if (!f || !f.startsWith('http')) {
      noPhoto.push({
        id: doc.id,
        nombre: d.nombre || '',
        marca: d.marca || d.roaster || '',
        fuenteUrl: d.fuenteUrl || d.urlProducto || '',
      });
    }
  }

  // Group by brand
  const byBrand = {};
  for (const c of noPhoto) {
    const b = c.marca || '(sin marca)';
    if (!byBrand[b]) byBrand[b] = [];
    byBrand[b].push(c);
  }

  for (const [brand, cafes] of Object.entries(byBrand).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n=== ${brand} (${cafes.length}) ===`);
    for (const c of cafes) {
      console.log(JSON.stringify({ id: c.id, nombre: c.nombre, url: c.fuenteUrl }));
    }
  }
  process.exit(0);
})();
