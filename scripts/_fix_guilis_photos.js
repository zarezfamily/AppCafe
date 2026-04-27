#!/usr/bin/env node
/**
 * Fix Guilis photos - upload from listing page images (anti-bot blocks individual pages)
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

const COOKIE = 'dhd2=daad685a219cb8c82178fcbb4be14b38';

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: { 'User-Agent': 'Mozilla/5.0', Cookie: COOKIE },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, url).href;
            return fetchBuf(loc).then(resolve, reject);
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }
      )
      .on('error', reject);
  });
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

// Map docId → image URL from listing pages (higher res versions without -370x370)
const photoMap = {
  // GRANO
  guilis_colombia_supremo_fairtrade_1kg:
    'https://cafesguilis.com/wp-content/uploads/2025/09/Cafe-Colombia-1kg-Frade-trade-2-web.jpg',
  guilis_pack_4_latas_grano:
    'https://cafesguilis.com/wp-content/uploads/2023/05/latas-y-cafetera-sin-enchufe.jpg',
  guilis_black_blend_grano_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-black-blend-arabica-ligero-cafe-cuerpo-aroma-centro-sudamerica-cafe-grano-tueste-natural-12119-1-1.jpg',
  guilis_finca_colombia_grano_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-origen-colombia-cafe-finca-aroma-afrutado-acidez-natural-cafe-grano-tueste-natural-10123-1.jpg',
  guilis_finca_mocatan_colombia_grano_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-origen-colombia-cafe-finca-mocatan-aroma-afrutado-acidez-natural-cafe-grano-tueste-natural-10123-1.jpg',
  guilis_blend_caribe_grano_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-blend-caribe-arabica-ligero-cafe-cuerpo-aroma-centro-sudamerica-cafe-grano-tueste-natural-1.jpg',
  guilis_eco_beans_rainforest_grano_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/06/cafe-organico-rainforest.jpg',
  guilis_organico_arabica_lata_250g_grano:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-lata-blend-arabica-organico-cafe-origen-250gr-grano-tueste-natural-1020701-1.jpg',
  guilis_eco_descafeinado_grano_500g:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-cafe-grano-descafeinado-ecologico-100-arabica-organico-9155-1-2.jpg',
  guilis_finca_icatu_brasil_grano_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-cafe-finca-icatu-brasil-100-arabica-organico-perfecto-acidez-cuerpo-dulzor-grano-tueste-natural-10124-1.jpg',
  guilis_grano_de_oro_grano_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-natural-grano-de-oro-arabica-centro-sudamerica-africa-cafe-origen-torrefacto-grano-1-kg-10121-1.jpg',
  guilis_descafeinado_espresso_grano_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-espresso-descafeinado-origen-alta-criba-cafe-cuerpo-calidad-gourmet-tueste-natural-1.jpg',

  // MOLIDO
  guilis_pack_4_latas_molido:
    'https://cafesguilis.com/wp-content/uploads/2025/01/GuilisCafe_latas.jpg',
  guilis_black_blend_molido_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-black-blend-arabica-ligero-cafe-cuerpo-aroma-centro-sudamerica-cafe-grano-tueste-natural-12119-1-1.jpg',
  guilis_finca_mocatan_colombia_molido_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-origen-colombia-cafe-finca-mocatan-aroma-afrutado-acidez-natural-cafe-grano-tueste-natural-10123-1.jpg',
  guilis_blend_caribe_molido_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-blend-caribe-arabica-ligero-cafe-cuerpo-aroma-centro-sudamerica-cafe-grano-tueste-natural-1.jpg',
  guilis_eco_beans_rainforest_molido_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/06/cafes-guilis-ecologico-organico-arabica-ligero-afrutado-cafe-grano-tueste-natural-utz-kraft-1.jpg',
  guilis_eco_beans_molido_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-organico-eco-beans-molido-cafetera-italiana-arabica-ligero-afrutado-cafe-grano-tueste-natural-13700-1.jpg',
  guilis_organico_arabica_lata_250g_molido:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-lata-blend-arabica-organico-cafe-origen-250gr-grano-tueste-natural-1020701-1.jpg',
  guilis_finca_icatu_brasil_molido_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-cafe-finca-icatu-brasil-100-arabica-organico-perfecto-acidez-cuerpo-dulzor-grano-tueste-natural-10124-1.jpg',
  guilis_grano_de_oro_molido_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-natural-grano-de-oro-arabica-centro-sudamerica-africa-cafe-origen-torrefacto-grano-1-kg-10121-1.jpg',
  guilis_descafeinado_espresso_molido_1kg:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-espresso-descafeinado-origen-alta-criba-cafe-cuerpo-calidad-gourmet-tueste-natural-1.jpg',
  guilis_finca_blend_arabica_lata_250g_molido:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-lata-blend-arabica-brasil-cafe-origen-250gr-grano-tueste-natural-1033201-1.jpg',

  // CAPSULES
  guilis_caps_nespresso_descafeinado_70:
    'https://cafesguilis.com/wp-content/uploads/2025/07/caja-capsulas-aluminio-descaf-frontal-10-scaled.jpg',
  guilis_caps_nespresso_pro_natural_50:
    'https://cafesguilis.com/wp-content/uploads/2024/11/CAJA-CAPSULAS-PRO-FORTE.jpg',
  guilis_caps_nespresso_pro_descafeinado_50:
    'https://cafesguilis.com/wp-content/uploads/2024/11/CAJA-PRO-DESCAFEINADO-1.jpg',
  guilis_caps_nespresso_intenso_180:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cage-guilis-espresso-intenso-frente-scaled.jpg',
  guilis_caps_dolce_arabica_leche:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafe-dolce-latte-1.png',
  guilis_caps_dolce_blend_intenso:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafe-dolce-intenso-1.png',
  guilis_caps_blue_descafeinado_96:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-capsulas-descafeinado-cafetera-blue-lavazza-black-blend-100-cafe-arabidca-100-uds-23217-1.jpg',
  guilis_caps_blue_black_blend_96:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-capsulas-cafetera-blue-lavazza-black-blend-100-cafe-arabidca-100-uds-23216-1.jpg',
  // compostable organico has placeholder → skip
  guilis_caps_nespresso_organico_finca_180:
    'https://cafesguilis.com/wp-content/uploads/2022/04/cage-guilis-finca-organico-frente-scaled.jpg',
};

async function main() {
  console.log(`=== Fixing Guilis photos === (${Object.keys(photoMap).length} photos)\n`);
  let ok = 0,
    fail = 0;
  for (const [docId, imgUrl] of Object.entries(photoMap)) {
    try {
      const photoUrl = await processAndUpload(docId, imgUrl);
      await db
        .collection('cafes')
        .doc(docId)
        .update({
          fotoUrl: photoUrl,
          foto: photoUrl,
          imageUrl: photoUrl,
          officialPhoto: photoUrl,
          bestPhoto: photoUrl,
          imagenUrl: photoUrl,
          photos: { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl },
          updatedAt: new Date().toISOString(),
        });
      ok++;
      process.stdout.write(`\r  Updated ${ok}/${Object.keys(photoMap).length}`);
    } catch (e) {
      fail++;
      console.log(`\n  FAIL ${docId}: ${e.message}`);
    }
  }
  console.log(`\n\n=== Done: ${ok} photos updated, ${fail} failed ===`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
