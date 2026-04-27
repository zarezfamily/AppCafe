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
  const snap = await db.collection('cafes').where('marca', '==', 'Aliada').get();
  console.log('Total Aliada:', snap.size);
  snap.forEach((d) => {
    const data = d.data();
    console.log(`${d.id} | ${data.nombre || ''} | foto: ${data.fotoUrl ? 'SI' : 'NO'}`);
  });
  process.exit(0);
})();
