/**
 * fix_broken_photos_round2.js — Mop-up pass
 * Fixes the 15 remaining docs with broken photos found by re-audit.
 *
 * Usage: node scripts/fix_broken_photos_round2.js
 */

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const INEFFABLE_TOLIMA =
  'https://cdn.shopify.com/s/files/1/0611/2057/7587/files/friends-of-tolima-paquete-de-1-kilogramo.webp?v=1773240223';
const INEFFABLE_COIPA =
  'https://cdn.shopify.com/s/files/1/0611/2057/7587/files/la-coipa-cafe-de-especialidad-de-peru-paquete-de-1-kilogramo.webp?v=1769613333';

// Docs to UPDATE with a real replacement image
const REPLACEMENTS = {
  // Ineffable La Coipa → actual current product URL
  '8VhRPGw9uO8GHYj53vns': INEFFABLE_COIPA,
  // Ineffable Kenya Thiriku AA, Kenia Nyeri Lote 52, Lote 2 → generic Ineffable
  'ineffable-coffee-kenya-thiriku-aa': INEFFABLE_TOLIMA,
  rcilPgJiyG4j303H16xh: INEFFABLE_TOLIMA, // Kenia Nyeri Lote 52
  zJOiMgrAkS93b0wEfM3F: INEFFABLE_TOLIMA, // Kenia Nyeri Lote 2
  rDMVCeVLlzzHrZE0LRul: INEFFABLE_COIPA, // Sitio Amoreira → generic Ineffable
};

// Docs to CLEAR — fake Amazon URLs and brand sites returning 404
const CLEAR_DOCS = [
  // Nescafé Azera (fake Amazon URL)
  'nescafe-nescafe-azera-espresso',
  'roaster-nescafe-azera-espresso',
  // Saula (fake Amazon URL + brand 404)
  'saula-cafe-saula-premium-natural',
  'roaster-cafe-saula-premium-natural',
  'ROVfLM5d9sFcFwsiGlI3', // Saula Premium Original (brand 404)
  // Starbucks (fake Amazon URL)
  'roaster-starbucks-house-blend',
  // Oquendo (brand 404)
  '3U68wP8ALa2mYBa8ZMtR',
  // Fortaleza (brand 404)
  'DrAD40l6JJVBsBMjlIuD',
  // Illy (brand 404)
  'F1ZSkDVbqiETPUH8ZMP3',
  // Marcilla (brand 404)
  'QKUAnsYTsKnyaTFmmo16',
];

// ALL photo fields that getCafePhoto() checks
const ALL_PHOTO_FIELDS = ['foto', 'imageUrl', 'bestPhoto', 'officialPhoto', 'image'];

async function updateDoc(docId, newUrl) {
  const ref = db.collection('cafes').doc(docId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, error: 'doc not found (404)' };

  if (newUrl) {
    const update = {
      foto: newUrl,
      imageUrl: newUrl,
      bestPhoto: newUrl,
      officialPhoto: newUrl,
      image: newUrl,
      'photos.selected': newUrl,
      'photos.official': [newUrl],
      'photos.source': 'official',
    };
    await ref.update(update);
  } else {
    const update = {};
    for (const f of ALL_PHOTO_FIELDS) {
      update[f] = admin.firestore.FieldValue.delete();
    }
    update['photos.selected'] = admin.firestore.FieldValue.delete();
    update['photos.official'] = admin.firestore.FieldValue.delete();
    update['photos.source'] = 'fallback';
    await ref.update(update);
  }
  return { ok: true };
}

async function main() {
  let updated = 0,
    cleared = 0,
    errors = 0;

  console.log('=== Round 2: Updating docs with replacement photos ===\n');
  for (const [docId, newUrl] of Object.entries(REPLACEMENTS)) {
    try {
      const result = await updateDoc(docId, newUrl);
      if (result.ok) {
        console.log(`  ✅ ${docId}`);
        updated++;
      } else {
        console.log(`  ❌ ${docId} → ${result.error}`);
        errors++;
      }
    } catch (e) {
      console.log(`  ❌ ${docId} → ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== Round 2: Clearing broken photo fields ===\n');
  for (const docId of CLEAR_DOCS) {
    try {
      const result = await updateDoc(docId, null);
      if (result.ok) {
        console.log(`  🧹 ${docId}`);
        cleared++;
      } else {
        console.log(`  ❌ ${docId} → ${result.error}`);
        errors++;
      }
    } catch (e) {
      console.log(`  ❌ ${docId} → ${e.message}`);
      errors++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Cleared: ${cleared}`);
  console.log(`  Errors:  ${errors}`);
}

main().catch(console.error);
