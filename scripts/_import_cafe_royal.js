#!/usr/bin/env node
/**
 * Import/Update Café Royal from kaffek.co.uk
 * Deduplicates by unique blend (ignoring pack sizes 10/36/100)
 * Keeps existing 5 Gastro beans, adds all Nespresso + Nespresso Pro capsules
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return fetchBuf(res.headers.location).then(resolve, reject);
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function getOgImage(pageUrl) {
  try {
    const html = (await fetchBuf(pageUrl)).toString();
    const m = html.match(/property="og:image"\s*content="([^"]+)"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function processAndUpload(docId, imgUrl) {
  const buf = await fetchBuf(imgUrl);
  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(processed, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

// Unique products (deduplicated by blend, smallest Nespresso pack as canonical)
// Skip: variety boxes, starter packs, flavour journey packs
const products = [
  // === BEANS ===
  {
    id: 'cr_beans_espresso_forte_gastro',
    nombre: 'Café Royal Espresso Forte Gastro Grano 1kg',
    fmt: 'grano',
    peso: '1kg',
    page: 'https://kaffek.co.uk/espresso-forte-gastro-cafe-royal-coffee-beans.html',
    notas: 'Grano entero. Espresso Forte. Línea Gastro. Intenso',
    existingId: 'ean_7617014192824',
  },
  {
    id: 'cr_beans_espresso_gastro',
    nombre: 'Café Royal Espresso Gastro Grano 1kg',
    fmt: 'grano',
    peso: '1kg',
    page: 'https://kaffek.co.uk/espresso-gastro-cafe-royal-coffee-beans.html',
    notas: 'Grano entero. Espresso. Línea Gastro',
    existingId: 'ean_7617014178323',
  },
  {
    id: 'cr_beans_crema_gastro',
    nombre: 'Café Royal Crema Gastro Grano 1kg',
    fmt: 'grano',
    peso: '1kg',
    page: 'https://kaffek.co.uk/crema-gastro-cafe-royal-coffee-beans.html',
    notas: 'Grano entero. Crema. Línea Gastro. Suave',
    existingId: 'ean_7617014178316',
  },
  {
    id: 'cr_beans_gastro_descaf',
    nombre: 'Café Royal Gastro Descafeinado Grano 500g',
    fmt: 'grano',
    peso: '500g',
    page: 'https://kaffek.co.uk/gastro-decaffeinated-cafe-royal-coffee-beans.html',
    notas: 'Grano entero. Descafeinado. Línea Gastro',
    decaf: true,
    tipo: 'descafeinado',
    existingId: 'ean_7616500944701',
  },

  // === NESPRESSO CAPSULES (classic, not flavored) ===
  {
    id: 'cr_caps_lungo',
    nombre: 'Café Royal Cápsulas Nespresso Lungo',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/lungo-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Lungo. Rainforest Alliance',
  },
  {
    id: 'cr_caps_lungo_forte',
    nombre: 'Café Royal Cápsulas Nespresso Lungo Forte',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/lungo-forte-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Lungo Forte. Rainforest Alliance',
  },
  {
    id: 'cr_caps_lungo_classico',
    nombre: 'Café Royal Cápsulas Nespresso Lungo Classico',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/lungo-classico-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Lungo Classico. Rainforest Alliance',
  },
  {
    id: 'cr_caps_espresso',
    nombre: 'Café Royal Cápsulas Nespresso Espresso',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/espresso-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Espresso. Rainforest Alliance',
  },
  {
    id: 'cr_caps_espresso_forte',
    nombre: 'Café Royal Cápsulas Nespresso Espresso Forte',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/espresso-forte-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Espresso Forte. Rainforest Alliance',
  },
  {
    id: 'cr_caps_extraforte',
    nombre: 'Café Royal Cápsulas Nespresso Doppio Espresso',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/extraforte-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Doppio Espresso / Extraforte. Rainforest Alliance',
  },
  {
    id: 'cr_caps_ristretto',
    nombre: 'Café Royal Cápsulas Nespresso Ristretto',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/ristretto-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Ristretto. Rainforest Alliance',
  },
  {
    id: 'cr_caps_espresso_descaf',
    nombre: 'Café Royal Cápsulas Nespresso Espresso Descafeinado',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/espresso-decaffeinato-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Espresso Descafeinado. Rainforest Alliance',
    decaf: true,
    tipo: 'descafeinado',
  },
  {
    id: 'cr_caps_lungo_descaf',
    nombre: 'Café Royal Cápsulas Nespresso Lungo Descafeinado',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/lungo-decaffeinato-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Lungo Descafeinado. Rainforest Alliance',
    decaf: true,
    tipo: 'descafeinado',
  },

  // === NESPRESSO FLAVORED CAPSULES ===
  {
    id: 'cr_caps_amaretti',
    nombre: 'Café Royal Cápsulas Nespresso Amaretti',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/amaretti-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Sabor Amaretti',
  },
  {
    id: 'cr_caps_cinnamon',
    nombre: 'Café Royal Cápsulas Nespresso Cinnamon',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/cinnamon-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Sabor Canela',
  },
  {
    id: 'cr_caps_tiramisu',
    nombre: 'Café Royal Cápsulas Nespresso Tiramisú',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/tiramisu-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Sabor Tiramisú',
  },
  {
    id: 'cr_caps_dark_chocolate',
    nombre: 'Café Royal Cápsulas Nespresso Dark Chocolate',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/dark-chocolate-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Sabor Chocolate Oscuro',
  },
  {
    id: 'cr_caps_hazelnut',
    nombre: 'Café Royal Cápsulas Nespresso Hazelnut',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/hazelnut-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Sabor Avellana',
  },
  {
    id: 'cr_caps_caramel',
    nombre: 'Café Royal Cápsulas Nespresso Caramel',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/caramel-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Sabor Caramelo',
  },
  {
    id: 'cr_caps_vanilla',
    nombre: 'Café Royal Cápsulas Nespresso Vanilla',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/vanilla-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Sabor Vainilla',
  },
  {
    id: 'cr_caps_cherry_chocolate',
    nombre: 'Café Royal Cápsulas Nespresso Cherry Chocolate',
    fmt: 'capsules',
    peso: '10 uds',
    page: 'https://kaffek.co.uk/cherry-chocolate-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso. Aluminio. Sabor Cereza y Chocolate',
  },

  // === NESPRESSO PRO CAPSULES ===
  {
    id: 'cr_pro_lungo',
    nombre: 'Café Royal Cápsulas Nespresso Pro Lungo',
    fmt: 'capsules',
    peso: '50 uds',
    page: 'https://kaffek.co.uk/lungo-cafe-royal-nes-pro.html',
    notas: 'Compatible Nespresso Professional. Lungo',
  },
  {
    id: 'cr_pro_lungo_forte',
    nombre: 'Café Royal Cápsulas Nespresso Pro Lungo Forte',
    fmt: 'capsules',
    peso: '50 uds',
    page: 'https://kaffek.co.uk/lungo-forte-cafe-royal-nes-pro-2219.html',
    notas: 'Compatible Nespresso Professional. Lungo Forte',
  },
  {
    id: 'cr_pro_lungo_forte_bio',
    nombre: 'Café Royal Cápsulas Nespresso Pro Lungo Forte BIO',
    fmt: 'capsules',
    peso: '50 uds',
    page: 'https://kaffek.co.uk/lungo-forte-bio-cafe-royal-nespresso.html',
    notas: 'Compatible Nespresso Professional. Lungo Forte. Bio/Orgánico',
    isBio: true,
  },
  {
    id: 'cr_pro_lungo_bio',
    nombre: 'Café Royal Cápsulas Nespresso Pro Lungo BIO',
    fmt: 'capsules',
    peso: '50 uds',
    page: 'https://kaffek.co.uk/lungo-bio-cafe-royal-nes-pro.html',
    notas: 'Compatible Nespresso Professional. Lungo. Bio/Orgánico',
    isBio: true,
  },
  {
    id: 'cr_pro_espresso_forte',
    nombre: 'Café Royal Cápsulas Nespresso Pro Espresso Forte',
    fmt: 'capsules',
    peso: '50 uds',
    page: 'https://kaffek.co.uk/espresso-forte-cafe-royal-nes-pro-2220.html',
    notas: 'Compatible Nespresso Professional. Espresso Forte',
  },
  {
    id: 'cr_pro_espresso_bio',
    nombre: 'Café Royal Cápsulas Nespresso Pro Espresso BIO',
    fmt: 'capsules',
    peso: '50 uds',
    page: 'https://kaffek.co.uk/espresso-bio-cafe-royal-nes-pro.html',
    notas: 'Compatible Nespresso Professional. Espresso. Bio/Orgánico',
    isBio: true,
  },
  {
    id: 'cr_pro_espresso_forte_bio',
    nombre: 'Café Royal Cápsulas Nespresso Pro Espresso Forte BIO',
    fmt: 'capsules',
    peso: '50 uds',
    page: 'https://kaffek.co.uk/espresso-forte-bio-cafe-royal-nespresso-pro.html',
    notas: 'Compatible Nespresso Professional. Espresso Forte. Bio/Orgánico',
    isBio: true,
  },
  {
    id: 'cr_pro_ristretto',
    nombre: 'Café Royal Cápsulas Nespresso Pro Ristretto',
    fmt: 'capsules',
    peso: '50 uds',
    page: 'https://kaffek.co.uk/ristretto-cafe-royal-nes-pro.html',
    notas: 'Compatible Nespresso Professional. Ristretto',
  },
  {
    id: 'cr_pro_espresso_descaf',
    nombre: 'Café Royal Cápsulas Nespresso Pro Espresso Descafeinado',
    fmt: 'capsules',
    peso: '50 uds',
    page: 'https://kaffek.co.uk/espresso-caffeine-free-cafe-royal-nes-pro.html',
    notas: 'Compatible Nespresso Professional. Espresso Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },
  {
    id: 'cr_pro_hazelnut',
    nombre: 'Café Royal Cápsulas Nespresso Pro Hazelnut',
    fmt: 'capsules',
    peso: '50 uds',
    page: 'https://kaffek.co.uk/hazelnut-cafe-royal-nespresso-pro.html',
    notas: 'Compatible Nespresso Professional. Sabor Avellana',
  },
  {
    id: 'cr_pro_vanilla',
    nombre: 'Café Royal Cápsulas Nespresso Pro Vanilla',
    fmt: 'capsules',
    peso: '50 uds',
    page: 'https://kaffek.co.uk/vanilla-coffee-cafe-royal-nespresso-pro.html',
    notas: 'Compatible Nespresso Professional. Sabor Vainilla',
  },
  {
    id: 'cr_pro_caramel',
    nombre: 'Café Royal Cápsulas Nespresso Pro Caramel',
    fmt: 'capsules',
    peso: '50 uds',
    page: 'https://kaffek.co.uk/caramel-cafe-royal-nespresso-pro.html',
    notas: 'Compatible Nespresso Professional. Sabor Caramelo',
  },
];

const baseData = {
  marca: 'Café Royal',
  pais: 'Suiza',
  origen: '',
  variedad: '',
  tueste: '',
  tipo: 'natural',
  coffeeCategory: 'premium',
  category: 'premium',
  fuente: 'caferoyal.com',
  fuentePais: 'CH',
  isBio: false,
  decaf: false,
  notas: '',
  fecha: new Date().toISOString(),
  puntuacion: 0,
  votos: 0,
  status: 'approved',
  reviewStatus: 'approved',
  appVisible: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function main() {
  const DRY = process.argv.includes('--dry-run');
  console.log(
    `=== Café Royal Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} unique products)\n`
  );

  if (DRY) {
    const existingIds = products.filter((p) => p.existingId).map((p) => p.existingId);
    console.log(`  Will delete ${existingIds.length} old docs: ${existingIds.join(', ')}`);
    products.forEach((p, i) =>
      console.log(`  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre}`)
    );
    return;
  }

  // Delete all existing Café Royal docs (old EAN-based ones + any previous import)
  const snap = await db.collection('cafes').where('marca', '==', 'Café Royal').get();
  console.log(`  Deleting ${snap.size} existing Café Royal docs...`);
  for (const d of snap.docs) {
    await d.ref.delete();
    try {
      await bucket.file(`${PREFIX}/${d.id}.png`).delete();
    } catch {}
  }
  // Also delete the Brasil Intenso which had a different EAN
  try {
    await db.collection('cafes').doc('ean_7616500934054').delete();
  } catch {}

  let ok = 0,
    noImg = 0;
  for (const p of products) {
    try {
      let photoUrl = '';
      const imgUrl = await getOgImage(p.page);
      if (imgUrl) {
        try {
          photoUrl = await processAndUpload(p.id, imgUrl);
        } catch (e) {
          console.log(`\n  WARN img ${p.id}: ${e.message}`);
          noImg++;
        }
      } else {
        noImg++;
      }

      const photoFields = photoUrl
        ? {
            fotoUrl: photoUrl,
            foto: photoUrl,
            imageUrl: photoUrl,
            officialPhoto: photoUrl,
            bestPhoto: photoUrl,
            imagenUrl: photoUrl,
            photos: { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl },
          }
        : {};

      const doc = {
        ...baseData,
        nombre: p.nombre,
        formato: p.fmt,
        peso: p.peso || '',
        notas: p.notas || '',
        ...(p.decaf ? { decaf: true } : {}),
        ...(p.tipo ? { tipo: p.tipo } : {}),
        ...(p.isBio ? { isBio: true } : {}),
        ...photoFields,
      };
      await db.collection('cafes').doc(p.id).set(doc);
      ok++;
      process.stdout.write(`\r  Created ${ok}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERROR ${p.id}: ${e.message}`);
    }
  }
  console.log(`\n\n=== Done: deleted ${snap.size} old, created ${ok} (${noImg} without photo) ===`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
