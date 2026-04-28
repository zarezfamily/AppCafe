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
  const snap = await db.collection('cafes').where('marca', '==', 'Cafetearte').get();
  let withPhoto = 0;
  const noPhoto = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data.fotoUrl || data.foto || data.imageUrl) withPhoto++;
    else
      noPhoto.push({
        id: d.id,
        url: data.fuenteUrl || '',
        nombre: (data.nombre || '').substring(0, 70),
      });
  });
  console.log('Total:', snap.size, '| Con foto:', withPhoto, '| Sin foto:', noPhoto.length);
  noPhoto.forEach((n) => console.log('  NO_PHOTO:', n.id, '|', n.nombre));
  console.log('\n--- URLs for scraping ---');
  noPhoto.forEach((n) => console.log(n.id + '|' + n.url));
  process.exit(0);
})();
