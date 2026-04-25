#!/usr/bin/env node
/**
 * Fix HTML entities and mojibake encoding in all cafe fields.
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

function decodeEntities(s) {
  if (!s || typeof s !== 'string') return s;
  return (
    s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&nbsp;/g, ' ')
      .replace(/&ndash;/g, '\u2013')
      .replace(/&mdash;/g, '\u2014')
      .replace(/&laquo;/g, '\u00AB')
      .replace(/&raquo;/g, '\u00BB')
      .replace(/&eacute;/g, '\u00E9')
      .replace(/&aacute;/g, '\u00E1')
      .replace(/&oacute;/g, '\u00F3')
      .replace(/&iacute;/g, '\u00ED')
      .replace(/&uacute;/g, '\u00FA')
      .replace(/&ntilde;/g, '\u00F1')
      .replace(/&uuml;/g, '\u00FC')
      .replace(/&ccedil;/g, '\u00E7')
      // Mojibake fixes (UTF-8 bytes misread as latin-1)
      .replace(/\u00C3\u00A9/g, '\u00E9') // é
      .replace(/\u00C3\u00A1/g, '\u00E1') // á
      .replace(/\u00C3\u00B3/g, '\u00F3') // ó
      .replace(/\u00C3\u00AD/g, '\u00ED') // í
      .replace(/\u00C3\u00BA/g, '\u00FA') // ú
      .replace(/\u00C3\u00B1/g, '\u00F1') // ñ
      .replace(/\u00C3\u00BC/g, '\u00FC') // ü
      .replace(/\u00C3\u00A7/g, '\u00E7') // ç
      .replace(/\u00C3\u00A8/g, '\u00E8') // è
      .replace(/\u00C3\u00B2/g, '\u00F2') // ò
      .replace(/\u00C3\u00B6/g, '\u00F6') // ö
      .replace(/\u00C3\u00A4/g, '\u00E4') // ä
      .replace(/\u00C3\u00B8/g, '\u00F8') // ø
      .replace(/\u00C3\u00A6/g, '\u00E6') // æ
      .replace(/\u00C3\u0089/g, '\u00C9') // É
      .replace(/\u00E2\u0080\u0099/g, '\u2019') // '
      .replace(/\u00E2\u0080\u0093/g, '\u2013') // –
      .replace(/\u00E2\u0080\u009C/g, '\u201C') // "
      .replace(/\u00E2\u0080\u009D/g, '\u201D')
  ); // "
}

const FIELDS = ['nombre', 'marca', 'descripcion', 'notas', 'pais', 'origen', 'variedad', 'proceso'];

const needsFix =
  /&amp;|&lt;|&gt;|&quot;|&#\d+;|&[a-z]+;|\u00C3[\u0080-\u00BF]|\u00E2\u0080[\u0090-\u009F]/;

(async () => {
  try {
    const snap = await db.collection('cafes').get();
    console.log(`Total cafes: ${snap.size}`);

    let batch = db.batch();
    let batchCount = 0;
    let totalFixed = 0;

    snap.forEach((doc) => {
      const data = doc.data();
      const updates = {};
      let changed = false;

      for (const field of FIELDS) {
        const val = data[field];
        if (!val || typeof val !== 'string') continue;
        if (needsFix.test(val)) {
          const fixed = decodeEntities(val);
          if (fixed !== val) {
            updates[field] = fixed;
            changed = true;
          }
        }
      }

      if (changed) {
        batch.update(doc.ref, updates);
        batchCount++;
        totalFixed++;

        if (batchCount >= 400) {
          batch.commit();
          batch = db.batch();
          batchCount = 0;
          console.log(`Committed batch, total fixed: ${totalFixed}`);
        }
      }
    });

    if (batchCount > 0) await batch.commit();

    console.log(`\n=== DONE ===`);
    console.log(`Fixed: ${totalFixed} cafes`);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
