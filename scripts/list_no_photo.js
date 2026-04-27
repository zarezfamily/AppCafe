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
    const f = d.foto;
    if (!f || typeof f !== 'string' || !f.startsWith('http')) {
      noPhoto.push({
        id: doc.id,
        nombre: d.nombre || '',
        marca: d.marca || '',
        fuente: d.fuente || '',
        fuenteUrl: d.fuenteUrl || d.urlProducto || '',
        sku: d.sku || '',
        formato: d.formato || d.format || '',
        cantidad: d.cantidad || '',
      });
    }
  }
  console.log(`Total sin foto: ${noPhoto.length}\n`);
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
      console.log(`  ID: ${c.id}`);
      console.log(`  Nombre: ${c.nombre}`);
      console.log(`  URL: ${c.fuenteUrl}`);
      console.log(`  Formato: ${c.formato} ${c.cantidad}`);
      console.log('');
    }
  }
  process.exit(0);
})();
