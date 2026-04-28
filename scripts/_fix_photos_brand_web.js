/**
 * Fix missing photos from brand websites (no watermark)
 * Scrapes product pages directly from each brand's website.
 * Usage: node scripts/_fix_photos_brand_web.js
 */
const admin = require('firebase-admin');
const https = require('https');
const http = require('http');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function fetch(url) {
  const client = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    client
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
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
          res.on('end', () => resolve(data));
        }
      )
      .on('error', reject);
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Extract wp-content image from page (WordPress sites)
function extractWpImage(html) {
  // Look for product images in wp-content/uploads (full size, not thumbnails)
  const re = /https?:\/\/[^"'\s]+\/wp-content\/uploads\/\d{4}\/\d{2}\/[^"'\s]+\.(?:jpg|png|webp)/gi;
  const matches = html.match(re) || [];
  // Filter out thumbnails (-150x150, -300x300, etc)
  const fullSize = matches.filter((u) => !/-\d+x\d+\./.test(u));
  return fullSize.length > 0 ? fullSize[0] : matches.length > 0 ? matches[0] : '';
}

// ===== LA CASA DEL CAFÉ =====
const LACASA_PRODUCTS = {
  lacasadelcafe_grano_brasil: 'https://lacasadelcafe.es/comprar/cafe-de-brasil-en-grano/',
  lacasadelcafe_grano_comercio_justo:
    'https://lacasadelcafe.es/comprar/cafe-de-comercio-justo-en-grano-copia/',
  lacasadelcafe_grano_costa_rica: 'https://lacasadelcafe.es/comprar/cafe-de-costa-rica-en-grano/',
  lacasadelcafe_grano_descafeinado: 'https://lacasadelcafe.es/comprar/cafe-descafeinado-en-grano/',
  lacasadelcafe_grano_ecologico: 'https://lacasadelcafe.es/comprar/cafe-ecologico-en-grano/',
  lacasadelcafe_grano_etiopia: 'https://lacasadelcafe.es/comprar/cafe-de-etiopia-en-grano/',
  lacasadelcafe_grano_guatemala: 'https://lacasadelcafe.es/comprar/cafe-de-guatemala-en-grano/',
  lacasadelcafe_grano_vietnam: 'https://lacasadelcafe.es/comprar/cafe-de-vietnam-en-grano/',
};

// ===== CATUNAMBÚ =====
const CATUNAMBU_PRODUCTS = {
  'catunambu-capsulas-descafeinado': 'https://www.catunambu.com/producto/capsulas-descafeinado/',
  'catunambu-capsulas-ecologico': 'https://www.catunambu.com/producto/capsulas-ecologico/',
  'catunambu-capsulas-expresso': 'https://www.catunambu.com/producto/capsulas-expresso/',
  'catunambu-metalbox-100-arabica-3kg': 'https://www.catunambu.com/producto/metalbox-100-arabica/',
  'catunambu-metalbox-blend-3kg': 'https://www.catunambu.com/producto/metalbox-blend/',
  'catunambu-metalbox-descafeinado-3kg':
    'https://www.catunambu.com/producto/metalbox-descafeinado/',
  'catunambu-serie-oro-grano-descafeinado-1kg':
    'https://www.catunambu.com/producto/serie-oro-grano-descafeinado/',
  'catunambu-serie-oro-grano-mezcla-1kg':
    'https://www.catunambu.com/producto/serie-oro-grano-mezcla/',
  'catunambu-serie-oro-grano-natural-1kg':
    'https://www.catunambu.com/producto/serie-oro-grano-natural/',
};

// ===== CAFÉS MIÑANA =====
const MINANA_PRODUCTS = {
  minana_cafe_artesano_250g: 'https://www.cafesminana.es/producto/cafe-artesano/',
  minana_guatemala_descafeinado_co2:
    'https://www.cafesminana.es/producto/guatemala-descafeinado-co2/',
  minana_hawai_kona: 'https://www.cafesminana.es/producto/hawai-kona/',
  minana_kenya_aa_cimazul: 'https://www.cafesminana.es/producto/kenya-aa-cimazul/',
  minana_panama_geisha: 'https://www.cafesminana.es/producto/panama-geisha/',
};

async function fixFromProductPage(docId, productUrl) {
  try {
    const html = await fetch(productUrl);
    const img = extractWpImage(html);
    if (img) {
      await db.collection('cafes').doc(docId).update({ officialPhoto: img });
      console.log(`  FIXED: ${docId} <- ${img.slice(0, 80)}...`);
      return true;
    } else {
      console.log(`  NO IMG: ${docId} (page fetched, no img found)`);
      return false;
    }
  } catch (e) {
    console.log(`  ERROR: ${docId} - ${e.message}`);
    return false;
  }
}

(async () => {
  let totalFixed = 0;
  let totalFailed = 0;

  // La Casa del Café
  console.log('\n=== La Casa del Café (8 sin foto) ===');
  for (const [docId, url] of Object.entries(LACASA_PRODUCTS)) {
    const ok = await fixFromProductPage(docId, url);
    if (ok) totalFixed++;
    else totalFailed++;
    await delay(1500);
  }

  // Catunambú
  console.log('\n=== Catunambú (9 sin foto) ===');
  for (const [docId, url] of Object.entries(CATUNAMBU_PRODUCTS)) {
    const ok = await fixFromProductPage(docId, url);
    if (ok) totalFixed++;
    else totalFailed++;
    await delay(1500);
  }

  // Cafés Miñana
  console.log('\n=== Cafés Miñana (5 sin foto) ===');
  for (const [docId, url] of Object.entries(MINANA_PRODUCTS)) {
    const ok = await fixFromProductPage(docId, url);
    if (ok) totalFixed++;
    else totalFailed++;
    await delay(1500);
  }

  console.log(`\n=== TOTAL: Fixed ${totalFixed}, Failed ${totalFailed} ===`);
  process.exit(0);
})();
