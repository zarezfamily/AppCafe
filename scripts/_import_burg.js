#!/usr/bin/env node
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

const products = [
  // Saborizados (molido 250g)
  {
    slug: 'flavoured-coffee-hazelnut',
    cid: 3544,
    nombre: 'Café saborizado Avellana 250g molido',
    sabor: 'Avellana',
  },
  {
    slug: 'flavoured-coffee-vanilla',
    cid: 3542,
    nombre: 'Café saborizado Vainilla 250g molido',
    sabor: 'Vainilla',
  },
  {
    slug: 'flavoured-coffee-toffee',
    cid: 4478,
    nombre: 'Café saborizado Caramelo 250g molido',
    sabor: 'Caramelo',
  },
  {
    slug: 'flavoured-coffee-irish-cream',
    cid: 4475,
    nombre: 'Café saborizado Crema Irlandesa 250g molido',
    sabor: 'Crema Irlandesa',
  },
  {
    slug: 'flavoured-coffee-amaretto',
    cid: 4469,
    nombre: 'Café saborizado Amaretto 250g molido',
    sabor: 'Amaretto',
  },
  {
    slug: 'flavoured-coffee-chocolate',
    cid: 3541,
    nombre: 'Café saborizado Chocolate 250g molido',
    sabor: 'Chocolate',
  },
  {
    slug: 'flavoured-coffee-orange',
    cid: 5490,
    nombre: 'Café saborizado Naranja 250g molido',
    sabor: 'Naranja',
  },
  {
    slug: 'flavoured-coffee-coconut',
    cid: 9026,
    nombre: 'Café saborizado Coco 250g molido',
    sabor: 'Coco',
  },
  {
    slug: 'flavoured-coffee-strawberry-cream',
    cid: 9011,
    nombre: 'Café saborizado Crema de Fresa 250g molido',
    sabor: 'Crema de Fresa',
  },
  {
    slug: 'flavoured-coffee-chocolate-mint',
    cid: 4476,
    nombre: 'Café saborizado Chocolate y Menta 250g molido',
    sabor: 'Chocolate y Menta',
  },
  {
    slug: 'flavoured-coffee-tiramisu',
    cid: 4477,
    nombre: 'Café saborizado Tiramisú 250g molido',
    sabor: 'Tiramisú',
  },
  {
    slug: 'flavoured-coffee-jamaica-rum',
    cid: 9021,
    nombre: 'Café saborizado Jamaica Ron 250g molido',
    sabor: 'Jamaica Ron',
  },
  {
    slug: 'flavoured-coffee-cinnamon',
    cid: 4480,
    nombre: 'Café saborizado Canela 250g molido',
    sabor: 'Canela',
  },
  {
    slug: 'flavoured-coffee-angel-kisses',
    cid: 9006,
    nombre: 'Café saborizado Angel Kisses 250g molido',
    sabor: 'Angel Kisses',
  },
  {
    slug: 'flavoured-coffee-chocolate-chili',
    cid: 3543,
    nombre: 'Café saborizado Chocolate Chili 250g molido',
    sabor: 'Chocolate Chili',
  },
  {
    slug: 'flavoured-coffee-french-nougat',
    cid: 9016,
    nombre: 'Café saborizado Nougat Francés 250g molido',
    sabor: 'Nougat Francés',
  },
  {
    slug: 'flavoured-coffee-roasted-almond',
    cid: 5494,
    nombre: 'Café saborizado Almendra Tostada 250g molido',
    sabor: 'Almendra Tostada',
  },
  {
    slug: 'flavoured-coffee-chocolate-cream',
    cid: 9036,
    nombre: 'Café saborizado Crema de Chocolate 250g molido',
    sabor: 'Crema de Chocolate',
  },
  {
    slug: 'flavoured-coffee-macadamia-nut',
    cid: 9031,
    nombre: 'Café saborizado Macadamia 250g molido',
    sabor: 'Macadamia',
  },
  {
    slug: 'flavoured-coffee-dark-chocolate',
    cid: 4479,
    nombre: 'Café saborizado Bittersweet 250g molido',
    sabor: 'Bittersweet (Chocolate Amargo)',
  },
  {
    slug: 'flavoured-coffee-egg-liqueur',
    cid: 4474,
    nombre: 'Café saborizado Licor de Huevo 250g molido',
    sabor: 'Licor de Huevo',
  },
  // Granos origen
  {
    slug: 'colombia-excelso-decaf',
    cid: 10260,
    nombre: 'Colombia Excelso Descafeinado 250g grano',
    formato: 'beans',
    origen: 'Colombia',
    decaf: true,
    tipo: 'descafeinado',
  },
  {
    slug: 'uganda-robusta-ngoma',
    cid: 10245,
    nombre: 'Uganda Robusta Ngoma 250g grano',
    formato: 'beans',
    origen: 'Uganda',
    variedad: 'Robusta',
  },
  {
    slug: 'papua-new-guinea-sigiri',
    cid: 10250,
    nombre: 'Papua Nueva Guinea Sigri 250g grano',
    formato: 'beans',
    origen: 'Papúa Nueva Guinea',
  },
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location).then(resolve, reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers })
        );
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function getProductImageUrl(slug, cid) {
  const url = `https://www.cremashop.eu/es/products/burg/${slug}/${cid}`;
  try {
    const { body } = await fetchUrl(url);
    const html = body.toString();
    // Look for og:image or product image
    const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
    if (ogMatch) return ogMatch[1];
    // Try data-src or src in product image
    const imgMatch = html.match(/class="[^"]*product[^"]*"[^>]*src="([^"]+)"/);
    if (imgMatch) return imgMatch[1];
    return null;
  } catch {
    return null;
  }
}

