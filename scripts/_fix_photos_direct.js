/**
 * Fix photos from brand websites - V2 (direct image URLs)
 * For brands with known product image URLs
 */
const admin = require('firebase-admin');
const https = require('https');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, url).href;
            return fetch(loc).then(resolve).catch(reject);
          }
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }
      )
      .on('error', reject);
  });
}

// Direct image mappings from brand websites
const PHOTOS = {
  // === LA CASA DEL CAFÉ (WordPress - images from product pages) ===
  lacasadelcafe_grano_brasil:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/brasil-grano.jpg',
  lacasadelcafe_grano_comercio_justo:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/comercio-justo-grano.jpg',
  lacasadelcafe_grano_costa_rica:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/costa-rica-grano.jpg',
  lacasadelcafe_grano_descafeinado:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/descafeinado-grano.jpg',
  lacasadelcafe_grano_ecologico:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/ecologico-grano.jpg',
  lacasadelcafe_grano_etiopia:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/etiopia-grano.jpg',
  lacasadelcafe_grano_guatemala:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/guatemala-grano.jpg',
  lacasadelcafe_grano_vietnam:
    'https://lacasadelcafe.es/wp-content/uploads/2021/04/vietnam-grano.jpg',

  // === CATUNAMBÚ (Shopify CDN - from tienda.catunambu.com) ===
  'catunambu-capsulas-descafeinado':
    'https://tienda.catunambu.com/cdn/shop/files/NES_DECAF_FRONT.jpg',
  'catunambu-capsulas-ecologico':
    'https://tienda.catunambu.com/cdn/shop/files/capsulas-ecologico.jpg',
  'catunambu-capsulas-expresso':
    'https://tienda.catunambu.com/cdn/shop/files/capsulas-ristretto.jpg',
  'catunambu-metalbox-100-arabica-3kg':
    'https://tienda.catunambu.com/cdn/shop/files/metalbox-arabica.jpg',
  'catunambu-metalbox-blend-3kg': 'https://tienda.catunambu.com/cdn/shop/files/metalbox-blend.jpg',
  'catunambu-metalbox-descafeinado-3kg':
    'https://tienda.catunambu.com/cdn/shop/files/metalbox-descafeinado.jpg',
  'catunambu-serie-oro-grano-descafeinado-1kg':
    'https://tienda.catunambu.com/cdn/shop/files/serie-oro-descafeinado.jpg',
  'catunambu-serie-oro-grano-mezcla-1kg':
    'https://tienda.catunambu.com/cdn/shop/files/serie-oro-mezcla.jpg',
  'catunambu-serie-oro-grano-natural-1kg':
    'https://tienda.catunambu.com/cdn/shop/files/serie-oro-natural.jpg',
};

async function verifyAndUpdate(docId, imgUrl) {
  try {
    const resp = await fetch(imgUrl);
    if (resp.status === 200) {
      await db.collection('cafes').doc(docId).update({ officialPhoto: imgUrl });
      console.log(`  FIXED: ${docId}`);
      return true;
    } else {
      console.log(`  NOT FOUND (${resp.status}): ${docId} <- ${imgUrl}`);
      return false;
    }
  } catch (e) {
    console.log(`  ERROR: ${docId} - ${e.message}`);
    return false;
  }
}

(async () => {
  // First, remove the bad logo URLs from Catunambú
  console.log('=== Removing bad Catunambú URLs (logo-ue.jpg) ===');
  const catuSnap = await db.collection('cafes').where('marca', '==', 'Catunambú').get();
  let removed = 0;
  for (const doc of catuSnap.docs) {
    const data = doc.data();
    if (data.officialPhoto && data.officialPhoto.includes('logo-ue.jpg')) {
      await doc.ref.update({ officialPhoto: admin.firestore.FieldValue.delete() });
      removed++;
    }
  }
  console.log(`  Removed ${removed} bad URLs\n`);

  // Now try all the direct URLs
  let fixed = 0,
    failed = 0;
  for (const [docId, imgUrl] of Object.entries(PHOTOS)) {
    const ok = await verifyAndUpdate(docId, imgUrl);
    if (ok) fixed++;
    else failed++;
  }

  console.log(`\n=== TOTAL: Fixed ${fixed}, Failed ${failed} ===`);
  process.exit(0);
})();
