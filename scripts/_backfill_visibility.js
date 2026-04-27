#!/usr/bin/env node
/**
 * _backfill_visibility.js
 * ────────────────────────────────────────────────────────────
 * Finds all café docs missing `fecha` or `appVisible` and
 * backfills the fields required for the app to see them:
 *
 *   fecha, puntuacion, votos, status, reviewStatus, appVisible
 *
 * Usage:
 *   node scripts/_backfill_visibility.js --dry-run   # preview
 *   node scripts/_backfill_visibility.js              # write
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

async function main() {
  console.log(`=== Backfill visibility fields ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  const snap = await db.collection('cafes').get();
  console.log(`  Total cafés: ${snap.size}`);

  const needsFix = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const missing = [];

    if (!data.fecha) missing.push('fecha');
    if (data.puntuacion === undefined || data.puntuacion === null) missing.push('puntuacion');
    if (data.votos === undefined || data.votos === null) missing.push('votos');
    if (!data.status) missing.push('status');
    if (!data.reviewStatus) missing.push('reviewStatus');
    if (data.appVisible !== true) missing.push('appVisible');

    if (missing.length > 0) {
      needsFix.push({ doc, data, missing });
    }
  }

  console.log(`  Need fix: ${needsFix.length} cafés`);
  console.log(`  Already OK: ${snap.size - needsFix.length}\n`);

  if (needsFix.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // Show sample
  const sample = needsFix.slice(0, 10);
  console.log('  Sample:');
  for (const { doc, data, missing } of sample) {
    console.log(`    ${doc.id} (${data.marca || '?'}) → missing: ${missing.join(', ')}`);
  }
  if (needsFix.length > 10) console.log(`    ... and ${needsFix.length - 10} more\n`);

  // Build updates
  const pending = [];
  const now = new Date().toISOString();

  for (const { doc, data } of needsFix) {
    const update = {};

    if (!data.fecha) {
      const raw = data.createdAt || data.updatedAt || null;
      if (raw && typeof raw.toDate === 'function') {
        update.fecha = raw.toDate().toISOString();
      } else if (raw && typeof raw === 'string') {
        update.fecha = raw;
      } else {
        update.fecha = now;
      }
    }
    if (data.puntuacion === undefined || data.puntuacion === null) {
      update.puntuacion = 0;
    }
    if (data.votos === undefined || data.votos === null) {
      update.votos = 0;
    }
    if (!data.status) {
      update.status = 'approved';
    }
    if (!data.reviewStatus) {
      update.reviewStatus = 'approved';
    }
    if (data.appVisible !== true) {
      update.appVisible = true;
    }

    pending.push({ ref: doc.ref, update });
  }

  if (DRY_RUN) {
    console.log('\n  [DRY RUN] Would update', pending.length, 'docs');
    for (const { ref, update } of pending.slice(0, 5)) {
      console.log(`    ${ref.id}:`, JSON.stringify(update).slice(0, 200));
    }
    return;
  }

  // Commit in batches of 450
  const BATCH_SIZE = 450;
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const { ref, update } of chunk) {
      batch.update(ref, update);
    }
    await batch.commit();
    console.log(`  Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs)`);
  }

  console.log(`\n=== Done — ${pending.length} cafés now visible ===`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