async function downloadImage(url) {
  const { body, status } = await fetchUrl(url);
  if (status !== 200) throw new Error(`HTTP ${status}`);
  return body;
}

async function processImage(buf) {
  return sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
}

async function uploadPhoto(docId, imgBuffer) {
  const storagePath = `${PREFIX}/${docId}.png`;
  const file = bucket.file(storagePath);
  try {
    await file.delete();
  } catch {}
  await file.save(imgBuffer, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

async function main() {
  console.log('=== Import Burg (from cremashop.eu) ===\n');

  // Phase 1: Delete existing
  const snap = await db.collection('cafes').where('marca', '==', 'Burg').get();
  console.log(`  Deleting ${snap.size} existing Burg docs...`);
  for (const doc of snap.docs) {
    await doc.ref.delete();
    try {
      await bucket.file(`${PREFIX}/${doc.id}.png`).delete();
    } catch {}
  }

  // Phase 2: Create from web
  console.log(`\n  Creating ${products.length} cafés...\n`);
  let created = 0,
    noImg = 0;

  for (const p of products) {
    const docId = `burg_${p.slug}`;
    try {
      // Get image
      const imgUrl = await getProductImageUrl(p.slug, p.cid);
      let photoUrl = '';

      if (imgUrl) {
        try {
          const raw = await downloadImage(imgUrl);
          const processed = await processImage(raw);
          photoUrl = await uploadPhoto(docId, processed);
        } catch (e) {
          console.log(`  WARN: image download failed for ${p.slug}: ${e.message}`);
          noImg++;
        }
      } else {
        console.log(`  WARN: no image found for ${p.slug}`);
        noImg++;
      }

      const isFlavoured = !!p.sabor;
      const doc = {
        nombre: p.nombre,
        marca: 'Burg',
        pais: p.origen || 'Alemania',
        origen: p.origen || '',
        variedad: p.variedad || '',
        formato: p.formato || 'ground',
        tipo: p.tipo || 'natural',
        peso: '250g',
        tueste: '',
        notas: isFlavoured ? `Saborizado: ${p.sabor}` : '',
        coffeeCategory: 'specialty',
        category: 'specialty',
        fuente: 'Burg (cremashop.eu)',
        fuentePais: 'DE',
        isBio: false,
        decaf: p.decaf || false,
        fecha: new Date().toISOString(),
        puntuacion: 0,
        votos: 0,
        status: 'approved',
        reviewStatus: 'approved',
        appVisible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(photoUrl
          ? {
              fotoUrl: photoUrl,
              foto: photoUrl,
              imageUrl: photoUrl,
              officialPhoto: photoUrl,
              bestPhoto: photoUrl,
              imagenUrl: photoUrl,
              photos: { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl },
            }
          : {}),
      };

      await db.collection('cafes').doc(docId).set(doc);
      created++;
      console.log(`  Created: ${docId}${photoUrl ? '' : ' (NO PHOTO)'}`);
    } catch (err) {
      console.log(`  ERROR ${docId}: ${err.message}`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  Deleted: ${snap.size} old`);
  console.log(`  Created: ${created} new (${noImg} without photo)`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
