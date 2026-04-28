/**
 * Cross-reference kaffek.es sitemap products with our Firestore DB.
 * For key brands, show which kaffek.es slugs we're missing.
 */
const fs = require('fs');
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const BRANDS_MAP = {
  lavazza: 'lavazza',
  starbucks: 'starbucks',
  illy: 'illy',
  borbone: 'borbone',
  lor: "l'or",
  nescafe: 'nescafé',
  gimoka: 'gimoka',
  segafredo: 'segafredo',
  jacobs: 'jacobs',
  'cafe-royal': 'café royal',
  tassimo: 'tassimo',
  senseo: 'senseo',
};

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

(async () => {
  const snap = await db.collection('cafes').get();
  const byBrand = {};
  snap.forEach((doc) => {
    const d = doc.data();
    const m = (d.marca || '').toLowerCase();
    if (!byBrand[m]) byBrand[m] = [];
    byBrand[m].push({ id: doc.id, nombre: normalize(d.nombre || '') });
  });

  const sitemap = fs.readFileSync('kaffek_sitemap.txt', 'utf8');
  const lines = sitemap.split('\n').filter((l) => l.startsWith('https://'));

  // For each target brand, find products in sitemap that don't match any of our names
  for (const [sitemapKey, fbBrand] of Object.entries(BRANDS_MAP)) {
    const sitemapSlugs = lines
      .map((l) => l.replace('https://kaffek.es/', '').replace('.html', ''))
      .filter((s) => s.includes(sitemapKey))
      // Skip category/listing pages
      .filter((s) => !s.includes('/'));

    const ourProducts = byBrand[fbBrand] || [];
    const ourNames = ourProducts.map((p) => p.nombre);

    let missing = 0;
    const missingSlugs = [];
    for (const slug of sitemapSlugs) {
      // Turn slug into words
      const slugWords = slug.replace(/-/g, ' ').toLowerCase();
      // Check if any of our product names overlap significantly
      const found = ourNames.some((name) => {
        const nameWords = name.split(' ');
        const slugW = slugWords.split(' ');
        // Count common words (>= 3 chars)
        const common = nameWords.filter(
          (w) => w.length >= 3 && slugW.some((sw) => sw.includes(w) || w.includes(sw))
        );
        return common.length >= 3;
      });
      if (!found) {
        missing++;
        missingSlugs.push(slug);
      }
    }

    console.log(`\n=== ${fbBrand.toUpperCase()} ===`);
    console.log(
      `  kaffek.es: ${sitemapSlugs.length} products | ours: ${ourProducts.length} | missing ~${missing}`
    );
    if (missingSlugs.length > 0 && missingSlugs.length <= 25) {
      missingSlugs.forEach((s) => console.log(`    - ${s}`));
    } else if (missingSlugs.length > 25) {
      missingSlugs.slice(0, 15).forEach((s) => console.log(`    - ${s}`));
      console.log(`    ... and ${missingSlugs.length - 15} more`);
    }
  }

  process.exit(0);
})();
