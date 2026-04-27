/**
 * fix_broken_photos.js
 *
 * Updates all Firestore cafe docs that have broken photo URLs.
 * - Docs with known replacement URLs get updated with the new URL.
 * - Docs with no replacement get all photo fields cleared so the app
 *   falls back to CLEAN_COFFEE_IMAGE.
 *
 * Usage: node scripts/fix_broken_photos.js
 */

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// ── Replacement map: docId → new photo URL ──────────────────────────────
// Sources: Shopify APIs (Nomad, Ineffable), Open Food Facts (OFF)

const NOMAD_CHAMBAKU = 'https://nomadcoffee.es/cdn/shop/files/E.CO.CHA.jpg?v=1769080405';
const NOMAD_COLOMBIA_HUILA =
  'https://nomadcoffee.es/cdn/shop/files/F.SA.PAMA_831f808e-7377-4926-8406-447c8cecf451.jpg?v=1768908536';
const NOMAD_ETHIOPIA = 'https://nomadcoffee.es/cdn/shop/files/E.ET.SAMU.webp?v=1773747761';
const NOMAD_ESPRESSO = 'https://nomadcoffee.es/cdn/shop/files/DSC3687.jpg?v=1773395690';

const INEFFABLE_TOLIMA =
  'https://cdn.shopify.com/s/files/1/0611/2057/7587/files/friends-of-tolima-paquete-de-1-kilogramo.webp?v=1773240223';
const INEFFABLE_COIPA =
  'https://cdn.shopify.com/s/files/1/0611/2057/7587/files/la-coipa-cafe-de-especialidad-de-peru-paquete-de-1-kilogramo.webp?v=1769613333';

const OFF_LAVAZZA_ROSSA =
  'https://images.openfoodfacts.org/images/products/800/007/003/6383/front_fr.7.400.jpg';
const OFF_LAVAZZA_ORO =
  'https://images.openfoodfacts.org/images/products/800/007/002/0580/front_en.17.400.jpg';
const OFF_BONKA =
  'https://images.openfoodfacts.org/images/products/841/007/642/1012/front_fr.6.400.jpg';
const OFF_STARBUCKS_HOUSE =
  'https://images.openfoodfacts.org/images/products/761/303/693/2097/front_fr.35.400.jpg';
const OFF_NESPRESSO_RISTRETTO =
  'https://images.openfoodfacts.org/images/products/763/042/872/0643/front_es.3.400.jpg';

const REPLACEMENTS = {
  // ── Nomad Coffee ──
  Gzwq4EEWwtMQddYRkmdV: NOMAD_CHAMBAKU, // Chambakú
  IsvRAGRmsiZZQb33QNfQ: NOMAD_COLOMBIA_HUILA, // Colombia Huila Lote 10
  usgnddz0dN8iQZwBM18u: NOMAD_COLOMBIA_HUILA, // Colombia Huila Lote 20
  kkYNsZWWIsfc8l9Z8mVQ: NOMAD_COLOMBIA_HUILA, // Colombia Huila Lote 30
  s7reQbZcmSBAwyOMx6JA: NOMAD_COLOMBIA_HUILA, // Colombia Huila Lote 40
  plKWhr1diUuepUUENpCg: NOMAD_COLOMBIA_HUILA, // Colombia Huila Lote 50
  R1uqtlXuqGgzRZIuVOCT: NOMAD_COLOMBIA_HUILA, // Colombia Huila Lote 60
  rws5vr5szw16tHuVbxvU: NOMAD_COLOMBIA_HUILA, // Colombia Huila Lote 70
  cD7a8xHh7wqc4DDLGFJM: NOMAD_COLOMBIA_HUILA, // Colombia Huila Lote 80
  Y7o5klBE0oShBnTdKbfV: NOMAD_COLOMBIA_HUILA, // Colombia Huila Lote 90
  rp1WgqKe8BRoUmEBVbFI: NOMAD_COLOMBIA_HUILA, // Colombia Huila Lote 100
  'nomad-coffee-ethiopia-yirgacheffe': NOMAD_ETHIOPIA, // Ethiopia Yirgacheffe
  'nomad-coffee-finca-el-paraiso-lychee': NOMAD_ESPRESSO, // Finca El Paraíso Lychee

  // ── Ineffable Coffee ──
  '4ashTwNxe5pN0PJtDzMw': INEFFABLE_TOLIMA, // Friends of Tolima
  'ineffable-coffee-costa-rica-tarrazu': INEFFABLE_COIPA, // Costa Rica Tarrazú (use generic Ineffable)
  BQCaL3LqbVyxDFHyUKxs: INEFFABLE_COIPA, // Kenia Nyeri Lote 12
  HGGeUk9twkdoilAnM75M: INEFFABLE_COIPA, // Kenia Nyeri Lote 42
  JKwNJFQBhbtTrPCzmUJ2: INEFFABLE_COIPA, // Kenia Nyeri Lote 62
  SNjB1rFlaj2nUgox5Qvk: INEFFABLE_COIPA, // Kenia Nyeri Lote 92
  aPpffv5ORsPctEtiPQwT: INEFFABLE_COIPA, // Kenia Nyeri Lote 72
  bCccnVLPqXfuszFqLYp8: INEFFABLE_COIPA, // Kenia Nyeri Lote 82
  dYMCoakSg4GN4qSyRK5F: INEFFABLE_COIPA, // Kenia Nyeri Lote 22
  fw4V8msD0KevQJ8H2TEx: INEFFABLE_COIPA, // Kenia Nyeri Lote 32

  // ── Open Food Facts ──
  'lavazza-lavazza-qualita-rossa': OFF_LAVAZZA_ROSSA,
  'roaster-lavazza-qualita-rossa': OFF_LAVAZZA_ROSSA,
  AF2gqonWWfxf4Ez7PkIy: OFF_LAVAZZA_ORO, // Lavazza Qualità Oro
  '0gbaTRLkg5agxlSfqKM7': OFF_BONKA, // Bonka Natural
  F1VZFiSkq6UoIjxQF7I8: OFF_STARBUCKS_HOUSE, // Starbucks House Blend
  k32C1FfcqVaauDvzAqQU: OFF_NESPRESSO_RISTRETTO, // Nespresso Ristretto
};

