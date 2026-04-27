#!/usr/bin/env node
/**
 * _backfill_amazon_buylinks.js
 * ────────────────────────────────────────────────────────────
 * Reads all approved cafés from Firestore and, for those that
 * have a name + marca, builds an Amazon.es search URL and
 * writes it as buyLinks[0].
 *
 * This does NOT verify the product exists — it creates an
 * Amazon search link with our Associates tag so the user lands
 * on the right results page and we get credit for any purchase.
 *
 * Usage:
 *   node scripts/_backfill_amazon_buylinks.js [--dry-run]
 *
 * The Associates tag (etiove-21) is injected here.
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

const AMAZON_TAG = 'etiove-21';
const DRY_RUN = process.argv.includes('--dry-run');

function buildAmazonSearchUrl(nombre, marca) {
  const query = `${marca} ${nombre} café`.replace(/\s+/g, ' ').trim();
  const encoded = encodeURIComponent(query);
  return `https://www.amazon.es/s?k=${encoded}&tag=${AMAZON_TAG}`;
}

async function main() {
  console.log(`=== Backfill Amazon buyLinks ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  const snap = await db.collection('cafes').get();
  console.log(`  Total cafés: ${snap.size}`);

  let updated = 0;
  let skipped = 0;
  let alreadyHas = 0;

  const pending = [];

  for (const doc of snap.docs) {
    const data = doc.data();

    // Skip if already has buyLinks
    if (Array.isArray(data.buyLinks) && data.buyLinks.length > 0) {
      alreadyHas++;
      continue;
    }

    const nombre = String(data.nombre || data.name || '').trim();
    const marca = String(data.marca || data.roaster || '').trim();

    if (!nombre || !marca) {
      skipped++;
      continue;
    }

    const amazonUrl = buildAmazonSearchUrl(nombre, marca);
    const buyLinks = [{ store: 'Amazon', url: amazonUrl, tag: AMAZON_TAG }];

    if (DRY_RUN) {
      console.log(`  [DRY] ${doc.id} → ${marca} ${nombre}`);
    } else {
      pending.push({ ref: doc.ref, buyLinks });
    }

    updated++;
  }

  // Commit in batches of 450
  if (!DRY_RUN) {
    const BATCH_SIZE = 450;
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const chunk = pending.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      for (const { ref, buyLinks } of chunk) {
        batch.update(ref, { buyLinks });
      }
      await batch.commit();
      console.log(`  Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs)`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  Updated:    ${updated}`);
  console.log(`  Skipped:    ${skipped} (no name/marca)`);
  console.log(`  Already OK: ${alreadyHas}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
