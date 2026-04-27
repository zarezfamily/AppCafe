const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  console.log('Total docs in Firestore cafes:', snap.size);

  let noName = 0,
    noPhoto = 0;
  const duplicateNames = {};
  snap.forEach((doc) => {
    const d = doc.data();
    const name = (d.nombre || '').trim();
    if (!name) noName++;
    if (!d.bestPhoto && !d.officialPhoto && !d.foto && !d.image) noPhoto++;
    const key = (name + '|' + (d.marca || '')).toLowerCase();
    if (!duplicateNames[key]) duplicateNames[key] = [];
    duplicateNames[key].push(doc.id);
  });

  const dupes = Object.entries(duplicateNames).filter(([_k, ids]) => ids.length > 1);
  console.log('Sin nombre:', noName);
  console.log('Sin foto:', noPhoto);
  console.log('Duplicados (nombre+marca):', dupes.length);
  if (dupes.length > 0) {
    dupes.forEach(([k, ids]) => console.log('  DUP:', k, '->', ids.join(', ')));
  }
  process.exit(0);
})();