// ── Docs to CLEAR (no replacement found) ────────────────────────────────
// These get all photo fields wiped → app shows fallback image
const CLEAR_DOCS = [
  // Illy
  'illy-illy-cafe-en-grano-100-arabica',
  'roaster-illy-cafe-en-grano-100-arabica',
  'F1ZSkDVbqiETPUH8ZMP3', // Illy Espresso Classico
  // Marcilla
  'marcilla-marcilla-cafe-en-grano-mezcla',
  'roaster-marcilla-cafe-en-grano-mezcla',
  'marcilla-marcilla-cafe-molido-natural',
  'roaster-marcilla-cafe-molido-natural',
  'QKUAnsYTsKnyaTFmmo16', // Marcilla Gran Aroma
  // Delta
  'delta-delta-cafes-platinum',
  'roaster-delta-cafes-platinum',
  // Fortaleza
  'DrAD40l6JJVBsBMjlIuD', // Fortaleza Natural
  // Oquendo
  '3U68wP8ALa2mYBa8ZMtR', // Oquendo Espresso
  // Saula
  'ROVfLM5d9sFcFwsiGlI3', // Saula Premium Original
  // Cafés El Magnífico
  'cafes-el-magnifico-etiopia-raro-nansebo',
  'cafes-el-magnifico-guatemala-huehuetenango',
  'rvNVIebaqwYUIwv7USJT', // Colombia Casa Negra
  // ALDI
  'aldi-dark-roast',
  'aldi-medium-roast',
  // Hola Coffee
  'hola-coffee-el-diviso-pink-bourbon',
];

// ── Firestore Admin helpers ─────────────────────────────────────────────

async function updateDoc(docId, newUrl) {
  const ref = db.collection('cafes').doc(docId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, status: 404, error: 'doc not found' };

  if (newUrl) {
    await ref.update({
      foto: newUrl,
      imageUrl: newUrl,
      bestPhoto: newUrl,
      officialPhoto: newUrl,
      'photos.selected': newUrl,
      'photos.official': [newUrl],
      'photos.source': 'official',
    });
  } else {
    await ref.update({
      foto: admin.firestore.FieldValue.delete(),
      imageUrl: admin.firestore.FieldValue.delete(),
      bestPhoto: admin.firestore.FieldValue.delete(),
      officialPhoto: admin.firestore.FieldValue.delete(),
      'photos.selected': admin.firestore.FieldValue.delete(),
      'photos.official': admin.firestore.FieldValue.delete(),
      'photos.source': 'fallback',
    });
  }
  return { ok: true };
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  let updated = 0,
    cleared = 0,
    errors = 0;

  console.log('=== Updating docs with replacement photos ===\n');
  for (const [docId, newUrl] of Object.entries(REPLACEMENTS)) {
    try {
      const result = await updateDoc(docId, newUrl);
      if (result.ok) {
        console.log(`  ✅ ${docId} → ${newUrl.substring(0, 80)}...`);
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

  console.log('\n=== Clearing broken photo fields (fallback) ===\n');
  for (const docId of CLEAR_DOCS) {
    try {
      const result = await updateDoc(docId, null);
      if (result.ok) {
        console.log(`  🧹 ${docId} → cleared`);
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
  console.log(`  Total:   ${updated + cleared + errors}`);
}

main().catch(console.error);
