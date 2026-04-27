#!/usr/bin/env node
/**
 * Import Caffè Borbone from official website
 * Unique products only (no duplicates across capsule systems)
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
    https
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

async function getProductImage(pageUrl) {
  try {
    const { body } = await fetchUrl(pageUrl);
    const html = body.toString();
    // Extract first product image from Demandware CDN
    const m = html.match(
      /demandware\.static\/-\/Sites-master-catalog\/default\/[a-z0-9]+\/[^"'\s?]+\.(jpg|png)/i
    );
    if (m) return 'https://www.caffeborbone.com/dw/image/v2/BHCB_PRD/on/' + m[0];
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

const products = [
  // === GRANOS ===
  {
    id: 'borbone_grano_crema_superior_1kg',
    nombre: 'Caffè en grano Crema Superior 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: 'https://www.caffeborbone.com/es/es/1000-gr-granos-crema-superior-caffe-borbone-GRANICREMASUPERIORE.html',
    notas: 'Mezcla Crema Superior',
  },
  {
    id: 'borbone_grano_crema_classica_1kg',
    nombre: 'Caffè en grano Crema Classica 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: 'https://www.caffeborbone.com/es/es/1000-gr-granos-crema-classica-caffe-borbone-GRANICREMACLASSICA.html',
    notas: 'Mezcla Crema Classica',
  },
  {
    id: 'borbone_grano_espresso_intenso_1kg',
    nombre: 'Caffè en grano Espresso Intenso 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: 'https://www.caffeborbone.com/es/es/1000-gr-granos-espresso-intenso-caffe-borbone-GRANIESPRESSOINTENSO.html',
    notas: 'Mezcla Espresso Intenso',
  },
  {
    id: 'borbone_grano_vending_azul_500g',
    nombre: 'Caffè en grano Vending Mezcla Azul 500g',
    fmt: 'beans',
    peso: '500g',
    page: 'https://www.caffeborbone.com/es/es/500-gr-grains-vending-mezcla-azul-caffe-borbone-GRANIVENDINGBLUE500.html',
    notas: 'Mezcla Azul, equilibrada y con cuerpo',
  },
  {
    id: 'borbone_grano_vending_roja_500g',
    nombre: 'Caffè en grano Vending Mezcla Roja 500g',
    fmt: 'beans',
    peso: '500g',
    page: 'https://www.caffeborbone.com/es/es/500-gr-grains-vending-mezcla-roja-caffe-borbone-GRANIVENDINGRED500.html',
    notas: 'Mezcla Roja, fuerte e intensa',
  },

  // === MOLIDO ===
  {
    id: 'borbone_molido_moka_decisa_250g',
    nombre: 'Caffè molido Moka Decisa 250g',
    fmt: 'ground',
    peso: '250g',
    page: 'https://www.caffeborbone.com/es/es/borbone-moka-decisa-mezcla-MACINATODECISA250.html',
    notas: 'Mezcla Decisa para Moka',
  },
  {
    id: 'borbone_molido_moka_nobile_250g',
    nombre: 'Caffè molido Moka Nobile 250g',
    fmt: 'ground',
    peso: '250g',
    page: 'https://www.caffeborbone.com/es/es/moka-coffee-borbone-MACINATONOBILE250.html',
    notas: 'Mezcla Nobile para Moka',
  },

  // === CÁPSULAS NESPRESSO ALUMINIO (nueva línea) ===
  {
    id: 'borbone_caps_nesp_lungo_sublime',
    nombre: 'Cápsulas Nespresso Lungo Sublime 100% Arábica',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/nuevas-capsulas-compatibles-borbone-lungo-sublime-nespresso-aluminio-REBESTARABICA.html',
    notas: 'Compatible Nespresso. Aluminio. 100% Arábica',
    variedad: '100% Arábica',
  },
  {
    id: 'borbone_caps_nesp_crema_classica',
    nombre: 'Cápsulas Nespresso Crema Classica',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/nuevas-capsulas-compatibles-borbone-nespresso-mezcla-crema-classica-aluminio-REBESTCLASSICA.html',
    notas: 'Compatible Nespresso. Aluminio',
  },
  {
    id: 'borbone_caps_nesp_crema_superiore',
    nombre: 'Cápsulas Nespresso Crema Superiore',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/nuevas-capsulas-compatibles-borbone-nespresso-mezcla-crema-superiore-aluminio-REBESTSUPERIORE.html',
    notas: 'Compatible Nespresso. Aluminio',
  },

  // === CÁPSULAS NESPRESSO PLÁSTICO (Respresso) ===
  {
    id: 'borbone_caps_resp_azul',
    nombre: 'Cápsulas Respresso Mezcla Azul',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/azul-mezcla-capsulas-borbone-respresso-compatible-nespresso-REBBLUE.html',
    notas: 'Compatible Nespresso. Mezcla Azul: equilibrada y con cuerpo',
  },
  {
    id: 'borbone_caps_resp_negra',
    nombre: 'Cápsulas Respresso Mezcla Negra',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/negra-mezcla-capsulas-borbone-respresso-compatible-nespresso-REBBLACK.html',
    notas: 'Compatible Nespresso. Mezcla Negra: espesa y cremosa',
  },
  {
    id: 'borbone_caps_resp_oro',
    nombre: 'Cápsulas Respresso Mezcla Oro',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/oro-mezcla-capsulas-borbone-respresso-compatible-nespresso-REBGOLD.html',
    notas: 'Compatible Nespresso. Mezcla Oro: tradición napolitana',
  },
  {
    id: 'borbone_caps_resp_roja',
    nombre: 'Cápsulas Respresso Mezcla Roja',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/roja-mezcla-capsulas-borbone-respresso-compatible-nespresso-REBRED.html',
    notas: 'Compatible Nespresso. Mezcla Roja: fuerte e intensa',
  },
  {
    id: 'borbone_caps_resp_dek',
    nombre: 'Cápsulas Respresso Mezcla Dek',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/dek-verde-mezcla-capsulas-borbone-respresso-compatible-nespresso-REBDEK.html',
    notas: 'Compatible Nespresso. Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },
  {
    id: 'borbone_caps_resp_light',
    nombre: 'Cápsulas Respresso Mezcla Light',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-borbone-respresso-mezcla-light-compatible-nespresso-REBLIGHT.html',
    notas: 'Compatible Nespresso. Light: 50% Azul, 50% Dek',
  },

  // === CÁPSULAS COMPOSTABLES ===
  {
    id: 'borbone_caps_compostable',
    nombre: 'Cápsulas Compostables Nespresso',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/50-capsulas-compostables-compatibles-nespresso-REBARABICACOMP050N.html',
    notas: 'Compatible Nespresso. Compostable',
    isBio: true,
  },

  // === CÁPSULAS NESPRESSO PROFESSIONAL ===
  {
    id: 'borbone_caps_npro_ristretto',
    nombre: 'Cápsulas Nespresso Professional Ristretto',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/50-capsulas-compatibles-nespresso-professional-ristretto-NPRORISTRETTO6X50.html',
    notas: 'Compatible Nespresso Professional. Ristretto',
  },
  {
    id: 'borbone_caps_npro_espresso_forte',
    nombre: 'Cápsulas Nespresso Professional Espresso Forte',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/50-capsulas-compatibles-nespresso-professional-espresso-forte-NPROESPRESSOFOR6X50.html',
    notas: 'Compatible Nespresso Professional. Espresso Forte',
  },

  // === CÁPSULAS DOLCE GUSTO (solo café, sin bebidas) ===
  {
    id: 'borbone_caps_dg_lungo_sublime',
    nombre: 'Cápsulas Dolce Gusto Lungo Sublime 100% Arábica',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-new-lungo-sublime-caffe-borbone-compatible-con-nescafe-dolce-gusto-DGBESTARABICALUNGO.html',
    notas: 'Compatible Dolce Gusto. 100% Arábica',
    variedad: '100% Arábica',
  },
  {
    id: 'borbone_caps_dg_crema_classica',
    nombre: 'Cápsulas Dolce Gusto Crema Classica',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-new-crema-classica-caffe-borbone-compatible-con-nescafe-dolce-gusto-DGBESTBLUCLASSICA.html',
    notas: 'Compatible Dolce Gusto. Crema Classica',
  },
  {
    id: 'borbone_caps_dg_crema_superiore',
    nombre: 'Cápsulas Dolce Gusto Crema Superiore',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-new-crema-superiore-caffe-borbone-compatible-con-nescafe-dolce-gusto-DGBESTOROSUPERIORE.html',
    notas: 'Compatible Dolce Gusto. Crema Superiore',
  },
  {
    id: 'borbone_caps_dg_decaffeinato',
    nombre: 'Cápsulas Dolce Gusto Decaffeinato',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-new-decaffeinato-caffe-borbone-compatible-con-nescafe-dolce-gusto-DGBESTDEK.html',
    notas: 'Compatible Dolce Gusto. Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },

  // === CÁPSULAS LAVAZZA A MODO MIO (Don Carlo, solo café) ===
  {
    id: 'borbone_caps_amm_azul',
    nombre: 'Cápsulas Don Carlo Mezcla Azul (Lavazza A Modo Mio)',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/borbone-don-carlo-azul-mezcla-capsulas-compatible-lavazza-a-modo-mio-AMSBLUE.html',
    notas: 'Compatible Lavazza A Modo Mio. Mezcla Azul',
  },
  {
    id: 'borbone_caps_amm_negra',
    nombre: 'Cápsulas Don Carlo Mezcla Negra (Lavazza A Modo Mio)',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/borbone-don-carlo-mezcla-negra-capsulas-compatible-lavazza-a-modo-mio-AMSBLACK.html',
    notas: 'Compatible Lavazza A Modo Mio. Mezcla Negra',
  },
  {
    id: 'borbone_caps_amm_roja',
    nombre: 'Cápsulas Don Carlo Mezcla Roja (Lavazza A Modo Mio)',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/borbone-don-carlo-roja-mezcla-capsulas-compatible-lavazza-a-modo-mio-AMSRED.html',
    notas: 'Compatible Lavazza A Modo Mio. Mezcla Roja',
  },
  {
    id: 'borbone_caps_amm_dek',
    nombre: 'Cápsulas Don Carlo Mezcla Dek (Lavazza A Modo Mio)',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/borbone-don-carlo-verde-dek-mezcla-capsulas-compatible-lavazza-a-modo-mio-AMSDEK.html',
    notas: 'Compatible Lavazza A Modo Mio. Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },
  {
    id: 'borbone_caps_amm_oro_compost',
    nombre: 'Cápsulas Don Carlo Oro Compostable (Lavazza A Modo Mio)',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/borbone-don-carlo-oro-mezcla-compostable-capsulas-compatible-lavazza-a-modo-mio-AMSCOMPOSTGOLD.html',
    notas: 'Compatible Lavazza A Modo Mio. Mezcla Oro. Compostable',
  },

  // === CÁPSULAS LAVAZZA ESPRESSO POINT (solo café) ===
  {
    id: 'borbone_caps_ep_azul',
    nombre: 'Cápsulas Espresso Point Mezcla Azul',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-caffe-borbone-azul-mezcla-compatible-lavazza-espresso-point-KABBLUE.html',
    notas: 'Compatible Lavazza Espresso Point. Mezcla Azul',
  },
  {
    id: 'borbone_caps_ep_negra',
    nombre: 'Cápsulas Espresso Point Mezcla Negra',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-caffe-borbone-negra-mezcla-compatible-lavazza-espresso-point-KABBLACK.html',
    notas: 'Compatible Lavazza Espresso Point. Mezcla Negra',
  },
  {
    id: 'borbone_caps_ep_roja',
    nombre: 'Cápsulas Espresso Point Mezcla Roja',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-caffe-borbone-roja-mezcla-compatible-lavazza-espresso-point-KABRED.html',
    notas: 'Compatible Lavazza Espresso Point. Mezcla Roja',
  },
  {
    id: 'borbone_caps_ep_oro',
    nombre: 'Cápsulas Espresso Point Mezcla Oro',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-caffe-borbone-oro-mezcla-compatible-lavazza-espresso-point-KABGOLD.html',
    notas: 'Compatible Lavazza Espresso Point. Mezcla Oro',
  },
  {
    id: 'borbone_caps_ep_dek',
    nombre: 'Cápsulas Espresso Point Mezcla Dek',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-caffe-borbone-dek-verde-mezcla-compatible-lavazza-espresso-point-KABDEK.html',
    notas: 'Compatible Lavazza Espresso Point. Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },

  // === CÁPSULAS BIALETTI (solo café) ===
  {
    id: 'borbone_caps_bialetti_azul',
    nombre: 'Cápsulas Bialetti Mezcla Azul',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-compatibles-borbone-bialetti-mezcla-azul-BLTBBLUE.html',
    notas: 'Compatible Bialetti. Mezcla Azul',
  },
  {
    id: 'borbone_caps_bialetti_roja',
    nombre: 'Cápsulas Bialetti Mezcla Roja',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-compatibles-borbone-bialetti-mezcla-roja-BLTBRED.html',
    notas: 'Compatible Bialetti. Mezcla Roja',
  },
  {
    id: 'borbone_caps_bialetti_oro',
    nombre: 'Cápsulas Bialetti Mezcla Oro',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-compatibles-borbone-bialetti-mezcla-oro-BLTBGOLD.html',
    notas: 'Compatible Bialetti. Mezcla Oro',
  },
  {
    id: 'borbone_caps_bialetti_dek',
    nombre: 'Cápsulas Bialetti Mezcla Dek',
    fmt: 'capsules',
    peso: '',
    page: 'https://www.caffeborbone.com/es/es/capsulas-compatibles-borbone-bialetti-mezcla-dek-BLTBDEK.html',
    notas: 'Compatible Bialetti. Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },
];

const base = {
  marca: 'Borbone',
  pais: 'Italia',
  origen: '',
  variedad: '',
  tueste: '',
  tipo: 'natural',
  coffeeCategory: 'premium',
  category: 'specialty',
  fuente: 'caffeborbone.com',
  fuentePais: 'IT',
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
  console.log(`=== Import Borbone ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`);

  if (DRY) {
    products.forEach((p, i) =>
      console.log(`  ${(i + 1).toString().padStart(2)}. ${p.id} → ${p.nombre}`)
    );
    return;
  }

  // Delete existing
  const snap = await db.collection('cafes').where('marca', '==', 'Borbone').get();
  console.log(`  Deleting ${snap.size} existing Borbone docs...`);
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
      // Try direct image URL first, else extract from product page
      const imgUrl = p.img || (p.page ? await getProductImage(p.page) : null);
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
