#!/usr/bin/env node
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

(async () => {
  const ean = '8422675000604';

  // Check all possible EAN fields
  for (const field of ['ean', 'barcode', 'codigoBarras', 'EAN']) {
    const snap = await db.collection('cafes').where(field, '==', ean).get();
    console.log(`${field} = ${ean}: ${snap.size} results`);
    snap.forEach((d) => console.log(`  docId: ${d.id} | nombre: ${d.data().nombre}`));
  }

  // Full scan for Satan
  const allSnap = await db.collection('cafes').get();
  allSnap.forEach((d) => {
    const data = d.data();
    if (data.nombre && data.nombre.toLowerCase().includes('satan')) {
      console.log(
        `Satan match: ${d.id} => ${data.nombre}, ean=${data.ean}, barcode=${data.barcode}`
      );
    }
  });

  // Count by photo status
  let withPhoto = 0;
  let noPhoto = 0;
  let noPhotoIds = [];
  allSnap.forEach((d) => {
    const data = d.data();
    const url = data.imagenUrl || '';
    const hasPhoto =
      url && url.startsWith('http') && !url.includes('placeholder') && !url.includes('noimage');
    if (hasPhoto) {
      withPhoto++;
    } else {
      noPhoto++;
      noPhotoIds.push(d.id);
    }
  });

  console.log(`\nTotal: ${allSnap.size} | With photo: ${withPhoto} | Without: ${noPhoto}`);
  console.log(`\nCafes WITHOUT photo (${noPhoto}):`);
  noPhotoIds.forEach((id) => console.log(`  ${id}`));

  process.exit(0);
})();
