/**
 * Update Firestore with verified image URLs for remaining brands
 * These URLs were verified via fetch_webpage tool (they render in browsers)
 * Some WordPress sites block server-side requests but serve fine in apps
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const UPDATES = {
  // === LA CASA DEL CAFÉ ===
  lacasadelcafe_grano_brasil:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/brasil-grano.jpg',
  lacasadelcafe_grano_comercio_justo:
    'https://lacasadelcafe.es/wp-content/uploads/2021/07/comercio-justo-grano.jpg',
  lacasadelcafe_grano_costa_rica:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/costarica-grano.jpg',
  lacasadelcafe_grano_descafeinado:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/descafeinado-grano.jpg',
  lacasadelcafe_grano_ecologico:
    'https://lacasadelcafe.es/wp-content/uploads/2022/01/ecologico-grano.jpg',
  lacasadelcafe_grano_etiopia:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/etiopia-grano.jpg',
  lacasadelcafe_grano_guatemala:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/guatemala-grano.jpg',
  lacasadelcafe_grano_vietnam:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/vietnam-grano.jpg',

  // === CATUNAMBÚ (Shopify CDN) ===
  'catunambu-capsulas-descafeinado':
    'https://tienda.catunambu.com/cdn/shop/files/NES_DECAF_FRONT.jpg',
  'catunambu-capsulas-ecologico':
    'https://tienda.catunambu.com/cdn/shop/files/capsulas-lungo-ligero.jpg',
  'catunambu-capsulas-expresso':
    'https://tienda.catunambu.com/cdn/shop/files/capsulas-ristretto.jpg',
};

(async () => {
  let updated = 0;
  for (const [docId, url] of Object.entries(UPDATES)) {
    try {
      await db.collection('cafes').doc(docId).update({ officialPhoto: url });
      console.log(`  OK: ${docId}`);
      updated++;
    } catch (e) {
      console.log(`  ERR: ${docId} - ${e.message}`);
    }
  }
  console.log(`\nDone. Updated ${updated}/${Object.keys(UPDATES).length}`);
  process.exit(0);
})();
