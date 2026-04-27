#!/usr/bin/env node
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

const DELETE = [
  'ahorramas_alipende_molido_natural_500',
  'ahorramas_alipende_grano_natural_500',
  'ahorramas_alipende_grano_natural_1kg',
  'ahorramas_alipende_grano_mezcla_1kg',
  'ahorramas_alipende_grano_descaf_500',
  'ahorramas_alipende_capsulas_intenso_nesp_10',
  'ahorramas_alipende_capsulas_espresso_nesp_10',
  'ahorramas_alipende_capsulas_descaf_nesp_10',
  'ahorramas_alipende_capsulas_lungo_nesp_10',
  'ahorramas_alipende_capsulas_colombia_nesp_10',
  'ahorramas_alipende_capsulas_intenso_nesp_20',
  'ahorramas_alipende_capsulas_espresso_dg_16',
  'ahorramas_alipende_capsulas_intenso_dg_16',
  'ahorramas_alipende_capsulas_descaf_dg_16',
];

async function main() {
  console.log(`=== Deleting ${DELETE.length} Alipende products ===\n`);
  let ok = 0,
    fail = 0;

  for (const docId of DELETE) {
    const short = docId.replace('ahorramas_alipende_', '');
    try {
      await db.collection('cafes').doc(docId).delete();
      try {
        await bucket.file(`cafe-photos-nobg/${docId}.png`).delete();
      } catch {}
      console.log(`  DEL ${short}`);
      ok++;
    } catch (e) {
      console.log(`  FAIL ${short}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n=== DONE: ${ok} deleted, ${fail} failed ===`);
  process.exit(0);
}
main();
