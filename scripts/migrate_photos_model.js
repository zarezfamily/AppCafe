/**
 * migrate_photos_model.js
 *
 * Migrates ALL existing cafés to the canonical photos model:
 *
 *   photos: {
 *     official: string[],     // brand / barcode photos
 *     user: string[],         // user-uploaded photos
 *     selected: string,       // computed best photo
 *     source: 'official' | 'user' | 'fallback'
 *   }
 *
 * Also normalizes bestPhoto from photos.selected.
 *
 * Usage:
 *   DRY_RUN=true  node scripts/migrate_photos_model.js   (default: preview)
 *   APPLY=true    node scripts/migrate_photos_model.js   (write to Firestore)
 */
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const APPLY = process.env.APPLY === 'true';
const BATCH_LIMIT = 400;

function validUrl(u) {
  return typeof u === 'string' && u.startsWith('http') && u.length > 10;
}

function classifyPhoto(url, cafe) {
  if (!validUrl(url)) return null;

  // If it matches a known official source, it's official
  const officialPatterns = [
    'openfoodfacts.org',
    'barcodelookup.com',
    'static.openfoodfacts',
    'world.openfoodfacts',
    'images.barcodelookup',
  ];

  const lowerUrl = url.toLowerCase();

  // If it came from an import/brand source → official
  if (cafe.fuente || cafe.fuenteUrl) return 'official';

  for (const pattern of officialPatterns) {
    if (lowerUrl.includes(pattern)) return 'official';
  }

  // If it's in Firebase Storage → user upload
  if (lowerUrl.includes('firebasestorage.googleapis.com')) return 'user';

  // Default: if it's from a known brand domain, official. Otherwise official (imported).
  // Since most cafés in the DB are imported from brand websites, default to official.
  return 'official';
}

function buildPhotosFromExisting(cafe) {
  const officialSet = new Set();
  const userSet = new Set();

  // Collect all known photo URLs
  const urls = [
    { url: cafe.officialPhoto, hint: 'official' },
    { url: cafe.bestPhoto, hint: null },
    { url: cafe.imageUrl, hint: null },
    { url: cafe.foto, hint: null },
    { url: cafe.image, hint: null },
  ];

  // Also check existing photoSources
  if (cafe.photoSources) {
    if (validUrl(cafe.photoSources.officialPhoto)) {
      urls.push({ url: cafe.photoSources.officialPhoto, hint: 'official' });
    }
    if (validUrl(cafe.photoSources.userPhoto)) {
      urls.push({ url: cafe.photoSources.userPhoto, hint: 'user' });
    }
  }

  // Already has photos object
  if (cafe.photos?.official) {
    for (const u of cafe.photos.official) if (validUrl(u)) officialSet.add(u);
  }
  if (cafe.photos?.user) {
    for (const u of cafe.photos.user) if (validUrl(u)) userSet.add(u);
  }

  for (const { url, hint } of urls) {
    if (!validUrl(url)) continue;

    const type = hint || classifyPhoto(url, cafe);
    if (type === 'user') userSet.add(url);
    else officialSet.add(url);
  }

  const official = [...officialSet];
  const user = [...userSet];

  // Pick best photo
  let selected = '';
  let source = 'fallback';

  const isCoffeePackage = cafe.imageValidation?.status !== 'rejected';
  const aiConfidence = Number(cafe.aiConfidenceScore || 0);

  if (official.length > 0 && isCoffeePackage && aiConfidence >= 0.6) {
    selected = official[0];
    source = 'official';
  } else if (official.length > 0 && !user.length) {
    // Most imported cafés: official is the only photo
    selected = official[0];
    source = 'official';
  } else if (user.length > 0) {
    selected = user[0];
    source = 'user';
  } else if (official.length > 0) {
    selected = official[0];
    source = 'official';
  }

  return { official, user, selected, source };
}

async function main() {
  console.log(`\n☕ Photos model migration ${APPLY ? '(APPLY MODE)' : '(DRY RUN)'}\n`);

  const snapshot = await db.collection('cafes').get();
  console.log(`Total cafés: ${snapshot.size}`);

  let needsMigration = 0;
  let alreadyMigrated = 0;
  let noPhotos = 0;
  let updated = 0;

  let batch = db.batch();
  let ops = 0;

  const sourceStats = { official: 0, user: 0, fallback: 0 };

  for (const doc of snapshot.docs) {
    const cafe = doc.data() || {};

    // Skip if already has well-formed photos object
    if (
      cafe.photos &&
      Array.isArray(cafe.photos.official) &&
      Array.isArray(cafe.photos.user) &&
      typeof cafe.photos.selected === 'string' &&
      typeof cafe.photos.source === 'string'
    ) {
      alreadyMigrated++;
      continue;
    }

    const photos = buildPhotosFromExisting(cafe);

    if (!photos.selected) {
      noPhotos++;
      // Still write the empty photos object for consistency
    }

    needsMigration++;
    sourceStats[photos.source] = (sourceStats[photos.source] || 0) + 1;

    if (APPLY) {
      const update = {
        photos,
        bestPhoto: photos.selected || cafe.bestPhoto || '',
      };

      batch.update(doc.ref, update);
      ops++;
      updated++;

      if (ops >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
        process.stdout.write(`  ✓ ${updated} updated...\r`);
      }
    }
  }

  if (APPLY && ops > 0) {
    await batch.commit();
  }

  console.log(`\nResults:`);
  console.log(`  Already migrated: ${alreadyMigrated}`);
  console.log(`  Needs migration:  ${needsMigration}`);
  console.log(`  No photos at all: ${noPhotos}`);
  console.log(
    `  Source breakdown:  official=${sourceStats.official}, user=${sourceStats.user}, fallback=${sourceStats.fallback}`
  );

  if (APPLY) {
    console.log(`  ✅ Updated: ${updated} cafés`);
  } else {
    console.log(`\n  ℹ️  Dry run. Use APPLY=true to write changes.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
