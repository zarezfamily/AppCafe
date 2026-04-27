#!/usr/bin/env node
/**
 * _backfill_amazon_verified.js
 * ────────────────────────────────────────────────────────────
 * 1. REMOVES all existing buyLinks from every café (clean slate)
 * 2. ADDS buyLinks ONLY for brands confirmed to sell on Amazon.es
 *
 * Usage:
 *   node scripts/_backfill_amazon_verified.js --dry-run
 *   node scripts/_backfill_amazon_verified.js
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();

const DRY_RUN = process.argv.includes('--dry-run');
const AMAZON_TAG = 'etiove-21';

// ── Brands confirmed to sell on Amazon.es ──────────────────────────
// Verified: these brands have product pages on amazon.es
const AMAZON_BRANDS = new Set([
  // Grandes marcas comerciales
  'Lavazza',
  'Marcilla',
  'Bonka',
  'Starbucks',
  'Nescafé',
  'Segafredo',
  'illy',
  'Pellini',
  'Kimbo',
  'Dallmayr',
  'Melitta',
  'Jacobs',
  'Dolce Gusto',
  'Tassimo',
  "L'OR",
  'Saimaza',
  'Bialetti',
  "De'Longhi",

  // Amazon propia
  'by Amazon',

  // Italianas premium en Amazon
  "Miscela d'Oro",
  'Lucaffé',
  'Carraro',
  'Mokaflor',
  'Passalacqua',
  'Pera',
  'Mokasirs',
  'Arcaffè',
  'Gimoka',
  'Saquella',
  'Caffè Corsini',
  'Caffè Vergnano',
  'Caffè Mauro',
  'Mokambo',
  "Note d'Espresso",
  'Garibaldi',

  // Españolas con presencia en Amazon
  'Cafés Baqué',
  'Cafes Candelas',
  'Cafes Granell',
  'Catunambu',
  'Café Dromedario',
  'Cafe Fortaleza',
  'Cafe Saula',
  'Cafés La Mexicana',
  'Cafés Oquendo',
  'Cafes La Estrella',
  'Tupinamba',
  'Toscaf',
  'Cafés Guilis',
  'Café Jurado',
  'Cafés El Criollo',
  'Montecelio',
  'Supracafé',
  'Cafés La Brasileña',
  'Cafés Valiente',
  'Cafes Orus',
  'Mocay',
  'Climent',
  'Cafès Pont',

  // Specialty con tienda en Amazon
  'INCAPTO',
  'Mogorttini',
  'Cafes Camuy',
  'Cafés Camuy',
  'Cafe de Finca',
  'Novell',
  'Cafe Platino',
  'Kfetea',
  'Hola Coffee',
  'Domus Barista',

  // Internacionales con presencia en Amazon
  "Peet's",
  'La Colombe',
  'Trung Nguyen',
  'beanies',
  'littles',
  'davidoff',
  'Café Royal',
  'Delta Cafés',
  'Julius Meinl',
  'Tchibo',
  'mount-hagen',
  'Der-Franz',
  'Costa',
  'clipper',
  'Gevalia',
  'Mr. Viet',

  // Nórdicas en Amazon
  'Löfbergs',
  'Zoégas',

  // Specialty premium
  'Stumptown Coffee',
  'Onyx Coffee Lab',
]);

// ── Marcas de distribución — NUNCA en Amazon ───────────────────────
// Aliada, Alipende, AUCHAN, Hacendado, Carrefour, Eroski, BM, Dia,
// Consum, Bonpreu, Covirán, Spar, Barissimo, Caprabo, Condis, Gadis,
// Hiperdino, Mmm!, El Corte Inglés, Club del Gourmet, Bio Organic

function buildAmazonSearchUrl(nombre, marca) {
  const query = `${marca} ${nombre}`.replace(/\s+/g, ' ').trim();
  const encoded = encodeURIComponent(query);
  return `https://www.amazon.es/s?k=${encoded}&tag=${AMAZON_TAG}`;
}

async function main() {
  console.log(
    `=== Backfill Amazon buyLinks (VERIFIED brands only) ${DRY_RUN ? '[DRY RUN]' : ''} ===\n`
  );

  const snap = await db.collection('cafes').get();
  console.log(`  Total cafés: ${snap.size}`);

  let cleared = 0;
  let added = 0;
  let skipped = 0;

  const clearPending = [];
  const addPending = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const marca = String(data.marca || data.roaster || '').trim();
    const nombre = String(data.nombre || data.name || '').trim();

    // Always clear existing buyLinks first
    if (Array.isArray(data.buyLinks) && data.buyLinks.length > 0) {
      clearPending.push(doc.ref);
      cleared++;
    }

    // Only add for verified Amazon brands
    if (!marca || !nombre) {
      skipped++;
      continue;
    }

    if (AMAZON_BRANDS.has(marca)) {
      const url = buildAmazonSearchUrl(nombre, marca);
      addPending.push({
        ref: doc.ref,
        buyLinks: [{ store: 'Amazon', url, tag: AMAZON_TAG }],
        marca,
        nombre,
      });
      added++;
    } else {
      skipped++;
    }
  }

  console.log(`\n  Will CLEAR buyLinks: ${cleared}`);
  console.log(`  Will ADD Amazon link: ${added}`);
  console.log(`  Skipped (not on Amazon): ${skipped}`);
  console.log(
    `  Amazon brands matched: ${new Set(addPending.map((p) => p.marca)).size} / ${AMAZON_BRANDS.size}`
  );

  if (DRY_RUN) {
    console.log('\n  [DRY RUN] Sample additions:');
    addPending.slice(0, 10).forEach((p) => {
      console.log(`    ${p.ref.id} (${p.marca}) → ${p.nombre}`);
    });

    const unmatched = [...AMAZON_BRANDS].filter((b) => !addPending.some((p) => p.marca === b));
    if (unmatched.length > 0) {
      console.log(`\n  Amazon brands NOT found in catalog (${unmatched.length}):`);
      unmatched.forEach((b) => console.log(`    - ${b}`));
    }
    return;
  }

  // Phase 1: Clear all buyLinks
  const BATCH_SIZE = 450;
  for (let i = 0; i < clearPending.length; i += BATCH_SIZE) {
    const chunk = clearPending.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const ref of chunk) {
      batch.update(ref, { buyLinks: admin.firestore.FieldValue.delete() });
    }
    await batch.commit();
    console.log(`  Cleared batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs)`);
  }

  // Phase 2: Add verified buyLinks
  for (let i = 0; i < addPending.length; i += BATCH_SIZE) {
    const chunk = addPending.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const { ref, buyLinks } of chunk) {
      batch.update(ref, { buyLinks });
    }
    await batch.commit();
    console.log(`  Added batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs)`);
  }

  console.log(`\n=== Done ===`);
  console.log(`  ${cleared} cleared → ${added} with verified Amazon link`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
