#!/usr/bin/env node
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (admin.apps.length === 0)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('cafes').where('marca', '==', 'Club del Gourmet').get();
  console.log('Total Club del Gourmet:', snap.size);
  const noPhoto = [];
  snap.forEach((d) => {
    const data = d.data();
    const hasPhoto = !!(data.fotoUrl || data.foto || data.imageUrl);
    console.log(hasPhoto ? '✅' : '❌', d.id, '|', (data.nombre || '').substring(0, 80));
    if (!hasPhoto) noPhoto.push(d.id);
  });
  console.log('\nNo photo (' + noPhoto.length + '):', noPhoto);

  if (noPhoto.length > 0) {
    console.log('\nDeleting ' + noPhoto.length + ' docs without photos...');
    for (const id of noPhoto) {
      await db.collection('cafes').doc(id).delete();
      console.log('  DELETED:', id);
    }
  }
  process.exit(0);
})();
