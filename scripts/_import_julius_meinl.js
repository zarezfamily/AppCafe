#!/usr/bin/env node
/**
 * Import Julius Meinl from official website juliusmeinl.com
 * Beans + Ground Coffee + Capsules (Nespresso compatible, home compostable)
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

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location).then(resolve, reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function getOgImage(pageUrl) {
  try {
    const { body } = await fetchUrl(pageUrl);
    const html = body.toString();
    const m = html.match(/property="og:image"\s+content="([^"]+)"/);
    if (m) return m[1].replace(':443/', '/');
    // Fallback: any getmedia URL with product-like filename
    const gm = html.match(/juliusmeinl\.com(?::443)?\/getmedia\/[^"'\s]+\.(png|jpg)/gi);
    if (gm && gm.length > 0) return 'https://' + gm[0].replace(':443/', '/');
    return null;
  } catch {
    return null;
  }
}

async function downloadAndProcess(url) {
  const { body, status } = await fetchUrl(url);
  if (status !== 200) throw new Error(`HTTP ${status}`);
  return sharp(body)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
}

async function upload(docId, buf) {
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(buf, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

const B = 'https://juliusmeinl.com/for-home-use';

const products = [
  // === BEANS (Vienna Retail Line) ===
  {
    id: 'jm_beans_bio_melange',
    nombre: 'Bio Melange Grano 900g',
    fmt: 'beans',
    peso: '900g',
    page: `${B}/beans/vienna-collection-biomelange`,
    notas: 'Vienna Line. Bio, Fair Trade. Chocolate oscuro, cacahuete tostado. Intensidad 8',
    isBio: true,
  },
  {
    id: 'jm_beans_caffe_crema_vienna',
    nombre: 'Caffè Crema Vienna Line Grano 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: `${B}/beans/vienna-line-caffe-crema`,
    notas: 'Vienna Line. Avellana, chocolate oscuro. Crema aterciopelada. Intensidad 7',
  },
  {
    id: 'jm_beans_espresso_vienna',
    nombre: 'Espresso Vienna Line Grano 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: `${B}/beans/vienna-collection-espresso`,
    notas: 'Vienna Line. Chocolate oscuro, frutos secos tostados. Intensidad 7',
  },
  {
    id: 'jm_beans_melange_vienna',
    nombre: 'Melange Vienna Line Grano 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: `${B}/beans/vienna-retail-collection-wiener-melange`,
    notas: 'Vienna Line. Sabor a chocolate, avellana. Ideal con leche. Intensidad 8',
  },

  // === BEANS (Premium Collection) ===
  {
    id: 'jm_beans_espresso_arabica',
    nombre: 'Espresso Arabica Grano 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: `${B}/beans/espresso-arabica`,
    notas: 'Premium Collection. 100% Arábica. Fresco, dulce, crema suave. Intensidad 5',
    variedad: '100% Arábica',
  },
  {
    id: 'jm_beans_caffe_crema_premium',
    nombre: 'Caffè Crema Premium Grano 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: `${B}/beans/caffe-crema`,
    notas: 'Premium Collection. Arábica y Robusta. Crema cremosa, avellana. Intensidad 7',
  },

  // === BEANS (Trend Collection) ===
  {
    id: 'jm_beans_espresso_classico',
    nombre: 'Espresso Classico Grano 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: `${B}/beans/espresso-classico`,
    notas: 'Trend Collection. Pan tostado, chocolate oscuro, cacao. Intensidad 6',
  },
  {
    id: 'jm_beans_caffe_crema_intenso',
    nombre: 'Caffè Crema Intenso Grano 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: `${B}/beans/caffe-crema-intenso`,
    notas: 'Trend Collection. Fuerte, cremoso. Ideal con leche. Intensidad 8',
  },

  // === BEANS (Classic Collection) ===
  {
    id: 'jm_beans_prasident_1kg',
    nombre: 'Präsident Grano 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: `${B}/beans/prasident-1kg-beans`,
    notas: 'Classic Collection. Tueste vienés, chocolate, equilibrado. Intensidad 6',
  },
  {
    id: 'jm_beans_jubilaum_1kg',
    nombre: 'Jubiläum Grano 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: `${B}/beans/jubileum-1kg-beans`,
    notas: 'Classic Collection. Edición centenario. Cítrico-floral. Intensidad 6',
  },
  {
    id: 'jm_beans_prasident_500g',
    nombre: 'Präsident Grano 500g',
    fmt: 'beans',
    peso: '500g',
    page: `${B}/beans/prasident-(2)-f5f79d82ec494e0c70be3fe60022dcd4`,
    notas: 'Classic Collection. Tueste vienés, chocolate. Intensidad 6',
  },

  // === BEANS (Poetry Collection) ===
  {
    id: 'jm_beans_king_hadhramaut',
    nombre: 'King Hadhramaut Grano',
    fmt: 'beans',
    peso: '',
    page: `${B}/beans/king-hadhramaut-beans`,
    notas:
      'Poetry Collection. Rainforest Alliance. Etiopía y Kenia. Especiado, afrutado. Intensidad 6',
  },

  // === GROUND COFFEE ===
  {
    id: 'jm_ground_espresso_moka',
    nombre: 'Espresso Moka Molido',
    fmt: 'ground',
    peso: '',
    page: `${B}/ground-coffee/espresso-moka`,
    notas: 'Premium Collection. 100% Arábica. Floral, fruta fresca. Intensidad 5',
    variedad: '100% Arábica',
  },
  {
    id: 'jm_ground_melange_vienna',
    nombre: 'Melange Vienna Line Molido 500g',
    fmt: 'ground',
    peso: '500g',
    page: `${B}/ground-coffee/vienna-line-melange-500g`,
    notas: 'Vienna Line. Chocolate, avellana. Ideal con leche. Intensidad 8',
  },
  {
    id: 'jm_ground_espresso_buonaroma',
    nombre: 'Espresso Buonaroma Molido',
    fmt: 'ground',
    peso: '',
    page: `${B}/ground-coffee/espresso-buonaroma`,
    notas: 'Trend Collection. Intenso, crema oscura persistente. Intensidad 8',
  },
  {
    id: 'jm_ground_prasident_500g',
    nombre: 'Präsident Molido 500g',
    fmt: 'ground',
    peso: '500g',
    page: `${B}/ground-coffee/prasident-500-g-ground`,
    notas: 'Classic Collection. Chocolate oscuro, pan tostado. Intensidad 7',
  },
  {
    id: 'jm_ground_prasident_fine',
    nombre: 'Präsident Fine Ground Molido',
    fmt: 'ground',
    peso: '',
    page: `${B}/ground-coffee/prasident-fine-ground`,
    notas: 'Classic Collection. Molienda fina. Cuerpo completo. Intensidad 7',
  },
  {
    id: 'jm_ground_jubilaum_500g',
    nombre: 'Jubiläum Molido 500g',
    fmt: 'ground',
    peso: '500g',
    page: `${B}/ground-coffee/jubilaum-500-g-ground`,
    notas: 'Classic Collection. Edición centenario. Suave, delicado. Intensidad 6',
  },
  {
    id: 'jm_ground_jubilaum_fine',
    nombre: 'Jubiläum Fine Ground Molido',
    fmt: 'ground',
    peso: '',
    page: `${B}/ground-coffee/jubileum-fine-ground`,
    notas: 'Classic Collection. Molienda fina. Suave, dulce. Intensidad 6',
  },
  {
    id: 'jm_ground_fruhstuck',
    nombre: 'Frühstück Molido',
    fmt: 'ground',
    peso: '',
    page: `${B}/ground-coffee/fruhstuck`,
    notas: 'Classic Collection. Desayuno. Fruta seca, tueste medio. Intensidad 6',
  },
  {
    id: 'jm_ground_king_hadhramaut',
    nombre: 'King Hadhramaut Molido',
    fmt: 'ground',
    peso: '',
    page: `${B}/ground-coffee/king-hadhramaut-ground`,
    notas:
      'Poetry Collection. Rainforest Alliance. Etiopía y Kenia. Especiado, afrutado. Intensidad 7',
  },

  // === CAPSULES (Nespresso compatible, home compostable) — direct image URLs from capsules page ===
  {
    id: 'jm_caps_espresso_crema',
    nombre: 'Cápsulas Nespresso Espresso Crema',
    fmt: 'capsules',
    peso: '',
    directImg:
      'https://juliusmeinl.com/getmedia/089e59db-8d46-4ddb-9878-799e19720def/94029-Espresso-Crema-10-front-(1)-200x500px.png?maxSideSize=1200',
    notas: 'Compatible Nespresso. Compostable. Arábica y Robusta. Intensidad 8',
  },
  {
    id: 'jm_caps_espresso_decaffeinato',
    nombre: 'Cápsulas Nespresso Espresso Decaffeinato',
    fmt: 'capsules',
    peso: '',
    directImg:
      'https://juliusmeinl.com/getmedia/89461ec8-dee0-42ca-a246-2f226a3c39b2/94033-Espresso-Decaffeinato-10-front-200x500px.png?maxSideSize=1200',
    notas: 'Compatible Nespresso. Compostable. Descafeinado. Intensidad 8',
    decaf: true,
    tipo: 'descafeinado',
  },
  {
    id: 'jm_caps_espresso_delizioso',
    nombre: 'Cápsulas Nespresso Espresso Delizioso',
    fmt: 'capsules',
    peso: '',
    directImg:
      'https://juliusmeinl.com/getmedia/8c004d91-c11c-465e-bcaa-2af909e6eec3/93363-Espresso-Delizioso-10-front-200x500px.png?maxSideSize=1200',
    notas: 'Compatible Nespresso. Compostable. Bio, Fair Trade. 100% Arábica. Intensidad 7',
    isBio: true,
    variedad: '100% Arábica',
  },
  {
    id: 'jm_caps_lungo_classico',
    nombre: 'Cápsulas Nespresso Lungo Classico',
    fmt: 'capsules',
    peso: '',
    directImg:
      'https://juliusmeinl.com/getmedia/0c7a04f8-c85b-4701-a632-17d064cfa61e/94031-Lungo-Classico-10-front-200x500px.png?maxSideSize=1200',
    notas: 'Compatible Nespresso. Compostable. 100% Arábica. Intensidad 6',
    variedad: '100% Arábica',
  },
  {
    id: 'jm_caps_lungo_forte',
    nombre: 'Cápsulas Nespresso Lungo Forte',
    fmt: 'capsules',
    peso: '',
    directImg:
      'https://juliusmeinl.com/getmedia/5d567dc1-020c-495b-8829-7f848f887f5e/93364-Lungo-Forte-10-front-200x500px.png?maxSideSize=1200',
    notas: 'Compatible Nespresso. Compostable. Bio, Fair Trade. Intenso. Intensidad 9',
    isBio: true,
  },
  {
    id: 'jm_caps_ristretto_intenso',
    nombre: 'Cápsulas Nespresso Ristretto Intenso',
    fmt: 'capsules',
    peso: '',
    directImg:
      'https://juliusmeinl.com/getmedia/065548ef-15e3-473e-8d81-f619f891db7b/94030-Ristretto-Intenso-10-front-200x500px.png?maxSideSize=1200',
    notas: 'Compatible Nespresso. Compostable. Arábica y Robusta. Intensidad 10',
  },
];

const base = {
  marca: 'Julius Meinl',
  pais: 'Austria',
  origen: '',
  variedad: '',
  tueste: '',
  tipo: 'natural',
  coffeeCategory: 'premium',
  category: 'specialty',
  fuente: 'juliusmeinl.com',
  fuentePais: 'AT',
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
    `=== Import Julius Meinl ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(`  ${(i + 1).toString().padStart(2)}. ${p.id} → ${p.nombre}`)
    );
    return;
  }

  // Delete existing
  const snap = await db.collection('cafes').where('marca', '==', 'Julius Meinl').get();
  console.log(`  Deleting ${snap.size} existing Julius Meinl docs...`);
  for (const d of snap.docs) {
    await d.ref.delete();
    try {
      await bucket.file(`${PREFIX}/${d.id}.png`).delete();
    } catch {}
  }

  let ok = 0,
    noImg = 0;
  for (const p of products) {
    try {
      let photoUrl = '';
      const imgUrl = p.directImg || (p.page ? await getOgImage(p.page) : null);
      if (imgUrl) {
        try {
          const buf = await downloadAndProcess(imgUrl);
          photoUrl = await upload(p.id, buf);
        } catch (e) {
          console.log(`  WARN img ${p.id}: ${e.message}`);
          noImg++;
        }
      } else {
        noImg++;
      }

      const doc = {
        ...base,
        nombre: p.nombre,
        formato: p.fmt,
        peso: p.peso || '',
        ...(p.notas ? { notas: p.notas } : {}),
        ...(p.decaf ? { decaf: true } : {}),
        ...(p.tipo ? { tipo: p.tipo } : {}),
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.isBio ? { isBio: true } : {}),
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
      await db.collection('cafes').doc(p.id).set(doc);
      ok++;
      process.stdout.write(`\r  Created ${ok}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERROR ${p.id}: ${e.message}`);
    }
  }
  console.log(`\n\n=== Done: deleted ${snap.size}, created ${ok} (${noImg} without photo) ===`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
